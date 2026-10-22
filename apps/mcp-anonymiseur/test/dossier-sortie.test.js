// v2.14 : le dossier de sortie s'appelle Hidden-Tokens/ ; l'ancien
// Anonymiseur-Ai4x/ (qui contient la clé) est renommé d'un bloc, sans rien perdre.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { resoudreSortie, decrireSortie, OUTDIR_NAME, ANCIEN_OUTDIR_NAME } from "../server/dossier-sortie.js";
import { dossierSentinelle } from "../server/sentinelle.js";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ht-sortie-"));

test("poste neuf : Hidden-Tokens/, rien n'est créé d'avance", () => {
  const w = tmp();
  const r = resoudreSortie(w);
  assert.equal(r.dir, path.join(w, OUTDIR_NAME));
  assert.equal(r.migre, false);
  assert.ok(!fs.existsSync(r.dir));
  assert.equal(decrireSortie(r), "");
});

test("poste existant : l'ancien dossier est renommé, clé comprise", () => {
  const w = tmp();
  fs.mkdirSync(path.join(w, ANCIEN_OUTDIR_NAME));
  fs.writeFileSync(path.join(w, ANCIEN_OUTDIR_NAME, "cle-de-session.json"), "{}");
  const r = resoudreSortie(w);
  assert.equal(r.migre, true);
  assert.ok(fs.existsSync(path.join(w, OUTDIR_NAME, "cle-de-session.json")));
  assert.ok(!fs.existsSync(path.join(w, ANCIEN_OUTDIR_NAME)));
  assert.match(decrireSortie(r), /renommé « Hidden-Tokens »/);
  // Au démarrage suivant, plus rien à faire.
  assert.equal(resoudreSortie(w).migre, false);
});

test("renommage refusé : on continue dans l'ancien dossier, sans rien copier", () => {
  const w = tmp();
  fs.mkdirSync(path.join(w, ANCIEN_OUTDIR_NAME));
  const r = resoudreSortie(w, { rename: () => { const e = new Error("refus"); e.code = "EPERM"; throw e; } });
  assert.equal(r.dir, path.join(w, ANCIEN_OUTDIR_NAME));
  assert.equal(r.nom, ANCIEN_OUTDIR_NAME);
  assert.match(decrireSortie(r), /EPERM/);
});

test("un autre processus a renommé juste avant : on prend le nouveau", () => {
  const w = tmp();
  fs.mkdirSync(path.join(w, ANCIEN_OUTDIR_NAME));
  const r = resoudreSortie(w, { rename: (a, b) => { fs.renameSync(a, b); const e = new Error("déjà fait"); e.code = "ENOENT"; throw e; } });
  assert.equal(r.dir, path.join(w, OUTDIR_NAME));
  assert.equal(r.erreur, undefined);
});

test("les deux existent : le nouveau gagne, et on le dit", () => {
  const w = tmp();
  fs.mkdirSync(path.join(w, ANCIEN_OUTDIR_NAME));
  fs.mkdirSync(path.join(w, OUTDIR_NAME));
  const r = resoudreSortie(w);
  assert.equal(r.dir, path.join(w, OUTDIR_NAME));
  assert.equal(r.ancienRestant, true);
  assert.match(decrireSortie(r), /existe encore/);
});

test("dossier de la sentinelle : Hidden Tokens, l'ancien tant qu'il est seul", () => {
  const home = tmp();
  const support = path.join(home, "Library", "Application Support");
  fs.mkdirSync(support, { recursive: true });
  assert.equal(dossierSentinelle({}, "darwin", home), path.join(support, "Hidden Tokens"));
  fs.mkdirSync(path.join(support, "Nanomizer"));
  assert.equal(dossierSentinelle({}, "darwin", home), path.join(support, "Nanomizer"));
  fs.mkdirSync(path.join(support, "Hidden Tokens"));
  assert.equal(dossierSentinelle({}, "darwin", home), path.join(support, "Hidden Tokens"));
  assert.equal(dossierSentinelle({ NANOMIZER_SENTINELLE_DIR: "/x/ancien" }, "darwin", home), "/x/ancien");
  assert.equal(dossierSentinelle({ HIDDEN_TOKENS_SENTINELLE_DIR: "/x/neuf", NANOMIZER_SENTINELLE_DIR: "/x/ancien" }, "darwin", home), "/x/neuf");
});
