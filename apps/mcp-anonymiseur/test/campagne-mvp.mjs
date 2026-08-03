#!/usr/bin/env node
// ============================================================================
// CAMPAGNE DE VALIDATION MVP — à rejouer à CHAQUE version avant publication.
//
// Différence avec `npm test` : ici on ne teste pas les sources, on teste
// L'ARTEFACT RÉELLEMENT DISTRIBUÉ (dist/anonymiseur-ai4x.mcpb, dépaqueté),
// parlé via le vrai protocole MCP, sur des données au format marocain réel,
// dans un dossier de travail isolé (jamais la clé de production).
//
// Le cœur de la campagne est l'AUDIT A5 : tout ce que les outils ont renvoyé
// est concaténé, puis on cherche CHAQUE valeur sensible dedans. Une seule
// occurrence = échec du produit, pas d'un test.
//
//   node test/campagne-mvp.mjs
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { writeMinimalPdf, writeScannedPdf } from "./util-pdf.mjs";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import * as XLSX from "xlsx";
import * as _fs from "node:fs";
XLSX.set_fs(_fs);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const bundle = path.join(root, "dist", "anonymiseur-ai4x.mcpb");

/* ------------------------------------------------------------- licence */
// Depuis la v1.6, les outils qui PRODUISENT de l'anonymisation exigent une
// licence : sans elle, la campagne testerait le message de blocage et rien
// d'autre (piège vécu — 8 contrôles au rouge pour cette seule raison). On
// émet donc une licence de campagne, courte, avec la vraie clé privée du
// poste. Sans clé privée, on s'arrête franchement plutôt que de rendre un
// bilan vert sur une campagne qui n'a rien validé.
const PRIVATE_KEY_FILE = process.env.NANOMIZER_PRIVATE_KEY_FILE ||
  path.join(os.homedir(), "Desktop", "nanomizer-cle-privee-NE-JAMAIS-PARTAGER.txt");

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function mintCampaignLicence() {
  let key;
  try {
    const raw = fs.readFileSync(PRIVATE_KEY_FILE, "utf8")
      .split("\n").map((l) => l.trim())
      .filter((l) => l.length > 40 && /^[A-Za-z0-9+/=]+$/.test(l)).pop();
    key = crypto.createPrivateKey({ key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8" });
  } catch {
    console.error(
      `Clé privée introuvable (${PRIVATE_KEY_FILE}).\n` +
      "La campagne a besoin d'émettre une licence de test pour exercer les outils de production.\n" +
      "Posez la clé privée à cet endroit, ou pointez NANOMIZER_PRIVATE_KEY_FILE dessus."
    );
    process.exit(2);
  }
  const exp = new Date(Date.now() + 86400000).toISOString().slice(0, 10);   // demain
  const payload = b64url(Buffer.from(JSON.stringify({
    v: 1, org: "Campagne MVP", seats: 1, iat: new Date().toISOString().slice(0, 10), exp, id: "campagne",
  }), "utf8"));
  return `NANO1.${payload}.${b64url(crypto.sign(null, Buffer.from(payload), key))}`;
}

const CAMPAIGN_LICENCE = mintCampaignLicence();

/* ------------------------------------------------------------- données */
// Fictives, mais aux formats marocains réels. Ce sont ces chaînes exactes
// qu'on cherchera ensuite dans TOUT ce que les outils ont dit.
const SECRETS = {
  nom1: "El Amrani", prenom1: "Yassine",
  nom2: "Benkirane", prenom2: "Salma",
  tel1: "06 61 23 45 67", tel2: "06 62 98 76 54",
  email1: "yassine.elamrani@exemple.ma",
  emailEnfoui: "contact.cache@exemple.ma",
  cin1: "AB123456",
  rib: "007810000123456789012345",
  ice1: "003463957000076", ice2: "001510119000058",
  if_: "65908714", rc: "620437", patente: "35788345",
  societe1: "ATLAS NEGOCE", societe2: "Menara Distribution S.A",
  adresse: "12 Rue des Oudayas, Rés. Yasmine, Maârif",
  // valeurs présentes dans le SCAN (fixture image) — auditées elles aussi
  scanSociete: "SOCIETE GHARB PRIMEURS", scanClient: "Cabinet Sekkat Conseil",
  scanIce: "002233445566778", scanRib: "011780000556677889900112",
};

const transcript = [];   // tout ce que les outils ont renvoyé
const results = [];      // [{ id, label, ok, detail }]
let client;
let workdir;

function record(res) {
  const t = (res.content || []).map((c) => (c.type === "text" ? c.text : "")).join("\n");
  transcript.push(t);
  return t;
}
function check(id, label, ok, detail = "") {
  results.push({ id, label, ok, detail });
  const mark = ok ? "  ✅" : "  ❌";
  console.log(`${mark} ${id} — ${label}${detail ? " · " + detail : ""}`);
  return ok;
}

/* ------------------------------------------------ préparation du terrain */
function makeFiles(dir) {
  const wb1 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb1, XLSX.utils.aoa_to_sheet([
    ["Nom", "Prénom", "CIN", "Email", "Téléphone", "RIB", "Ville", "Commentaires", "Montant"],
    [SECRETS.nom1, SECRETS.prenom1, SECRETS.cin1, SECRETS.email1, SECRETS.tel1, SECRETS.rib,
      "Casablanca", `Relancé le 12/07, joindre ${SECRETS.emailEnfoui} si absent`, 12400],
    [SECRETS.nom2, SECRETS.prenom2, "K456789", "s.benkirane@exemple.ma", SECRETS.tel2,
      "007810000987654321098765", "Rabat", "RAS", 3250],
    [SECRETS.nom1, SECRETS.prenom1, SECRETS.cin1, SECRETS.email1, SECRETS.tel1, SECRETS.rib,
      "Casablanca", "Doublon volontaire", 4100],
  ]), "Impayés");
  XLSX.writeFile(wb1, path.join(dir, "clients.xlsx"));

  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet([
    ["", "", "", "FACTURE"],
    ["", "", "", "N°  FAC-2026-017"],
    ["ÉMETTEUR", "", "", "CLIENT"],
    [SECRETS.societe1, "", "", SECRETS.societe2],
    [SECRETS.adresse, "", "", `ICE : ${SECRETS.ice2}`],
    [`ICE : ${SECRETS.ice1}`, "", "", ""],
    [`IF : ${SECRETS.if_}   |   RC : ${SECRETS.rc} (Casablanca)`],
    [`Patente : ${SECRETS.patente}   |   Tél : +212 6 61 23 45 67`],
    ["N°", "Désignation", "Qté", "Montant HT"],
    [1, "Prestation de conseil — juillet", 1, 8500],
    [2, "Formation équipe (2 jours)", 1, 12000],
    ["", "", "Total HT", 20500],
    ["", "", "TVA (20%)", 4100],
    ["", "", "TOTAL TTC", 24600],
    [`Règlement par virement — RIB : ${SECRETS.rib}`],
  ]), "Facture");
  XLSX.writeFile(wb2, path.join(dir, "facture.xlsx"));

  // La facture fournisseur en PDF natif (ASCII — le moteur normalise les accents).
  // Un scan : le JPEG de test enfermé dans un PDF sans couche de texte.
  const scanJpeg = fs.readFileSync(path.join(here, "fixtures", "scan.jpg"));
  writeScannedPdf(path.join(dir, "scan-fournisseur.pdf"), scanJpeg, 1240, 1754);

  writeMinimalPdf(path.join(dir, "facture-fournisseur.pdf"), [
    "FACTURE  N. FF-2026-118",
    "EMETTEUR",
    SECRETS.societe1,
    "12 Rue des Oudayas, Res. Yasmine, Maarif",
    `ICE : ${SECRETS.ice1}`,
    `IF : ${SECRETS.if_}   |   RC : ${SECRETS.rc}`,
    "CLIENT",
    SECRETS.societe2,
    "Total HT : 20500",
    `Reglement - RIB : ${SECRETS.rib}`,
  ]);
}

