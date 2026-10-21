import { test } from "node:test";
import assert from "node:assert/strict";
import { extraireFacture } from "../server/extract.js";
import {
  proposerEcriture, completerMontants, tauxDeduit, resumerLot,
  COMPTE_TVA_CHARGES, COMPTE_FOURNISSEUR,
} from "../server/ecritures.js";
import {
  FACTURE_PROPRE, FACTURE_INCOHERENTE, FACTURE_SANS_NUMERO, FACTURE_SANS_TTC,
  ICE_SOCIETE,
} from "./factures.mjs";

const CONNU = { compte: "61253", libelle: "Fournitures de bureau", origine: "dossier", cle: "ice:003463957000076" };
const INCONNU = { compte: null, libelle: null, origine: null, cle: "ice:003463957000076" };
const AUJOURDHUI = "2026-08-01";

function pièce(texte, resolution = CONNU, options = {}) {
  const f = extraireFacture(texte, { iceSociete: ICE_SOCIETE, fichier: "piece.txt" });
  return proposerEcriture(f, resolution, { aujourdhui: AUJOURDHUI, ...options });
}

test("une facture propre et un fournisseur connu donnent une écriture sûre", () => {
  const p = pièce(FACTURE_PROPRE);
  assert.equal(p.statut, "sure");
  assert.deepEqual(p.raisons, []);
});

test("l'écriture d'achat suit le schéma CGNC : charge / TVA récupérable / fournisseur", () => {
  const p = pièce(FACTURE_PROPRE);
  assert.equal(p.lignes.length, 3);
  assert.deepEqual(
    p.lignes.map((l) => [l.compte, l.debit, l.credit]),
    [["61253", 20500, 0], [COMPTE_TVA_CHARGES, 4100, 0], [COMPTE_FOURNISSEUR, 0, 24600]]
  );
  const debit = p.lignes.reduce((s, l) => s + l.debit, 0);
  const credit = p.lignes.reduce((s, l) => s + l.credit, 0);
  assert.equal(debit, credit, "une écriture doit être équilibrée");
});

test("HT + TVA ≠ TTC part en « à vérifier » et l'écart est chiffré", () => {
  const p = pièce(FACTURE_INCOHERENTE);
  assert.equal(p.statut, "a_verifier");
  assert.ok(p.raisons.some((r) => r.includes("HT + TVA ≠ TTC") && r.includes("12.00")), p.raisons.join(" | "));
});

test("un numéro de pièce manquant suffit à douter", () => {
  const p = pièce(FACTURE_SANS_NUMERO);
  assert.equal(p.statut, "a_verifier");
  assert.ok(p.raisons.some((r) => r.includes("Numéro de facture introuvable")));
});

test("un montant reconstitué est signalé — le recoupement est perdu", () => {
  const p = pièce(FACTURE_SANS_TTC);
  assert.equal(p.statut, "a_verifier");
  assert.ok(p.raisons.some((r) => r.startsWith("TTC reconstitué")), p.raisons.join(" | "));
  assert.equal(p.ttc, 3424, "3 200 + 224");
});

test("un fournisseur inconnu du dossier ne produit jamais d'écriture sûre", () => {
  const p = pièce(FACTURE_PROPRE, INCONNU);
  assert.equal(p.statut, "a_verifier");
  assert.ok(p.raisons.some((r) => r.includes("Fournisseur inconnu")));
  assert.equal(p.lignes[0].compte, "", "la ligne de charge reste sans compte");
});

test("une proposition du socle demande UNE confirmation, elle ne passe pas seule", () => {
  const socle = { compte: "6145", libelle: "Frais postaux et télécommunications", origine: "socle", cle: "x" };
  const p = pièce(FACTURE_PROPRE, socle);
  assert.equal(p.statut, "a_verifier");
  assert.ok(p.raisons.some((r) => r.includes("proposé par le socle")));
  assert.equal(p.lignes[0].compte, "6145", "mais le compte est pré-rempli, pour un clic au lieu d'une saisie");
});

test("un doublon déjà exporté est signalé avec sa date", () => {
  const p = pièce(FACTURE_PROPRE, CONNU, {
    doublon: { exportLe: "2026-07-15", ttc: 24600, numero: "FAC-2026-042" },
  });
  assert.equal(p.statut, "a_verifier");
  assert.ok(p.raisons.some((r) => r.includes("déjà passé") && r.includes("2026-07-15")));
});

test("un taux de TVA hors barème marocain déclenche le doute", () => {
  const t = FACTURE_PROPRE.replace("TVA (20%) :  4 100,00", "TVA (18%) :  3 690,00")
    .replace("TOTAL TTC : 24 600,00 DH", "TOTAL TTC : 24 190,00 DH");
  const p = pièce(t);
  assert.equal(p.statut, "a_verifier");
  assert.ok(p.raisons.some((r) => r.includes("Taux de TVA inhabituel")), p.raisons.join(" | "));
});

test("une TVA qui ne correspond pas au taux affiché est attrapée", () => {
  const t = FACTURE_PROPRE.replace("TVA (20%) :  4 100,00", "TVA (20%) :  4 500,00")
    .replace("TOTAL TTC : 24 600,00 DH", "TOTAL TTC : 25 000,00 DH");
  const p = pièce(t);
  assert.ok(p.raisons.some((r) => r.includes("TVA incohérente avec le taux")), p.raisons.join(" | "));
});

test("une facture en devise étrangère n'est jamais automatique", () => {
  const t = FACTURE_PROPRE.replace("TOTAL TTC : 24 600,00 DH", "TOTAL TTC : 24 600,00 EUR");
  const p = pièce(t);
  assert.ok(p.raisons.some((r) => r.includes("EUR")), p.raisons.join(" | "));
});

test("une date très postérieure au traitement est suspecte", () => {
  const t = FACTURE_PROPRE.replace("Date : 28/07/2026", "Date : 28/07/2027");
  const p = pièce(t);
  assert.ok(p.raisons.some((r) => r.includes("Date dans le futur")), p.raisons.join(" | "));
});

test("completerMontants ne complète que s'il manque exactement un montant", () => {
  assert.deepEqual(completerMontants({ ht: 100, tva: 20, ttc: 120 }).reconstitue, null);
  assert.deepEqual(completerMontants({ ht: 100, tva: 20, ttc: null }), { ht: 100, tva: 20, ttc: 120, reconstitue: "TTC" });
  assert.deepEqual(completerMontants({ ht: 100, tva: null, ttc: 120 }), { ht: 100, tva: 20, ttc: 120, reconstitue: "TVA" });
  assert.deepEqual(completerMontants({ ht: null, tva: null, ttc: 120 }).reconstitue, null, "deux trous : on ne devine pas");
});

test("tauxDeduit retrouve le taux à partir des montants", () => {
  assert.equal(tauxDeduit(20500, 4100), 20);
  assert.equal(tauxDeduit(10000, 1400), 14);
  assert.equal(tauxDeduit(0, 100), null);
});

test("resumerLot compte sans jamais citer un tiers", () => {
  const lot = [pièce(FACTURE_PROPRE), pièce(FACTURE_INCOHERENTE), pièce(FACTURE_SANS_NUMERO)];
  const r = resumerLot(lot);
  assert.equal(r.total, 3);
  assert.equal(r.sures, 1);
  assert.equal(r.aVerifier, 2);
  assert.equal(r.totalDebitSur, 24600);
  const dump = JSON.stringify(r);
  assert.ok(!dump.includes("ATLAS"), "le résumé ne porte aucun nom de tiers");
});
