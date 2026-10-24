// SOCIÉTÉS (v2.23.1) — une société, un code : la capture de la forme
// juridique ne doit ni avaler la personne qui la précède, ni le point de la
// phrase, et le nom nu de la société garde le même code. Défauts vus en
// passant une note de dossier au rendu lisible (une société devenait trois
// sociétés fictives).
import { test } from "node:test";
import assert from "node:assert/strict";
import { XLSX, newCodebook, anonymizeText, anonymizeDocument, cleanLegalCapture, legalCore, detectByHeader } from "../server/engine.js";
import { strictCode } from "../server/verrou.js";
import { rendreLisible } from "../server/pseudonymes.js";

const coder = (book, t) => strictCode(anonymizeText(t, book, [], {}).text, { book }).text;
const societes = (book) => book.entries.filter((e) => e.code.startsWith("SOCIETE"));

test("cleanLegalCapture : titre de civilité + « et » → la société seule ; point final retiré", () => {
  assert.equal(cleanLegalCapture("M. Chraïbi et Gharb Primeurs SARL."), "Gharb Primeurs SARL");
  assert.equal(cleanLegalCapture("Maître Benali & Atlas Négoce SARL AU"), "Atlas Négoce SARL AU");
  assert.equal(cleanLegalCapture("Mme Vasseur SARL"), null, "sans connecteur, c'est une personne");
  assert.equal(cleanLegalCapture("Dupont et Fils SARL"), "Dupont et Fils SARL", "« et » sans titre : la raison sociale entière");
  assert.equal(cleanLegalCapture("Sophatel S.A."), "Sophatel S.A");
  assert.equal(legalCore("Gharb Primeurs SARL"), "Gharb Primeurs");
  assert.equal(legalCore("Atlas SARL"), null, "un mot seul n'est pas un alias");
});

test("une note : la même société garde UN code, la personne devant elle reste une personne, la ponctuation reste", () => {
  const book = newCodebook();
  const t = coder(book,
    "Dossier Chraïbi c/ Gharb Primeurs.\nAdversaire : Gharb Primeurs SARL, représentée par Mme Odile Vasseur.\n" +
    "- 15/01/2026 : bon de commande signé entre M. Chraïbi et Gharb Primeurs SARL.\nTémoin : ancien comptable de Gharb Primeurs SARL.");
  assert.equal(societes(book).length, 1, JSON.stringify(societes(book)));
  assert.equal(societes(book)[0].value, "Gharb Primeurs SARL");
  const code = societes(book)[0].code;
  assert.equal(t.split(code).length - 1, 4, `quatre mentions, un code : ${t}`);
  assert.match(t, /entre M\. NOM-\d{3} et SOCIETE-\d{3}\./, "la personne et le point de la phrase survivent");
  assert.ok(!/Gharb|Primeurs|Chraïbi|Vasseur/.test(t));
});

test("rendu lisible : une société, un pseudonyme, dans toutes ses mentions", () => {
  const book = newCodebook();
  book.pseudonymes = { graine: "societes", deltaJours: 40 };
  const t = rendreLisible(coder(book, "Gharb Primeurs a livré. Gharb Primeurs SARL conteste. Voir Gharb Primeurs SARL."), book).text;
  // Le nom nu est un alias du même code : il reçoit le même pseudonyme, forme
  // juridique comprise (et se décode en la raison sociale complète, comme les
  // alias du verrou).
  const p = societes(book)[0].pseudo;
  assert.equal(societes(book).length, 1);
  assert.equal(t, `${p} a livré. ${p} conteste. Voir ${p}.`);
});

test("feuille mise en page : même règle dans les cellules", () => {
  const book = newCodebook();
  // (Sous un libellé « CLIENT », la règle des factures code la cellule entière : à dessein, hors de ce test.)
  const ws = XLSX.utils.aoa_to_sheet([["Objet", "Signé entre M. Chraïbi et Gharb Primeurs SARL."], ["Partie", "Gharb Primeurs SARL"]]);
  anonymizeDocument(ws, book, [], {});
  assert.equal(societes(book).length, 1);
});

test("en-tête « Date de naissance » : colonne de dates de naissance (NAISS), plus un code générique", () => {
  assert.equal(detectByHeader("Date de naissance"), "naissance");
  assert.equal(detectByHeader("DOB"), "naissance");
});
