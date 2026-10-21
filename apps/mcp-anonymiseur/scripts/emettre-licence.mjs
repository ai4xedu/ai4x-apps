#!/usr/bin/env node
// ============================================================================
// ÉMISSION D'UNE CLÉ DE LICENCE (usage interne Ai4x — jamais dans le bundle).
//
// La clé privée n'est PAS dans ce dépôt : elle vit hors git (par défaut sur le
// Bureau). Sans elle, impossible d'émettre ; avec elle, n'importe qui le peut.
// Ne jamais l'envoyer, ne jamais la committer, ne jamais la coller dans un chat.
//
// Usage :
//   node scripts/emettre-licence.mjs --org "Maître Sekkat"                        ← Solo, 1 an (390 € HT)
//   node scripts/emettre-licence.mjs --org "Cabinet Sekkat" --postes 5            ← Cabinet, 1 an (5 × 290 € HT)
//   node scripts/emettre-licence.mjs --org "Cabinet Sekkat" --postes 5 --depuis 2027-10-21
//                                     ← RENOUVELLEMENT : l'année repart de l'échéance précédente, pas d'aujourd'hui
//   node scripts/emettre-licence.mjs --org "Pilote X" --postes 3 --mois 3 --note "pilote payant"
//   node scripts/emettre-licence.mjs --org "Maître X" --a-vie                     ← DROITS ACQUIS uniquement :
//                                     réémission d'une licence à vie vendue avant le 21/10/2026
//
// Sortie : la clé NANO1.… à copier au client (réglage « Clé de licence » de
// l'extension, ou fichier licence.txt dans son dossier de travail).
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { issueSealIdentity } from "../server/sceau.js";

const PRIVATE_KEY_FILE = process.env.NANOMIZER_PRIVATE_KEY_FILE ||
  path.join(os.homedir(), "Desktop", "nanomizer-cle-privee-NE-JAMAIS-PARTAGER.txt");

function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const org = arg("org", "");
const seats = parseInt(arg("postes", "1"), 10);
const months = parseInt(arg("mois", "12"), 10);
const note = arg("note", "");
const lifetime = process.argv.includes("--a-vie");
const since = arg("depuis", "");

if (!org) {
  console.error("Il faut au moins --org \"Nom du cabinet\". Voir l'en-tête du script.");
  process.exit(1);
}
if (!fs.existsSync(PRIVATE_KEY_FILE)) {
  console.error(`Clé privée introuvable : ${PRIVATE_KEY_FILE}\n` +
    "Définis NANOMIZER_PRIVATE_KEY_FILE si elle est ailleurs.");
  process.exit(1);
}

/* Le fichier contient un bandeau d'avertissement + la clé en base64 : on prend
   la dernière ligne non vide qui ressemble à du base64. */
const raw = fs.readFileSync(PRIVATE_KEY_FILE, "utf8")
  .split("\n").map((l) => l.trim())
  .filter((l) => l.length > 40 && /^[A-Za-z0-9+/=]+$/.test(l)).pop();
const privateKey = crypto.createPrivateKey({
  key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8",
});

const now = new Date();
if (since && Number.isNaN(new Date(since + "T00:00:00").getTime())) {
  console.error(`--depuis attend une date AAAA-MM-JJ (l'échéance de la licence précédente), reçu : ${since}`);
  process.exit(1);
}
const start = since && new Date(since + "T00:00:00") > now ? new Date(since + "T00:00:00") : now;
const exp = new Date(start.getTime());
exp.setMonth(exp.getMonth() + months);
// Date LOCALE, pas UTC : « --depuis 2027-03-15 » est minuit à Casablanca ou
// Paris, soit la veille en UTC — toISOString() faisait perdre un jour à
// chaque renouvellement.
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* Licence à vie : `exp` lointain ET drapeau `life`. Le drapeau fait afficher
   « à vie » par la v2 ; la date lointaine fait accepter la clé par une v1.6
   déjà installée (elle ne connaît pas le drapeau). */
const payload = {
  v: 1,
  org,
  seats,
  iat: iso(now),
  exp: lifetime ? "9999-12-31" : iso(exp),
  id: crypto.randomUUID().slice(0, 8),
};
if (lifetime) payload.life = true;
if (note) payload.note = note;
// v2.6 — le sceau : un certificat du cabinet signé par Ai4x et sa clé de
// sceau, pour délivrer à ses clients des sceaux vérifiables (server/sceau.js).
payload.sceau = issueSealIdentity(privateKey, { org, id: payload.id, iat: payload.iat, exp: payload.exp });

const b64url = (buf) => Buffer.from(buf).toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
const sig = b64url(crypto.sign(null, Buffer.from(body), privateKey));
const key = `NANO1.${body}.${sig}`;

console.log("\n════ LICENCE ÉMISE ════");
console.log(`Titulaire : ${payload.org}`);
console.log(`Postes    : ${payload.seats}`);
console.log(lifetime ? `Validité  : À VIE (émise le ${payload.iat})` : `Validité  : ${payload.iat} → ${payload.exp} (${months} mois)`);
console.log(`Référence : ${payload.id}${note ? "  · " + note : ""}`);
console.log("\nClé à transmettre au client :\n");
console.log(key);
console.log("\nInstallation côté client : Claude Desktop → réglages de l'extension");
console.log("« Nanomizer » → champ « Clé de licence » → coller → REDÉMARRER Claude Desktop.");
console.log("(Ou déposer la clé dans un fichier licence.txt à la racine du dossier de travail.)\n");
console.log("──── Message WhatsApp prêt à envoyer (avec le fichier .mcpb en pièce jointe) ────\n");
console.log(`Merci ${payload.org} ! Votre paiement est bien reçu. Voici votre connecteur et votre clé ${lifetime ? "à vie" : `(abonnement valable jusqu'au ${payload.exp})`}.

1. Ouvrez le fichier joint anonymiseur-ai4x.mcpb : Claude Desktop propose « Installer ».
2. Choisissez votre dossier de travail (hors iCloud / Google Drive / Dropbox).
3. Dans le champ « Clé de licence », collez la clé ci-dessous, puis REDÉMARREZ Claude Desktop.
4. Demandez à Claude : « vérifie le confinement » — il vous dira si une autre extension voit votre dossier.
5. La même clé débloque l'appli web : https://ai4x.academy/anonymiseur-local.html → « J'ai une clé » (tableaux illimités, mode document, diagnostic).

Votre clé (à garder, elle ne doit pas être partagée) :
${key}`);
console.log("");
