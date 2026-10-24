// Le registre de l'organisation, côté console (SPEC-REGISTRE-ORGANISATION §8),
// et le contrat avec le poste : ce que la console scelle, le connecteur le lit.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { cabinetDeTest, dossierTemp, PHRASE, COUT_TEST, MAINTENANT } from "./aide.js";
import {
  creerAdmin, ouvrirAdmin, creerRegistre, lireRegistre, verifier, certifierPoste, retirerPoste, attacherSequestre, restaurerSecrets,
  secretsAdmin, secretsSequestre, lireEntrees, ajouterEntreesAdmin, fusionnerDoublon, etatRegistre, lireJournal, lireEquipeV23, RegistreInvalide,
  FORMAT_FICHE,
} from "../lib/registre.js";
import { creerSequestre, ouvrirSequestre, SequestreInvalide } from "../lib/sequestre.js";
import { groupes, lireGroupes, pageFeuille, FeuilleInvalide } from "../lib/feuille.js";
import { genererPaireReception, empreinte } from "../lib/enveloppe.js";
// Le poste : son module à lui, pour le contrat.
import { descellerPourPoste, ouvrirRegistre, ajouterEntrees, lireEntrees as lireEntreesPoste, verifierSignatureRegistre } from "../../mcp-anonymiseur/server/registre.js";
import { desceller as descellerPoste, sceller as scellerPoste, infoEnveloppe } from "../../mcp-anonymiseur/server/enveloppe.js";

/* Ce que fait l'appli quand le poste importe son enrôlement : une paire, une fiche. */
function deposerFiche(partage, posteId, utilisateur, org) {
  const paire = genererPaireReception();
  const fiche = { format: FORMAT_FICHE, organisation: org, poste: posteId, utilisateur, reception: { alg: "x25519", publique: paire.publique }, empreinte: empreinte(paire.publique), emise_le: MAINTENANT.toISOString() };
  fs.mkdirSync(path.join(partage, "registre", "postes"), { recursive: true });
  fs.writeFileSync(path.join(partage, "registre", "postes", `${posteId}.json`), JSON.stringify(fiche));
  return paire;
}

function organisation() {
  const { cabinet, ouvert } = cabinetDeTest();
  const admin = creerAdmin(cabinet, PHRASE, COUT_TEST);
  const adminPrivee = ouvrirAdmin(admin, cabinet, PHRASE);
  const partage = dossierTemp();
  const reg = creerRegistre({ cabinet, ouvert, admin, partage, maintenant: MAINTENANT });
  return { cabinet, ouvert, admin, adminPrivee, partage, reg };
}

test("créer : registre signé, console destinataire, jamais deux registres au même endroit", () => {
  const o = organisation();
  assert.equal(verifier(o.reg, o.cabinet), true);
  assert.equal(verifierSignatureRegistre(o.reg, o.cabinet.cle.publique, o.cabinet.cle.id).ok, true, "le poste vérifie la même signature");
  const s = secretsAdmin(o.reg, o.adminPrivee);
  assert.equal(s.kCodes.length, 32);
  assert.equal(s.kRegistre[1].length, 32);
  assert.throws(() => creerRegistre({ cabinet: o.cabinet, ouvert: o.ouvert, admin: o.admin, partage: o.partage }), /existe déjà/);
  assert.throws(() => ouvrirAdmin(o.admin, o.cabinet, "mauvaise phrase longue"), /phrase/);
  const brut = fs.readFileSync(path.join(o.partage, "registre", "registre.json"), "utf8");
  assert.ok(!brut.includes(s.kCodes.toString("base64")), "K_codes n'est jamais en clair sur le partage");
});

test("certifier : la fiche est signée, le poste descelle ses secrets et lit/écrit le registre ; sans fiche, refus", () => {
  const o = organisation();
  const paireA = deposerFiche(o.partage, "pst_aaaa0001", "a@test", o.cabinet.id);
  assert.throws(() => certifierPoste({ ...o, posteId: "pst_bbbb0002" }), /aucune fiche/);
  const r = certifierPoste({ ...o, posteId: "pst_aaaa0001", maintenant: MAINTENANT });
  assert.equal(verifier(r.fiche, o.cabinet), true);
  assert.throws(() => certifierPoste({ ...o, posteId: "pst_aaaa0001" }), /déjà certifié/);
  // Côté poste (module du connecteur) :
  const reg = lireRegistre(o.partage);
  const d = descellerPourPoste(reg, "pst_aaaa0001", paireA.privee);
  assert.equal(d.etat, "actif");
  assert.ok(d.secrets.kCodes.equals(secretsAdmin(reg, o.adminPrivee).kCodes));
  const ouvert = ouvrirRegistre({ dir: path.join(o.partage, "registre"), posteId: "pst_aaaa0001", secrets: d.secrets, clePublique: o.cabinet.cle.publique, cleId: o.cabinet.cle.id });
  ajouterEntrees(ouvert, [{ code: "NOM-12345678", value: "Benali", type: "Nom" }]);
  // …et la console lit ce que le poste a écrit.
  assert.deepEqual(lireEntrees(reg, secretsAdmin(reg, o.adminPrivee), o.partage).map((e) => [e.code, e.value, e.poste]), [["NOM-12345678", "Benali", "pst_aaaa0001"]]);
  const e = etatRegistre(o.partage, o.cabinet);
  assert.equal(e.certifies.length, 1);
  assert.equal(e.en_attente.length, 0);
  assert.deepEqual(lireJournal(o.partage).map((j) => j.type), ["REGISTRE_CREE", "POSTE_AJOUTE"]);
});

