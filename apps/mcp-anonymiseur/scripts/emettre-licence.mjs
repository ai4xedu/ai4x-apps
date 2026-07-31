#!/usr/bin/env node
// ============================================================================
// ÉMISSION D'UNE CLÉ DE LICENCE (usage interne Ai4x — jamais dans le bundle).
//
// La clé privée n'est PAS dans ce dépôt : elle vit hors git (par défaut sur le
// Bureau). Sans elle, impossible d'émettre ; avec elle, n'importe qui le peut.
// Ne jamais l'envoyer, ne jamais la committer, ne jamais la coller dans un chat.
//
// Usage :
//   node scripts/emettre-licence.mjs --org "Cabinet Sekkat" --postes 5 --mois 12
//   node scripts/emettre-licence.mjs --org "Pilote X" --postes 3 --mois 3 --note "pilote gratuit"
//
// Sortie : la clé NANO1.… à copier au client (réglage « Clé de licence » de
// l'extension, ou fichier licence.txt dans son dossier de travail).
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

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
const exp = new Date(now.getTime());
exp.setMonth(exp.getMonth() + months);
const iso = (d) => d.toISOString().slice(0, 10);

const payload = {
  v: 1,
  org,
  seats,
  iat: iso(now),
  exp: iso(exp),
  id: crypto.randomUUID().slice(0, 8),
};
if (note) payload.note = note;

const b64url = (buf) => Buffer.from(buf).toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
const sig = b64url(crypto.sign(null, Buffer.from(body), privateKey));
const key = `NANO1.${body}.${sig}`;

console.log("\n════ LICENCE ÉMISE ════");
console.log(`Titulaire : ${payload.org}`);
console.log(`Postes    : ${payload.seats}`);
console.log(`Validité  : ${payload.iat} → ${payload.exp} (${months} mois)`);
console.log(`Référence : ${payload.id}${note ? "  · " + note : ""}`);
console.log("\nClé à transmettre au client :\n");
console.log(key);
console.log("\nInstallation côté client : Claude Desktop → réglages de l'extension");
console.log("« Anonymiseur de données Ai4x » → champ « Clé de licence » → coller → REDÉMARRER Claude Desktop.");
console.log("(Ou déposer la clé dans un fichier licence.txt à la racine du dossier de travail.)\n");
