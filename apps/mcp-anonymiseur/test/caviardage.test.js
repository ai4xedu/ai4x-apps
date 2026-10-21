// Caviardage des images (v2.8) : des bandeaux GRAVÉS sur ce qui est
// sensible, un mot mal lu noirci d'office, et l'image n'atteint l'IA qu'en
// troisième temps.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { selectRedactions, burnBoxes } from "../server/caviardage.js";
import { ocrWords } from "../server/ocr.js";
import { newCodebook } from "../server/engine.js";
import { mint } from "./licence-test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SCAN = path.join(here, "fixtures", "scan.jpg");

/* Une ligne de mots OCR factice : boîtes côte à côte, confiance choisie. */
function line(text, conf = 95, y = 10) {
  let x = 0;
  return text.split(" ").map((w) => { const b = { x0: x, y0: y, x1: x + w.length * 10, y1: y + 20 }; x = b.x1 + 8; return { text: w, conf, bbox: b }; });
}
const texts = (r, lines) => r.boxes.map((b) => lines.flat().find((w) => w.bbox.x0 === b.x0 && w.bbox.y0 === b.y0).text);

test("le moteur et le verrou choisissent les mots à noircir ; le reste reste lisible", () => {
  const lines = [line("Mon client Hicham Bennani doit 12400 euros"), line("RIB : 011780000556677889900112", 95, 40)];
  const r = selectRedactions(lines, newCodebook());
  const hidden = texts(r, lines);
  for (const w of ["Hicham", "Bennani", "011780000556677889900112"]) assert.ok(hidden.includes(w), `${w} visible`);
  for (const w of ["client", "doit", "12400", "euros", "RIB"]) assert.ok(!hidden.includes(w), `${w} noirci à tort`);
});

test("un mot mal lu et inconnu est noirci ; un mot courant mal lu ne l'est pas", () => {
  const lines = [[...line("Bnnaxi", 41), ...line("contrat", 40, 40)]];
  const r = selectRedactions(lines, newCodebook());
  assert.deepEqual(texts(r, lines), ["Bnnaxi"]);
});

test("valeurs_a_exclure laisse un mot visible ; valeurs_a_coder en noircit un de plus", () => {
  const lines = [line("Le cabinet Sekkat conseille Atlas")];
  const r = selectRedactions(lines, newCodebook(), { excludes: ["Sekkat"], extra: [{ value: "Atlas", type: "autre" }] });
  const hidden = texts(r, lines);
  assert.ok(!hidden.includes("Sekkat"));
  assert.ok(hidden.includes("Atlas"));
});

test("les bandeaux sont gravés dans les pixels (pas une couche par-dessus)", () => {
  const img = new PNG({ width: 40, height: 20 });
  img.data.fill(255);
  const out = PNG.sync.read(burnBoxes(PNG.sync.write(img), [{ x0: 10, y0: 5, x1: 20, y1: 10 }]).png);
  const px = (x, y) => [...out.data.subarray((y * 40 + x) * 4, (y * 40 + x) * 4 + 3)];
  assert.deepEqual(px(15, 7), [0, 0, 0]);
  assert.deepEqual(px(35, 18), [255, 255, 255]);
});

test("sur un vrai scan : relu par l'OCR, l'image caviardée ne contient plus ICE, IF, RC ni RIB", async () => {
  const [p] = await ocrWords([fs.readFileSync(SCAN)]);
  const r = selectRedactions(p.lines, newCodebook());
  const [again] = await ocrWords([burnBoxes(p.png, r.boxes).png]);
  const seen = again.lines.flat().map((w) => w.text).join(" ");
  for (const v of ["002233445566778", "41250987", "118234", "009988776655443", "011780000556677889900112", "Sekkat", "GHARB"]) {
    assert.ok(!seen.includes(v), `${v} se lit encore sur l'image caviardée`);
  }
  assert.match(seen, /TOTAL TTC/, "le document reste exploitable");
});

/* ------------------------------------------------- de bout en bout ------ */
let client, workdir;
before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-cav-"));
  fs.copyFileSync(SCAN, path.join(workdir, "facture-sekkat.jpg"));
  const exp = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
  client = new Client({ name: "cav", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Tests", seats: 9, iat: "2026-01-01", exp }) },
  }));
});
after(async () => {
  await client.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});
const call = (args) => client.callTool({ name: "caviarder_image", arguments: { nom_fichier: "facture-sekkat.jpg", ...args } });
const textOf = (res) => res.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
const outDir = () => path.join(workdir, "Anonymiseur-Ai4x");

test("caviarder_image : plan sans rien écrire, puis image sur le poste, puis seulement l'envoi", async () => {
  const early = await call({ envoyer: true });
  assert.match(textOf(early), /Aucune image caviardée/);
  assert.ok(!early.content.some((c) => c.type === "image"));

  const plan = textOf(await call({}));
  assert.match(plan, /PLAN DE CAVIARDAGE/);
  assert.match(plan, /bandeau/);
  assert.ok(!fs.existsSync(outDir()) || !fs.readdirSync(outDir()).some((n) => n.includes("-caviarde")));

  const done = textOf(await call({ confirmer: true }));
  assert.match(done, /Image caviardée écrite sur le poste/);
  assert.match(done, /OUVRIR l'image/);
  const png = fs.readdirSync(outDir()).find((n) => /-caviarde\.png$/.test(n));
  assert.ok(png, "image caviardée absente");
  assert.ok(!png.toLowerCase().includes("sekkat"), "le nom du fichier produit cite le client");

  const sent = await call({ envoyer: true });
  const img = sent.content.find((c) => c.type === "image");
  assert.ok(img && img.mimeType === "image/png");
  assert.deepEqual(Buffer.from(img.data, "base64"), fs.readFileSync(path.join(outDir(), png)));
  assert.match(textOf(sent), /SHA-256/);
  assert.ok(!textOf(sent).toLowerCase().includes("sekkat"));
});
