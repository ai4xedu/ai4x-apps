// LE REGISTRE DE L'ORGANISATION (v2.20), de bout en bout : la console admin
// crée le registre et certifie deux postes ; deux connecteurs (vrai protocole
// MCP, stdio) reçoivent leurs secrets comme la sentinelle les leur donne, codent
// la même valeur sous le même code, décodent le code du collègue, importent
// leur clé locale telle quelle ; un poste retiré ne lit plus la suite ; un
// registre altéré est refusé.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { XLSX } from "../server/engine.js";
import { mint } from "./licence-test.mjs";
import { descellerPourPoste, lireRegistre, FORMAT_FICHE } from "../server/registre.js";
import { genererPaireReception, empreinte } from "../server/enveloppe.js";
import { creerCabinet, ouvrirCabinet } from "../../nanomizer-admin/lib/cabinet.js";
import { creerEnrolement, ecrireEnrolement } from "../../nanomizer-admin/lib/enrolement.js";
import { creerAdmin, ouvrirAdmin, creerRegistre, certifierPoste, retirerPoste } from "../../nanomizer-admin/lib/registre.js";
import { publierPolitique, modeleSource } from "../../nanomizer-admin/lib/politique.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");
const EQUIPE = mint({ v: 1, org: "Cabinet Test", seats: 20, iat: "2026-10-20", exp: "9999-12-31", life: true });
const PHRASE = "correct cheval pile agrafe";
const COUT = { N: 2 ** 10, r: 8, p: 1 };

let root, partage, cabinet, ouvert, admin, adminPrivee;
const postes = {};
const opened = [];
const out = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
const codesOf = (t, prefix) => [...t.matchAll(new RegExp(`(?<![A-Z])${prefix}-\\d{8}`, "g"))].map((m) => m[0]);

function poste(name, rows) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Nom", "Prénom", "Dossier"], ...rows]), "Clients");
  XLSX.writeFile(wb, path.join(dir, "clients.xlsx"));
  return dir;
}

/* Ce que fera la sentinelle : enrôlement, paire dans le trousseau, fiche déposée. */
function enroler(name) {
  const enr = creerEnrolement(cabinet, ouvert, { utilisateur: `${name}@cabinet-test.fr`, dossierPartage: partage });
  const fichierEnr = ecrireEnrolement(path.join(root, name), enr);
  const paire = genererPaireReception();
  const fiche = { format: FORMAT_FICHE, organisation: cabinet.id, poste: enr.poste.id, utilisateur: enr.poste.utilisateur, reception: { alg: "x25519", publique: paire.publique }, empreinte: empreinte(paire.publique), emise_le: new Date().toISOString() };
  fs.mkdirSync(path.join(partage, "registre", "postes"), { recursive: true });
  fs.writeFileSync(path.join(partage, "registre", "postes", `${enr.poste.id}.json`), JSON.stringify(fiche));
  postes[name] = { id: enr.poste.id, paire, fichierEnr, dir: path.join(root, name) };
  return postes[name];
}

/* …puis, à chaque démarrage, descelle ses secrets et les passe au connecteur
   (ici par fichier 600 ; la sentinelle passe un descripteur). */
function secretsFichier(p) {
  const d = descellerPourPoste(lireRegistre(path.join(partage, "registre")), p.id, p.paire.privee);
  if (d.etat !== "actif") return null;
  const f = path.join(p.dir, ".secrets-test.json");
  fs.writeFileSync(f, JSON.stringify({ K_codes: d.secrets.kCodes.toString("base64"), K_registre: Object.fromEntries(Object.entries(d.secrets.kRegistre).map(([g, k]) => [g, k.toString("base64")])) }), { mode: 0o600 });
  return f;
}

