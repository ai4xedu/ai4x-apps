// Le registre de l'organisation, côté poste (SPEC-REGISTRE-ORGANISATION §8).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { genererPaireReception, sceller, desceller, infoEnveloppe, chiffrer, dechiffrer, empreinte, canonique, Indechiffrable } from "../server/enveloppe.js";
import {
  FORMAT_REGISTRE, lireSecretsPoste, analyserSecrets, verifierSignatureRegistre, descellerPourPoste, ouvrirRegistre,
  lireEntrees, ajouterEntrees, doublons, aadEntree, RegistreIndisponible, octetsSignes,
} from "../server/registre.js";
import { normFor } from "../server/engine.js";
import { teamCode } from "../server/equipe.js";

const ORG = "cab_test";
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ht-registre-"));

/* Ce que fera la console admin : un registre signé, des secrets scellés par poste. */
function fabriquerRegistre({ postes, generation = 1, kCodes = crypto.randomBytes(32), kRegistre = { 1: crypto.randomBytes(32) }, retires = [] }) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const reg = { format: FORMAT_REGISTRE, organisation: ORG, id: "reg_test", cree_le: "2026-10-23T10:00:00Z", generation, postes: {}, retires };
  const secrets = { K_codes: kCodes.toString("base64"), K_registre: Object.fromEntries(Object.entries(kRegistre).map(([g, k]) => [g, k.toString("base64")])) };
  for (const [id, paire] of Object.entries(postes)) {
    reg.postes[id] = { utilisateur: `${id}@test`, ajoute_le: "2026-10-23T10:00:00Z", enveloppe: sceller(paire.publique, infoEnveloppe(ORG, id), secrets) };
  }
  reg.signature = { cle_id: "k_test", alg: "ed25519", valeur: crypto.sign(null, octetsSignes(reg), privateKey).toString("base64") };
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "registre.json"), JSON.stringify(reg));
  return { dir, reg, publique: publicKey.export({ format: "der", type: "spki" }).toString("base64"), kCodes, kRegistre };
}

test("enveloppe : s'ouvre par son destinataire, pas par un autre poste ni une autre organisation", () => {
  const a = genererPaireReception(), b = genererPaireReception();
  const env = sceller(a.publique, infoEnveloppe(ORG, "pst_a"), { K_codes: "x" });
  assert.deepEqual(desceller(a.privee, infoEnveloppe(ORG, "pst_a"), env), { K_codes: "x" });
  assert.throws(() => desceller(b.privee, infoEnveloppe(ORG, "pst_a"), env), Indechiffrable);
  assert.throws(() => desceller(a.privee, infoEnveloppe(ORG, "pst_b"), env), Indechiffrable);
  assert.throws(() => desceller(a.privee, infoEnveloppe("autre_org", "pst_a"), env), Indechiffrable);
  assert.match(empreinte(a.publique), /^[0-9a-f]{4}(-[0-9a-f]{4}){3}$/);
  assert.notEqual(empreinte(a.publique), empreinte(b.publique));
});

test("entrée : une ligne déplacée (autre poste, autre numéro, autre génération) est refusée", () => {
  const k = crypto.randomBytes(32);
  const c = chiffrer(k, aadEntree(ORG, "pst_a", 1, 3), { code: "NOM-001", value: "Benali" });
  assert.equal(dechiffrer(k, aadEntree(ORG, "pst_a", 1, 3), c).value, "Benali");
  for (const aad of [aadEntree(ORG, "pst_b", 1, 3), aadEntree(ORG, "pst_a", 1, 4), aadEntree(ORG, "pst_a", 2, 3)]) {
    assert.throws(() => dechiffrer(k, aad, c), Indechiffrable);
  }
});

test("secrets du poste : par fichier ou par descripteur hérité, jamais sans K_codes", () => {
  const dir = tmp();
  const f = path.join(dir, "s.json");
  fs.writeFileSync(f, JSON.stringify({ K_codes: crypto.randomBytes(32).toString("base64"), K_registre: { 1: crypto.randomBytes(32).toString("base64") } }));
  const s = lireSecretsPoste({ ANX_POSTE_SECRETS_FICHIER: f });
  assert.equal(s.kCodes.length, 32);
  assert.equal(s.kRegistre[1].length, 32);
  const fd = fs.openSync(f, "r");
  assert.equal(lireSecretsPoste({ ANX_POSTE_SECRETS_FD: String(fd) }).kCodes.length, 32);
  assert.equal(lireSecretsPoste({}), null);
  assert.throws(() => analyserSecrets(JSON.stringify({ K_registre: { 1: "x" } })), RegistreIndisponible);
});

