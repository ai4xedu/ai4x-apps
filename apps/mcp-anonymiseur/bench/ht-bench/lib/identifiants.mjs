// ============================================================================
// HT-BENCH — identifiants SYNTHÉTIQUES aux formats réels.
//
// Chaque numéro est tiré au hasard puis complété par sa clé de contrôle
// (Luhn, mod 97…) : il a la forme d'un vrai, il ne désigne personne. Aucune
// liste d'identifiants réels n'est utilisée, aucun appel réseau n'est fait.
// Chaque générateur rend { valeur, variante } : la variante est l'écriture
// (« ma-mobile-intl-espaces »…), pour mesurer le rappel format par format.
// ============================================================================

export function luhnComplete(partiel) {
  const d = partiel.split("").reverse().map(Number);
  let s = 0;
  for (let i = 0; i < d.length; i++) {
    let x = d[i];
    if (i % 2 === 0) { x *= 2; if (x > 9) x -= 9; }
    s += x;
  }
  return partiel + ((10 - (s % 10)) % 10);
}

const mod97 = (chiffres) => Number(BigInt(chiffres) % 97n);
const deux = (n) => String(n).padStart(2, "0");
const lettresEnChiffres = (s) => s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
const parQuatre = (s) => s.replace(/(.{4})(?=.)/g, "$1 ");

/* Clé IBAN (ISO 13616) : 98 − (BBAN + pays + 00) mod 97. */
export function iban(pays, bban) {
  const cle = 98 - mod97(lettresEnChiffres(bban + pays + "00"));
  return pays + deux(cle) + bban;
}

/* RIB marocain : banque (3) + localité (3) + compte (16) + clé (2), clé
   telle que le RIB entier soit ≡ 0 mod 97. */
export function ribMaroc(h) {
  const corps = h.choix(["007", "011", "013", "021", "022", "145", "190", "230", "350"]) + h.chiffres(3) + h.chiffres(16);
  return corps + deux(97 - mod97(corps + "00"));
}

/* RIB français : banque (5) + guichet (5) + compte (11) + clé (2). */
export function ribFrance(h) {
  const b = h.chiffres(5), g = h.chiffres(5), c = h.chiffres(11);
  const cle = 97 - Number((89n * BigInt(b) + 15n * BigInt(g) + 3n * BigInt(c)) % 97n);
  return b + g + c + deux(cle);
}

export function ribMa(h) {
  const r = ribMaroc(h);
  return h.choix([
    { valeur: `${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6, 22)} ${r.slice(22)}`, variante: "rib-ma-groupes" },
    { valeur: r, variante: "rib-ma-colle" },
    { valeur: `${r.slice(0, 3)}-${r.slice(3, 6)}-${r.slice(6, 22)}-${r.slice(22)}`, variante: "rib-ma-tirets" },
    { valeur: parQuatre(r), variante: "rib-ma-par-4" },
  ]);
}

export function ibanMa(h) {
  const i = iban("MA", ribMaroc(h));
  return h.choix([
    { valeur: parQuatre(i), variante: "iban-ma-par-4" },
    { valeur: i, variante: "iban-ma-colle" },
  ]);
}

export function ibanFr(h) {
  const i = iban("FR", ribFrance(h));
  return h.choix([
    { valeur: parQuatre(i), variante: "iban-fr-par-4" },
    { valeur: i, variante: "iban-fr-colle" },
  ]);
}

export function ribFr(h) {
  const r = ribFrance(h);
  return { valeur: `${r.slice(0, 5)} ${r.slice(5, 10)} ${r.slice(10, 21)} ${r.slice(21)}`, variante: "rib-fr-groupes" };
}

/* BIC : 4 lettres (banque) + pays + 2 (lieu) + 3 facultatifs (agence).
   Banques inventées : on ne tire pas parmi les vrais codes. */
