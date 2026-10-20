// ZÉRO RÉSEAU — la promesse « rien ne sort de votre poste » vérifiée à
// l'exécution, pas seulement à la lecture du code : le connecteur tourne avec
// le modèle de permissions de Node SANS --allow-net (toute connexion lève
// ERR_ACCESS_DENIED), et tout le parcours doit marcher — tableur, PDF, OCR
// d'un scan, lot, journal, tableau de bord, remise des chiffres.
// Sur une version de Node dont le modèle de permissions ne couvre pas encore
// le réseau, le test est ignoré (et le dit) plutôt que de passer à tort.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { XLSX } from "../server/engine.js";
import { mint } from "./licence-test.mjs";
import { writeMinimalPdf, writeScannedPdf } from "./util-pdf.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");
const SANDBOX = ["--permission", "--allow-fs-read=*", "--allow-fs-write=*", "--allow-worker"];

function networkIsBlocked() {
  try {
    const out = execFileSync(process.execPath, [...SANDBOX, "-e",
      "require('net').connect(9,'127.0.0.1').on('error',e=>{console.log(e.code);process.exit()}).on('connect',()=>{console.log('OUVERT');process.exit()})"],
    { encoding: "utf8", timeout: 10000 });
    return out.trim() === "ERR_ACCESS_DENIED";
  } catch { return false; }
}
const skip = networkIsBlocked() ? false : `le modèle de permissions de Node ${process.version} ne bloque pas le réseau (Node 25+ requis)`;

let client, workdir;
const out = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");

before(async () => {
  if (skip) return;
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-reseau-"));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Nom", "Ville", "Montant"], ["Benali", "Rabat", 12400], ["Tazi", "Fès", 3250]]), "Clients");
  XLSX.writeFile(wb, path.join(workdir, "clients.xlsx"));
  writeMinimalPdf(path.join(workdir, "facture.pdf"), ["FACTURE", "Client : SOCIETE ATLAS NEGOCE", "ICE : 003463957000076", "Total HT : 2150"]);
  const jpeg = fs.readFileSync(path.join(here, "fixtures", "scan.jpg"));
  writeScannedPdf(path.join(workdir, "scan.pdf"), jpeg, 1240, 1754);
  client = new Client({ name: "reseau", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [...SANDBOX, serverPath],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Réseau", seats: 1, iat: "2026-10-20", exp: "9999-12-31", life: true }) },
  }));
});

after(async () => {
  if (skip) return;
  await client.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});

test("tout le parcours fonctionne avec le réseau interdit par Node", { skip, timeout: 180000 }, async () => {
  const steps = [
    ["anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true }, /Anonymisation terminée/],
    ["anonymiser_fichier", { nom_fichier: "facture.pdf", confirmer: true }, /ICE-\d{3}/],
    ["lire_scan", { nom_fichier: "scan.pdf" }, /À RELIRE|A-RELIRE/],
    ["anonymiser_dossier", { confirmer: true }, /Lot|lot/],
    ["verifier_confinement", {}, /AUDIT DE CONFINEMENT/],
    ["journal_ia", {}, /Aucune valeur réelle/],
  ];
  for (const [name, args, rx] of steps) {
    const res = await client.callTool({ name, arguments: args });
    const t = out(res);
    assert.ok(!res.isError, `${name} a échoué sans réseau :\n${t}`);
    assert.ok(!/ERR_ACCESS_DENIED/.test(t), `${name} a tenté une connexion :\n${t}`);
    assert.match(t, rx, `${name} :\n${t}`);
  }
  const anon = fs.readdirSync(path.join(workdir, "Anonymiseur-Ai4x")).find((n) => /^clients.*-anonymise\.xlsx$/.test(n));
  const dash = await client.callTool({ name: "tableau_de_bord", arguments: { nom_fichier: `Anonymiseur-Ai4x/${anon}`, graphiques: [{ type: "barres", colonne_x: "Ville", colonne_y: "Montant" }] } });
  assert.ok(!dash.isError, out(dash));
  const rem = await client.callTool({ name: "remettre_chiffres", arguments: { nom_fichier: `Anonymiseur-Ai4x/${anon}` } });
  assert.ok(!rem.isError, out(rem));
});
