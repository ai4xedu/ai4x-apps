// ============================================================================
// EMPREINTES DES NOMS (spec §2.3) — la liste des clients est elle-même un
// secret : la politique n'en contient que des HMAC-SHA256 calculés avec le
// sel du cabinet. Un SHA-256 simple se casserait avec un annuaire de noms ;
// sans le sel, une empreinte HMAC ne révèle rien.
//
// ⚠️ La normalisation est un CONTRAT avec le poste (US-5) : le poste découpe
// le prompt en n-grammes de 1 à MAX_MOTS mots, normalisés exactement ainsi,
// puis compare leurs empreintes. Toute modification ici casse la détection
// de toutes les politiques déjà émises — changer alors le préfixe « hm1: ».
// ============================================================================
import crypto from "node:crypto";

export const PREFIXE = "hm1:";
export const MAX_MOTS = 6;
export const MIN_CARACTERES = 3;

/* Minuscules, accents retirés, tout ce qui n'est ni lettre ni chiffre devient
   un espace (apostrophes, tirets, points), espaces multiples réduits. */
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
  return PREFIXE + crypto.createHmac("sha256", sel).update(n, "utf8").digest("hex");
}

/* Le texte contient-il la forme, en mots entiers ? (sert à vérifier qu'aucun
   nom protégé ne traîne en clair dans la politique). */
export function contientEnMots(texteNormalise, formeNormalisee) {
  return (" " + texteNormalise + " ").includes(" " + formeNormalisee + " ");
}
