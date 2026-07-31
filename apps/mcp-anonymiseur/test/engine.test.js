// Tests du moteur (node:test) — mêmes invariants que l'appli web v2.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  XLSX, detectByHeader, detectByValues, classifyLoose, scanSheet,
  anonymizeSheet, leakScan, decodeText, newCodebook, sheetToTsv, looksLikeTable,
  detectLayout, codeDocumentText, anonymizeDocument, isMoroccanPhone,
} from "../server/engine.js";

const FACTURE_AOA = [
  ["", "", "", "FACTURE"],
  ["ÉMETTEUR", "", "", "CLIENT"],
  ["ICE : 003463957000076", "", "", "ICE : 001510119000058"],
  ["IF : 65908714   |   RC : 620437 (Casablanca)"],
  ["N°", "Désignation", "Qté", "Montant HT"],
  [1, "Formation Claude Bootcamp", 1, 2150],
  ["", "", "Total HT", 2150],
];

const AOA = [
  ["Nom", "Prénom", "CIN", "Email", "Téléphone", "RIB", "Ville", "Montant"],
  ["El Amrani", "Yassine", "AB123456", "yassine.elamrani@gmail.com", "06 61 23 45 67", "007810000123456789012345", "Casablanca", 12400],
  ["Benkirane", "Salma", "K456789", "s.benkirane@exemple.ma", "06 62 98 76 54", "007810000987654321098765", "Rabat", 3250],
  ["El Amrani", "Yassine", "AB123456", "yassine.elamrani@gmail.com", "06 61 23 45 67", "007810000123456789012345", "Casablanca", 4100],
];

function makeWs() {
  return XLSX.utils.aoa_to_sheet(AOA);
}

test("détection par en-tête : prénom avant nom, types corrects", () => {
  assert.equal(detectByHeader("Prénom"), "prenom");
  assert.equal(detectByHeader("Nom"), "nom");
  assert.equal(detectByHeader("Nom complet"), "personne");
  assert.equal(detectByHeader("CIN"), "cin");
  assert.equal(detectByHeader("Téléphone"), "tel");
  assert.equal(detectByHeader("RIB"), "rib");
  assert.equal(detectByHeader("Ville"), null);
});

test("détection par contenu", () => {
  assert.equal(detectByValues(["a@b.ma", "c@d.ma", "e@f.ma"]), "email");
  assert.equal(detectByValues(["0661234567", "0708091011", "+212 6 70 11 22 33"]), "tel");
  assert.equal(detectByValues(["Casablanca", "Rabat"]), null);
});

test("scanSheet coche les colonnes sensibles, épargne Ville et Montant", () => {
  const cols = scanSheet(makeWs());
  const byHeader = Object.fromEntries(cols.map((c) => [c.header, c]));
  assert.equal(byHeader["Nom"].checked, true);
  assert.equal(byHeader["RIB"].checked, true);
  assert.equal(byHeader["Ville"].checked, false);
  assert.equal(byHeader["Montant"].checked, false);
});

test("anonymisation : dédup, codes stables entre deux passes (clé partagée)", () => {
  const ws = makeWs();
  const cols = scanSheet(ws);
  const book = newCodebook();
  const r1 = anonymizeSheet(ws, cols, book);
  assert.equal(r1.stats.replaced, 18); // 6 colonnes × 3 lignes
  assert.equal(r1.stats.newCodes, 12); // ligne dupliquée -> codes réutilisés
  const r2 = anonymizeSheet(makeWs(), scanSheet(makeWs()), book);
  assert.equal(r2.stats.newCodes, 0);
  assert.equal(book.entries.length, 12);
  const aoa = XLSX.utils.sheet_to_json(r2.ws, { header: 1 });
  assert.equal(aoa[1][0], "NOM-001");
  assert.equal(aoa[3][0], "NOM-001");
  assert.equal(aoa[1][6], "Casablanca");
  assert.equal(aoa[1][7], 12400);
});

test("aller-retour : décodage restitue les valeurs, insensible à la casse", () => {
  const ws = makeWs();
  const cols = scanSheet(ws);
  const book = newCodebook();
  anonymizeSheet(ws, cols, book);
  const map = Object.fromEntries(book.entries.map((e) => [e.code.toUpperCase(), e.value]));
  const res = decodeText("Relancer nom-002 PRENOM-002 au TEL-002.", map);
  assert.equal(res.replaced, 3);
  assert.ok(res.text.includes("Benkirane"));
  assert.ok(res.text.includes("06 62 98 76 54"));
});

