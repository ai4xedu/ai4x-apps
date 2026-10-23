// CHIFFRES (v2.2) — protégés par défaut : aucun montant réel ne sort, les
// dates restent lisibles, et le mode indice garde l'arithmétique juste.
import { test } from "node:test";
import assert from "node:assert/strict";
import { XLSX } from "../server/engine.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { protectNumbers, describeNumbers, planNumbers, classifyNumericHeader, readNumberSetting, DEFAULT_NUMBER_MODE } from "../server/chiffres.js";

function payroll() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Nom", "Date d'entrée", "Brut", "Net", "Taux"],
    ["NOM-001", 45200, 14500, 11236, 0.225],
    ["NOM-002", 45300, 9800, 7954, 0.188],
  ]);
  for (const a of ["B2", "B3"]) ws[a].z = "dd/mm/yyyy";
  ws.C2.z = '#,##0.00 "MAD"';
  ws.C2.w = "14 500,00 MAD";   // le texte formaté porte la vraie valeur
  return ws;
}

test("gabarit : chaque montant est remplacé, le texte formaté part, le format reste", () => {
  const ws = payroll();
  const r = protectNumbers(ws, XLSX, { mode: "gabarit", headerRow: 0 });
  assert.equal(r.cells, 6);
  assert.deepEqual(r.real, { C2: 14500, D2: 11236, E2: 0.225, C3: 9800, D3: 7954, E3: 0.188 });
  for (const a of Object.keys(r.real)) {
    assert.notEqual(ws[a].v, r.real[a], `${a} inchangé`);
    assert.equal(ws[a].w, undefined, `${a} garde son texte formaté réel`);
  }
  assert.equal(ws.C2.z, '#,##0.00 "MAD"');
  const all = JSON.stringify(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }));
  for (const v of ["14500", "14 500", "11236", "9800", "7954"]) assert.ok(!all.includes(v), `${v} visible`);
});

test("les dates et les en-têtes restent lisibles, dans tous les modes", () => {
  for (const mode of ["gabarit", "indice"]) {
    const ws = payroll();
    protectNumbers(ws, XLSX, { mode, headerRow: 0 });
    assert.equal(ws.B2.v, 45200);
    assert.equal(ws.B3.v, 45300);
    assert.equal(ws.C1.v, "Brut");
  }
});

test("indice : un seul facteur, donc totaux et proportions restent justes", () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ["", "Montant HT"], ["Ligne 1", 18400], ["Ligne 2", 2600], ["Total HT", 21000], ["TVA", 4200], ["TTC", 25200],
  ]);
  const r = protectNumbers(ws, XLSX, { mode: "indice", headerRow: null });
  const v = (a) => ws[a].v;
  assert.ok(Math.abs(v("B2") + v("B3") - v("B4")) < 0.05, "HT = somme des lignes");
  assert.ok(Math.abs(v("B4") + v("B5") - v("B6")) < 0.05, "TTC = HT + TVA");
  assert.ok(Math.abs(v("B5") / v("B4") - 0.2) < 0.001, "le taux de TVA est préservé");
  assert.ok(!Object.values(r.real).some((x) => [v("B2"), v("B4")].includes(x)));
  // Le facteur est brouillé : « 100 = la moyenne » exactement serait réversible.
  const mean = (18400 + 2600 + 21000 + 4200 + 25200) / 5;
  assert.ok(r.factor >= (100 / mean) * 0.8 && r.factor <= (100 / mean) * 1.2);
});

test("clair : rien ne change ; et le plan le dit sans citer de montant", () => {
  const ws = payroll();
  const r = protectNumbers(ws, XLSX, { mode: "clair", headerRow: 0 });
  assert.equal(r.cells, 0);
  assert.equal(ws.C2.v, 14500);
  assert.match(describeNumbers([r], "clair"), /réglage « clair ».*0 nombre\(s\) protégé\(s\), 6 en clair/);
  const g = protectNumbers(payroll(), XLSX, { mode: "gabarit", headerRow: 0 });
  const line = describeNumbers([g], "gabarit");
  assert.match(line, /6 nombre\(s\) protégé\(s\)/);
  assert.ok(!/14500|11236/.test(line));
});

/* ---------------------------------------------------------- v2.16 : auto - */

test("auto est le défaut : paie protégée, taux en clair, dates intactes, le plan dit tout sans valeur", () => {
  assert.equal(DEFAULT_NUMBER_MODE, "auto");
  const ws = payroll();
  const plan = planNumbers(ws, XLSX, { mode: "auto", headerRow: 0, source: "défaut" });
  assert.deepEqual(plan.colonnes.map((c) => [c.libelle, c.classe, c.mode]),
    [["Brut", "sensible", "gabarit"], ["Net", "sensible", "gabarit"], ["Taux", "taux", "clair"]]);
  const r = protectNumbers(ws, XLSX, { headerRow: 0, plan });
  assert.equal(r.cells, 4);
  assert.equal(r.clair, 2);
  assert.notEqual(ws.C2.v, 14500);
  assert.equal(ws.E2.v, 0.225, "le taux reste en clair");
  assert.equal(ws.B2.v, 45200, "la date reste");
  const txt = describeNumbers([r], "auto", "défaut");
  assert.match(txt, /« Brut » \(montant sensible\) → GABARIT \(factice\), 2 nombre\(s\)/);
  assert.match(txt, /« Taux » \(taux\) → en clair/);
  assert.match(txt, /chiffres_par_colonne/);
  assert.ok(!/14500|11236|0\.225/.test(txt), "aucune valeur dans le plan");
});

