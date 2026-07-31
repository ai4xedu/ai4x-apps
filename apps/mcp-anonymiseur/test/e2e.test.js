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
import { writeMinimalPdf, FACTURE_PDF_LINES } from "./util-pdf.mjs";
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

  // Une facture MISE EN PAGE (pas un tableau) — le cas réel qui a tout déclenché.
  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb2,
    XLSX.utils.aoa_to_sheet([
      ["", "", "", "FACTURE"],
      ["", "", "", "N°  FAC-2026-003"],
      ["ÉMETTEUR", "", "", "CLIENT"],
      ["TARDIGRADE", "", "", "Sophatel S.A"],
      ["ICE : 003463957000076", "", "", "ICE : 001510119000058"],
      ["IF : 65908714   |   RC : 620437 (Casablanca)"],
      ["Patente : 35788345   |   Tél : +212 6 61 23 45 67"],
      ["N°", "Désignation", "Qté", "Montant HT"],
      [1, "Formation Claude Bootcamp", 1, 2150],
      ["", "", "Total HT", 2150],
    ]),
    "Facture"
  );
  XLSX.writeFile(wb2, path.join(workdir, "facture.xlsx"));

  // La même facture, en PDF natif (générateur minimal, ASCII).
  writeMinimalPdf(path.join(workdir, "facture.pdf"), FACTURE_PDF_LINES);

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

test("tools/list expose les 6 outils", async () => {
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "anonymiser_dossier", "anonymiser_fichier", "deanonymiser", "etat_cle", "lister_fichiers", "reinitialiser_cle",
  ]);
});

test("lister_fichiers voit clients.xlsx", async () => {
  const res = await client.callTool({ name: "lister_fichiers", arguments: {} });
  assert.match(resultText(res), /clients\.xlsx/);
});

