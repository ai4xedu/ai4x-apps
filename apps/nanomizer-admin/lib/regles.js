// ============================================================================
// RÈGLES DE L'ORGANISATION — la part de validation que la console partage avec
// le poste (mcp-anonymiseur/server/regles.js) : forme d'un préfixe maison,
// garde-fous d'un motif, limites des listes de termes. Spec :
// nanomizer/SPEC-REGLES-ORGANISATION.md.
//
// ⚠️ CONTRAT avec le poste : verifierMotif et PREFIXE_RX doivent rendre le
// même verdict des deux côtés — une politique signée avec un motif que le
// poste refuserait serait déclarée ALTEREE sur tous les postes.
// mcp-anonymiseur/test/politique.test.js compare les deux.
//
// Les termes « laisser_en_clair » : le poste refuse tout terme qui a la forme
// d'un identifiant d'après SES détecteurs (email, téléphone, compte, carte,
// CIN, permis…). La console, sans ces détecteurs, applique une règle PLUS
// stricte (trois chiffres, ou une arobase) : ce qu'elle accepte, le poste
// l'accepte aussi ; ce qu'elle refuse était de toute façon douteux.
// ============================================================================

export const PREFIXE_RX = /^[A-Z][A-Z0-9]{1,9}$/;
export const LIMITES = { regles: 200, termes: 500, termeMin: 3, termeMax: 80, motif: 200, libelle: 80, mots: 6 };

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

/* Plus strict que le poste, voir l'en-tête. */
export function ressembleAUnIdentifiant(terme) {
  const s = String(terme ?? "");
  return (s.match(/\p{Nd}/gu) || []).length >= 3 || /@/.test(s);
}
