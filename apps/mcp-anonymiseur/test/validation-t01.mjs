#!/usr/bin/env node
// ============================================================================
// VALIDATION T01 — le contrat en suivi de modifications (Nanomizer,
// docs/validation/T01-contrat). Le VRAI serveur de ce dépôt, sur les vraies
// pièces fictives du test, dans un dossier de travail jetable : on imprime ce
// que l'IA recevrait (le « CONTENU CODÉ ») et on l'écrit sur disque, pour que
// docs/validation/generateur/verifier.py fuites le compte.
//
//   node test/validation-t01.mjs <dossier pieces T01> [--rendu=lisible|codes] [--sortie=fichier.txt] [--garder]
//   node test/validation-t01.mjs --decoder=<dossier réponses .md> --cle=<dossier gardé par --garder>
// Le second rejoue deanonymiser sur les réponses de l'IA (avec la clé du
// premier) et dépose les versions décodées dans <dossier réponses>/decode/ :
// c'est ce que lit le juge en aveugle (comme recette-auto/ab.mjs).
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { mint } from "./licence-test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pieces = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || d;
if (!pieces && !opt("decoder", "")) { console.error("usage: node test/validation-t01.mjs <dossier pieces> [--rendu=lisible] [--sortie=f.txt]"); process.exit(2); }

const LICENCE0 = mint({ v: 1, org: "Validation T01", seats: 1, iat: "2026-10-25", exp: "9999-12-31", life: true });
const aDecoder = opt("decoder", "");
if (aDecoder) {
  const cle = opt("cle", "");
  const c = new Client({ name: "validation-t01-decode", version: "1.0.0" });
  await c.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: cle, ANX_LICENCE: LICENCE0 },
  }));
  const dest = path.join(aDecoder, "decode");
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(aDecoder).filter((x) => x.endsWith(".md")).sort()) {
    const nom = f.replace(/\.md$/, "");
    const r = (await c.callTool({ name: "deanonymiser", arguments: { contenu: fs.readFileSync(path.join(aDecoder, f), "utf8"), format: "md", nom_sortie: nom } }))
      .content.map((x) => x.text || "").join("\n");
    const sortie = fs.readdirSync(path.join(cle, "Hidden-Tokens")).filter((x) => x.startsWith(`${nom}-decode-`)).sort().pop();
    if (sortie) fs.copyFileSync(path.join(cle, "Hidden-Tokens", sortie), path.join(dest, f));
    console.log(`${f} : ${(r.match(/\d+ code\(s\) remplacé\(s\)/) || ["?"])[0]}${sortie ? "" : " — AUCUNE SORTIE"}`);
  }
  await c.close();
  process.exit(0);
}

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "ht-t01-"));
for (const f of fs.readdirSync(pieces)) fs.copyFileSync(path.join(pieces, f), path.join(workdir, f));
const LICENCE = mint({ v: 1, org: "Validation T01", seats: 1, iat: "2026-10-25", exp: "9999-12-31", life: true });
const client = new Client({ name: "validation-t01", version: "1.0.0" });
await client.connect(new StdioClientTransport({
  command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
  env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: LICENCE },
}));
const call = async (name, a = {}) => (await client.callTool({ name, arguments: a })).content.map((c) => c.text || "").join("\n");

const rendu = opt("rendu", "lisible");
const recu = [];
for (const f of fs.readdirSync(workdir).filter((x) => /\.(docx|txt|md|pdf|xlsx)$/i.test(x)).sort()) {
  const plan = await call("anonymiser_fichier", { nom_fichier: f, rendu });
  const fait = await call("anonymiser_fichier", { nom_fichier: f, rendu, confirmer: true });
  recu.push(plan, fait);
  console.log(`\n==================== ${f} — PLAN\n${plan}\n==================== ${f} — RÉSULTAT\n${fait}`);
}
const sortie = opt("sortie", "");
if (sortie) fs.writeFileSync(sortie, recu.join("\n\n"), "utf8");
await client.close();
if (args.includes("--garder")) console.error(`dossier gardé : ${workdir}`);
else fs.rmSync(workdir, { recursive: true, force: true });
