// Test de réidentification (v2.6) : la combinaison d'indices anodins qui
// désigne une personne sans son nom, mesurée sur ce que l'IA recevra.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { strictCode } from "../server/verrou.js";
import { newCodebook, decodeText } from "../server/engine.js";
import { assessReidentification, findIndicators, generalize, describeReidentification } from "../server/reidentification.js";
import { mint } from "./licence-test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

/* Trois cas réels de pièces d'avocat : aucun nom n'y survit au verrou, et
   pourtant chacun désigne quelqu'un. */
const DOSSIER = [
  "Le PDG d’une biotech lyonnaise rachetée en mars 2025, âgé de 47 ans, en instance de divorce.",
  "Mon client, chirurgien cardiaque au CHU de Rennes, né le 12/04/1971, a été licencié le 3 février 2026.",
  "La mère, enseignante à Marrakech, 38 ans, de nationalité marocaine, élève trois enfants.",
].join("\n\n");

const coded = (txt, book = newCodebook()) => strictCode(txt, { book }).text;

test("le verrou seul laisse passer les indices : le test les voit", () => {
  const r = assessReidentification(coded(DOSSIER));
  assert.equal(r.niveau, "identifiable");
  assert.deepEqual(r.indices.naissance, ["12/04/1971"]);
  assert.ok(r.indices.lieu.includes("lyonnaise") && r.indices.lieu.includes("Rennes") && r.indices.lieu.includes("Marrakech"));
  assert.deepEqual(r.indices.age.sort(), ["38 ans", "47 ans"]);
  assert.ok(r.indices.fonction.includes("PDG") && r.indices.fonction.includes("chirurgien"));
  assert.equal(r.indices.nationalite.length, 1);
  assert.ok(r.passages.identifiable >= 2);
});

test("un indice seul ne fait pas une personne : texte juridique ordinaire = anonyme", () => {
  const txt = "Le tribunal judiciaire de Paris a rendu son jugement le 4 mai 2025. " +
    "La cour d'appel de Casablanca a confirmé la décision. Le juge a relevé que le bail était résilié depuis 10 ans.";
  const r = assessReidentification(coded(txt));
  assert.equal(r.niveau, "anonyme");
  // Ville de juridiction : ni indice, ni généralisée — l'IA a besoin du droit applicable.
  assert.equal((r.indices.lieu || []).length, 0);
  assert.equal((r.indices.age || []).length, 0, "« depuis 10 ans » est une durée, pas un âge");
});

test("une ville qui est aussi un mot (« Rennes », « Tours ») n'est un lieu qu'après une préposition", () => {
  const cats = (t) => findIndicators(t).filter((x) => x.cat === "lieu").map((x) => x.value);
  assert.deepEqual(cats("Elle travaille à Tours depuis peu."), ["Tours"]);
  assert.deepEqual(cats("Les tours de la ville sont hautes."), []);
  assert.deepEqual(cats("Il habite près de Nice."), ["Nice"]);
});

test("les codes déjà posés ne sont jamais des indices", () => {
  assert.deepEqual(findIndicators("NOM-001 et REF-002 le LIEU-003"), []);
});

test("generaliser : villes codées (décodables), naissance → décennie, âge → tranche, autres dates exactes", () => {
  const book = newCodebook();
  const g = generalize(coded(DOSSIER, book), book);
  assert.equal(g.changes.naissance, 1);
  assert.equal(g.changes.age, 2);
  assert.ok(g.changes.lieu >= 3);
  assert.match(g.text, /né dans les années 1970/);
  assert.match(g.text, /âgé de 40 à 49 ans/);
  assert.match(g.text, /entre 30 et 39 ans/);
  assert.match(g.text, /le 3 février 2026/, "une date de procédure reste exacte (délais, prescription)");
  for (const v of ["Rennes", "Marrakech", "lyonnaise", "12/04/1971", "47 ans"]) assert.ok(!g.text.includes(v), `${v} est resté`);
  // Les villes reviennent dans la réponse, comme un nom.
  const map = Object.fromEntries(book.entries.map((e) => [e.code, e.value]));
  assert.match(decodeText(g.text, map).text, /CHU de Rennes|de Rennes/);
  // Après généralisation, il ne reste que fonction + date : au pire « devinable ».
  assert.notEqual(assessReidentification(g.text).niveau, "identifiable");
});

test("le bloc de compte rendu dit le niveau et propose generaliser quand il le faut", () => {
  const r = assessReidentification(coded(DOSSIER));
  const s = describeReidentification(r);
  assert.match(s, /🔴 TEST DE RÉIDENTIFICATION/);
  assert.match(s, /generaliser: true/);
  assert.match(describeReidentification(assessReidentification("Bonjour.")), /🟢.*ANONYME/);
});

/* De bout en bout : l'outil annonce le risque dès le PLAN, puis généralise. */
let client, workdir;
before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-reid-"));
  fs.writeFileSync(path.join(workdir, "note.md"), DOSSIER + "\n");
  const exp = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
  client = new Client({ name: "reid", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Tests", seats: 9, iat: "2026-01-01", exp }) },
  }));
});
after(async () => {
  await client.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});
const out = (res) => res.content.map((c) => c.text || "").join("\n");

test("anonymiser_fichier : le plan d'un texte annonce 🔴, la version généralisée l'écrit sans les indices", async () => {
  const plan = out(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "note.md" } }));
  assert.match(plan, /🔴 TEST DE RÉIDENTIFICATION/);
  assert.match(plan, /generaliser: true/);
  const done = out(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "note.md", generaliser: true, confirmer: true } }));
  assert.match(done, /Généralisé : \d+ lieu/);
  assert.match(done, /LIEU-\d{3}/);
  const md = fs.readdirSync(path.join(workdir, "Anonymiseur-Ai4x")).find((n) => n.endsWith("-anonymise.md"));
  const written = fs.readFileSync(path.join(workdir, "Anonymiseur-Ai4x", md), "utf8");
  assert.ok(!written.includes("12/04/1971") && !written.includes("Marrakech"));
});