test("classer un en-tête : finance sensible, montant ordinaire, taux, quantité, numéro", () => {
  const c = (h) => classifyNumericHeader(h).classe;
  for (const h of ["Salaire brut", "Net à payer", "Chiffre d'affaires", "CA 2025", "Résultat net", "Patrimoine", "Solde", "Honoraires", "Cotisations", "Brut", "Rémunération"]) assert.equal(c(h), "sensible", h);
  for (const h of ["Montant HT", "Total TTC", "Prix unitaire", "Acompte versé", "Créance", "Impayé", "Indemnité demandée", "Loyer"]) assert.equal(c(h), "montant", h);
  for (const h of ["Taux", "TVA %", "Coefficient", "Ratio"]) assert.equal(c(h), "taux", h);
  for (const h of ["Quantité", "Qté", "Nb heures", "Surface m2", "Délai (jours)", "Âge"]) assert.equal(c(h), "quantite", h);
  for (const h of ["N° facture", "Année", "Exercice", "Code postal", "Matricule", "Mois"]) assert.equal(c(h), "numero", h);
  assert.equal(c(""), "autre");
  assert.equal(c("Colonne F"), "autre");
});

test("un montant ordinaire reste en clair en auto ; l'utilisateur le protège colonne par colonne", () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Client", "Facture", "Montant HT", "Quantité", "Salaire du gérant"],
    ["NOM-001", "FA-1", 18500, 3, 4200],
    ["NOM-002", "FA-2", 7320, 1, 3900],
  ]);
  let plan = planNumbers(ws, XLSX, { mode: "auto", headerRow: 0 });
  assert.deepEqual(plan.colonnes.map((c) => [c.libelle, c.mode]), [["Montant HT", "clair"], ["Quantité", "clair"], ["Salaire du gérant", "gabarit"]]);
  // Correction par en-tête (insensible à la casse et aux accents) ou par lettre.
  plan = planNumbers(ws, XLSX, { mode: "auto", headerRow: 0, parColonne: { "montant ht": "indice", D: "gabarit", "Inconnue": "clair" } });
  assert.deepEqual(plan.colonnes.map((c) => [c.libelle, c.mode, c.corrige]), [["Montant HT", "indice", true], ["Quantité", "gabarit", true], ["Salaire du gérant", "gabarit", false]]);
  assert.deepEqual(plan.ignores, ["inconnue"]);
  const r = protectNumbers(ws, XLSX, { headerRow: 0, plan });
  assert.equal(r.cells, 6);
  assert.ok(r.factor, "un facteur pour la colonne indice");
  assert.ok(Math.abs(ws.C2.v / ws.C3.v - 18500 / 7320) < 2e-3, "proportions de la colonne indice justes (arrondi au centime)");
  assert.match(describeNumbers([r], "auto"), /1 clé\(s\) ne correspond/);
  // Un mode pour tout le fichier l'emporte sur le classement, pas sur une correction.
  const tout = planNumbers(ws, XLSX, { mode: "clair", headerRow: 0, parColonne: { E: "gabarit" } });
  assert.deepEqual(tout.colonnes.map((c) => c.mode), ["clair", "clair", "gabarit"]);
});

test("mise en page document : en clair, sauf si le texte parle de paie ou de comptes", () => {
  const facture = XLSX.utils.aoa_to_sheet([["FACTURE n° 12"], ["Désignation", "Montant"], ["Prestation", 1240], ["TVA 20 %", 248], ["TTC", 1488]]);
  let plan = planNumbers(facture, XLSX, { mode: "auto", headerRow: null });
  assert.equal(plan.resolu, "clair");
  const r = protectNumbers(facture, XLSX, { headerRow: null, plan });
  assert.equal(r.cells, 0); assert.equal(r.clair, 3);
  assert.match(describeNumbers([r], "auto"), /sans en-têtes : nombres en clair/);
  const bulletin = XLSX.utils.aoa_to_sheet([["BULLETIN DE PAIE"], ["Salaire de base", 3200], ["Net à payer", 2496]]);
  plan = planNumbers(bulletin, XLSX, { mode: "auto", headerRow: null });
  assert.equal(plan.resolu, "gabarit");
  protectNumbers(bulletin, XLSX, { headerRow: null, plan });
  assert.notEqual(bulletin.B2.v, 3200);
});

test("le réglage du dossier : reglages.json de l'appli, puis la variable, puis auto", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ht-chiffres-"));
  assert.deepEqual(readNumberSetting(dir, {}), { mode: "auto", source: "défaut" });
  assert.equal(readNumberSetting(dir, { ANX_CHIFFRES: "indice" }).mode, "indice");
  fs.writeFileSync(path.join(dir, "reglages.json"), JSON.stringify({ chiffres: "clair" }));
  assert.deepEqual(readNumberSetting(dir, { ANX_CHIFFRES: "indice" }), { mode: "clair", source: "réglage du dossier, posé dans l'appli Hidden Tokens" });
  fs.writeFileSync(path.join(dir, "reglages.json"), JSON.stringify({ chiffres: "n'importe quoi" }));
  assert.equal(readNumberSetting(dir, {}).mode, "auto", "une valeur inconnue est ignorée");
  fs.writeFileSync(path.join(dir, "reglages.json"), "{ pas du json");
  assert.equal(readNumberSetting(dir, {}).mode, "auto");
});
