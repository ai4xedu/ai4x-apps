// ============================================================================
// HT-BENCH — retrouver, dans le texte d'ORIGINE, ce que le moteur a codé.
//
// Le texte codé est le texte d'origine où des passages ont été remplacés par
// des codes (NOM-001…). On le relit morceau par morceau : un morceau en clair
// doit se retrouver tel quel, un code « avale » le passage d'origine qu'il
// remplace. La clé du document (code → valeur) dit lequel : la valeur telle
// quelle, ou — une même valeur écrite autrement (« 06 61… » / « 0661… ») —
// les mêmes lettres et chiffres, séparateurs ignorés.
//
// Quand le moteur rend un texte qui n'est plus « l'origine + des codes »
// (codes imbriqués : « NOM-001-002 », « amoASSURE-001 » recodé), on repasse
// par une plus longue sous-suite commune, chaque code réduit à un caractère
// qui ne se confond avec rien : ce qui n'est pas retrouvé tel quel est
// « sous un code ». Le document est alors signalé (imbrique: true).
// ============================================================================

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALNUM = /[\p{L}\p{N}]/u;
const plier = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/* La plus courte étendue d'origine, à partir de p, qui porte les mêmes
   lettres et chiffres que v (séparateurs et casse ignorés). */
function memeValeur(orig, p, v) {
  const cible = plier([...v].filter((ch) => ALNUM.test(ch)).join(""));
  if (!cible || !ALNUM.test(orig[p] || "")) return -1;
  let lu = "";
  for (let i = p; i < orig.length; i++) {
    if (ALNUM.test(orig[i])) {
      lu += plier(orig[i]);
      if (!cible.startsWith(lu)) return -1;
      if (lu === cible) return i + 1;
    }
  }
  return -1;
}

const CODE_CAR = "\uE000";

/* Repli : plus longue sous-suite commune entre l'origine et le texte codé
   (codes réduits à CODE_CAR). Les caractères d'origine non retrouvés sont
   les passages codés ; chacun prend les codes posés en face. */
function alignerParDiff(orig, code, rx) {
  const codes = [];
  const c = code.replace(rx, (m) => { codes.push(m); return CODE_CAR; });
  let a = 0;
  while (a < orig.length && a < c.length && orig[a] === c[a]) a++;
  let z = 0;
  while (z < orig.length - a && z < c.length - a && orig[orig.length - 1 - z] === c[c.length - 1 - z]) z++;
  const o = orig.slice(a, orig.length - z), k = c.slice(a, c.length - z);
  const n = o.length, m = k.length, w = m + 1;
  const T = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      T[i * w + j] = o[i] === k[j] ? T[(i + 1) * w + j + 1] + 1 : Math.max(T[(i + 1) * w + j], T[i * w + j + 1]);
    }
  }
  // Remontée : paires (i, j) retrouvées telles quelles.
  const garde = new Uint8Array(n);
  const enFace = new Int32Array(n + 1).fill(-1);   // pour un i retrouvé : son j
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (o[i] === k[j]) { garde[i] = 1; enFace[i] = j; i++; j++; }
    else if (T[(i + 1) * w + j] >= T[i * w + j + 1]) i++;
    else j++;
  }
  const avant = (str, upto) => (str.slice(0, upto).match(new RegExp(CODE_CAR, "g")) || []).length;
  const segments = [];
  for (let x = 0; x < n; ) {
    if (garde[x]) { x++; continue; }
    let y = x;
    while (y < n && !garde[y]) y++;
    // Les codes posés en face : entre le j du dernier caractère gardé avant x
    // et le j du premier gardé après y.
    let j0 = 0;
    for (let q = x - 1; q >= 0; q--) if (garde[q]) { j0 = enFace[q] + 1; break; }
    let j1 = m;
    for (let q = y; q < n; q++) if (garde[q]) { j1 = enFace[q]; break; }
    const debutCodes = avant(c, a + j0);
    const nb = (k.slice(j0, j1).match(new RegExp(CODE_CAR, "g")) || []).length;
    const poses = codes.slice(debutCodes, debutCodes + nb);
    segments.push({ debut: a + x, fin: a + y, code: poses.join(" ") || "?", prefixe: poses.length ? poses[0].replace(/-\d+$/, "") : "?" });
    x = y;
  }
  return segments;
}

/* → { segments: [{ debut, fin, code, prefixe }] (positions du texte
   d'origine), imbrique, allerRetour }
   allerRetour (v2.28) : décoder le texte codé avec sa clé rend l'origine —
   chaque morceau en clair s'y retrouve tel quel, chaque code remplace sa
   valeur (au plus écrite autrement : séparateurs, casse). Faux pour un texte
   imbriqué, ou quand un code ne recouvre pas sa valeur (le réalignement a dû
   se rabattre sur le morceau en clair suivant). La CI l'exige partout. */
export function aligner(orig, code, cle) {
  const codes = Object.keys(cle).sort((a, b) => b.length - a.length);
  if (!codes.length) return { segments: orig === code ? [] : alignerParDiff(orig, code, /$^/g), imbrique: orig !== code, allerRetour: orig === code };
  const rx = new RegExp(`(?<![A-Z0-9-])(?:${codes.map(esc).join("|")})(?![A-Za-z0-9])`, "g");
  try {
    const r = alignerExact(orig, code, cle, rx);
    return { segments: r.segments, imbrique: false, allerRetour: r.replis === 0 };
  } catch {
    // Une chaîne imbriquée (« NOM-002-TEL-002-REF-001-004 ») compte pour UN
    // code : ses chiffres ne doivent pas s'apparier à ceux de l'origine.
    const alt = codes.map(esc).join("|");
    const chaine = new RegExp(`(?<![A-Z0-9-])(?:${alt})(?:-(?:${alt}|\\d{3,}))*(?![A-Za-z0-9])`, "g");
    return { segments: alignerParDiff(orig, code, chaine), imbrique: true, allerRetour: false };
  }
}

function alignerExact(orig, code, cle, rx) {
  const morceaux = [];
  let dernier = 0;
  for (const m of code.matchAll(rx)) {
    morceaux.push({ clair: code.slice(dernier, m.index) });
    morceaux.push({ code: m[0] });
    dernier = m.index + m[0].length;
  }
  morceaux.push({ clair: code.slice(dernier) });

  const segments = [];
  let p = 0;
  let replis = 0;
  for (let k = 0; k < morceaux.length; k++) {
    const x = morceaux[k];
    if (x.clair !== undefined) {
      if (!orig.startsWith(x.clair, p)) {
        throw new Error(`texte en clair introuvable à la position ${p} : « ${x.clair.slice(0, 40)} » ≠ « ${orig.slice(p, p + 40)} »`);
      }
      p += x.clair.length;
      continue;
    }
    const v = String(cle[x.code]);
    let fin = orig.startsWith(v, p) ? p + v.length : memeValeur(orig, p, v);
    if (fin < 0) {
      // Repli : jusqu'au prochain morceau en clair.
      const suite = morceaux[k + 1]?.clair ?? "";
      const j = suite ? orig.indexOf(suite, p + 1) : orig.length;
      if (j < 0) throw new Error(`code ${x.code} : passage d'origine introuvable à la position ${p}`);
      fin = j;
      replis++;
    }
    segments.push({ debut: p, fin, code: x.code, prefixe: x.code.replace(/-\d+$/, "") });
    p = fin;
  }
  if (p !== orig.length) throw new Error(`réalignement incomplet (${p}/${orig.length})`);
  return { segments, replis };
}
