// C2 (v2.12) : le connecteur devient CLIENT de la sentinelle quand elle tient
// son dossier de travail, et un seul processus écrit la clé. Une fausse
// sentinelle (util-prise.mjs) sert la prise locale ; le connecteur est lancé
// par le vrai protocole MCP (stdio), comme Claude Desktop le fait.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import * as XLSX from "xlsx";
import * as _fs from "node:fs";
XLSX.set_fs(_fs);

import { mint } from "./licence-test.mjs";
import { fausseSentinelle } from "./util-prise.mjs";
import {
  creerClientSentinelle, dossierSentinelle, cheminPrise, lireJeton, appelerPrise, sonderSentinelle,
  OUTILS_PRISE, PriseInjoignable, PriseRefus, PriseDelai, delaiPour,
} from "../server/sentinelle.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");
const LICENCE = mint({ v: 1, org: "Suite de tests", seats: 99, iat: "2026-01-01", exp: new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10) });

const resultText = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
const KEY = (workdir) => path.join(workdir, "Anonymiseur-Ai4x", "cle-de-session.json");

/* Un dossier de travail avec un vrai classeur à coder. */
function workdirAvecClients() {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-c2-"));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Nom", "Prénom", "Téléphone"],
    ["El Amrani", "Yassine", "06 61 23 45 67"],
    ["Benkirane", "Salma", "06 62 98 76 54"],
  ]), "Clients");
  XLSX.writeFile(wb, path.join(workdir, "clients.xlsx"));
  return workdir;
}

async function connecter({ workdir, sentinelleDir, env = {} }) {
  const client = new Client({ name: "c2", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: LICENCE, ANX_TEAM_DIR: "", ANX_ENROLEMENT: "", ANX_SENTINELLE: "", NANOMIZER_SENTINELLE_DIR: sentinelleDir, ...env },
  }));
  return client;
}

const aNettoyer = [];
after(() => { for (const d of aNettoyer) fs.rmSync(d, { recursive: true, force: true }); });
function temp(prefix) { const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); aNettoyer.push(d); return d; }

/* ----------------------------------------------------- le client, seul */

test("découverte du dossier de la sentinelle : la variable d'environnement prime, sinon la plateforme", () => {
  assert.equal(dossierSentinelle({ NANOMIZER_SENTINELLE_DIR: "/tmp/x/../s" }, "darwin"), path.resolve("/tmp/s"));
  assert.equal(dossierSentinelle({}, "darwin"), path.join(os.homedir(), "Library", "Application Support", "Nanomizer"));
  assert.equal(dossierSentinelle({}, "linux"), path.join(os.homedir(), ".config", "nanomizer"));
  assert.equal(dossierSentinelle({ XDG_CONFIG_HOME: "/etc/xdg" }, "linux"), path.join("/etc/xdg", "nanomizer"));
  assert.equal(dossierSentinelle({ APPDATA: "C:\\Users\\u\\AppData\\Roaming" }, "win32"), path.join("C:\\Users\\u\\AppData\\Roaming", "Nanomizer"));
  assert.equal(cheminPrise("/d", "linux"), path.join("/d", "prise.sock"));
  assert.match(cheminPrise("/d", "win32"), /^\\\\\.\\pipe\\nanomizer-sentinelle-[0-9a-f]{12}$/);
});

test("le jeton se lit mais ne se fabrique jamais ; sans jeton ou sans prise, la sentinelle est injoignable", async () => {
  const dir = temp("anx-sent-");
  assert.equal(lireJeton(dir), null);
  assert.ok(!fs.existsSync(path.join(dir, "jeton")), "le connecteur a créé un jeton");
  fs.writeFileSync(path.join(dir, "jeton"), "pas-un-jeton\n");
  assert.equal(lireJeton(dir), null);
  const client = creerClientSentinelle({ env: { NANOMIZER_SENTINELLE_DIR: dir } });
  await assert.rejects(client.ping(), PriseInjoignable);
  fs.writeFileSync(path.join(dir, "jeton"), "a".repeat(64) + "\n");
  await assert.rejects(client.ping(), PriseInjoignable);   // jeton là, prise absente
  const s = await sonderSentinelle(client, dir);
  assert.deepEqual(s, { tenue: false, version: null, raison: "absente" });
});

