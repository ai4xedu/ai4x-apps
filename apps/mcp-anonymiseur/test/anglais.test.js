// LE MODE ANGLAIS DU VERROU (v2.26) — le sur-codage de l'anglais.
//
// Constaté le 25/10/2026 sur le jumeau codé d'un coffre de notes (4XOS) : une
// note rédigée en anglais arrivait chez Claude en bouillie (« In NOM-1056,
// CODE-837 CODE-1158 CODE-834… »), « and », « the », « legal », « Founder »,
// « Morocco » et le dossier « 30_WORK » d'un chemin codés comme des noms. Le
// verrou ne connaissait que le français : tout mot anglais était « inconnu ».
//
// La note de test est FICTIVE (test/fixtures/note-anglaise-fictive.md),
// écrite pour ce test : aucune donnée réelle.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { strictCode, isEnglishText, codedRatio } from "../server/verrou.js";
import { anonymizeText, newCodebook, codeFor } from "../server/engine.js";
import { mint } from "./licence-test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const NOTE = fs.readFileSync(path.join(here, "fixtures", "note-anglaise-fictive.md"), "utf8");
const CODES = /\b[A-Z]{2,10}-\d{3,}\b/g;
const EXCLUS = ["Ai4x", "Tardigrade", "YGH", "Claude"];

/* Le passage texte libre du connecteur (codeFreeText, server/index.js) :
   le moteur, puis le verrou. */
function coder(raw, book = newCodebook(), { extras = [], excludes = EXCLUS } = {}) {
  const base = anonymizeText(raw, book, extras, { excludes });
  return strictCode(base.text, { book, extra: extras, excludes }).text;
}

/* Ce qui doit être codé, en anglais comme en français. */
const SENSIBLES = ["Atlas Bakery", "John", "Carter", "Youssef", "Ghalem", "john.carter@atlasbakery.example",
  "+212 6 61 23 45 67", "001234567000089", "0000123456789012", "Hassan II"];
/* Ce que l'ancien verrou codait et qui doit rester lisible. */
const COURANTS = ["# Identity", "## In one sentence", "In short, this company builds tools and training",
  "The founder writes most of the notes", "We help small firms in Morocco and in France",
  "Our main brand is the training programme; the legal entity is a limited company",
  "The animal that survives everything is the mascot", "## Legal entity and brand", "**Founder:**",
  "**Status:** active, profitable since last year", "**Languages:** English, French and Arabic",
  "`1_MEMORY/30_WORK/pipeline.md`", "(../30_WORK/pipeline.md)", "`1_MEMORY/10_CONTEXT/`", "`2_TEAM/40_ARCHIVE/x.md`",
  "It isn't a secret, but we don't share it: we'll keep it internal and they've agreed.",
  "Our biggest client this quarter is", "The contract was signed on 12 March 2026 with",
  "their operations director. Mr ", "asked us to train twelve people before the summer.",
  "Next step: send the invoice to", "on Monday."];

test("la note anglaise fictive : mots courants en clair, TOUTES les données sensibles codées", () => {
  assert.ok(isEnglishText(NOTE));
  const out = coder(NOTE);
  for (const v of SENSIBLES) assert.ok(!out.includes(v), `${v} en clair :\n${out}`);
  for (const v of COURANTS) assert.ok(out.includes(v), `« ${v} » ne sort plus en clair :\n${out}`);
  assert.match(out, /client this quarter is SOCIETE-\d{3}\./);
  assert.match(out, /with PRENOM-\d{3} NOM-\d{3}, their operations director\. Mr NOM-\d{3} asked/);
  assert.match(out, /Contact: EMAIL-\d{3}, phone TEL-\d{3}\./);
  assert.match(out, /ICE: ICE-\d{3}\. Bank account \(RIB\): RIB-\d{3}\./);
  assert.match(out, /\*\*Founder:\*\* PRENOM-\d{3} NOM-\d{3}/);
  // Même tiers = même code : « Atlas Bakery » (sans « Ltd ») et « John Carter » reviennent.
  const soc = out.match(/is (SOCIETE-\d{3})\./)[1];
  assert.match(out, new RegExp(`invoice to ${soc} and call PRENOM-\\d{3} NOM-\\d{3} on Monday`));
  // Mesuré le 25/10/2026 : 152 codes avant la v2.26 (dont 118 distincts), 14 après.
  assert.equal((out.match(CODES) || []).length, 14, out);
  assert.ok(codedRatio(NOTE, out) < 0.1);
});

test("les noms qui sont aussi des mots anglais restent codés (titre, prénom, tête de phrase, déterminant)", () => {
  const cas = [
    ["Smith called us yesterday and we agreed on the price.", ["Smith"]],
    ["We met Mark Brown at the office and he signed the deal.", ["Mark", "Brown"]],
    ["Dear Sarah, thanks for the call. The Smith account is overdue and we will call them.", ["Sarah", "Smith"]],
    ["Ms. Johnson and Mrs Baker were there, and Dr Patel joined later.", ["Johnson", "Baker", "Patel"]],
    ["Baker said that the invoice was paid, and Grace will send it.", ["Baker", "Grace"]],
    ["From: Olivia Martinez\nTo: the team\nOur client Atlas wants a discount, says the founder.", ["Olivia", "Martinez", "Atlas"]],
    ["We spoke to JOHN CARTER and to the lawyer of Fatima Zahra El Idrissi this week.", ["JOHN", "CARTER", "Fatima", "Idrissi"]],
    ["notes: met john carter and mark brown today, they will pay next week.", ["john", "carter", "mark", "brown"]],
    ["Please send the documents to Will Cooper before Friday, and ask Hunter for the keys.", ["Will", "Cooper", "Hunter"]],
  ];
  for (const [s, noms] of cas) {
    const out = strictCode(s, { book: newCodebook() }).text;
    for (const n of noms) assert.doesNotMatch(out, new RegExp(`(?<!\\p{L})${n}(?!\\p{L})`, "u"), `${n} en clair : ${out}`);
  }
  // … sans coder les verbes autour : « said », « will call », « will send ».
  assert.equal(strictCode("Baker said that we will call them.", { book: newCodebook() }).text.replace(CODES, "X"),
    "X said that we will call them.");
});

