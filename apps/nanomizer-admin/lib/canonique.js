// ============================================================================
// JSON CANONIQUE (esprit RFC 8785) — la signature porte sur des octets, donc
// le même contenu doit toujours donner les mêmes octets : clés triées, aucun
// espace, pas de valeur `undefined`. Suffisant pour nos politiques (chaînes,
// entiers, booléens, tableaux, objets) ; on refuse les nombres non finis.
// ============================================================================

export function canonique(v) {
  if (v === null || typeof v !== "object") {
    if (typeof v === "number" && !Number.isFinite(v)) throw new TypeError("nombre non fini dans la politique");
    if (v === undefined) throw new TypeError("valeur indéfinie dans la politique");
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return "[" + v.map(canonique).join(",") + "]";
  return "{" + Object.keys(v)
    .filter((k) => v[k] !== undefined)
    .sort()
    .map((k) => JSON.stringify(k) + ":" + canonique(v[k]))
    .join(",") + "}";
}
