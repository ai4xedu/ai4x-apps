// ============================================================================
// VERROU DE SORTIE — le dernier filet, posé sur CHAQUE réponse d'outil.
//
// Le verrou (verrou.js) code les données AVANT de construire une réponse.
// Mais une réponse contient aussi des chemins, des noms d'onglets, des
// messages d'erreur, des comptes rendus : autant d'endroits où une valeur
// réelle pourrait se glisser par une porte à laquelle personne n'a pensé.
// Ce module ne fait confiance à personne : il repasse sur le texte FINAL,
// juste avant qu'il parte vers le modèle, et
//   1. remplace le dossier personnel (/Users/<nom>) par « ~ » ;
//   2. remplace toute valeur que la clé connaît par SON code — une valeur
//      déjà codée une fois ne peut donc plus jamais sortir en clair, par
//      aucun chemin ;
//   3. masque ce qui a la forme d'une donnée sensible (email, téléphone,
//      IBAN, identifiant numérique long, CIN) : « [MASQUÉ] ».
// Il est branché dans index.js par le seul point d'enregistrement des
// outils : un outil ajouté demain en hérite sans qu'on y pense.
// ============================================================================
import { knownValueMatcher } from "./verrou.js";

export const MASK = "[MASQUÉ]";

/* Nos propres liens (achat, appli gratuite, téléchargement de Claude) ne
   sont pas des données : ils sont mis à l'abri avant le filtrage. */
const OWN_LINKS = [
  /https:\/\/wa\.me\/212680092567(?:\?text=[^\s)]*)?/g,
  /https:\/\/ai4x\.academy\/[^\s)]*/g,
  /https:\/\/claude\.ai\/download/g,
  /\+212 680 092 567/g,
];

/* Chiffres de toutes écritures et séparateurs de toutes sortes (cf. verrou.js). */
const D = "\\p{Nd}";
const SEP = "[ .\\-/\\u00A0\\u2010-\\u2015\\u2212\\u00B7]";
const SEPNS = "[ .\\-\\u00A0\\u2010-\\u2015\\u2212\\u00B7]";

const OUT_PATTERNS = [
  /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu,                                        // email
  /\b(?:https?:\/\/|www\.)[^\s<>"'()]+/gi,                                                   // lien
  /\b[A-Z]{2}\p{Nd}{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/gu,                     // IBAN
  new RegExp(`(?<![\\p{Nd}+])(?:\\+|00)${D}{1,3}${SEPNS}?(?:\\(0\\)${SEPNS}?)?\\(?${D}{1,4}\\)?(?:${SEPNS}?${D}{2,4}){2,5}(?!${D})`, "gu"), // tél. international
  new RegExp(`(?<!${D})0[1-9](?:${SEP}?${D}{2}){4}(?!${D})`, "gu"),                              // tél. FR / MA
  // Chiffres groupés (≥ 4 groupes) : « 01 423 456 78 ». Pas précédés d'une
  // lettre ou d'un tiret : les horodatages de NOS fichiers (rapport-lot-2026-09-18-21-30)
  // ne sont pas des numéros.
  new RegExp(`(?<![\\p{Nd}\\p{L}_\\-])${D}{1,4}(?:${SEP}${D}{1,4}){3,}(?!${D})`, "gu"),
  new RegExp(`(?<!${D})${D}{10,}(?!${D})`, "gu"),                                                 // identifiant long
  new RegExp(`(?<![\\p{L}\\p{N}-])(?!CA\\b|HT\\b)[A-Z]{1,2}[ \\u00A0]?${D}{5,8}(?![\\p{L}\\p{N}])`, "gu"), // CIN, passeport
];

/* Filtre un texte sortant. ctx : { book, home }.
   Renvoie { text, masked, recoded }. */
export function guardText(input, ctx = {}) {
  let s = String(input == null ? "" : input);
  const shelter = [];
  for (const rx of OWN_LINKS) {
    s = s.replace(rx, (m) => { shelter.push(m); return `${shelter.length - 1}`; });
  }
  if (ctx.home && ctx.home.length > 1) s = s.split(ctx.home).join("~");

  let recoded = 0;
  const known = ctx.book ? knownValueMatcher(ctx.book) : null;
  if (known) {
    const r = known(s);
    s = r.text;
    recoded = r.replaced;
  }

  let masked = 0;
  for (const rx of OUT_PATTERNS) {
    s = s.replace(rx, () => { masked++; return MASK; });
  }
  s = s.replace(/(\d+)/g, (_, i) => shelter[Number(i)]);
  return { text: s, masked, recoded };
}

/* Applique le filtre à un résultat d'outil MCP complet. */
export function guardResult(result, ctx = {}) {
  if (!result || !Array.isArray(result.content)) return result;
  let masked = 0;
  const content = result.content.map((c) => {
    if (!c || c.type !== "text") return c;
    const g = guardText(c.text, ctx);
    masked += g.masked;
    return { ...c, text: g.text };
  });
  if (masked) {
    content.push({
      type: "text",
      text:
        `🔒 Verrou de sortie : ${masked} élément(s) remplacé(s) par ${MASK} dans cette réponse — une donnée ` +
        "sensible avait échappé au codage. Préviens l'utilisateur : le fichier produit sur son poste peut la " +
        "contenir, qu'il le relise avant tout partage. Ne lui demande pas la valeur masquée.",
    });
  }
  return { ...result, content };
}