test("anonymiser_fichier sans confirmer : un PLAN, rien d'écrit, zéro valeur réelle", async () => {
  const res = await client.callTool({
    name: "anonymiser_fichier",
    arguments: { nom_fichier: "clients.xlsx" },
  });
  const out = resultText(res);
  assert.match(out, /PLAN D'ANONYMISATION/);
  assert.match(out, /mode TABLEAU/);
  assert.match(out, /confirmer: true/);
  // La fuite de la colonne Commentaires est déjà annoncée au stade du plan.
  assert.match(out, /Commentaires/);
  assert.ok(!out.includes("El Amrani"), "un nom réel a fui dans le plan");
  assert.ok(!out.includes("yassine.elamrani@gmail.com"), "un email réel a fui dans le plan");
  // Rien n'a été écrit.
  assert.ok(!fs.existsSync(path.join(workdir, "Anonymiseur-Ai4x", "clients-anonymise.xlsx")));
});

test("anonymiser_fichier confirmé : codes présents, valeurs réelles absentes, fuite signalée", async () => {
  const res = await client.callTool({
    name: "anonymiser_fichier",
    arguments: { nom_fichier: "clients.xlsx", confirmer: true },
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
    arguments: { nom_fichier: "clients.xlsx", confirmer: true },
  });
  assert.match(resultText(res), /0 nouveaux codes/);
});

test("mode document : facture → identifiants codés, montants et libellés intacts", async () => {
  // Le plan d'abord : détection automatique de la mise en page.
  const plan = await client.callTool({
    name: "anonymiser_fichier",
    arguments: { nom_fichier: "facture.xlsx" },
  });
  const planOut = resultText(plan);
  assert.match(planOut, /PLAN D'ANONYMISATION/);
  assert.match(planOut, /mode DOCUMENT/);
  assert.match(planOut, /CODÉS D'OFFICE/);
  assert.ok(!planOut.includes("003463957000076"), "un ICE réel a fui dans le plan");
  assert.ok(!planOut.includes("TARDIGRADE"), "un nom détecté a fui dans le plan");
  assert.ok(!planOut.includes("Sophatel"), "un nom détecté a fui dans le plan");
  // Exécution SANS fournir de noms : ils sont codés d'office (fail-closed).
  const res = await client.callTool({
    name: "anonymiser_fichier",
    arguments: { nom_fichier: "facture.xlsx", confirmer: true },
  });
  const out = resultText(res);
  assert.match(out, /mode DOCUMENT/);
  assert.match(out, /ICE-\d{3}/);
  assert.match(out, /SOCIETE-\d{3}/);
  // Les valeurs réelles n'apparaissent nulle part — noms compris, sans qu'on les fournisse.
  assert.ok(!out.includes("003463957000076"), "l'ICE réel a fui");
  assert.ok(!out.includes("65908714"), "l'IF réel a fui");
  assert.ok(!out.includes("Sophatel"), "le nom de société a fui");
  assert.ok(!out.includes("TARDIGRADE"), "le nom en majuscules a fui");
  // La matière de travail reste : libellés et montants en clair.
  assert.match(out, /Total HT/);
  assert.match(out, /2150/);
  const decoded = XLSX.readFile(path.join(workdir, "Anonymiseur-Ai4x", "facture-anonymise.xlsx"));
  const aoa = XLSX.utils.sheet_to_json(decoded.Sheets[decoded.SheetNames[0]], { header: 1, raw: false, defval: "" });
  const flat = aoa.flat().join(" | ");
  assert.match(flat, /ICE : ICE-\d{3}/);          // libellé conservé, valeur codée
  assert.ok(!/003463957000076/.test(flat));
  assert.ok(/Total HT/.test(flat) && /2150/.test(flat));
});

test("valeurs_a_exclure : le nom reste en clair dans le FICHIER, masqué dans l'aperçu", async () => {
  const res = await client.callTool({
    name: "anonymiser_fichier",
    arguments: { nom_fichier: "facture.xlsx", confirmer: true, valeurs_a_exclure: ["TARDIGRADE"] },
  });
  const out = resultText(res);
  // Second filet : même exclu du codage, un nom suspect ne traverse pas l'aperçu.
  assert.ok(!out.includes("TARDIGRADE"), "le nom exclu a fui dans la conversation");
  assert.match(out, /MASQUÉ — fuite possible/);
  // Mais le fichier local, lui, le garde en clair (choix de l'utilisateur).
  const wbOut = XLSX.readFile(path.join(workdir, "Anonymiseur-Ai4x", "facture-anonymise.xlsx"));
  const flat = XLSX.utils.sheet_to_json(wbOut.Sheets[wbOut.SheetNames[0]], { header: 1, raw: false, defval: "" })
    .flat().join(" | ");
  assert.ok(flat.includes("TARDIGRADE"), "l'exclusion n'a pas été respectée dans le fichier");
});

test("PDF natif : plan en comptes, contenu anonymisé en .md, PDF jamais réécrit", async () => {
  const plan = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "facture.pdf" } });
  const planOut = resultText(plan);
  assert.match(planOut, /PLAN D'ANONYMISATION — PDF natif/);
  assert.match(planOut, /\.md/);
  assert.ok(!planOut.includes("ATLAS"), "un nom réel a fui dans le plan PDF");
  assert.ok(!planOut.includes("003463957000076"), "un ICE réel a fui dans le plan PDF");

  const res = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "facture.pdf", confirmer: true } });
  const out = resultText(res);
  assert.match(out, /PDF natif/);
  assert.match(out, /n'est PAS modifié/);
  assert.ok(!out.includes("ATLAS") && !out.includes("Menara") && !out.includes("003463957000076"),
    "une valeur réelle a fui dans le compte rendu PDF");
  assert.match(out, /ICE : ICE-\d{3}/);
  assert.ok(out.includes("20500"), "les montants doivent rester dans l'aperçu");
  // Le contenu anonymisé est sur le poste, complet.
  const mdPath = path.join(workdir, "Anonymiseur-Ai4x", "facture-anonymise.md");
  assert.ok(fs.existsSync(mdPath), "sortie .md absente");
  const md = fs.readFileSync(mdPath, "utf8");
  assert.match(md, /ICE : ICE-\d{3}/);
  assert.ok(!md.includes("ATLAS NEGOCE") && !md.includes("007810000123456789012345"));
  assert.ok(md.includes("Total HT : 20500"));
  // Le PDF d'origine est intact.
  assert.ok(fs.existsSync(path.join(workdir, "facture.pdf")));
});

test("PDF scanné (sans texte) : refus honnête, jamais un faux « rien détecté »", async () => {
  const scanPath = path.join(workdir, "scan.pdf");
  writeMinimalPdf(scanPath, ["", "", ""]);
  const res = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "scan.pdf", confirmer: true } });
  assert.ok(res.isError, "un PDF sans texte doit être refusé");
  assert.match(resultText(res), /OCR/);
  fs.unlinkSync(scanPath); // ne pas polluer le test de lot qui suit
});

