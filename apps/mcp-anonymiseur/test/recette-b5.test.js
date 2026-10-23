// RECETTE B5 (23/10/2026) — des conclusions fictives codées par l'appli ont
// laissé passer la fin d'une plaque et une date de naissance, donné deux
// codes au même garage, et codé un intitulé et des mots courants. Chaque cas
// est rejoué ici par le même chemin que Word et PDF : moteur puis verrou.
import { test } from "node:test";
import assert from "node:assert/strict";
import { strictCode } from "../server/verrou.js";
import { newCodebook, anonymizeText } from "../server/engine.js";

const full = (t, book = newCodebook()) => strictCode(anonymizeText(t, book, [], {}).text, { book, extra: [] }).text;
const codes = (s, prefix) => [...new Set(s.match(new RegExp(`\\b${prefix}-\\d{3}\\b`, "g")) || [])];

test("une plaque d'immatriculation est codée en entier", () => {
  for (const p of ["AB-123-CD", "AB 123 CD", "AB123CD"]) {
    const out = full(`son véhicule immatriculé ${p} au garage`);
    assert.match(out, /^son véhicule immatriculé IMMAT-\d{3} au garage$/, `${p} → ${out}`);
  }
  // Ancien format (FNI), seulement derrière « immatriculé(e) » : ailleurs,
  // « 1240 EUR 12 » n'est pas une plaque.
  assert.match(full("véhicule immatriculé 1234 AB 38 depuis 2009"), /immatriculé IMMAT-\d{3} depuis 2009/);
  // Les deux lettres de fin ne restent jamais en clair.
  assert.doesNotMatch(full("La Clio AB-123-CD a été restituée."), /-CD\b|\bCD\b/);
});

test("une date de naissance est codée ; les autres dates restent lisibles", () => {
  const out = full("M. Thomas Martin, né le 12 avril 1981 à Grenoble, a signé le 5 janvier 2026.");
  assert.match(out, /né le NAISS-\d{3} à Grenoble/);
  assert.match(out, /le 5 janvier 2026\.$/);
  assert.doesNotMatch(out, /1981/);
  for (const [t, gone] of [
    ["Mme Nadia El Amrani, née le 03/07/1985, demeurant à Lyon", "1985"],
    ["Date de naissance : 1er mars 1979", "1979"],
    ["Il est né en 1990 à Rabat.", "1990"],
    ["née le 2 février 1975", "1975"],
  ]) assert.doesNotMatch(full(t), new RegExp(gone), t);
  // La même date de naissance = le même code (même personne, plusieurs pièces).
  const book = newCodebook();
  const a = full("né le 12 avril 1981", book), b = full("Date de naissance : 12 avril 1981", book);
  assert.deepEqual(codes(a, "NAISS"), codes(b, "NAISS"));
});

test("une société a UN code, partout où elle revient dans le texte", () => {
  const out = full("CONTRE : SARL Garage Lefèvre, prise en la personne de son gérant M. Patrick Lefèvre. " +
    "M. Martin a confié son véhicule au Garage Lefèvre pour une révision.");
  // La forme juridique reste lisible : elle dit à l'IA que c'est une société.
  assert.match(out, /^CONTRE : SARL SOCIETE-\d{3},/);
  const soc = codes(out, "SOCIETE");
  assert.equal(soc.length, 1, out);
  assert.match(out, new RegExp(`au ${soc[0]} pour une révision`));
  // Le gérant reste une personne, avec son propre code.
  assert.match(out, /gérant M\. PRENOM-\d{3} NOM-\d{3}\./);
  // D'un fichier à l'autre, la clé garde le même code.
  const book = newCodebook();
  const a = full("CONTRE : SARL Garage Lefèvre.", book);
  const b = full("La facture du Garage Lefèvre est jointe.", book);
  assert.deepEqual(codes(a, "SOCIETE"), codes(b, "SOCIETE"));
  assert.doesNotMatch(b, /Garage|Lefèvre/);
});

