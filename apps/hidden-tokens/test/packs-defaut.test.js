// LES PACKS PAR DÉFAUT (v2.25) — un dossier qui n'a rien choisi reçoit
// telecom-ma, juridique-fr, rh-paie, banque-assurance et expertise-comptable ;
// un choix du dossier (« packs », même []) ou de la politique signée
// l'emporte. Le vocabulaire des packs reste lisible dans l'aperçu.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PACKS_PAR_DEFAUT, packsParDefaut, developperPacks } from "../server/packs.js";
import { compilerRegles, normaliser } from "../server/regles.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ht-packs-defaut-"));

test("packsParDefaut : les cinq packs mesurés quand personne n'a choisi, aucun sinon", () => {
  assert.deepEqual([...PACKS_PAR_DEFAUT], ["telecom-ma", "juridique-fr", "rh-paie", "banque-assurance", "expertise-comptable"]);
  assert.ok(!PACKS_PAR_DEFAUT.includes("sante"), "santé reste à activer : ses motifs corrompent encore des sorties");
  const d = packsParDefaut();
  assert.deepEqual(d.ids, [...PACKS_PAR_DEFAUT]);
  assert.deepEqual(d.erreurs, []);
  assert.equal(new Set(d.regles.map((r) => r.pack)).size, PACKS_PAR_DEFAUT.length);
  for (const choix of [{ dossierDeclare: true }, { politiqueDeclare: true }, { dossierDeclare: true, politiqueDeclare: true }]) {
    const x = packsParDefaut(choix);
    assert.deepEqual(x.ids, []);
    assert.equal(x.regles.length, 0);
  }
});

test("le plan nomme les packs par défaut ; leur vocabulaire seul est « lisible en aperçu »", () => {
  const d = packsParDefaut();
  const maison = { id: "D-1", type: "laisser_en_clair", libelle: "Termes du cabinet", termes: ["Cour de cassation", "Maître Exemple"] };
  const c = compilerRegles({ dossier: [...d.regles, maison], entetes: d.entetes, parDefaut: d.ids });
  assert.match(c.decrire(), /pack Banque et assurance \(par défaut\)/);
  assert.match(c.decrire(), /pack Expertise comptable — Maroc et France \(par défaut\)/);
  assert.ok(c.vocabulaire.has(normaliser("EBITDA")), "terme de pack");
  assert.ok(!c.vocabulaire.has(normaliser("Cour de cassation")), "aussi laissé en clair par le dossier : peut être un nom, reste masqué en aperçu");
  assert.ok(!c.vocabulaire.has(normaliser("Maître Exemple")));
  const choisi = compilerRegles({ dossier: developperPacks(["sante"]).regles });
  assert.doesNotMatch(choisi.decrire(), /par défaut/);
});

/* --------------------------------------------------------- de bout en bout */

const TEXTE = "Opposition : carte n° 4532 0151 1283 0366, CVV 412, LCN n° 3349201 impayée, véhicule 12345-A-6. " +
  "Que la Cour de cassation exige une faute grave ; le DSO et l'EBITDA du trimestre sont au reporting.\n";

async function connecteur(root, { reglages, enrolement = "", texte = TEXTE } = {}) {
  const { Client } = await import("@modelcontextprotocol/client");
  const { StdioClientTransport } = await import("@modelcontextprotocol/client/stdio");
  const { mint } = await import("./licence-test.mjs");
  const workdir = path.join(root, "dossier");
  fs.mkdirSync(path.join(workdir, "Hidden-Tokens"), { recursive: true });
  if (reglages !== undefined) fs.writeFileSync(path.join(workdir, "Hidden-Tokens", "reglages.json"), JSON.stringify(reglages));
  fs.writeFileSync(path.join(workdir, "note.md"), texte);
  const client = new Client({ name: "packs-defaut", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Banque Test", seats: 20, iat: "2026-10-20", exp: "9999-12-31", life: true }),
      ANX_TEAM_DIR: "", ANX_REGISTRE_DIR: "", ANX_ENROLEMENT: enrolement, ANX_SENTINELLE: "non", NANOMIZER_SENTINELLE_DIR: path.join(root, ".absente") },
  }));
  try {
    const appel = async (args) => (await client.callTool({ name: "anonymiser_fichier", arguments: args })).content.map((c) => c.text || "").join("\n");
    const plan = await appel({ nom_fichier: "note.md" });
    const fait = await appel({ nom_fichier: "note.md", confirmer: true });
    const sortie = fs.readdirSync(path.join(workdir, "Hidden-Tokens")).find((n) => /-anonymise\.md$/.test(n));
    assert.ok(sortie, `pas de copie codée :\n${plan}\n${fait}`);
    return { plan, fait, copie: fs.readFileSync(path.join(workdir, "Hidden-Tokens", sortie), "utf8") };
  } finally { await client.close(); }
}