async function connect(p, { secrets = secretsFichier(p), enrolement = p.fichierEnr } = {}) {
  const c = new Client({ name: "registre", version: "1.0.0" });
  await c.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: {
      ...process.env, ANX_WORKDIR: p.dir, ANX_LICENCE: EQUIPE, ANX_TEAM_DIR: "", ANX_SENTINELLE: "non",
      ANX_REGISTRE_DIR: path.join(partage, "registre"), ANX_POSTE_ID: p.id, ANX_POSTE_SECRETS_FICHIER: secrets || "", ANX_ENROLEMENT: enrolement || "",
      NANOMIZER_SENTINELLE_DIR: path.join(root, ".sentinelle-absente"),
    },
  }));
  opened.push(c);
  return { call: async (name, args = {}) => out(await c.callTool({ name, arguments: args })), close: () => c.close() };
}

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "anx-registre-"));
  partage = path.join(root, "NAS-partage");
  fs.mkdirSync(partage);
  cabinet = creerCabinet({ nom: "Cabinet Test", phrase: PHRASE, cout: COUT });
  ouvert = ouvrirCabinet(cabinet, PHRASE);
  admin = creerAdmin(cabinet, PHRASE, COUT);
  adminPrivee = ouvrirAdmin(admin, cabinet, PHRASE);
  creerRegistre({ cabinet, ouvert, admin, partage });
  // Un poste enrôlé exige une politique signée dans le partage : la plus simple.
  const source = modeleSource();
  source.emise_par = "admin@cabinet-test.fr";
  source.equipes[0].membres = ["poste-A@cabinet-test.fr"];
  source.equipes[0].responsables = ["admin@cabinet-test.fr"];
  source.alertes.admin_technique = ["it@cabinet-test.fr"];
  source.regles[0].noms = ["Société Fictive Sans Rapport"];
  publierPolitique({ source, cabinet, ouvert, dossierPartage: partage, dossierArchives: path.join(root, "archives") });
});

after(async () => {
  for (const c of opened) await c.close().catch(() => {});
  fs.rmSync(root, { recursive: true, force: true });
});

test("un poste enrôlé mais pas encore certifié : rien n'est codé, le décodage reste disponible, et il le dit", async () => {
  const a = enroler("poste-A");
  poste("poste-A", [["Benali", "Karim", "Litige bail"], ["Tazi", "Mehdi", "Divorce"]]);
  const c = await connect(a, { secrets: null });
  const t = await c.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true, chiffres: "clair" });
  assert.match(t, /Registre de l'organisation injoignable/);
  assert.match(t, /RIEN n'est codé/);
  assert.ok(!fs.existsSync(path.join(a.dir, "Hidden-Tokens", "cle-de-session.json")));
  await c.close();
});

test("deux postes certifiés : même valeur = même code ; le code du collègue se décode ; rien en clair sur le partage", async () => {
  const a = postes["poste-A"];
  const b = enroler("poste-B");
  poste("poste-B", [["Benali", "Karim", "Litige bail"], ["Chraibi", "Omar", "Succession"]]);
  certifierPoste({ cabinet, ouvert, adminPrivee, partage, posteId: a.id });
  certifierPoste({ cabinet, ouvert, adminPrivee, partage, posteId: b.id });
  const ca = await connect(a), cb = await connect(b);
  const ta = await ca.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true, chiffres: "clair" });
  const tb = await cb.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true, chiffres: "clair" });
  for (const v of ["Benali", "Tazi", "Chraibi", "Karim"]) assert.ok(!ta.includes(v) && !tb.includes(v), `« ${v} » a fui`);
  const table = (t) => t.split("TABLEAU CODÉ")[1] || "";
  const benaliA = codesOf(table(ta), "NOM")[0], benaliB = codesOf(table(tb), "NOM")[0];
  assert.ok(benaliA, `code de registre à 8 chiffres attendu :\n${ta}`);
  assert.equal(benaliA, benaliB, "Benali doit avoir le même code sur les deux postes");
  const tazi = codesOf(table(ta), "NOM")[1];
  const dec = await cb.call("deanonymiser", { contenu: `Relancer ${tazi} et ${benaliA}.`, nom_sortie: "relance" });
  const m = dec.match(/(Hidden-Tokens\/\S+)/);
  assert.equal(fs.readFileSync(path.join(b.dir, m[1]), "utf8"), "Relancer Tazi et Benali.");
  const etat = await cb.call("etat_cle");
  assert.match(etat, /Registre de l'organisation ACTIF : 2 poste\(s\) certifié\(s\), 2 ont déjà partagé des codes/);
  assert.match(etat, /séquestre : NON/);
  const brut = fs.readdirSync(path.join(partage, "registre", "entrees")).map((n) => fs.readFileSync(path.join(partage, "registre", "entrees", n), "utf8")).join("");
  assert.ok(!/Benali|Tazi|Chraibi|Karim/.test(brut));
  assert.ok(!/registre/i.test(await ca.call("lister_fichiers")), "le registre n'est jamais listé comme un fichier de travail");
});

