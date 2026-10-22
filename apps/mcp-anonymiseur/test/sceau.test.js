// Le sceau (v2.6) : certifié par Ai4x, signé par le cabinet, vérifiable par
// son client — et jamais délivré sur une fuite.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { issueSealIdentity, sealIdentity, buildSeal, verifySeal, verifyCertificate, renderSealPage } from "../server/sceau.js";
import { parseKey, licenceStatus, b64urlEncode } from "../server/licence.js";
import { mint, mintWithSeal, TEST_KEY } from "./licence-test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const TRUSTED = [crypto.createPublicKey(TEST_KEY)];
const EXP = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
const ATT = { ref: "Dossier 2026-118", emis: "2026-10-21", du: "2026-10-01", au: "2026-10-20", echanges: 42, codes: 117, fichiers: 3, version: "2.6.0" };

function identity(exp = EXP) {
  const lic = mintWithSeal({ v: 1, org: "Cabinet Test & Associés", seats: 3, iat: "2026-10-01", exp, id: "abcd1234" });
  return sealIdentity(parseKey(lic).payload, TRUSTED);
}

test("chaîne complète : certificat Ai4x → sceau du cabinet → vérification", () => {
  const seal = buildSeal(identity(), ATT);
  const v = verifySeal(seal, TRUSTED);
  assert.equal(v.ok, true, v.reason);
  assert.equal(v.cabinet.org, "Cabinet Test & Associés");
  assert.equal(v.seal.ech, 42);
  assert.equal(v.seal.fuites, 0);
  assert.equal(v.seal.ref, "Dossier 2026-118");
});

test("un sceau modifié (chiffre gonflé) est refusé", () => {
  const seal = buildSeal(identity(), ATT);
  const [p, body, sig] = seal.split(".");
  const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  data.codes = 9999;
  const forged = `${p}.${b64urlEncode(Buffer.from(JSON.stringify(data)))}.${sig}`;
  assert.match(verifySeal(forged, TRUSTED).reason, /signature du cabinet invalide/);
});

test("un cabinet qui se certifie lui-même (clé non Ai4x) est refusé", () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const fake = { ...identity(), ...(() => {
    const s = issueSealIdentity(privateKey, { org: "Faux Cabinet", id: "x", iat: "2026-01-01", exp: EXP });
    return sealIdentity({ sceau: s }, [crypto.createPublicKey(privateKey)]);
  })() };
  assert.match(verifySeal(buildSeal(fake, ATT), TRUSTED).reason, /certificat non signé par Ai4x/);
});

test("séparation des domaines : un certificat (public) n'est PAS une licence", () => {
  const { cert } = issueSealIdentity(TEST_KEY, { org: "Cabinet", id: "c1", iat: "2026-01-01", exp: EXP });
  const [, body, sig] = cert.split(".");
  assert.equal(parseKey(`NANO1.${body}.${sig}`).ok, false);
  assert.equal(licenceStatus(`NANO1.${body}.${sig}`).valid, false);
  // Et une licence n'est pas un certificat.
  const lic = mint({ v: 1, org: "X", seats: 1, iat: "2026-01-01", exp: EXP });
  const [, lb, ls] = lic.split(".");
  assert.equal(verifyCertificate(`NANOC1.${lb}.${ls}`, TRUSTED).ok, false);
});

test("un sceau daté après la fin de l'abonnement est refusé", () => {
  const seal = buildSeal(identity("2026-06-30"), ATT);
  assert.match(verifySeal(seal, TRUSTED).reason, /après la fin de l'abonnement/);
});

test("une licence sans identité de sceau (avant v2.6, ou essai) n'en donne pas", () => {
  const lic = mint({ v: 1, org: "Ancien", seats: 1, iat: "2026-01-01", exp: EXP });
  assert.equal(sealIdentity(parseKey(lic).payload, TRUSTED), null);
});

test("la page locale : QR, clause, aucune ressource externe", () => {
  const id = identity();
  const html = renderSealPage(buildSeal(id, ATT), id, ATT);
  assert.match(html, /<svg/);
  assert.match(html, /Clause pour la lettre de mission/);
  assert.match(html, /verifier-sceau#NANOS1\./);
  assert.match(html, /Cabinet Test &amp; Associés/);
  assert.doesNotMatch(html, /<script|src="http/);
});

/* --------------------------------------------------- de bout en bout ---- */
const out = (res) => res.content.map((c) => c.text || "").join("\n");
async function serverWith(licenceKey, files = {}) {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-sceau-"));
  for (const [n, t] of Object.entries(files)) fs.writeFileSync(path.join(workdir, n), t);
  const client = new Client({ name: "sceau", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: licenceKey },
  }));
  return { client, workdir };
}
let A, B;
before(async () => {
  A = await serverWith(mintWithSeal({ v: 1, org: "Cabinet Benali", seats: 2, iat: "2026-10-01", exp: EXP }),
    { "note.md": "Mon client Hicham Bennani (hicham.bennani@gmail.com) conteste la facture FAC-2026-0142.\n" });
  B = await serverWith(mint({ v: 1, org: "Cabinet Ancien", seats: 1, iat: "2026-01-01", exp: EXP }));
});
after(async () => {
  for (const s of [A, B]) { await s.client.close(); fs.rmSync(s.workdir, { recursive: true, force: true }); }
});

test("sceau_dossier : rien à attester tant qu'aucun dossier n'est passé par Nanomizer", async () => {
  assert.match(out(await A.client.callTool({ name: "sceau_dossier", arguments: {} })), /Rien à attester/);
});

test("sceau_dossier : après un travail réel, un sceau vérifiable, sans aucune valeur réelle", async () => {
  await A.client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "note.md", confirmer: true } });
  const res = out(await A.client.callTool({ name: "sceau_dossier", arguments: { reference: "Dossier 2026-118" } }));
  assert.match(res, /✅ Sceau délivré au nom de Cabinet Benali/);
  assert.match(res, /0 retrouvée en clair/);
  assert.match(res, /lettre de mission/);
  for (const v of ["Hicham", "Bennani", "hicham.bennani@gmail.com", "FAC-2026-0142"]) assert.ok(!res.includes(v), `${v} a fui`);
  // Le lien survit au verrou de sortie et se vérifie.
  const seal = res.match(/verifier-sceau#(NANOS1\.[\w-]+\.[\w-]+)/)[1];
  const v = verifySeal(seal, TRUSTED);
  assert.equal(v.ok, true, v.reason);
  assert.equal(v.seal.ref, "Dossier 2026-118");
  assert.ok(v.seal.codes >= 3);
  const page = fs.readdirSync(path.join(A.workdir, "Hidden-Tokens")).find((n) => n.startsWith("SCEAU-HIDDEN-TOKENS-"));
  assert.ok(page, "page du sceau absente");
});

test("sceau_dossier : une licence d'avant la v2.6 reçoit le mode d'emploi (réémission gratuite)", async () => {
  assert.match(out(await B.client.callTool({ name: "sceau_dossier", arguments: {} })), /clé réémise, sans frais/);
});