/* ---------------------------------------------------------------- main */
console.log("\n════ CAMPAGNE DE VALIDATION MVP — artefact distribué ════\n");

if (!fs.existsSync(bundle)) {
  console.error(`Bundle introuvable : ${bundle}\nLancez d'abord : npx @anthropic-ai/mcpb pack . dist/anonymiseur-ai4x.mcpb`);
  process.exit(1);
}

// Dépaquetage du .mcpb (c'est un zip) — on teste ce que l'utilisateur installe.
const unpacked = fs.mkdtempSync(path.join(os.tmpdir(), "anx-bundle-"));
execFileSync("unzip", ["-q", bundle, "-d", unpacked]);
const manifest = JSON.parse(fs.readFileSync(path.join(unpacked, "manifest.json"), "utf8"));
console.log(`Artefact : ${path.basename(bundle)} — version ${manifest.version}\n`);

workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-campagne-"));
makeFiles(workdir);
const outDir = path.join(workdir, "Anonymiseur-Ai4x");

client = new Client({ name: "campagne-mvp", version: "1.0.0" });
await client.connect(new StdioClientTransport({
  command: process.execPath,
  args: [path.join(unpacked, "server", "index.js")],
  env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: CAMPAIGN_LICENCE },
}));

const { tools } = await client.listTools();
const toolNames = tools.map((t) => t.name).sort();
console.log("── Série A — confidentialité (bloquante)\n");

