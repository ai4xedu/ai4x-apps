// ============================================================================
// LE REGISTRE DE L'ORGANISATION, CÔTÉ CONSOLE ADMIN — SPEC-REGISTRE-ORGANISATION.
//
// La console est la seule à ÉCRIRE registre.json : créer le registre, certifier
// un poste (sceller les secrets pour lui), le retirer (nouvelle génération),
// fusionner un doublon, journaliser. Elle garde ses propres secrets dans un
// coffre à côté du cabinet (registre-admin.json : clé de réception X25519 sous
// la phrase de passe), et reçoit, comme un poste, une enveloppe dans le
// registre. Rien n'est jamais en clair sur le partage.
//
// Le poste, lui, ne fait que lire (apps/mcp-anonymiseur/server/registre.js) ;
// les formats sont partagés, pas le code — test/registre.test.js des deux
// côtés vérifie que ce que l'une écrit, l'autre le lit.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { sceller as scellerCoffre, desceller as descellerCoffre, COUT_DEFAUT } from "./cabinet.js";
import { genererPaireReception, sceller, desceller, infoEnveloppe, chiffrer, dechiffrer, empreinte, canonique, Indechiffrable } from "./enveloppe.js";

export const FORMAT_REGISTRE = "hidden-tokens.registre/1";
export const FORMAT_FICHE = "hidden-tokens.fiche-poste/1";
export const FORMAT_ADMIN = "hidden-tokens.registre-admin/1";
export const DOSSIER_REGISTRE = "registre";
export const FICHIER_REGISTRE = "registre.json";
export const FICHIER_ADMIN = "registre-admin.json";
export const INFO_ENTREE = "hidden-tokens.entree/1";
export const POSTE_ADMIN = "admin";

export class RegistreInvalide extends Error {}

const aadEntree = (org, poste, g, n) => `${INFO_ENTREE}|${org}|${poste}|${g}|${n}`;
const b64 = (b) => Buffer.from(b).toString("base64");

/* ------------------------------------------------------------- signature */

export function octetsSignes(objet) {
  const { signature, ...reste } = objet;
  return Buffer.from(canonique(reste), "utf8");
}

export function signer(objet, ouvert, cabinet) {
  return { ...objet, signature: { cle_id: cabinet.cle.id, alg: "ed25519", valeur: crypto.sign(null, octetsSignes(objet), ouvert.clePrivee).toString("base64") } };
}

export function verifier(objet, cabinet) {
  const s = objet && objet.signature;
  if (!s || s.cle_id !== cabinet.cle.id) return false;
  try {
    const cle = crypto.createPublicKey({ key: Buffer.from(cabinet.cle.publique, "base64"), format: "der", type: "spki" });
    return crypto.verify(null, octetsSignes(objet), cle, Buffer.from(s.valeur, "base64"));
  } catch { return false; }
}

/* ------------------------------------------------------------- fichiers */

const dossierRegistre = (partage) => path.join(partage, DOSSIER_REGISTRE);

function ecrireAtomique(f, contenu, mode = 0o644) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, contenu, { mode });
  fs.renameSync(tmp, f);
}