test("une fiche dont l'empreinte ne correspond pas à la clé n'est jamais certifiée", () => {
  const o = organisation();
  deposerFiche(o.partage, "pst_aaaa0001", "a@test", o.cabinet.id);
  const f = path.join(o.partage, "registre", "postes", "pst_aaaa0001.json");
  const fiche = JSON.parse(fs.readFileSync(f, "utf8"));
  fiche.reception.publique = genererPaireReception().publique;   // substituée sur le partage
  fs.writeFileSync(f, JSON.stringify(fiche));
  assert.throws(() => certifierPoste({ ...o, posteId: "pst_aaaa0001" }), /empreinte/);
});

test("retirer : génération +1, les restants et la console reçoivent la nouvelle clé, le retiré ne lit plus la suite", () => {
  const o = organisation();
  const pa = deposerFiche(o.partage, "pst_aaaa0001", "a@test", o.cabinet.id);
  const pb = deposerFiche(o.partage, "pst_bbbb0002", "b@test", o.cabinet.id);
  certifierPoste({ ...o, posteId: "pst_aaaa0001" });
  certifierPoste({ ...o, posteId: "pst_bbbb0002" });
  const regAvant = lireRegistre(o.partage);
  const sb = descellerPourPoste(regAvant, "pst_bbbb0002", pb.privee).secrets;
  const kCodesAvant = secretsAdmin(regAvant, o.adminPrivee).kCodes;
  retirerPoste({ ...o, posteId: "pst_bbbb0002", maintenant: MAINTENANT });
  const reg = lireRegistre(o.partage);
  assert.equal(reg.generation, 2);
  assert.equal(descellerPourPoste(reg, "pst_bbbb0002", pb.privee).etat, "retire");
  const sa = descellerPourPoste(reg, "pst_aaaa0001", pa.privee).secrets;
  assert.deepEqual(Object.keys(sa.kRegistre), ["1", "2"]);
  assert.ok(sa.kCodes.equals(kCodesAvant), "K_codes ne change jamais");
  assert.ok(secretsAdmin(reg, o.adminPrivee).kRegistre[2].equals(sa.kRegistre[2]));
  // A écrit en génération 2 ; B, avec ses anciens secrets, ne lit pas.
  const ra = ouvrirRegistre({ dir: path.join(o.partage, "registre"), posteId: "pst_aaaa0001", secrets: sa });
  ajouterEntrees(ra, [{ code: "NOM-22222222", value: "Après", type: "Nom" }]);
  const fauxB = { dir: ra.dir, organisation: reg.organisation, posteId: "pst_bbbb0002", secrets: sb };
  assert.equal(lireEntreesPoste(fauxB).entries.length, 0);
  assert.equal(lireEntreesPoste(fauxB).ignorees, 1);
  assert.equal(etatRegistre(o.partage).retires[0], "pst_bbbb0002");
  assert.equal(etatRegistre(o.partage).en_attente.length, 0, "une fiche révoquée n'est pas « en attente »");
});

