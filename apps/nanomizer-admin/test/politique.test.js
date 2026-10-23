// US-2 — rédiger, valider et signer une politique.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  compilerPolitique, publierPolitique, PolitiqueInvalide, FICHIER_POLITIQUE, FICHIER_SIGNATURE,
  EXPIRATION_MAX_JOURS,
} from "../lib/politique.js";
import { empreinte, normaliser } from "../lib/empreinte.js";
import { canonique } from "../lib/canonique.js";
import { clePublique } from "../lib/cabinet.js";
import { cabinetDeTest, dossierTemp, sourceDeTest, NOMS_TEST, MAINTENANT } from "./aide.js";

function compiler(source, c = cabinetDeTest(), opts = {}) {
  return compilerPolitique(source, { cabinet: c.cabinet, sel: c.ouvert.sel, version: 1, maintenant: MAINTENANT, ...opts });
}

function erreurs(source) {
  try { compiler(source); } catch (e) { if (e instanceof PolitiqueInvalide) return e.erreurs; throw e; }
  assert.fail("la politique aurait dû être refusée");
}

test("une source valide compile : numérotée, datée, noms remplacés par des empreintes", () => {
  const c = cabinetDeTest();
  const { politique } = compiler(sourceDeTest(), c);
  assert.equal(politique.format, "nanomizer.politique/1");
  assert.equal(politique.cabinet.id, c.cabinet.id);
  assert.equal(politique.version, 1);
  assert.equal(politique.expire_le, "2027-01-19T09:00:00.000Z"); // 90 jours
  const r1 = politique.regles.find((r) => r.id === "R-001");
  assert.equal(r1.noms, undefined);
  assert.equal(r1.empreintes.length, 3);
  assert.ok(r1.empreintes.includes(empreinte(c.ouvert.sel, "benjelloun")));
  assert.ok(r1.empreintes.every((e) => /^hm1:[0-9a-f]{64}$/.test(e)));
});

test("aucun nom protégé n'apparaît dans la politique publiée, sous aucune forme (critère d'acceptation 5)", () => {
  const { politique } = compiler(sourceDeTest());
  const texte = canonique(politique);
  for (const n of NOMS_TEST) {
    assert.ok(!texte.toLowerCase().includes(n.toLowerCase()), n);
    assert.ok(!normaliser(texte).includes(normaliser(n)), n);
  }
});

test("l'empreinte ne dépend que de la forme normalisée (casse, accents, ponctuation)", () => {
  const sel = crypto.randomBytes(32);
  assert.equal(empreinte(sel, "Ets Moreau-Lefèvre"), empreinte(sel, "ets moreau lefevre"));
  assert.notEqual(empreinte(sel, "Moreau"), empreinte(crypto.randomBytes(32), "Moreau"));
});

test("retirer un détecteur du plancher est refusé (critère d'acceptation 9)", () => {
  const s = sourceDeTest();
  s.regles.push({ id: "R-030", type: "detecteurs", libelle: "Moins de bruit", ajoute: ["ICE"], retire: ["EMAIL"] });
  assert.ok(erreurs(s).some((e) => /plancher éditeur ne se retire pas/.test(e)));
});

test("toutes les erreurs sont rendues d'un coup", () => {
  const s = sourceDeTest();
  s.regles.push(
    { id: "R-001", type: "interdit", libelle: "doublon", detecteurs: ["CIN"] },
    { id: "R-040", type: "inconnu", libelle: "x" },
    { id: "R-041", type: "interdit", libelle: "x", detecteurs: ["NIR"] },
    { id: "R-042", type: "toujours_pseudonymiser", libelle: "x", categorie: "CLIENT", noms: ["ab"] },
    { id: "R-043", type: "interdit", libelle: "x", detecteurs: ["CIN"], portee: { equipes: ["eq_fantome"] } },
  );
  s.perimetre.en_cas_erreur = "laisser_passer";
  delete s.notice_salaries;
  const e = erreurs(s);
  for (const attendu of [/R-001 : id en double/, /type inconnu/, /« NIR » inconnu/, /R-042, nom n°1 : trop court/,
    /équipe inexistante/, /fail closed/, /notice_salaries/]) {
    assert.ok(e.some((x) => attendu.test(x)), `${attendu} absent de :\n${e.join("\n")}`);
  }
});

