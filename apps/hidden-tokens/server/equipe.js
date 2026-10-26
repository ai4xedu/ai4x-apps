// ============================================================================
// CLÉ D'ÉQUIPE (v2.3) — tout le cabinet code « Benali » en NOM-48291374,
// sans serveur et sans synchronisation.
//
// Deux idées :
//   1. CODES DÉTERMINISTES. En mode équipe, le code d'une valeur est tiré d'une
//      empreinte HMAC-SHA256 de la valeur avec un SECRET d'équipe : chaque poste
//      calcule le même code pour la même valeur, sans se parler. Sans le secret,
//      personne — ni le fournisseur d'IA, ni un tiers — ne peut calculer le code
//      d'un nom deviné : les codes ne trahissent rien.
//   2. UN DOSSIER PARTAGÉ, UN FICHIER PAR POSTE. Le dossier d'équipe (NAS,
//      serveur de fichiers) contient le secret et un fichier de clé par poste.
//      Chaque poste n'écrit QUE le sien et lit tous les autres : pas de
//      verrou, pas de conflit d'écriture, et le code d'un collègue se décode
//      partout.
// Le secret n'est jamais envoyé à l'IA (le dossier est refusé par
// FORBIDDEN_RX) ; il n'est pas non plus recopié dans la clé locale.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const TEAM_FILE = ".nanomizer-equipe.json";
const POSTE_RX = /^cle-poste-[a-z0-9-]+\.json$/i;

export class TeamUnavailable extends Error {}

/* Ouvre (ou crée, pour le premier poste) l'équipe. Création exclusive : deux
   postes qui démarrent ensemble ne peuvent pas écrire deux secrets. */
export function openTeam(dir, posteId) {
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new TeamUnavailable("dossier d'équipe introuvable ou inaccessible");
  }
  const file = path.join(dir, TEAM_FILE);
  if (!fs.existsSync(file)) {
    const team = { v: 1, secret: crypto.randomBytes(32).toString("base64"), cree: new Date().toISOString() };
    try { fs.writeFileSync(file, JSON.stringify(team), { encoding: "utf8", flag: "wx" }); }
    catch (e) { if (e.code !== "EEXIST") throw new TeamUnavailable(`impossible d'écrire dans le dossier d'équipe (${e.code})`); }
  }
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, "utf8")); } catch { raw = null; }
  if (!raw || typeof raw.secret !== "string" || Buffer.from(raw.secret, "base64").length < 32) {
    throw new TeamUnavailable("fichier d'équipe illisible — il ne doit pas être modifié à la main");
  }
  return { dir, secret: Buffer.from(raw.secret, "base64"), cree: raw.cree, posteFile: path.join(dir, `cle-poste-${posteId}.json`) };
}

/* Toutes les correspondances connues de l'équipe (union des fichiers de poste). */
export function readTeamEntries(team) {
  const out = [];
  let postes = 0;
  for (const n of fs.readdirSync(team.dir).filter((x) => POSTE_RX.test(x))) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(team.dir, n), "utf8"));
      if (Array.isArray(raw.entries)) { out.push(...raw.entries); postes++; }
    } catch {}   // un fichier en cours d'écriture par un collègue : relu au prochain appel
  }
  return { entries: out, postes };
}

/* Écrit le fichier de CE poste (atomique : fichier temporaire puis renommage). */
export function writePosteEntries(team, entries) {
  const tmp = `${team.posteFile}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ maj: new Date().toISOString(), entries }), "utf8");
  fs.renameSync(tmp, team.posteFile);
}

/* Code déterministe : PRÉFIXE-NNNNNNNN (8 chiffres). En cas de collision
   (rarissime : même empreinte pour deux valeurs), on sonde l'indice suivant. */
export function teamCode(secret, prefix, norm, taken) {
  for (let i = 0; ; i++) {
    const h = crypto.createHmac("sha256", secret).update(`${prefix}|${norm}|${i}`).digest();
    const code = `${prefix}-${(h.readUInt32BE(0) % 90000000) + 10000000}`;
    if (!taken(code)) return code;
  }
}
