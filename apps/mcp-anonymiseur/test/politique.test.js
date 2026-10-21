// POLITIQUE DU CABINET, CÔTÉ POSTE (US-4) — de bout en bout avec la VRAIE
// console admin (apps/nanomizer-admin) : elle crée le cabinet, enrôle le poste
// et signe ; le connecteur vérifie, refuse ce qui doit l'être (fail closed) et
// applique les règles « interdit ». Critères d'acceptation 1, 2 et 8 de la spec.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { mint } from "./licence-test.mjs";
import { XLSX } from "../server/engine.js";
import { creerPolitiquePoste, regleInterditeTouchee, ETAT_FILE } from "../server/politique.js";
import { creerCabinet, ouvrirCabinet } from "../../nanomizer-admin/lib/cabinet.js";
import { creerEnrolement, ecrireEnrolement } from "../../nanomizer-admin/lib/enrolement.js";
import { publierPolitique, signerPolitique, modeleSource, FICHIER_POLITIQUE, FICHIER_SIGNATURE } from "../../nanomizer-admin/lib/politique.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");
const LICENCE = mint({ v: 1, org: "Cabinet Test", seats: 1, iat: "2026-10-20", exp: "9999-12-31", life: true });
const T0 = new Date("2026-10-21T09:00:00Z");
const PHRASE = "correct cheval pile agrafe";

let root;
const opened = [];
const out = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");

function cabinet(nom = "Cabinet Test") {
  const cab = creerCabinet({ nom, phrase: PHRASE, cout: { N: 2 ** 10, r: 8, p: 1 }, maintenant: T0 });
  return { cab, ouvert: ouvrirCabinet(cab, PHRASE) };
}
function source() {
  const s = modeleSource();
  s.emise_par = "admin@cabinet-test.fr";
  s.equipes[0].membres = ["s.alaoui@cabinet-test.fr"];
  s.equipes[0].responsables = ["associe@cabinet-test.fr"];
  s.alertes.admin_technique = ["it@cabinet-test.fr"];
  s.regles[0].noms = ["SARL Benjelloun Frères", "Benjelloun"];
  return s;
}
/* Un cabinet, un poste enrôlé, la politique v1 publiée. */
function installer(nom) {
  const dir = fs.mkdtempSync(path.join(root, `${nom}-`));
  const partage = path.join(dir, "partage"), archives = path.join(dir, "archives"), poste = path.join(dir, "poste");
  fs.mkdirSync(poste, { recursive: true });
  const { cab, ouvert } = cabinet();
  const enr = creerEnrolement(cab, ouvert, { utilisateur: "s.alaoui@cabinet-test.fr", dossierPartage: partage, maintenant: T0 });
  const fichierEnr = ecrireEnrolement(dir, enr);
  const publier = (src = source(), maintenant = T0) => {
    const r = publierPolitique({ source: src, cabinet: cab, ouvert, dossierPartage: partage, dossierArchives: archives, maintenant });
    cab.derniere_version = r.version;
    return r;
  };
  publier();
  return { dir, partage, archives, poste, cab, ouvert, fichierEnr, publier };
}
const pp = (c, now = T0) => creerPolitiquePoste({ enrolement: c.fichierEnr, etatDir: path.join(c.poste, "Anonymiseur-Ai4x"), now: () => now });

before(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "anx-politique-")); });
after(async () => {
  for (const c of opened) await c.close().catch(() => {});
  fs.rmSync(root, { recursive: true, force: true });
});

test("politique signée par la console : acceptée, épinglée, version mémorisée", () => {
  const c = installer("ok");
  const r = pp(c).controler();
  assert.equal(r.etat, "OK");
  assert.equal(r.version, 1);
  assert.equal(r.bloque, false);
  const etat = JSON.parse(fs.readFileSync(path.join(c.poste, "Anonymiseur-Ai4x", ETAT_FILE), "utf8"));
  assert.equal(etat.version_max, 1);
  assert.equal(etat.cle.id, c.cab.cle.id);
});

test("critère 1 : un seul octet modifié après signature → ALTEREE, bloquant", () => {
  const c = installer("octet");
  const f = path.join(c.partage, FICHIER_POLITIQUE);
  const b = fs.readFileSync(f);
  const i = b.indexOf(Buffer.from("Clients actifs"));
  b[i] = b[i] ^ 0x01;
  fs.writeFileSync(f, b);
  const r = pp(c).controler();
  assert.equal(r.etat, "ALTEREE");
  assert.ok(r.bloque);
  assert.match(r.raison, /signature invalide/);
});

