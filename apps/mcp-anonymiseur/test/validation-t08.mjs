#!/usr/bin/env node
// ============================================================================
// VALIDATION T08 — le dossier de contentieux en 12 pièces (Nanomizer,
// docs/validation/T08-contentieux). Le VRAI serveur de ce dépôt, sur les pièces
// fictives du test, dans un dossier de travail jetable, en rejouant ce que
// Claude Desktop ferait (v2.30) : lister_fichiers, anonymiser_dossier (plan
// puis confirmer — le lot couvre Word, PDF, Excel et le .txt, et liste les
// deux images), lire_scan sur chaque image, puis anonymiser_dossier avec le
// motif « RELIRE » (plan puis confirmer) pour les deux textes OCR relus,
// sceau_dossier. Tout ce que l'IA recevrait — les réponses d'outils ET le
// texte de chaque fichier *-anonymise.* (corps, en-têtes, pieds de page,
// métadonnées, chaque cellule Excel) — est écrit dans --sortie, pour que
// docs/validation/generateur/verifier.py fuites T08 le compte.
//
//   node test/validation-t08.mjs <dossier pieces T08> [--rendu=lisible|codes] [--sortie=f.txt]
//   node test/validation-t08.mjs --decoder=<dossier réponses .md> --cle=<dossier de travail gardé>
//
// Les actions de l'utilisateur comptées (critère : ≤ 3) : approuver le plan du
// lot, relire les textes OCR (une relecture pour les scans du dossier),
// approuver le plan des scans relus. Le dossier de travail est TOUJOURS gardé
// (la clé sert au décodage) ; son chemin est imprimé sur stderr. Le second
// mode rejoue deanonymiser sur les réponses de l'IA : les .md décodés vont
// dans <réponses>/decode/ (le juge en aveugle les lit), et un fichier dont le
// nom contient « conclusions » est aussi rendu en Word (format docx), pour le
// contrôle du Word décodé.
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { mintWithSeal } from "./licence-test.mjs";
import { XLSX } from "../server/engine.js";
import { residue } from "../server/word.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pieces = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || "").split("=").slice(1).join("=") || d;
if (!pieces && !opt("decoder", "")) {
  console.error("usage: node test/validation-t08.mjs <dossier pieces> [--rendu=lisible] [--sortie=f.txt] | --decoder=<dir> --cle=<workdir>");
  process.exit(2);
}

const LICENCE = mintWithSeal({ v: 1, org: "Validation T08", id: "t08valid", seats: 1, iat: "2026-10-26", exp: "9999-12-31", life: true });
const OUT = "Hidden-Tokens";

async function connecter(workdir, nom) {
  const c = new Client({ name: nom, version: "1.0.0" });
  await c.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: LICENCE },
  }));
  return c;
}

/* Tout le texte d'un fichier anonymisé, y compris ce qu'un lecteur ne voit
   pas : chaque partie XML d'un .docx (en-têtes, pieds, métadonnées, attributs
   d'auteur), chaque cellule d'un .xlsx. */