test("anonymiser_dossier : plan en comptes seuls, exécution → fichiers + rapport + clé unique", async () => {
  // Le PLAN d'abord : liste des fichiers, comptes par type, zéro valeur réelle.
  const plan = await client.callTool({ name: "anonymiser_dossier", arguments: {} });
  const planOut = resultText(plan);
  assert.match(planOut, /PLAN DE LOT — 3 fichier/);
  assert.match(planOut, /clients\.xlsx/);
  assert.match(planOut, /facture\.xlsx/);
  assert.match(planOut, /confirmer: true/);
  assert.ok(!planOut.includes("El Amrani"), "un nom réel a fui dans le plan de lot");
  assert.ok(!planOut.includes("003463957000076"), "un ICE réel a fui dans le plan de lot");
  assert.ok(!planOut.includes("Sophatel"), "un nom détecté a fui dans le plan de lot");
  // Rien n'a été écrit par le plan.
  assert.ok(!fs.readdirSync(path.join(workdir, "Anonymiseur-Ai4x")).some((n) => n.startsWith("rapport-lot-")));

  // Exécution : tous les fichiers, toutes les feuilles, une seule clé.
  const res = await client.callTool({ name: "anonymiser_dossier", arguments: { confirmer: true } });
  const out = resultText(res);
  assert.match(out, /LOT TERMINÉ — 3\/3/);
  assert.ok(!out.includes("El Amrani") && !out.includes("Sophatel"), "une valeur réelle a fui dans le compte rendu de lot");
  // Pas d'aperçu de contenu dans un compte rendu de lot : ni tableau TSV,
  // ni section « TABLEAU CODÉ » (les codes cités par le bloc de règles sont
  // des EXEMPLES de forme, pas des données).
  assert.ok(!out.includes("TABLEAU CODÉ") && !out.includes("\t"), "le compte rendu de lot contient un aperçu de tableau");
  // Sorties sur disque.
  const outDir = path.join(workdir, "Anonymiseur-Ai4x");
  assert.ok(fs.existsSync(path.join(outDir, "clients-anonymise.xlsx")));
  assert.ok(fs.existsSync(path.join(outDir, "facture-anonymise.xlsx")));
  const reportName = fs.readdirSync(outDir).find((n) => n.startsWith("rapport-lot-"));
  assert.ok(reportName, "rapport de lot absent");
  const report = fs.readFileSync(path.join(outDir, reportName), "utf8");
  assert.match(report, /clients\.xlsx/);
  assert.ok(!report.includes("El Amrani") && !report.includes("Sophatel"), "le rapport doit rester en comptes uniquement");
  // Clé UNIQUE : le même téléphone garde le même code dans les deux fichiers codés.
  const wbC = XLSX.readFile(path.join(outDir, "clients-anonymise.xlsx"));
  const wbF = XLSX.readFile(path.join(outDir, "facture-anonymise.xlsx"));
  const flatC = XLSX.utils.sheet_to_json(wbC.Sheets[wbC.SheetNames[0]], { header: 1, raw: false, defval: "" }).flat().join(" ");
  const flatF = XLSX.utils.sheet_to_json(wbF.Sheets[wbF.SheetNames[0]], { header: 1, raw: false, defval: "" }).flat().join(" ");
  const telC = flatC.match(/TEL-\d{3}/g) || [];
  const telF = flatF.match(/TEL-\d{3}/g) || [];
  // clients.xlsx contient « 06 61 23 45 67 » et la facture « +212 6 61 23 45 67 » :
  // normalisation à part, ce n'est PAS le même numéro normalisé (0661… vs +212661…),
  // mais chacun doit être codé, et aucune vraie valeur ne doit subsister.
  assert.ok(telC.length >= 1 && telF.length >= 1, "téléphones non codés dans le lot");
  assert.ok(!/06 61 23 45 67/.test(flatC) && !/\+212 6 61 23 45 67/.test(flatF));
});

test("garde-fou : un document forcé en mode tableau est refusé", async () => {
  const res = await client.callTool({
    name: "anonymiser_fichier",
    arguments: {
      nom_fichier: "facture.xlsx", mode: "tableau", confirmer: true,
      colonnes_a_coder: ["Colonne A", "Colonne B", "Colonne C", "FACTURE"],
    },
  });
  assert.ok(res.isError, "le garde-fou n'a pas refusé");
  assert.match(resultText(res), /DOCUMENT mis en page/);
  assert.match(resultText(res), /mode: "document"/);
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
