import { test } from "node:test";
import assert from "node:assert/strict";
import { extraireFacture } from "../server/extract.js";
import { proposerEcriture } from "../server/ecritures.js";
import { journalCsv, revisionCsv, listeDeTravailMd, periodeDuLot, champ, nombre } from "../server/csv.js";
import { FACTURE_PROPRE, FACTURE_INCOHERENTE, ICE_SOCIETE } from "./factures.mjs";

const CONNU = { compte: "61253", libelle: "Fournitures", origine: "dossier", cle: "ice:003463957000076" };
const INCONNU = { compte: null, libelle: null, origine: null, cle: "ice:002233445000011" };

function lot() {
  const sure = proposerEcriture(
    extraireFacture(FACTURE_PROPRE, { iceSociete: ICE_SOCIETE, fichier: "piece-01.txt" }),
    CONNU, { aujourdhui: "2026-08-01" }
  );
  const douteuse = proposerEcriture(
    extraireFacture(FACTURE_INCOHERENTE, { iceSociete: ICE_SOCIETE, fichier: "piece-04.txt" }),
    INCONNU, { aujourdhui: "2026-08-01" }
  );
  return [sure, douteuse];
}

test("INVARIANT — le journal ne contient QUE les écritures sûres", () => {
  const [sure, douteuse] = lot();
  const csv = journalCsv([sure, douteuse]);
  assert.ok(csv.includes("FAC-2026-042"), "la pièce sûre est là");
  assert.ok(!csv.includes("FAC-2026-077"), "la pièce douteuse n'y entre jamais");
  assert.ok(!csv.includes("24612"), "ni son montant");
  const lignes = csv.trim().split("\r\n");
  assert.equal(lignes.length, 4, "un en-tête + les 3 lignes de l'écriture sûre");
});

test("le journal utilise le point décimal — c'est ce qu'attendent les imports", () => {
  const csv = journalCsv([lot()[0]]);
  assert.ok(csv.includes("20500.00"), csv);
  assert.ok(!csv.includes("20500,00"));
});

test("la révision, elle, est faite pour Excel : virgule et BOM", () => {
  const csv = revisionCsv(lot());
  assert.ok(csv.startsWith("﻿"), "sans BOM, Excel FR massacre les accents");
  assert.ok(csv.includes("20500,00"), csv.slice(0, 400));
});

test("la révision montre TOUT, y compris ce qui est sûr, avec le motif du doute", () => {
  const csv = revisionCsv(lot());
  assert.ok(csv.includes("SÛRE"));
  assert.ok(csv.includes("À VÉRIFIER"));
  assert.ok(csv.includes("HT + TVA"), "la raison est écrite en clair pour le comptable");
});

test("les champs contenant le séparateur sont échappés", () => {
  assert.equal(champ("SOCIETE X; SARL", ";"), '"SOCIETE X; SARL"');
  assert.equal(champ('Il a dit "oui"', ";"), '"Il a dit ""oui"""');
  assert.equal(champ("simple", ";"), "simple");
  assert.equal(nombre(1234.5, ","), "1234,50");
  assert.equal(nombre(null, ","), "");
});

test("la liste de travail explique le doute et pointe le justificatif", () => {
  const md = listeDeTravailMd(lot(), { dossier: "Menara", periode: "2026-07", journalFichier: "/tmp/journal.csv" });
  assert.ok(md.includes("À vérifier — Menara · 2026-07"));
  assert.ok(md.includes("HT + TVA ≠ TTC"));
  assert.ok(md.includes("piece-04.txt"), "le chemin du justificatif doit y être");
  assert.ok(!md.includes("FAC-2026-042"), "les pièces sûres ne polluent pas la liste de travail");
});

test("une liste de travail vide le dit clairement", () => {
  const md = listeDeTravailMd([lot()[0]], { dossier: "Menara", periode: "2026-07", journalFichier: "/tmp/j.csv" });
  assert.ok(md.includes("Rien à vérifier"));
});

test("la période d'un lot est le mois majoritaire", () => {
  const p = [
    { date: "2026-07-28" }, { date: "2026-07-12" }, { date: "2026-06-30" },
  ];
  assert.equal(periodeDuLot(p), "2026-07");
  assert.equal(periodeDuLot([{ date: null }], "2026-08-01T00:00:00Z"), "2026-08");
});
