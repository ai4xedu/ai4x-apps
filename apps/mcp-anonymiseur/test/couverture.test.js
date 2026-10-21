// RAPPORT DE COUVERTURE (v2.4) — des comptes par poste, déposés dans le
// dossier d'équipe : qui protège quoi, sans jamais une valeur, un code ou un
// nom de fichier ; et rien de nominatif renvoyé à l'IA.
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
import { posteStats, aggregate, renderCoverage } from "../server/couverture.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");
const EQUIPE = mint({ v: 1, org: "Cabinet Test", seats: 20, iat: "2026-10-20", exp: "9999-12-31", life: true });

let root, teamDir;
const opened = [];
const out = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");

function poste(name, rows) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Nom", "Prénom", "Honoraires"], ...rows]), "Clients");
  XLSX.writeFile(wb, path.join(dir, "Dossiers Benali.xlsx"));
  return dir;
}
async function connect(dir, nom) {
  const c = new Client({ name: "couverture", version: "1.0.0" });
  await c.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: dir, ANX_LICENCE: EQUIPE, ANX_TEAM_DIR: teamDir, ANX_POSTE_NOM: nom },
  }));
  opened.push(c);
  return { call: async (name, args = {}) => out(await c.callTool({ name, arguments: args })), raw: (name, args = {}) => c.callTool({ name, arguments: args }) };
}

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "anx-couverture-"));
  teamDir = path.join(root, "NAS");
  fs.mkdirSync(teamDir);
});
after(async () => {
  for (const c of opened) await c.close().catch(() => {});
  fs.rmSync(root, { recursive: true, force: true });
});

test("comptes d'un poste : fichiers, plans, refus, décodages, mode des chiffres — par mois", () => {
  const e = (t, outil, args, texte) => ({ t, outil, args: JSON.stringify(args), texte });
  const journal = { entries: [
    e("2026-10-02T09:00:00Z", "anonymiser_fichier", {}, "PLAN — rien n'est écrit"),
    e("2026-10-02T09:01:00Z", "anonymiser_fichier", { confirmer: true }, "TABLEAU CODÉ NOM-001\nCHIFFRES : 4 nombre(s) protégé(s) en mode GABARIT — valeurs factices"),
    e("2026-10-03T10:00:00Z", "anonymiser_fichier", { confirmer: true }, "⚠️ Clé d'équipe injoignable"),
    e("2026-10-03T11:00:00Z", "anonymiser_fichier", { confirmer: true }, "OK\nCHIFFRES : mode CLAIR demandé — les montants…"),
    e("2026-09-30T08:00:00Z", "deanonymiser", { contenu: "NOM-001" }, "✅ décodé"),
    e("2026-10-04T08:00:00Z", "journal_ia", {}, "✅ Aucune valeur réelle"),
  ], unreadable: 0 };
  const s = posteStats(journal, null, { poste: "a1b2c3d4e5f6", nom: "Me Test", version: "2.4.0", licence: "equipe" });
  assert.deepEqual(s.mois["2026-10"], { fichiers: 2, plans: 1, bloques: 1, decodages: 0, preuves: 1, fuites: 0, formes: 0, chiffres: { gabarit: 1, indice: 0, clair: 1 } });
  assert.equal(s.mois["2026-09"].decodages, 1);
  assert.equal(s.dernier, "2026-10-03T11:00:00Z");
  assert.equal(s.codes.NOM, 1);
  // Que des comptes : ni texte, ni demande.
  assert.ok(!JSON.stringify(s).includes("TABLEAU"));
});

