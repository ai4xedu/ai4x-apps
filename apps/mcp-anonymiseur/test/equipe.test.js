// CLÉ D'ÉQUIPE (v2.3) — deux postes, un dossier partagé : même valeur = même
// code, le code d'un collègue se décode, le secret ne sort jamais, et un
// dossier injoignable suspend le codage au lieu de fabriquer des codes locaux.
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
import { teamCode } from "../server/equipe.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");
const EQUIPE = mint({ v: 1, org: "Cabinet Test", seats: 20, iat: "2026-10-20", exp: "9999-12-31", life: true });
const SOLO = mint({ v: 1, org: "Maître Seul", seats: 1, iat: "2026-10-20", exp: "9999-12-31", life: true });

let root, teamDir;
const opened = [];
const out = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");

function poste(name, rows) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Nom", "Prénom", "Dossier"], ...rows]), "Clients");
  XLSX.writeFile(wb, path.join(dir, "clients.xlsx"));
  return dir;
}

async function connect(dir, licence, team = teamDir) {
  const c = new Client({ name: "equipe", version: "1.0.0" });
  await c.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: dir, ANX_LICENCE: licence, ANX_TEAM_DIR: team },
  }));
  opened.push(c);
  return { call: async (name, args = {}) => out(await c.callTool({ name, arguments: args })), raw: (name, args = {}) => c.callTool({ name, arguments: args }) };
}

// (?<![A-Z]) : « NOM-… » ne doit pas être pris dans « PRENOM-… ».
const codesOf = (t, prefix) => [...t.matchAll(new RegExp(`(?<![A-Z])${prefix}-\\d{8}`, "g"))].map((m) => m[0]);

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "anx-equipe-"));
  teamDir = path.join(root, "NAS-partage");
  fs.mkdirSync(teamDir);
});

after(async () => {
  for (const c of opened) await c.close().catch(() => {});
  fs.rmSync(root, { recursive: true, force: true });
});

test("deux postes, même dossier d'équipe : même valeur = même code ; le code d'un collègue se décode", async () => {
  const a = await connect(poste("poste-A", [["Benali", "Karim", "Litige bail"], ["Tazi", "Mehdi", "Divorce"]]), EQUIPE);
  const b = await connect(poste("poste-B", [["Benali", "Karim", "Litige bail"], ["Chraibi", "Omar", "Succession"]]), EQUIPE);
  const ta = await a.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true, chiffres: "clair" });
  const tb = await b.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true, chiffres: "clair" });
  for (const v of ["Benali", "Tazi", "Chraibi", "Karim"]) assert.ok(!ta.includes(v) && !tb.includes(v), `« ${v} » a fui`);
  const table = (t) => t.split("TABLEAU CODÉ")[1] || "";
  const benaliA = codesOf(table(ta), "NOM")[0], benaliB = codesOf(table(tb), "NOM")[0];
  assert.ok(benaliA, `code d'équipe à 8 chiffres attendu :\n${ta}`);
  assert.equal(benaliA, benaliB, "Benali doit avoir le même code sur les deux postes");
  // B décode un texte où figure le code de Tazi, que seul A a vu.
  const tazi = codesOf(table(ta), "NOM")[1];
  const dec = await b.call("deanonymiser", { contenu: `Relancer ${tazi} et ${benaliA}.`, nom_sortie: "relance" });
  const m = dec.match(/(Hidden-Tokens\/\S+)/);
  const decoded = fs.readFileSync(path.join(root, "poste-B", m[1]), "utf8");
  assert.equal(decoded, "Relancer Tazi et Benali.");
  assert.match(await b.call("etat_cle"), /Clé d'équipe ACTIVE : 2 poste\(s\)/);
});

test("le secret d'équipe ne sort jamais : ni dans les réponses, ni dans la clé locale", async () => {
  const secret = JSON.parse(fs.readFileSync(path.join(teamDir, ".nanomizer-equipe.json"), "utf8")).secret;
  const a = await connect(path.join(root, "poste-A"), EQUIPE);
  for (const name of ["etat_cle", "verifier_confinement", "journal_ia", "lister_fichiers"]) {
    assert.ok(!(await a.call(name)).includes(secret), `secret dans ${name}`);
  }
  assert.ok(!fs.readFileSync(path.join(root, "poste-A", "Hidden-Tokens", "cle-de-session.json"), "utf8").includes(secret));
  // Sans le secret, impossible de calculer le code d'un nom deviné.
  const guess = teamCode(Buffer.alloc(32, 7), "NOM", "Benali", () => false);
  assert.ok(!fs.readFileSync(path.join(teamDir, fs.readdirSync(teamDir).find((n) => n.startsWith("cle-poste-"))), "utf8").includes(guess));
});

