#!/usr/bin/env node
// ============================================================================
// HT-BENCH — génère le jeu de test SYNTHÉTIQUE, à graine fixe.
//
//   node bench/ht-bench/generer.mjs            → réécrit dataset/
//   node bench/ht-bench/generer.mjs --verifier → régénère en mémoire et
//        échoue si dataset/ diffère (la CI : le jeu versionné est bien celui
//        que produisent la graine et le code)
//
// Rien ne vient du réseau, rien ne vient d'un vrai dossier : listes de
// prénoms et noms courants recombinées au hasard, numéros tirés au hasard et
// complétés par leur clé de contrôle. Les cas écrits à la main sont dans
// cas/manuels.mjs. Changer la graine, un gabarit ou une liste change le jeu :
// on monte alors VERSION_JEU et on réenregistre la référence (cf. README).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { hasard } from "./lib/hasard.mjs";
import { fabrique } from "./lib/fabrique.mjs";
import { analyser } from "./lib/balisage.mjs";
import { PLAN } from "./lib/gabarits.mjs";
import { CAS_MANUELS } from "./cas/manuels.mjs";

export const VERSION_JEU = "0.1.0";
export const GRAINE = "ht-bench-v0";

const here = path.dirname(fileURLToPath(import.meta.url));
const DOSSIER = path.join(here, "dataset");
export const FICHIER_JEU = path.join(DOSSIER, "ht-bench.jsonl");
export const FICHIER_MANIFESTE = path.join(DOSSIER, "manifeste.json");

export function generer() {
  const docs = [];
  for (const [pack, { packs, gabarits, n }] of Object.entries(PLAN)) {
    for (const [genre, gabarit] of Object.entries(gabarits)) {
      for (let i = 1; i <= n; i++) {
        const id = `${pack}/${genre}/${String(i).padStart(3, "0")}`;
        const g = fabrique(hasard(`${GRAINE}/${id}`));
        const { texte, etendues, leurres } = analyser(gabarit(g), id);
        docs.push({ id, pack, packs, genre, source: "gabarit", texte, etendues, leurres });
      }
    }
  }
  for (const c of CAS_MANUELS) {
    const { texte, etendues, leurres } = analyser(c.texte, c.id);
    const packs = c.pack === "core" ? [] : [c.pack];
    docs.push({ id: c.id, pack: c.pack, packs, genre: c.genre || "manuel", source: "manuel", note: c.note, texte, etendues, leurres });
  }
  const ids = new Set();
  for (const d of docs) { if (ids.has(d.id)) throw new Error(`id en double : ${d.id}`); ids.add(d.id); }
  const jsonl = docs.map((d) => JSON.stringify(d)).join("\n") + "\n";
  const compte = (f) => docs.reduce((n, d) => n + d[f].length, 0);
  const parPack = {};
  for (const d of docs) {
    const p = (parPack[d.pack] ||= { documents: 0, positifs: 0, leurres: 0 });
    p.documents++; p.positifs += d.etendues.length; p.leurres += d.leurres.length;
  }
  const parType = {};
  for (const d of docs) for (const e of d.etendues) parType[e.type] = (parType[e.type] || 0) + 1;
  const manifeste = {
    nom: "HT-Bench",
    version: VERSION_JEU,
    graine: GRAINE,
    synthetique: true,
    sha256: crypto.createHash("sha256").update(jsonl).digest("hex"),
    documents: docs.length,
    positifs: compte("etendues"),
    leurres: compte("leurres"),
    par_pack: parPack,
    par_type: Object.fromEntries(Object.entries(parType).sort()),
  };
  return { docs, jsonl, manifeste: JSON.stringify(manifeste, null, 2) + "\n" };
}

export function lireJeu() {
  return fs.readFileSync(FICHIER_JEU, "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { jsonl, manifeste } = generer();
  if (process.argv.includes("--verifier")) {
    const ok = fs.existsSync(FICHIER_JEU) && fs.readFileSync(FICHIER_JEU, "utf8") === jsonl
      && fs.readFileSync(FICHIER_MANIFESTE, "utf8") === manifeste;
    if (!ok) {
      console.error("❌ dataset/ ne correspond pas au générateur : lancez « npm run bench:ht:generer » et versionnez le résultat.");
      process.exit(1);
    }
    console.log(`✅ Jeu HT-Bench ${VERSION_JEU} reproductible (graine « ${GRAINE} », sha256 ${JSON.parse(manifeste).sha256.slice(0, 12)}…).`);
  } else {
    fs.mkdirSync(DOSSIER, { recursive: true });
    fs.writeFileSync(FICHIER_JEU, jsonl);
    fs.writeFileSync(FICHIER_MANIFESTE, manifeste);
    const m = JSON.parse(manifeste);
    console.log(`HT-Bench ${VERSION_JEU} : ${m.documents} documents, ${m.positifs} valeurs à coder, ${m.leurres} leurres → ${path.relative(process.cwd(), FICHIER_JEU)}`);
  }
}
