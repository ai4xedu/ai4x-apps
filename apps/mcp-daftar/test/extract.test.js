import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseMontant, dernierMontant, parseDate, trouverDateFacture, trouverIces,
  trouverNumero, trouverFournisseur, trouverMontants, ressembleARaisonSociale,
  extraireFacture, trouverDevise,
} from "../server/extract.js";
import {
  FACTURE_PROPRE, FACTURE_TELECOM, FACTURE_SANS_NUMERO, FACTURE_SANS_TTC,
  ICE_SOCIETE,
} from "./factures.mjs";

test("parseMontant lit les formats marocains, français et anglais", () => {
  assert.equal(parseMontant("20 500,00"), 20500);
  assert.equal(parseMontant("20.500,00"), 20500);
  assert.equal(parseMontant("20,500.00"), 20500);
  assert.equal(parseMontant("24 600"), 24600);
  assert.equal(parseMontant("3,200.00"), 3200);
  assert.equal(parseMontant("1 234 567,89"), 1234567.89);
  assert.equal(parseMontant("224.00"), 224);
  assert.equal(parseMontant("12,50"), 12.5);
  assert.equal(parseMontant("20,500"), 20500, "3 chiffres après la virgule = séparateur de milliers");
  assert.equal(parseMontant(""), null);
  assert.equal(parseMontant("néant"), null);
});

test("parseMontant survit aux espaces insécables des PDF", () => {
  assert.equal(parseMontant("20 500,00"), 20500);
  assert.equal(parseMontant("20 500,00"), 20500);
});

test("dernierMontant prend le montant de droite", () => {
  assert.equal(dernierMontant("Prestation de conseil   1   8 500,00"), 8500);
  assert.equal(dernierMontant("Total HT : 20 500,00"), 20500);
  assert.equal(dernierMontant("aucun chiffre ici"), null);
});

test("parseDate couvre les formats rencontrés", () => {
  assert.equal(parseDate("28/07/2026"), "2026-07-28");
  assert.equal(parseDate("28-07-26"), "2026-07-28");
  assert.equal(parseDate("2026-07-18"), "2026-07-18");
  assert.equal(parseDate("18 juillet 2026"), "2026-07-18");
  assert.equal(parseDate("32/07/2026"), null, "un 32 du mois n'existe pas");
  assert.equal(parseDate("pas de date"), null);
});

test("trouverDateFacture préfère la date de facture à l'échéance", () => {
  const t = "Echeance : 28/08/2026\nDate de facture : 28/07/2026";
  assert.equal(trouverDateFacture(t), "2026-07-28");
});

test("trouverIces ne retient que les suites de 15 chiffres", () => {
  const ices = trouverIces(FACTURE_PROPRE);
  const valeurs = ices.map((i) => i.ice);
  assert.ok(valeurs.includes("003463957000076"));
  assert.ok(valeurs.includes(ICE_SOCIETE));
  assert.ok(!valeurs.includes("65908714"), "l'IF n'est pas un ICE");
  assert.ok(ices.every((i) => i.ice.length === 15));
});

test("trouverNumero attrape les formes courantes, et renonce quand il n'y a rien", () => {
  assert.equal(trouverNumero(FACTURE_PROPRE), "FAC-2026-042");
  assert.equal(trouverNumero(FACTURE_TELECOM), "2026070033445");
  assert.equal(trouverNumero(FACTURE_SANS_TTC), "INV-2026-9012");
  assert.equal(trouverNumero(FACTURE_SANS_NUMERO), null);
});

test("ressembleARaisonSociale distingue un tiers d'une étiquette de facture", () => {
  assert.ok(ressembleARaisonSociale("ATLAS NEGOCE SARL"));
  assert.ok(ressembleARaisonSociale("Maroc Telecom"), "la casse de titre compte aussi");
  assert.ok(ressembleARaisonSociale("Menara Distribution S.A"));
  assert.ok(!ressembleARaisonSociale("ICE : 003463957000076"));
  assert.ok(!ressembleARaisonSociale("Date : 28/07/2026"));
  assert.ok(!ressembleARaisonSociale("Total HT : 20 500,00"));
  assert.ok(!ressembleARaisonSociale("12 Rue des Oudayas"));
  assert.ok(!ressembleARaisonSociale("TOTAL TTC"));
});

test("le fournisseur est l'ÉMETTEUR, pas le client — désambiguïsé par l'ICE du dossier", () => {
  const f = trouverFournisseur(FACTURE_PROPRE, { iceSociete: ICE_SOCIETE });
  assert.equal(f.ice, "003463957000076");
  assert.equal(f.nom, "ATLAS NEGOCE SARL");
  assert.equal(f.source, "ice-oppose");
});

test("sans ICE de société, on retombe sur la section ÉMETTEUR", () => {
  const f = trouverFournisseur(FACTURE_PROPRE, {});
  assert.equal(f.nom, "ATLAS NEGOCE SARL");
  assert.equal(f.source, "section-emetteur");
});

test("une facture sans section ÉMETTEUR est quand même attribuée au bon tiers", () => {
  const f = trouverFournisseur(FACTURE_TELECOM, { iceSociete: ICE_SOCIETE });
  assert.equal(f.nom, "Maroc Telecom");
  assert.equal(f.ice, "000095096000034");
});

test("trouverMontants lit HT, TVA, taux et TTC", () => {
  const m = trouverMontants(FACTURE_PROPRE);
  assert.deepEqual(m, { ht: 20500, tva: 4100, ttc: 24600, taux: 20 });
});

test("le taux ne doit jamais être confondu avec le montant de TVA", () => {
  const m = trouverMontants("Total HT : 10 000,00\nTVA 14% : 1 400,00\nTotal TTC : 11 400,00");
  assert.equal(m.taux, 14);
  assert.equal(m.tva, 1400);
});

test("un TTC absent reste absent — on n'invente rien à l'extraction", () => {
  const m = trouverMontants(FACTURE_SANS_TTC);
  assert.equal(m.ht, 3200);
  assert.equal(m.tva, 224);
  assert.equal(m.ttc, null);
});

test("trouverDevise repère le dirham", () => {
  assert.equal(trouverDevise(FACTURE_PROPRE), "MAD");
  assert.equal(trouverDevise("Total : 1 200 EUR"), "EUR");
  assert.equal(trouverDevise("Total : 1200"), null);
});

test("extraireFacture rend une pièce complète", () => {
  const f = extraireFacture(FACTURE_PROPRE, { iceSociete: ICE_SOCIETE, fichier: "piece-01.txt" });
  assert.equal(f.fichier, "piece-01.txt");
  assert.equal(f.fournisseur.nom, "ATLAS NEGOCE SARL");
  assert.equal(f.fournisseur.ice, "003463957000076");
  assert.equal(f.fournisseur.if, "65908714");
  assert.equal(f.fournisseur.rc, "620437");
  assert.equal(f.numero, "FAC-2026-042");
  assert.equal(f.date, "2026-07-28");
  assert.equal(f.ht, 20500);
  assert.equal(f.tva, 4100);
  assert.equal(f.ttc, 24600);
  assert.equal(f.taux, 20);
  assert.equal(f.devise, "MAD");
});
