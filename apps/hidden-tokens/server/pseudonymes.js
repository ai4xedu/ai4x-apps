// ============================================================================
// PSEUDONYMES — le rendu « lisible » (v2.23).
//
// Jusqu'ici une personne devenait NOM-001, une société SOCIETE-003, une date
// de naissance NAISS-002. Sûr, réversible — mais l'IA raisonne moins bien sur
// des codes, et un courrier produit sur des codes est illisible avant
// décodage. Ce module donne à chaque code un PSEUDONYME plausible et stable :
//
//   PRENOM-001  → un prénom du même genre et de la même aire culturelle
//                 (dictionnaires FR / MA / EN, lexique/pseudonymes.json) ;
//   NOM-001     → un patronyme de la même aire ;
//   PERSONNE-…  → prénom + nom, dans l'ordre du texte ;
//   SOCIETE-…   → une raison sociale fictive, même forme juridique
//                 (« Atlas Négoce SARL » → « Horizon Services SARL ») ;
//   LIEU-…      → une ville du même pays et de taille comparable ;
//   NAISS-…     → la date décalée d'un delta SECRET, constant par dossier :
//                 l'écart entre deux dates de naissance reste juste ; les
//                 AUTRES dates du dossier restent exactes, donc un âge
//                 calculé à l'une d'elles peut différer d'un an au plus.
//
// Les montants relèvent du mécanisme Nombres (chiffres.js) ; les identifiants
// (EMAIL, TEL, RIB, CIN, ICE…), adresses et références GARDENT leur code : une
// fausse adresse mail ou un faux IBAN ressembleraient à de vrais, et l'IA n'a
// rien à raisonner dessus.
//
// QUATRE RÈGLES :
//   1. STABLE. Le pseudonyme est écrit dans la clé (cle-de-session.json, champ
//      `pseudo` de l'entrée) : même personne = même pseudonyme dans deux
//      fichiers, dans coder_texte, d'une session à l'autre. Le format de la
//      clé (entries[].code/value) ne change pas : la sentinelle et l'appli
//      continuent de la lire.
//   2. RÉVERSIBLE. code ↔ pseudonyme ↔ valeur réelle est une bijection :
//      deanonymiser, decoder_word et remettre_chiffres retraduisent les
//      pseudonymes comme les codes (pseudoMap()).
//   3. JAMAIS AMBIGU. Un pseudonyme ne coïncide jamais avec une valeur réelle
//      de la clé (ni avec une de ses graphies : « 06 61… » / « 0661… »), ni
//      avec un mot du texte rendu, ni avec un mot du dictionnaire (« Claire »,
//      « Pierre » sont exclus : décoder une réponse de l'IA y verrait une
//      personne), ni avec un autre pseudonyme. Si une valeur réelle entrant
//      plus tard dans la clé coïncide avec un pseudonyme existant, ce
//      pseudonyme est RENOUVELÉ et le compte rendu le dit.
//   4. OPTIONNEL. Par défaut, rien ne change (mode « codes »). Le mode se
//      règle par dossier (Hidden-Tokens/reglages.json, champ `rendu`, à côté
//      de `chiffres`), par la variable ANX_RENDU, ou par l'option `rendu`
//      d'un appel.
//
// Le choix est DÉTERMINISTE : une graine secrète par dossier (écrite dans la
// clé, jamais servie à l'IA) et le code de l'entrée fixent l'index dans le
// dictionnaire ; les collisions font avancer l'index. Personne ne peut
// remonter du pseudonyme à la valeur : le pseudonyme ne dépend que du code.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { fold, foldKey, isKnownWord, names, CODE_SRC, LEGAL_FORMS_SRC } from "./verrou.js";
import { FICHIER_REGLAGES } from "./chiffres.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PSEUDONYMES_FILE = path.join(here, "..", "lexique", "pseudonymes.json");

export const RENDER_MODES = ["codes", "lisible"];
export const DEFAULT_RENDER_MODE = "codes";
export const RENDER_LABEL = {
  codes: "CODES — chaque donnée devient un code (NOM-001…) ; c'est le mode historique",
  lisible: "LISIBLE — noms, sociétés, villes et dates de naissance deviennent des pseudonymes plausibles, stables et réversibles ; identifiants et références restent des codes",
};

/* --------------------------------------------------------- réglage dossier - */

/* Le mode de rendu du dossier : reglages.json du sous-dossier de sortie
   (écrit par l'appli, champ `rendu`) → ANX_RENDU → codes. Relu à chaque
   appel, comme le réglage des nombres. Renvoie { mode, source }. */
export function readRenderSetting(outdir, env = process.env) {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(outdir, FICHIER_REGLAGES), "utf8"));
    if (r && RENDER_MODES.includes(r.rendu)) return { mode: r.rendu, source: "réglage du dossier, posé dans l'appli Hidden Tokens" };
  } catch {}
  const e = String(env.ANX_RENDU || "").trim();
  if (RENDER_MODES.includes(e)) return { mode: e, source: "réglage de l'extension" };
  return { mode: DEFAULT_RENDER_MODE, source: "défaut" };
}

/* v2.24 — LES DATES. Par défaut (« naissance »), seules les dates de
   naissance sont décalées : les autres restent exactes, et un âge calculé à
   l'une d'elles peut être faux d'un an. Avec « toutes », TOUTES les dates
   complètes du dossier sont décalées du même nombre de jours : l'IA vit dans
   un calendrier décalé où âges et délais sont exacts, et le décodage ramène
   TOUTES les dates de sa réponse (y compris celles qu'elle a calculées).
   Le réglage est FIGÉ dans la clé au premier rendu lisible du dossier : un
   dossier qui mélangerait les deux décoderait de vraies dates à tort.
   Réglage : reglages.json (`dates`), ANX_DATES, option `dates` ; défaut
   « naissance ». */
