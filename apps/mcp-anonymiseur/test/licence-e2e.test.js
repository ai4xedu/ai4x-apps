// E2E de la licence — le test qui compte : à l'expiration, on cesse de
// SERVIR, on ne prend rien EN OTAGE. Un serveur sans licence valide doit
// refuser d'anonymiser mais continuer de dé-anonymiser, pour toujours.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import * as XLSX from "xlsx";
import * as _fs from "node:fs";
import { b64urlEncode } from "../server/licence.js";
XLSX.set_fs(_fs);

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");

function privateKeyOrNull() {
  try {
    const f = process.env.NANOMIZER_PRIVATE_KEY_FILE ||
      path.join(os.homedir(), "Desktop", "nanomizer-cle-privee-NE-JAMAIS-PARTAGER.txt");
    const raw = fs.readFileSync(f, "utf8").split("\n").map((l) => l.trim())
      .filter((l) => l.length > 40 && /^[A-Za-z0-9+/=]+$/.test(l)).pop();
    return crypto.createPrivateKey({ key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8" });
  } catch { return null; }
}

function mint(payload) {
  const key = privateKeyOrNull();
  if (!key) return "";
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  return `NANO1.${body}.${b64urlEncode(crypto.sign(null, Buffer.from(body), key))}`;
}

const skip = privateKeyOrNull() ? false : "clé privée absente de ce poste";

let workdir;
function resultText(res) {
  return res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
}

/* Ouvre un serveur avec la licence voulue (chaîne vide = aucune licence). */
async function connect(licence) {
  const client = new Client({ name: "lic-e2e", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: licence },
  }));
  return client;
}

before(() => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-lic-e2e-"));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Nom", "Téléphone"],
    ["El Amrani", "06 61 23 45 67"],
  ]), "Clients");
  XLSX.writeFile(wb, path.join(workdir, "clients.xlsx"));
});

after(() => fs.rmSync(workdir, { recursive: true, force: true }));

test("sans licence : anonymiser, lot et OCR sont bloqués, avec un message qui oriente", async () => {
  const client = await connect("");
  try {
    for (const name of ["anonymiser_fichier", "anonymiser_dossier", "lire_scan"]) {
      const args = name === "anonymiser_dossier" ? {} : { nom_fichier: "clients.xlsx" };
      const res = await client.callTool({ name, arguments: args });
      assert.ok(res.isError, `${name} devrait être bloqué sans licence`);
      const out = resultText(res);
      assert.match(out, /offre Équipes/, `${name} : le message doit orienter vers l'offre`);
      assert.match(out, /jamais prises en otage/, `${name} : le message doit rassurer sur les données`);
    }
  } finally { await client.close(); }
});

test("sans licence : la DÉ-ANONYMISATION et l'état de la clé restent disponibles", { skip }, async () => {
  // On code d'abord avec une licence valide…
  const ok = await connect(mint({ v: 1, org: "T", seats: 1, iat: "2026-01-01", exp: "2099-01-01" }));
  await ok.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx", confirmer: true } });
  await ok.close();

  // …puis on rouvre SANS licence : le client doit pouvoir relire ses données.
  const client = await connect("");
  try {
    const etat = await client.callTool({ name: "etat_cle", arguments: {} });
    assert.ok(!etat.isError, "etat_cle doit rester accessible");
    assert.match(resultText(etat), /aucune valide/);

    const dec = await client.callTool({
      name: "deanonymiser",
      arguments: { contenu: "Relancer NOM-001 au TEL-001.", nom_sortie: "relance" },
    });
    assert.ok(!dec.isError, "deanonymiser DOIT fonctionner sans licence — jamais d'otage");
    const m = resultText(dec).match(/Fichier décodé écrit sur le poste : (.+)/);
    assert.ok(m, "chemin du fichier décodé absent");
    const decoded = fs.readFileSync(m[1].trim(), "utf8");
    assert.ok(decoded.includes("El Amrani"), "la vraie valeur doit être restituée");
  } finally { await client.close(); }
});

test("licence expirée : même traitement — bloqué à l'écriture, libre au décodage", { skip }, async () => {
  const expired = mint({ v: 1, org: "Cabinet Échu", seats: 3, iat: "2025-01-01", exp: "2025-12-31" });
  const client = await connect(expired);
  try {
    const res = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx", confirmer: true } });
    assert.ok(res.isError);
    assert.match(resultText(res), /expiré le 2025-12-31/);
    const dec = await client.callTool({ name: "deanonymiser", arguments: { contenu: "NOM-001", nom_sortie: "x" } });
    assert.ok(!dec.isError, "le décodage survit à l'expiration");
  } finally { await client.close(); }
});

test("licence valide : etat_cle affiche titulaire, postes et échéance", { skip }, async () => {
  const client = await connect(mint({ v: 1, org: "Cabinet Sekkat", seats: 5, iat: "2026-01-01", exp: "2099-01-01" }));
  try {
    const out = resultText(await client.callTool({ name: "etat_cle", arguments: {} }));
    assert.match(out, /Cabinet Sekkat/);
    assert.match(out, /5 poste\(s\)/);
    assert.match(out, /valide jusqu'au 2099-01-01/);
  } finally { await client.close(); }
});

test("licence bientôt expirée : le bandeau prévient AVANT l'échéance", { skip }, async () => {
  const soon = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const client = await connect(mint({ v: 1, org: "Cabinet Pressé", seats: 2, iat: "2026-01-01", exp: soon }));
  try {
    const res = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx" } });
    assert.ok(!res.isError, "une licence encore valide ne bloque pas");
    const out = resultText(res);
    assert.match(out, /jour\(s\) restant/);
    assert.match(out, /dé-anonymisation continuera/);
  } finally { await client.close(); }
});
