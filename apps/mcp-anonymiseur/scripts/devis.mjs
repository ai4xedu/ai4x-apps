#!/usr/bin/env node
// ============================================================================
// DEVIS ET FACTURES NANOMIZER (usage interne YGH — jamais dans le bundle).
//
// Une entreprise achète sur devis et paie sur facture, pas sur un message
// WhatsApp. Ce script produit l'un ou l'autre en HTML A4, à ouvrir dans le
// navigateur puis à « Imprimer → Enregistrer en PDF ».
//
// Les coordonnées légales du vendeur (raison sociale, ICE, IF, RC, patente,
// RIB…) sont lues dans scripts/vendeur.json — hors git ; partir de
// scripts/vendeur.exemple.json.
//
// Usage :
//   node scripts/devis.mjs --client "Payzone SA" --ice-client 001234567000089 --offre equipe --postes 25
//   node scripts/devis.mjs --facture --numero FA-2026-014 --client "Payzone SA" --ice-client … --offre equipe --postes 25 --licence ABC123
//   options : --adresse-client "…" --remise 10 --date 2026-10-21 --sortie dossier/
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chiffrer, renderDocument } from "./devis-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const facture = process.argv.includes("--facture");

const vendeurFile = path.join(here, "vendeur.json");
if (!fs.existsSync(vendeurFile)) {
  console.error(`Coordonnées du vendeur introuvables : ${vendeurFile}\nCopie scripts/vendeur.exemple.json en vendeur.json et complète-le.`);
  process.exit(1);
}
const vendeur = JSON.parse(fs.readFileSync(vendeurFile, "utf8"));
const client = { raison: arg("client", ""), ice: arg("ice-client", ""), adresse: arg("adresse-client", "") };
if (!client.raison) { console.error("Il faut au moins --client \"Raison sociale\". Voir l'en-tête du script."); process.exit(1); }
const date = arg("date", new Date().toISOString().slice(0, 10));
const numero = arg("numero", facture ? "" : `DEV-${date.replace(/-/g, "")}-${client.raison.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()}`);
if (facture && !numero) { console.error("Une facture exige --numero (numérotation continue, ex. FA-2026-014)."); process.exit(1); }
if (facture && !client.ice) console.error("⚠️ ICE du client absent : il est obligatoire sur une facture entre entreprises.");

const calcul = chiffrer({ offre: arg("offre", "equipe"), postes: parseInt(arg("postes", "1"), 10), remisePct: Number(arg("remise", "0")) });
const html = renderDocument({ type: facture ? "facture" : "devis", numero, date, vendeur, client, calcul, licenceRef: arg("licence", "") });
const outDir = path.resolve(arg("sortie", path.join(here, "..", "devis-sortie")));
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${numero}.html`);
fs.writeFileSync(out, html, "utf8");
console.log(`${facture ? "Facture" : "Devis"} ${numero} : ${calcul.ttc.toLocaleString("fr-FR")} MAD TTC (${calcul.ht.toLocaleString("fr-FR")} HT)\n→ ${out}\nOuvre-le dans le navigateur, puis Imprimer → Enregistrer en PDF.`);
