// ============================================================================
// EXTRACTION — une facture d'achat marocaine (texte) → des champs structurés.
//
// Fonctions PURES sur du texte : c'est ce qui rend le moteur testable sans
// PDF, sans disque et sans réseau. La couche qui lit les PDF vit dans
// index.js et se contente d'appeler extraireFacture() avec le texte extrait.
//
// DEUX RÈGLES DE CONCEPTION QUI EXPLIQUENT LA SUITE DU FICHIER :
//
//   1. On ne devine JAMAIS un montant manquant. Un champ absent reste
//      `null` et remonte en « à vérifier ». Le contrôle arithmétique
//      (HT + TVA = TTC) est notre filet : il attrape aussi bien une mauvaise
//      lecture qu'un mauvais format de nombre, donc mieux vaut lui laisser
//      des trous que des valeurs inventées.
//
//   2. Sur une facture d'ACHAT, le fournisseur est l'ÉMETTEUR — jamais le
//      client. Se tromper de sens, c'est imputer le compte du mauvais tiers
//      sur toute une pile. La désambiguïsation la plus fiable n'est pas
//      typographique, elle est arithmétique : quand on connaît l'ICE de la
//      société du dossier, l'AUTRE ICE de la page est celui du fournisseur.
// ============================================================================

/* Espaces fines, insécables et compagnie : un montant copié d'un PDF en est
   truffé, et « 20 500 » avec un U+202F ne se parse pas comme « 20 500 ». */
const ESPACES = /[\s    ]/g;

const MOIS = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

/* Taux de TVA en vigueur au Maroc. Sert de contrôle, jamais de valeur par
   défaut : un taux hors liste ne provoque pas une correction, il provoque
   un doute. */
export const TAUX_TVA_MAROC = [0, 7, 10, 14, 20];

/* Mots qui ne sont jamais une raison sociale, même en majuscules. Sans cette
   liste, « TOTAL HT » devient un fournisseur nommé « TOTAL HT ». */
const LEXIQUE_FACTURE = new Set([
  "facture", "factures", "devis", "bon", "livraison", "commande", "avoir",
  "date", "echeance", "reglement", "paiement", "designation", "description",
  "quantite", "qte", "prix", "unitaire", "montant", "montants", "total",
  "totaux", "sous", "net", "payer", "tva", "ht", "ttc", "remise", "acompte",
  "client", "clients", "emetteur", "fournisseur", "vendeur", "destinataire",
  "adresse", "tel", "telephone", "fax", "email", "mail", "site", "web",
  "ice", "if", "rc", "cnss", "patente", "rib", "banque", "virement", "cheque",
  "page", "ref", "reference", "objet", "periode", "numero", "arrete", "somme",
  "dirhams", "dirham", "mad", "dh", "dhs",
]);

/* Formes juridiques marocaines et françaises courantes : leur présence sur
   une ligne suffit à en faire un candidat « raison sociale ». */
const FORMES_JURIDIQUES =
  /\b(s\.?a\.?r\.?l\.?(\s*a\.?u\.?)?|s\.?a\.?s?\b|s\.?n\.?c\.?|s\.?c\.?s\.?|e\.?u\.?r\.?l\.?|ets?\b|etablissements?|societe|ste\b|groupe|cabinet|sarl|holding|company|co\b|inc\b|ltd\b)/i;

/* ------------------------------------------------------------------ texte */

/* Sans accents et en minuscules — uniquement pour CHERCHER. On ne restitue
   jamais cette forme à l'utilisateur : les libellés gardent leurs accents. */
