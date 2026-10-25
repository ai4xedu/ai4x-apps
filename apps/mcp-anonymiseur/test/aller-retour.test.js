// v2.28 (HT-Bench ≥ 99 % par pack) — les manques et les sorties corrompues
// trouvés par le banc, un par un, sur le chemin du texte libre (coder_texte,
// .md, PDF) : règles des packs, moteur, puis verrou. Et la garde : un texte
// codé, décodé avec sa clé, rend l'origine au caractère près. Toutes les
// valeurs sont inventées (clés de contrôle calculées).
import { test } from "node:test";
import assert from "node:assert/strict";
import { compilerRegles } from "../server/regles.js";
import { developperPacks } from "../server/packs.js";
import { strictCode } from "../server/verrou.js";
import { anonymizeText, newCodebook, decodeText, ibanOk, ribMarocOk, nirCleOk, luhnOk } from "../server/engine.js";

/* Le chemin de codeFreeText (server/index.js), sans le connecteur. */
function coder(texte, packs = []) {
  const book = newCodebook();
  const c = compilerRegles({ dossier: developperPacks(packs).regles });
  const extras = c.trouver([texte]);
  const base = anonymizeText(texte, book, extras, { excludes: c.exclusions });
  const r = strictCode(base.text, { book, extra: extras, excludes: c.exclusions });
  const cle = Object.fromEntries(book.entries.map((e) => [e.code, e.value]));
  return { t: r.text, cle };
}
const codesDe = (t, prefixe) => [...t.matchAll(new RegExp(`(?<![A-Z])${prefixe}-\\d{3,}`, "g"))].map((m) => m[0]);
/* Un code collé à un mot (« amoASSURE-001 ») ou à un autre code
   (« NOM-002-TEL-002 ») : la clé ne sait plus le décoder proprement. */
function imbrique(t, cle) {
  for (const code of Object.keys(cle)) {
    for (const m of t.matchAll(new RegExp(`(?<![A-Z])${code}`, "g"))) {
      const avant = t[m.index - 1] || " ";
      const apres = t.slice(m.index + code.length, m.index + code.length + 2);
      if (/[\p{L}\p{N}-]/u.test(avant) || /^(?:[\p{L}\p{N}]|-\d)/u.test(apres)) return true;
    }
  }
  return false;
}

/* La garde : décodé avec sa clé, le texte codé redevient l'origine. */
function allerRetour(texte, packs) {
  const r = coder(texte, packs);
  assert.ok(!imbrique(r.t, r.cle), `code imbriqué ou collé à un mot :\n${r.t}`);
  assert.equal(decodeText(r.t, r.cle).text, texte, `le décodage ne rend pas l'origine :\n${r.t}`);
  return r;
}

test("clés de contrôle : IBAN (mod 97 = 1), RIB marocain (≡ 0 mod 97), clé du NIR", () => {
  assert.ok(ibanOk("FR32 3000 4100 0412 3456 7890 106"));
  assert.ok(!ibanOk("FR33 3000 4100 0412 3456 7890 106"));
  assert.ok(ribMarocOk("0117 8044 0000 0001 0057 1387"));
  assert.ok(!ribMarocOk("0117 8044 0000 0001 0057 1388"));
  assert.ok(nirCleOk("1 84 05 75 112 345 - 78"));
  assert.ok(!nirCleOk("1 84 05 75 112 345 - 77"));
  assert.ok(nirCleOk("2 75 09 2A 724 241 - 85"), "Corse : 2A → 19");
});

test("NIR : la clé écrite après un tiret est codée avec le numéro", () => {
  const { t, cle } = allerRetour("Assuré social n° 1 84 05 75 112 345 - 78, rattaché à la caisse de Paris.");
  assert.equal(codesDe(t, "CIN").length, 1, t);
  assert.ok(!/\b78\b/.test(t), `la clé est restée en clair :\n${t}`);
  assert.equal(Object.values(cle)[0], "1 84 05 75 112 345 - 78");
  // Une clé fausse n'est pas aspirée : le numéro reste codé, rien d'autre.
  const faux = coder("NIR 1 84 05 75 112 345 - 77 €").t;
  assert.ok(!faux.includes("112 345"), faux);
});