test("ping, etat, outil ; mauvais jeton refusé ; outil hors liste refusé ; délai dépassé distingué", async () => {
  const dir = temp("anx-sent-");
  const fausse = fausseSentinelle({ dir, dossiers: ["/cabinet/dossier-a"], version: "0.1.0", outil: async ({ nom }) => {
    if (nom === "lire_scan") await new Promise((r) => setTimeout(r, 400));
    return { texte: `ok ${nom}`, erreur: nom === "deanonymiser" };
  } });
  await fausse.demarrer();
  const client = creerClientSentinelle({ env: { NANOMIZER_SENTINELLE_DIR: dir } });
  assert.deepEqual(await client.ping(), { version: "0.1.0", nom: "nanomizer-sentinelle" });
  assert.equal((await client.etat()).dossiers[0].chemin, "/cabinet/dossier-a");
  assert.deepEqual(await client.outil({ dossier: "/cabinet/dossier-a", nom: "etat_cle", args: {} }), { texte: "ok etat_cle", erreur: false });
  assert.equal((await client.outil({ dossier: "/cabinet/dossier-a", nom: "deanonymiser", args: {} })).erreur, true);
  await assert.rejects(client.outil({ dossier: "/cabinet/dossier-a", nom: "reinitialiser_cle", args: {} }), PriseRefus);
  await assert.rejects(client.outil({ dossier: "/ailleurs", nom: "etat_cle", args: {} }), /dossier non surveillé/);
  await assert.rejects(appelerPrise({ chemin: fausse.chemin, jeton: "0".repeat(64), methode: "ping" }), PriseRefus);
  await assert.rejects(appelerPrise({ chemin: fausse.chemin, jeton: fausse.jeton, methode: "outil", params: { dossier: "/cabinet/dossier-a", nom: "lire_scan", args: {} }, delai: 50 }), PriseDelai);
  assert.ok(delaiPour("anonymiser_dossier") > delaiPour("etat_cle"));
  // Le jeton est relu à chaque appel : jumelage sans redémarrage.
  fs.writeFileSync(path.join(dir, "jeton"), "f".repeat(64) + "\n");
  await assert.rejects(client.ping(), PriseRefus);
  assert.ok(!OUTILS_PRISE.has("reinitialiser_cle"));
  assert.ok(fausse.appels.every((a) => a.params.nom !== "reinitialiser_cle" || a.methode === "outil"));
  await fausse.arreter();
});

/* ------------------------------------------- le connecteur en mode client */

test("E2E — prise présente et dossier tenu : les outils de la liste sont transmis, la clé n'est pas écrite ici, le journal l'est", async () => {
  const workdir = temp("anx-c2-");
  const dir = temp("anx-sent-");
  fs.writeFileSync(path.join(workdir, "note.txt"), "RAS");
  const fausse = fausseSentinelle({ dir, dossiers: [workdir] });
  await fausse.demarrer();
  const client = await connecter({ workdir, sentinelleDir: dir });
  try {
    assert.match(client.getInstructions() || "", /clé tenue par la sentinelle Nanomizer \(v0\.1\.0\)/);

    const res = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "note.txt", confirmer: true } });
    const out = resultText(res);
    assert.match(out, /Clé tenue par la sentinelle Nanomizer v0\.1\.0/);
    assert.match(out, /✓ anonymiser_fichier codé par la sentinelle/);
    assert.ok(!res.isError);
    const transmis = fausse.appels.filter((a) => a.methode === "outil");
    assert.equal(transmis.length, 1);
    assert.deepEqual(transmis[0].params, { dossier: workdir, nom: "anonymiser_fichier", args: { nom_fichier: "note.txt", confirmer: true } });
    // Un seul écrivain de clé : rien n'est écrit par ce connecteur.
    assert.ok(!fs.existsSync(KEY(workdir)), "le connecteur a écrit la clé alors que la sentinelle la tient");
    assert.ok(!fs.existsSync(path.join(workdir, "Anonymiseur-Ai4x", "note-anonymise.md")), "le connecteur a codé localement");

    // La bannière de mode ne se répète pas tant que le mode ne change pas…
    const res2 = await client.callTool({ name: "lister_fichiers", arguments: {} });
    assert.ok(!/Clé tenue par la sentinelle/.test(resultText(res2)));
    // …sauf dans etat_cle, qui la montre toujours (transmis lui aussi).
    const etat = resultText(await client.callTool({ name: "etat_cle", arguments: {} }));
    assert.match(etat, /Clé tenue par la sentinelle Nanomizer/);
    assert.match(etat, /✓ etat_cle codé par la sentinelle/);

    // reinitialiser_cle reste local : la prise ne le voit jamais.
    const reinit = await client.callTool({ name: "reinitialiser_cle", arguments: { confirmer: true } });
    assert.match(resultText(reinit), /déjà vierge/);
    assert.ok(!fausse.appels.some((a) => a.methode === "outil" && a.params.nom === "reinitialiser_cle"));

    // Le journal « ce que l'IA a vu » est tenu côté connecteur, même en mode client.
    const journalDir = path.join(workdir, "Anonymiseur-Ai4x", "journal-ia");
    const lignes = fs.readdirSync(journalDir).flatMap((f) => fs.readFileSync(path.join(journalDir, f), "utf8").trim().split("\n")).map((l) => JSON.parse(l));
    assert.ok(lignes.some((l) => l.outil === "anonymiser_fichier" && /codé par la sentinelle/.test(l.texte)));
    assert.ok(lignes.some((l) => /protocole/.test(l.outil) && /tenue par la sentinelle/.test(l.texte)));
  } finally {
    await client.close();
    await fausse.arreter();
  }
});

