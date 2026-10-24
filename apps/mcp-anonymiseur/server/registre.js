// ============================================================================
// LE REGISTRE DE L'ORGANISATION, CÔTÉ POSTE (v2.19) — SPEC-REGISTRE-ORGANISATION.
//
// Une clé de codes pour toute l'organisation : « Benali » = NOM-48291374 sur
// tous les postes, tous les dossiers, pour toujours. Le registre vit dans le
// dossier partagé de l'organisation, sous registre/, et n'a besoin d'aucun
// serveur : tout y est chiffré ou signé, le partage n'a pas à être de confiance.
//
//   registre.json           écrit par la console admin, signé par sa clé Ed25519 ;
//                           contient, par poste, les secrets scellés (enveloppe.js)
//   entrees/<poste>.jsonl   UN fichier par poste, ajout seul, chaque ligne chiffrée
//                           AES-256-GCM sous K_registre[g] avec une AAD qui nomme
//                           l'organisation, le poste, la génération et le numéro de
//                           ligne : une ligne déplacée ou dupliquée est refusée
//
// Ce module ne fait que ce qu'un poste fait : vérifier la signature, lire
// toutes les entrées qu'il sait déchiffrer, ajouter les siennes. Créer le
// registre, certifier un poste, le retirer, ouvrir le séquestre : console
// admin (apps/nanomizer-admin/lib/registre.js), jamais ici.
//
// Les secrets (K_codes, K_registre[1..g]) arrivent DESCELLÉS de la sentinelle,
// qui tient la clé du poste dans le trousseau : par un descripteur hérité
// (ANX_POSTE_SECRETS_FD) ou un fichier 600 (ANX_POSTE_SECRETS_FICHIER, tests).
// Jamais par une variable d'environnement lisible, jamais sur la ligne de
// commande. Ils ne sont jamais écrits dans la clé locale.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chiffrer, dechiffrer, desceller, infoEnveloppe, canonique, Indechiffrable } from "./enveloppe.js";

export const FORMAT_REGISTRE = "hidden-tokens.registre/1";
export const FORMAT_FICHE = "hidden-tokens.fiche-poste/1";
export const DOSSIER_REGISTRE = "registre";
export const FICHIER_REGISTRE = "registre.json";
export const INFO_ENTREE = "hidden-tokens.entree/1";

export class RegistreIndisponible extends Error {}

export const aadEntree = (org, poste, g, n) => `${INFO_ENTREE}|${org}|${poste}|${g}|${n}`;

/* ------------------------------------------------------------- secrets */

/* { K_codes: base64, K_registre: { "1": base64, … } } → Buffers. */
export function analyserSecrets(texte) {
  let j;
  try { j = JSON.parse(String(texte)); } catch { throw new RegistreIndisponible("secrets du poste illisibles"); }
  const kCodes = Buffer.from(String(j.K_codes || ""), "base64");
  if (kCodes.length !== 32) throw new RegistreIndisponible("K_codes absente ou invalide");
  const kRegistre = {};
  for (const [g, b] of Object.entries(j.K_registre || {})) {
    const k = Buffer.from(String(b), "base64");
    if (!/^\d+$/.test(g) || k.length !== 32) throw new RegistreIndisponible(`K_registre[${g}] invalide`);
    kRegistre[Number(g)] = k;
  }
  if (!Object.keys(kRegistre).length) throw new RegistreIndisponible("aucune clé de registre");
  return { kCodes, kRegistre };
}

export function lireSecretsPoste(env = process.env) {
  if (env.ANX_POSTE_SECRETS_FD) {
    const fd = Number(env.ANX_POSTE_SECRETS_FD);
    try { return analyserSecrets(fs.readFileSync(fd, "utf8")); }
    catch (e) { if (e instanceof RegistreIndisponible) throw e; throw new RegistreIndisponible(`secrets du poste non reçus (fd ${fd}) : ${e.code || e.message}`); }
    finally { try { fs.closeSync(fd); } catch {} }
  }
  if (env.ANX_POSTE_SECRETS_FICHIER) {
    try { return analyserSecrets(fs.readFileSync(env.ANX_POSTE_SECRETS_FICHIER, "utf8")); }
    catch (e) { if (e instanceof RegistreIndisponible) throw e; throw new RegistreIndisponible(`secrets du poste illisibles : ${e.code || e.message}`); }
  }
  return null;
}