export function lireRegistre(partage) {
  const f = path.join(dossierRegistre(partage), FICHIER_REGISTRE);
  let reg;
  try { reg = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { throw new RegistreInvalide(e.code === "ENOENT" ? "aucun registre dans ce dossier partagé (registre-creer)" : "registre illisible"); }
  if (!reg || reg.format !== FORMAT_REGISTRE) throw new RegistreInvalide("ce n'est pas un registre Hidden Tokens");
  return reg;
}

function ecrireRegistre(partage, reg, ouvert, cabinet) {
  const signe = signer(reg, ouvert, cabinet);
  ecrireAtomique(path.join(dossierRegistre(partage), FICHIER_REGISTRE), JSON.stringify(signe, null, 2) + "\n");
  return signe;
}

/* Le journal : une ligne signée par événement. Jamais de valeur, jamais de secret. */
export function journaliser(partage, evenement, ouvert, cabinet, maintenant = new Date()) {
  const ligne = signer({ ...evenement, le: maintenant.toISOString() }, ouvert, cabinet);
  fs.mkdirSync(dossierRegistre(partage), { recursive: true });
  fs.appendFileSync(path.join(dossierRegistre(partage), "journal.jsonl"), JSON.stringify(ligne) + "\n");
  return ligne;
}

export function lireJournal(partage) {
  let txt = "";
  try { txt = fs.readFileSync(path.join(dossierRegistre(partage), "journal.jsonl"), "utf8"); } catch { return []; }
  return txt.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

/* ------------------------------------------------------------- l'admin comme destinataire */

const contexteAdmin = (cabinet) => `${FORMAT_ADMIN}|${cabinet.id}|${cabinet.cle.id}`;

/* La clé de réception de la console : créée avec le registre, scellée sous la
   phrase de passe du cabinet (même coffre que cabinet.js). */
export function creerAdmin(cabinet, phrase, cout = COUT_DEFAUT) {
  const paire = genererPaireReception();
  return { format: FORMAT_ADMIN, cabinet: cabinet.id, reception: { alg: "x25519", publique: paire.publique }, coffre: scellerCoffre({ reception_privee: paire.privee }, phrase, contexteAdmin(cabinet), cout) };
}

export function ouvrirAdmin(admin, cabinet, phrase) {
  if (!admin || admin.format !== FORMAT_ADMIN || admin.cabinet !== cabinet.id) throw new RegistreInvalide("fichier registre-admin.json absent ou d'un autre cabinet");
  return descellerCoffre(admin.coffre, phrase, contexteAdmin(cabinet)).reception_privee;
}

export function lireAdmin(fichier) {
  try { return JSON.parse(fs.readFileSync(fichier, "utf8")); } catch { throw new RegistreInvalide("registre-admin.json introuvable : ce poste admin n'a pas créé le registre (ou l'a perdu — voir sequestre-ouvrir)"); }
}

export function ecrireAdmin(fichier, admin) {
  ecrireAtomique(fichier, JSON.stringify(admin, null, 2) + "\n", 0o600);
}

/* ------------------------------------------------------------- secrets */

function secretsPourEnveloppe(secrets) {
  return { K_codes: b64(secrets.kCodes), K_registre: Object.fromEntries(Object.entries(secrets.kRegistre).map(([g, k]) => [g, b64(k)])) };
}

function secretsDepuisEnveloppe(obj) {
  const kCodes = Buffer.from(String(obj.K_codes || ""), "base64");
  if (kCodes.length !== 32) throw new RegistreInvalide("K_codes invalide");
  const kRegistre = {};
  for (const [g, b] of Object.entries(obj.K_registre || {})) kRegistre[Number(g)] = Buffer.from(b, "base64");
  return { kCodes, kRegistre };
}

/* Les secrets, descellés avec la clé de réception de la console. */
export function secretsAdmin(reg, adminPrivee) {
  if (!reg.admin || !reg.admin.enveloppe) throw new RegistreInvalide("ce registre n'a pas d'enveloppe pour la console");
  return secretsDepuisEnveloppe(desceller(adminPrivee, infoEnveloppe(reg.organisation, POSTE_ADMIN), reg.admin.enveloppe));
}

/* Les secrets, descellés avec la clé privée du séquestre (ouverte à quorum). */
export function secretsSequestre(reg, sequestrePrivee) {
  if (!reg.sequestre || !reg.sequestre.enveloppe) throw new RegistreInvalide("ce registre n'a pas d'enveloppe de séquestre");
  return secretsDepuisEnveloppe(desceller(sequestrePrivee, infoEnveloppe(reg.organisation, "sequestre"), reg.sequestre.enveloppe));
}

/* Rescelle les secrets pour tous les destinataires connus (postes certifiés,
   console, séquestre) : après un retrait, tout le monde reçoit la nouvelle
   génération. */
function rescellerTous(reg, secrets, receptions) {
  const s = secretsPourEnveloppe(secrets);
  for (const [id, p] of Object.entries(reg.postes)) {
    if (!receptions[id]) throw new RegistreInvalide(`clé de réception du poste ${id} introuvable (fiche absente du partage)`);
    p.enveloppe = sceller(receptions[id], infoEnveloppe(reg.organisation, id), s);
  }
  if (reg.admin) reg.admin.enveloppe = sceller(reg.admin.reception, infoEnveloppe(reg.organisation, POSTE_ADMIN), s);
  if (reg.sequestre) reg.sequestre.enveloppe = sceller(reg.sequestre.reception, infoEnveloppe(reg.organisation, "sequestre"), s);
}

/* ------------------------------------------------------------- créer */

/* `kCodes` : le secret d'une clé d'équipe v2.3 (--depuis-equipe), sinon
   aléatoire. `admin` : le fichier registre-admin.json déjà créé (creerAdmin). */
export function creerRegistre({ cabinet, ouvert, admin, partage, kCodes = null, maintenant = new Date() }) {
  const dir = dossierRegistre(partage);
  if (fs.existsSync(path.join(dir, FICHIER_REGISTRE))) throw new RegistreInvalide("un registre existe déjà dans ce dossier partagé — le remplacer couperait tous les postes");
  if (kCodes && kCodes.length !== 32) throw new RegistreInvalide("secret d'équipe invalide");
  const secrets = { kCodes: kCodes || crypto.randomBytes(32), kRegistre: { 1: crypto.randomBytes(32) } };
  const reg = {
    format: FORMAT_REGISTRE, organisation: cabinet.id, id: "reg_" + crypto.randomBytes(4).toString("hex"),
    cree_le: maintenant.toISOString(), generation: 1, postes: {}, retires: [],
    admin: { reception: admin.reception.publique, enveloppe: null },
  };
  rescellerTous(reg, secrets, {});
  fs.mkdirSync(path.join(dir, "postes"), { recursive: true });
  fs.mkdirSync(path.join(dir, "entrees"), { recursive: true });
  const signe = ecrireRegistre(partage, reg, ouvert, cabinet);
  journaliser(partage, { type: "REGISTRE_CREE", registre: reg.id, depuis_equipe: !!kCodes }, ouvert, cabinet, maintenant);
  return signe;
}

/* Clé d'équipe v2.3 → registre : le secret devient K_codes, les fichiers de
   poste en clair sont importés dans entrees/admin.jsonl (chiffrés). Renvoie
   la liste des fichiers en clair à supprimer par l'admin. */
export function lireEquipeV23(dossierEquipe) {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(path.join(dossierEquipe, ".nanomizer-equipe.json"), "utf8")); } catch { throw new RegistreInvalide("aucune clé d'équipe v2.3 dans ce dossier (.nanomizer-equipe.json)"); }
  const secret = Buffer.from(String(raw.secret || ""), "base64");
  if (secret.length < 32) throw new RegistreInvalide("secret d'équipe illisible");
  const entries = [];
  const fichiers = [];
  for (const n of fs.readdirSync(dossierEquipe).filter((x) => /^cle-poste-[a-z0-9-]+\.json$/i.test(x))) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dossierEquipe, n), "utf8"));
      if (Array.isArray(j.entries)) { entries.push(...j.entries.filter((e) => e && e.code && typeof e.value === "string")); fichiers.push(path.join(dossierEquipe, n)); }
    } catch {}
  }
  return { secret: secret.subarray(0, 32), entries, fichiers };
}

