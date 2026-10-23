// RÈGLES DE L'ORGANISATION (v2.18) — ce que l'entreprise décide elle-même :
// termes à toujours coder, motifs maison, termes à laisser en clair. Critères
// d'acceptation 1 à 5 et 7 de SPEC-REGLES-ORGANISATION.md (le 6, politique
// signée, est dans politique.test.js).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { mint } from "./licence-test.mjs";
import { validerRegles, compilerRegles, lireReglesDossier, verifierMotif, estIdentifiant, prefixesReserves } from "../server/regles.js";
import { strictCode, codeSrc, CODE_SRC } from "../server/verrou.js";
import { newCodebook, typeById, PREFIX_LABEL } from "../server/engine.js";
import { guardText } from "../server/sortie.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/* Les règles d'un cabinet fictif : un nom de code fait de mots du
   dictionnaire (le verrou seul le laisserait passer), un n° d'affaire maison,
   le nom du cabinet à garder lisible. */
function reglesDossier() {
  return [
    { id: "D-001", type: "toujours_coder", libelle: "Noms de code des opérations", prefixe: "operation", termes: ["Horizon Bleu", "Faucon"] },
    { id: "D-002", type: "motif", libelle: "Numéros d'affaire", prefixe: "AFFAIRE", motif: "AFF[ -]?\\d{2}/\\d{4}", exemple: "AFF 26/0412" },
    { id: "D-003", type: "laisser_en_clair", libelle: "Le cabinet et ses associés", termes: ["Cabinet Exemple", "Maître Durand"] },
  ];
}

test("validerRegles : les trois types compilent, le préfixe est mis en majuscules, les doublons de termes tombent", () => {
  const liste = reglesDossier();
  liste[0].termes.push("horizon bleu");
  const { regles, erreurs } = validerRegles(liste);
  assert.deepEqual(erreurs, []);
  assert.equal(regles.length, 3);
  assert.equal(regles[0].prefixe, "OPERATION");
  assert.deepEqual(regles[0].termes, ["Horizon Bleu", "Faucon"]);
  assert.equal(regles[1].exemple, "AFF 26/0412");
});

