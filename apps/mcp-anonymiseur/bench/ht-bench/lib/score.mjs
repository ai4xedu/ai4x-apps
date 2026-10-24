// ============================================================================
// HT-BENCH — le score, à partir des passages codés réalignés.
//
// Une valeur étiquetée est :
//   « détectée »  si TOUTES ses lettres et chiffres sont sous un code — sauf
//                 les mots qui, seuls, ne révèlent rien : particules d'un nom
//                 (Ben, El, Aït, de, Le…), numéro court et mots de structure
//                 d'une adresse (n°, Imm., rue, Douar…) ;
//   « partielle » si une partie seulement l'est (= une fuite : comptée manquée) ;
//   « manquée »   si rien ne l'est.
// Un leurre est un faux positif dès qu'un de ses caractères est sous un code.
//
// Rappel(type)    = détectées / étiquetées (quel que soit le préfixe : la
//                   valeur est protégée) ;
// Précision(type) = passages codés sous un préfixe de ce type (cf. types.mjs,
//                   préfixe attribué au premier type qui le déclare) qui
//                   recouvrent bien une valeur de ce type / tous ces passages ;
// Précision(pack) = passages qui recouvrent une valeur étiquetée / tous les
//                   passages codés (un mot courant codé à tort la fait baisser) ;
// F1 = 2PR / (P + R).
// ============================================================================
import { POSITIFS, LEURRES } from "./types.mjs";
import { PARTICULES } from "./noms.mjs";

const ALNUM = /[\p{L}\p{N}]/u;
// Un mot : lettres et chiffres, voyelles arabes (tachkil) comprises ; seules
// les lettres et chiffres comptent comme positions à coder.
const MOT = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu;
/* Casse, accents, voyelles et hamza arabes ignorés ; chiffres arabes
   orientaux (٠١٢…, ۰۱۲…) lus comme des chiffres latins. */
const plier = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) & 0xf));

/* Le premier type qui déclare un préfixe le « possède » pour la précision. */
export const TYPE_DU_PREFIXE = {};
for (const [t, d] of Object.entries(POSITIFS)) for (const p of d.prefixes) TYPE_DU_PREFIXE[p] ??= t;

/* Les positions qui comptent dans une étendue (lettres, chiffres ; pour un
   nom, hors particules). */
/* Les mots d'une adresse qui ne désignent rien seuls : numéros courts,
   mots de structure. La voie, elle, doit être codée. */
const STRUCTURE_ADRESSE = new Set(["n", "no", "bis", "ter", "imm", "immeuble", "appt", "apt", "bat", "batiment", "etage", "rue", "avenue", "av",
  "bd", "boulevard", "impasse", "allee", "chemin", "place", "quai", "residence", "lotissement", "lot", "douar", "hay", "quartier",
  "cedex", "des", "du", "de", "la", "le", "les", "d", "l", "a", "b", "c", "al",
  // En lettres arabes (sans hamza, cf. plier) : رقم، زنقة، شارع، حي، إقامة، عمارة، شقة، تجزئة، دوار…
  "رقم", "زنقة", "شارع", "حي", "اقامة", "عمارة", "شقة", "تجزئة", "دوار", "درب", "طابق", "الطابق"]);
export function ignorable(type, mot) {
  const x = plier(mot);
  if (type === "PERSONNE") return PARTICULES.has(x);
  if (type === "ADRESSE") return STRUCTURE_ADRESSE.has(x) || /^\d{1,4}$/.test(x);
  return false;
}

function positionsUtiles(texte, e) {
  const out = [];
  const s = texte.slice(e.debut, e.fin);
  for (const m of s.matchAll(MOT)) {
    if (ignorable(e.type, m[0])) continue;
    for (let i = 0; i < m[0].length; i++) if (ALNUM.test(m[0][i])) out.push(e.debut + m.index + i);
  }
  return out;
}

const recouvre = (a, b) => a.debut < b.fin && b.debut < a.fin;