test("import tel quel : une clé locale séquentielle (poste solo) entre dans le registre sans changer de code ; le doublon est signalé", async () => {
  const c = enroler("poste-C");
  poste("poste-C", [["Benali", "Karim", "Recouvrement"]]);
  // Avant d'être certifié, C travaillait seul : clé locale, codes séquentiels.
  const solo = new Client({ name: "solo", version: "1.0.0" });
  await solo.connect(new StdioClientTransport({ command: process.execPath, args: [serverPath], env: { ...process.env, ANX_WORKDIR: c.dir, ANX_LICENCE: EQUIPE, ANX_TEAM_DIR: "", ANX_REGISTRE_DIR: "", NANOMIZER_SENTINELLE_DIR: path.join(root, ".sentinelle-absente") } }));
  const ts = out(await solo.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx", confirmer: true, chiffres: "clair" } }));
  await solo.close();
  assert.match(ts, /NOM-001/);
  certifierPoste({ cabinet, ouvert, adminPrivee, partage, posteId: c.id });
  const cc = await connect(c);
  const etat = await cc.call("etat_cle");
  assert.match(etat, /3 poste\(s\) certifié\(s\)/);
  assert.match(etat, /doublon\(s\).*NOM-001 = NOM-\d{8}/, `le Benali de C (NOM-001) et celui du registre doivent être signalés :\n${etat}`);
  // B décode le code local de C, importé tel quel.
  const cb = await connect(postes["poste-B"]);
  const dec = await cb.call("deanonymiser", { contenu: "Dossier de NOM-001 et PRENOM-001.", nom_sortie: "import" });
  const m = dec.match(/(Hidden-Tokens\/\S+)/);
  assert.equal(fs.readFileSync(path.join(postes["poste-B"].dir, m[1]), "utf8"), "Dossier de Benali et Karim.");
});

test("poste retiré : refusé au démarrage ; les autres continuent en génération 2 et décodent toujours l'ancien", async () => {
  const c = postes["poste-C"];
  const secretsAvant = secretsFichier(c);
  retirerPoste({ cabinet, ouvert, adminPrivee, partage, posteId: c.id });
  const cc = await connect(c, { secrets: secretsAvant });
  assert.match(await cc.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true, chiffres: "clair" }), /retiré du registre/);
  const ca = await connect(postes["poste-A"]);
  assert.match(await ca.call("etat_cle"), /génération 2/);
  const dec = await ca.call("deanonymiser", { contenu: "Voir NOM-001.", nom_sortie: "apres" });
  const m = dec.match(/(Hidden-Tokens\/\S+)/);
  assert.equal(fs.readFileSync(path.join(postes["poste-A"].dir, m[1]), "utf8"), "Voir Benali.");
});

test("registre altéré sur le partage : signature invalide, rien n'est codé", async () => {
  const f = path.join(partage, "registre", "registre.json");
  const sauve = fs.readFileSync(f, "utf8");
  const reg = JSON.parse(sauve);
  reg.generation = 9;
  fs.writeFileSync(f, JSON.stringify(reg));
  try {
    const ca = await connect(postes["poste-A"]);
    const t = await ca.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true, chiffres: "clair" });
    assert.match(t, /signature du registre invalide/);
  } finally { fs.writeFileSync(f, sauve); }
});