export const DATE_MODES = ["naissance", "toutes"];
export const DEFAULT_DATE_MODE = "naissance";
export function readDatesSetting(outdir, env = process.env) {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(outdir, FICHIER_REGLAGES), "utf8"));
    if (r && DATE_MODES.includes(r.dates)) return { mode: r.dates, source: "réglage du dossier, posé dans l'appli Hidden Tokens" };
  } catch {}
  const e = String(env.ANX_DATES || "").trim();
  if (DATE_MODES.includes(e)) return { mode: e, source: "réglage de l'extension" };
  return { mode: DEFAULT_DATE_MODE, source: "défaut" };
}

/* ----------------------------------------------------------------- lexique - */

let LEX = null;
let PROVIDED = null;

/* Pour l'appli web : les listes arrivent déjà chargées. */
export function fournirPseudonymes(data) {
  PROVIDED = typeof data === "string" ? JSON.parse(data) : data;
  LEX = null;
}

const AIRES = ["fr", "ma", "en"];
const GENRES = ["f", "m"];
const TAILLES = ["grande", "moyenne", "petite"];

/* Un pseudonyme n'est jamais un mot du dictionnaire : « Claire », « Pierre »,
   « Tours », « Nice » sont écartés au chargement (décoder une réponse de l'IA
   remplacerait sinon le mot courant par une personne). */
const notWord = (s) => !String(s).split(/[\s-]+/).some((p) => p && isKnownWord(p));

function lexique() {
  if (LEX) return LEX;
  let raw;
  try { raw = PROVIDED || JSON.parse(fs.readFileSync(PSEUDONYMES_FILE, "utf8")); }
  catch {
    throw new Error("Listes de pseudonymes introuvables (lexique/pseudonymes.json). Réinstalle le connecteur, ou reste en rendu « codes ».");
  }
  const L = { prenoms: {}, noms: {}, villes: {}, societes: raw.societes, prenomInfo: new Map(), nomAire: new Map(), villeInfo: new Map() };
  for (const aire of AIRES) {
    L.prenoms[aire] = {};
    for (const g of GENRES) {
      const list = ((raw.prenoms[aire] || {})[g] || []);
      // L'inférence connaît TOUS les prénoms de la liste (y compris ceux qui
      // sont aussi des mots : « Pierre » est bien un prénom masculin français) ;
      // seuls les pseudonymes rendus sont filtrés.
      for (const p of list) if (!L.prenomInfo.has(fold(p))) L.prenomInfo.set(fold(p), { aire, genre: g });
      L.prenoms[aire][g] = list.filter(notWord);
    }
    const noms = raw.noms[aire] || [];
    for (const n of noms) if (!L.nomAire.has(fold(n))) L.nomAire.set(fold(n), aire);
    L.noms[aire] = noms.filter(notWord);
  }
  for (const aire of Object.keys(raw.villes || {})) {
    L.villes[aire] = {};
    for (const t of TAILLES) {
      const list = (raw.villes[aire][t] || []);
      for (const v of list) if (!L.villeInfo.has(fold(v))) L.villeInfo.set(fold(v), { aire, taille: t });
      L.villes[aire][t] = list.filter(notWord);
    }
  }
  LEX = L;
  return LEX;
}

/* ---------------------------------------------------------------- secret --- */

/* Entier aléatoire dans [min, max[ (Web Crypto, sans biais de modulo). */
function randomInt(min, max) {
  const span = max - min;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / span) * span;
  do globalThis.crypto.getRandomValues(buf); while (buf[0] >= limit);
  return min + (buf[0] % span);
}

/* La graine et le delta de dates du dossier, créés à la première demande et
   écrits dans la clé avec le reste (le carnet est enregistré par l'appelant).
   Le delta vaut de 30 à 400 jours, dans un sens ou l'autre : assez pour
   qu'une date décalée ne soit pas la vraie à quelques jours près, assez peu
   pour qu'un âge reste crédible. */
export function secretPseudo(book, dates = null) {
  let s = book.pseudonymes;
  if (!s || typeof s.graine !== "string" || !Number.isInteger(s.deltaJours)) {
    const sens = randomInt(0, 2) ? 1 : -1;
    // v: 2 — le mode des dates n'est figé qu'au premier rendu qui le choisit.
    s = { graine: crypto.randomBytes(16).toString("hex"), deltaJours: sens * randomInt(30, 401), v: 2 };
    book.pseudonymes = s;
  }
  // Une clé d'avant la v2.24 (sans v) n'a décalé que les naissances : elle le reste.
  if (!DATE_MODES.includes(s.dates) && !s.v) s.dates = DEFAULT_DATE_MODE;
  // Premier rendu qui choisit : le mode est figé pour le dossier.
  if (!DATE_MODES.includes(s.dates) && DATE_MODES.includes(dates)) s.dates = dates;
  return s;
}

/* Index déterministe dans une liste : la graine du dossier, le code de
   l'entrée et un sel (numéro de tentative). */
function pick(graine, code, sel, n) {
  if (!n) return 0;
  const h = crypto.createHash("sha256").update(`${graine}|${code}|${sel}`).digest();
  return h.readUInt32BE(0) % n;
}

/* ---------------------------------------------------------------- contexte - */

const TOKEN_RX = /[\p{L}\p{N}]+/gu;
const CODE_RX = new RegExp(CODE_SRC, "gu");

/* Ce qu'un pseudonyme ne doit pas être. Construit une fois par rendu :
   - les valeurs réelles de la clé, sous toutes leurs graphies (byKey porte
     aussi les alias : « Transports Moreau & Fils » pour « … SAS ») ;
   - les pseudonymes déjà attribués, et chacun de leurs mots (deux personnes
     ne partagent pas un patronyme fictif) ;
   - les mots du texte qui va être rendu (hors codes).
   `text` : le texte CODÉ (les valeurs réelles y sont déjà des codes). */
