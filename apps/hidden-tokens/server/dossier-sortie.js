// ============================================================================
// LE DOSSIER DE SORTIE — « Hidden-Tokens/ » dans le dossier de travail (v2.14).
//
// Jusqu'à la v2.13, il s'appelait « Anonymiseur-Ai4x/ ». Il contient la clé de
// correspondance : un renommage raté, c'est un dossier dont on ne peut plus
// décoder les copies. D'où trois règles :
//   1. Le nouveau dossier existe → c'est lui.
//   2. Seul l'ancien existe → on le renomme d'un bloc (fs.renameSync, atomique
//      sur un même volume) ; s'il refuse (droits, verrou, autre volume), on
//      continue sur l'ancien, sans rien copier ni perdre.
//   3. Aucun des deux → le nouveau, créé au premier fichier codé.
// Si les deux existent (un ancien connecteur a réécrit l'ancien après la
// migration), on garde le nouveau et on le signale : la clé n'est pas fusionnée
// en silence.
// ============================================================================
import fs from "node:fs";
import path from "node:path";

export const OUTDIR_NAME = "Hidden-Tokens";
export const ANCIEN_OUTDIR_NAME = "Anonymiseur-Ai4x";
/* Pour qui doit ignorer le dossier de sortie (la sentinelle, le scan des
   fichiers) : les deux noms, tant que des postes portent l'ancien. */
export const NOMS_SORTIE = [OUTDIR_NAME, ANCIEN_OUTDIR_NAME];

export function resoudreSortie(workdir, { rename = fs.renameSync } = {}) {
  const neuf = path.join(workdir, OUTDIR_NAME);
  const ancien = path.join(workdir, ANCIEN_OUTDIR_NAME);
  const existe = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
  if (existe(neuf)) return { dir: neuf, nom: OUTDIR_NAME, migre: false, ancienRestant: existe(ancien) };
  if (!existe(ancien)) return { dir: neuf, nom: OUTDIR_NAME, migre: false, ancienRestant: false };
  try {
    rename(ancien, neuf);
    return { dir: neuf, nom: OUTDIR_NAME, migre: true, ancienRestant: false };
  } catch (e) {
    // Deux processus au démarrage (Claude Desktop et la sentinelle) : l'autre
    // vient peut-être de renommer à notre place.
    if (existe(neuf) && !existe(ancien)) return { dir: neuf, nom: OUTDIR_NAME, migre: false, ancienRestant: false };
    return { dir: ancien, nom: ANCIEN_OUTDIR_NAME, migre: false, ancienRestant: false, erreur: e.code || e.message };
  }
}

/* Une ligne pour etat_cle, ou "" quand il n'y a rien à dire. */
export function decrireSortie(r) {
  if (r.migre) return `Dossier de sortie : « ${ANCIEN_OUTDIR_NAME} » renommé « ${OUTDIR_NAME} » (Hidden Tokens), clé et copies comprises.`;
  if (r.erreur) return `⚠️ Dossier de sortie : « ${ANCIEN_OUTDIR_NAME} » n'a pas pu être renommé (${r.erreur}) ; le travail continue dedans.`;
  if (r.ancienRestant) return `⚠️ Un ancien dossier « ${ANCIEN_OUTDIR_NAME} » existe encore à côté de « ${OUTDIR_NAME} » : un connecteur antérieur à la v2.14 tourne peut-être encore. Mettez-le à jour ; la clé utilisée est celle de « ${OUTDIR_NAME} ».`;
  return "";
}