test("critère 2 : la v1 remise après la v2 → RETROGRADEE ; même numéro, autre contenu → RETROGRADEE", () => {
  const c = installer("retour");
  const poste = pp(c);
  assert.equal(poste.controler().version, 1);
  const v1 = { p: fs.readFileSync(path.join(c.partage, FICHIER_POLITIQUE)), s: fs.readFileSync(path.join(c.partage, FICHIER_SIGNATURE)) };
  c.publier();
  assert.equal(poste.controler().version, 2);
  fs.writeFileSync(path.join(c.partage, FICHIER_POLITIQUE), v1.p);
  fs.writeFileSync(path.join(c.partage, FICHIER_SIGNATURE), v1.s);
  const r = poste.controler();
  assert.equal(r.etat, "RETROGRADEE");
  assert.ok(r.bloque);
  // Une v2 bien signée mais différente de celle déjà acceptée.
  const p2 = JSON.parse(fs.readFileSync(path.join(c.archives, "v2", FICHIER_POLITIQUE), "utf8"));
  p2.notice_salaries.texte += " (variante)";
  const { octets, signature } = signerPolitique(p2, c.ouvert.clePrivee, c.cab.cle.id);
  fs.writeFileSync(path.join(c.partage, FICHIER_POLITIQUE), octets);
  fs.writeFileSync(path.join(c.partage, FICHIER_SIGNATURE), signature);
  assert.equal(poste.controler().etat, "RETROGRADEE");
});

test("expiration : avertit pendant 72 h, puis bloque", () => {
  const c = installer("expire");
  const expire = Date.parse(pp(c).controler().politique.expire_le);
  const grace = pp(c, new Date(expire + 10 * 3600000)).controler();
  assert.equal(grace.etat, "EXPIREE");
  assert.equal(grace.bloque, false);
  assert.match(grace.avert, /prévenez votre admin/);
  const tard = pp(c, new Date(expire + 73 * 3600000)).controler();
  assert.equal(tard.etat, "EXPIREE");
  assert.ok(tard.bloque);
});

test("dossier partagé injoignable : copie locale vérifiée, NON_SYNCHRONISEE après 24 h ; sans copie → ABSENTE", () => {
  const c = installer("synchro");
  pp(c).controler();
  fs.rmSync(c.partage, { recursive: true, force: true });
  const vite = pp(c, new Date(T0.getTime() + 3600000)).controler();
  assert.equal(vite.etat, "OK");
  assert.equal(vite.source, "copie");
  const tard = pp(c, new Date(T0.getTime() + 30 * 3600000)).controler();
  assert.equal(tard.etat, "NON_SYNCHRONISEE");
  assert.equal(tard.bloque, false);
  // Copie locale bricolée → refusée.
  const f = path.join(c.poste, "Anonymiseur-Ai4x", ETAT_FILE);
  const etat = JSON.parse(fs.readFileSync(f, "utf8"));
  const b = Buffer.from(etat.copie.octets, "base64"); b[20] ^= 1; etat.copie.octets = b.toString("base64");
  fs.writeFileSync(f, JSON.stringify(etat));
  assert.equal(pp(c).controler().etat, "ALTEREE");
  const neuf = installer("absente");
  fs.rmSync(neuf.partage, { recursive: true, force: true });
  assert.equal(pp(neuf).controler().etat, "ABSENTE");
});

test("clé épinglée : un enrôlement d'un autre cabinet sur ce poste → ALTEREE", () => {
  const a = installer("epingle");
  pp(a).controler();
  const b = installer("intrus");
  // Le fichier d'enrôlement de A remplacé par celui d'un autre cabinet, même identifiant de poste.
  const enrB = JSON.parse(fs.readFileSync(b.fichierEnr, "utf8"));
  enrB.poste = JSON.parse(fs.readFileSync(a.fichierEnr, "utf8")).poste;
  enrB.cabinet = JSON.parse(fs.readFileSync(a.fichierEnr, "utf8")).cabinet;
  fs.writeFileSync(a.fichierEnr, JSON.stringify(enrB));
  const r = pp(a).controler();
  assert.equal(r.etat, "ALTEREE");
  assert.match(r.raison, /autre clé que celle épinglée/);
});

test("règle interdit : le code d'un détecteur visé dans la copie codée la bloque", () => {
  const regles = [{ id: "R-010", libelle: "RIB", detecteurs: ["CIN", "RIB"] }];
  assert.equal(regleInterditeTouchee(regles, "Virement sur RIB-001 de NOM-002").regle.id, "R-010");
  assert.equal(regleInterditeTouchee(regles, "Virement de NOM-002 (PRIB-001 n'est pas un code)"), null);
  assert.equal(regleInterditeTouchee(regles, "équipe : CIN-48291374").detecteur, "CIN");
});

async function connect(c) {
  const client = new Client({ name: "politique", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: c.poste, ANX_LICENCE: LICENCE, ANX_TEAM_DIR: "", ANX_ENROLEMENT: c.fichierEnr },
  }));
  opened.push(client);
  return { call: async (name, args = {}) => out(await client.callTool({ name, arguments: args })), raw: (name, args = {}) => client.callTool({ name, arguments: args }) };
}