export function normaliser(s) {
  return String(s == null ? "" : s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/* --------------------------------------------------------------- montants */

/* Parse un montant écrit à la marocaine, à la française ou à l'anglaise.
 *
 * Le cas piégeux est « 20,500 » : décimal français (20,5) ou millier anglais
 * (20500) ? On tranche par la longueur du groupe qui suit le séparateur —
 * 3 chiffres = millier, 1 ou 2 = décimale. Ce n'est pas infaillible, et
 * c'est assumé : une erreur de lecture casse l'égalité HT + TVA = TTC, donc
 * la pièce part en « à vérifier » au lieu de passer en silence. */
export function parseMontant(brut) {
  if (brut == null) return null;
  if (typeof brut === "number") return Number.isFinite(brut) ? brut : null;

  let s = String(brut).replace(ESPACES, "");
  s = s.replace(/[^\d.,\-]/g, "");
  if (!/\d/.test(s)) return null;

  const negatif = /^-/.test(s) || /\(\d/.test(String(brut));
  s = s.replace(/-/g, "");

  const dernierePoint = s.lastIndexOf(".");
  const derniereVirgule = s.lastIndexOf(",");

  if (dernierePoint >= 0 && derniereVirgule >= 0) {
    // Les deux présents : le DERNIER est la décimale, l'autre est un millier.
    if (derniereVirgule > dernierePoint) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (derniereVirgule >= 0) {
    const suite = s.length - derniereVirgule - 1;
    s = suite === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (dernierePoint >= 0) {
    const suite = s.length - dernierePoint - 1;
    const multiples = (s.match(/\./g) || []).length > 1;
    s = suite === 3 || multiples ? s.replace(/\./g, "") : s;
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negatif ? -n : n;
}

/* Un jeton « nombre » : chiffres, séparateurs décimaux, et des espaces
 * UNIQUES entre groupes de trois chiffres. L'espace unique est capital :
 * un séparateur de milliers ne fait jamais deux espaces, alors qu'une
 * colonne de tableau, si. */
const JETON_NOMBRE = /-?\d[\d.,]*(?:[ \u00a0\u202f]\d{3}[\d.,]*)*/g;

/* Le dernier nombre d'une ligne : sur une facture, le montant est à droite
 * (« Total HT ............... 20 500,00 DH »).
 *
 * On découpe D'ABORD la ligne en colonnes (deux espaces ou plus). Sans ce
 * découpage, « Prestation de conseil   1   8 500,00 » se lit 18 500 : la
 * quantité se colle au montant. Bug réel, attrapé par les tests — et
 * exactement le genre de faute qui passe inaperçue jusqu'au bilan. */
export function dernierMontant(ligne) {
  const cellules = String(ligne).split(/[\s\u00a0\u202f]{2,}|\t+/).filter((c) => /\d/.test(c));
  for (let i = cellules.length - 1; i >= 0; i--) {
    const jetons = cellules[i].match(JETON_NOMBRE);
    if (!jetons) continue;
    for (let j = jetons.length - 1; j >= 0; j--) {
      const v = parseMontant(jetons[j]);
      if (v != null) return v;
    }
  }
  return null;
}

/* ------------------------------------------------------------ identifiants */

/* ICE marocain : 15 chiffres, souvent groupés à la saisie. On cherche
   d'abord la forme étiquetée (« ICE : … »), qui ne ment jamais, avant la
   forme nue (une suite de 15 chiffres isolée). */
export function trouverIces(texte) {
  const lignes = String(texte).split(/\r?\n/);
  const out = [];
  const vus = new Set();

  const pousser = (valeur, ligne, etiquete) => {
    const v = valeur.replace(/\D/g, "");
    if (v.length !== 15 || vus.has(v + ":" + ligne)) return;
    vus.add(v + ":" + ligne);
    out.push({ ice: v, ligne, etiquete });
  };

  lignes.forEach((l, i) => {
    const norm = normaliser(l);
    const etiq = /\bi\.?c\.?e\.?\b/.test(norm);
    const rx = /(\d[\d\s  .\-]{13,25}\d)/g;
    let m;
    while ((m = rx.exec(l))) {
      if (m[1].replace(/\D/g, "").length === 15) pousser(m[1], i, etiq);
    }
  });
  // Les ICE étiquetés d'abord : ce sont les seuls dont on est sûr.
  return out.sort((a, b) => Number(b.etiquete) - Number(a.etiquete));
}

export function trouverIdentifiant(texte, motif, longueurs) {
  const rx = new RegExp(`\\b${motif}\\b[^\\d]{0,12}(\\d[\\d\\s.\\-]{2,20})`, "i");
  const m = normaliser(texte).match(rx);
  if (!m) return null;
  const v = m[1].replace(/\D/g, "");
  if (longueurs && !longueurs.some(([a, b]) => v.length >= a && v.length <= b)) return null;
  return v || null;
}

/* -------------------------------------------------------------------- date */

export function parseDate(brut) {
  const s = normaliser(brut).trim();
  let m;

  if ((m = s.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/))) {
    return iso(+m[1], +m[2], +m[3]);
  }
  if ((m = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/))) {
    let a = +m[3];
    if (a < 100) a += a < 70 ? 2000 : 1900;
    return iso(a, +m[2], +m[1]);
  }
  if ((m = s.match(/\b(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})\b/))) {
    const mois = Object.keys(MOIS).find((k) => k.startsWith(m[2].slice(0, 4)));
    if (mois) return iso(+m[3], MOIS[mois], +m[1]);
  }
  return null;
}

function iso(a, m, j) {
  if (!(a >= 1900 && a <= 2200) || !(m >= 1 && m <= 12) || !(j >= 1 && j <= 31)) return null;
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  return d.toISOString().slice(0, 10);
}

/* La date de la FACTURE, pas celle de l'échéance ni du règlement : on
   privilégie une ligne étiquetée « date de facture », puis toute ligne de
   date qui ne parle pas d'échéance, puis la première date de la page. */
export function trouverDateFacture(texte) {
  const lignes = String(texte).split(/\r?\n/);
  const candidats = [];
  lignes.forEach((l, i) => {
    const d = parseDate(l);
    if (!d) return;
    const n = normaliser(l);
    const echeance = /(echeance|payable|reglement|limite|livraison)/.test(n);
    const etiquete = /\bdate\b/.test(n) && !echeance;
    candidats.push({ date: d, ligne: i, etiquete, echeance });
  });
  if (!candidats.length) return null;
  const prefere =
    candidats.find((c) => c.etiquete) ||
    candidats.find((c) => !c.echeance) ||
    candidats[0];
  return prefere.date;
}

/* ---------------------------------------------------------------- numéro */

export function trouverNumero(texte) {
  const lignes = String(texte).split(/\r?\n/);
  for (const l of lignes) {
    const n = normaliser(l);
    if (!/\bfacture\b|\binvoice\b/.test(n)) continue;
    // « FACTURE N° FAC-2026-042 », « Facture no 042/26 », « FACTURE N. F2026-7 »
    const m = l.match(
      /(?:facture|invoice)[^\dA-Za-z]{0,4}(?:n[°ºo.]?|num[ée]ro|no\.?)?[\s:.\-]*([A-Za-z0-9][A-Za-z0-9\/\-_.]{1,29})/i
    );
    if (m && /\d/.test(m[1])) return m[1].replace(/[.\-_/]+$/, "");
  }
  // Repli : une étiquette « N° » seule, fréquente sur les factures mises en page.
  const m2 = String(texte).match(/\bn[°º]\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9\/\-_.]{1,29})/i);
  return m2 && /\d/.test(m2[1]) ? m2[1].replace(/[.\-_/]+$/, "") : null;
}

/* ------------------------------------------------------------- fournisseur */

/* Une ligne peut-elle être une raison sociale ?
 *
 * Trois portes d'entrée, par confiance décroissante : une forme juridique
 * explicite (SARL, S.A…), une ligne à dominante MAJUSCULE, ou une ligne en
 * Casse De Titre courte — « Maroc Telecom » n'est ni en majuscules ni suivi
 * d'une forme juridique, et rater ce cas-là ferait rater la moitié des
 * fournisseurs récurrents.
 *
 * Les portes de sortie comptent autant : une étiquette de facture suivie de
 * deux points (« Date : », « ICE : », « Montant HT : ») n'est jamais une
 * raison sociale, et une ligne à forte densité de chiffres non plus. */
export function ressembleARaisonSociale(ligne) {
  const brut = String(ligne).trim();
  if (brut.length < 3 || brut.length > 70) return false;
  if (/^\d/.test(brut)) return false;

  // « Étiquette : valeur » — l'étiquette appartient au lexique d'une facture.
  const avantDeuxPoints = brut.split(":")[0];
  if (brut.includes(":")) {
    const mots = normaliser(avantDeuxPoints).split(/[^a-z0-9]+/).filter(Boolean);
    if (mots.length && mots.every((m) => LEXIQUE_FACTURE.has(m))) return false;
  }

  const chiffres = (brut.match(/\d/g) || []).length;
  if (chiffres / brut.length > 0.3) return false;
  if (/[%€]|\bdh\b/i.test(brut) && /\d/.test(brut)) return false;

  const mots = normaliser(brut).split(/[^a-z0-9]+/).filter(Boolean);
  if (!mots.length || mots.length > 7) return false;
  if (mots.every((m) => LEXIQUE_FACTURE.has(m))) return false;

  if (FORMES_JURIDIQUES.test(brut)) return true;

  const lettres = brut.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (lettres.length < 3) return false;
  const majuscules = brut.replace(/[^A-ZÀ-Þ]/g, "").length;
  if (majuscules / lettres.length > 0.7) return true;

  // Casse de titre : au moins deux mots, la plupart avec une capitale.
  const motsBruts = brut.split(/\s+/).filter((m) => /[A-Za-zÀ-ÿ]/.test(m));
  if (motsBruts.length < 2 || motsBruts.length > 5) return false;
  const capitalises = motsBruts.filter((m) => /^[A-ZÀ-Þ]/.test(m)).length;
  return capitalises / motsBruts.length >= 0.6;
}

/* Le nom du fournisseur.
 *
 * Ordre de confiance décroissante :
 *   1. l'ICE qui n'est PAS celui de la société du dossier → on remonte à la
 *      raison sociale la plus proche au-dessus (la plus fiable, parce
 *      qu'elle ne dépend d'aucune mise en page) ;
 *   2. une section explicite ÉMETTEUR / FOURNISSEUR / VENDEUR ;
 *   3. la première raison sociale de la page, avant toute section CLIENT. */
export function trouverFournisseur(texte, { iceSociete = null } = {}) {
  const lignes = String(texte).split(/\r?\n/);
  const ices = trouverIces(texte);

  const nomAuDessus = (idx) => {
    for (let i = idx; i >= Math.max(0, idx - 6); i--) {
      if (ressembleARaisonSociale(lignes[i])) return lignes[i].trim();
    }
    return null;
  };

  if (iceSociete) {
    const propre = String(iceSociete).replace(/\D/g, "");
    const autre = ices.find((x) => x.ice !== propre);
    if (autre) {
      return { nom: nomAuDessus(autre.ligne), ice: autre.ice, source: "ice-oppose" };
    }
  }

  const idxSection = lignes.findIndex((l) =>
    /^\s*(emetteur|fournisseur|vendeur|prestataire)\b/.test(normaliser(l))
  );
  if (idxSection >= 0) {
    for (let i = idxSection + 1; i < Math.min(lignes.length, idxSection + 6); i++) {
      if (ressembleARaisonSociale(lignes[i])) {
        const zone = lignes.slice(idxSection, i + 8).join("\n");
        const ice = trouverIces(zone)[0];
        return { nom: lignes[i].trim(), ice: ice ? ice.ice : null, source: "section-emetteur" };
      }
    }
  }

  const idxClient = lignes.findIndex((l) =>
    /^\s*(client|destinataire|factur[eé]\s*[aà]|acheteur)\b/.test(normaliser(l))
  );
  const borne = idxClient >= 0 ? idxClient : lignes.length;
  for (let i = 0; i < borne; i++) {
    if (ressembleARaisonSociale(lignes[i])) {
      return {
        nom: lignes[i].trim(),
        ice: ices.length ? ices[0].ice : null,
        source: "haut-de-page",
      };
    }
  }
  return { nom: null, ice: ices.length ? ices[0].ice : null, source: "introuvable" };
}

/* ---------------------------------------------------------------- montants */

/* HT, TVA, TTC et le taux. On lit les lignes étiquetées et on prend le
   dernier nombre de la ligne. Quand plusieurs lignes portent la même
   étiquette (sous-totaux puis total), on garde la DERNIÈRE : c'est le total. */
export function trouverMontants(texte) {
  const lignes = String(texte).split(/\r?\n/);
  let ht = null, tva = null, ttc = null, taux = null;

  for (const l of lignes) {
    const n = normaliser(l);
    if (!/\d/.test(l)) continue;

    if (/(total|montant|base|somme)[^a-z]{0,12}(h\.?t\.?|hors\s*taxe)/.test(n) ||
        /\bh\.?t\.?\s*[:=]/.test(n)) {
      const v = dernierMontant(l);
      if (v != null) ht = v;
    }
    if (/(total|montant|net)[^a-z]{0,12}(t\.?t\.?c\.?|toutes\s*taxes)/.test(n) ||
        /\bnet\s*a\s*payer\b/.test(n) || /\bt\.?t\.?c\.?\s*[:=]/.test(n)) {
      const v = dernierMontant(l);
      if (v != null) ttc = v;
    }
    if (/\bt\.?v\.?a\.?\b/.test(n) && !/recuperable|deductible|exonere/.test(n)) {
      const mTaux = l.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*%/);
      if (mTaux) taux = parseMontant(mTaux[1]);
      // Sur « TVA (20%) : 4 100 », le dernier nombre est bien le montant.
      // Sur « TVA 20% » seule, le dernier nombre EST le taux : on l'écarte.
      const v = dernierMontant(l.replace(/(\d{1,2}(?:[.,]\d{1,2})?)\s*%/g, " "));
      if (v != null) tva = v;
    }
  }
  return { ht, tva, ttc, taux };
}

