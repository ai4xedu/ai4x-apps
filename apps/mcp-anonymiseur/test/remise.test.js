// REMISE DES CHIFFRES ET TABLEAU DE BORD (v2.2) — l'IA travaille sur le
// gabarit, Nanomizer rend le travail réel sur le poste ; rien de réel ne
// revient dans la conversation.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { XLSX } from "../server/engine.js";
import { mint } from "./licence-test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");
const REAL = ["Bennani", "El Fassi", "14500", "9800", "11236", "7954", "24300"];

let client, workdir, outdir;
const out = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
const call = async (name, args) => out(await client.callTool({ name, arguments: args }));
const assertClean = (label, t) => { for (const v of REAL) assert.ok(!t.includes(v), `« ${v} » dans ${label} :\n${t}`); };
const newest = (rx) => fs.readdirSync(outdir).filter((n) => rx.test(n)).sort().pop();

before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-remise-"));
  outdir = path.join(workdir, "Hidden-Tokens");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Nom", "Prénom", "Service", "Brut", "Net"],
    ["Bennani", "Youssef", "Ventes", 14500, 11236],
    ["El Fassi", "Khadija", "Achats", 9800, 7954],
  ]), "Paie");
  XLSX.writeFile(wb, path.join(workdir, "paie.xlsx"));
  client = new Client({ name: "remise", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Remise", seats: 1, iat: "2026-10-20", exp: "9999-12-31", life: true }) },
  }));
});

after(async () => {
  await client.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});

/* Ce que ferait l'IA : reprendre le gabarit, ajouter une synthèse (formule
   + nom codé) et un graphique (avec ses caches). */
function buildLikeClaude(tamper = false) {
  const anon = newest(/-anonymise\.xlsx$/);
  const wb = XLSX.readFile(path.join(outdir, anon));
  const data = wb.SheetNames[0];
  if (tamper) wb.Sheets[data].D2 = { t: "n", v: 1 };          // l'IA a retapé une cellule
  const nomCode = wb.Sheets[data].A2.v;
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Synthèse", ""],
    ["Masse salariale brute", { t: "n", f: `SUM('${data}'!D2:D3)`, v: 777 }],
    [`Premier salarié : ${nomCode}`, ""],
  ]), "Synthèse");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const cfb = XLSX.CFB.read(buf, { type: "buffer" });
  XLSX.CFB.utils.cfb_add(cfb, "/xl/charts/chart1.xml", Buffer.from(
    `<c:chartSpace><c:chart><c:title><a:t>Brut de ${nomCode}</a:t></c:title><c:ser><c:val><c:numRef><c:f>'${data}'!$D$2:$D$3</c:f>` +
    "<c:numCache><c:pt idx=\"0\"><c:v>512</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:chart></c:chartSpace>"));
  const name = tamper ? "dashboard-retouche.xlsx" : "dashboard.xlsx";
  fs.writeFileSync(path.join(workdir, name), XLSX.CFB.write(cfb, { type: "buffer", fileType: "zip" }));
  return { name, nomCode, data };
}

test("le gabarit ne montre aucun montant ni nom, et dit quoi faire ensuite", async () => {
  const t = await call("anonymiser_fichier", { nom_fichier: "paie.xlsx", confirmer: true });
  assertClean("anonymiser_fichier", t);
  assert.match(t, /GABARIT/);
  assert.match(t, /remettre_chiffres/);
  assert.ok(fs.readdirSync(outdir).some((n) => /^\.nanomizer-chiffres-.*\.json$/.test(n)), "correspondance des chiffres absente");
});

test("remettre_chiffres : vraies valeurs et vrais noms dans le classeur de l'IA, caches retirés", async () => {
  const { name, data } = buildLikeClaude();
  const t = await call("remettre_chiffres", { nom_fichier: name });
  assertClean("remettre_chiffres", t);
  assert.match(t, /✅ Classeur réel écrit/);
  assert.match(t, /4 valeur\(s\) remises/);
  const file = path.join(outdir, newest(/^dashboard-decode-.*\.xlsx$/));
  const buf = fs.readFileSync(file);
  const wb = XLSX.read(buf, { type: "buffer" });
  assert.equal(wb.Sheets[data].D2.v, 14500);
  assert.equal(wb.Sheets[data].E3.v, 7954);
  assert.equal(wb.Sheets[data].A2.v, "Bennani");
  assert.equal(wb.Sheets["Synthèse"].A3.v, "Premier salarié : Bennani");
  const cfb = XLSX.CFB.read(buf, { type: "buffer" });
  const get = (p) => Buffer.from(XLSX.CFB.find(cfb, `/${p}`).content).toString();
  assert.ok(!/<v>777<\/v>/.test(get("xl/worksheets/sheet2.xml")), "résultat de formule calculé sur le gabarit resté en cache");
  assert.match(get("xl/workbook.xml"), /<calcPr[^>]*fullCalcOnLoad="1"/);
  const chart = get("xl/charts/chart1.xml");
  assert.ok(!/numCache/.test(chart), "cache du graphique (valeurs du gabarit) resté");
  assert.match(chart, /Brut de Bennani/);
  // Les noms d'entrées d'un zip sont stockés en clair : le marqueur interne de
  // SheetJS (ajouté en mémoire à la lecture) ne doit pas être dans le fichier.
  assert.ok(!buf.includes("Sh33tJ5"), "marqueur interne SheetJS écrit dans le fichier");
  // Le fichier réel n'est jamais servi à l'IA.
  const res = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: `Hidden-Tokens/${path.basename(file)}` } });
  assert.ok(res.isError);
});