test("dossier sans réglages : les packs par défaut codent CVV, LCN et plaque ; le vocabulaire reste lisible", async () => {
  const root = tmp();
  try {
    const { plan, fait, copie } = await connecteur(root);
    assert.match(plan, /pack Banque et assurance \(par défaut\)/, plan);
    for (const v of ["412", "3349201", "12345-A-6", "0151 1283"]) assert.ok(!copie.includes(v), `« ${v} » a fui :\n${copie}`);
    for (const p of ["CVV", "LCN", "IMMAT", "CARTE"]) assert.match(copie, new RegExp(`\\b${p}-\\d{3}\\b`), `${p} :\n${copie}`);
    // L'aperçu montre la ligne : « Cour de cassation », DSO, EBITDA sont du vocabulaire de pack.
    assert.match(fait, /Que la Cour de cassation exige une faute grave/, fait);
    assert.match(fait, /DSO et l'EBITDA/, fait);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("réglages sans « packs » (chiffres seulement) : les packs par défaut s'appliquent aussi", async () => {
  const root = tmp();
  try {
    const { plan, copie } = await connecteur(root, { reglages: { chiffres: "clair" } });
    assert.match(plan, /\(par défaut\)/, plan);
    assert.match(copie, /\bCVV-\d{3}\b/, copie);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("« packs »: [] — le dossier a choisi : aucun pack d'office", async () => {
  const root = tmp();
  try {
    const { plan, copie } = await connecteur(root, { reglages: { packs: [] } });
    assert.doesNotMatch(plan, /par défaut/, plan);
    assert.doesNotMatch(copie, /\b(?:CVV|LCN)-\d{3}\b/, copie);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("« packs »: [\"sante\"] — le choix du dossier remplace les packs par défaut", async () => {
  const root = tmp();
  try {
    const { plan, copie } = await connecteur(root, { reglages: { packs: ["sante"] } });
    assert.match(plan, /pack Santé/, plan);
    assert.doesNotMatch(plan, /par défaut/, plan);
    assert.doesNotMatch(copie, /\b(?:CVV|LCN)-\d{3}\b/, copie);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("politique signée qui choisit ses packs : aucun pack par défaut au niveau du dossier", async () => {
  const { creerCabinet, ouvrirCabinet } = await import("../../nanomizer-admin/lib/cabinet.js");
  const { creerEnrolement, ecrireEnrolement } = await import("../../nanomizer-admin/lib/enrolement.js");
  const { publierPolitique, modeleSource } = await import("../../nanomizer-admin/lib/politique.js");
  const root = tmp(), partage = path.join(root, "partage");
  fs.mkdirSync(partage);
  try {
    const cabinet = creerCabinet({ nom: "Banque Test", phrase: "correct cheval pile agrafe", cout: { N: 2 ** 10, r: 8, p: 1 } });
    const ouvert = ouvrirCabinet(cabinet, "correct cheval pile agrafe");
    const enr = creerEnrolement(cabinet, ouvert, { utilisateur: "agent@banque-test.ma", dossierPartage: partage });
    const fichierEnr = ecrireEnrolement(root, enr);
    const source = modeleSource();
    source.emise_par = "admin@banque-test.ma"; source.equipes[0].membres = ["agent@banque-test.ma"]; source.equipes[0].responsables = ["admin@banque-test.ma"];
    source.alertes.admin_technique = ["it@banque-test.ma"]; source.regles[0].noms = ["Société Fictive Sans Rapport"];
    source.packs = ["telecom-ma"];
    publierPolitique({ source, cabinet, ouvert, dossierPartage: partage, dossierArchives: path.join(root, "archives") });
    // Sans n° de carte : la politique modèle interdit les cartes (R-010).
    const { plan, copie } = await connecteur(root, { enrolement: fichierEnr, texte: "Relance : CVV 412 communiqué, LCN n° 3349201 impayée, véhicule 12345-A-6.\n" });
    assert.match(plan, /pack Télécom — opérateur marocain/, plan);
    assert.doesNotMatch(plan, /par défaut/, plan);
    assert.doesNotMatch(copie, /\b(?:CVV|LCN)-\d{3}\b/, copie);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
