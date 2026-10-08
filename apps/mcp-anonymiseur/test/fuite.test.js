// CHASSE AUX FUITES (v2.0) — on cache des valeurs réelles partout où une
// donnée peut se glisser (nom de fichier, nom d'onglet, en-tête, colonne
// « Client » non reconnue, nom en minuscules, nom derrière « Maître »,
// email, IBAN, n° de dossier…), on appelle TOUS les outils par le vrai
// protocole MCP, et on vérifie qu'AUCUNE de ces valeurs n'apparaît dans
// quoi que ce soit que Claude reçoit. Ce test est la définition exécutable
// de la promesse « Claude ne lit aucune donnée ». Ne jamais l'affaiblir :
// s'il casse, c'est le code qu'on corrige.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import * as XLSX from "xlsx";
import * as _fs from "node:fs";
import { writeMinimalPdf } from "./util-pdf.mjs";
import { b64urlEncode } from "../server/licence.js";
XLSX.set_fs(_fs);

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");

function privateKey() {
  try {
    const f = process.env.NANOMIZER_PRIVATE_KEY_FILE ||
      path.join(os.homedir(), "Desktop", "nanomizer-cle-privee-NE-JAMAIS-PARTAGER.txt");
    const raw = fs.readFileSync(f, "utf8").split("\n").map((l) => l.trim())
      .filter((l) => l.length > 40 && /^[A-Za-z0-9+/=]+$/.test(l)).pop();
    return crypto.createPrivateKey({ key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8" });
  } catch { return null; }
}
const KEY = privateKey();
const skip = KEY ? false : "clé privée absente de ce poste";
function licenceAVie() {
  const body = b64urlEncode(Buffer.from(JSON.stringify({ v: 1, org: "Suite fuites", seats: 1, iat: "2026-09-18", exp: "9999-12-31", life: true }), "utf8"));
  return `NANO1.${body}.${b64urlEncode(crypto.sign(null, Buffer.from(body), KEY))}`;
}

/* Les valeurs qui ne doivent JAMAIS sortir. Comparaison insensible à la
   casse et aux accents. */
const CANARIES = [
  "Benali", "Karim", "Rousseau", "Tazi", "Lefevre", "Lefèvre", "Sophie", "Dupont", "Atlas Negoce", "Moreau",
  "Maghreb Logistique", "Yassine", "Amrani", "El Idrissi", "Chraibi",
  "06 12 34 56 78", "0612345678", "p.rousseau@", "moreau-transports", "FR76", "3000 6000 0112",
  "2024/01234", "2023/99812", "BE123456", "12 rue des Lilas",
  // Relecture adverse du 18/09/2026.
  "Lahlou", "Mehdi", "Kettani", "youssef.tazi@gmail.com", "0661234567", "612345678", "(0)6 12",
];
// Mots des canaris qui sont AUSSI des mots courants : cherchés avec leur
// majuscule seulement (« blanc » peut légitimement apparaître, « Blanc » non).
const CANARIES_CASED = ["Blanc", "Petit", "Pierre", "Moulin", "MOULIN", "Boulanger", "BOULANGER", "Henry", "Robin",
  "GERMAIN", "Germain", "Poulain", "Jacques"];

const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

let client;
let workdir;
const outputs = [];

async function call(name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const t = res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
  outputs.push({ name, args, t });
  return { res, t };
}

function assertNoLeak(label, s) {
  const f = fold(s);
  for (const c of CANARIES) assert.ok(!f.includes(fold(c)), `FUITE « ${c} » dans ${label} :\n${s.slice(0, 3000)}`);
  for (const c of CANARIES_CASED) {
    assert.ok(!new RegExp(`(?<![\\p{L}])${c}(?![\\p{L}])`, "u").test(s), `FUITE « ${c} » dans ${label} :\n${s.slice(0, 3000)}`);
  }
}

before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-fuite-"));

  // 1. Un tableau dont le NOM DE FICHIER, le NOM D'ONGLET et une colonne
  //    « Client » (sans le mot « nom ») portent des noms.
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Client", "N° dossier", "Commentaires", "Honoraires"],
    ["Karim Benali", "RG 2024/01234", "Rappeler Mme Tazi au 06 12 34 56 78", 4500],
    ["Sophie Lefèvre", "RG 2023/99812", "Voir avec Maître Blanc, CIN BE123456", 3200],
    ["Transports Moreau & Fils SAS", "RG 2022/55555", "rdv avec pierre rousseau lundi", 1800],
  ]), "Benali");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    // Tableau croisé : les CLIENTS sont les en-têtes.
    ["Mois", "Benali", "Tazi", "Chraibi"],
    ["Janvier", 1200, 800, 450],
    ["Février", 900, 1100, 300],
  ]), "Suivi Tazi");
  XLSX.writeFile(wb, path.join(workdir, "Client Rousseau.xlsx"));

  // 2. Des notes en texte libre, noms en minuscules compris.
  fs.writeFileSync(path.join(workdir, "notes Yassine Amrani.md"),
    "# Notes du dossier\n\n" +
    "Rendez-vous avec pierre rousseau chez Transports Moreau & Fils SAS.\n" +
    "Son email : p.rousseau@moreau-transports.fr, son IBAN FR76 3000 6000 0112 3456 7890 189.\n" +
    "M. Petit a confirmé. Le témoin, El Idrissi, habite 12 rue des Lilas.\n" +
    "La société Maghreb Logistique est la partie adverse.\n", "utf8");

  // 3. Des conclusions en PDF natif (générateur ASCII).
  writeMinimalPdf(path.join(workdir, "Conclusions Dupont.pdf"), [
    "CONCLUSIONS EN REPONSE",
    "POUR : Madame Sophie Lefevre, ayant pour avocat Maitre Antoine Dupont.",
    "CONTRE : La societe Atlas Negoce SARL, prise en la personne de son gerant.",
    "Attendu que Madame Lefevre a ete licenciee par M. Karim Benali le 3 janvier 2022 ;",
    "Que la Cour de cassation exige une faute grave ;",
    "PAR CES MOTIFS, condamner la societe Atlas Negoce SARL a payer 45000 euros.",
  ]);

  // 4. Relecture adverse : des noms qui sont AUSSI des mots, partout ; une
  //    formule, un lien, un commentaire et un numéro stocké en nombre.
  const wb2 = XLSX.utils.book_new();
  const ws2 = XLSX.utils.aoa_to_sheet([
    ["Expert", "Contact", "Téléphone", "Honoraires"],
    ["Henry", "Robin", 612345678, 900],
    ["Voir Jacques Moulin", "Contact", "", 1200],
  ]);
  ws2.B3.f = 'HYPERLINK("mailto:youssef.tazi@gmail.com","Contact")';
  ws2.B3.l = { Target: "mailto:youssef.tazi@gmail.com" };
  ws2.D3.c = [{ a: "x", t: "Client Youssef Tazi, joignable au 0661234567" }];
  XLSX.utils.book_append_sheet(wb2, ws2, "MOULIN Karim");
  XLSX.writeFile(wb2, path.join(workdir, "Affaire MOULIN c. BOULANGER.xlsx"));
  fs.writeFileSync(path.join(workdir, "Conclusions Barre.md"),
    "Affaire MOULIN c/ BOULANGER\n\nJacques Moulin a signé le bail. L'expert GERMAIN a rendu son rapport (Boulanger).\n" +
    "- Poulain\n- Robin\nLe Président Henry a entendu les parties. Tél : +33 (0)6 12 34 56 78.\n", "utf8");
  // 5. Un fichier illisible dont le nom porte un client (le message d'erreur
  //    citait le chemin complet).
  const locked = path.join(workdir, "Notes Lahlou Mehdi.md");
  fs.writeFileSync(locked, "Maître Kettani\n", "utf8");
  fs.chmodSync(locked, 0o000);

  client = new Client({ name: "fuite", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: KEY ? licenceAVie() : "" },
  }));
});

