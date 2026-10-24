// HT-BENCH — hasard reproductible. Une graine (texte) → toujours le même
// jeu de données, sur toutes les machines, toutes les versions de Node.
// mulberry32 : 32 bits, assez pour tirer des documents, pas pour chiffrer.

function hacher(graine) {
  let h = 1779033703 ^ graine.length;
  for (let i = 0; i < graine.length; i++) {
    h = Math.imul(h ^ graine.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function hasard(graine) {
  let a = hacher(String(graine));
  const suivant = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const h = {
    reel: suivant,
    entier: (min, max) => min + Math.floor(suivant() * (max - min + 1)),
    choix: (liste) => liste[Math.floor(suivant() * liste.length)],
    pile: (p = 0.5) => suivant() < p,
    chiffres: (n) => Array.from({ length: n }, () => Math.floor(suivant() * 10)).join(""),
    lettres: (n, alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ") => Array.from({ length: n }, () => alphabet[Math.floor(suivant() * alphabet.length)]).join(""),
    melange: (liste) => {
      const l = [...liste];
      for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(suivant() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
      return l;
    },
    /* Un sous-hasard nommé : ajouter un gabarit ne décale pas les autres. */
    fils: (nom) => hasard(`${graine}/${nom}`),
  };
  return h;
}