test("validerRegles : une règle fautive est écartée, les autres s'appliquent, et le message ne cite jamais une valeur (critère 5)", () => {
  const liste = [
    ...reglesDossier(),
    { id: "D-004", type: "motif", libelle: "Catastrophe", prefixe: "KO", motif: "(a+)+", exemple: "aaa" },
    { id: "D-005", type: "toujours_coder", libelle: "Préfixe pris", prefixe: "NOM", termes: ["Quelqu'un"] },
    { id: "D-006", type: "toujours_coder", libelle: "Préfixe de politique", prefixe: "INTERDIT", termes: ["Quelqu'un"] },
    { id: "D-007", type: "laisser_en_clair", libelle: "Un email", termes: ["Cabinet Exemple", "contact@cabinet-exemple.fr"] },
    { id: "D-008", type: "laisser_en_clair", libelle: "Un téléphone", termes: ["06 61 23 45 67"] },
    { id: "D-009", type: "motif", libelle: "Exemple absent", prefixe: "SANS", motif: "X\\d+" },
    { id: "D-010", type: "motif", libelle: "Exemple raté", prefixe: "RATE", motif: "X\\d+", exemple: "Y12" },
    { id: "D-011", type: "motif", libelle: "Vide", prefixe: "VIDE", motif: "a*", exemple: "aaa" },
    { id: "D-001", type: "toujours_coder", libelle: "Doublon", prefixe: "DBL", termes: ["Autre"] },
    { id: "R-001", type: "toujours_coder", libelle: "Mauvais niveau", prefixe: "NIV", termes: ["Autre"] },
    { id: "D-012", type: "inconnu", libelle: "Type", prefixe: "T", termes: ["Autre"] },
    { id: "D-013", type: "toujours_coder", libelle: "Trop court", prefixe: "COURT", termes: ["ab"] },
  ];
  const { regles, erreurs } = validerRegles(liste);
  assert.deepEqual(regles.map((r) => r.id), ["D-001", "D-002", "D-003"]);
  assert.equal(erreurs.length, 12);
  const texte = erreurs.join("\n");
  for (const id of ["D-004", "D-005", "D-006", "D-007", "D-008", "D-009", "D-010", "D-011", "D-012", "D-013", "R-001"]) assert.match(texte, new RegExp(id), id);
  assert.match(texte, /quantificateur imbriqué/);
  assert.match(texte, /« NOM » réservé/);
  assert.match(texte, /« INTERDIT » réservé/);
  assert.match(texte, /D-007 : terme n°2 : a la forme d'un identifiant/);
  assert.match(texte, /ne reconnaît pas son exemple/);
  assert.match(texte, /accepte le vide/);
  assert.match(texte, /id en double/);
  for (const v of ["contact@", "cabinet-exemple", "06 61", "Quelqu'un", "Autre"]) assert.ok(!texte.includes(v), `valeur citée : ${v}`);
});

test("verifierMotif et estIdentifiant : les garde-fous", () => {
  assert.equal(verifierMotif("AFF[ -]?\\d{2}/\\d{4}").ok, true);
  assert.equal(verifierMotif("(ab|cd)+e").ok, true);
  assert.equal(verifierMotif("(a+)+").ok, false);
  assert.equal(verifierMotif("(\\d{2,})*x").ok, false);
  assert.equal(verifierMotif("(a)\\1").ok, false);
  assert.equal(verifierMotif("[").ok, false);
  assert.equal(verifierMotif("x".repeat(201)).ok, false);
  assert.equal(verifierMotif(".*").ok, false);
  assert.equal(estIdentifiant("Cabinet Exemple"), false);
  assert.equal(estIdentifiant("contact@cabinet.fr"), true);
  assert.equal(estIdentifiant("06 61 23 45 67"), true);
  assert.equal(estIdentifiant("FR76 3000 6000 0112 3456 7890 189"), true);
  assert.equal(estIdentifiant("AB123456"), true);
  for (const p of ["NOM", "TEL", "REF", "CLI", "INTERDIT", "LIEU", "CODE"]) assert.ok(prefixesReserves().has(p), p);
});

test("compilerRegles : trouve les termes (casse, accents) et les motifs, enregistre les catégories maison dans le moteur", () => {
  const c = compilerRegles({ dossier: validerRegles(reglesDossier()).regles });
  const extras = c.trouver(["Le projet HORIZON BLEU et l'opération Faucon : affaire AFF 26/0412, puis AFF-27/0001."]);
  assert.deepEqual(extras.map((e) => [e.value, e.type]), [
    ["AFF 26/0412", "regle_AFFAIRE"], ["AFF-27/0001", "regle_AFFAIRE"],
    ["HORIZON BLEU", "regle_OPERATION"], ["Faucon", "regle_OPERATION"],
  ]);
  assert.equal(typeById("regle_OPERATION").prefix, "OPERATION");
  assert.equal(typeById("regle_AFFAIRE").label, "Numéros d'affaire (règle du dossier)");
  assert.equal(PREFIX_LABEL.OPERATION, "Noms de code des opérations (règle du dossier)");
  assert.match(codeSrc(), /OPERATION\|AFFAIRE|AFFAIRE\|OPERATION/);
  assert.ok(!CODE_SRC.includes("OPERATION"), "CODE_SRC reste la liste figée du moteur");
  assert.deepEqual(c.exclusions, ["Cabinet Exemple", "Maître Durand"]);
  assert.equal(c.ignorees, 0);
  const d = c.decrire();
  assert.match(d, /dossier — 1 liste à toujours coder \(2 termes\), 1 motif, 2 termes laissés en clair/);
  for (const v of ["Horizon", "Faucon", "AFF", "Cabinet Exemple", "Durand"]) assert.ok(!d.includes(v), `terme cité dans le plan : ${v}`);
});

test("compilerRegles : coder l'emporte sur laisser en clair à niveau égal, l'organisation l'emporte sur le dossier (critère 4)", () => {
  const dossier = validerRegles([
    { id: "D-001", type: "toujours_coder", libelle: "Opérations", prefixe: "OPE", termes: ["Faucon"] },
    { id: "D-002", type: "laisser_en_clair", libelle: "À garder", termes: ["Faucon", "Cabinet Exemple", "Lumière"] },
  ]).regles;
  const organisation = validerRegles([
    { id: "R-050", type: "laisser_en_clair", libelle: "Le cabinet", termes: ["Cabinet Exemple", "Aigle"] },
    { id: "R-051", type: "motif", libelle: "Matricules", prefixe: "MAT", motif: "M\\d{5}", exemple: "M12345" },
  ], { niveau: "organisation" }).regles;
  // « Lumière » est un nom de la politique (empreintes) : le reconnaisseur de la politique le trouve.
  const noms = (t) => (/lumi[eè]re/i.test(t) ? [{ value: t, type: "cat_client" }] : []);
  const dossier2 = validerRegles([{ id: "D-003", type: "toujours_coder", libelle: "Contre l'org", prefixe: "CONTRE", termes: ["Aigle"] }]).regles;
  const c = compilerRegles({ dossier: [...dossier, ...dossier2], organisation, noms });
  // Faucon : codé par le dossier, donc plus exclu. Lumière : nom de la politique, exclu ignoré.
  // Aigle : laissé en clair par l'ORGANISATION ; la règle « coder » du dossier ne la bat pas.
  assert.deepEqual(c.exclusions.sort(), ["Aigle", "Cabinet Exemple"]);
  assert.equal(c.ignorees, 2);
  assert.match(c.decrire(), /2 exclusions ignorées/);
  assert.match(c.decrire(), /organisation — 1 motif, 2 termes laissés en clair ; dossier — /);
  assert.deepEqual(c.trouver(["matricule M12345"]).map((e) => e.type), ["regle_MAT"]);
});

test("strictCode avec les extras des règles : « Horizon Bleu » devient OPERATION-001, le code est reconnu comme un code (critère 1)", () => {
  const c = compilerRegles({ dossier: validerRegles(reglesDossier()).regles });
  const book = newCodebook();
  const texte = "Le projet Horizon Bleu avance ; dossier AFF 26/0412. Cabinet Exemple suit l'opération Faucon.";
  const r1 = strictCode(texte, { book, extra: c.trouver([texte]), excludes: c.exclusions });
  assert.match(r1.text, /OPERATION-001/);
  assert.match(r1.text, /AFFAIRE-001/);
  assert.match(r1.text, /OPERATION-002/);
  assert.match(r1.text, /Cabinet Exemple/);
  for (const v of ["Horizon", "Bleu", "Faucon", "0412"]) assert.ok(!r1.text.includes(v), `${v} encore en clair`);
  assert.equal(r1.byType["Noms de code des opérations (règle du dossier)"], 2);
  // Repasser le verrou sur le texte codé : les codes maison ne sont pas re-codés.
  const r2 = strictCode(r1.text, { book, extra: [], excludes: c.exclusions });
  assert.equal(r2.text, r1.text);
  assert.equal(book.entries.find((e) => e.code === "AFFAIRE-001").type, "Numéros d'affaire (règle du dossier)");
});

test("verrou de sortie : un terme à toujours coder glissé dans une réponse sort en « ••• » (critère 7)", () => {
  const c = compilerRegles({ dossier: validerRegles(reglesDossier()).regles });
  const g = guardText("Fichier introuvable : Horizon Bleu — notes AFF 26/0412.txt", { regles: c });
  assert.equal(g.text, "Fichier introuvable : ••• — notes •••.txt");
  assert.equal(g.masked, 0, "pas d'alarme : c'est le travail normal des règles");
  assert.equal(g.recoded, 2);
});

test("lireReglesDossier : fichier absent, fichier valide, fichier illisible, relecture quand il change", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ht-regles-"));
  assert.deepEqual(lireReglesDossier(dir), { regles: [], erreurs: [] });
  const f = path.join(dir, "reglages.json");
  fs.writeFileSync(f, JSON.stringify({ chiffres: "auto", regles: reglesDossier() }));
  assert.equal(lireReglesDossier(dir).regles.length, 3);
  fs.writeFileSync(f, "{ pas du json");
  fs.utimesSync(f, new Date(Date.now() + 5000), new Date(Date.now() + 5000));
  const r = lireReglesDossier(dir);
  assert.equal(r.regles.length, 0);
  assert.match(r.erreurs[0], /reglages\.json illisible/);
  fs.writeFileSync(f, JSON.stringify({ chiffres: "clair" }));
  fs.utimesSync(f, new Date(Date.now() + 10000), new Date(Date.now() + 10000));
  assert.deepEqual(lireReglesDossier(dir), { regles: [], erreurs: [] });
  fs.rmSync(dir, { recursive: true, force: true });
});

