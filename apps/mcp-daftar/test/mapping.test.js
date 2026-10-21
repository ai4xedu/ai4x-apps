import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  cleFournisseur, chargerSocle, chercherSocle, chargerDossier, sauverDossier,
  resoudreCompte, apprendreCompte, codeTiers, resoudreCode, dejaPassee,
  enregistrerPieces, slugifier,
} from "../server/mapping.js";

function racineTemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "daftar-map-"));
}

test("la clé d'un tiers est son ICE quand il existe", () => {
  assert.equal(cleFournisseur({ nom: "ATLAS NEGOCE SARL", ice: "003463957000076" }), "ice:003463957000076");
  assert.equal(
    cleFournisseur({ nom: "Atlas Négoce S.A.R.L", ice: "003463957000076" }),
    "ice:003463957000076",
    "une raison sociale mal lue ne change pas la clé"
  );
});

test("sans ICE, la clé est le nom normalisé (accents et casse effacés)", () => {
  assert.equal(cleFournisseur({ nom: "Atlas Négoce" }), "nom:atlas negoce");
  assert.equal(cleFournisseur({ nom: "ATLAS  NEGOCE" }), "nom:atlas negoce");
  assert.equal(cleFournisseur({}), null);
});

test("le socle propose par indice sur la raison sociale", () => {
  const socle = chargerSocle(racineTemp());
  const t = chercherSocle(socle, { nom: "Maroc Telecom" });
  assert.equal(t.compte, "6145");
  const e = chercherSocle(socle, { nom: "LYDEC" });
  assert.equal(e.compte, "6125");
  assert.equal(chercherSocle(socle, { nom: "ATLAS NEGOCE SARL" }), null);
});

test("le socle propose, la mémoire du dossier tranche", () => {
  const racine = racineTemp();
  const socle = chargerSocle(racine);
  const d = chargerDossier(racine, "Menara Distribution");

  const avant = resoudreCompte({ nom: "Maroc Telecom", ice: "000095096000034" }, d, socle);
  assert.equal(avant.origine, "socle");
  assert.equal(avant.compte, "6145");

  apprendreCompte(d, { nom: "Maroc Telecom", ice: "000095096000034", compte: "61455", libelle: "Téléphone" });
  const apres = resoudreCompte({ nom: "Maroc Telecom", ice: "000095096000034" }, d, socle);
  assert.equal(apres.origine, "dossier");
  assert.equal(apres.compte, "61455");
});

test("un fournisseur appris sous son nom est retrouvé quand l'ICE arrive plus tard", () => {
  const racine = racineTemp();
  const socle = chargerSocle(racine);
  const d = chargerDossier(racine, "Menara");
  apprendreCompte(d, { nom: "ATLAS NEGOCE SARL", ice: null, compte: "61253" });
  const r = resoudreCompte({ nom: "ATLAS NEGOCE SARL", ice: "003463957000076" }, d, socle);
  assert.equal(r.origine, "dossier");
  assert.equal(r.compte, "61253");
});

test("un compte invalide est refusé plutôt qu'enregistré", () => {
  const d = chargerDossier(racineTemp(), "Menara");
  assert.throws(() => apprendreCompte(d, { nom: "X SARL", compte: "61" }), /invalide/);
  assert.throws(() => apprendreCompte(d, { nom: "X SARL", compte: "abcd" }), /invalide/);
  assert.throws(() => apprendreCompte(d, { nom: null, ice: null, compte: "6125" }), /Impossible d'apprendre/);
});

test("la mémoire d'un dossier ne déborde pas sur un autre", () => {
  const racine = racineTemp();
  const socle = chargerSocle(racine);
  const a = chargerDossier(racine, "Menara Distribution");
  apprendreCompte(a, { nom: "ATLAS NEGOCE SARL", ice: "003463957000076", compte: "61253" });
  sauverDossier(a);

  const b = chargerDossier(racine, "Autre Client");
  const r = resoudreCompte({ nom: "ATLAS NEGOCE SARL", ice: "003463957000076" }, b, socle);
  assert.equal(r.origine, null, "le même fournisseur ne tombe pas forcément sur le même compte ailleurs");
});

test("la mémoire survit à un rechargement depuis le disque", () => {
  const racine = racineTemp();
  const socle = chargerSocle(racine);
  const d = chargerDossier(racine, "Menara");
  apprendreCompte(d, { nom: "ATLAS NEGOCE SARL", ice: "003463957000076", compte: "61253" });
  sauverDossier(d);

  const relu = chargerDossier(racine, "Menara");
  assert.equal(resoudreCompte({ ice: "003463957000076" }, relu, socle).compte, "61253");
});

test("le code d'un tiers est stable d'un lot à l'autre", () => {
  const d = chargerDossier(racineTemp(), "Menara");
  const c1 = codeTiers(d.codes, { nom: "ATLAS NEGOCE SARL", ice: "003463957000076" });
  const c2 = codeTiers(d.codes, { nom: "Autre SARL", ice: "111111111111111" });
  const c3 = codeTiers(d.codes, { nom: "Atlas Négoce", ice: "003463957000076" });
  assert.equal(c1, "FOURN-001");
  assert.equal(c2, "FOURN-002");
  assert.equal(c3, c1, "même tiers = même code, même si le nom est lu différemment");
});

test("un code se résout localement vers le vrai tiers", () => {
  const d = chargerDossier(racineTemp(), "Menara");
  codeTiers(d.codes, { nom: "ATLAS NEGOCE SARL", ice: "003463957000076" });
  const t = resoudreCode(d.codes, "fourn-001");
  assert.equal(t.ice, "003463957000076");
  assert.equal(resoudreCode(d.codes, "FOURN-999"), null);
});

test("un doublon se reconnaît au couple tiers + numéro", () => {
  const d = chargerDossier(racineTemp(), "Menara");
  enregistrerPieces(d.historique, [{ cle: "ice:003463957000076", numero: "FAC-2026-042", ttc: 24600, date: "2026-07-28" }]);
  assert.ok(dejaPassee(d.historique, { cle: "ice:003463957000076", numero: "fac-2026-042" }));
  assert.equal(dejaPassee(d.historique, { cle: "ice:003463957000076", numero: "FAC-2026-051" }), null);
  assert.equal(dejaPassee(d.historique, { cle: "ice:999", numero: "FAC-2026-042" }), null);
  assert.equal(dejaPassee(d.historique, { cle: null, numero: "FAC-2026-042" }), null);
});

test("le slug d'un dossier reste un nom de dossier valide", () => {
  assert.equal(slugifier("Menara Distribution S.A"), "menara-distribution-s-a");
  assert.equal(slugifier("../../etc"), "etc");
  assert.equal(slugifier(""), "dossier");
});
