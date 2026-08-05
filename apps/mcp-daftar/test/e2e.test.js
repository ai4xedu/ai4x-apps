// E2E : on parle au serveur via le VRAI protocole MCP (stdio), comme Claude
// Desktop le fera. Deux invariants sont vérifiés ici et nulle part ailleurs :
//
//   RÈGLE N°1 — aucune écriture douteuse dans le journal importable.
//   RÈGLE N°2 — aucun nom ni ICE de tiers dans un résultat d'outil.
//
// Le reste (extraction, contrôles, mémoire) est couvert par les tests purs :
// ici on éprouve l'assemblage réel, celui qui sera installé chez le client.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { LOT_COMPLET, NOMS_SENSIBLES, ICE_SOCIETE } from "./factures.mjs";
import { writeMinimalPdf, FACTURE_PDF_LIGNES } from "./util-pdf.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");

const DOSSIER = "Menara Distribution";
let client, workdir, sortie;

function texte(res) {
  return res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
}

async function appel(nom, args) {
  return texte(await client.callTool({ name: nom, arguments: args }));
}

/* Le contrôle de la règle n°2, appliqué à TOUT ce qui sort d'un outil. */
function aucunTiersEnClair(sortieOutil, contexte) {
  for (const secret of NOMS_SENSIBLES) {
    assert.ok(
      !sortieOutil.includes(secret),
      `FUITE (${contexte}) : « ${secret} » apparaît dans un résultat d'outil.`
    );
  }
}

before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "daftar-e2e-"));
  const lot = path.join(workdir, "lot-juillet");
  fs.mkdirSync(lot);
  for (const [nom, contenu] of Object.entries(LOT_COMPLET)) {
    fs.writeFileSync(path.join(lot, nom), contenu, "utf8");
  }
  writeMinimalPdf(path.join(lot, "piece-07.pdf"), FACTURE_PDF_LIGNES);
  // Un PDF sans couche de texte exploitable : ce que produit un scanner.
  writeMinimalPdf(path.join(lot, "piece-08-scan.pdf"), ["Scan"]);

  sortie = path.join(workdir, "Daftar", "dossiers", "menara-distribution");

  client = new Client({ name: "daftar-e2e", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { ...process.env, DAFTAR_WORKDIR: workdir },
  }));
});

after(async () => {
  await client?.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});

test("les 5 outils sont exposés", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((t) => t.name).sort(),
    ["analyser_lot", "apprendre_compte", "etat_dossier", "exporter_ecritures", "lister_factures"]
  );
});

test("lister_factures voit les pièces et annonce ce qu'il ignore", async () => {
  const out = await appel("lister_factures", { sous_dossier: "lot-juillet" });
  assert.ok(out.includes("piece-01.txt"));
  assert.ok(out.includes("piece-07.pdf"));
  assert.ok(/8 pièce\(s\) lisible/.test(out), out);
});

test("un chemin qui sort du dossier de travail est refusé", async () => {
  const out = await appel("lister_factures", { sous_dossier: "../../../etc" });
  assert.ok(out.includes("Chemin refusé"), out);
});

test("analyser_lot rend un PLAN codé — et ne fuite aucun tiers", async () => {
  const out = await appel("analyser_lot", {
    dossier: DOSSIER, sous_dossier: "lot-juillet", ice_societe: ICE_SOCIETE,
  });
  aucunTiersEnClair(out, "analyser_lot");
  assert.ok(out.includes("FOURN-001"), "les tiers sont désignés par un code");
  assert.ok(out.includes("PLAN"), "rien n'est exporté à ce stade");
  assert.ok(out.includes("Premier lot"), "on prévient que la mémoire est vide");
  assert.ok(/7 pièce\(s\) lue\(s\)/.test(out), out);
});

test("le PDF scanné est refusé honnêtement, pas compté comme « rien détecté »", async () => {
  const out = await appel("analyser_lot", { dossier: DOSSIER, sous_dossier: "lot-juillet" });
  assert.ok(out.includes("piece-08-scan.pdf"));
  assert.ok(out.includes("PDF scanné"), out);
  assert.ok(out.includes("OCR"), "on dit quoi faire en attendant");
});

test("les raisons de douter sont exploitables par un comptable", async () => {
  const out = await appel("analyser_lot", { dossier: DOSSIER, sous_dossier: "lot-juillet" });
  assert.ok(out.includes("HT + TVA ≠ TTC"), out);
  assert.ok(out.includes("Numéro de facture introuvable"));
  assert.ok(out.includes("reconstitué par calcul"));
  assert.ok(out.includes("proposé par le socle"), "l'opérateur télécom est proposé, pas imposé");
});