/* ------------------------------------------------------------ de bout en bout */

const serverPath = path.join(here, "..", "server", "index.js");
const LICENCE = mint({ v: 1, org: "Cabinet Exemple", seats: 1, iat: "2026-10-20", exp: "9999-12-31", life: true });
let client, workdir;
const out = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
/* Le chemin de la copie codée, lu dans le compte rendu (« Hidden-Tokens/… »). */
function copieEcrite(texte) {
  const m = texte.match(/Hidden-Tokens\/(\S+-anonymise\.\w+)/);
  assert.ok(m, "chemin de la copie absent du compte rendu :\n" + texte);
  return path.join(workdir, "Hidden-Tokens", m[1]);
}

before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "ht-regles-e2e-"));
  fs.mkdirSync(path.join(workdir, "Hidden-Tokens"), { recursive: true });
  fs.writeFileSync(path.join(workdir, "Hidden-Tokens", "reglages.json"), JSON.stringify({ chiffres: "auto", regles: [
    ...reglesDossier(),
    { id: "D-004", type: "motif", libelle: "Catastrophe", prefixe: "KO", motif: "(a+)+", exemple: "aaa" },
  ] }, null, 1));
  fs.writeFileSync(path.join(workdir, "note.txt"),
    "Note interne.\nLe projet Horizon Bleu avance bien, voir l'affaire AFF 26/0412.\nCabinet Exemple représente la société ; Maître Durand plaide.\n");
  fs.writeFileSync(path.join(workdir, "suite.md"), "# Suite\n\nMême affaire AFF 26/0412, même opération Faucon.\n");
  client = new Client({ name: "regles-e2e", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: LICENCE, ANX_TEAM_DIR: "", ANX_ENROLEMENT: "", NANOMIZER_SENTINELLE_DIR: path.join(workdir, ".sentinelle-absente") },
  }));
});
after(async () => { await client.close(); fs.rmSync(workdir, { recursive: true, force: true }); });

