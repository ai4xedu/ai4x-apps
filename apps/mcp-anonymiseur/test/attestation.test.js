// L'attestation (v2.13) : une page de preuve signée, certifiée par Ai4x quand
// le cabinet est abonné, par le poste seul sinon — et qui dit la vérité,
// fuites comprises.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  attestHtml, verifyAttestedHtml, verifyAttestation, extractAttestation, posteIdentity, hashHtml, decrireVerification, POSTE_KEY_FILE,
} from "../server/attestation.js";
import { sealIdentity } from "../server/sceau.js";
import { parseKey } from "../server/licence.js";
import { mintWithSeal, TEST_KEY } from "./licence-test.mjs";

const TRUSTED = [crypto.createPublicKey(TEST_KEY)];
const EXP = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
const PAGE = `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Ce que Claude a vu</title></head><body><main><h1>Ce que Claude a vu</h1><p>42 réponses, 0 fuite.</p></main></body></html>`;
const A = { genre: "journal", emis: "2026-10-22", du: "2026-10-01", au: "2026-10-22", comptes: { echanges: 42, fuites: 0, codes: 117 }, ver: "2.13.0" };

function cabinet() {
  const lic = mintWithSeal({ v: 1, org: "Cabinet Test & Associés", seats: 3, iat: "2026-10-01", exp: EXP, id: "abcd1234" });
  return sealIdentity(parseKey(lic).payload, TRUSTED);
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "nanomizer-att-"));

test("abonné : page signée, certifiée par Ai4x, vérifiée hors ligne", () => {
  const { html, token, certifie } = attestHtml(cabinet(), PAGE, A);
  assert.equal(certifie, true);
  assert.equal(extractAttestation(html), token);
  assert.match(html, /Page de preuve signée/);
  const v = verifyAttestedHtml(html, TRUSTED);
  assert.equal(v.ok, true, v.reason);
  assert.equal(v.certifie, true);
  assert.equal(v.cabinet.org, "Cabinet Test & Associés");
  assert.equal(v.att.comptes.echanges, 42);
  assert.match(decrireVerification(v), /✓ Preuve vérifiée.*journal/);
  assert.match(decrireVerification(v), /certifiée par Ai4x/);
});

test("un chiffre retouché à la main invalide la page", () => {
  const { html } = attestHtml(cabinet(), PAGE, A);
  const retouche = html.replace("0 fuite", "0 fuite (vérifié)");
  const v = verifyAttestedHtml(retouche, TRUSTED);
  assert.equal(v.ok, false);
  assert.match(v.reason, /page modifiée/);
  // Le jeton lui-même retouché : signature invalide.
  const token = extractAttestation(html);
  const [p, body, sig] = token.split(".");
  const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  data.comptes.fuites = 0; data.comptes.echanges = 9999;
  const forged = `${p}.${Buffer.from(JSON.stringify(data)).toString("base64url")}.${sig}`;
  assert.match(verifyAttestation(forged, TRUSTED).reason, /signature du cabinet invalide/);
});

test("essai : signée par le poste seul, intégrité prouvée, identité non certifiée — et stable d'une preuve à l'autre", () => {
  const dir = tmp();
  const id = posteIdentity(dir);
  assert.equal(id.cert, null);
  assert.equal((fs.statSync(path.join(dir, POSTE_KEY_FILE)).mode & 0o777), 0o600);
  const { html, certifie } = attestHtml(id, PAGE, { ...A, comptes: { echanges: 3, fuites: 2 } });
  assert.equal(certifie, false);
  assert.match(html, /poste seul/);
  const v = verifyAttestedHtml(html, TRUSTED);
  assert.equal(v.ok, true, v.reason);
  assert.equal(v.certifie, false);
  assert.equal(v.att.comptes.fuites, 2, "l'attestation dit la vérité, fuites comprises");
  assert.match(decrireVerification(v), /identité du cabinet non certifiée/);
  assert.equal(posteIdentity(dir).posteKey, id.posteKey, "même poste, même clé");
});

test("sans jeton, ou avec un sceau à la place : refusé proprement", () => {
  assert.match(verifyAttestedHtml(PAGE, TRUSTED).reason, /ne porte pas d'attestation/);
  assert.match(verifyAttestation("NANOS1.abc.def", TRUSTED).reason, /pas une attestation/);
  const sansSignataire = Buffer.from(JSON.stringify({ v: 1, sha: "x" })).toString("base64url");
  assert.match(verifyAttestation(`NANOA1.${sansSignataire}.AAAA`, TRUSTED).reason, /sans signataire/);
});

test("l'empreinte ignore le jeton, et seulement lui", () => {
  const { html } = attestHtml(cabinet(), PAGE, A);
  const sansMeta = html.replace(/<meta name="nanomizer-attestation" content="[^"]*">\n?/, "");
  assert.equal(hashHtml(html), hashHtml(sansMeta));
  assert.notEqual(hashHtml(html), hashHtml(sansMeta + " "));
});