test("un chemin « NN_MOT » : le dossier numéroté reste lisible, un nom de client y reste codé", () => {
  const out = strictCode("See 1_MEMORY/30_WORK/pipeline.md and 2_CLIENTS/30_BENALI/notes.md for the deals.", { book: newCodebook() }).text;
  assert.ok(out.includes("1_MEMORY/30_WORK/pipeline.md"), out);
  assert.doesNotMatch(out, /BENALI/);
  // Même dans un texte français : « 30_TRAVAIL » comme « 30_WORK ».
  const fr = strictCode("Voir le dossier 1_MEMOIRE/30_TRAVAIL/pipeline.md, 30_WORK/x.md et 40_SMITH/y.md pour la suite.", { book: newCodebook() }).text;
  assert.ok(fr.includes("1_MEMOIRE/30_TRAVAIL/pipeline.md") && fr.includes("30_WORK/x.md"), fr);
  assert.doesNotMatch(fr, /SMITH/);
});

test("un texte français n'est pas touché par le mode anglais ; un paragraphe anglais d'un texte français l'est", () => {
  const fr = "Maître Dupont a rencontré M. Karim Benali pour le meeting ; rappeler benali demain.";
  assert.ok(!isEnglishText(fr));
  const out = strictCode(fr, { book: newCodebook() }).text;
  for (const v of ["Dupont", "Karim", "Benali", "benali"]) assert.ok(!out.includes(v), out);
  // Un mot anglais dans une phrase française reste traité comme avant (inconnu : codé).
  assert.match(strictCode("Le livrable est prêt, mais le founder doit valider.", { book: newCodebook() }).text, /le (?:CODE|NOM)-\d{3} doit/);
  const mixte = "Le client a envoyé ce message, que nous devons traduire pour le dossier.\n\n" +
    "We are happy with the results and we will sign the renewal next week.";
  const m = strictCode(mixte, { book: newCodebook() }).text;
  assert.ok(m.endsWith("We are happy with the results and we will sign the renewal next week."), m);
});

test("une clé d'avant la v2.26 n'impose plus ses mots anglais codés à tort ; les vrais noms gardent leur code", () => {
  const book = newCodebook();
  const and = codeFor(book, "autre", "and").code;          // l'ancien verrou : « and » mot inconnu
  const founder = codeFor(book, "nom", "Founder").code;    // « Founder » en tête de ligne
  const carter = codeFor(book, "nom", "Carter").code;      // un vrai nom
  const out = strictCode("Founder and owner. The contract was signed by Mr Carter, and Carter paid.", { book }).text;
  assert.ok(!out.includes(and) && !out.includes(founder), out);
  assert.equal(out, `Founder and owner. The contract was signed by Mr ${carter}, and ${carter} paid.`);
});

/* -------------------------------------------- de bout en bout, comme 4XOS */

let client, workdir;
before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-anglais-"));
  fs.writeFileSync(path.join(workdir, "identity.md"), NOTE);
  const exp = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
  client = new Client({ name: "anglais", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Suite de tests", seats: 99, iat: "2026-01-01", exp }),
      NANOMIZER_SENTINELLE_DIR: path.join(workdir, ".sentinelle-absente") },
  }));
});
after(async () => {
  await client.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});

test("anonymiser_fichier (mode document, rendu codes) : la copie codée de la note anglaise est lisible et sûre", async () => {
  const args = { nom_fichier: "identity.md", mode: "document", valeurs_a_exclure: EXCLUS, valeurs_a_coder: ["Atlas Bakery"], rendu: "codes" };
  const plan = await client.callTool({ name: "anonymiser_fichier", arguments: args });
  const texte = (r) => r.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
  assert.match(texte(plan), /PLAN D'ANONYMISATION/);
  assert.doesNotMatch(texte(plan), /n'est probablement ni en français/);
  const res = await client.callTool({ name: "anonymiser_fichier", arguments: { ...args, confirmer: true } });
  const compteRendu = texte(res);
  for (const v of SENSIBLES) assert.ok(!compteRendu.includes(v), `${v} dans le compte rendu`);
  const sortie = fs.readdirSync(path.join(workdir, "Hidden-Tokens")).find((f) => f.endsWith("-anonymise.md"));
  const out = fs.readFileSync(path.join(workdir, "Hidden-Tokens", sortie), "utf8");
  for (const v of SENSIBLES) assert.ok(!out.includes(v), `${v} en clair dans la copie :\n${out}`);
  for (const v of COURANTS) assert.ok(out.includes(v), `« ${v} » codé dans la copie :\n${out}`);
});