export function contextFor(book, text = "") {
  const ctx = { reels: new Set(), used: new Set(), usedTokens: new Set(), textFold: "", renouveles: 0 };
  const addReel = (v) => { const s = String(v == null ? "" : v).trim(); if (!s) return; ctx.reels.add(foldKey(s)); ctx.reels.add(foldPhrase(s)); };
  for (const k of Object.keys(book.byKey || {})) addReel(k.slice(k.indexOf("||") + 2));
  for (const e of book.entries || []) addReel(e.value);
  ctx.textFold = " " + fold(String(text).replace(CODE_RX, " ")).replace(/[^\p{L}\p{N}]+/gu, " ") + " ";
  // Un pseudonyme déjà posé qui coïncide désormais avec une valeur réelle (une
  // personne de ce nom est entrée dans la clé) ou avec un mot du texte est
  // renouvelé : décoder la réponse de l'IA serait sinon ambigu.
  for (const e of book.entries || []) {
    if (!e.pseudo) continue;
    if (!acceptable(e.pseudo, ctx, { tokensUnique: false })) { delete e.pseudo; delete e.pseudoAlias; ctx.renouveles++; continue; }
    registerPseudo(e.pseudo, ctx);
    for (const a of Object.keys(e.pseudoAlias || {})) registerPseudo(a, ctx);
  }
  return ctx;
}

const foldPhrase = (s) => fold(String(s)).replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function registerPseudo(p, ctx) {
  const k = foldPhrase(p);
  ctx.used.add(k);
  for (const t of k.split(" ")) if (t) ctx.usedTokens.add(t);
}

/* Un candidat est acceptable s'il n'est ni une valeur réelle, ni un
   pseudonyme (ou un mot d'un pseudonyme de personne) déjà pris, ni présent
   dans le texte. AUCUN de ses mots ne doit être une valeur réelle non plus :
   le verrou de sortie recode toute valeur connue de la clé, même au milieu
   d'un pseudonyme (« Vega Négoce SARL » serait rendu « Vega NOM-003 SARL »
   si « Négoce » était un jour entré dans la clé — vu en CI, 23/10/2026). */
function acceptable(cand, ctx, { tokensUnique = true } = {}) {
  const k = foldPhrase(cand);
  if (!k) return false;
  if (ctx.reels.has(k) || ctx.reels.has(foldKey(cand))) return false;
  if (ctx.used.has(k)) return false;
  if (ctx.textFold.includes(` ${k} `)) return false;
  const toks = k.split(" ");
  for (let i = 0; i < toks.length; i++) {
    if (ctx.reels.has(toks[i])) return false;
    // Aucun mot de la valeur réelle que ce pseudonyme remplace : « Atlas
    // Services » pour « Atlas Négoce » livrerait la moitié du vrai nom.
    if (ctx.exclure && ctx.exclure.has(toks[i])) return false;
    if (tokensUnique && ctx.usedTokens.has(toks[i])) return false;
    // Une valeur réelle de plusieurs mots (ou à trait d'union : « Import-Export »
    // se replie en « import export ») cachée dans le candidat.
    for (let j = i + 2; j <= Math.min(toks.length, i + 4); j++) if (ctx.reels.has(toks.slice(i, j).join(" "))) return false;
  }
  return true;
}

/* -------------------------------------------------------------- inférence - */

const SURNAME_PARTICLES = new Set(["el", "al", "ben", "bent", "ibn", "ait", "ould", "de", "du", "des", "d", "la", "le", "van", "von", "der", "di", "da", "dos", "das"]);
const isAllCaps = (w) => w.length >= 2 && w === w.toUpperCase() && /\p{Lu}/u.test(w);

function inferPrenom(value, graine, code) {
  const L = lexique();
  const parts = fold(value).split(/[\s-]+/).filter(Boolean);
  for (const p of parts) { const i = L.prenomInfo.get(p); if (i) return i; }
  // Prénom inconnu de nos listes : genre et aire tirés du code (stables).
  return { aire: AIRES[pick(graine, code, "aire", 2)], genre: GENRES[pick(graine, code, "genre", 2)] };
}

function inferNomAire(value, graine, code) {
  const L = lexique();
  for (const p of fold(value).split(/[\s-]+/)) { const a = L.nomAire.get(p); if (a) return a; }
  // Un patronyme que l'INSEE connaît est plutôt français ; sinon, l'aire est
  // tirée du code (la liste marocaine y est privilégiée : c'est la cible).
  const N = names();
  if (N.nomColl.has(fold(value))) return "fr";
  return ["ma", "fr", "ma"][pick(graine, code, "aire-nom", 3)];
}

/* Garde la casse du modèle : « BENALI » → pseudonyme en MAJUSCULES. */
const likeCase = (model, s) => (isAllCaps(String(model).replace(/[^\p{L}]/gu, "")) ? s.toUpperCase() : s);

/* Parcourt une liste à partir d'un index déterministe jusqu'à un candidat
   acceptable (rendu par `render` à partir de l'élément). */
function choose(pool, graine, code, sel, ctx, render, opts) {
  if (!pool || !pool.length) return null;
  const start = pick(graine, code, sel, pool.length);
  for (let i = 0; i < pool.length; i++) {
    const cand = render(pool[(start + i) % pool.length]);
    if (acceptable(cand, ctx, opts)) return cand;
  }
  return null;
}

function pseudoPrenom(value, graine, code, ctx, sel = "prenom") {
  const L = lexique();
  const { aire, genre } = inferPrenom(value, graine, code);
  const pool = L.prenoms[aire][genre];
  const one = choose(pool, graine, code, sel, ctx, (x) => x);
  if (one) return one;
  // Liste épuisée (plus de 90 personnes du même genre et de la même aire dans
  // un dossier) : un prénom composé.
  const a = pool[pick(graine, code, sel + "-a", pool.length)];
  return choose(pool, graine, code, sel + "-b", ctx, (x) => `${a}-${x}`) || null;
}

function pseudoNom(value, graine, code, ctx, sel = "nom") {
  const L = lexique();
  const aire = inferNomAire(value, graine, code);
  const pool = L.noms[aire];
  const one = choose(pool, graine, code, sel, ctx, (x) => x);
  if (one) return one;
  const a = pool[pick(graine, code, sel + "-a", pool.length)];
  return choose(pool, graine, code, sel + "-b", ctx, (x) => `${a}-${x}`) || null;
}

