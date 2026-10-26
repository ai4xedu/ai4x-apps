// ============================================================================
// LES PACKS MÉTIER (v2.21) — SPEC-PACKS-METIER (dépôt nanomizer).
//
// Un pack est un fichier de règles livré avec le connecteur (packs/<id>.json) :
// des motifs avec préfixe (et, pour les packs seulement, une clé de contrôle
// ou un préfixe du moteur), des termes à laisser en clair. Il s'active par
// référence — « packs »: ["telecom-ma"] dans reglages.json du dossier ou
// dans la politique signée — jamais par copie : mettre à jour le connecteur
// met à jour les packs partout.
//
// Un pack inconnu de ce connecteur est une ERREUR de règles (rien n'est codé) :
// une politique qui cite un pack attend que tous les postes le portent.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validerRegles, verifierMotif, PREFIXE_RX, prefixesReserves } from "./regles.js";
import { TYPES } from "./engine.js";

export const FORMAT_PACK = "hidden-tokens.pack/1";
export const ID_PACK_RX = /^[a-z][a-z0-9-]{2,30}$/;
const DOSSIER = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "packs");

let cache = null;

/* Tous les packs du connecteur, validés : { id → { pack, regles, erreurs } }. */
function charger() {
  if (cache) return cache;
  cache = new Map();
  let noms = [];
  try { noms = fs.readdirSync(DOSSIER).filter((n) => n.endsWith(".json")); } catch { return cache; }
  for (const n of noms) {
    let pack;
    try { pack = JSON.parse(fs.readFileSync(path.join(DOSSIER, n), "utf8")); } catch { continue; }
    const v = validerPack(pack);
    if (v.ok) cache.set(pack.id, { pack, regles: v.regles, entetes: v.entetes, erreurs: v.erreurs });
  }
  return cache;
}

/* Un pack bien formé : identité, règles acceptées au niveau « pack ». Les
   règles fautives sont rapportées (le test de validité les refuse toutes). */
export function validerPack(pack) {
  if (!pack || pack.format !== FORMAT_PACK) return { ok: false, erreurs: ["format de pack inconnu"] };
  if (!ID_PACK_RX.test(String(pack.id || ""))) return { ok: false, erreurs: ["id de pack invalide"] };
  if (!pack.nom || !pack.version) return { ok: false, erreurs: ["nom ou version manquants"] };
  const v = validerRegles(pack.regles, { niveau: "pack" });
  const regles = v.regles.map((r) => ({ ...r, pack: pack.id }));
  const e = validerEntetes(pack.entetes);
  const entetes = e.entetes.map((x) => ({ ...x, pack: pack.id }));
  return { ok: true, regles, entetes, erreurs: [...v.erreurs, ...e.erreurs].map((m) => `pack ${pack.id}, ${m}`) };
}

/* En-têtes de colonnes (mode tableau, SPEC-PACKS-METIER §1) : un motif sur
   l'en-tête → la colonne entière est codée sous le préfixe. Préfixe du moteur
   (TEL, RIB, REF…) ou préfixe maison du pack. */
export function validerEntetes(liste) {
  const entetes = [];
  const erreurs = [];
  if (liste === undefined || liste === null) return { entetes, erreurs };
  if (!Array.isArray(liste)) return { entetes, erreurs: ["« entetes » doit être une liste"] };
  const reserves = prefixesReserves();
  liste.forEach((e, i) => {
    const ou = `en-tête n°${i + 1}`;
    if (!e || typeof e !== "object") { erreurs.push(`${ou} : doit être un objet`); return; }
    const v = verifierMotif(e.motif);
    if (!v.ok) { erreurs.push(`${ou} : motif refusé : ${v.raison}`); return; }
    const p = String(e.prefixe ?? "").trim().toUpperCase();
    if (!PREFIXE_RX.test(p)) { erreurs.push(`${ou} : préfixe invalide`); return; }
    if (reserves.has(p) && !TYPES.some((t) => t.prefix === p)) { erreurs.push(`${ou} : préfixe « ${p} » réservé`); return; }
    if (typeof e.exemple !== "string" || !e.exemple.trim() || !new RegExp(e.motif, "iu").test(e.exemple)) { erreurs.push(`${ou} : exemple obligatoire, reconnu par le motif`); return; }
    entetes.push({ motif: String(e.motif), prefixe: p, libelle: typeof e.libelle === "string" ? e.libelle.trim().slice(0, 80) : p, exemple: e.exemple.trim() });
  });
  return { entetes, erreurs };
}

export function listerPacks() {
  return [...charger().values()].map(({ pack, regles }) => ({
    id: pack.id, nom: pack.nom, version: pack.version, description: pack.description || "",
    motifs: regles.filter((r) => r.type === "motif").length,
    entetes: (charger().get(pack.id).entetes || []).length,
    termes_codes: regles.filter((r) => r.type === "toujours_coder").reduce((n, r) => n + r.termes.length, 0),
    termes_clairs: regles.filter((r) => r.type === "laisser_en_clair").reduce((n, r) => n + r.termes.length, 0),
    regles: regles.map((r) => ({ id: r.id, type: r.type, libelle: r.libelle, prefixe: r.prefixe, exemple: r.exemple, termes: r.termes ? r.termes.length : undefined, controle: r.controle })),
  }));
}

export function lirePack(id) {
  const e = charger().get(String(id));
  return e ? e.pack : null;
}

/* Les règles des packs demandés, prêtes pour compilerRegles. Un id inconnu
   ou mal formé est une erreur (fail closed). */
export function developperPacks(ids) {
  const regles = [];
  const entetes = [];
  const erreurs = [];
  const vus = new Set();
  if (ids === undefined || ids === null) return { regles, entetes, erreurs };
  if (!Array.isArray(ids)) return { regles, entetes, erreurs: ["« packs » doit être une liste d'identifiants"] };
  for (const id of ids) {
    const s = String(id);
    if (vus.has(s)) continue;
    vus.add(s);
    const e = charger().get(s);
    if (!e) { erreurs.push(`pack « ${s.slice(0, 40)} » inconnu de ce connecteur : mettez à jour l'appli (ou retirez-le des réglages)`); continue; }
    regles.push(...e.regles);
    entetes.push(...(e.entetes || []));
    erreurs.push(...e.erreurs);
  }
  return { regles, entetes, erreurs };
}

/* Les packs actifs PAR DÉFAUT (v2.25) : ceux d'un dossier qui n'a rien
   choisi, ni dans reglages.json ni par la politique signée du cabinet.
   Choisis par la mesure (HT-Bench, bench/ht-bench/packs.mjs) : activés pour
   TOUS les documents, ils font monter le rappel des identifiants directs sans
   corrompre aucune sortie ni coder de leurres chez les autres métiers. Santé
   n'y est pas : ses motifs corrompent encore des sorties. Un dossier qui
   déclare « packs » — même [] — n'en reçoit aucun d'office. */
export const PACKS_PAR_DEFAUT = Object.freeze(["telecom-ma", "juridique-fr", "rh-paie", "banque-assurance", "expertise-comptable"]);

/* Les packs à ajouter d'office : seulement si personne n'a choisi. */
export function packsParDefaut({ dossierDeclare = false, politiqueDeclare = false } = {}) {
  if (dossierDeclare || politiqueDeclare) return { ids: [], regles: [], entetes: [], erreurs: [] };
  return { ids: [...PACKS_PAR_DEFAUT], ...developperPacks(PACKS_PAR_DEFAUT) };
}

/* Pour les tests et la console : relire sans cache. */
export function oublierCache() { cache = null; }
