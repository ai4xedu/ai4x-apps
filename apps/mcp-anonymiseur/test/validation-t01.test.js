// VALIDATION T01 (Nanomizer, docs/validation/T01-contrat) — un contrat renvoyé
// par l'avocat adverse en suivi de modifications. Joué le 25/10/2026 sur la
// 2.27.0 : 1 fuite, 4/10 contre 9/10 en clair. Chaque test ci-dessous est une
// trouvaille de ce test, pour qu'elle ne revienne pas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { strictCode, isKnownWord } from "../server/verrou.js";
import { newCodebook, anonymizeText } from "../server/engine.js";
import { compilerRegles } from "../server/regles.js";
import { developperPacks } from "../server/packs.js";

// Le chemin de codeFreeText (texte, PDF, Word) : moteur avec le lexique, puis verrou.
const full = (t, book = newCodebook()) =>
  strictCode(anonymizeText(t, book, [], { knownWord: (w) => isKnownWord(w) }).text, { book, extra: [] }).text;

test("fuite T01 : une adresse à deux articles (« rue de la République ») est codée, y compris en pied de page", () => {
  const out = full("Cabinet Delorme & Associés — 29 rue de la République, 69002 Lyon — Tél. 04 78 12 34 56");
  assert.doesNotMatch(out, /République/, out);
  assert.match(out, /ADRESSE-\d{3}, 69002 Lyon/, out);
  assert.doesNotMatch(full("Le siège est au 4 place de la Bourse, à Lyon."), /Bourse/);
  // Une zone industrielle : « ZI des Molina » n'est plus coupée en faux prénoms.
  assert.match(full("dont le siège social est situé ZI des Molina, 12 rue Barrouin, 42000 Saint-Étienne"), /ADRESSE-\d{3}, ADRESSE-\d{3}, 42000/);
});

test("sur-codage T01 : un intitulé d'acte en majuscules reste lisible ; une raison sociale en majuscules reste codée", () => {
  for (const t of ["CONTRAT CADRE D'APPROVISIONNEMENT", "CONVENTION DE PRESTATION DE SERVICES", "BAIL COMMERCIAL", "CONDITIONS GÉNÉRALES DE VENTE"]) {
    assert.equal(full(t), t);
  }
  assert.doesNotMatch(full("HORIZON IMMOBILIER\n12 rue des Lilas, 69002 Lyon"), /HORIZON|IMMOBILIER/);
  assert.doesNotMatch(full("CONTRAT VERBANIA LOGISTIQUE"), /VERBANIA/, "un mot hors lexique dans le titre : on code");
});

test("sur-codage T01 : une référence d'article seule est une RÉFÉRENCE, pas une société", () => {
  const book = newCodebook();
  const out = full("Référence\nBRK-220\nCHS-075\nDésignation", book);
  assert.match(out, /^Référence\nREF-\d{3}\nREF-\d{3}\nDésignation$/, out);
  assert.ok(!book.entries.some((e) => e.type === "societe"), "aucune société");
});

test("sur-codage T01 : mesures, nuances d'acier, abréviations juridiques, organismes et mots courants restent lisibles", () => {
  const out = full("Bride acier S235 Ø220, tube Ø20, cf. L. 442-1 C. com. et art. 1171 C. civ. ; indice INSEE. Joignable sur mon portable.");
  for (const clair of ["S235", "Ø220", "Ø20", "C. com.", "C. civ.", "INSEE", "Joignable"]) assert.ok(out.includes(clair), `« ${clair} » : ${out}`);
  assert.match(full("Dossier FAC-2026-0142, voir BRK-220."), /REF-\d{3}, voir REF-\d{3}/, "les vraies références restent codées");
});

test("pack RH T01 : « CONTRAT CADRE », « matricule SALARIÉ », « badge VISITEUR » ne sont pas des numéros ; les vrais numéros restent codés", () => {
  const c = compilerRegles({ dossier: developperPacks(["rh-paie"]).regles });
  const coder = (t) => strictCode(t, { book: newCodebook(), extra: c.trouver([t]), excludes: c.exclusions }).text;
  assert.equal(coder("CONTRAT CADRE D'APPROVISIONNEMENT"), "CONTRAT CADRE D'APPROVISIONNEMENT");
  assert.doesNotMatch(coder("Le badge VISITEUR est rendu à l'accueil."), /BADGE-/);
  const t = coder("Matricule : EMP-04471, badge n° 00812, contrat de travail n° CT/2026/031.");
  for (const v of ["EMP-04471", "00812", "CT/2026/031"]) assert.ok(!t.includes(v), t);
});
