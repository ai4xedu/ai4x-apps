// Le catalogue de la console et le moteur du connecteur doivent parler des
// mêmes détecteurs : une politique qui cite un détecteur inconnu du moteur
// serait signée, publiée… et ignorée sur le poste. On lit engine.js comme du
// texte pour ne pas dépendre des modules du connecteur.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DETECTEURS, PLANCHER } from "../lib/catalogue.js";

const ENGINE = new URL("../../mcp-anonymiseur/server/engine.js", import.meta.url);

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