/* Un document : statut de chaque étendue, de chaque leurre, de chaque passage. */
const escRx = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Les morceaux d'une valeur restés en clair (mots, hors particules). */
function morceauxEnClair(texte, e, couvert) {
  const out = [];
  const s = texte.slice(e.debut, e.fin);
  for (const m of s.matchAll(MOT)) {
    if (ignorable(e.type, m[0])) continue;
    let run = "";
    for (let i = 0; i < m[0].length; i++) {
      if (!ALNUM.test(m[0][i])) { if (run) run += m[0][i]; continue; }
      if (!couvert[e.debut + m.index + i]) run += m[0][i];
      else if (run) { out.push(run); run = ""; }
    }
    if (run) out.push(run);
  }
  return out;
}

/* vu : la réponse de coder_texte (verrou de sortie compris) — ce que l'IA lit. */
export function evaluerDocument(doc, segments, vu = null) {
  const couvert = new Uint8Array(doc.texte.length);
  for (const s of segments) couvert.fill(1, s.debut, s.fin);
  const positifs = doc.etendues.map((e) => {
    const pos = positionsUtiles(doc.texte, e);
    const n = pos.filter((i) => couvert[i]).length;
    const statut = !pos.length || n === pos.length ? "detecte" : n ? "partiel" : "manque";
    const prefixes = [...new Set(segments.filter((s) => recouvre(s, e)).map((s) => s.prefixe))];
    const bienEtiquete = prefixes.some((p) => POSITIFS[e.type].prefixes.includes(p));
    const r = { ...e, statut, prefixes, bienEtiquete };
    if (statut !== "detecte") {
      r.enClair = morceauxEnClair(doc.texte, e, couvert);
      // La fuite atteint-elle l'IA, ou le verrou de sortie la rattrape-t-il ?
      // (chemin .md seulement : vu = la réponse de coder_texte)
      if (vu !== null) r.vuParIA = r.enClair.some((m) => new RegExp(`(?<![\\p{L}\\p{N}])${escRx(m)}(?![\\p{L}\\p{N}])`, "u").test(vu));
    }
    return r;
  });
  const leurres = doc.leurres.map((e) => {
    let code = false;
    for (let i = e.debut; i < e.fin; i++) if (couvert[i] && ALNUM.test(doc.texte[i])) { code = true; break; }
    const prefixes = [...new Set(segments.filter((s) => recouvre(s, e)).map((s) => s.prefixe))];
    return { ...e, code, prefixes };
  });
  const passages = segments.map((s) => {
    const pos = doc.etendues.filter((e) => recouvre(s, e));
    const typeAttendu = TYPE_DU_PREFIXE[s.prefixe] || null;
    return {
      ...s,
      texte: doc.texte.slice(s.debut, s.fin),
      classe: pos.length ? "positif" : doc.leurres.some((e) => recouvre(s, e)) ? "leurre" : "hors-etiquette",
      typesRecouverts: [...new Set(pos.map((e) => e.type))],
      typeAttendu,
    };
  });
  // Lisibilité : parmi les lettres et chiffres hors de toute valeur
  // étiquetée (le texte du document, leurres compris), la part restée en
  // clair. Un document arabe codé en un seul bloc a un rappel parfait et une
  // lisibilité nulle : l'IA ne peut plus rien en faire.
  const dansPositif = new Uint8Array(doc.texte.length);
  for (const e of doc.etendues) dansPositif.fill(1, e.debut, e.fin);
  let neutres = 0, lisibles = 0;
  for (let i = 0; i < doc.texte.length; i++) {
    if (dansPositif[i] || !ALNUM.test(doc.texte[i])) continue;
    neutres++;
    if (!couvert[i]) lisibles++;
  }
  return { positifs, leurres, passages, neutres, lisibles, masquesSortie: vu === null ? 0 : (vu.match(/•••/g) || []).length };
}

const ratio = (a, b) => (b ? a / b : null);
const lisibilite = (rs) => ratio(rs.reduce((n, r) => n + r.lisibles, 0), rs.reduce((n, r) => n + r.neutres, 0));
const f1 = (p, r) => (p === null || r === null || p + r === 0 ? null : (2 * p * r) / (p + r));