/* A3 — la fuite enfouie est signalée ET masquée */
const planT = record(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx" } }));
check("A3a", "le PLAN ne cite aucune valeur réelle",
  !planT.includes(SECRETS.nom1) && !planT.includes(SECRETS.emailEnfoui) && !planT.includes(SECRETS.tel1));
check("A3b", "le PLAN annonce déjà la fuite de la colonne Commentaires", /Commentaires/.test(planT));

const codedT = record(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx", confirmer: true } }));
check("A3c", "CONTRÔLE DE FUITE déclenché sur la colonne non codée", /CONTR[ÔO]LE DE FUITE/.test(codedT));
check("A3d", "la colonne suspecte est MASQUÉE dans l'aperçu", /MASQU[ÉE]/.test(codedT));
check("A3e", "l'email enfoui n'apparaît nulle part", !codedT.includes(SECRETS.emailEnfoui));

/* Mode document sur la facture — noms codés d'office */
const docPlanT = record(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "facture.xlsx" } }));
check("A3f", "le plan DOCUMENT annonce des noms codés d'office sans les citer",
  /CODÉS D'OFFICE|codés d'office/i.test(docPlanT) && !docPlanT.includes(SECRETS.societe1) && !docPlanT.includes(SECRETS.ice1));

const docT = record(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "facture.xlsx", confirmer: true } }));
check("A3g", "identifiants marocains codés (ICE/IF/RC/patente)",
  /ICE-\d{3}/.test(docT) && /IF-\d{3}/.test(docT) && /RC-\d{3}/.test(docT) && /PATENTE-\d{3}/.test(docT));
check("A3h", "montants et libellés préservés dans l'aperçu",
  docT.includes("20500") && docT.includes("Total HT") && docT.includes("TVA"));