test("signature du registre : vérifiée avec la clé épinglée ; un octet changé = refus", () => {
  const a = genererPaireReception();
  const r = fabriquerRegistre({ postes: { pst_a: a } });
  assert.equal(verifierSignatureRegistre(r.reg, r.publique).ok, true);
  assert.equal(verifierSignatureRegistre(r.reg, r.publique, "k_autre").ok, false);
  const altere = { ...r.reg, generation: 2 };
  assert.equal(verifierSignatureRegistre(altere, r.publique).ok, false);
  assert.equal(verifierSignatureRegistre({ ...r.reg, signature: undefined }, r.publique).ok, false);
});

test("le poste descelle ses secrets ; un poste non certifié attend ; un poste retiré est refusé", () => {
  const a = genererPaireReception(), b = genererPaireReception();
  const r = fabriquerRegistre({ postes: { pst_a: a }, retires: [{ poste: "pst_z", le: "…", generation_close: 1 }] });
  const d = descellerPourPoste(r.reg, "pst_a", a.privee);
  assert.equal(d.etat, "actif");
  assert.ok(d.secrets.kCodes.equals(r.kCodes));
  assert.equal(descellerPourPoste(r.reg, "pst_b", b.privee).etat, "attente");
  assert.equal(descellerPourPoste(r.reg, "pst_z", b.privee).etat, "retire");
  assert.throws(() => ouvrirRegistre({ dir: r.dir, posteId: "pst_b", secrets: d.secrets, clePublique: r.publique }), /pas encore certifié/);
  assert.throws(() => ouvrirRegistre({ dir: r.dir, posteId: "pst_z", secrets: d.secrets, clePublique: r.publique }), /retiré/);
  assert.throws(() => ouvrirRegistre({ dir: path.join(r.dir, "absent"), posteId: "pst_a", secrets: d.secrets }), RegistreIndisponible);
});

test("deux postes : même valeur → même code ; le code du collègue se décode ; les codes locaux importés tels quels", () => {
  const a = genererPaireReception(), b = genererPaireReception();
  const r = fabriquerRegistre({ postes: { pst_a: a, pst_b: b } });
  const sa = descellerPourPoste(r.reg, "pst_a", a.privee).secrets;
  const sb = descellerPourPoste(r.reg, "pst_b", b.privee).secrets;
  const ra = ouvrirRegistre({ dir: r.dir, posteId: "pst_a", secrets: sa, clePublique: r.publique });
  const rb = ouvrirRegistre({ dir: r.dir, posteId: "pst_b", secrets: sb, clePublique: r.publique });
  assert.equal(ra.postes, 2);
  // Même formule que la clé d'équipe : chaque poste calcule le même code sans se parler.
  const codeA = teamCode(sa.kCodes, "NOM", normFor("NOM", "Benali"), () => false);
  const codeB = teamCode(sb.kCodes, "NOM", normFor("NOM", "Benali"), () => false);
  assert.equal(codeA, codeB);
  assert.match(codeA, /^NOM-\d{8}$/);
  // A écrit (dont une entrée séquentielle héritée de sa clé locale), B lit.
  assert.equal(ajouterEntrees(ra, [{ code: codeA, value: "Benali", type: "Nom" }, { code: "PRENOM-001", value: "Karim", type: "Prénom" }]), 2);
  assert.equal(ajouterEntrees(ra, [{ code: codeA, value: "Benali", type: "Nom" }]), 0, "ajout seul : jamais deux fois le même code");
  const vuDeB = lireEntrees(rb);
  assert.equal(vuDeB.postes, 1);
  assert.equal(vuDeB.ignorees, 0);
  assert.deepEqual(vuDeB.entries.map((e) => [e.code, e.value, e.poste]).sort(), [[codeA, "Benali", "pst_a"], ["PRENOM-001", "Karim", "pst_a"]]);
  // B écrit à son tour ; A voit les deux postes. Rien en clair sur le partage.
  ajouterEntrees(rb, [{ code: "SOCIETE-001", value: "Atlas Négoce", type: "Société" }]);
  assert.equal(lireEntrees(ra).postes, 2);
  const brut = fs.readFileSync(path.join(r.dir, "entrees", "pst_a.jsonl"), "utf8") + fs.readFileSync(path.join(r.dir, "entrees", "pst_b.jsonl"), "utf8");
  assert.ok(!/Benali|Karim|Atlas/.test(brut));
});