/* Nom complet (mode tableau, colonne « Nom complet » ; règles de la politique
   du cabinet). Le prénom est le mot que nos listes ou l'INSEE connaissent
   comme tel, le reste est le patronyme ; l'ordre du texte est conservé
   (« EL AMRANI Yassine » → « TAZI Mehdi »). Renvoie { pseudo, alias } :
   alias = patronyme fictif → patronyme réel (« Mme Tazi » dans la réponse de
   l'IA redevient « Mme El Amrani »). */
function pseudoPersonne(value, graine, code, ctx) {
  const L = lexique();
  const N = names();
  const tokens = String(value).trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    const p = pseudoNom(value, graine, code, ctx);
    return p ? { pseudo: likeCase(value, p), alias: {} } : null;
  }
  const isFirst = (t) => { const f = fold(t); return L.prenomInfo.has(f) || N.prenoms.has(f); };
  let prenomAt = tokens.findIndex((t) => !SURNAME_PARTICLES.has(fold(t)) && isFirst(t));
  // Patronyme en MAJUSCULES et prénom en minuscules : le prénom est l'autre.
  if (prenomAt < 0) prenomAt = tokens.findIndex((t) => !isAllCaps(t)) ;
  if (prenomAt < 0) prenomAt = 0;
  const prenomReel = tokens[prenomAt];
  const nomReel = tokens.filter((_, i) => i !== prenomAt).join(" ");
  const prenomP = pseudoPrenom(prenomReel, graine, code, ctx, "personne-prenom");
  if (!prenomP) return null;
  registerPseudo(prenomP, ctx);   // le patronyme ne doit pas réutiliser ce mot
  const nomP = pseudoNom(nomReel || prenomReel, graine, code, ctx, "personne-nom");
  if (!nomP) return null;
  const out = tokens.map((t, i) => (i === prenomAt ? likeCase(t, prenomP) : null));
  // Le patronyme réel peut faire plusieurs mots (« El Amrani ») : un seul mot fictif à sa place.
  const nomAt = tokens.findIndex((_, i) => i !== prenomAt);
  out[nomAt] = likeCase(tokens[nomAt], nomP);
  const pseudo = out.filter((x) => x !== null).join(" ");
  const alias = nomReel ? { [likeCase(tokens[nomAt], nomP)]: nomReel } : {};
  return { pseudo, alias };
}

/* Raison sociale : la forme juridique reste (« SARL AU », « S.A »), le mot
   d'amorce courant aussi (« Garage », « Transports », « Cabinet »), le reste
   devient une amorce fictive — ou amorce + suite s'il n'y avait pas de mot
   courant. Casse du modèle conservée. */
// « S.A » sans point final (fréquent sur les factures) s'ajoute aux formes du verrou.
const LEGAL_TAIL_RX = new RegExp(`[\\s,]+(${LEGAL_FORMS_SRC}|S\\.?A\\.?)\\.?$`, "u");

function pseudoSociete(value, graine, code, ctx) {
  const L = lexique();
  let core = String(value).trim();
  let forme = "";
  const m = core.match(LEGAL_TAIL_RX);
  if (m) { forme = core.slice(m.index).trim(); core = core.slice(0, m.index).trim(); }
  const words = core.split(/\s+/).filter(Boolean);
  // Seul un mot GÉNÉRIQUE du commerce est gardé (« Garage », « Transports »,
  // « Cabinet ») : « Atlas » dans « Atlas Négoce » est la moitié du nom réel.
  const generiques = new Set((L.societes.generiques || []).map(fold));
  // (Un mot générique qui est lui-même une valeur de la clé n'est pas gardé :
  // le verrou de sortie le recoderait.)
  const keep = words.length > 1 && generiques.has(fold(words[0])) && !ctx.reels.has(fold(words[0])) ? words[0] : "";
  if (keep && ctx.exclure) ctx.exclure.delete(fold(keep));   // le mot générique gardé n'est pas « la moitié du nom »
  const amorces = L.societes.amorces, suites = L.societes.suites;
  const render = (am, su) => likeCase(core, [keep, am, su].filter(Boolean).join(" ")) + (forme ? ` ${forme}` : "");
  // D'abord « Garage Atlas » (si mot courant gardé), sinon « Atlas Négoce ».
  if (keep) {
    const one = choose(amorces, graine, code, "societe", ctx, (am) => render(am, ""), { tokensUnique: false });
    if (one) return one;
  }
  // Une suite qui est elle-même une valeur de la clé est écartée d'emblée.
  const suitesLibres = suites.filter((su) => acceptable(su, ctx, { tokensUnique: false }));
  if (suitesLibres.length) {
    const su = suitesLibres[pick(graine, code, "suite", suitesLibres.length)];
    const two = choose(amorces, graine, code, "societe-2", ctx, (am) => render(am, su), { tokensUnique: false });
    if (two) return two;
    const am = amorces[pick(graine, code, "amorce-3", amorces.length)];
    const three = choose(suitesLibres, graine, code, "societe-3", ctx, (s2) => render(am, s2), { tokensUnique: false });
    if (three) return three;
  }
  // Plus aucune suite disponible : deux amorces (« Orion Zénith SARL »).
  const am = amorces[pick(graine, code, "amorce-4", amorces.length)];
  return choose(amorces, graine, code, "societe-4", ctx, (am2) => (am2 === am ? "" : render(am, am2)), { tokensUnique: false });
}

/* Ville : même pays, même taille (grande ≥ 150 000 habitants, moyenne,
   petite). Une ville inconnue de nos listes est traitée comme une ville
   moyenne de France. */
function pseudoLieu(value, graine, code, ctx) {
  const L = lexique();
  const info = L.villeInfo.get(fold(value)) || { aire: "fr", taille: "moyenne" };
  const pools = [L.villes[info.aire][info.taille], ...TAILLES.filter((t) => t !== info.taille).map((t) => L.villes[info.aire][t])];
  for (const pool of pools) {
    const one = choose(pool, graine, code, "lieu", ctx, (x) => likeCase(value, x), { tokensUnique: false });
    if (one) return one;
  }
  return null;
}

