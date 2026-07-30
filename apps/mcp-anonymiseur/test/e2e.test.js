// E2E : on parle au serveur via le vrai protocole MCP (stdio), comme Claude
// Desktop le fera. Vérifie surtout la RÈGLE N°1 : aucune valeur réelle dans
// les résultats d'outils ; les valeurs décodées uniquement sur disque.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import * as XLSX from "xlsx";
import * as _fs from "node:fs";
XLSX.set_fs(_fs); // build ESM de SheetJS : fs à brancher explicitement

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");

let client;
let workdir;

function resultText(res) {
  return res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
}

before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-e2e-"));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Nom", "Prénom", "Téléphone", "Commentaires", "Montant"],
      ["El Amrani", "Yassine", "06 61 23 45 67", "Joindre yassine.elamrani@gmail.com si absent", 12400],
      ["Benkirane", "Salma", "06 62 98 76 54", "RAS", 3250],
    ]),
    "Impayés"
  );
  XLSX.writeFile(wb, path.join(workdir, "clients.xlsx"));

  client = new Client({ name: "e2e", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      env: { ...process.env, ANX_WORKDIR: workdir },
    })
  );
});

after(async () => {
  await client.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});

test("tools/list expose les 5 outils", async () => {
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "anonymiser_fichier", "deanonymiser", "etat_cle", "lister_fichiers", "reinitialiser_cle",
  ]);
});

test("lister_fichiers voit clients.xlsx", async () => {
  const res = await client.callTool({ name: "lister_fichiers", arguments: {} });
  assert.match(resultText(res), /clients\.xlsx/);
});

test("anonymiser_fichier : codes présents, valeurs réelles absentes, fuite signalée", async () => {
  const res = await client.callTool({
    name: "anonymiser_fichier",
    arguments: { nom_fichier: "clients.xlsx" },
  });
  const out = resultText(res);
  assert.match(out, /NOM-001/);
  assert.match(out, /TEL-002/);
  // RÈGLE N°1 : aucune valeur réelle dans le contexte.
  assert.ok(!out.includes("El Amrani"), "un nom réel a fui dans le résultat");
  assert.ok(!out.includes("06 61 23 45 67"), "un téléphone réel a fui dans le résultat");
  // Contrôle de fuite : l'email enfoui dans Commentaires est signalé (pas cité).
  assert.match(out, /CONTRÔLE DE FUITE/);
  assert.match(out, /Commentaires/);
  assert.ok(!out.includes("yassine.elamrani@gmail.com"), "l'email de la fuite a été cité");
  // Les consignes anti-reformulation voyagent avec les données.
  assert.match(out, /EXACTEMENT tel quel/);
  // Fichiers écrits sur le poste.
  assert.ok(fs.existsSync(path.join(workdir, "Anonymiseur-Ai4x", "clients-anonymise.xlsx")));
  assert.ok(fs.existsSync(path.join(workdir, "Anonymiseur-Ai4x", "cle-correspondance-NE-JAMAIS-PARTAGER.xlsx")));
});

test("clé stable : deuxième passe sans nouveau code", async () => {
  const res = await client.callTool({
    name: "anonymiser_fichier",
    arguments: { nom_fichier: "clients.xlsx" },
  });
  assert.match(resultText(res), /0 nouveaux codes/);
});

test("deanonymiser : compte rendu sans valeurs réelles, fichier décodé correct", async () => {
  const res = await client.callTool({
    name: "deanonymiser",
    arguments: { contenu: "Priorité : relancer NOM-001 PRENOM-001 au TEL-001 avant vendredi.", nom_sortie: "relances" },
  });
  const out = resultText(res);
  assert.match(out, /3 code\(s\) remplacé\(s\)/);
  assert.ok(!out.includes("El Amrani"), "valeur réelle dans le compte rendu de décodage");
  const m = out.match(/Fichier décodé écrit sur le poste : (.+)/);
  assert.ok(m, "chemin du fichier décodé absent");
  const decoded = fs.readFileSync(m[1].trim(), "utf8");
  assert.ok(decoded.includes("El Amrani"));
  assert.ok(decoded.includes("06 61 23 45 67"));
});

test("deanonymiser un tableau TSV produit un xlsx", async () => {
  const res = await client.callTool({
    name: "deanonymiser",
    arguments: { contenu: "Nom\tTéléphone\nNOM-001\tTEL-001\nNOM-002\tTEL-002", nom_sortie: "tableau" },
  });
  const m = resultText(res).match(/Fichier décodé écrit sur le poste : (.+)/);
  assert.ok(m && m[1].trim().endsWith(".xlsx"));
  const wb = XLSX.readFile(m[1].trim());
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  assert.equal(aoa[1][0], "El Amrani");
});

test("etat_cle : comptes sans correspondances", async () => {
  const res = await client.callTool({ name: "etat_cle", arguments: {} });
  const out = resultText(res);
  assert.match(out, /codes/);
  assert.ok(!out.includes("El Amrani"));
});

test("sécurité : évasion du dossier de travail refusée", async () => {
  const res = await client.callTool({
    name: "anonymiser_fichier",
    arguments: { nom_fichier: "../../etc/passwd" },
  });
  assert.ok(res.isError);
  assert.match(resultText(res), /Chemin refusé/);
});

test("reinitialiser_cle exige la confirmation puis archive", async () => {
  const refus = await client.callTool({ name: "reinitialiser_cle", arguments: { confirmer: false } });
  assert.ok(refus.isError);
  const ok = await client.callTool({ name: "reinitialiser_cle", arguments: { confirmer: true } });
  assert.match(resultText(ok), /Clé archivée/);
  const etat = await client.callTool({ name: "etat_cle", arguments: {} });
  assert.match(resultText(etat), /vide/);
});
