// Le catalogue de la console et le moteur du connecteur doivent parler des
// mêmes détecteurs : une politique qui cite un détecteur inconnu du moteur
// serait signée, publiée… et ignorée sur le poste. On lit engine.js comme du
// texte pour ne pas dépendre des modules du connecteur.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DETECTEURS, PLANCHER, CATEGORIES, PACKS } from "../lib/catalogue.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = new URL("../../hidden-tokens/server/engine.js", import.meta.url);

function prefixesDuMoteur() {
  const src = fs.readFileSync(ENGINE, "utf8");
  const bloc = src.match(/export const TYPES = \[([\s\S]*?)\n\];/);
  assert.ok(bloc, "TYPES introuvable dans engine.js");
  return [...bloc[1].matchAll(/prefix:\s*"([A-Z]+)"/g)].map((m) => m[1]);
}

test("le catalogue reprend exactement les détecteurs du moteur", () => {
  assert.deepEqual(Object.keys(DETECTEURS).sort(), prefixesDuMoteur().sort());
});

test("le plancher ne cite que des détecteurs du catalogue", () => {
  for (const d of PLANCHER) assert.ok(d in DETECTEURS, d);
});

test("chaque catégorie de règle a son préfixe de code dans le moteur (US-5)", () => {
  const src = fs.readFileSync(ENGINE, "utf8");
  const bloc = src.match(/export const CATEGORY_TYPES = \[([\s\S]*?)\n\];/);
  assert.ok(bloc, "CATEGORY_TYPES introuvable dans engine.js");
  const prefixes = new Set([...bloc[1].matchAll(/prefix:\s*"([A-Z]+)"/g)].map((m) => m[1]));
  for (const [cat, p] of Object.entries(CATEGORIES)) assert.ok(prefixes.has(p), `${cat} → ${p}`);
});

test("le catalogue des packs reprend exactement les packs livrés avec le connecteur (id, nom)", () => {
  const dossier = fileURLToPath(new URL("../../hidden-tokens/packs/", import.meta.url));
  const livres = fs.readdirSync(dossier).filter((n) => n.endsWith(".json")).map((n) => JSON.parse(fs.readFileSync(path.join(dossier, n), "utf8")));
  assert.deepEqual(Object.keys(PACKS).sort(), livres.map((p) => p.id).sort());
  for (const p of livres) assert.equal(PACKS[p.id].nom, p.nom, p.id);
});