after(async () => {
  await client.close();
  try { fs.chmodSync(path.join(workdir, "Notes Lahlou Mehdi.md"), 0o600); } catch {}
  fs.rmSync(workdir, { recursive: true, force: true });
});

test("chaque outil, chaque chemin : aucune valeur réelle ne sort", { skip }, async () => {
  // Lister : les noms de fichiers sont masqués, chaque fichier a un repère.
  const { t: liste } = await call("lister_fichiers");
  const handles = [...liste.matchAll(/\[(F-[A-Z2-7]{5})\]/g)].map((m) => m[1]);
  assert.equal(handles.length, 6, `6 repères attendus :\n${liste}`);

  for (const h of handles) {
    await call("anonymiser_fichier", { nom_fichier: h });                     // plan
    await call("anonymiser_fichier", { nom_fichier: h, confirmer: true });    // exécution
  }
  // Deuxième onglet (tableau croisé : noms en EN-TÊTES), désigné par son numéro.
  const xlsxHandle = handles.find((h) => liste.includes(`[${h}] Client`));
  assert.ok(xlsxHandle, `repère du classeur introuvable :\n${liste}`);
  await call("anonymiser_fichier", { nom_fichier: xlsxHandle, onglet: "2" });
  await call("anonymiser_fichier", { nom_fichier: xlsxHandle, onglet: "2", confirmer: true });
  // Chemins d'erreur : onglet introuvable (liste les onglets), fichier introuvable.
  await call("anonymiser_fichier", { nom_fichier: xlsxHandle, onglet: "Onglet inexistant" });
  await call("anonymiser_fichier", { nom_fichier: "F-AAAAA" });
  // L'utilisateur tape lui-même le vrai nom : l'outil l'accepte, mais ne le répète pas.
  await call("anonymiser_fichier", { nom_fichier: "Client Rousseau.xlsx" });

  await call("anonymiser_dossier");
  await call("anonymiser_dossier", { confirmer: true });
  // Le filtre ne doit pas servir d'oracle sur les vrais noms de fichiers.
  const { res: oracle } = await call("anonymiser_dossier", { motif: "lahlou" });
  assert.ok(oracle.isError, "le filtre a vu le vrai nom du fichier");
  await call("lire_scan", { nom_fichier: handles[0] });
  await call("etat_cle");
  await call("verifier_confinement");
  await call("deanonymiser", { contenu: "Relancer NOM-001 et PRENOM-001 au TEL-001.", nom_sortie: "relance" });

  assert.ok(outputs.length >= 15);
  for (const o of outputs) assertNoLeak(`${o.name} ${JSON.stringify(o.args)}`, o.t);
});