export function bic(h, pays = h.choix(["MA", "FR"])) {
  const v = h.lettres(4) + pays + h.lettres(1) + h.lettres(1, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") + (h.pile(0.4) ? h.lettres(1, "X") + h.lettres(2, "XAB0123") : "");
  return { valeur: v, variante: v.length === 8 ? "bic-8" : "bic-11" };
}

/* CIN marocaine : 1 ou 2 lettres (préfixe régional), 1 à 6 chiffres. */
export function cin(h) {
  const p = h.choix(["A", "B", "BE", "BH", "BJ", "BK", "BL", "C", "CD", "D", "DA", "E", "EE", "F", "G", "GM", "H", "HA", "I", "IA", "J", "JA", "JB", "JC", "JE", "K", "L", "LA", "M", "N", "P", "PA", "Q", "R", "S", "SH", "T", "TA", "U", "V", "W", "X", "Y", "Z", "ZG", "ZT"]);
  const n = h.chiffres(h.choix([5, 6, 6, 6]));
  return h.choix([
    { valeur: p + n, variante: "cin-colle" },
    { valeur: p + n, variante: "cin-colle" },
    { valeur: `${p} ${n}`, variante: "cin-espace" },
    { valeur: `${p}-${n}`, variante: "cin-tiret" },
  ]);
}

/* ICE : 15 chiffres (entreprise 9 + établissement 4 + clé 2). */
export function ice(h) {
  const c = "00" + h.chiffres(7) + "000" + h.chiffres(1);
  const v = c + deux(97 - mod97(c + "00"));
  return h.choix([
    { valeur: v, variante: "ice-colle" },
    { valeur: v, variante: "ice-colle" },
    { valeur: `${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6, 9)} ${v.slice(9, 12)} ${v.slice(12)}`, variante: "ice-par-3" },
  ]);
}

export const rc = (h) => ({ valeur: String(h.entier(10000, 699999)), variante: "rc-nombre" });
export const ifiscal = (h) => ({ valeur: h.choix(["", "", "1", "4", "5"]) + String(h.entier(1000000, 52999999)), variante: "if-nombre" });
/* N° CNSS : 9 chiffres pour un assuré (AMO compris), 7 pour l'affiliation
   d'un employeur. */
export const cnss = (h) => ({ valeur: String(h.entier(100000000, 199999999)), variante: "cnss-assure-9" });
export const cnssEmployeur = (h) => ({ valeur: String(h.entier(1000000, 9999999)), variante: "cnss-affiliation-7" });
export const patente = (h) => ({ valeur: String(h.entier(10000000, 79999999)), variante: "patente" });

/* NIR : sexe, année, mois, département, commune, ordre, clé = 97 − n mod 97. */
export function nir(h) {
  const dep = h.choix(["75", "69", "13", "33", "59", "92", "93", "94", "31", "44", "67", "2A", "2B", "99"]);
  const corps = h.choix(["1", "2"]) + h.chiffres(2) + deux(h.entier(1, 12)) + dep + h.chiffres(3) + h.chiffres(3);
  const num = corps.replace("2A", "19").replace("2B", "18");
  const v = corps + deux(97 - mod97(num));
  const g = `${v[0]} ${v.slice(1, 3)} ${v.slice(3, 5)} ${v.slice(5, 7)} ${v.slice(7, 10)} ${v.slice(10, 13)} ${v.slice(13)}`;
  return h.choix([
    { valeur: g, variante: "nir-groupes" },
    { valeur: v, variante: "nir-colle" },
    { valeur: `${g.slice(0, -3)} - ${v.slice(13)}`, variante: "nir-cle-tiret" },
  ]);
}

export function siren(h) {
  const v = luhnComplete(String(h.entier(30000000, 99999999)));
  return h.choix([
    { valeur: `${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6)}`, variante: "siren-groupes" },
    { valeur: v, variante: "siren-colle" },
  ]);
}

export function siret(h) {
  const s = luhnComplete(String(h.entier(30000000, 99999999)));
  const v = luhnComplete(s + h.chiffres(4));
  return h.choix([
    { valeur: `${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6, 9)} ${v.slice(9)}`, variante: "siret-groupes" },
    { valeur: v, variante: "siret-colle" },
  ]);
}

export function tvaFr(h) {
  const s = luhnComplete(String(h.entier(30000000, 99999999)));
  const cle = deux((12 + 3 * Number(BigInt(s) % 97n)) % 97);
  return h.choix([
    { valeur: `FR${cle}${s}`, variante: "tva-fr-colle" },
    { valeur: `FR ${cle} ${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`, variante: "tva-fr-groupes" },
  ]);
}

/* Téléphones. Toutes les écritures qu'on rencontre dans un dossier marocain
   ou français : national, international, (0), 00, points, tirets, collé. */
export function telMa(h) {
  const t = h.choix(["6", "6", "7", "5"]);
  const n = t + h.chiffres(8);          // 9 chiffres après l'indicatif
  const p = (s, sep) => s.replace(/(\d{2})(?=\d)/g, `$1${sep}`);
  const nat = "0" + n;
  const fixe = t === "5" ? "fixe" : "mobile";
  return h.choix([
    { valeur: nat, variante: `ma-${fixe}-national-colle` },
    { valeur: p(nat, " "), variante: `ma-${fixe}-national-espaces` },
    { valeur: p(nat, "."), variante: `ma-${fixe}-national-points` },
    { valeur: p(nat, "-"), variante: `ma-${fixe}-national-tirets` },
    { valeur: `${nat.slice(0, 4)} ${p(nat.slice(4), " ")}`, variante: `ma-${fixe}-national-4-2-2-2` },
    { valeur: `+212 ${n[0]} ${p(n.slice(1), " ")}`, variante: `ma-${fixe}-intl-espaces` },
    { valeur: `+212${n}`, variante: `ma-${fixe}-intl-colle` },
    { valeur: `+212 (0)${n[0]} ${p(n.slice(1), " ")}`, variante: `ma-${fixe}-intl-zero-parenthese` },
    { valeur: `00212 ${n.slice(0, 3)} ${p(n.slice(3), " ")}`, variante: `ma-${fixe}-00212` },
    { valeur: `+212-${n.slice(0, 3)}-${n.slice(3)}`, variante: `ma-${fixe}-intl-tirets` },
    { valeur: `212${n}`, variante: `ma-${fixe}-msisdn-sans-plus` },
    { valeur: `+212 ${n.slice(0, 3)}-${n.slice(3)}`, variante: `ma-${fixe}-intl-3-6` },
  ]);
}

export function telFr(h) {
  const t = h.choix(["6", "7", "1", "4", "9", "6"]);
  const n = t + h.chiffres(8);
  const p = (s, sep) => s.replace(/(\d{2})(?=\d)/g, `$1${sep}`);
  const nat = "0" + n;
  const fixe = /[67]/.test(t) ? "mobile" : "fixe";
  return h.choix([
    { valeur: p(nat, " "), variante: `fr-${fixe}-national-espaces` },
    { valeur: nat, variante: `fr-${fixe}-national-colle` },
    { valeur: p(nat, "."), variante: `fr-${fixe}-national-points` },
    { valeur: p(nat, "-"), variante: `fr-${fixe}-national-tirets` },
    { valeur: `+33 ${n[0]} ${p(n.slice(1), " ")}`, variante: `fr-${fixe}-intl-espaces` },
    { valeur: `+33${n}`, variante: `fr-${fixe}-intl-colle` },
    { valeur: `+33 (0)${n[0]} ${p(n.slice(1), " ")}`, variante: `fr-${fixe}-intl-zero-parenthese` },
    { valeur: `0033 ${n[0]} ${p(n.slice(1), " ")}`, variante: `fr-${fixe}-0033` },
  ]);
}

/* Télécom : IMEI (Luhn), IMSI (MCC 604 = Maroc), ICCID (89 212…). */
export function imei(h) {
  const v = luhnComplete(h.choix(["35", "35", "86", "01", "49"]) + h.chiffres(12));
  return h.choix([
    { valeur: v, variante: "imei-colle" },
    { valeur: `${v.slice(0, 2)} ${v.slice(2, 8)} ${v.slice(8, 14)} ${v.slice(14)}`, variante: "imei-groupes" },
    { valeur: `${v.slice(0, 2)}-${v.slice(2, 8)}-${v.slice(8, 14)}-${v.slice(14)}`, variante: "imei-tirets" },
  ]);
}
export const imsi = (h) => ({ valeur: "604" + h.choix(["00", "01", "02", "05", "10"]) + h.chiffres(10), variante: "imsi-colle" });
export const iccid = (h) => ({ valeur: luhnComplete("89212" + h.choix(["00", "01", "05"]) + h.chiffres(11)), variante: "iccid-colle" });

/* Chiffres arabes orientaux (٠١٢٣٤٥٦٧٨٩) : un numéro saisi sur un clavier
   arabe, ou relu par OCR dans un document arabe. Même numéro, même clé de
   contrôle ; seule l'écriture des chiffres change (variante « ·ar »). */
const ORIENTAUX = "٠١٢٣٤٥٦٧٨٩";
export const enChiffresArabes = (s) => s.replace(/[0-9]/g, (d) => ORIENTAUX[d]);

export function telMaArabe(h) {
  const n = h.choix(["6", "6", "7", "5"]) + h.chiffres(8);
  const p = (s) => s.replace(/(\d{2})(?=\d)/g, "$1 ");
  const fixe = n[0] === "5" ? "fixe" : "mobile";
  const x = h.choix([
    { valeur: "0" + n, variante: `ma-${fixe}-national-colle` },
    { valeur: p("0" + n), variante: `ma-${fixe}-national-espaces` },
    { valeur: `+212 ${n[0]} ${p(n.slice(1))}`, variante: `ma-${fixe}-intl-espaces` },
    { valeur: `00212${n}`, variante: `ma-${fixe}-00212-colle` },
  ]);
  return { valeur: enChiffresArabes(x.valeur), variante: `${x.variante}·ar` };
}
export function cinArabe(h) {
  const x = cin(h);
  return { valeur: enChiffresArabes(x.valeur), variante: `${x.variante}·ar` };
}
export function ribMaArabe(h) {
  const x = ribMa(h);
  return { valeur: enChiffresArabes(x.valeur), variante: `${x.variante}·ar` };
}
export function cnssArabe(h) {
  const x = cnss(h);
  return { valeur: enChiffresArabes(x.valeur), variante: `${x.variante}·ar` };
}