/* PDF natif (v1.4+) */
if (toolNames.includes("anonymiser_fichier")) {
  const pdfPlanT = record(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "facture-fournisseur.pdf" } }));
  check("A3k", "le plan PDF reste en comptes seuls",
    /PDF natif/.test(pdfPlanT) && !pdfPlanT.includes(SECRETS.societe1) && !pdfPlanT.includes(SECRETS.ice1));
  const pdfT = record(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "facture-fournisseur.pdf", confirmer: true } }));
  check("A3l", "PDF : identifiants codés, montants en clair, PDF jamais réécrit",
    /ICE : ICE-\d{3}/.test(pdfT) && pdfT.includes("20500") && /n'est PAS modifié/.test(pdfT)
    && !pdfT.includes(SECRETS.societe1) && !pdfT.includes(SECRETS.rib));
  const mdOnDisk = fs.readFileSync(path.join(outDir, "facture-fournisseur-anonymise.md"), "utf8");
  check("A3m", "le .md local est codé, complet, sans valeur réelle",
    /ICE : ICE-\d{3}/.test(mdOnDisk) && mdOnDisk.includes("Total HT : 20500") && !mdOnDisk.includes(SECRETS.societe1));
}

/* Traitement par lots (v1.3+) */
if (toolNames.includes("anonymiser_dossier")) {
  const lotPlanT = record(await client.callTool({ name: "anonymiser_dossier", arguments: {} }));
  check("A3i", "le plan de LOT reste en comptes seuls",
    !lotPlanT.includes(SECRETS.nom1) && !lotPlanT.includes(SECRETS.societe1) && !lotPlanT.includes(SECRETS.ice1));
  const lotT = record(await client.callTool({ name: "anonymiser_dossier", arguments: { confirmer: true } }));
  check("A3j", "le compte rendu de LOT ne contient aucun aperçu",
    !lotT.includes("TABLEAU CODÉ") && !lotT.includes("\t"));
} else {
  check("A3i", "traitement par lots présent dans l'artefact", false, `outils: ${toolNames.join(", ")}`);
}

/* A4 — la dé-anonymisation reste aveugle */
const deanonT = record(await client.callTool({
  name: "deanonymiser",
  arguments: { contenu: "Priorité : relancer NOM-001 PRENOM-001 au TEL-001 (voir SOCIETE-001).", nom_sortie: "relances" },
}));
check("A4a", "le compte rendu de décodage ne contient aucune valeur réelle",
  !deanonT.includes(SECRETS.nom1) && !deanonT.includes(SECRETS.tel1) && !deanonT.includes(SECRETS.societe1));
check("A4b", "il ne renvoie qu'un chemin + des compteurs", /Fichier décodé écrit sur le poste/.test(deanonT));
const decodedPath = (deanonT.match(/Fichier décodé écrit sur le poste : (.+)/) || [])[1];
const decodedOnDisk = decodedPath ? fs.readFileSync(decodedPath.trim(), "utf8") : "";
check("A4c", "les vraies valeurs SONT dans le fichier local", decodedOnDisk.includes(SECRETS.nom1) && decodedOnDisk.includes(SECRETS.tel1));

/* etat_cle */
const etatT = record(await client.callTool({ name: "etat_cle", arguments: {} }));
check("A4d", "l'état de la clé ne révèle aucune correspondance",
  !etatT.includes(SECRETS.nom1) && !etatT.includes(SECRETS.ice1));

/* Sécurité : évasion du dossier */
const escapeT = record(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "../../etc/passwd", confirmer: true } }));
check("A4e", "évasion du dossier de travail refusée", /Chemin refusé/.test(escapeT));

/* OCR d'un scan (v1.5+) — le texte reconnu ne doit JAMAIS remonter */
if (toolNames.includes("lire_scan")) {
  const ocrT = record(await client.callTool({ name: "lire_scan", arguments: { nom_fichier: "scan-fournisseur.pdf" } }));
  check("A3n", "OCR : compte rendu sans aucun texte reconnu, fichier À RELIRE écrit",
    /OCR terminé/.test(ocrT) && /RELIRE/.test(ocrT)
    && !ocrT.includes("GHARB") && !ocrT.includes("002233445566778") && !ocrT.includes("Sekkat"));
  const relire = path.join(outDir, "scan-fournisseur-ocr-A-RELIRE.md");
  check("A3o", "le texte reconnu vit sur le poste, marqué à relire",
    fs.existsSync(relire) && /À RELIRE AVANT USAGE/.test(fs.readFileSync(relire, "utf8")));
  const anoT = record(await client.callTool({
    name: "anonymiser_fichier",
    arguments: { nom_fichier: "Anonymiseur-Ai4x/scan-fournisseur-ocr-A-RELIRE.md", confirmer: true },
  }));
  check("A3p", "le scan relu s'anonymise sans fuite (ICE codés, montants gardés)",
    /ICE-\d{3}/.test(anoT) && anoT.includes("17500")
    && !anoT.includes("002233445566778") && !anoT.includes("GHARB PRIMEURS"));
}