/* ------------------------------------------------------------- fiches et certification */

export function lireFiches(partage) {
  const dir = path.join(dossierRegistre(partage), "postes");
  const out = [];
  let noms = [];
  try { noms = fs.readdirSync(dir).filter((n) => /^pst_[a-f0-9]{8}\.json$/.test(n)); } catch { return out; }
  for (const n of noms) {
    try {
      const f = JSON.parse(fs.readFileSync(path.join(dir, n), "utf8"));
      if (f && f.format === FORMAT_FICHE && f.poste === n.replace(/\.json$/, "") && f.reception && f.reception.publique) out.push(f);
    } catch {}
  }
  return out;
}

export function lireFiche(partage, posteId) {
  const f = lireFiches(partage).find((x) => x.poste === posteId);
  if (!f) throw new RegistreInvalide(`aucune fiche pour le poste ${posteId} : le poste doit d'abord importer son enrôlement dans l'appli`);
  if (empreinte(f.reception.publique) !== f.empreinte) throw new RegistreInvalide(`fiche du poste ${posteId} incohérente (empreinte) — ne pas certifier`);
  return f;
}

/* L'admin a comparé l'empreinte avec le collaborateur : on signe la fiche et
   on scelle les secrets pour ce poste. */
export function certifierPoste({ cabinet, ouvert, adminPrivee, partage, posteId, maintenant = new Date() }) {
  const reg = lireRegistre(partage);
  if (!verifier(reg, cabinet)) throw new RegistreInvalide("le registre du partage n'est pas signé par ce cabinet");
  const fiche = lireFiche(partage, posteId);
  if (reg.postes[posteId]) throw new RegistreInvalide(`le poste ${posteId} est déjà certifié`);
  const secrets = secretsAdmin(reg, adminPrivee);
  const certifiee = signer({ ...fiche, certification: { cle_id: cabinet.cle.id, le: maintenant.toISOString() } }, ouvert, cabinet);
  ecrireAtomique(path.join(dossierRegistre(partage), "postes", `${posteId}.json`), JSON.stringify(certifiee, null, 2) + "\n");
  reg.postes[posteId] = { utilisateur: fiche.utilisateur, ajoute_le: maintenant.toISOString(), enveloppe: sceller(fiche.reception.publique, infoEnveloppe(reg.organisation, posteId), secretsPourEnveloppe(secrets)) };
  reg.retires = (reg.retires || []).filter((r) => r.poste !== posteId);
  const signe = ecrireRegistre(partage, reg, ouvert, cabinet);
  journaliser(partage, { type: "POSTE_AJOUTE", poste: posteId, utilisateur: fiche.utilisateur, empreinte: fiche.empreinte, generation: reg.generation }, ouvert, cabinet, maintenant);
  return { registre: signe, fiche: certifiee };
}

