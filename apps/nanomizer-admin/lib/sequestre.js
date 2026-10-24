// ============================================================================
// LE SÉQUESTRE — la continuité de l'organisation (SPEC-REGISTRE-ORGANISATION §3, §4.6).
//
// Une paire X25519 dont la clé publique reçoit, comme un poste, une enveloppe
// dans le registre ; la clé privée dort sous une clé d'ouverture K_ouv, et
// K_ouv est enveloppée UNE FOIS PAR PAIRE DE GARDIENS :
//   K_paire(i,j) = HKDF(scrypt(phrase_i) ‖ scrypt(phrase_j), info = …|<org>|<i>|<j>)
// Quorum 1 = une enveloppe par gardien (choix explicite). Pas de Shamir :
// que des primitives déjà en place, relisibles en dix lignes.
//
// Une ouverture ne laisse jamais la clé privée sur le disque : elle sert en
// mémoire à desceller l'enveloppe du registre, puis à resceller pour un poste.
// ============================================================================
import crypto from "node:crypto";
import { deriver, COUT_DEFAUT, PHRASE_MIN } from "./cabinet.js";
import { genererPaireReception, chiffrer, dechiffrer, Indechiffrable } from "./enveloppe.js";

export const FORMAT_SEQUESTRE = "hidden-tokens.sequestre/1";
export const FICHIER_SEQUESTRE = "sequestre.json";
const INFO = "hidden-tokens.sequestre/1";

export class SequestreInvalide extends Error {}

const paires = (ids) => { const out = []; for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) out.push([ids[i], ids[j]]); return out; };
const nomPaire = (a, b) => [a, b].sort().join("+");

function cleOuverture(organisation, ids, derives) {
  const tri = [...ids].sort();
  const materiau = Buffer.concat(tri.map((id) => derives[id]));
  return Buffer.from(crypto.hkdfSync("sha256", materiau, Buffer.alloc(0), `${INFO}|${organisation}|${tri.join("|")}`, 32));
}

/* gardiens : [{ id, nom, phrase }], 1 à 4 ; quorum 1 ou 2. */
export function creerSequestre({ organisation, gardiens, quorum = 2, cout = COUT_DEFAUT }) {
  if (!Array.isArray(gardiens) || gardiens.length < 1 || gardiens.length > 4) throw new SequestreInvalide("il faut 1 à 4 gardiens");
  if (![1, 2].includes(quorum)) throw new SequestreInvalide("le quorum vaut 1 ou 2");
  if (quorum === 2 && gardiens.length < 2) throw new SequestreInvalide("un quorum de 2 exige au moins 2 gardiens");
  for (const g of gardiens) {
    if (!/^g[1-4]$/.test(g.id) || !g.nom) throw new SequestreInvalide("chaque gardien a un id g1…g4 et un nom");
    if (typeof g.phrase !== "string" || g.phrase.normalize("NFC").length < PHRASE_MIN) throw new SequestreInvalide(`la phrase de ${g.nom} doit faire au moins ${PHRASE_MIN} caractères`);
  }
  const paire = genererPaireReception();
  const kOuv = crypto.randomBytes(32);
  const sels = {}, derives = {};
  for (const g of gardiens) { sels[g.id] = crypto.randomBytes(16); derives[g.id] = deriver(g.phrase, sels[g.id], cout); }
  const cleId = "seq_" + crypto.randomBytes(4).toString("hex");
  const enveloppes = {};
  const groupes = quorum === 1 ? gardiens.map((g) => [g.id]) : paires(gardiens.map((g) => g.id));
  for (const ids of groupes) enveloppes[ids.slice().sort().join("+")] = chiffrer(cleOuverture(organisation, ids, derives), `${INFO}|${organisation}|${cleId}|${ids.slice().sort().join("+")}`, { K_ouv: kOuv.toString("base64") });
  const sequestre = {
    format: FORMAT_SEQUESTRE, organisation,
    cle: { id: cleId, alg: "x25519", publique: paire.publique },
    gardiens: gardiens.map((g) => ({ id: g.id, nom: g.nom })), quorum,
    kdf: { nom: "scrypt", N: cout.N, r: cout.r, p: cout.p, sels: Object.fromEntries(Object.entries(sels).map(([k, v]) => [k, v.toString("base64")])) },
    enveloppes_ouverture: enveloppes,
    coffre_prive: chiffrer(kOuv, `${INFO}|${organisation}|${cleId}|prive`, { privee: paire.privee }),
  };
  return sequestre;
}

/* phrases : { g1: "…", g2: "…" } — autant que le quorum. Renvoie la clé
   privée (base64 PKCS8), en mémoire seulement. */
export function ouvrirSequestre(sequestre, phrases) {
  if (!sequestre || sequestre.format !== FORMAT_SEQUESTRE) throw new SequestreInvalide("ce n'est pas un fichier de séquestre Hidden Tokens");
  const ids = Object.keys(phrases || {}).filter((id) => sequestre.gardiens.some((g) => g.id === id)).sort();
  if (ids.length < sequestre.quorum) throw new SequestreInvalide(`il faut ${sequestre.quorum} gardien(s) pour ouvrir le séquestre`);
  const choisis = ids.slice(0, sequestre.quorum);
  const nom = choisis.join("+");
  const env = sequestre.enveloppes_ouverture[nom];
  if (!env) throw new SequestreInvalide(`aucune enveloppe pour ${nom}`);
  const cout = { N: sequestre.kdf.N, r: sequestre.kdf.r, p: sequestre.kdf.p };
  const derives = {};
  for (const id of choisis) derives[id] = deriver(phrases[id], Buffer.from(sequestre.kdf.sels[id], "base64"), cout);
  let kOuv;
  try { kOuv = Buffer.from(dechiffrer(cleOuverture(sequestre.organisation, choisis, derives), `${INFO}|${sequestre.organisation}|${sequestre.cle.id}|${nom}`, env).K_ouv, "base64"); }
  catch (e) { if (e instanceof Indechiffrable) throw new SequestreInvalide("phrase de gardien incorrecte"); throw e; }
  return { privee: dechiffrer(kOuv, `${INFO}|${sequestre.organisation}|${sequestre.cle.id}|prive`, sequestre.coffre_prive).privee, gardiens: choisis };
}
