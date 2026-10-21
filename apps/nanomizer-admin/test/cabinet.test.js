// US-1 — le cabinet et sa clé de signature.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  creerCabinet, ouvrirCabinet, lireCabinet, ecrireCabinet, exporterSecours, importerSecours,
  clePublique, PhraseIncorrecte, CabinetInvalide, FICHIER_CABINET,
} from "../lib/cabinet.js";
import { PHRASE, COUT_TEST, cabinetDeTest, dossierTemp } from "./aide.js";

test("une phrase trop courte est refusée", () => {
  assert.throws(() => creerCabinet({ nom: "X", phrase: "court", cout: COUT_TEST }), CabinetInvalide);
});

test("le cabinet s'ouvre avec la bonne phrase, et la clé privée signe ce que vérifie la clé publique", () => {
  const { cabinet, ouvert } = cabinetDeTest();
  assert.match(cabinet.id, /^cab_[0-9a-f]{8}$/);
  assert.match(cabinet.cle.id, /^k_[0-9a-f]{12}$/);
  assert.equal(ouvert.sel.length, 32);
  const sig = crypto.sign(null, Buffer.from("bonjour"), ouvert.clePrivee);
  assert.ok(crypto.verify(null, Buffer.from("bonjour"), clePublique(cabinet), sig));
});

test("une mauvaise phrase n'ouvre pas le coffre", () => {
  const { cabinet } = cabinetDeTest();
  assert.throws(() => ouvrirCabinet(cabinet, "ce n'est pas la bonne phrase"), PhraseIncorrecte);
});

test("le fichier cabinet ne contient ni la clé privée ni le sel en clair", () => {
  const { cabinet, ouvert } = cabinetDeTest();
  const texte = JSON.stringify(cabinet);
  const pkcs8 = ouvert.clePrivee.export({ format: "der", type: "pkcs8" });
  assert.ok(!texte.includes(pkcs8.toString("base64")));
  assert.ok(!texte.includes(pkcs8.subarray(-32).toString("base64").slice(0, 20)));
  assert.ok(!texte.includes(ouvert.sel.toString("base64")));
});

test("un coffre greffé sur un autre cabinet ne s'ouvre pas", () => {
  const a = cabinetDeTest("A").cabinet;
  const b = cabinetDeTest("B").cabinet;
  const greffe = { ...b, coffre: a.coffre };
  assert.throws(() => ouvrirCabinet(greffe, PHRASE), PhraseIncorrecte);
});

test("écrit avec des droits restreints, relu à l'identique, jamais écrasé par une création", () => {
  const d = dossierTemp();
  const f = path.join(d, "admin", FICHIER_CABINET);
  const { cabinet } = cabinetDeTest();
  ecrireCabinet(f, cabinet, { nouveau: true });
  if (process.platform !== "win32") assert.equal(fs.statSync(f).mode & 0o777, 0o600); // pas de droits POSIX sous Windows
  assert.deepEqual(lireCabinet(f), cabinet);
  assert.throws(() => ecrireCabinet(f, cabinetDeTest().cabinet, { nouveau: true }), /existe déjà/);
});

test("une clé publique modifiée dans le fichier est détectée", () => {
  const d = dossierTemp();
  const f = path.join(d, FICHIER_CABINET);
  const { cabinet } = cabinetDeTest();
  const autre = crypto.generateKeyPairSync("ed25519").publicKey.export({ format: "der", type: "spki" });
  ecrireCabinet(f, { ...cabinet, cle: { ...cabinet.cle, publique: autre.toString("base64") } });
  assert.throws(() => lireCabinet(f), /incohérent/);
});

test("le secours se réimporte et s'ouvre avec la phrase", () => {
  const { cabinet } = cabinetDeTest();
  const texte = exporterSecours(cabinet);
  assert.match(texte, /DEBUT SECOURS NANOMIZER/);
  const relu = importerSecours(texte);
  assert.deepEqual(relu, cabinet);
  assert.ok(ouvrirCabinet(relu, PHRASE).clePrivee);
});