test("connecteur enrôlé : interdit RIB bloque l'écriture, le reste passe, la politique est montrée et journalisée", async () => {
  const c = installer("e2e");
  fs.writeFileSync(path.join(c.poste, "virement.md"), "Ordre de virement de Karim Tazi vers le compte FR7630006000011234567890189, montant 12 000 euros.\n");
  fs.writeFileSync(path.join(c.poste, "relance.md"), "Relancer Karim Tazi au sujet du bail de la rue des Lilas.\n");
  const s = await connect(c);
  const etat = await s.call("etat_cle");
  assert.match(etat, /Politique du cabinet Cabinet Test : v1/);
  assert.match(etat, /R-010 \(interdit\)/);
  assert.match(etat, /Notice du cabinet/);
  assert.match(etat, /R-001 : PAS ENCORE appliquées/, "les règles par noms sont annoncées comme non appliquées");

  const bloque = await s.raw("anonymiser_fichier", { nom_fichier: "virement.md", confirmer: true });
  assert.ok(bloque.isError);
  assert.match(out(bloque), /Bloqué par la règle R-010/);
  assert.ok(!out(bloque).includes("FR76"), "la valeur n'est jamais citée");
  const sortie = path.join(c.poste, "Anonymiseur-Ai4x");
  assert.ok(!fs.readdirSync(sortie).some((n) => /-anonymise\./.test(n)), "aucune copie écrite pour l'IA");

  const ok = await s.call("anonymiser_fichier", { nom_fichier: "relance.md", confirmer: true });
  assert.match(ok, /anonymise\.md/);
  assert.ok(!ok.includes("Tazi"));

  // En lot : la copie interdite est sautée, les autres sont écrites.
  const classeur = (nom, rows) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Feuille");
    XLSX.writeFile(wb, path.join(c.poste, nom));
  };
  classeur("fournisseurs.xlsx", [["Nom", "Prénom", "IBAN"], ["Tazi", "Karim", "FR7630006000011234567890189"]]);
  classeur("clients.xlsx", [["Nom", "Prénom", "Dossier"], ["Chraibi", "Omar", "Bail"]]);
  const avant = new Set(fs.readdirSync(sortie));
  const lot = await s.call("anonymiser_dossier", { confirmer: true });
  assert.match(lot, /bloqués par la politique du cabinet : .*règle R-010/);
  const copies = fs.readdirSync(sortie).filter((n) => !avant.has(n) && /-anonymise\.xlsx$/.test(n));
  assert.equal(copies.length, 1, `une seule copie attendue : ${copies.join(", ")}`);
  const csv = XLSX.utils.sheet_to_csv(XLSX.readFile(path.join(sortie, copies[0])).Sheets.Feuille ?? Object.values(XLSX.readFile(path.join(sortie, copies[0])).Sheets)[0]);
  assert.ok(!/FR76|RIB-/.test(csv), "la copie écrite n'est pas celle du fichier interdit");

  const journal = fs.readdirSync(path.join(sortie, "journal-ia")).map((n) => fs.readFileSync(path.join(sortie, "journal-ia", n), "utf8")).join("");
  const lignes = journal.trim().split("\n").map((l) => JSON.parse(l)).filter((e) => e.outil === "anonymiser_fichier");
  assert.ok(lignes.length >= 2 && lignes.every((e) => e.politique?.version === 1 && /^sha256:/.test(e.politique.empreinte)));
});

test("critères 1 et 8 côté connecteur : politique altérée ou absente → rien n'est codé, le décodage continue", async () => {
  const c = installer("failclosed");
  fs.writeFileSync(path.join(c.poste, "relance.md"), "Relancer Karim Tazi.\n");
  const s = await connect(c);
  await s.call("anonymiser_fichier", { nom_fichier: "relance.md", confirmer: true });
  const f = path.join(c.partage, FICHIER_POLITIQUE);
  const b = fs.readFileSync(f); b[b.length - 3] ^= 1; fs.writeFileSync(f, b);
  for (const args of [{ nom_fichier: "relance.md" }, { nom_fichier: "relance.md", confirmer: true }]) {
    const r = await s.raw("anonymiser_fichier", args);
    assert.ok(r.isError);
    assert.match(out(r), /Politique du cabinet Cabinet Test : ALTEREE/);
    assert.match(out(r), /Le décodage reste disponible/);
  }
  assert.ok((await s.raw("anonymiser_dossier", {})).isError);
  const dec = await s.raw("deanonymiser", { contenu: "Voir NOM-001.", nom_sortie: "note" });
  assert.ok(!dec.isError, out(dec));
});

test("sans enrôlement, rien ne change", async () => {
  const dir = fs.mkdtempSync(path.join(root, "libre-"));
  fs.writeFileSync(path.join(dir, "virement.md"), "Virement vers FR7630006000011234567890189 pour Karim Tazi.\n");
  const client = new Client({ name: "libre", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: dir, ANX_LICENCE: LICENCE, ANX_TEAM_DIR: "", ANX_ENROLEMENT: "" },
  }));
  opened.push(client);
  const r = out(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "virement.md", confirmer: true } }));
  assert.match(r, /anonymise\.md/);
  assert.ok(!/Politique du cabinet/.test(r));
});
