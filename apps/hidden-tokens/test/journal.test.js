// JOURNAL « CE QUE CLAUDE A VU » — la preuve doit dire vrai : tout ce qui est
// sorti est noté, une fuite est retrouvée (même après coup), et la page n'en
// révèle jamais la valeur.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import * as XLSX from "xlsx";
import * as _fs from "node:fs";
import { mint } from "./licence-test.mjs";
import { inspect, auditJournal, renderReport } from "../server/journal.js";
import { newCodebook, codeFor } from "../server/engine.js";
XLSX.set_fs(_fs);

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");
const SECRETS = ["El Amrani", "Yassine", "06 61 23 45 67", "Benkirane"];

let client, workdir;
const out = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
const journalDir = () => path.join(workdir, "Hidden-Tokens", "journal-ia");
const journalLines = () => fs.readdirSync(journalDir()).flatMap((f) =>
  fs.readFileSync(path.join(journalDir(), f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));

before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-journal-"));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Nom", "Prénom", "Téléphone", "Montant"],
    ["El Amrani", "Yassine", "06 61 23 45 67", 12400],
    ["Benkirane", "Salma", "06 62 98 76 54", 3250],
  ]), "Clients");
  XLSX.writeFile(wb, path.join(workdir, "clients.xlsx"));
  client = new Client({ name: "journal", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Journal", seats: 1, iat: "2026-10-20", exp: "9999-12-31", life: true }) },
  }));
});

after(async () => {
  await client.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});

test("chaque réponse envoyée à l'IA est notée, telle qu'elle est partie", async () => {
  const sent = [];
  sent.push(out(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx" } })));
  sent.push(out(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx", confirmer: true } })));
  sent.push(out(await client.callTool({ name: "etat_cle", arguments: {} })));
  const lines = journalLines();
  assert.equal(lines[0].outil, "connexion (protocole envoyé à l'IA)");
  assert.match(lines[0].texte, /PROTOCOLE DE CONFIDENTIALITÉ/);
  const tools = lines.slice(1);
  assert.deepEqual(tools.map((l) => l.outil), ["anonymiser_fichier", "anonymiser_fichier", "etat_cle"]);
  tools.forEach((l, i) => assert.equal(l.texte, sent[i], "le journal doit contenir exactement ce que l'IA a reçu"));
  for (const l of lines) for (const s of SECRETS) assert.ok(!l.texte.includes(s) && !l.args.includes(s), `« ${s} » dans le journal`);
  // Droits : le journal n'est lisible que par l'utilisateur.
  if (process.platform !== "win32") {
    for (const f of fs.readdirSync(journalDir())) assert.equal(fs.statSync(path.join(journalDir(), f)).mode & 0o077, 0);
  }
});

test("journal_ia : verdict propre, page locale sans aucune valeur réelle", async () => {
  const t = out(await client.callTool({ name: "journal_ia", arguments: {} }));
  assert.match(t, /✅ Aucune valeur réelle/);
  assert.match(t, /CE-QUE-CLAUDE-A-VU\.html/);
  const html = fs.readFileSync(path.join(workdir, "Hidden-Tokens", "CE-QUE-CLAUDE-A-VU.html"), "utf8");
  for (const s of SECRETS) assert.ok(!html.includes(s), `« ${s} » dans la page`);
  assert.match(html, /NOM-001/);
  // v2.16 : « Montant » est un montant ordinaire, en clair en auto — et la page
  // le montre, c'est son rôle : dire exactement ce que l'IA a reçu.
  assert.match(html, /12400|12 400/);
});

test("audit RÉTROACTIF : une valeur sortie avant d'être connue de la clé est retrouvée, montrée par son code", async () => {
  // Simule une fuite passée : une ligne du journal où un vrai nom est sorti.
  const f = path.join(journalDir(), fs.readdirSync(journalDir())[0]);
  fs.appendFileSync(f, JSON.stringify({ t: new Date().toISOString(), outil: "simulation", args: "{}", texte: "Relancer El Amrani au plus vite" }) + "\n");
  const t = out(await client.callTool({ name: "journal_ia", arguments: {} }));
  assert.match(t, /🚨 1 élément/);
  assert.ok(!t.includes("El Amrani"));
  const html = fs.readFileSync(path.join(workdir, "Hidden-Tokens", "CE-QUE-CLAUDE-A-VU.html"), "utf8");
  assert.ok(!html.includes("El Amrani"), "la page ne doit jamais afficher la valeur fuitée");
  assert.match(html, /<mark class="leak"[^>]*>NOM-\d{3}<\/mark>/);
});

test("le journal brut n'est jamais servi à l'IA", async () => {
  const f = fs.readdirSync(journalDir())[0];
  const res = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: `Hidden-Tokens/journal-ia/${f}` } });
  assert.ok(res.isError, out(res));
});

test("inspect : un code déjà posé n'est pas une fuite ; une valeur connue en clair, si", () => {
  const book = newCodebook();
  const { code } = codeFor(book, "nom", "Kettani");
  assert.equal(inspect(`Voir ${code} demain`, book).leaks.length, 0);
  const r = inspect("Voir Kettani demain, tél 06 12 34 56 78", book);
  assert.deepEqual(r.leaks, [code]);
  assert.equal(r.forms, 1);
  const html = renderReport(auditJournal({ entries: [{ t: "2026-10-20T10:00:00Z", outil: "x", args: "", texte: "Voir Kettani demain" }] }, [], book));
  assert.ok(!html.includes("Kettani"));
});

/* Répétition du 20/10/2026 : « Claude » (prénom réel) et « Tableau » (mot d'un
   nom de fichier) étaient entrés dans la clé ; nos propres tournures étaient
   alors recodées par le verrou et signalées comme fuites par le journal. */
test("nos propres tournures ne sont ni recodées ni prises pour des fuites ; un « Claude » isolé, si", async () => {
  const { guardText } = await import("../server/sortie.js");
  const book = newCodebook();
  const claude = codeFor(book, "prenom", "Claude").code;
  codeFor(book, "nom", "Tableau");
  const own = "Ouvrez CE-QUE-CLAUDE-A-VU.html : la page « Ce que Claude a vu ». Redémarrez Claude Desktop.\nPLAN — mode TABLEAU — rien n'est écrit.\nTABLEAU CODÉ :\nTableau de bord dessiné.";
  assert.equal(guardText(own, { book }).text, own);
  assert.equal(inspect(own, book).leaks.length, 0);
  assert.match(guardText("Le client Claude a signé.", { book }).text, new RegExp(claude));
  assert.deepEqual(inspect("Le client Claude a signé.", book).leaks, [claude]);
});