test("une cellule du gabarit modifiée par l'IA n'est jamais écrasée par une vraie valeur", async () => {
  const { name, data } = buildLikeClaude(true);
  const t = await call("remettre_chiffres", { nom_fichier: name });
  assert.match(t, /1 cellule\(s\) du gabarit avaient été modifiées/);
  const wb = XLSX.readFile(path.join(outdir, newest(/^dashboard-retouche-decode-.*\.xlsx$/)));
  assert.equal(wb.Sheets[data].D2.v, 1);
  assert.equal(wb.Sheets[data].D3.v, 9800);
});

test("tableau_de_bord : dessiné avec les vraies données, sur le poste, sans rien renvoyer", async () => {
  const anon = newest(/-anonymise\.xlsx$/);
  const t = await call("tableau_de_bord", {
    nom_fichier: `Hidden-Tokens/${anon}`, titre: "Paie d'octobre",
    graphiques: [
      { type: "indicateur", titre: "Masse brute", colonne_y: "Brut" },
      { type: "barres", titre: "Brut par salarié", colonne_x: "Nom", colonne_y: "Brut", tri: "desc" },
      { type: "secteurs", titre: "Par service", colonne_x: "Service", colonne_y: "Net" },
    ],
  });
  assertClean("tableau_de_bord", t);
  assert.match(t, /3 élément\(s\), 2 ligne\(s\)/);
  const html = fs.readFileSync(path.join(outdir, newest(/^tableau-de-bord-decode-.*\.html$/)), "utf8");
  assert.match(html, /24\s?300/, "total brut réel");
  assert.match(html, /Bennani/);
  assert.ok(!/<script|https?:\/\//.test(html), "la page doit être autonome, sans script ni ressource externe");
});

test("tableau_de_bord : une colonne inconnue est signalée avec les en-têtes disponibles", async () => {
  const anon = newest(/-anonymise\.xlsx$/);
  const t = await call("tableau_de_bord", { nom_fichier: `Hidden-Tokens/${anon}`, graphiques: [{ type: "barres", colonne_x: "Agence", colonne_y: "Brut" }] });
  assert.match(t, /colonne « Agence » introuvable/);
  assert.match(t, /« Brut »/);
  assertClean("tableau_de_bord (erreur)", t);
});

test("mode indice : les proportions vues par l'IA sont justes, la remise rend le réel", async () => {
  const t = await call("anonymiser_fichier", { nom_fichier: "paie.xlsx", confirmer: true, chiffres: "indice" });
  assertClean("indice", t);
  assert.match(t, /INDICE/);
  const wb = XLSX.readFile(path.join(outdir, newest(/-anonymise\.xlsx$/)));
  const s = wb.Sheets[wb.SheetNames[0]];
  assert.ok(Math.abs(s.D2.v / s.D3.v - 14500 / 9800) < 0.001, "le rapport entre deux salaires doit être préservé");
  const { name, data } = buildLikeClaude();
  await call("remettre_chiffres", { nom_fichier: name });
  const real = XLSX.readFile(path.join(outdir, newest(/^dashboard-decode-.*\.xlsx$/)));
  assert.equal(real.Sheets[data].D2.v, 14500);
});

test("le nom du classeur rendu réel est codé : un nom de client dans le nom de fichier ne sort pas", async () => {
  const anon = newest(/-anonymise\.xlsx$/);
  fs.copyFileSync(path.join(outdir, anon), path.join(workdir, "Bilan Kettani 2026.xlsx"));
  const t = await call("remettre_chiffres", { nom_fichier: "Bilan Kettani 2026.xlsx" });
  assert.match(t, /✅ Classeur réel écrit/);
  assert.ok(!/Kettani/.test(t), `le nom du client apparaît dans le chemin annoncé :\n${t}`);
});