test("CNSS : le n° d'affiliation de l'employeur (7 chiffres) annoncé avec son rôle", () => {
  for (const texte of [
    "Employeur : Atlas Négoce SARL — CNSS employeur 7456193 — IF 43400092",
    "La société est affiliée à la CNSS sous le n° 1590991 depuis 2019.",
    "CNSS d'affiliation n° 8710871",
  ]) {
    const { t } = allerRetour(texte);
    assert.equal(codesDe(t, "CNSS").length, 1, t);
    assert.ok(!/\d{7}/.test(t), t);
  }
});

test("RIB marocain par quatre et IBAN par quatre : un seul code RIB, même quand les seize premiers chiffres passent Luhn", () => {
  assert.ok(luhnOk("0117804400000001"), "le piège : les 16 premiers chiffres du RIB passent Luhn");
  assert.ok(luhnOk("3000410004123456"), "le piège : les 16 chiffres après FR32 passent Luhn");
  for (const v of ["0117 8044 0000 0001 0057 1387", "011 780 4400000001005713 87", "FR32 3000 4100 0412 3456 7890 106"]) {
    const { t, cle } = allerRetour(`Virement sur le compte ${v} avant le 30/11.`, ["banque-assurance"]);
    assert.deepEqual(codesDe(t, "RIB").length, 1, t);
    assert.equal(codesDe(t, "CARTE").length, 0, t);
    assert.deepEqual(Object.values(cle), [v]);
  }
});

test("noms à particule : « Le Roux », « de La Fontaine », « Ould Bah », « Ould Cheikh » — le patronyme est codé, la particule reste", () => {
  const cas = [
    ["écart à justifier avec Sophie Le Roux (06-95-02-22-30).", "Roux"],
    ["Le 08.10.2022, M. de La Fontaine lui a notifié un licenciement.", "Fontaine"],
    ["prise en la personne de son Président, M. Inès de La Fontaine.", "Fontaine"],
    ["22 mai 2022 | CHQ REMIS Nesrine Ould Bah | 40 204 MAD", "Bah"],
    ["08.07.2020 | 6121 | Règlement Mehdi Ould Bah | 288 222,52 MAD", "Bah"],
    ["ligne de crédit à renouveler avec Abdelaziz Ould Cheikh avant le 2022-09-26.", "Cheikh"],
  ];
  for (const [texte, patronyme] of cas) {
    const { t } = allerRetour(texte);
    assert.ok(!new RegExp(`\\b${patronyme}\\b`).test(t), `« ${patronyme} » en clair :\n${t}`);
  }
  // Ce qui ne change pas : la ville après « de », l'article en début de phrase.
  assert.match(coder("M. Alami de Casablanca est venu.").t, /de Casablanca est venu/);
  assert.equal(coder("Le cheikh de la zaouïa a reçu la délégation.").t, "Le cheikh de la zaouïa a reçu la délégation.");
});

test("prénoms à apostrophe : « R'kia », « Ma'ati », « M'hamed » sont un seul mot, codé en entier ; l'élision ne change pas", () => {
  for (const [texte, nom] of [
    ["Chèque n° 0618124 de R'kia Ait-Mbarek, montant 235 MAD", "R'kia"],
    ["Titulaire : Ma'ati Ben Chekroun, client depuis 2011.", "Ma'ati"],
    ["Reçu de M'hamed Alami la somme de 300 DH.", "M'hamed"],
  ]) {
    const { t, cle } = allerRetour(texte);
    assert.ok(Object.values(cle).includes(nom), `« ${nom} » n'a pas un code à lui :\n${t}`);
    assert.ok(!/\b[RM]a?['’]/.test(t) && !/['’]\p{L}/u.test(t), `un morceau du prénom est resté :\n${t}`);
  }
  const elisions = "Aujourd'hui, l'avocat d'Agadir n'est pas venu au conseil de prud'hommes, qu'il connaît bien.";
  assert.equal(coder(elisions).t, elisions);
});

