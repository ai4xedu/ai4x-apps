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

test("alignement : chiffres arabes orientaux dans l'origine, chiffres latins dans la clé", () => {
  const o = "الهاتف: ٠٦ ٦١ ٢٣ ٤٥ ٦٧ — CIN BK٤٥٦٧٨٩.";
  const c = "الهاتف: TEL-001 — CIN CIN-001.";
  const { segments, imbrique } = aligner(o, c, { "TEL-001": "0661234567", "CIN-001": "BK456789" });
  assert.equal(imbrique, false);
  assert.deepEqual(segments.map((s) => o.slice(s.debut, s.fin)), ["٠٦ ٦١ ٢٣ ٤٥ ٦٧", "BK٤٥٦٧٨٩"]);
});

test("score en arabe : particules (بن، آيت) permises, voyelles (tachkil) sans effet, prénom coupé = partielle", () => {
  const doc = { ...analyser("السيد [[PERSONNE:مُحَمَّد بن علي]] و[[PERSONNE:حمزة آيت لحسن]]، رقم [[ADRESSE:رقم ١٢، زنقة المتنبي]]."), id: "t" };
  const seg = (v, p) => { const i = doc.texte.indexOf(v); return { debut: i, fin: i + v.length, code: `${p}-001`, prefixe: p }; };
  const r = evaluerDocument(doc, [seg("مُحَمَّد", "PRENOM"), seg("علي", "NOM"), seg("حمزة", "PRENOM"), seg("المتنبي", "ADRESSE")]);
  assert.deepEqual(r.positifs.map((e) => e.statut), ["detecte", "partiel", "detecte"]);
  assert.deepEqual(r.positifs[1].enClair, ["لحسن"]);
  const r2 = evaluerDocument(doc, [seg("مُحَ", "CODE"), seg("علي", "NOM")]);
  assert.equal(r2.positifs[0].statut, "partiel");
  assert.deepEqual(r2.positifs[0].enClair, ["مَّد"]);
});

test("score : lisibilité = part du texte hors étiquettes restée en clair", () => {
  const doc = { ...analyser("Bonjour [[PERSONNE:Ali Tazi]] merci"), id: "t" };
  const tout = evaluerDocument(doc, [{ debut: 0, fin: doc.texte.length, code: "SOCIETE-001", prefixe: "SOCIETE" }]);
  assert.equal(tout.positifs[0].statut, "detecte");
  assert.equal(tout.lisibles, 0);
  const juste = evaluerDocument(doc, [{ debut: 8, fin: 16, code: "NOM-001", prefixe: "NOM" }]);
  assert.equal(juste.lisibles, juste.neutres);
});

test("formats : Word et Excel rendent le texte dérivé, sans jamais couper une valeur", async () => {
  const XLSX = await import("xlsx");
  const { docxParagraphs } = await import("../server/word.js");
  const { versDocx, versXlsx, texteFeuille, decouper } = await import("../bench/ht-bench/lib/formats.mjs");
  const doc = { id: "t", ...analyser("FICHE — بطاقة\nNom : [[PERSONNE:Ali | Tazi]]\nSalaire | {{MONTANT:1 200 MAD}}\nCIN : [[CIN:BK٤٥٦٧٨٩]] — Tél. : [[TEL:0661234567]]") };
  // « Ali | Tazi » est une seule valeur : la coupure « | » n'y est pas faite.
  assert.deepEqual(decouper(doc, [{ rx: / \| /g }], "\n").blocs[1], ["Nom : Ali | Tazi"]);
  const w = versDocx(doc, XLSX);
  assert.equal(docxParagraphs(w.buf, XLSX).join("\n"), w.derive.texte);
  const x = versXlsx(doc, XLSX, "document");
  const wb = XLSX.read(x.buf, { type: "buffer" });
  assert.equal(texteFeuille(wb.Sheets[wb.SheetNames[0]], XLSX, x.nl, x.nc), x.derive.texte);
  // Seul le premier « Libellé : » d'une ligne ouvre une cellule.
  assert.match(x.derive.texte, /^CIN :\tBK٤٥٦٧٨٩\tTél\. : 0661234567$/m);
  for (const d of [w.derive, x.derive]) for (const e of [...d.etendues, ...d.leurres]) assert.equal(d.texte.slice(e.debut, e.fin), e.valeur);
});

test("générateur : langues et formes déclarées, tableaux en cellules", () => {
  const { docs } = generer();
  for (const d of docs) {
    assert.ok(["fr", "ar", "fr-ar", "darija-latin"].includes(d.langue), d.id);
    assert.ok(["texte", "tableau"].includes(d.forme), d.id);
  }
  const t = docs.filter((d) => d.forme === "tableau");
  assert.ok(t.length > 0 && t.every((d) => d.texte.split("\n").every((l) => l.split("\t").length === d.texte.split("\n")[0].split("\t").length)));
  assert.ok(docs.some((d) => d.langue === "ar" && /[٠-٩]/.test(d.texte)));
});