test("contrôle de fuite : email et téléphone enfouis détectés, factures épargnées", () => {
  assert.deepEqual(classifyLoose("RAS, facture 2026-0789 réglée le 15/07/2026"), []);
  assert.ok(classifyLoose("joindre yassine@gmail.com si absent").includes("email"));
  assert.ok(classifyLoose("son frère répond au 0655443322").includes("téléphone"));
  const aoa = [
    ["Nom", "Commentaires"],
    ["El Amrani", "Relancé le 12/07, joindre yassine.elamrani@gmail.com si absent"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const cols = scanSheet(ws);
  const leaks = leakScan(ws, cols);
  assert.equal(leaks.length, 1);
  assert.equal(leaks[0].header, "Commentaires");
});

test("téléphone = forme marocaine uniquement — les montants ne sont plus des numéros", () => {
  assert.ok(isMoroccanPhone("0661234567"));
  assert.ok(isMoroccanPhone("+212661234567"));
  assert.ok(!isMoroccanPhone("202600789"));      // référence 9 chiffres — ex-faux positif
  assert.ok(!isMoroccanPhone("123456789012"));   // montant en centimes
  assert.equal(detectByValues(["202600789", "202600790", "202600791"]), null);
  assert.equal(detectByValues(["0661234567", "0708091011", "+212 6 70 11 22 33"]), "tel");
});

test("detectLayout : tableau avec en-têtes vs facture mise en page", () => {
  assert.equal(detectLayout(makeWs()).layout, "tableau");
  assert.equal(detectLayout(XLSX.utils.aoa_to_sheet(FACTURE_AOA)).layout, "document");
});

test("codeDocumentText : libellé conservé, valeur codée, même valeur = même code", () => {
  const book = newCodebook();
  const r1 = codeDocumentText("ICE : 003463957000076", book);
  assert.equal(r1.text, "ICE : ICE-001");
  const r2 = codeDocumentText("Rappel : leur ICE 003463957000076 est inchangé", book);
  assert.ok(r2.text.includes("ICE-001"));
  assert.equal(r2.newCodes, 0);
  const r3 = codeDocumentText("RIB : 007810000123456789012345", book);
  assert.ok(r3.text.includes("RIB-001"));
  const r4 = codeDocumentText("Tél : +212 6 61 23 45 67", book);
  assert.match(r4.text, /Tél : TEL-\d{3}/);
});

test("codeDocumentText épargne montants, dates et références", () => {
  const book = newCodebook();
  const r = codeDocumentText(
    "Total TTC : 2 580,00 DH — échéance 2026-08-15 — Facture FAC-2026-003 — réf 123456789",
    book
  );
  assert.equal(r.replaced, 0, "une donnée métier a été codée : " + r.text);
});

test("codeDocumentText : valeurs fournies (noms propres) codées partout, insensible à la casse", () => {
  const book = newCodebook();
  const r = codeDocumentText(
    "Le client Sophatel S.A (contrat SOPHATEL S.A) a signé",
    book,
    [{ value: "Sophatel S.A", type: "autre" }]
  );
  assert.ok(!/sophatel/i.test(r.text), "le nom fourni est resté : " + r.text);
  assert.equal(r.newCodes, 1); // une seule entrée de clé pour les deux occurrences
});

test("anonymizeDocument : cellules numériques et libellés intacts, identifiants codés", () => {
  const ws = XLSX.utils.aoa_to_sheet(FACTURE_AOA);
  const res = anonymizeDocument(ws, newCodebook());
  const aoa = XLSX.utils.sheet_to_json(res.ws, { header: 1, defval: "" });
  assert.equal(aoa[2][0], "ICE : ICE-001");
  assert.equal(aoa[2][3], "ICE : ICE-002");
  assert.match(aoa[3][0], /IF : IF-001/);
  assert.match(aoa[3][0], /RC : RC-001/);
  assert.equal(aoa[5][3], 2150);            // montant numérique intact
  assert.equal(aoa[6][2], "Total HT");      // libellé intact
  assert.equal(aoa[5][1], "Formation Claude Bootcamp"); // désignation intacte
  assert.equal(aoa[0][3], "FACTURE");
});

test("sheetToTsv tronque et looksLikeTable reconnaît un TSV", () => {
  const { tsv, totalRows, shownRows } = sheetToTsv(makeWs(), 2);
  assert.equal(totalRows, 3);
  assert.equal(shownRows, 2);
  assert.ok(looksLikeTable(tsv));
  assert.ok(!looksLikeTable("Relancer NOM-001 demain."));
});