/* ------------------------------------------------------------- retirer */

export function retirerPoste({ cabinet, ouvert, adminPrivee, partage, posteId, maintenant = new Date() }) {
  const reg = lireRegistre(partage);
  if (!verifier(reg, cabinet)) throw new RegistreInvalide("le registre du partage n'est pas signé par ce cabinet");
  if (!reg.postes[posteId]) throw new RegistreInvalide(`le poste ${posteId} n'est pas membre du registre`);
  const secrets = secretsAdmin(reg, adminPrivee);
  const close = reg.generation;
  delete reg.postes[posteId];
  reg.retires = [...(reg.retires || []), { poste: posteId, le: maintenant.toISOString(), generation_close: close }];
  reg.generation = close + 1;
  secrets.kRegistre[reg.generation] = crypto.randomBytes(32);
  const receptions = {};
  for (const f of lireFiches(partage)) receptions[f.poste] = f.reception.publique;
  rescellerTous(reg, secrets, receptions);
  // La fiche révoquée reste sur le partage, marquée : un admin ne la recertifie pas par mégarde.
  try {
    const fiche = JSON.parse(fs.readFileSync(path.join(dossierRegistre(partage), "postes", `${posteId}.json`), "utf8"));
    const { signature, certification, ...reste } = fiche;
    ecrireAtomique(path.join(dossierRegistre(partage), "postes", `${posteId}.json`), JSON.stringify(signer({ ...reste, revocation: { le: maintenant.toISOString() } }, ouvert, cabinet), null, 2) + "\n");
  } catch {}
  const signe = ecrireRegistre(partage, reg, ouvert, cabinet);
  journaliser(partage, { type: "POSTE_RETIRE", poste: posteId, generation_close: close, generation: reg.generation }, ouvert, cabinet, maintenant);
  return signe;
}

/* ------------------------------------------------------------- séquestre et restauration */

/* Attache (ou remplace) la clé publique du séquestre au registre et lui scelle les secrets. */
export function attacherSequestre({ cabinet, ouvert, adminPrivee, partage, cleId, publique, maintenant = new Date() }) {
  const reg = lireRegistre(partage);
  if (!verifier(reg, cabinet)) throw new RegistreInvalide("le registre du partage n'est pas signé par ce cabinet");
  const secrets = secretsAdmin(reg, adminPrivee);
  reg.sequestre = { cle_id: cleId, reception: publique, enveloppe: sceller(publique, infoEnveloppe(reg.organisation, "sequestre"), secretsPourEnveloppe(secrets)) };
  const signe = ecrireRegistre(partage, reg, ouvert, cabinet);
  journaliser(partage, { type: "SEQUESTRE_ATTACHE", cle_id: cleId }, ouvert, cabinet, maintenant);
  return signe;
}

/* Rescelle les secrets (obtenus par le séquestre ou la feuille) pour un
   poste certifié et pour la console : c'est la restauration. */
export function restaurerSecrets({ cabinet, ouvert, partage, secrets, posteId = null, adminPublique = null, origine, gardiens = [], maintenant = new Date() }) {
  const reg = lireRegistre(partage);
  if (!verifier(reg, cabinet)) throw new RegistreInvalide("le registre du partage n'est pas signé par ce cabinet");
  if (!secrets.kRegistre[reg.generation]) throw new RegistreInvalide(`la clé de la génération courante (${reg.generation}) manque dans ce secours : il est antérieur au dernier retrait de poste`);
  const s = secretsPourEnveloppe(secrets);
  if (posteId) {
    const fiche = lireFiche(partage, posteId);
    reg.postes[posteId] = { utilisateur: fiche.utilisateur, ajoute_le: maintenant.toISOString(), enveloppe: sceller(fiche.reception.publique, infoEnveloppe(reg.organisation, posteId), s), ...(reg.postes[posteId] || {}) };
    reg.postes[posteId].enveloppe = sceller(fiche.reception.publique, infoEnveloppe(reg.organisation, posteId), s);
  }
  if (adminPublique) reg.admin = { reception: adminPublique, enveloppe: sceller(adminPublique, infoEnveloppe(reg.organisation, POSTE_ADMIN), s) };
  const signe = ecrireRegistre(partage, reg, ouvert, cabinet);
  journaliser(partage, { type: origine === "sequestre" ? "SEQUESTRE_OUVERT" : "RESTAURATION", origine, poste: posteId, console: !!adminPublique, gardiens }, ouvert, cabinet, maintenant);
  return signe;
}

