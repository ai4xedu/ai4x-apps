// Émission de licences pour la suite de tests, avec la clé de TEST du dépôt
// (test/fixtures/licence-test.key) — jamais la clé de production. Le serveur
// ne fait confiance à cette clé que lancé depuis les sources (cf. licence.js) :
// la suite tourne partout, l'artefact distribué la refuse.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { b64urlEncode } from "../server/licence.js";
import { issueSealIdentity } from "../server/sceau.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export const TEST_KEY = crypto.createPrivateKey({
  key: Buffer.from(fs.readFileSync(path.join(here, "fixtures", "licence-test.key"), "utf8").trim(), "base64"),
  format: "der",
  type: "pkcs8",
});

/* Licence avec identité de sceau (v2.6), comme l'émet emettre-licence.mjs. */
export function mintWithSeal(payload, key = TEST_KEY) {
  return mint({ ...payload, sceau: issueSealIdentity(key, { org: payload.org, id: payload.id || "test0001", iat: payload.iat, exp: payload.exp }) }, key);
}

export function mint(payload, key = TEST_KEY) {
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  return `NANO1.${body}.${b64urlEncode(crypto.sign(null, Buffer.from(body), key))}`;
}