test("« Cabinet Fontaine & Associés » est une seule société", () => {
  const out = full("Cabinet Fontaine & Associés — Dossier 2026-118 — Martin c/ Garage Lefèvre");
  assert.match(out, /^Cabinet SOCIETE-\d{3} — Dossier REF-\d{3} — PRENOM-\d{3} c\/ /);
  assert.doesNotMatch(out, /Fontaine|Associés|Martin|Lefèvre/);
});

test("un intitulé d'acte en majuscules n'est pas une société", () => {
  for (const t of ["CONCLUSIONS EN DÉFENSE", "CONCLUSIONS D'INTERVENTION VOLONTAIRE", "ATTESTATION EMPLOYEUR",
    "LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION", "MISE EN DEMEURE", "PROCÈS-VERBAL DE CONSTAT"]) {
    assert.equal(full(t), t);
  }
  // Une en-tête de société en majuscules reste codée.
  assert.doesNotMatch(full("HORIZON IMMOBILIER\n12 rue des Lilas, 69002 Lyon"), /HORIZON|IMMOBILIER/);
  assert.doesNotMatch(full("BATIRENOV SAS"), /BATIRENOV/);
});

test("le document entier de la recette B5 : rien ne reste en clair, le sens reste", () => {
  const doc = [
    "CONCLUSIONS EN DÉFENSE",
    "POUR : M. Thomas Martin, né le 12 avril 1981 à Grenoble, demeurant 27 rue Victor Hugo, 38000 Grenoble, ayant pour avocat Maître Claire Fontaine.",
    "CONTRE : SARL Garage Lefèvre, RCS Grenoble 812 345 678, prise en la personne de son gérant M. Patrick Lefèvre.",
    "Le 5 janvier 2026, M. Martin a confié son véhicule immatriculé AB-123-CD au Garage Lefèvre pour une révision facturée 1 240 €.",
    "Facture n° 2026-0042\tGarage Lefèvre\t9 janvier 2026",
    "Cabinet Fontaine & Associés — Dossier 2026-118 — Martin c/ Garage Lefèvre",
  ].join("\n");
  const out = full(doc);
  for (const v of ["Thomas", "Martin", "1981", "Victor Hugo", "Claire", "Fontaine", "Lefèvre", "Patrick", "AB-123", "-CD", "812 345 678"]) {
    assert.ok(!out.includes(v), `${v} en clair :\n${out}`);
  }
  for (const v of ["CONCLUSIONS EN DÉFENSE", "SARL", "Dossier", "1 240 €", "5 janvier 2026", "Grenoble"]) {
    assert.ok(out.includes(v), `${v} devrait rester lisible :\n${out}`);
  }
  assert.equal(codes(out, "SOCIETE").length, 2, out);   // le garage et le cabinet
});

test("un n° de sécurité sociale est codé en entier, jamais en morceaux (recette B6)", () => {
  for (const nir of ["2 85 07 75 123 456 78", "1 81 04 38 185 023 61", "285077512345678", "2 85 07 2A 123 456"]) {
    const out = full(`N° de sécurité sociale : ${nir}`);
    assert.match(out, /^N° de sécurité sociale : CIN-\d{3}$/, `${nir} → ${out}`);
  }
  // Un téléphone marocain reste un téléphone.
  assert.match(full("Tél : 06 61 23 45 67"), /^Tél : TEL-\d{3}$/);
  assert.match(full("Appeler le 0661234567 demain"), /^Appeler le TEL-\d{3} demain$/);
});

test("en-tête de tableau et nom coupé en fin de ligne (PDF) — v2.15.1", () => {
  assert.equal(full("Pièce Émetteur Date"), "Pièce Émetteur Date");
  assert.equal(full("Désignation Quantité Montant Échéance"), "Désignation Quantité Montant Échéance");
  const out = full("CONTRE : SARL Garage Lefèvre, RCS Grenoble.\nM. Martin a confié son véhicule au Garage\nLefèvre pour une révision.");
  const soc = codes(out, "SOCIETE");
  assert.equal(soc.length, 1, out);
  assert.match(out, new RegExp(`au ${soc[0]} pour une révision`), out);
  // Un patronyme qui est aussi un mot d'en-tête reste codé derrière un titre.
  assert.doesNotMatch(full("Le rapport de M. Date est joint."), /M\. Date/);
});
