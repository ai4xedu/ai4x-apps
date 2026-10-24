// ============================================================================
// RÈGLES DE L'ORGANISATION (v2.18, 23/10/2026) — ce que l'entreprise décide
// elle-même, en plus du moteur. Spec : nanomizer/SPEC-REGLES-ORGANISATION.md.
//
// Trois types de règle, à deux niveaux :
//   toujours_coder    des termes codés <PREFIXE>-NNN même si le verrou les
//                     aurait laissés passer (« Horizon Bleu » : deux mots du
//                     dictionnaire, donc invisibles pour le verrou) ;
//   motif             une expression régulière de l'entreprise (n° d'affaire,
//                     matricule…), codée sous son propre préfixe ;
//   laisser_en_clair  des termes mis à l'abri du verrou (le nom du cabinet).
// Le niveau DOSSIER vient de <sortie>/reglages.json, écrit par l'appli ; le
// niveau ORGANISATION vient de la politique signée (politique.js). Priorité :
// organisation > dossier, et coder > laisser en clair à niveau égal.
//
// Ce module ne cite JAMAIS un terme ni un motif dans un message : les erreurs
// désignent la règle et la position (« D-003, terme n°2 »), et le compte
// rendu ne donne que des nombres. Un compte rendu finit dans le contexte du
// modèle ; un terme protégé n'y a pas sa place (RÈGLE N°1).
//
// Les empreintes (normaliser, empreinte, creerReconnaisseur) sont un CONTRAT
// avec la console admin (nanomizer-admin/lib/empreinte.js) : même préfixe,
// même normalisation, au caractère près. test/politique.test.js le vérifie.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { TYPES, CATEGORY_TYPES, classifyLoose, registerCustomTypes } from "./engine.js";
import { FICHIER_REGLAGES } from "./chiffres.js";
import { developperPacks, lirePack } from "./packs.js";

/* ------------------------------------------------------- empreintes (contrat) */

export const PREFIXE_EMPREINTE = "hm1:";
export const MAX_MOTS = 6;
export const MIN_CARACTERES = 3;