/* ----------------------------------------------------------------- dates --- */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_FOLD = MOIS.map(fold);
const DAY_MS = 86400000;

/* Décale une date de naissance de `delta` jours, en conservant son écriture :
   « 12/04/1981 » → « 14/06/1981 », « 12 avril 1981 » → « 14 juin 1981 »,
   « 03.07.85 » → « 04.09.85 », « 1990 » (né en 1990) → l'année du 1er juillet
   décalé. Renvoie null si l'écriture n'est pas reconnue (le code reste). */
export function shiftDate(value, delta) {
  const s = String(value).trim();
  const shift = (y, m, d) => new Date(Date.UTC(y, m - 1, d) + delta * DAY_MS);
  const pad2 = (n) => String(n).padStart(2, "0");
  let m;
  if ((m = s.match(/^(\d{1,2})([/.\-])(\d{1,2})\2(\d{4}|\d{2})$/))) {
    const short = m[4].length === 2;
    let y = Number(m[4]);
    if (short) y += y > new Date().getFullYear() % 100 ? 1900 : 2000;
    const t = shift(y, Number(m[3]), Number(m[1]));
    if (Number.isNaN(t.getTime())) return null;
    const yy = short ? pad2(t.getUTCFullYear() % 100) : String(t.getUTCFullYear());
    return `${pad2(t.getUTCDate())}${m[2]}${pad2(t.getUTCMonth() + 1)}${m[2]}${yy}`;
  }
  if ((m = s.match(/^(1er|\d{1,2})\s+(\p{L}+)\s+(\d{4})$/u))) {
    const mi = MOIS_FOLD.indexOf(fold(m[2]));
    if (mi < 0) return null;
    const t = shift(Number(m[3]), mi + 1, m[1] === "1er" ? 1 : Number(m[1]));
    if (Number.isNaN(t.getTime())) return null;
    const d = t.getUTCDate();
    const mois = /^\p{Lu}/u.test(m[2]) ? MOIS[t.getUTCMonth()].replace(/^\p{L}/u, (c) => c.toUpperCase()) : MOIS[t.getUTCMonth()];
    return `${d === 1 ? "1er" : d} ${mois} ${t.getUTCFullYear()}`;
  }
  if ((m = s.match(/^(\d{4})$/))) {
    const t = shift(Number(m[1]), 7, 1);
    return String(t.getUTCFullYear());
  }
  return null;
}

/* Les dates COMPLÈTES d'un texte : 15/01/2026, 5/1/2026, 15.01.2026,
   15-01-2026, 2026-01-15, « 15 janvier 2026 », « 1er mars 2026 ». Une année
   seule, un mois seul ou une année sur deux chiffres ne sont pas des dates
   complètes : ils restent (trop d'ambiguïtés avec des nombres). Les codes
   (NAISS-001…) ne sont jamais touchés. */
const MOIS_ALT = "janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre";
const DATE_COMPLETE_RX = new RegExp(
  `(?<![\\p{L}\\p{N}/.\\-])(?:(\\d{4})-(\\d{2})-(\\d{2})|(\\d{1,2})([/.\\-])(\\d{1,2})\\5(\\d{4})|(1er|\\d{1,2})\\s+(${MOIS_ALT})\\s+(\\d{4}))(?![\\p{L}\\p{N}]|[/.\\-]\\d)`, "giu");