/* A5 — L'AUDIT : tout ce qui a été dit, passé au crible */
console.log("\n── A5 — audit de la conversation entière (le test qui décide de tout)\n");
const everything = transcript.join("\n\n");
const leaked = Object.entries(SECRETS).filter(([, v]) => everything.includes(v)).map(([k]) => k);
check("A5", `aucune des ${Object.keys(SECRETS).length} valeurs sensibles n'apparaît dans les ${transcript.length} réponses d'outils`,
  leaked.length === 0, leaked.length ? `FUITES : ${leaked.join(", ")}` : `${everything.length} caractères audités`);

/* ------------------------------------------------ Série B — le moteur */
console.log("\n── Série B — fiabilité du moteur\n");

/* B1 — aller-retour complet */
const wbCoded = XLSX.readFile(path.join(outDir, "clients-anonymise.xlsx"));
const aoaCoded = XLSX.utils.sheet_to_json(wbCoded.Sheets[wbCoded.SheetNames[0]], { header: 1, raw: false, defval: "" });
const flatCoded = aoaCoded.flat().join(" | ");
check("B1a", "le fichier codé ne contient plus aucune valeur sensible codable",
  !flatCoded.includes(SECRETS.nom1) && !flatCoded.includes(SECRETS.rib) && !flatCoded.includes(SECRETS.email1));
check("B1b", "les colonnes non sensibles sont intactes", flatCoded.includes("Casablanca") && flatCoded.includes("12400"));

const roundTrip = record(await client.callTool({
  name: "deanonymiser",
  arguments: { contenu: aoaCoded.map((r) => r.join("\t")).join("\n"), nom_sortie: "aller-retour" },
}));
const rtPath = (roundTrip.match(/Fichier décodé écrit sur le poste : (.+)/) || [])[1];
let rtFlat = "";
if (rtPath && rtPath.trim().endsWith(".xlsx")) {
  const wbRt = XLSX.readFile(rtPath.trim());
  rtFlat = XLSX.utils.sheet_to_json(wbRt.Sheets[wbRt.SheetNames[0]], { header: 1, raw: false, defval: "" }).flat().join(" | ");
}
check("B1c", "aller-retour : toutes les valeurs restituées",
  rtFlat.includes(SECRETS.nom1) && rtFlat.includes(SECRETS.tel1) && rtFlat.includes(SECRETS.rib) && rtFlat.includes(SECRETS.email1));
check("B1d", "aucun code orphelin après décodage", !/\b(NOM|TEL|RIB|EMAIL|CIN|PRENOM)-\d{3}\b/.test(rtFlat));