function texteAnonymise(p) {
  if (/\.md$/i.test(p)) return fs.readFileSync(p, "utf8");
  if (/\.xlsx$/i.test(p)) {
    const wb = XLSX.readFile(p);
    return wb.SheetNames.map((n) => `== ${n}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: " | " })).join("\n");
  }
  if (/\.docx$/i.test(p)) {
    // Le même parcours que le filet final du connecteur (word.js, residue) :
    // chaque partie XML, attributs compris.
    const parts = [];
    residue(fs.readFileSync(p), (plain) => { parts.push(plain); return false; }, XLSX);
    return parts.join("\n");
  }
  return "";
}

// ------------------------------------------------------------------ décodage
const aDecoder = opt("decoder", "");
if (aDecoder) {
  const cle = opt("cle", "");
  const c = await connecter(cle, "validation-t08-decode");
  const dest = path.join(aDecoder, "decode");
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(aDecoder).filter((x) => x.endsWith(".md")).sort()) {
    const nom = f.replace(/\.md$/, "");
    const contenu = fs.readFileSync(path.join(aDecoder, f), "utf8");
    const formats = /conclusions/i.test(nom) ? ["md", "docx"] : ["md"];
    for (const format of formats) {
      const r = (await c.callTool({ name: "deanonymiser", arguments: { contenu, format, nom_sortie: `${nom}-${format}` } }))
        .content.map((x) => x.text || "").join("\n");
      const sortie = fs.readdirSync(path.join(cle, OUT)).filter((x) => x.startsWith(`${nom}-${format}-decode-`)).sort().pop();
      if (sortie) fs.copyFileSync(path.join(cle, OUT, sortie), path.join(dest, format === "md" ? f : `${nom}.docx`));
      console.log(`${f} (${format}) : ${(r.match(/\d+ code\(s\) remplacé\(s\)/) || [r.split("\n")[0]])[0]}${sortie ? "" : " — AUCUNE SORTIE"}`);
    }
  }
  await c.close();
  process.exit(0);
}

// -------------------------------------------------------------------- codage
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "ht-t08-"));
for (const f of fs.readdirSync(pieces)) fs.copyFileSync(path.join(pieces, f), path.join(workdir, f));
fs.mkdirSync(path.join(workdir, OUT));
// Le pack du test, tel que l'appli l'écrirait dans les réglages du dossier.
fs.writeFileSync(path.join(workdir, OUT, "reglages.json"), JSON.stringify({ packs: ["juridique-fr"], regles: [] }), "utf8");

const client = await connecter(workdir, "validation-t08");
const recu = [];
let actions = 0; // ce que l'utilisateur doit faire en plus (accords, relectures)
const t0 = Date.now();
const call = async (name, a = {}, titre = name) => {
  const t1 = Date.now();
  const r = (await client.callTool({ name, arguments: a })).content.map((c) => c.text || "").join("\n");
  const ms = Date.now() - t1;
  recu.push(`==================== ${titre}\n${r}`);
  console.log(`\n==================== ${titre} (${ms} ms)\n${r}`);
  return r;
};
const rendu = opt("rendu", "lisible");

await call("etat_cle", {}, "etat_cle");
await call("lister_fichiers", {}, "lister_fichiers");

// 1. Le dossier entier : plan, puis exécution après accord (Word, PDF, Excel, .txt ; les images sont listées).
await call("anonymiser_dossier", { rendu }, "anonymiser_dossier — PLAN");
actions++;
const lot = await call("anonymiser_dossier", { rendu, confirmer: true }, "anonymiser_dossier — RÉSULTAT");

// 2. Les scans : OCR sur le poste (pas d'accord à demander), relecture par l'utilisateur (une pour le dossier).
const imgs = fs.readdirSync(workdir).filter((x) => /\.(jpe?g|png|tiff?)$/i.test(x)).sort();
for (const f of imgs) await call("lire_scan", { nom_fichier: f }, `lire_scan ${f}`);
if (imgs.length) actions++; // relire les textes OCR

// 3. Les textes OCR relus, en un seul lot (motif « RELIRE »), même clé : plan puis accord.
if (imgs.length) {
  await call("anonymiser_dossier", { rendu, motif: "RELIRE" }, "anonymiser_dossier RELIRE — PLAN");
  actions++;
  await call("anonymiser_dossier", { rendu, motif: "RELIRE", confirmer: true }, "anonymiser_dossier RELIRE — RÉSULTAT");
}

// 4. Le sceau, à la fin.
await call("sceau_dossier", { reference: "Dossier T08" }, "sceau_dossier");
await call("etat_cle", {}, "etat_cle — fin");
const connecteurMs = Date.now() - t0;

// 5. Ce que l'IA lirait ensuite : chaque fichier anonymisé, en entier.
const sorties = fs.readdirSync(path.join(workdir, OUT)).filter((x) => /-anonymise\.(md|docx|xlsx)$/i.test(x)).sort();
for (const f of sorties) recu.push(`==================== FICHIER ${f}\n${texteAnonymise(path.join(workdir, OUT, f))}`);

const sortie = opt("sortie", "");
if (sortie) fs.writeFileSync(sortie, recu.join("\n\n"), "utf8");
await client.close();
const ecrits = (lot.match(/LOT TERMINÉ — (\d+)\/(\d+)/) || []).slice(1, 3);
console.error(`dossier gardé : ${workdir}`);
console.error(`fichiers anonymisés écrits : ${sorties.length} (${sorties.filter((x) => /\.docx$/i.test(x)).length} Word, ${sorties.filter((x) => /\.xlsx$/i.test(x)).length} Excel, ${sorties.filter((x) => /\.md$/i.test(x)).length} .md) ; premier lot : ${ecrits.join("/") || "?"}`);
console.error(`actions utilisateur supplémentaires : ${actions}`);
console.error(`temps connecteur : ${(connecteurMs / 1000).toFixed(1)} s`);