test("le tableau nominatif, lui, est bien écrit sur le disque", () => {
  const fichiers = fs.readdirSync(sortie);
  const revision = fichiers.find((f) => f.startsWith("revision-"));
  assert.ok(revision, `attendu un revision-*.csv dans ${sortie}, vu ${fichiers}`);
  const contenu = fs.readFileSync(path.join(sortie, revision), "utf8");
  assert.ok(contenu.includes("ATLAS NEGOCE SARL"), "sur le poste, tout est en clair");
  assert.ok(contenu.includes("À VÉRIFIER"));
  assert.ok(!fichiers.some((f) => f.startsWith("journal-")), "aucun journal avant confirmation");
});

test("apprendre_compte se pilote par code et fait basculer la pièce en sûre", async () => {
  const appris = await appel("apprendre_compte", {
    dossier: DOSSIER, tiers: "FOURN-001", compte: "61253", libelle: "Fournitures de bureau",
  });
  aucunTiersEnClair(appris, "apprendre_compte");
  assert.ok(appris.includes("FOURN-001"));
  assert.ok(appris.includes("61253"));

  const apres = await appel("analyser_lot", { dossier: DOSSIER, sous_dossier: "lot-juillet" });
  aucunTiersEnClair(apres, "analyser_lot après apprentissage");
  assert.ok(/2 sûre\(s\)/.test(apres), `les deux pièces du fournisseur appris passent : ${apres}`);
});

test("un tiers inconnu du carnet est refusé avec une explication", async () => {
  const out = await appel("apprendre_compte", { dossier: DOSSIER, tiers: "FOURN-404", compte: "61253" });
  assert.ok(out.includes("inconnu"), out);
});

test("un compte hors format est refusé plutôt qu'enregistré", async () => {
  const out = await appel("apprendre_compte", { dossier: DOSSIER, tiers: "FOURN-002", compte: "61" });
  assert.ok(out.includes("invalide"), out);
});

test("l'export sans confirmation ne fait rien", async () => {
  const out = await appel("exporter_ecritures", { dossier: DOSSIER, sous_dossier: "lot-juillet", confirmer: false });
  assert.ok(out.includes("annulé"));
  assert.ok(!fs.readdirSync(sortie).some((f) => f.startsWith("journal-")));
});

test("INVARIANT — le journal exporté ne contient QUE des écritures sûres", async () => {
  const out = await appel("exporter_ecritures", { dossier: DOSSIER, sous_dossier: "lot-juillet", confirmer: true });
  aucunTiersEnClair(out, "exporter_ecritures");

  const journal = fs.readdirSync(sortie).find((f) => f.startsWith("journal-"));
  assert.ok(journal, "le journal est écrit");
  const csv = fs.readFileSync(path.join(sortie, journal), "utf8");

  assert.ok(csv.includes("FAC-2026-042"), "les pièces sûres y sont");
  assert.ok(csv.includes("FAC-2026-051"));
  assert.ok(!csv.includes("FAC-2026-077"), "la pièce incohérente n'y entre pas");
  assert.ok(!csv.includes("24612.00"), "ni son montant");
  assert.ok(!csv.includes("2026070033445"), "ni la pièce seulement proposée par le socle");
  assert.ok(!csv.includes("INV-2026-9012"), "ni celle dont le TTC est reconstitué");

  // Toute ligne de charge exportée porte un compte : sinon l'import échoue.
  const lignes = csv.trim().split("\r\n").slice(1);
  for (const l of lignes) {
    const compte = l.split(";")[3];
    assert.ok(/^\d{4,10}$/.test(compte), `compte vide ou invalide exporté : ${l}`);
  }
});

test("la liste de travail reprend ce qui n'a pas été exporté", () => {
  const liste = fs.readdirSync(sortie).find((f) => f.startsWith("a-verifier-"));
  const md = fs.readFileSync(path.join(sortie, liste), "utf8");
  assert.ok(md.includes("HT + TVA ≠ TTC"));
  assert.ok(md.includes("piece-04.txt"), "le justificatif est désigné");
  assert.ok(!md.includes("FAC-2026-042"), "ce qui est parti au journal n'est pas dans la liste");
});

test("un second export détecte les pièces déjà passées", async () => {
  const out = await appel("analyser_lot", { dossier: DOSSIER, sous_dossier: "lot-juillet" });
  assert.ok(out.includes("déjà passé"), `le doublon doit être signalé : ${out}`);
  assert.ok(/0 sûre\(s\)|sûre\(s\)/.test(out));
});

test("etat_dossier ne renvoie que des compteurs", async () => {
  const out = await appel("etat_dossier", { dossier: DOSSIER });
  aucunTiersEnClair(out, "etat_dossier");
  assert.ok(out.includes(ICE_SOCIETE), "l'ICE de la société du dossier, lui, est celui de l'utilisateur");
  assert.ok(/Fournisseurs appris pour ce dossier : 1/.test(out), out);
  assert.ok(/Pièces déjà exportées .*: 2/.test(out), out);
});