/* ------------------------------------------------------------------ devise */

export function trouverDevise(texte) {
  const n = normaliser(texte);
  if (/\b(mad|dhs?|dirhams?)\b/.test(n)) return "MAD";
  if (/€|\beur(os?)?\b/.test(n)) return "EUR";
  if (/\$|\busd\b/.test(n)) return "USD";
  return null;
}

/* ==================================================================== API */

/* Texte d'une facture → champs structurés + la liste de ce qui manque.
   `iceSociete` : l'ICE de la société du dossier, quand le cabinet l'a
   renseigné — c'est lui qui rend la détection du fournisseur fiable. */
export function extraireFacture(texte, { iceSociete = null, fichier = null } = {}) {
  const brut = String(texte || "");
  const fournisseur = trouverFournisseur(brut, { iceSociete });
  const { ht, tva, ttc, taux } = trouverMontants(brut);

  return {
    fichier,
    fournisseur: {
      nom: fournisseur.nom,
      ice: fournisseur.ice,
      source: fournisseur.source,
      if: trouverIdentifiant(brut, "i\\.?f", [[6, 10]]),
      rc: trouverIdentifiant(brut, "r\\.?c", [[3, 10]]),
    },
    numero: trouverNumero(brut),
    date: trouverDateFacture(brut),
    ht,
    tva,
    ttc,
    taux,
    devise: trouverDevise(brut),
    longueurTexte: brut.trim().length,
  };
}