test("les fichiers produits pour l'IA ne contiennent aucune valeur réelle, ni dans leur nom", { skip }, () => {
  const out = path.join(workdir, "Anonymiseur-Ai4x");
  const produced = fs.readdirSync(out).filter((n) => /-anonymise\.(xlsx|md)$/.test(n) || /^rapport-lot-/.test(n));
  assert.ok(produced.length >= 5, `sorties attendues : ${produced.join(", ")}`);
  for (const n of produced) {
    assertNoLeak(`nom de fichier ${n}`, n);
    const p = path.join(out, n);
    let content;
    if (n.endsWith(".xlsx")) {
      const wb = XLSX.readFile(p);
      content = wb.SheetNames.join(" | ") + "\n" + wb.SheetNames
        .map((s) => XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, raw: false, defval: "" }).flat().join(" | "))
        .join("\n");
    } else {
      content = fs.readFileSync(p, "utf8");
    }
    assertNoLeak(`contenu de ${n}`, content);
  }
});

test("…mais le travail reste possible : montants, dates et langage courant lisibles", { skip }, () => {
  const all = outputs.map((o) => o.t).join("\n");
  assert.match(all, /4500/);
  assert.match(all, /Rappeler Mme/);           // le titre reste, le nom part
  assert.match(all, /Cour de cassation/);
  assert.match(all, /45000 euros/);
  // Le décodage, lui, rend bien les vraies valeurs — sur le disque.
  const dec = outputs.find((o) => o.name === "deanonymiser").t;
  const m = dec.match(/(Anonymiseur-Ai4x\/\S+)/);
  assert.ok(m, dec);
  const decoded = fs.readFileSync(path.join(workdir, m[1]), "utf8");
  // (L'ordre des codes dépend de l'ordre de traitement : on vérifie que les
  // trois codes sont redevenus des valeurs, et qu'aucun code ne reste.)
  assert.ok(!/\b(?:NOM|PRENOM|TEL)-\d{3}\b/.test(decoded), `codes non décodés : ${decoded}`);
  assert.ok(CANARIES.concat(CANARIES_CASED).some((c) => fold(decoded).includes(fold(c))), `décodage vide : ${decoded}`);
});