test("séquestre 2 sur 3 : toute paire ouvre, un gardien seul n'ouvre pas, une phrase fausse est refusée", () => {
  const org = "cab_test";
  const gardiens = [{ id: "g1", nom: "A", phrase: "phrase du gardien un" }, { id: "g2", nom: "B", phrase: "phrase du gardien deux" }, { id: "g3", nom: "C", phrase: "phrase du gardien trois" }];
  const s = creerSequestre({ organisation: org, gardiens, quorum: 2, cout: COUT_TEST });
  assert.deepEqual(Object.keys(s.enveloppes_ouverture).sort(), ["g1+g2", "g1+g3", "g2+g3"]);
  const attendu = ouvrirSequestre(s, { g1: gardiens[0].phrase, g2: gardiens[1].phrase }).privee;
  assert.equal(ouvrirSequestre(s, { g3: gardiens[2].phrase, g1: gardiens[0].phrase }).privee, attendu);
  assert.equal(ouvrirSequestre(s, { g2: gardiens[1].phrase, g3: gardiens[2].phrase }).privee, attendu);
  assert.throws(() => ouvrirSequestre(s, { g1: gardiens[0].phrase }), /2 gardien/);
  assert.throws(() => ouvrirSequestre(s, { g1: gardiens[0].phrase, g2: "phrase fausse mais longue" }), /incorrecte/);
  assert.ok(!JSON.stringify(s).includes(attendu), "la clé privée n'est jamais en clair");
  assert.throws(() => creerSequestre({ organisation: org, gardiens: [gardiens[0]], quorum: 2, cout: COUT_TEST }), SequestreInvalide);
  const solo = creerSequestre({ organisation: org, gardiens: [gardiens[0]], quorum: 1, cout: COUT_TEST });
  assert.equal(ouvrirSequestre(solo, { g1: gardiens[0].phrase }).gardiens.length, 1);
});

test("tous les postes perdus : le séquestre rescelle pour un nouveau poste, l'ouverture est journalisée avec les gardiens", () => {
  const o = organisation();
  const gardiens = [{ id: "g1", nom: "A", phrase: "phrase du gardien un" }, { id: "g2", nom: "B", phrase: "phrase du gardien deux" }];
  const seq = creerSequestre({ organisation: o.cabinet.id, gardiens, quorum: 2, cout: COUT_TEST });
  attacherSequestre({ ...o, cleId: seq.cle.id, publique: seq.cle.publique });
  const pa = deposerFiche(o.partage, "pst_aaaa0001", "a@test", o.cabinet.id);
  certifierPoste({ ...o, posteId: "pst_aaaa0001" });
  const regAvant = lireRegistre(o.partage);
  const sa = descellerPourPoste(regAvant, "pst_aaaa0001", pa.privee).secrets;
  ajouterEntrees(ouvrirRegistre({ dir: path.join(o.partage, "registre"), posteId: "pst_aaaa0001", secrets: sa }), [{ code: "NOM-00000001", value: "Avant la perte", type: "Nom" }]);
  // Le poste A est perdu, la console aussi : un poste neuf s'enrôle.
  const pn = deposerFiche(o.partage, "pst_cccc0003", "c@test", o.cabinet.id);
  const { privee, gardiens: ouvreurs } = ouvrirSequestre(seq, { g1: gardiens[0].phrase, g2: gardiens[1].phrase });
  const secrets = secretsSequestre(regAvant, privee);
  const adminNeuf = creerAdmin(o.cabinet, PHRASE, COUT_TEST);
  restaurerSecrets({ cabinet: o.cabinet, ouvert: o.ouvert, partage: o.partage, secrets, posteId: "pst_cccc0003", adminPublique: adminNeuf.reception.publique, origine: "sequestre", gardiens: ouvreurs });
  const reg = lireRegistre(o.partage);
  const sn = descellerPourPoste(reg, "pst_cccc0003", pn.privee).secrets;
  assert.ok(sn.kCodes.equals(sa.kCodes));
  const vu = lireEntreesPoste(ouvrirRegistre({ dir: path.join(o.partage, "registre"), posteId: "pst_cccc0003", secrets: sn }));
  assert.deepEqual(vu.entries.map((e) => e.value), ["Avant la perte"]);
  assert.ok(secretsAdmin(reg, ouvrirAdmin(adminNeuf, o.cabinet, PHRASE)).kCodes.equals(sa.kCodes), "la nouvelle console lit aussi");
  const j = lireJournal(o.partage).find((x) => x.type === "SEQUESTRE_OUVERT");
  assert.deepEqual(j.gardiens, ["g1", "g2"]);
  assert.equal(j.poste, "pst_cccc0003");
});

test("feuille de secours : les groupes restaurent exactement les secrets ; une lettre fausse est refusée", () => {
  const secrets = { kCodes: crypto.randomBytes(32), kRegistre: { 1: crypto.randomBytes(32), 2: crypto.randomBytes(32) } };
  const g = groupes(secrets);
  assert.equal(g[0], "HT1");
  assert.ok(g.slice(1).every((x) => /^[A-Z2-7]{1,4}$/.test(x)));
  const relu = lireGroupes(g.join(" ").toLowerCase());
  assert.ok(relu.kCodes.equals(secrets.kCodes));
  assert.ok(relu.kRegistre[2].equals(secrets.kRegistre[2]));
  const faux = [...g]; faux[5] = faux[5][0] === "A" ? "B" + faux[5].slice(1) : "A" + faux[5].slice(1);
  assert.throws(() => lireGroupes(faux.join("-")), FeuilleInvalide);
  assert.throws(() => lireGroupes("XX1-AAAA"), /HT1/);
  const page = pageFeuille(secrets, { organisation: "cab_x", registre: "reg_y", generation: 2, maintenant: MAINTENANT });
  assert.ok(page.includes(g.slice(1, 4).join("  ")));
  assert.ok(!page.includes(secrets.kCodes.toString("base64")));
});