test("un nom protégé recopié dans un libellé ou la notice est refusé — sans citer le nom", () => {
  const s = sourceDeTest();
  s.regles[0].libelle = "Clients actifs, dont Benjelloun";
  s.notice_salaries.texte += " Exemple : Ets Moreau-Lefèvre.";
  const e = erreurs(s);
  assert.equal(e.length, 2);
  assert.match(e[0], /R-001, nom n°2 : apparaît en clair/);
  assert.match(e[1], /R-001, nom n°3/);
  for (const n of NOMS_TEST) assert.ok(!e.join(" ").toLowerCase().includes(n.toLowerCase()), n);
});

test("un nom proche d'un mot de structure ne déclenche pas de fausse fuite", () => {
  const s = sourceDeTest();
  s.regles[0].noms = ["Interdit Conseil", "Client"]; // apparaissent dans les clés et types
  assert.doesNotThrow(() => compiler(s));
});

test("expiration : 365 jours au plus, l'option de la commande prime sur la source", () => {
  assert.ok(erreurs({ ...sourceDeTest(), expiration_jours: EXPIRATION_MAX_JOURS + 1 }).some((e) => /expiration/.test(e)));
  const { politique } = compiler(sourceDeTest(), undefined, { jours: 30 });
  assert.equal(politique.expire_le, "2026-11-20T09:00:00.000Z");
});

test("les champs calculés par la console sont refusés dans la source", () => {
  assert.ok(erreurs({ ...sourceDeTest(), version: 40 }).some((e) => /calculé par la console/.test(e)));
});

test("un webhook en http est refusé", () => {
  const s = sourceDeTest();
  s.alertes.canaux.push({ type: "webhook", url: "http://teams.exemple.fr/hook" });
  assert.ok(erreurs(s).some((e) => /https/.test(e)));
});

test("ajouter un détecteur déjà dans le plancher n'est qu'un avertissement", () => {
  const s = sourceDeTest();
  s.regles[2].ajoute.push("EMAIL");
  const { avertissements } = compiler(s);
  assert.match(avertissements[0], /déjà partie du plancher/);
});

test("publier : fichiers canoniques signés, archivés, version croissante même avec un cabinet restauré", () => {
  const c = cabinetDeTest();
  const partage = dossierTemp();
  const archives = dossierTemp();
  const r1 = publierPolitique({ source: sourceDeTest(), cabinet: c.cabinet, ouvert: c.ouvert, dossierPartage: partage, dossierArchives: archives, maintenant: MAINTENANT });
  assert.equal(r1.version, 1);

  const octets = fs.readFileSync(path.join(partage, FICHIER_POLITIQUE));
  const sig = JSON.parse(fs.readFileSync(path.join(partage, FICHIER_SIGNATURE), "utf8"));
  assert.equal(octets.toString("utf8"), canonique(JSON.parse(octets)));
  assert.equal(sig.cle_id, c.cabinet.cle.id);
  assert.ok(crypto.verify(null, octets, clePublique(c.cabinet), Buffer.from(sig.signature, "base64")));
  assert.ok(fs.existsSync(path.join(archives, "v1", FICHIER_POLITIQUE)));

  // Le fichier cabinet n'a pas été mis à jour (sauvegarde ancienne) : on repart quand même de la version publiée.
  const r2 = publierPolitique({ source: sourceDeTest(), cabinet: c.cabinet, ouvert: c.ouvert, dossierPartage: partage, maintenant: MAINTENANT });
  assert.equal(r2.version, 2);
});

test("une source invalide ne publie rien", () => {
  const c = cabinetDeTest();
  const partage = dossierTemp();
  const s = sourceDeTest();
  delete s.emise_par;
  assert.throws(() => publierPolitique({ source: s, cabinet: c.cabinet, ouvert: c.ouvert, dossierPartage: partage }), PolitiqueInvalide);
  assert.deepEqual(fs.readdirSync(partage), []);
});

/* ----------------------------------------- règles de l'organisation (v2.17) */