test("la clé et les résultats décodés ne passent jamais par l'IA, même demandés", { skip }, async () => {
  for (const f of ["Anonymiseur-Ai4x/cle-correspondance-NE-JAMAIS-PARTAGER.xlsx", "Anonymiseur-Ai4x/cle-de-session.json"]) {
    const { res, t } = await call("anonymiser_fichier", { nom_fichier: f });
    assert.ok(res.isError, `${f} aurait dû être refusé`);
    assert.match(t, /Fichier refusé/);
  }
  const dec = fs.readdirSync(path.join(workdir, "Anonymiseur-Ai4x")).find((n) => /-decode-/.test(n));
  const { res } = await call("anonymiser_fichier", { nom_fichier: `Anonymiseur-Ai4x/${dec}` });
  assert.ok(res.isError, "un résultat décodé ne doit pas repasser par l'IA");
});

test("la clé est lisible par le seul compte de l'utilisateur", { skip: skip || process.platform === "win32" }, () => {
  const out = path.join(workdir, "Anonymiseur-Ai4x");
  for (const n of ["cle-de-session.json", "cle-correspondance-NE-JAMAIS-PARTAGER.xlsx"]) {
    const mode = fs.statSync(path.join(out, n)).mode & 0o777;
    assert.equal(mode & 0o077, 0, `${n} est lisible par d'autres comptes (${mode.toString(8)})`);
  }
});

test("une clé corrompue n'est JAMAIS écrasée par une clé vierge", { skip }, async () => {
  const keyPath = path.join(workdir, "Anonymiseur-Ai4x", "cle-de-session.json");
  const before = fs.readFileSync(keyPath, "utf8");
  fs.writeFileSync(keyPath, before.slice(0, 40), "utf8");            // clé tronquée
  // Un fichier LISIBLE (le dossier contient aussi un fichier verrouillé).
  const h = (outputs[0].t.match(/\[(F-[A-Z2-7]{5})\] Client/) || [])[1];
  assert.ok(h, "repère du classeur introuvable");
  const { res, t } = await call("anonymiser_fichier", { nom_fichier: h, confirmer: true });
  assert.ok(res.isError, "l'anonymisation aurait dû s'arrêter");
  assert.match(t, /illisible/);
  assert.match(t, /RIEN n'a été écrit/);
  assert.equal(fs.readFileSync(keyPath, "utf8"), before.slice(0, 40), "la clé corrompue a été écrasée");
  assert.ok(fs.existsSync(path.join(workdir, "Anonymiseur-Ai4x", "cle-de-session.sauvegarde.json")), "pas de sauvegarde");
  fs.writeFileSync(keyPath, before, "utf8");
});