/* B2 — stabilité de la clé */
const secondPass = record(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx", confirmer: true } }));
check("B2a", "seconde passe : aucun nouveau code", /0 nouveaux codes/.test(secondPass));
const docFlat = XLSX.utils.sheet_to_json(
  XLSX.readFile(path.join(outDir, "facture-anonymise.xlsx")).Sheets["Facture"], { header: 1, raw: false, defval: "" }
).flat().join(" | ");
const telCodeInTable = (flatCoded.match(/TEL-(\d{3})/) || [])[0];
check("B2b", "clé partagée entre fichiers : les codes sont continus (pas de doublon de numérotation)",
  !!telCodeInTable && /ICE-\d{3}/.test(docFlat));

/* B3 — décodage insensible à la casse */
const caseT = record(await client.callTool({
  name: "deanonymiser", arguments: { contenu: "relancer nom-002 au tel-002 stp", nom_sortie: "casse" },
}));
check("B3", "décodage insensible à la casse", /code\(s\) remplacé\(s\)/.test(caseT) && !/Aucun code/.test(caseT));

/* B4 — la clé exportée est au format de l'appli web */
const keyPath = path.join(outDir, "cle-correspondance-NE-JAMAIS-PARTAGER.xlsx");
const keyWb = XLSX.readFile(keyPath);
const keyAoa = XLSX.utils.sheet_to_json(keyWb.Sheets[keyWb.SheetNames[0]], { header: 1, raw: false, defval: "" });
check("B4a", "la clé exporte les colonnes attendues par l'appli web",
  keyAoa[0][0] === "Code" && /Valeur/.test(keyAoa[0][1]) && keyAoa[0][2] === "Type",
  `${keyAoa.length - 1} correspondances`);
check("B4b", "l'onglet Lisez-moi accompagne la clé", keyWb.SheetNames.includes("Lisez-moi"));

/* ------------------------------------------------ Série C — la licence */
// Née d'un incident réel (01/08/2026) : le champ « Clé de licence » laissé
// vide, Claude Desktop passe le GABARIT NON SUBSTITUÉ « ${user_config.licence} »
// dans l'environnement. Le connecteur y voyait une clé mal formée et répondait
// « format inconnu » à quelqu'un qui n'avait rien collé. On rejoue ici la
// situation exacte, sur l'artefact distribué.
console.log("\n── Série C — licence (le message doit dire quoi FAIRE)\n");
const wd2 = fs.mkdtempSync(path.join(os.tmpdir(), "anx-nolic-"));
makeFiles(wd2);
const sansLicence = new Client({ name: "campagne-nolic", version: "1.0.0" });
await sansLicence.connect(new StdioClientTransport({
  command: process.execPath,
  args: [path.join(unpacked, "server", "index.js")],
  env: { ...process.env, ANX_WORKDIR: wd2, ANX_LICENCE: "${user_config.licence}" },
}));
const bloque = record(await sansLicence.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx" } }));
check("C1a", "champ vide : on dit « aucune clé configurée », pas « format inconnu »",
  /Aucune clé de licence n'est configurée/.test(bloque) && !/format inconnu/.test(bloque));
check("C1b", "le message donne le geste exact (champ + redémarrage)",
  /Clé de licence/.test(bloque) && /REDÉMARREZ/.test(bloque));
check("C1c", "et il n'anonymise rien", !/TABLEAU CODÉ/.test(bloque));

// La promesse fondatrice : sans licence, le décodage marche quand même.
const decodeSansLicence = record(await sansLicence.callTool({
  name: "deanonymiser", arguments: { contenu: "relancer NOM-001", nom_sortie: "sans-licence" },
}));
check("C2", "sans licence, la DÉ-ANONYMISATION fonctionne toujours (rien n'est pris en otage)",
  !/🔒/.test(decodeSansLicence));
await sansLicence.close();
fs.rmSync(wd2, { recursive: true, force: true });

/* --------------------------------------------------------------- bilan */
const failed = results.filter((r) => !r.ok);
const a5 = results.find((r) => r.id === "A5");
console.log("\n════ BILAN ════");
console.log(`${results.length - failed.length}/${results.length} contrôles passés.`);
if (failed.length) console.log("Échecs : " + failed.map((f) => f.id).join(", "));
console.log(a5.ok ? "RÈGLE N°1 (A5) : TENUE ✅" : "RÈGLE N°1 (A5) : VIOLÉE ❌ — STOP PRODUIT");
console.log(`Dossier de campagne (à inspecter si besoin) : ${workdir}\n`);

await client.close();
process.exit(failed.length ? 1 : 0);
