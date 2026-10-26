// ============================================================================
// HT-BENCH — le balisage des documents.
//
//   [[TYPE:valeur]]                       un positif (à coder)
//   [[TYPE|variante:valeur]]              … avec son écriture
//   [[TYPE|variante|trait,trait:valeur]]  … et ses traits
//   {{LEURRE:valeur}}                     un leurre (doit rester lisible)
//   {{LEURRE|variante:valeur}}
//
// Le gabarit et le cas écrit à la main parlent la même langue : on écrit le
// texte, on balise ce qui compte, analyser() rend le texte nu et les
// étendues (début, fin) en positions de caractères UTF-16 du texte nu.
// ============================================================================
import { POSITIFS, LEURRES } from "./types.mjs";

const BALISE = /\[\[([^\]:]+):((?:(?!\]\]).)+)\]\]|\{\{([^}:]+):((?:(?!\}\}).)+)\}\}/gsu;

export function analyser(balise, ou = "document") {
  let texte = "";
  const etendues = [];
  const leurres = [];
  let dernier = 0;
  for (const m of balise.matchAll(BALISE)) {
    texte += balise.slice(dernier, m.index);
    dernier = m.index + m[0].length;
    const positif = m[1] !== undefined;
    const [type, variante = "", traits = ""] = (positif ? m[1] : m[3]).split("|");
    const valeur = positif ? m[2] : m[4];
    if (positif && !POSITIFS[type]) throw new Error(`${ou} : type inconnu « ${type} »`);
    if (!positif && !LEURRES[type]) throw new Error(`${ou} : leurre inconnu « ${type} »`);
    const e = { debut: texte.length, fin: texte.length + valeur.length, type, valeur };
    if (variante) e.variante = variante;
    if (traits) e.traits = traits.split(",").filter(Boolean);
    (positif ? etendues : leurres).push(e);
    texte += valeur;
  }
  texte += balise.slice(dernier);
  if (/\[\[|\]\]|\{\{|\}\}/.test(texte)) throw new Error(`${ou} : balise mal fermée`);
  return { texte, etendues, leurres };
}

/* Fabrique de balises, pour les gabarits. */
export const P = (type, { valeur, variante = "", traits = [] }) =>
  `[[${type}${variante || traits.length ? `|${variante}` : ""}${traits.length ? `|${traits.join(",")}` : ""}:${valeur}]]`;
export const L = (type, valeur, variante = "") => `{{${type}${variante ? `|${variante}` : ""}:${valeur}}}`;