test("E2E — la prise tombe entre deux appels : repli immédiat sur le moteur embarqué, dit en une ligne ; elle revient : transmis à nouveau", async () => {
  const workdir = workdirAvecClients(); aNettoyer.push(workdir);
  const dir = temp("anx-sent-");
  let fausse = fausseSentinelle({ dir, dossiers: [workdir] });
  await fausse.demarrer();
  const client = await connecter({ workdir, sentinelleDir: dir });
  try {
    assert.match(resultText(await client.callTool({ name: "lister_fichiers", arguments: {} })), /codé par la sentinelle/);
    // La prise tombe PENDANT que le connecteur la croit encore là (cache de
    // découverte de 2 s) : l'appel d'outil échoue sur la prise → repli.
    await fausse.arreter();
    const res = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx", confirmer: true } });
    const out = resultText(res);
    assert.match(out, /Sentinelle Nanomizer injoignable, moteur local/);
    assert.match(out, /NOM-001/);
    assert.ok(!out.includes("El Amrani"), "un nom réel a fui");
    assert.ok(fs.existsSync(KEY(workdir)), "le moteur local n'a pas écrit la clé");
    assert.ok(fs.existsSync(path.join(workdir, "Anonymiseur-Ai4x", "clients-anonymise.xlsx")));
    // Le mode local est annoncé une fois ; etat_cle le redit.
    assert.match(resultText(await client.callTool({ name: "etat_cle", arguments: {} })), /Moteur local : la clé est tenue par ce connecteur \(sentinelle Nanomizer injoignable\)/);

    // Sentinelle relancée (même dossier, nouveau jeton) : jumelée sans redémarrer Claude.
    fausse = fausseSentinelle({ dir, dossiers: [workdir] });
    await fausse.demarrer();
    await new Promise((r) => setTimeout(r, 2_100));
    const re = resultText(await client.callTool({ name: "lister_fichiers", arguments: {} }));
    assert.match(re, /Clé tenue par la sentinelle/);
    assert.match(re, /✓ lister_fichiers codé par la sentinelle/);
  } finally {
    await client.close();
    await fausse.arreter();
  }
});

test("E2E — prise présente mais dossier non tenu, ou ANX_SENTINELLE=non : moteur local, la prise ne reçoit aucun outil", async () => {
  const dir = temp("anx-sent-");
  const fausse = fausseSentinelle({ dir, dossiers: ["/un/autre/dossier"] });
  await fausse.demarrer();
  for (const [env, raison] of [[{}, "ne tient pas ce dossier"], [{ ANX_SENTINELLE: "non" }, "désactivée \\(ANX_SENTINELLE=non\\)"]]) {
    if (env.ANX_SENTINELLE) { fausse.dossiers.length = 0; }
    const workdir = workdirAvecClients(); aNettoyer.push(workdir);
    if (env.ANX_SENTINELLE) fausse.dossiers.push(workdir);   // tenu, mais forcé en local
    const client = await connecter({ workdir, sentinelleDir: dir, env });
    try {
      assert.match(client.getInstructions() || "", new RegExp(`moteur local \\(sentinelle Nanomizer ${raison}\\)`));
      const avant = fausse.appels.length;
      const out = resultText(await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "clients.xlsx", confirmer: true } }));
      assert.match(out, /NOM-001/);
      assert.match(out, new RegExp(`Moteur local : la clé est tenue par ce connecteur \\(sentinelle Nanomizer ${raison}\\)`));
      assert.ok(fs.existsSync(KEY(workdir)));
      assert.ok(!fausse.appels.slice(avant).some((a) => a.methode === "outil"), "un outil est parti vers la prise");
      if (env.ANX_SENTINELLE) assert.equal(fausse.appels.slice(avant).length, 0, "ANX_SENTINELLE=non a quand même sondé la prise");
    } finally { await client.close(); }
  }
  await fausse.arreter();
});