/* ------------------------------------------------------------- registre.json */

export function lireRegistre(dir) {
  const f = path.join(dir, FICHIER_REGISTRE);
  let raw;
  try { raw = JSON.parse(fs.readFileSync(f, "utf8")); }
  catch (e) { throw new RegistreIndisponible(e.code === "ENOENT" ? "registre absent du dossier partagé" : `registre illisible (${e.code || "JSON invalide"})`); }
  if (!raw || raw.format !== FORMAT_REGISTRE || !raw.organisation || !raw.postes || !Number.isInteger(raw.generation) || raw.generation < 1) {
    throw new RegistreIndisponible("ce n'est pas un registre Hidden Tokens");
  }
  return raw;
}

/* Octets signés : tout le registre sauf sa signature, en JSON canonique. */
export function octetsSignes(reg) {
  const { signature, ...reste } = reg;
  return Buffer.from(canonique(reste), "utf8");
}

export function verifierSignatureRegistre(reg, clePubliqueB64, cleId = null) {
  const s = reg.signature;
  if (!s || s.alg !== "ed25519" || !s.valeur) return { ok: false, raison: "registre non signé" };
  if (cleId && s.cle_id !== cleId) return { ok: false, raison: "registre signé par une autre clé que celle de l'organisation" };
  try {
    const cle = crypto.createPublicKey({ key: Buffer.from(clePubliqueB64, "base64"), format: "der", type: "spki" });
    if (crypto.verify(null, octetsSignes(reg), cle, Buffer.from(s.valeur, "base64"))) return { ok: true };
  } catch {}
  return { ok: false, raison: "signature du registre invalide (modifié après signature ?)" };
}

/* Côté sentinelle : la place de CE poste dans le registre, et ses secrets si
   elle sait les desceller. État : actif | attente | retire. */
export function placeDuPoste(reg, posteId) {
  if ((reg.retires || []).some((r) => r.poste === posteId) && !reg.postes[posteId]) return { etat: "retire" };
  if (!reg.postes[posteId] || !reg.postes[posteId].enveloppe) return { etat: "attente" };
  return { etat: "actif", enveloppe: reg.postes[posteId].enveloppe };
}

export function descellerPourPoste(reg, posteId, priveeB64) {
  const place = placeDuPoste(reg, posteId);
  if (place.etat !== "actif") return { ...place, secrets: null };
  const secret = desceller(priveeB64, infoEnveloppe(reg.organisation, posteId), place.enveloppe);
  return { etat: "actif", secrets: analyserSecrets(JSON.stringify(secret)) };
}

/* ------------------------------------------------------------- ouverture */

/* Le poste ouvre le registre : fichier présent, signé par la clé épinglée (si
   on la connaît), poste encore membre, clé de la génération courante en main. */
export function ouvrirRegistre({ dir, posteId, secrets, clePublique = null, cleId = null }) {
  if (!dir || !fs.existsSync(dir)) throw new RegistreIndisponible("dossier du registre introuvable (partage démonté ?)");
  const reg = lireRegistre(dir);
  if (clePublique) {
    const v = verifierSignatureRegistre(reg, clePublique, cleId);
    if (!v.ok) throw new RegistreIndisponible(v.raison);
  }
  const place = placeDuPoste(reg, posteId);
  if (place.etat === "retire") throw new RegistreIndisponible("ce poste a été retiré du registre");
  if (place.etat === "attente") throw new RegistreIndisponible("ce poste n'est pas encore certifié par l'administrateur");
  if (!secrets || !secrets.kRegistre[reg.generation]) throw new RegistreIndisponible(`clé de la génération ${reg.generation} manquante : redémarrez la sentinelle pour relire le registre`);
  return {
    dir, organisation: reg.organisation, id: reg.id, generation: reg.generation, posteId, secrets,
    postes: Object.keys(reg.postes).length, sequestre: !!(reg.sequestre && reg.sequestre.enveloppe),
    fichierPoste: path.join(dir, "entrees", `${posteId}.jsonl`),
  };
}

