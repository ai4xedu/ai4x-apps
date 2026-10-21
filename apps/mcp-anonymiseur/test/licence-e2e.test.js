// E2E de la licence — le test qui compte : à l'expiration, on cesse de
// SERVIR, on ne prend rien EN OTAGE. Un serveur sans licence valide doit
// refuser d'anonymiser mais continuer de dé-anonymiser, pour toujours.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import * as XLSX from "xlsx";
import * as _fs from "node:fs";
import { mint } from "./licence-test.mjs";
XLSX.set_fs(_fs);

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");

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

/* Un essai gratuit déjà consommé : ces tests vérifient le comportement SANS
   droit d'usage (l'essai a ses propres tests, plus bas). */
function expireTrial(dir) {
  fs.mkdirSync(path.join(dir, "Anonymiseur-Ai4x"), { recursive: true });
  fs.writeFileSync(path.join(dir, "Anonymiseur-Ai4x", ".nanomizer-essai.json"), JSON.stringify({ debut: "2020-01-01T00:00:00Z" }));
}

async function freshConnect(licence) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-essai-"));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Nom", "Téléphone"], ["El Amrani", "06 61 23 45 67"]]), "Clients");
  XLSX.writeFile(wb, path.join(dir, "clients.xlsx"));
  const client = new Client({ name: "essai", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath], env: { ...process.env, ANX_WORKDIR: dir, ANX_LICENCE: licence },
  }));
  return { client, dir };
}

before(() => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-lic-e2e-"));
  expireTrial(workdir);
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
      assert.match(out, /ABONNEMENT ANNUEL : 390 € HT/, `${name} : le message doit orienter vers l'offre`);
      assert.match(out, /https:\/\/ai4x\.academy\/nanomizer#plans/, `${name} : la commande se fait sur la page`);
      assert.match(out, /https:\/\/wa\.me\/212680092567/, `${name} : ou sur WhatsApp`);
      assert.match(out, /jamais prises en otage/, `${name} : le message doit rassurer sur les données`);
    }
  } finally { await client.close(); }
});

test("sans licence : la DÉ-ANONYMISATION et l'état de la clé restent disponibles", async () => {
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
    const m = resultText(dec).match(/Fichier décodé écrit sur le poste : .*?(Anonymiseur-Ai4x\/\S+)/);
    assert.ok(m, "chemin du fichier décodé absent");
    const decoded = fs.readFileSync(path.join(workdir, m[1]), "utf8");
    assert.ok(decoded.includes("El Amrani"), "la vraie valeur doit être restituée");
  } finally { await client.close(); }
});

test("licence expirée : même traitement — bloqué à l'écriture, libre au décodage", async () => {
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

test("licence valide : etat_cle affiche titulaire, postes et échéance", async () => {
  const client = await connect(mint({ v: 1, org: "Cabinet Sekkat", seats: 5, iat: "2026-01-01", exp: "2099-01-01" }));
  try {
    const out = resultText(await client.callTool({ name: "etat_cle", arguments: {} }));
    assert.match(out, /Cabinet Sekkat/);
    assert.match(out, /5 poste\(s\)/);
    assert.match(out, /valide jusqu'au 2099-01-01/);
  } finally { await client.close(); }
});

test("licence À VIE : acceptée, affichée « à vie », jamais d'avertissement d'échéance", async () => {
  const client = await connect(mint({ v: 1, org: "Maître Sekkat", seats: 1, iat: "2026-09-18", exp: "9999-12-31", life: true }));
  try {
    const out = resultText(await client.callTool({ name: "etat_cle", arguments: {} }));
    assert.match(out, /Maître Sekkat/);
    assert.match(out, /À VIE/);
    const plan = resultText(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx" } }));
    assert.match(plan, /PLAN D'ANONYMISATION/);
    assert.ok(!/jour\(s\) restant/.test(plan), "une licence à vie n'expire pas");
  } finally { await client.close(); }
});

test("licence bientôt expirée : le bandeau prévient AVANT l'échéance", async () => {
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

/* ---------------------------------------------------- essai gratuit (v2.2) */

test("essai : sans licence, la première anonymisation ouvre 14 jours d'accès complet", async () => {
  const { client, dir } = await freshConnect("");
  try {
    assert.match(resultText(await client.callTool({ name: "etat_cle", arguments: {} })), /essai gratuit de 14 jours disponible/);
    const plan = resultText(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx" } }));
    assert.match(plan, /PLAN D'ANONYMISATION/);
    assert.match(plan, /🧪 Essai gratuit : 14 jour\(s\) restant\(s\)/);
    assert.match(plan, /sur devis/);
    assert.ok(fs.existsSync(path.join(dir, "Anonymiseur-Ai4x", ".nanomizer-essai.json")));
    assert.match(resultText(await client.callTool({ name: "etat_cle", arguments: {} })), /essai gratuit, 14 jour\(s\) restant/);
  } finally { await client.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("essai terminé : anonymiser est bloqué, le décodage jamais", async () => {
  const { client, dir } = await freshConnect("");
  expireTrial(dir);
  try {
    const res = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx" } });
    assert.ok(res.isError);
    assert.match(resultText(res), /essai gratuit de 14 jours est terminé/);
    assert.match(resultText(res), /devis/);
    const dec = await client.callTool({ name: "deanonymiser", arguments: { contenu: "NOM-001", nom_sortie: "x" } });
    assert.ok(!/🔒/.test(resultText(dec)), "le décodage ne s'arrête jamais");
  } finally { await client.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("essai : une licence payée échue n'en ouvre pas ; une clé refusée est signalée pendant l'essai", async () => {
  const lapsed = await freshConnect(mint({ v: 1, org: "Cabinet Échu", seats: 3, iat: "2025-01-01", exp: "2025-12-31" }));
  try {
    const res = await lapsed.client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx" } });
    assert.ok(res.isError);
    assert.match(resultText(res), /expiré le 2025-12-31/);
  } finally { await lapsed.client.close(); fs.rmSync(lapsed.dir, { recursive: true, force: true }); }
  const bad = await freshConnect("NANO1.abc.def");
  try {
    const plan = resultText(await bad.client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx" } }));
    assert.match(plan, /Essai gratuit/);
    assert.match(plan, /clé configurée a été refusée/);
  } finally { await bad.client.close(); fs.rmSync(bad.dir, { recursive: true, force: true }); }
});