function dateValide(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/* Décale de `delta` jours toutes les dates complètes d'un texte, en gardant
   leur écriture. Renvoie { text, n }. */
export function decalerDates(input, delta) {
  let n = 0;
  const p2 = (x) => String(x).padStart(2, "0");
  const un = (seg) => seg.replace(DATE_COMPLETE_RX, (m, iy, im, id, nd, sep, nm, ny, td, tm, ty) => {
    if (iy) {
      const [y, mo, d] = [Number(iy), Number(im), Number(id)];
      if (!dateValide(y, mo, d)) return m;
      const t = new Date(Date.UTC(y, mo - 1, d) + delta * 86400000);
      n++;
      return `${t.getUTCFullYear()}-${p2(t.getUTCMonth() + 1)}-${p2(t.getUTCDate())}`;
    }
    if (nd) {
      const [d, mo, y] = [Number(nd), Number(nm), Number(ny)];
      if (!dateValide(y, mo, d)) return m;
      const t = new Date(Date.UTC(y, mo - 1, d) + delta * 86400000);
      n++;
      // Le style se lit sur la date entière : « 15/01 », « 05/3 » ou « 15/12 » sont
      // à zéros ; « 5/1 » ou « 15/1 » sans (sinon « 5/1 » → « 15/1 » → « 05/1 »).
      const zeros = nd.startsWith("0") || nm.startsWith("0") || (nd.length === 2 && nm.length === 2);
      const jj = zeros ? p2(t.getUTCDate()) : String(t.getUTCDate());
      const mm = zeros ? p2(t.getUTCMonth() + 1) : String(t.getUTCMonth() + 1);
      return `${jj}${sep}${mm}${sep}${t.getUTCFullYear()}`;
    }
    const r = shiftDate(m, delta);
    if (r) n++;
    return r || m;
  });
  // Hors des codes : NAISS-001 n'est pas une date.
  let out = "", last = 0;
  for (const c of String(input).matchAll(CODE_RX)) { out += un(String(input).slice(last, c.index)) + c[0]; last = c.index + c[0].length; }
  out += un(String(input).slice(last));
  return { text: out, n };
}

/* Les jours-mois SANS année que l'IA écrit en expliquant un calcul (« son
   anniversaire tombe le 19 janvier », « du 03/08 au 12/02 ») : ramenés eux
   aussi (essai A/B du 24/10/2026 : sinon l'explication décodée devient
   incohérente). Un jour-mois numérique n'est pris qu'à deux chiffres chacun
   (« 03/08 », pas « 3/4 », une fraction) et non suivi d'une année. Le
   calcul se fait sur une année non bissextile. Une année seule (« 2027 »)
   ne se ramène pas : la règle « 1 bis » demande des dates complètes. */
const JOUR_MOIS_RX = new RegExp(
  `(?<![\\p{L}\\p{N}/.\\-])(?:(\\d{2})([/.])(\\d{2})(?![\\p{N}]|[/.\\-]\\d)|(1er|\\d{1,2})\\s+(${MOIS_ALT})(?!\\s+\\d{4})(?![\\p{L}]))`, "giu");
function decalerJoursMois(input, delta) {
  const p2 = (x) => String(x).padStart(2, "0");
  const un = (seg) => seg.replace(JOUR_MOIS_RX, (m, nd, sep, nm, td, tm) => {
    let d, mo;
    if (nd) { [d, mo] = [Number(nd), Number(nm)]; } else {
      const i = MOIS_FOLD.indexOf(fold(tm));
      if (i < 0) return m;
      [d, mo] = [td === "1er" ? 1 : Number(td), i + 1];
    }
    if (!dateValide(2025, mo, d)) return m;
    const t = new Date(Date.UTC(2025, mo - 1, d) + delta * 86400000);
    if (nd) return `${p2(t.getUTCDate())}${sep}${p2(t.getUTCMonth() + 1)}`;
    const jour = t.getUTCDate() === 1 ? "1er" : String(t.getUTCDate());
    const mois = /^\p{Lu}/u.test(tm) ? MOIS[t.getUTCMonth()].replace(/^\p{L}/u, (c) => c.toUpperCase()) : MOIS[t.getUTCMonth()];
    return `${jour} ${mois}`;
  });
  let out = "", last = 0;
  for (const c of String(input).matchAll(CODE_RX)) { out += un(String(input).slice(last, c.index)) + c[0]; last = c.index + c[0].length; }
  return out + un(String(input).slice(last));
}

/* Le retour : ramène TOUTES les dates d'une réponse de l'IA (dossier en
   « toutes »), y compris celles qu'elle a calculées dans le calendrier
   décalé. Les pseudonymes de dates de naissance (toutes leurs écritures) sont
   mis à l'abri d'abord et rendus à leur vraie valeur : leur décalage a pu
   être ajusté d'un jour ou deux pour rester unique. Identité si le dossier
   n'est pas en « toutes ». */
export function retourDates(book) {
  const s = book && book.pseudonymes;
  if (!s || s.dates !== "toutes" || !Number.isInteger(s.deltaJours)) return (t) => String(t);
  const paires = [];
  for (const e of book.entries || []) {
    if (!/^NAISS-/.test(e.code) || !e.pseudo) continue;
    for (const v of new Set([e.pseudo, ...ecrituresDate(e.pseudo)])) paires.push([v, e.value]);
  }
  paires.sort((a, b) => b[0].length - a[0].length);
  const rx = paires.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${paires.map(([v]) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}\\p{N}])`, "giu") : null;
  const valeurDe = new Map(paires.map(([v, r]) => [v.toLowerCase(), r]));
  return (t) => {
    const abri = [];
    let x = String(t);
    if (rx) x = x.replace(rx, (m) => { abri.push(valeurDe.get(m.toLowerCase()) ?? m); return `\u0000${abri.length - 1}\u0000`; });
    // Les dates complètes d'abord, mises à l'abri à leur tour ; puis les jours-mois seuls.
    const faites = [];
    x = decalerDates(x, -s.deltaJours).text.replace(DATE_COMPLETE_RX, (m) => { faites.push(m); return `\u0001${faites.length - 1}\u0001`; });
    x = decalerJoursMois(x, -s.deltaJours);
    x = x.replace(/\u0001(\d+)\u0001/g, (_, i) => faites[Number(i)]);
    return x.replace(/\u0000(\d+)\u0000/g, (_, i) => abri[Number(i)]);
  };
}

/* ---------------------------------------------------------- attribution --- */

/* Les préfixes rendus, et comment. Les catégories de la politique du cabinet
   (CLI, PAR) peuvent désigner une personne ou une société : la forme juridique
   tranche. DOS, PROJ, INTERDIT et tous les identifiants gardent leur code. */
const RENDU_PAR_PREFIXE = {
  PRENOM: "prenom", NOM: "nom", PERSONNE: "personne", PERS: "personne",
  SOCIETE: "societe", SOC: "societe", LIEU: "lieu", NAISS: "naissance",
  CLI: "partie", PAR: "partie",
};
export const PREFIXES_RENDUS = Object.keys(RENDU_PAR_PREFIXE);

/* Le pseudonyme d'une entrée : celui déjà écrit dans la clé, sinon un
   nouveau, attribué, enregistré dans l'entrée et dans le contexte. Renvoie
   null quand le type n'est pas rendu ou qu'aucun candidat n'est acceptable :
   le code reste, c'est toujours sûr. */
export function pseudonymFor(book, entry, ctx) {
  if (entry.pseudo) return entry.pseudo;
  const prefix = String(entry.code).split("-")[0];
  let kind = RENDU_PAR_PREFIXE[prefix];
  if (!kind) return null;
  const { graine, deltaJours } = secretPseudo(book);
  const value = String(entry.value);
  if (kind === "partie") kind = LEGAL_TAIL_RX.test(value) ? "societe" : value.trim().split(/\s+/).length > 1 ? "personne" : "nom";
  let pseudo = null, alias = null;
  if (kind !== "naissance") {
    // Les mots de la valeur réelle sont interdits dans son pseudonyme (pas
    // pour une date : l'année décalée est souvent la même). Contexte dérivé :
    // les ensembles partagés (used, usedTokens…) restent ceux du rendu.
    // (sans la forme juridique, qui est reprise telle quelle)
    const exclure = new Set(foldPhrase(value.replace(LEGAL_TAIL_RX, "")).split(" ").filter(Boolean));
    ctx = Object.assign(Object.create(ctx), { exclure });
  }
  if (kind === "prenom") pseudo = pseudoPrenom(value, graine, entry.code, ctx), pseudo = pseudo && likeCase(value, pseudo);
  else if (kind === "nom") pseudo = pseudoNom(value, graine, entry.code, ctx), pseudo = pseudo && likeCase(value, pseudo);
  else if (kind === "personne") { const r = pseudoPersonne(value, graine, entry.code, ctx); if (r) ({ pseudo, alias } = r); }
  else if (kind === "societe") pseudo = pseudoSociete(value, graine, entry.code, ctx);
  else if (kind === "lieu") pseudo = pseudoLieu(value, graine, entry.code, ctx);
  else if (kind === "naissance") {
    // Une année seule (« né en 1990 ») reste un code : « 1991 » nu serait
    // retraduit partout dans la réponse de l'IA (« la loi de 1991 »).
    if (/^\s*\d{4}\s*$/.test(value)) return null;
    // Une date décalée qui tomberait sur une date réelle de la clé : un jour
    // de plus, et encore un, jusqu'à être unique (rarissime).
    for (let extra = 0; extra < 7 && !pseudo; extra++) {
      const cand = shiftDate(value, deltaJours + (deltaJours > 0 ? extra : -extra));
      if (cand && acceptable(cand, ctx, { tokensUnique: false })) pseudo = cand;
    }
  }
  if (!pseudo) return null;
  entry.pseudo = pseudo;
  if (alias && Object.keys(alias).length) entry.pseudoAlias = alias;
  registerPseudo(pseudo, ctx);
  for (const a of Object.keys(alias || {})) registerPseudo(a, ctx);
  return pseudo;
}

/* Index code → entrée, tenu à jour par les seules nouvelles entrées. */
const INDEX = new WeakMap();
function entriesByCode(book) {
  let ix = INDEX.get(book);
  if (!ix) { ix = { map: new Map(), seen: 0 }; INDEX.set(book, ix); }
  const entries = book.entries || [];
  for (let i = ix.seen; i < entries.length; i++) ix.map.set(String(entries[i].code).toUpperCase(), entries[i]);
  ix.seen = entries.length;
  return ix.map;
}

/* ------------------------------------------------------------------ rendu --- */

/* Remplace, dans un texte CODÉ, chaque code rendu par son pseudonyme. Mute le
   carnet (pseudonymes attribués). Renvoie { text, rendus, parType, restes,
   renouveles } — restes : codes laissés tels quels (identifiants, références,
   ou aucun pseudonyme acceptable). */
export function rendreLisible(input, book, ctx, { dates = null, sansDecalage = false } = {}) {
  ctx = ctx || contextFor(book, input);
  // sansDecalage (texte venu du navigateur) : ni décalage de toutes les dates,
  // ni verrou du mode — c'est le premier rendu dans Claude qui le fixe.
  const secret = secretPseudo(book, sansDecalage ? null : (dates || DEFAULT_DATE_MODE));
  // « toutes » : les dates complètes d'abord (les naissances sont encore des
  // codes à ce stade : elles ne sont pas décalées deux fois).
  let datesDecalees = 0;
  if (secret.dates === "toutes" && !sansDecalage) { const d = decalerDates(input, secret.deltaJours); input = d.text; datesDecalees = d.n; }
  const byCode = entriesByCode(book);
  const parType = {};
  let rendus = 0, restes = 0;
  const text = String(input).replace(CODE_RX, (code) => {
    const e = byCode.get(code.toUpperCase());
    if (!e) { restes++; return code; }
    const p = pseudonymFor(book, e, ctx);
    if (!p) { restes++; return code; }
    rendus++;
    const label = e.type || code.split("-")[0];
    parType[label] = (parType[label] || 0) + 1;
    return p;
  });
  return { text, rendus, parType, restes, renouveles: ctx.renouveles, datesDecalees, dates: sansDecalage ? "naissance" : (secret.dates || DEFAULT_DATE_MODE), datesDemandees: sansDecalage ? null : dates };
}

/* Même chose sur les cellules texte d'une feuille (mutée en place). Le
   contexte est construit sur tout le texte de la feuille. */
export function rendreFeuille(ws, book, ctx, opts = {}) {
  const out = { rendus: 0, parType: {}, restes: 0, renouveles: 0, cells: 0, datesDecalees: 0, dates: null };
  if (!ws || !ws["!ref"]) return out;
  const texts = [];
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const c = ws[addr];
    if (c && (c.t === "s" || c.t === "str") && typeof c.v === "string") texts.push(c.v);
  }
  ctx = ctx || contextFor(book, texts.join("\n"));
  for (const addr of Object.keys(ws)) {
    if (addr[0] === "!") continue;
    const c = ws[addr];
    if (!c || (c.t !== "s" && c.t !== "str") || typeof c.v !== "string") continue;
    const r = rendreLisible(c.v, book, ctx, opts);
    out.dates = r.dates;
    out.datesDemandees = r.datesDemandees;
    if (!r.rendus && !r.datesDecalees) continue;
    ws[addr] = { t: "s", v: r.text };
    out.cells++;
    out.datesDecalees += r.datesDecalees;
    out.rendus += r.rendus;
    out.restes += r.restes;
    for (const k of Object.keys(r.parType)) out.parType[k] = (out.parType[k] || 0) + r.parType[k];
  }
  out.renouveles = ctx.renouveles;
  return out;
}

/* ------------------------------------------------------------ réversibilité - */

const escRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* PSEUDONYME (majuscules) → valeur réelle, pour les tables de décodage
   (deanonymiser, decoder_word, remettre_chiffres). Y figurent aussi la raison
   sociale sans sa forme juridique et le patronyme fictif seul d'un nom
   complet (→ le patronyme réel). */
/* Les écritures d'une même date que l'IA emploie en réécrivant : « 8 septembre
   1974 » revient en « 08/09/1974 », « 8/9/1974 », « 1974-09-08 »… Vu à l'essai
   A/B du 24/10/2026 : une date décalée réécrite dans un autre format n'était
   pas retraduite et restait, fausse, dans le document décodé. Renvoie []
   pour ce qui n'est pas une date complète. */
export function ecrituresDate(s) {
  const t = String(s).trim();
  let j, mo, a, m;
  if ((m = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/))) [j, mo, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = t.match(/^(1er|\d{1,2})\s+(\p{L}+)\s+(\d{4})$/u))) {
    const i = MOIS_FOLD.indexOf(fold(m[2]));
    if (i < 0) return [];
    [j, mo, a] = [m[1] === "1er" ? 1 : Number(m[1]), i + 1, Number(m[3])];
  } else return [];
  const p2 = (n) => String(n).padStart(2, "0");
  const mois = MOIS[mo - 1];
  const jour = j === 1 ? ["1er", "1"] : [String(j)];
  return [...new Set([
    `${p2(j)}/${p2(mo)}/${a}`, `${j}/${mo}/${a}`, `${p2(j)}.${p2(mo)}.${a}`, `${p2(j)}-${p2(mo)}-${a}`, `${a}-${p2(mo)}-${p2(j)}`,
    ...jour.map((d) => `${d} ${mois} ${a}`), `${p2(j)} ${mois} ${a}`,
  ])];
}

export function pseudoMap(book) {
  const map = {};
  for (const e of book.entries || []) {
    if (!e.pseudo) continue;
    map[e.pseudo.toUpperCase()] = e.value;
    if (/^NAISS-/.test(e.code)) for (const v of ecrituresDate(e.pseudo)) if (!(v.toUpperCase() in map)) map[v.toUpperCase()] = e.value;
    const m = e.pseudo.match(LEGAL_TAIL_RX);
    if (m) { const core = e.pseudo.slice(0, m.index).trim(); if (core.length >= 3) map[core.toUpperCase()] = e.value; }
    for (const [a, v] of Object.entries(e.pseudoAlias || {})) map[a.toUpperCase()] = v;
  }
  return map;
}

/* Remet les CODES à la place des pseudonymes d'un texte rendu — pour le
   contrôle d'aperçu (il vérifie la version codée) et pour les tests. Un
   pseudonyme n'est reconnu qu'avec sa casse d'origine : « horizon » dans une
   phrase n'est pas la société. */
export function codesDepuisPseudos(book) {
  const pairs = [];
  for (const e of book.entries || []) {
    if (!e.pseudo) continue;
    pairs.push([e.pseudo, e.code]);
    const m = e.pseudo.match(LEGAL_TAIL_RX);
    if (m) { const core = e.pseudo.slice(0, m.index).trim(); if (core.length >= 3) pairs.push([core, e.code]); }
    for (const a of Object.keys(e.pseudoAlias || {})) pairs.push([a, e.code]);
  }
  if (!pairs.length) return (t) => String(t);
  pairs.sort((a, b) => b[0].length - a[0].length);
  const map = new Map(pairs);
  const rx = new RegExp(`(?<![\\p{L}\\p{N}])(?:${pairs.map(([p]) => escRx(p)).join("|")})(?![\\p{L}\\p{N}])`, "gu");
  return (t) => String(t).replace(rx, (m) => map.get(m) || m);
}

/* La ligne de plan / de compte rendu. r : { rendus, parType, restes,
   renouveles } (ou null pour le plan) ; mode, source : le réglage. */
export function describeRendu(mode, source, r = null) {
  const origine = source ? ` (${source})` : "";
  if (mode !== "lisible") return "";
  const lines = [`RENDU « lisible »${origine} : les prénoms, noms, sociétés, villes (codées) et dates de naissance deviennent des PSEUDONYMES fictifs — plausibles, stables (même personne = même pseudonyme, d'un fichier à l'autre) et réversibles ; identifiants, adresses et références restent des codes.`];
  if (r) {
    const parts = Object.entries(r.parType || {}).map(([k, n]) => `${n} × ${k}`).join(", ");
    lines.push(`${r.rendus} code(s) rendu(s) par un pseudonyme${parts ? ` (${parts})` : ""}, ${r.restes} code(s) conservé(s).`);
    if (r.renouveles) lines.push(`⚠️ ${r.renouveles} pseudonyme(s) renouvelé(s) : ils coïncidaient avec une valeur réelle entrée depuis dans la clé ou avec un mot de ce texte. Les textes rendus auparavant avec l'ancien pseudonyme ne se décodent plus par lui : les recoder.`);
  }
  const toutes = r ? r.dates === "toutes" : false;
  if (r && r.datesDemandees && r.dates && r.datesDemandees !== r.dates) {
    lines.push(`ℹ️ Dates : ce dossier est figé en « ${r.dates} » depuis son premier rendu lisible (un dossier ne mélange pas les deux) ; pour changer, repartir d'une clé neuve (reinitialiser_cle).`);
  }
  if (toutes) {
    lines.push(`DATES — « toutes » : ${r.datesDecalees || 0} date(s) décalée(s) ici. Toutes les dates complètes du dossier sont décalées d'un même nombre de jours, secret : âges et délais calculés sont EXACTS, et deanonymiser / decoder_word ramènent toutes les dates de la réponse, y compris celles que l'IA a calculées. Les jours de la semaine, eux, ne correspondent plus ; une date extérieure au dossier (date d'une loi, d'un jour férié) citée par l'IA serait ramenée à tort.`);
  } else {
    lines.push("Les dates de naissance sont décalées d'un même nombre de jours, secret, pour tout le dossier : l'écart entre deux dates de naissance reste juste, mais les autres dates restent exactes — un âge calculé à une date du dossier peut différer d'un an au plus (pour un seuil d'âge, demande la réponse à l'utilisateur).");
  }
  lines.push("deanonymiser et decoder_word retraduisent les pseudonymes comme les codes. Pour revenir aux codes : rendu: \"codes\", ou le réglage du dossier dans l'appli Hidden Tokens.");
  return lines.join("\n");
}
