// CHIFFRES (v2.2) — protégés par défaut : aucun montant réel ne sort, les
// dates restent lisibles, et le mode indice garde l'arithmétique juste.
import { test } from "node:test";
import assert from "node:assert/strict";
import { XLSX } from "../server/engine.js";
import { protectNumbers, describeNumbers } from "../server/chiffres.js";

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
  assert.match(describeNumbers([r], "clair"), /mode CLAIR/);
  const g = protectNumbers(payroll(), XLSX, { mode: "gabarit", headerRow: 0 });
  const line = describeNumbers([g], "gabarit");
  assert.match(line, /6 nombre\(s\) protégé\(s\)/);
  assert.ok(!/14500|11236/.test(line));
});