/* ------------------------------------------------------------- entrées (console) */

function lireLignes(f) {
  try { return fs.readFileSync(f, "utf8").split("\n").filter((l) => l.trim()); } catch { return []; }
}

/* Toutes les entrées lisibles, pour l'état et la fusion de doublons. */
export function lireEntrees(reg, secrets, partage) {
  const dir = path.join(dossierRegistre(partage), "entrees");
  const out = [];
  let noms = [];
  try { noms = fs.readdirSync(dir).filter((n) => /^[a-z0-9_-]+\.jsonl$/i.test(n)); } catch { return out; }
  for (const n of noms) {
    const poste = n.replace(/\.jsonl$/i, "");
    for (const ligne of lireLignes(path.join(dir, n))) {
      try {
        const l = JSON.parse(ligne);
        const k = secrets.kRegistre[l.g];
        if (!k) continue;
        const e = dechiffrer(k, aadEntree(reg.organisation, poste, l.g, l.n), l);
        if (e && e.code) out.push({ ...e, poste });
      } catch (e) { if (!(e instanceof Indechiffrable) && !(e instanceof SyntaxError)) throw e; }
    }
  }
  return out;
}

/* Ajoute des entrées au fichier de la console (import d'équipe, alias). */
export function ajouterEntreesAdmin(reg, secrets, partage, entries, maintenant = new Date()) {
  const f = path.join(dossierRegistre(partage), "entrees", `${POSTE_ADMIN}.jsonl`);
  const k = secrets.kRegistre[reg.generation];
  let n = lireLignes(f).length;
  const lignes = entries.map((e) => {
    n += 1;
    return JSON.stringify({ g: reg.generation, n, ...chiffrer(k, aadEntree(reg.organisation, POSTE_ADMIN, reg.generation, n), { code: e.code, value: String(e.value), type: e.type, alias_de: e.alias_de || undefined, groupe: null, cree_le: maintenant.toISOString() }) });
  });
  if (!lignes.length) return 0;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.appendFileSync(f, lignes.join("\n") + "\n");
  return lignes.length;
}

/* Deux codes pour une même valeur : `alias` cesse d'être attribué, `garde`
   répond pour la valeur ; les deux se décodent toujours. */
export function fusionnerDoublon({ cabinet, ouvert, adminPrivee, partage, garde, alias, maintenant = new Date() }) {
  const reg = lireRegistre(partage);
  if (!verifier(reg, cabinet)) throw new RegistreInvalide("le registre du partage n'est pas signé par ce cabinet");
  const secrets = secretsAdmin(reg, adminPrivee);
  const entries = lireEntrees(reg, secrets, partage);
  const eg = entries.find((e) => e.code === garde && !e.alias_de), ea = entries.find((e) => e.code === alias && !e.alias_de);
  if (!eg || !ea) throw new RegistreInvalide("code gardé ou code alias inconnu du registre");
  if (garde.split("-")[0] !== alias.split("-")[0]) throw new RegistreInvalide("les deux codes doivent être du même type");
  ajouterEntreesAdmin(reg, secrets, partage, [{ code: alias, value: ea.value, type: ea.type, alias_de: garde }], maintenant);
  journaliser(partage, { type: "DOUBLON_FUSIONNE", garde, alias }, ouvert, cabinet, maintenant);
}

/* ------------------------------------------------------------- état */

export function etatRegistre(partage, cabinet = null) {
  const reg = lireRegistre(partage);
  const fiches = lireFiches(partage);
  const certifies = Object.keys(reg.postes);
  const retires = (reg.retires || []).map((r) => r.poste);
  return {
    id: reg.id, organisation: reg.organisation, generation: reg.generation, cree_le: reg.cree_le,
    signee_par_ce_cabinet: cabinet ? verifier(reg, cabinet) : null,
    certifies: certifies.map((id) => ({ poste: id, utilisateur: reg.postes[id].utilisateur, ajoute_le: reg.postes[id].ajoute_le })),
    en_attente: fiches.filter((f) => !certifies.includes(f.poste) && !f.revocation).map((f) => ({ poste: f.poste, utilisateur: f.utilisateur, empreinte: f.empreinte })),
    retires, sequestre: reg.sequestre ? reg.sequestre.cle_id : null, console: !!(reg.admin && reg.admin.enveloppe),
    journal: lireJournal(partage).length,
  };
}