function compterPositifs(liste) {
  const n = liste.length, det = liste.filter((e) => e.statut === "detecte").length;
  const partiel = liste.filter((e) => e.statut === "partiel").length;
  return { n, detectes: det, partiels: partiel, manques: n - det - partiel, rappel: ratio(det, n) };
}

/* Tout le jeu : les tableaux du rapport. Un résultat { refus } (le moteur
   n'a pas écrit de fichier) est compté à part, hors des taux. */
export function agreger(tous) {
  const refuses = tous.filter((r) => r.refus);
  const resultats = tous.filter((r) => !r.refus);
  const tousPos = resultats.flatMap((r) => r.positifs.map((e) => ({ ...e, doc: r.id, pack: r.pack, langue: r.langue })));
  const tousLeurres = resultats.flatMap((r) => r.leurres.map((e) => ({ ...e, doc: r.id, pack: r.pack, langue: r.langue })));
  const tousPassages = resultats.flatMap((r) => r.passages.map((s) => ({ ...s, doc: r.id, pack: r.pack, langue: r.langue })));

  const parType = {};
  for (const t of Object.keys(POSITIFS)) {
    const l = tousPos.filter((e) => e.type === t);
    if (!l.length) continue;
    const c = compterPositifs(l);
    const sous = tousPassages.filter((s) => s.typeAttendu === t);
    const justes = sous.filter((s) => s.typesRecouverts.includes(t)).length;
    const precision = ratio(justes, sous.length);
    const det = l.filter((e) => e.statut === "detecte");
    parType[t] = {
      libelle: POSITIFS[t].libelle, direct: POSITIFS[t].direct, ...c,
      passages: sous.length, passages_justes: justes, precision, f1: f1(precision, c.rappel),
      bien_etiquetes: det.filter((e) => e.bienEtiquete).length,
    };
  }

  const packs = [...new Set(resultats.map((r) => r.pack))];
  const parPack = {};
  for (const p of packs) {
    const pos = tousPos.filter((e) => e.pack === p);
    const dir = pos.filter((e) => POSITIFS[e.type].direct);
    const pas = tousPassages.filter((s) => s.pack === p);
    const lr = tousLeurres.filter((e) => e.pack === p);
    const tous = compterPositifs(pos);
    const precision = ratio(pas.filter((s) => s.classe === "positif").length, pas.length);
    const directParType = {};
    for (const t of [...new Set(dir.map((e) => e.type))].sort()) directParType[t] = compterPositifs(dir.filter((e) => e.type === t));
    parPack[p] = {
      documents: resultats.filter((r) => r.pack === p).length,
      direct: compterPositifs(dir),
      tous: tous,
      precision, f1: f1(precision, tous.rappel),
      lisibilite: lisibilite(resultats.filter((r) => r.pack === p)),
      passages: pas.length,
      passages_leurres: pas.filter((s) => s.classe === "leurre").length,
      passages_hors_etiquette: pas.filter((s) => s.classe === "hors-etiquette").length,
      leurres: { n: lr.length, codes: lr.filter((e) => e.code).length, taux_faux_positifs: ratio(lr.filter((e) => e.code).length, lr.length) },
      direct_par_type: directParType,
    };
  }

  // Par langue du document : fr, ar (écriture arabe), fr-ar (bilingue),
  // darija-latin (arabizi).
  const parLangue = {};
  for (const l of [...new Set(resultats.map((r) => r.langue))].sort()) {
    const pos = tousPos.filter((e) => e.langue === l);
    const pas = tousPassages.filter((s) => s.langue === l);
    const lr = tousLeurres.filter((e) => e.langue === l);
    parLangue[l] = {
      documents: resultats.filter((r) => r.langue === l).length,
      direct: compterPositifs(pos.filter((e) => POSITIFS[e.type].direct)),
      tous: compterPositifs(pos),
      precision: ratio(pas.filter((s) => s.classe === "positif").length, pas.length),
      lisibilite: lisibilite(resultats.filter((r) => r.langue === l)),
      leurres: { n: lr.length, codes: lr.filter((e) => e.code).length, taux_faux_positifs: ratio(lr.filter((e) => e.code).length, lr.length) },
    };
  }

  const parVariante = {};
  for (const e of tousPos) {
    const k = `${e.type} · ${e.variante || "—"}`;
    (parVariante[k] ||= []).push(e);
  }
  const parTrait = {};
  for (const e of tousPos) for (const t of e.traits || []) (parTrait[`${e.type} · ${t}`] ||= []).push(e);

  const parLeurre = {};
  for (const k of Object.keys(LEURRES)) {
    const l = tousLeurres.filter((e) => e.type === k);
    if (l.length) parLeurre[k] = { libelle: LEURRES[k], n: l.length, codes: l.filter((e) => e.code).length, taux: ratio(l.filter((e) => e.code).length, l.length) };
  }

  const dir = tousPos.filter((e) => POSITIFS[e.type].direct);
  const horsEtiquette = {};
  for (const s of tousPassages.filter((x) => x.classe === "hors-etiquette")) {
    const k = `${s.prefixe} « ${s.texte} »`;
    horsEtiquette[k] = (horsEtiquette[k] || 0) + 1;
  }

  return {
    global: {
      direct: compterPositifs(dir),
      tous: compterPositifs(tousPos),
      precision: ratio(tousPassages.filter((s) => s.classe === "positif").length, tousPassages.length),
      lisibilite: lisibilite(resultats),
      passages: tousPassages.length,
      leurres: { n: tousLeurres.length, codes: tousLeurres.filter((e) => e.code).length, taux_faux_positifs: ratio(tousLeurres.filter((e) => e.code).length, tousLeurres.length) },
    },
    par_type: parType,
    par_pack: parPack,
    par_langue: parLangue,
    refuses: { n: refuses.length, documents: refuses.map((r) => ({ doc: r.id, pack: r.pack, langue: r.langue, motif: r.refus })) },
    par_variante: Object.fromEntries(Object.entries(parVariante).sort().map(([k, l]) => [k, { direct: POSITIFS[l[0].type].direct, ...compterPositifs(l) }])),
    par_trait: Object.fromEntries(Object.entries(parTrait).sort().map(([k, l]) => [k, compterPositifs(l)])),
    par_leurre: parLeurre,
    manques: tousPos.filter((e) => e.statut !== "detecte").map((e) => ({
      doc: e.doc, pack: e.pack, type: e.type, direct: POSITIFS[e.type].direct, variante: e.variante || "", traits: e.traits || [],
      valeur: e.valeur, statut: e.statut, prefixes: e.prefixes, en_clair: e.enClair || [], vu_par_ia: e.vuParIA ?? null, langue: e.langue,
    })),
    verrou_de_sortie: {
      manques_directs: dir.filter((e) => e.statut !== "detecte").length,
      manques_directs_vus_par_ia: dir.filter((e) => e.statut !== "detecte" && e.vuParIA).length,
      masquages_par_pack: Object.fromEntries(packs.map((p) => [p, resultats.filter((r) => r.pack === p).reduce((n, r) => n + (r.masquesSortie || 0), 0)])),
    },
    faux_positifs: tousLeurres.filter((e) => e.code).map((e) => ({ doc: e.doc, pack: e.pack, langue: e.langue, type: e.type, variante: e.variante || "", valeur: e.valeur, prefixes: e.prefixes })),
    hors_etiquette: Object.entries(horsEtiquette).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => ({ passage: k, n })),
  };
}

/* Les plus gros écarts : (type direct, écriture) classés par valeurs perdues. */
export function ecarts(agg, n = 5) {
  return Object.entries(agg.par_variante)
    .filter(([, v]) => v.direct && v.detectes < v.n)
    .map(([k, v]) => ({ cle: k, ...v, perdues: v.n - v.detectes }))
    .sort((a, b) => b.perdues - a.perdues || a.rappel - b.rappel || a.cle.localeCompare(b.cle))
    .slice(0, n);
}