export function normaliser(texte) {
  return String(texte ?? "")
    .normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function empreinte(sel, forme) {
  const n = normaliser(forme);
  if (!n) throw new TypeError("forme vide après normalisation");
  return PREFIXE_EMPREINTE + crypto.createHmac("sha256", sel).update(n, "utf8").digest("hex");
}

/* Trouve, dans un texte, les passages dont l'empreinte est listée. Les mots
   sont des suites de lettres, chiffres et accents combinants (un texte en
   NFD — PDF, macOS — ne coupe pas « Lefèvre » en deux) ; à chaque position,
   le n-gramme le plus LONG gagne (« SARL Benjelloun Frères » avant
   « Benjelloun »). Renvoie le passage d'ORIGINE, ponctuation comprise. */
export function creerReconnaisseur(sel, empreintes) {
  const cibles = new Set(empreintes);
  const memo = new Map();
  const hache = (n) => {
    let h = memo.get(n);
    if (h === undefined) {
      h = PREFIXE_EMPREINTE + crypto.createHmac("sha256", sel).update(n, "utf8").digest("hex");
      if (memo.size < 100000) memo.set(n, h);
    }
    return h;
  };
  return (texte) => {
    const s = String(texte ?? "");
    const mots = [];
    for (const m of s.matchAll(/[\p{L}\p{N}\p{M}]+/gu)) {
      const n = normaliser(m[0]);
      if (n) mots.push({ n, a: m.index, b: m.index + m[0].length });
    }
    const trouves = [];
    for (let i = 0; i < mots.length;) {
      let pris = 0;
      for (let k = Math.min(MAX_MOTS, mots.length - i); k >= 1; k--) {
        const n = k === 1 ? mots[i].n : mots.slice(i, i + k).map((w) => w.n).join(" ");
        if (n.length < MIN_CARACTERES) continue;
        const h = hache(n);
        if (cibles.has(h)) { trouves.push({ value: s.slice(mots[i].a, mots[i + k - 1].b), empreinte: h }); pris = k; break; }
      }
      i += pris || 1;
    }
    return trouves;
  };
}

/* ------------------------------------------------------------------ format */

export const TYPES_REGLE = ["toujours_coder", "laisser_en_clair", "motif"];

/* Clés de contrôle qu'un motif de PACK peut exiger (SPEC-PACKS-METIER §1) :
   un passage qui correspond au motif mais rate le contrôle n'est pas codé
   par cette règle. Réservé aux packs : une règle d'un client n'en a pas. */
function luhn(texte) {
  const d = String(texte).replace(/\D/g, "");
  if (d.length < 2) return false;
  let somme = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) { let x = +d[i]; if (alt) { x *= 2; if (x > 9) x -= 9; } somme += x; alt = !alt; }
  return somme % 10 === 0;
}
function iban(texte) {
  const t = String(texte).replace(/[\s.-]/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(t)) return false;
  const r = (t.slice(4) + t.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let m = 0;
  for (const ch of r) m = (m * 10 + Number(ch)) % 97;
  return m === 1;
}
export const CONTROLES = { luhn, iban };
export const PREFIXE_RX = /^[A-Z][A-Z0-9]{1,9}$/;
export const LIMITES = { regles: 200, termes: 500, termeMin: MIN_CARACTERES, termeMax: 80, motif: 200, libelle: 80 };
/* Préfixes qui ne sont pas des détecteurs mais apparaissent dans ce qui sort
   (codes de politique, lieux, masques, repères de fichiers) : jamais réutilisés. */
const RESERVES_FIXES = ["INTERDIT", "LIEU", "CODE", "MASQUE", "F", "X", "HT", "TTC", "ID", "N"];

export function prefixesReserves() {
  return new Set([...TYPES.map((t) => t.prefix), ...CATEGORY_TYPES.map((t) => t.prefix), ...RESERVES_FIXES]);
}

/* Un motif de l'entreprise doit être inoffensif pour le poste qui l'exécute :
   pas de référence arrière, pas de quantificateur sur un groupe lui-même
   quantifié ((a+)+ : temps exponentiel), pas de motif qui accepte le vide,
   200 caractères au plus. Flags imposés : g, i, u. */
export function verifierMotif(src) {
  const s = String(src ?? "");
  if (!s.trim()) return { ok: false, raison: "motif vide" };
  if (s.length > LIMITES.motif) return { ok: false, raison: `plus de ${LIMITES.motif} caractères` };
  if (/\\[1-9]|\\k</.test(s)) return { ok: false, raison: "référence arrière refusée" };
  const Q = "(?:[*+]|\\{\\d*,\\d*\\}|\\{\\d+\\})";
  if (new RegExp(`\\((?:[^()\\\\]|\\\\.)*${Q}\\??(?:[^()\\\\]|\\\\.)*\\)${Q}`).test(s)) {
    return { ok: false, raison: "quantificateur imbriqué (risque de blocage)" };
  }
  try { new RegExp(s, "giu"); } catch { return { ok: false, raison: "expression régulière invalide" }; }
  if (new RegExp(s, "iu").test("")) return { ok: false, raison: "le motif accepte le vide" };
  return { ok: true };
}

/* Un terme qui a la forme d'un identifiant ne se laisse jamais en clair
   (plancher éditeur) : email, téléphone, compte, carte, CIN, permis, ou six
   chiffres et plus. */
export function estIdentifiant(terme) {
  const s = String(terme ?? "");
  if ((s.match(/\p{Nd}/gu) || []).length >= 6) return true;
  if (/@/.test(s)) return true;
  return classifyLoose(s).length > 0;
}

function validerTermes(liste, ko, { clair }) {
  // clair : refuser les identifiants (plancher éditeur). Faux pour la
  // validation STRUCTURELLE d'une politique (politique.js) : la console ne
  // dispose pas des détecteurs du moteur et pourrait accepter un terme que le
  // poste refuserait ; plutôt que de déclarer la politique ALTEREE, le poste
  // écarte la règle à l'application et le dit dans le plan.
  if (!Array.isArray(liste) || !liste.length) { ko("termes : une liste non vide"); return null; }
  if (liste.length > LIMITES.termes) { ko(`termes : plus de ${LIMITES.termes}`); return null; }
  const out = [];
  const vus = new Set();
  let fautes = 0;
  liste.forEach((t, k) => {
    const pos = `terme n°${k + 1}`;
    const faute = (m) => { fautes++; ko(`${pos} : ${m}`); };
    if (typeof t !== "string") return faute("doit être du texte");
    const s = t.trim();
    const n = normaliser(s);
    if (n.length < LIMITES.termeMin) return faute(`trop court (au moins ${LIMITES.termeMin} lettres ou chiffres)`);
    if (s.length > LIMITES.termeMax) return faute(`trop long (au plus ${LIMITES.termeMax} caractères)`);
    if (n.split(" ").length > MAX_MOTS) return faute(`plus de ${MAX_MOTS} mots, le poste ne pourra pas le reconnaître`);
    if (clair && estIdentifiant(s)) return faute("a la forme d'un identifiant (email, téléphone, compte, pièce…) : ne se laisse pas en clair");
    if (vus.has(n)) return;
    vus.add(n);
    out.push(s);
  });
  if (fautes) return null;
  return out;
}

/* Valide une liste de règles telle qu'écrite (reglages.json du dossier, ou
   règles « motif » / « laisser_en_clair » d'une politique). Chaque règle
   fautive est écartée avec un message qui la désigne sans citer de valeur ;
   les autres s'appliquent. Renvoie { regles, erreurs }. */
export function validerRegles(liste, { niveau = "dossier", verifierIdentifiants = true } = {}) {
  const regles = [];
  const erreurs = [];
  if (liste === undefined || liste === null) return { regles, erreurs };
  if (!Array.isArray(liste)) return { regles, erreurs: ["« regles » doit être une liste"] };
  if (liste.length > LIMITES.regles) { erreurs.push(`plus de ${LIMITES.regles} règles : seules les ${LIMITES.regles} premières sont lues`); liste = liste.slice(0, LIMITES.regles); }
  const reserves = prefixesReserves();
  const ids = new Set();
  const pack = niveau === "pack";
  const idRx = niveau === "dossier" ? /^D-\d{3,}$/ : pack ? /^P-\d{3,}$/ : /^R-\d{3,}$/;
  const forme = niveau === "dossier" ? "D-001" : pack ? "P-001" : "R-001";
  liste.forEach((r, i) => {
    const ou = r && typeof r.id === "string" && r.id.trim() ? r.id.trim() : `règle n°${i + 1}`;
    const ko = (m) => { erreurs.push(`${ou} : ${m}`); };
    if (!r || typeof r !== "object" || Array.isArray(r)) return ko("doit être un objet");
    if (!idRx.test(String(r.id || ""))) return ko(`id de la forme ${forme}`);
    if (ids.has(r.id)) return ko("id en double");
    ids.add(r.id);
    if (!TYPES_REGLE.includes(r.type)) return ko(`type inconnu (attendu : ${TYPES_REGLE.join(", ")})`);
    const libelle = typeof r.libelle === "string" && r.libelle.trim() ? r.libelle.trim().slice(0, LIMITES.libelle) : null;
    if (!libelle) return ko("libellé obligatoire (c'est ce que lit l'utilisateur)");
    const out = { id: r.id, type: r.type, libelle };
    if (r.type !== "laisser_en_clair") {
      const p = String(r.prefixe ?? "").trim().toUpperCase();
      if (!PREFIXE_RX.test(p)) return ko("préfixe : 2 à 10 lettres majuscules ou chiffres, commençant par une lettre (ex. AFFAIRE)");
      // Un pack peut étendre un détecteur du moteur (TEL, RIB) : même compteur, même code.
      if (reserves.has(p) && !(pack && TYPES.some((t) => t.prefix === p))) return ko(`préfixe « ${p} » réservé au moteur, choisissez-en un autre`);
      out.prefixe = p;
    }
    if (r.type === "motif") {
      const v = verifierMotif(r.motif);
      if (!v.ok) return ko(`motif refusé : ${v.raison}`);
      const ex = typeof r.exemple === "string" ? r.exemple.trim() : "";
      if (!ex) return ko("exemple obligatoire : une valeur FICTIVE que le motif doit reconnaître");
      if (!new RegExp(r.motif, "iu").test(ex)) return ko("le motif ne reconnaît pas son exemple");
      out.motif = String(r.motif);
      out.exemple = ex;
      if (r.controle !== undefined) {
        if (!pack) return ko("« controle » est réservé aux packs métier");
        if (!CONTROLES[r.controle]) return ko(`contrôle inconnu (attendu : ${Object.keys(CONTROLES).join(", ")})`);
        const trouve = ex.match(new RegExp(r.motif, "iu"));
        if (!trouve || !CONTROLES[r.controle](trouve[0])) return ko("l'exemple ne passe pas le contrôle");
        out.controle = r.controle;
      }
    } else {
      const termes = validerTermes(r.termes, ko, { clair: r.type === "laisser_en_clair" && verifierIdentifiants });
      if (!termes) return;
      out.termes = termes;
    }
    regles.push(out);
  });
  return { regles, erreurs };
}

/* --------------------------------------------------------- niveau dossier */

let cacheDossier = { cle: null, val: null };

/* Les règles du dossier, relues à chaque appel (cache sur la date et la
   taille du fichier) : un changement dans l'appli vaut tout de suite. Un
   fichier absent = aucune règle ; un fichier illisible = aucune règle, et on
   le dit dans le plan. */
export function lireReglesDossier(outdir) {
  const f = path.join(outdir, FICHIER_REGLAGES);
  let st;
  try { st = fs.statSync(f); } catch { return { regles: [], erreurs: [] }; }
  const cle = `${st.mtimeMs}:${st.size}`;
  if (cacheDossier.cle === cle) return cacheDossier.val;
  let val;
  try {
    const r = JSON.parse(fs.readFileSync(f, "utf8"));
    val = validerRegles(r && typeof r === "object" ? r.regles : undefined, { niveau: "dossier" });
    // Les packs métier du dossier (SPEC-PACKS-METIER §3) : par référence.
    const packs = r && typeof r === "object" ? r.packs : undefined;
    if (packs !== undefined) {
      const d = developperPacks(packs);
      val = { regles: [...val.regles, ...d.regles], entetes: d.entetes, erreurs: [...val.erreurs, ...d.erreurs], packs: Array.isArray(packs) ? packs.map(String) : [] };
    }
  } catch {
    val = { regles: [], erreurs: [`${FICHIER_REGLAGES} illisible : aucune règle du dossier appliquée`] };
  }
  cacheDossier = { cle, val };
  return val;
}

/* ------------------------------------------------------------- compilation */

/* Sel propre au processus : les termes en clair passent par le même
   reconnaisseur que les empreintes de la politique (même découpage, même
   normalisation, le plus long gagne) sans qu'on réécrive la reconnaissance. */
const SEL_LOCAL = crypto.randomBytes(32);
const RANG = { organisation: 2, dossier: 1 };
const NIVEAU = { organisation: "règle de l'organisation", dossier: "règle du dossier" };

const pluriel = (n, s, p = s + "s") => `${n} ${n > 1 ? p : s}`;

/* Compile les règles des deux niveaux en ce dont le moteur a besoin :
   - trouver(textes) : les passages à coder, au format des « extras »
     ({ value, type }) ; type = regle_<PREFIXE>, enregistré dans le moteur ;
   - exclusions : les termes à laisser en clair qui n'ont pas été battus par
     une règle « coder » de niveau égal ou supérieur ;
   - masquer(texte) : pour le verrou de sortie, remplace par « ••• » tout
     passage qu'une règle « coder » reconnaît (un terme pas encore codé ne
     doit pas sortir par un nom de fichier) ;
   - decrire() : des comptes, pour le plan. Jamais un terme.
   noms : la reconnaissance des noms de la politique (empreintes), pour
   l'arbitrage des exclusions ; typesSupplementaires : les catégories maison
   des règles « toujours_pseudonymiser » de la politique. */
export function compilerRegles({ dossier = [], organisation = [], entetes = [], noms = null, typesSupplementaires = [], erreurs = [] } = {}) {
  const types = new Map();
  for (const t of typesSupplementaires) if (!types.has(t.prefix)) types.set(t.prefix, { id: t.id, prefix: t.prefix, label: t.label });
  const parPack = new Map();   // id de pack → comptes, pour le plan
  const noterPack = (r, champ, n = 1) => {
    if (!r.pack) return;
    if (!parPack.has(r.pack)) parPack.set(r.pack, { motifs: 0, termes: 0, clair: 0, entetes: 0 });
    parPack.get(r.pack)[champ] += n;
  };
  const typeFor = (r, niveau) => {
    const moteur = TYPES.find((t) => t.prefix === r.prefixe);
    if (moteur) return moteur.id;   // un pack qui étend un détecteur natif
    const id = "regle_" + r.prefixe;
    if (!types.has(r.prefixe)) types.set(r.prefixe, { id, prefix: r.prefixe, label: `${r.libelle} (${NIVEAU[niveau]})` });
    return types.get(r.prefixe).id;
  };
  const coders = [];
  const clairs = [];
  const comptes = { organisation: { coder: 0, termes: 0, motifs: 0, clair: 0 }, dossier: { coder: 0, termes: 0, motifs: 0, clair: 0 } };
  for (const [niveau, liste] of [["organisation", organisation], ["dossier", dossier]]) {
    const parEmpreinte = new Map();
    for (const r of liste) {
      if (r.type === "toujours_coder") {
        const t = typeFor(r, niveau);
        if (!r.pack) { comptes[niveau].coder++; comptes[niveau].termes += r.termes.length; }
        noterPack(r, "termes", r.termes.length);
        for (const x of r.termes) { const h = empreinte(SEL_LOCAL, x); if (!parEmpreinte.has(h)) parEmpreinte.set(h, t); }
      } else if (r.type === "motif") {
        const t = typeFor(r, niveau);
        const src = r.motif;
        const controle = r.controle ? CONTROLES[r.controle] : null;
        if (!r.pack) comptes[niveau].motifs++;
        noterPack(r, "motifs");
        coders.push({ niveau, trouver: (s) => [...String(s ?? "").matchAll(new RegExp(src, "giu"))].filter((m) => !controle || controle(m[0])).map((m) => ({ value: m[0], type: t })) });
      } else if (r.type === "laisser_en_clair") {
        if (!r.pack) comptes[niveau].clair += r.termes.length;
        noterPack(r, "clair", r.termes.length);
        for (const x of r.termes) clairs.push({ niveau, terme: x });
      }
    }
    if (parEmpreinte.size) {
      const rec = creerReconnaisseur(SEL_LOCAL, [...parEmpreinte.keys()]);
      coders.push({ niveau, trouver: (s) => rec(s).map((m) => ({ value: m.value, type: parEmpreinte.get(m.empreinte) })) });
    }
  }

  // Un terme « en clair » visé par une règle « coder » de niveau ≥ au sien
  // tombe : coder l'emporte, l'organisation l'emporte.
  const exclusions = [];
  const vues = new Set();
  let ignorees = 0;
  for (const c of clairs) {
    const battu = (noms && noms(c.terme).length > 0)
      || coders.some((k) => RANG[k.niveau] >= RANG[c.niveau] && k.trouver(c.terme).length > 0);
    if (battu) { ignorees++; continue; }
    const n = normaliser(c.terme);
    if (vues.has(n)) continue;   // le même terme aux deux niveaux : une seule exclusion
    vues.add(n);
    exclusions.push(c.terme);
  }

  const liste = [...types.values()];
  // En-têtes de colonnes des packs (mode tableau) : l'en-tête qui correspond
  // force la colonne entière sous le préfixe. Même type que les règles.
  const colonnes = entetes.map((e) => {
    const moteur = TYPES.find((t) => t.prefix === e.prefixe);
    let id;
    if (moteur) id = moteur.id;
    else {
      id = "regle_" + e.prefixe;
      if (!types.has(e.prefixe)) types.set(e.prefixe, { id, prefix: e.prefixe, label: `${e.libelle} (pack)` });
    }
    return { rx: new RegExp(e.motif, "iu"), id, pack: e.pack };
  });
  for (const t of types.values()) if (!liste.includes(t)) liste.push(t);
  const typeColonne = (header) => {
    const h = String(header ?? "");
    if (!h.trim()) return null;
    const c = colonnes.find((x) => x.rx.test(h));
    return c ? c.id : null;
  };
  for (const e of entetes) if (e.pack) { noterPack(e, "entetes"); }
  registerCustomTypes(liste);

  const trouver = (textes) => {
    const out = [];
    for (const t of textes || []) for (const k of coders) out.push(...k.trouver(t));
    return out.filter((e) => String(e.value).trim().length >= 2);
  };
  const masquer = (texte) => {
    let s = String(texte ?? "");
    let n = 0;
    for (const k of coders) {
      const vals = [...new Set(k.trouver(s).map((e) => String(e.value).trim()).filter((v) => v.length >= 2))].sort((a, b) => b.length - a.length);
      for (const v of vals) {
        const rx = new RegExp(`(?<![\\p{L}\\p{N}])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}])`, "giu");
        s = s.replace(rx, () => { n++; return "•••"; });
      }
    }
    return { text: s, replaced: n };
  };
  const vide = !organisation.length && !dossier.length && !entetes.length && !erreurs.length;
  const decrire = () => {
    if (vide) return "";
    const part = (niveau) => {
      const c = comptes[niveau];
      const bouts = [];
      if (c.coder) bouts.push(`${pluriel(c.coder, "liste")} à toujours coder (${pluriel(c.termes, "terme")})`);
      if (c.motifs) bouts.push(pluriel(c.motifs, "motif"));
      if (c.clair) bouts.push(`${pluriel(c.clair, "terme")} laissé${c.clair > 1 ? "s" : ""} en clair`);
      return bouts.length ? `${niveau} — ${bouts.join(", ")}` : "";
    };
    const bouts = [part("organisation"), part("dossier")].filter(Boolean);
    for (const [id, c] of parPack) {
      const p = lirePack(id);
      const d = [];
      if (c.motifs) d.push(pluriel(c.motifs, "motif"));
      if (c.termes) d.push(`${pluriel(c.termes, "terme")} à coder`);
      if (c.clair) d.push(`${pluriel(c.clair, "terme")} en clair`);
      if (c.entetes) d.push(`${pluriel(c.entetes, "en-tête de colonne", "en-têtes de colonnes")}`);
      bouts.push(`pack ${p ? p.nom : id} : ${d.join(", ")}`);
    }
    const notes = [];
    if (ignorees) notes.push(`${pluriel(ignorees, "exclusion")} ignorée${ignorees > 1 ? "s" : ""} (un terme laissé en clair est aussi visé par une règle qui code : coder l'emporte)`);
    if (erreurs.length) notes.push(`${pluriel(erreurs.length, "règle du dossier", "règles du dossier")} écartée${erreurs.length > 1 ? "s" : ""} : ${erreurs.join(" ; ")}`);
    return `📏 Règles de l'organisation : ${bouts.join(" ; ") || "aucune règle valide"}.${notes.length ? " " + notes.join(". ") + "." : ""}`;
  };
  return { types: liste, trouver, exclusions, ignorees, erreurs, vide, masquer, decrire, comptes, typeColonne };
}
