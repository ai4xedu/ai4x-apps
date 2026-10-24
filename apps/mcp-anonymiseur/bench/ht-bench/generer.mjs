#!/usr/bin/env node
// ============================================================================
// HT-BENCH — génère le jeu de test SYNTHÉTIQUE, à graine fixe, en deux parts.
//
//   dev  : graine « ht-bench-v0 » + les cas écrits à la main. C'est sur lui
//          qu'on règle le moteur, et sur lui que porte la référence de la CI.
//   test : une autre graine, mêmes gabarits — d'autres valeurs, d'autres
//          tournures. On n'y règle RIEN : c'est lui qu'on publie.
//
//   node bench/ht-bench/generer.mjs            → réécrit dataset/ (dev et test)
//   node bench/ht-bench/generer.mjs --verifier → régénère en mémoire et
//        échoue si dataset/ diffère (la CI : le jeu versionné est bien celui
//        que produisent les graines et le code)
//
// Rien ne vient du réseau, rien ne vient d'un vrai dossier : listes de
// prénoms et noms courants recombinées au hasard, numéros tirés au hasard et
// complétés par leur clé de contrôle. Les cas écrits à la main sont dans
// cas/manuels.mjs. Changer une graine, un gabarit ou une liste change le jeu :
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
export const SPLITS = {
  dev: { graine: "ht-bench-v0", manuels: true, dossier: "" },
  test: { graine: "ht-bench-v0-test", manuels: false, dossier: "test" },
};
export const GRAINE = SPLITS.dev.graine;

const here = path.dirname(fileURLToPath(import.meta.url));
const DOSSIER = path.join(here, "dataset");
export const fichiersJeu = (split = "dev") => {
  const d = path.join(DOSSIER, SPLITS[split].dossier);
  return { jeu: path.join(d, "ht-bench.jsonl"), manifeste: path.join(d, "manifeste.json") };
};
export const FICHIER_JEU = fichiersJeu("dev").jeu;
export const FICHIER_MANIFESTE = fichiersJeu("dev").manifeste;

/* --split dev|test sur la ligne de commande (dev par défaut). */
export function splitDemande(argv = process.argv) {
  const i = argv.indexOf("--split");
  const s = i >= 0 ? argv[i + 1] : "dev";
  if (!SPLITS[s]) throw new Error(`--split : « ${s} » inconnu (dev ou test)`);
  return s;
}

export function generer(split = "dev") {
  const { graine, manuels } = SPLITS[split];
  const docs = [];
  for (const [pack, { packs, gabarits, n }] of Object.entries(PLAN)) {
    for (const [genre, gabarit] of Object.entries(gabarits)) {
      for (let i = 1; i <= n; i++) {
        const id = `${pack}/${genre}/${String(i).padStart(3, "0")}`;
        const g = fabrique(hasard(`${graine}/${id}`));
        const { texte, etendues, leurres } = analyser(gabarit(g), id);
        docs.push({ id, pack, packs, genre, source: "gabarit", texte, etendues, leurres });
      }
    }
  }
  for (const c of manuels ? CAS_MANUELS : []) {
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
    split,
    graine,
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

export function lireJeu(split = "dev") {
  return fs.readFileSync(fichiersJeu(split).jeu, "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const split of Object.keys(SPLITS)) {
    const { jsonl, manifeste } = generer(split);
    const f = fichiersJeu(split);
    const m = JSON.parse(manifeste);
    if (process.argv.includes("--verifier")) {
      const ok = fs.existsSync(f.jeu) && fs.readFileSync(f.jeu, "utf8") === jsonl
        && fs.existsSync(f.manifeste) && fs.readFileSync(f.manifeste, "utf8") === manifeste;
      if (!ok) {
        console.error(`❌ dataset/ (${split}) ne correspond pas au générateur : lancez « npm run bench:ht:generer » et versionnez le résultat.`);
        process.exit(1);
      }
      console.log(`✅ Jeu HT-Bench ${VERSION_JEU} ${split} reproductible (graine « ${m.graine} », sha256 ${m.sha256.slice(0, 12)}…).`);
    } else {
      fs.mkdirSync(path.dirname(f.jeu), { recursive: true });
      fs.writeFileSync(f.jeu, jsonl);
      fs.writeFileSync(f.manifeste, manifeste);
      console.log(`HT-Bench ${VERSION_JEU} ${split} : ${m.documents} documents, ${m.positifs} valeurs à coder, ${m.leurres} leurres → ${path.relative(process.cwd(), f.jeu)}`);
    }
  }
}