test("restaurer depuis la feuille : refusée si elle est antérieure au dernier retrait", () => {
  const o = organisation();
  const pa = deposerFiche(o.partage, "pst_aaaa0001", "a@test", o.cabinet.id);
  const pb = deposerFiche(o.partage, "pst_bbbb0002", "b@test", o.cabinet.id);
  certifierPoste({ ...o, posteId: "pst_aaaa0001" });
  certifierPoste({ ...o, posteId: "pst_bbbb0002" });
  const feuilleG1 = groupes(secretsAdmin(lireRegistre(o.partage), o.adminPrivee));
  retirerPoste({ ...o, posteId: "pst_bbbb0002" });
  assert.throws(() => restaurerSecrets({ ...o, secrets: lireGroupes(feuilleG1.join("")), posteId: "pst_aaaa0001", origine: "feuille" }), /antérieur/);
  const feuilleG2 = groupes(secretsAdmin(lireRegistre(o.partage), o.adminPrivee));
  restaurerSecrets({ ...o, secrets: lireGroupes(feuilleG2.join("")), posteId: "pst_aaaa0001", origine: "feuille" });
  assert.equal(descellerPourPoste(lireRegistre(o.partage), "pst_aaaa0001", pa.privee).etat, "actif");
  void pb;
});

test("clé d'équipe v2.3 → registre : K_codes = secret d'équipe, les fichiers en clair importés chiffrés", () => {
  const { cabinet, ouvert } = cabinetDeTest();
  const admin = creerAdmin(cabinet, PHRASE, COUT_TEST);
  const adminPrivee = ouvrirAdmin(admin, cabinet, PHRASE);
  const equipe = dossierTemp();
  const secret = crypto.randomBytes(32);
  fs.writeFileSync(path.join(equipe, ".nanomizer-equipe.json"), JSON.stringify({ v: 1, secret: secret.toString("base64") }));
  fs.writeFileSync(path.join(equipe, "cle-poste-abc.json"), JSON.stringify({ entries: [{ code: "NOM-48291374", value: "Benali", type: "Nom" }] }));
  const v23 = lireEquipeV23(equipe);
  assert.ok(v23.secret.equals(secret));
  const partage = dossierTemp();
  const reg = creerRegistre({ cabinet, ouvert, admin, partage, kCodes: v23.secret });
  const s = secretsAdmin(reg, adminPrivee);
  assert.ok(s.kCodes.equals(secret));
  assert.equal(ajouterEntreesAdmin(reg, s, partage, v23.entries), 1);
  assert.deepEqual(lireEntrees(reg, s, partage).map((e) => [e.code, e.poste]), [["NOM-48291374", "admin"]]);
  assert.deepEqual(v23.fichiers.map((f) => path.basename(f)), ["cle-poste-abc.json"]);
});

test("fusionner un doublon : le code alias reste décodable, c'est le code gardé qui répond", () => {
  const o = organisation();
  const reg = lireRegistre(o.partage);
  const s = secretsAdmin(reg, o.adminPrivee);
  ajouterEntreesAdmin(reg, s, o.partage, [{ code: "NOM-001", value: "Benali", type: "Nom" }, { code: "NOM-48291374", value: "Benali", type: "Nom" }]);
  assert.throws(() => fusionnerDoublon({ ...o, garde: "NOM-48291374", alias: "PRENOM-001" }), RegistreInvalide);
  fusionnerDoublon({ ...o, garde: "NOM-48291374", alias: "NOM-001" });
  const entries = lireEntrees(reg, s, o.partage);
  assert.deepEqual(entries.map((e) => [e.code, e.alias_de || null]), [["NOM-001", null], ["NOM-48291374", null], ["NOM-001", "NOM-48291374"]]);
  assert.equal(lireJournal(o.partage).at(-1).type, "DOUBLON_FUSIONNE");
});

test("contrat enveloppe : ce que la console scelle, le connecteur l'ouvre, et réciproquement", () => {
  const paire = genererPaireReception();
  const env = scellerPoste(paire.publique, infoEnveloppe("org", "x"), { a: 1 });
  assert.deepEqual(descellerPoste(paire.privee, infoEnveloppe("org", "x"), env), { a: 1 });
  const src = (f) => fs.readFileSync(f, "utf8");
  assert.equal(src(new URL("../lib/enveloppe.js", import.meta.url)), src(new URL("../../mcp-anonymiseur/server/enveloppe.js", import.meta.url)), "les deux copies d'enveloppe.js doivent rester identiques");
});