test("« Cheikh » prénom : codé devant un nom, laissé lisible comme titre", () => {
  for (const texte of ["Client : Cheikh El Alaoui, née le 26 février 1972 à Tanger", "Tiers impliqué : Cheikh Saidi, joignable au cabinet."]) {
    const { t } = allerRetour(texte);
    assert.ok(!t.includes("Cheikh"), t);
  }
});

test("santé : les motifs ne se déclenchent plus dans un mot ni sur un nom (amoxicilline, lotissement, « Patient : Karim »)", () => {
  const texte = [
    "COMPTE RENDU DE CONSULTATION — Cardiologie",
    "Patient : Karim Bensalah — IPP 311964011",
    "Né(e) le 18/12/1967 — AMO n° 136149307",
    "Traitement : amoxicilline 1 g, pendant 5 jours. Adressé par le Dr Alami, il réside au lotissement Riad à Oujda.",
    "Lot n° QQ75336 délivré.",
  ].join("\n");
  const { t, cle } = allerRetour(texte, ["sante"]);
  assert.equal(codesDe(t, "PATIENT").length, 1, t);
  assert.equal(cle[codesDe(t, "PATIENT")[0]], "311964011", "PATIENT est le numéro, pas « Karim »");
  assert.equal(codesDe(t, "ASSURE").length, 1, t);
  assert.equal(codesDe(t, "LOT").length, 1, t);
  assert.equal(cle[codesDe(t, "LOT")[0]], "QQ75336", "LOT n'est pas la fin de « lotissement »");
  assert.ok(t.includes("amoxicilline 1 g"), t);
  assert.ok(!t.includes("Karim"), t);
});

test("santé : un code déjà posé (texte recodé) n'est pas repris par le motif", () => {
  const { t } = coder("IPP PATIENT-001 — AMO n° ASSURE-004", ["sante"]);
  assert.equal(t, "IPP PATIENT-001 — AMO n° ASSURE-004");
});

test("banque, expertise, RH : pas d'un mot à l'autre ni d'une ligne à l'autre ; un préfixe de pack dans la valeur (« TVA-2024-… ») est codé", () => {
  const banque = allerRetour("Déclaration de sinistre\nPolice n° POL-2024-778812 souscrite en 2021.\nChèque n° 4237529 remis.", ["banque-assurance"]);
  assert.equal(codesDe(banque.t, "SINISTRE").length, 0, banque.t);
  assert.equal(codesDe(banque.t, "POLICE").length, 1, banque.t);
  assert.equal(codesDe(banque.t, "CHEQUE").length, 1, banque.t);

  const compta = allerRetour("FACTURE n° FAC-2025-3508 du 20/11/2019\nTélédéclaration SIMPL n° TVA-2024-615627 déposée.", ["expertise-comptable"]);
  assert.ok(compta.t.startsWith("FACTURE n° FACTURE-"), compta.t);
  assert.equal(codesDe(compta.t, "DECLAR").length, 1, compta.t);
  assert.ok(!compta.t.includes("615627"), compta.t);

  const rh = allerRetour("Les matricules sont attribués par la DRH.\nMatricule\nEMP-04471 reste à saisir.", ["rh-paie"]);
  assert.equal(codesDe(rh.t, "MATRICULE").length, 0, `le motif a traversé la ligne :\n${rh.t}`);
  assert.ok(!rh.t.includes("04471"), rh.t);
});

test("grand livre : une ligne chargée (noms, pièce, téléphone, compte) se décode à l'identique", () => {
  allerRetour([
    "EXTRAIT DU GRAND LIVRE — exercice 2024",
    "08.07.2020 | 6121 | Règlement Mehdi Ould Bah | 288 222,52 MAD",
    "2022-07-20 | 3421 | Avoir Omar BEN AMOR, pièce n° OD-0917 | 423,68 MAD",
    "Contrôle : écart sur le compte 6111, à justifier avec Anne-Laure Lefèvre (0572 35 99 59), RIB 0117 8044 0000 0001 0057 1387.",
  ].join("\n"), ["expertise-comptable"]);
});