function sourceAvecRegles() {
  const s = sourceDeTest();
  s.regles.push(
    { id: "R-040", type: "toujours_pseudonymiser", libelle: "Parties adverses", prefixe: "adversaire", noms: ["Groupe Tazi", "Tazi"] },
    { id: "R-041", type: "motif", libelle: "Numéros d'affaire", prefixe: "AFFAIRE", motif: "AFF[ -]?\\d{2}/\\d{4}", exemple: "AFF 26/0412" },
    { id: "R-042", type: "laisser_en_clair", libelle: "Le cabinet et ses associés", termes: ["Cabinet Test", "Maître Durand", "maître durand"] },
  );
  return s;
}

test("règles de l'organisation : catégorie maison, motif et termes en clair compilent", () => {
  const c = cabinetDeTest();
  const { politique, avertissements } = compiler(sourceAvecRegles(), c);
  assert.deepEqual(avertissements, []);
  const r40 = politique.regles.find((r) => r.id === "R-040");
  assert.equal(r40.prefixe, "ADVERSAIRE");
  assert.equal(r40.categorie, undefined);
  assert.equal(r40.noms, undefined);
  assert.equal(r40.empreintes.length, 2);
  const r41 = politique.regles.find((r) => r.id === "R-041");
  assert.deepEqual(r41, { id: "R-041", type: "motif", libelle: "Numéros d'affaire", prefixe: "AFFAIRE", motif: "AFF[ -]?\\d{2}/\\d{4}", exemple: "AFF 26/0412" });
  const r42 = politique.regles.find((r) => r.id === "R-042");
  assert.deepEqual(r42.termes, ["Cabinet Test", "Maître Durand"], "doublon (casse) retiré");
  assert.ok(!JSON.stringify(politique).includes("Tazi"), "le nom protégé n'apparaît pas");
});

test("règles de l'organisation : ce que la console refuse", () => {
  const cas = [
    [{ id: "R-050", type: "toujours_pseudonymiser", libelle: "Deux à la fois", categorie: "CLIENT", prefixe: "X1", noms: ["Quelqu'un"] }, /pas les deux/],
    [{ id: "R-051", type: "toujours_pseudonymiser", libelle: "Réservé", prefixe: "NOM", noms: ["Quelqu'un"] }, /« NOM » est réservé/],
    [{ id: "R-052", type: "toujours_pseudonymiser", libelle: "Réservé", prefixe: "CLI", noms: ["Quelqu'un"] }, /« CLI » est réservé/],
    [{ id: "R-053", type: "motif", libelle: "Imbriqué", prefixe: "KO", motif: "(a+)+", exemple: "aaa" }, /quantificateur imbriqué/],
    [{ id: "R-054", type: "motif", libelle: "Sans exemple", prefixe: "SANS", motif: "X\\d+" }, /exemple : obligatoire/],
    [{ id: "R-055", type: "motif", libelle: "Exemple raté", prefixe: "RATE", motif: "X\\d+", exemple: "Y12" }, /ne le reconnaît pas/],
    [{ id: "R-056", type: "motif", libelle: "Champ inconnu", prefixe: "CH", motif: "X\\d+", exemple: "X1", noms: ["a"] }, /champ inconnu « noms »/],
    [{ id: "R-057", type: "laisser_en_clair", libelle: "Un email", termes: ["contact@cabinet-test.fr"] }, /terme n°1 : a la forme d'un identifiant/],
    [{ id: "R-058", type: "laisser_en_clair", libelle: "Un numéro", termes: ["CIN A123456"] }, /terme n°1 : a la forme d'un identifiant/],
    [{ id: "R-059", type: "laisser_en_clair", libelle: "Vide", termes: [] }, /liste non vide/],
    [{ id: "R-060", type: "laisser_en_clair", libelle: "Trahit un client", termes: ["Benjelloun"] }, /apparaît en clair ailleurs/],
  ];
  for (const [regle, attendu] of cas) {
    const s = sourceDeTest();
    s.regles.push(regle);
    const e = erreurs(s).join("\n");
    assert.match(e, attendu, regle.id);
    assert.ok(!e.includes("contact@") && !e.includes("Quelqu'un"), `valeur citée pour ${regle.id}`);
  }
});