test("dossier d'équipe injoignable : rien n'est codé, le décodage continue", async () => {
  const c = await connect(path.join(root, "poste-A"), EQUIPE, path.join(root, "NAS-debranche"));
  const res = await c.raw("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true });
  assert.ok(res.isError);
  assert.match(out(res), /Clé d'équipe injoignable/);
  assert.match(out(res), /RIEN n'est codé/);
  const dec = await c.raw("deanonymiser", { contenu: "voir NOM-001", nom_sortie: "x" });
  assert.ok(!/injoignable/.test(out(dec)));
});

test("la clé d'équipe est réservée à l'offre Cabinet ; sans dossier, rien ne change (codes NOM-001)", async () => {
  const solo = await connect(poste("poste-solo", [["Kettani", "Rita", "Bail"]]), SOLO);
  const res = await solo.raw("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true });
  assert.ok(res.isError);
  assert.match(out(res), /offre Cabinet/);
  const seul = await connect(path.join(root, "poste-solo"), SOLO, "");
  const t = await seul.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true });
  assert.match(t, /NOM-001/);
});

test("le dossier d'équipe n'est jamais servi à l'IA", async () => {
  const work = path.join(root, "poste-A");
  // Cas d'un dossier d'équipe placé DANS le dossier de travail.
  const inner = path.join(work, "equipe");
  fs.mkdirSync(inner, { recursive: true });
  fs.copyFileSync(path.join(teamDir, ".nanomizer-equipe.json"), path.join(inner, ".nanomizer-equipe.json"));
  const c = await connect(work, EQUIPE, inner);
  await c.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true });
  const poste = fs.readdirSync(inner).find((n) => n.startsWith("cle-poste-"));
  for (const f of [".nanomizer-equipe.json", poste]) {
    const res = await c.raw("anonymiser_fichier", { nom_fichier: `equipe/${f}` });
    assert.ok(res.isError, `${f} servi à l'IA`);
  }
});

test("collision d'équipe : un code qui désigne deux valeurs n'est jamais décodé en silence", async () => {
  const dir = poste("poste-C", [["Lahlou", "Nadia", "Cession"]]);
  const c = await connect(dir, EQUIPE);
  const plan = await c.call("anonymiser_fichier", { nom_fichier: "clients.xlsx", confirmer: true });
  const code = codesOf(plan, "NOM").find(Boolean);
  assert.ok(code, "un code NOM doit avoir été attribué");
  // Un collègue a créé AU MÊME MOMENT le même code pour une autre personne.
  fs.writeFileSync(path.join(teamDir, "cle-poste-collegue0001.json"),
    JSON.stringify({ maj: new Date().toISOString(), entries: [{ code, value: "Bennani", type: "Nom" }] }));
  const res = await c.call("deanonymiser", { contenu: `Dossier suivi par ${code}.`, nom_sortie: "conflit" });
  assert.match(res, /désignent deux valeurs différentes/);
  assert.ok(!res.includes("Lahlou") && !res.includes("Bennani"), "aucune des deux valeurs ne sort dans le chat");
  const outDir = path.join(dir, "Hidden-Tokens");
  const f = fs.readdirSync(outDir).find((n) => /^conflit-decode-.*\.md$/.test(n));
  const md = fs.readFileSync(path.join(outDir, f), "utf8");
  assert.ok(md.includes(`[À VÉRIFIER : ${code}]`), "le fichier marque le code au lieu de choisir une valeur");
  assert.ok(!md.includes("Lahlou") && !md.includes("Bennani"));
  assert.match(await c.call("etat_cle"), /1 code\(s\) en conflit/);
  fs.rmSync(path.join(teamDir, "cle-poste-collegue0001.json"));
});