/* ------------------------------------------------------------- entrées */

function lireLignes(f) {
  let txt = "";
  try { txt = fs.readFileSync(f, "utf8"); } catch { return []; }
  return txt.split("\n").filter((l) => l.trim());
}

/* Toutes les entrées que ce poste sait déchiffrer, tous postes confondus.
   Une ligne illisible est comptée, jamais devinée. */
export function lireEntrees(reg) {
  const dossier = path.join(reg.dir, "entrees");
  const out = [];
  let postes = 0, ignorees = 0;
  let noms = [];
  try { noms = fs.readdirSync(dossier).filter((n) => /^[a-z0-9_-]+\.jsonl$/i.test(n)); } catch { return { entries: out, postes, ignorees }; }
  for (const n of noms) {
    const poste = n.replace(/\.jsonl$/i, "");
    let vu = false;
    for (const ligne of lireLignes(path.join(dossier, n))) {
      let l;
      try { l = JSON.parse(ligne); } catch { ignorees++; continue; }
      const k = reg.secrets.kRegistre[l.g];
      if (!k) { ignorees++; continue; }
      try {
        const e = dechiffrer(k, aadEntree(reg.organisation, poste, l.g, l.n), l);
        if (e && e.code && typeof e.value === "string") { out.push({ code: e.code, value: e.value, type: e.type, alias_de: e.alias_de || undefined, poste }); vu = true; }
        else ignorees++;
      } catch (e) { if (e instanceof Indechiffrable) ignorees++; else throw e; }
    }
    if (vu) postes++;
  }
  return { entries: out, postes, ignorees };
}

/* Ajoute au fichier de CE poste les entrées dont le code n'y est pas encore.
   Ajout seul : on n'écrase jamais, on n'écrit jamais le fichier d'un autre. */
export function ajouterEntrees(reg, entries, { maintenant = () => new Date().toISOString() } = {}) {
  const existantes = lireLignes(reg.fichierPoste);
  const dejaCodes = new Set();
  for (const ligne of existantes) {
    try {
      const l = JSON.parse(ligne);
      const k = reg.secrets.kRegistre[l.g];
      if (k) dejaCodes.add(dechiffrer(k, aadEntree(reg.organisation, reg.posteId, l.g, l.n), l).code);
    } catch {}
  }
  const nouvelles = entries.filter((e) => e && e.code && !dejaCodes.has(e.code));
  if (!nouvelles.length) return 0;
  const k = reg.secrets.kRegistre[reg.generation];
  let n = existantes.length;
  const lignes = nouvelles.map((e) => {
    n += 1;
    const c = chiffrer(k, aadEntree(reg.organisation, reg.posteId, reg.generation, n), {
      code: e.code, value: String(e.value), type: e.type, alias_de: e.alias_de || undefined, groupe: null, cree_le: maintenant(),
    });
    return JSON.stringify({ g: reg.generation, n, ...c });
  });
  fs.mkdirSync(path.dirname(reg.fichierPoste), { recursive: true });
  fs.appendFileSync(reg.fichierPoste, lignes.join("\n") + "\n", { encoding: "utf8", mode: 0o644 });
  return nouvelles.length;
}

/* Même valeur sous deux codes (héritage de deux postes solo) : à signaler par
   codes, jamais par valeurs. `normFor(prefix, value)` vient d'engine.js. */
export function doublons(entries, normFor) {
  const parValeur = new Map();
  for (const e of entries) {
    if (!e || !e.code || e.alias_de) continue;
    const prefix = String(e.code).split("-")[0];
    const k = `${prefix}||${normFor(prefix, e.value)}`;
    if (!parValeur.has(k)) parValeur.set(k, new Set());
    parValeur.get(k).add(e.code);
  }
  return [...parValeur.values()].filter((s) => s.size > 1).map((s) => [...s].sort());
}