test("agrégat : postes inactifs, montants en clair, versions en retard, portes ouvertes", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  const m = (o) => ({ fichiers: 0, plans: 0, bloques: 0, decodages: 0, preuves: 0, fuites: 0, formes: 0, chiffres: { gabarit: 0, indice: 0, clair: 0 }, ...o });
  const g = aggregate([
    { v: 1, poste: "aaaaaaaaaaaa", nom: "Me A", version: "2.4.0", dernier: "2026-10-20T10:00:00Z", risques: 0, codes: { NOM: 3 }, mois: { "2026-10": m({ fichiers: 12, chiffres: { gabarit: 11, indice: 0, clair: 1 } }) } },
    { v: 1, poste: "bbbbbbbbbbbb", nom: "Me B", version: "2.3.1", dernier: "2026-08-01T10:00:00Z", risques: 1, codes: { NOM: 2 }, mois: { "2026-08": m({ fichiers: 3 }), "2026-05": m({ fichiers: 50 }) } },
  ], { now, months: 3 });
  assert.equal(g.fichiers, 15, "mai 2026 est hors de la fenêtre de 3 mois");
  assert.equal(g.actifs, 1);
  assert.equal(g.risques, 1);
  assert.equal(g.codes.NOM, 5);
  const txt = g.alertes.map((a) => `${a.poste}: ${a.texte}`).join("\n");
  assert.match(txt, /Me A: 1 fichier\(s\) envoyé\(s\) avec les montants EN CLAIR/);
  assert.match(txt, /Me B: Aucun fichier protégé depuis 81 jours/);
  assert.match(txt, /Me B: Version 2\.3\.1/);
  assert.match(txt, /Me B: 1 porte\(s\) ouverte\(s\)/);
  const html = renderCoverage(g, { version: "2.4.0", org: "Cabinet <Test>", generatedAt: now });
  assert.match(html, /Cabinet &lt;Test&gt;/);
  assert.match(html, /1\/2<\/b>/);
  assert.ok(!/<script|https?:\/\//.test(html), "page autonome, hors ligne");
});

test("deux postes : chacun dépose ses comptes, la page couvre l'équipe, rien de nominatif ne va à l'IA", async () => {
  const a = await connect(poste("poste-A", [["Benali", "Karim", 12000], ["Tazi", "Mehdi", 8000]]), "Me Lahlou");
  const b = await connect(poste("poste-B", [["Chraibi", "Omar", 5000]]), "Accueil Zerouali");
  await a.call("anonymiser_fichier", { nom_fichier: "Dossiers Benali.xlsx", confirmer: true });
  await b.call("anonymiser_fichier", { nom_fichier: "Dossiers Benali.xlsx" });   // plan seulement
  await b.call("rapport_couverture");   // dépose les comptes de B
  const res = await a.call("rapport_couverture");
  assert.match(res, /Équipe : 1\/2 poste\(s\) actif\(s\)/);
  assert.match(res, /Plans présentés non confirmés : 1/);
  for (const v of ["Lahlou", "Zerouali", "Benali", "Tazi", "12000", "Chraibi"]) assert.ok(!res.includes(v), `« ${v} » renvoyé à l'IA`);

  const stats = fs.readdirSync(teamDir).filter((n) => n.startsWith("stats-poste-"));
  assert.equal(stats.length, 2);
  for (const n of stats) {
    const raw = fs.readFileSync(path.join(teamDir, n), "utf8");
    for (const v of ["Benali", "Karim", "Tazi", "12000", "Chraibi", "Dossiers", "NOM-"]) assert.ok(!raw.includes(v), `« ${v} » dans ${n}`);
  }
  const page = fs.readFileSync(path.join(teamDir, "RAPPORT-COUVERTURE-NANOMIZER.html"), "utf8");
  assert.match(page, /Me Lahlou/);
  assert.match(page, /Accueil Zerouali/);
  assert.match(page, /Cabinet Test/);
  for (const v of ["Benali", "Karim", "12000", "Chraibi"]) assert.ok(!page.includes(v), `« ${v} » dans la page`);
});

test("les comptes et le rapport ne sont jamais servis à l'IA", async () => {
  const work = path.join(root, "poste-A");
  for (const n of ["stats-poste-aaaaaaaaaaaa.json", "RAPPORT-COUVERTURE-NANOMIZER.html"]) fs.writeFileSync(path.join(work, n), "{}");
  const c = await connect(work, "Me Lahlou");
  for (const n of ["stats-poste-aaaaaaaaaaaa.json", "RAPPORT-COUVERTURE-NANOMIZER.html"]) {
    const res = await c.raw("anonymiser_fichier", { nom_fichier: n });
    assert.ok(res.isError, `${n} servi à l'IA`);
  }
});