test("E2E : le plan annonce les règles du dossier (des comptes), signale la règle écartée, et ne cite aucun terme", async () => {
  const plan = out(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "note.txt" } }));
  assert.match(plan, /PLAN D'ANONYMISATION/);
  assert.match(plan, /📏 Règles de l'organisation : dossier — 1 liste à toujours coder \(2 termes\), 1 motif, 2 termes laissés en clair/);
  assert.match(plan, /1 règle du dossier écartée : D-004 : motif refusé : quantificateur imbriqué/);
  assert.match(plan, /Noms de code des opérations \(règle du dossier\)/);
  for (const v of ["Horizon", "Bleu", "Faucon", "0412", "Durand"]) assert.ok(!plan.includes(v), `${v} dans le plan`);
});

test("E2E : la copie codée porte OPERATION-001 et AFFAIRE-001, garde le cabinet en clair ; la clé est cumulative (critères 1, 2, 3)", async () => {
  const r1 = out(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "note.txt", confirmer: true } }));
  for (const v of ["Horizon", "Bleu", "Faucon", "0412", "Durand"]) assert.ok(!r1.includes(v), `${v} dans le compte rendu`);
  const copie = fs.readFileSync(copieEcrite(r1), "utf8");
  assert.match(copie, /OPERATION-001/);
  assert.match(copie, /AFFAIRE-001/);
  assert.match(copie, /Cabinet Exemple/);
  assert.match(copie, /Maître Durand/);
  for (const v of ["Horizon", "Bleu", "0412"]) assert.ok(!copie.includes(v), `${v} dans la copie`);

  const r2 = out(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "suite.md", confirmer: true } }));
  assert.ok(!r2.includes("Faucon") && !r2.includes("0412"));
  const copie2 = fs.readFileSync(copieEcrite(r2), "utf8");
  assert.match(copie2, /AFFAIRE-001/, "même n° d'affaire, même code");
  assert.match(copie2, /OPERATION-002/, "Faucon avait reçu OPERATION-002 dans le premier fichier");

  // La clé connaît les catégories maison ; reglages.json n'est jamais listé.
  const cle = JSON.parse(fs.readFileSync(path.join(workdir, "Hidden-Tokens", "cle-de-session.json"), "utf8"));
  assert.ok(cle.entries.some((e) => e.code === "AFFAIRE-001" && e.value === "AFF 26/0412"));
  const liste = out(await client.callTool({ name: "lister_fichiers", arguments: {} }));
  assert.ok(!liste.includes("reglages.json"));
  const etat = out(await client.callTool({ name: "etat_cle", arguments: {} }));
  assert.match(etat, /📏 Règles de l'organisation/);
});

test("E2E : une règle ajoutée dans l'appli vaut tout de suite, sans redémarrer", async () => {
  const f = path.join(workdir, "Hidden-Tokens", "reglages.json");
  const r = JSON.parse(fs.readFileSync(f, "utf8"));
  r.regles = r.regles.filter((x) => x.id !== "D-004");
  r.regles.push({ id: "D-010", type: "toujours_coder", libelle: "Partenaires", prefixe: "PARTENAIRE", termes: ["Cabinet Exemple"] });
  fs.writeFileSync(f, JSON.stringify(r));
  fs.utimesSync(f, new Date(Date.now() + 5000), new Date(Date.now() + 5000));
  const plan = out(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "note.txt" } }));
  assert.match(plan, /2 listes à toujours coder \(3 termes\)/);
  assert.match(plan, /1 exclusion ignorée/, "Cabinet Exemple est à la fois à coder et à laisser en clair : coder l'emporte");
  assert.ok(!plan.includes("D-004"));
  assert.match(plan, /Partenaires \(règle du dossier\)/);
});
