// HT-BENCH — les pièces du banc qui ne lancent pas le moteur : balisage,
// réalignement d'un texte codé, règle « détectée / partielle / manquée »,
// reproductibilité du générateur. Le banc complet tourne dans le job
// ht-bench de la CI (npm run bench:ht:controle).
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyser } from "../bench/ht-bench/lib/balisage.mjs";
import { aligner } from "../bench/ht-bench/lib/alignement.mjs";
import { evaluerDocument } from "../bench/ht-bench/lib/score.mjs";
import { generer } from "../bench/ht-bench/generer.mjs";
import { iban, luhnComplete } from "../bench/ht-bench/lib/identifiants.mjs";

test("balisage : texte nu, étendues aux bonnes positions, leurres à part", () => {
  const { texte, etendues, leurres } = analyser("M. [[PERSONNE|mag-ben-espace:Hamza Ben Moussa]] doit {{MONTANT:1 250,00 MAD}}.");
  assert.equal(texte, "M. Hamza Ben Moussa doit 1 250,00 MAD.");
  assert.equal(texte.slice(etendues[0].debut, etendues[0].fin), "Hamza Ben Moussa");
  assert.equal(etendues[0].variante, "mag-ben-espace");
  assert.equal(texte.slice(leurres[0].debut, leurres[0].fin), "1 250,00 MAD");
  assert.throws(() => analyser("[[INCONNU:x]]"), /type inconnu/);
});

test("alignement : un code avale sa valeur, même écrite autrement", () => {
  const o = "M. Mohamed Ben Ali, tél. 06 61 23 45 67 puis 0661234567.";
  const c = "M. PRENOM-001 Ben PRENOM-002, tél. TEL-001 puis TEL-001.";
  const { segments, imbrique } = aligner(o, c, { "PRENOM-001": "Mohamed", "PRENOM-002": "Ali", "TEL-001": "06 61 23 45 67" });
  assert.equal(imbrique, false);
  assert.deepEqual(segments.map((s) => o.slice(s.debut, s.fin)), ["Mohamed", "Ali", "06 61 23 45 67", "0661234567"]);
});

test("alignement : une sortie imbriquée (« NOM-001-002 ») est signalée et notée quand même", () => {
  const o = "FACTURE n° FAC-2025-3508 du 20/11/2019";
  const c = "NOM-001-002 n° NOM-001-002-001 du 20/11/2019";
  const { segments, imbrique } = aligner(o, c, { "NOM-001": "FACTFACTURE", "FACTURE-001": "FAC-2025-3508", "FACTURE-002": "URE" });
  assert.equal(imbrique, true);
  assert.ok(segments.some((s) => s.debut <= 11 && s.fin >= 24), JSON.stringify(segments));
  assert.ok(segments.every((s) => s.fin <= o.indexOf(" du ")), "la date reste en clair");
});

test("score : particules permises, morceau en clair = partielle, leurre codé = faux positif", () => {
  const doc = { ...analyser("[[PERSONNE:Mohamed Ben Ali]] et [[PERSONNE:Ma'ati Tazi]], {{MOT:Noël}}."), id: "t" };
  const seg = (v, p) => { const i = doc.texte.indexOf(v); return { debut: i, fin: i + v.length, code: `${p}-001`, prefixe: p }; };
  const r = evaluerDocument(doc, [seg("Mohamed", "PRENOM"), seg("Ali", "NOM"), seg("ati", "CODE"), seg("Tazi", "NOM"), seg("Noël", "PRENOM")], "PRENOM-001 Ben NOM-001 et Ma'CODE-001 NOM-002, PRENOM-002.");
  assert.equal(r.positifs[0].statut, "detecte");
  assert.equal(r.positifs[1].statut, "partiel");
  assert.equal(r.positifs[1].vuParIA, true);
  assert.equal(r.leurres[0].code, true);
});

test("identifiants synthétiques : clés de contrôle valides", () => {
  const i = iban("MA", "011780000012345678901234");
  const n = BigInt((i.slice(4) + i.slice(0, 4)).replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55)));
  assert.equal(n % 97n, 1n);
  const l = luhnComplete("35209900176148");
  const s = l.split("").reverse().map(Number).reduce((a, d, k) => a + (k % 2 ? (d * 2 > 9 ? d * 2 - 9 : d * 2) : d), 0);
  assert.equal(s % 10, 0);
});

test("générateur : même graine, même jeu ; aucun id en double", () => {
  const a = generer(), b = generer();
  assert.equal(a.jsonl, b.jsonl);
  assert.equal(new Set(a.docs.map((d) => d.id)).size, a.docs.length);
  for (const d of a.docs) for (const e of [...d.etendues, ...d.leurres]) assert.equal(d.texte.slice(e.debut, e.fin), e.valeur, d.id);
});