test("retrait d'un poste : génération 2, l'ancien ne lit plus ce qui suit, les codes ne bougent pas", () => {
  const a = genererPaireReception(), b = genererPaireReception();
  const k1 = crypto.randomBytes(32), k2 = crypto.randomBytes(32), kCodes = crypto.randomBytes(32);
  // Génération 1 : A et B membres.
  const r1 = fabriquerRegistre({ postes: { pst_a: a, pst_b: b }, kCodes, kRegistre: { 1: k1 } });
  const ra1 = ouvrirRegistre({ dir: r1.dir, posteId: "pst_a", secrets: descellerPourPoste(r1.reg, "pst_a", a.privee).secrets });
  const rb1 = ouvrirRegistre({ dir: r1.dir, posteId: "pst_b", secrets: descellerPourPoste(r1.reg, "pst_b", b.privee).secrets });
  ajouterEntrees(ra1, [{ code: "NOM-11111111", value: "Avant", type: "Nom" }]);
  // Génération 2 : B retiré ; le registre est réécrit par la console, A reçoit K1 et K2.
  const r2 = fabriquerRegistre({ postes: { pst_a: a }, generation: 2, kCodes, kRegistre: { 1: k1, 2: k2 }, retires: [{ poste: "pst_b", le: "…", generation_close: 1 }] });
  fs.cpSync(path.join(r1.dir, "entrees"), path.join(r2.dir, "entrees"), { recursive: true });
  const ra2 = ouvrirRegistre({ dir: r2.dir, posteId: "pst_a", secrets: descellerPourPoste(r2.reg, "pst_a", a.privee).secrets });
  assert.equal(ra2.generation, 2);
  ajouterEntrees(ra2, [{ code: "NOM-22222222", value: "Après", type: "Nom" }]);
  // A lit tout (les deux générations) ; B, avec ses anciens secrets, ne lit que la génération 1.
  assert.deepEqual(lireEntrees(ra2).entries.map((e) => e.value).sort(), ["Après", "Avant"]);
  const fauxB = { ...rb1, dir: r2.dir };
  const vuDeB = lireEntrees(fauxB);
  assert.deepEqual(vuDeB.entries.map((e) => e.value), ["Avant"]);
  assert.equal(vuDeB.ignorees, 1);
  // Même K_codes : le code d'une valeur est le même avant et après.
  assert.equal(teamCode(ra1.secrets.kCodes, "NOM", "x", () => false), teamCode(ra2.secrets.kCodes, "NOM", "x", () => false));
});

test("doublons : même valeur sous deux codes, signalés par codes ; un alias n'en est pas un", () => {
  const d = doublons([
    { code: "NOM-001", value: "Benali", type: "Nom" },
    { code: "NOM-48291374", value: "Benali", type: "Nom" },
    { code: "NOM-002", value: "Tazi", type: "Nom" },
    { code: "NOM-003", value: "Tazi", type: "Nom", alias_de: "NOM-002" },
    { code: "TEL-001", value: "06 61 23 45 67", type: "Téléphone" },
    { code: "TEL-002", value: "0661234567", type: "Téléphone" },
  ], normFor);
  assert.deepEqual(d, [["NOM-001", "NOM-48291374"], ["TEL-001", "TEL-002"]]);
});

test("une ligne corrompue est comptée, jamais devinée, et n'empêche pas les autres", () => {
  const a = genererPaireReception();
  const r = fabriquerRegistre({ postes: { pst_a: a } });
  const ra = ouvrirRegistre({ dir: r.dir, posteId: "pst_a", secrets: descellerPourPoste(r.reg, "pst_a", a.privee).secrets });
  ajouterEntrees(ra, [{ code: "NOM-001", value: "Un", type: "Nom" }]);
  fs.appendFileSync(ra.fichierPoste, "pas du json\n" + JSON.stringify({ g: 1, n: 9, iv: "AAAA", tag: "AAAA", donnees: "AAAA" }) + "\n");
  ajouterEntrees(ra, [{ code: "NOM-002", value: "Deux", type: "Nom" }]);
  const v = lireEntrees(ra);
  assert.deepEqual(v.entries.map((e) => e.value), ["Un", "Deux"]);
  assert.equal(v.ignorees, 2);
});

test("canonique : clés triées, sans espaces, indépendant de l'ordre d'écriture", () => {
  assert.equal(canonique({ b: 1, a: [true, null, "x"] }), canonique({ a: [true, null, "x"], b: 1 }));
  assert.equal(canonique({ b: 1, a: 2 }), '{"a":2,"b":1}');
});
