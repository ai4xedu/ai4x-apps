#!/usr/bin/env node
// ============================================================================
// PAQUET NAVIGATEUR DU VERROU (+ CHIFFRES, + REMISE) — le même moteur que le
// connecteur, pour l'appli
// web (ai4x-website/anonymiseur-local.html). Le connecteur reste la SEULE
// source : ce script assemble server/verrou.js (+ engine.js) pour un
// navigateur, sans recopier une ligne.
//
//   node scripts/build-web-verrou.mjs        → dist/nanomizer-verrou-web.js
//
// Dans le navigateur, il n'y a ni disque ni Node :
//   - le dictionnaire et les listes de noms (lexique/*.gz) sont EMBARQUÉS en
//     base64 et décompressés par le navigateur (DecompressionStream) — aucune
//     requête, compatible avec la CSP « connect-src 'none' » de l'appli ;
//   - les modules Node (fs, zlib, path, url, crypto) sont remplacés par des
//     coquilles qui ne sont jamais appelées une fois le lexique fourni ;
//   - SheetJS est celui que l'appli embarque déjà (window.XLSX).
// Le paquet publie window.NanomizerVerrou ; `pret` est une promesse résolue
// quand le dictionnaire est chargé. Tant qu'elle ne l'est pas, l'appli ne
// doit RIEN anonymiser (un verrou sans dictionnaire laisserait tout passer).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const b64 = (f) => fs.readFileSync(path.join(root, "lexique", f)).toString("base64");

const SHIMS = {
  "node:fs": "export default {}; export const readFileSync = () => { throw new Error('pas de disque dans le navigateur'); }; export const existsSync = () => false;",
  "node:zlib": "export default { gunzipSync() { throw new Error('pas de zlib dans le navigateur'); } };",
  "node:path": "const j = (...a) => a.filter(Boolean).join('/'); export default { join: j, dirname: (p) => String(p).replace(/\\/[^/]*$/, ''), basename: (p) => String(p).split('/').pop() };",
  "node:url": "export const fileURLToPath = () => '';",
  "node:crypto": "export default { createHmac() { throw new Error('clé d\\'équipe : connecteur seulement'); } };",
  "xlsx": "const X = globalThis.XLSX; export default X; export const utils = X && X.utils; export const set_fs = () => {}; export const SSF = X && X.SSF;",
};

const entry = `
import { strictCode, strictSheet, knownValueMatcher, fournirLexique, lexiconSize, codedRatio } from "./server/verrou.js";
import { protectNumbers, describeNumbers, NUMBER_MODES, DEFAULT_NUMBER_MODE, MODE_LABEL } from "./server/chiffres.js";
import { restoreWorkbook } from "./server/remise.js";
async function gunzip(b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}
const pret = (async () => {
  const [mots, noms] = await Promise.all([gunzip(${JSON.stringify(b64("fr.txt.gz"))}), gunzip(${JSON.stringify(b64("noms.json.gz"))})]);
  fournirLexique({ mots, noms });
  return lexiconSize();
})();
globalThis.NanomizerVerrou = { version: ${JSON.stringify(manifest.version)}, pret, strictCode, strictSheet, knownValueMatcher, codedRatio,
  // v2.4 : les chiffres (montants protégés) et leur remise dans un classeur.
  protectNumbers, describeNumbers, NUMBER_MODES, DEFAULT_NUMBER_MODE, MODE_LABEL, restoreWorkbook };
`;

const res = await build({
  stdin: { contents: entry, resolveDir: root, sourcefile: "entree-web.js", loader: "js" },
  bundle: true, format: "iife", platform: "browser", target: ["es2020"], minify: true, legalComments: "none", write: false,
  define: { "import.meta.url": '""' },   // chemins du lexique sur disque : sans objet dans le navigateur
  plugins: [{
    name: "coquilles-node",
    setup(b) {
      b.onResolve({ filter: /^(node:(fs|zlib|path|url|crypto)|xlsx)$/ }, (a) => ({ path: a.path, namespace: "coquille" }));
      b.onLoad({ filter: /.*/, namespace: "coquille" }, (a) => ({ contents: SHIMS[a.path], loader: "js" }));
    },
  }],
  logLevel: "warning",
});

const code = res.outputFiles[0].text;
const sha = crypto.createHash("sha256").update(code).digest("hex");
const banner = `/*! Nanomizer — verrou v${manifest.version} pour l'appli web (paquet généré par ai4x-apps/apps/mcp-anonymiseur/scripts/build-web-verrou.mjs ; ne pas modifier à la main). sha256:${sha} — dictionnaire : an-array-of-french-words (MIT) ; noms : INSEE (Licence Ouverte). */\n`;
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const out = path.join(root, "dist", "nanomizer-verrou-web.js");
fs.writeFileSync(out, banner + code);
console.log(`${path.relative(process.cwd(), out)} — ${(fs.statSync(out).size / 1024).toFixed(0)} Ko, verrou v${manifest.version}`);
