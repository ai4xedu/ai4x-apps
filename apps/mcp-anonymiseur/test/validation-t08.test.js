// VALIDATION T08 (Nanomizer, docs/validation/T08-contentieux) — un dossier de
// contentieux de douze pièces (Word, PDF, Excel, courriels .txt, deux scans)
// pour le tribunal de commerce de Casablanca. Joué le 26/10/2026 sur la 2.29.0 :
// 5 fuites, 5,3/10 contre 9/10 en clair, 9 actions au lieu de 3, sceau refusé.
// Chaque test ci-dessous est l'un des onze points du compte rendu, pour qu'il
// ne revienne pas. Toutes les valeurs sont inventées ; aucune n'est celle du
// dossier de validation.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strictCode, isKnownWord, knownValueMatcher, initialsOf } from "../server/verrou.js";
import { newCodebook, anonymizeText, nameCandidatesFromText, cleanLegalCapture, normFor, codeForSociete, XLSX, decodeText } from "../server/engine.js";
import { classifyNumericHeader, planNumbers } from "../server/chiffres.js";
import { compilerRegles } from "../server/regles.js";
import { developperPacks } from "../server/packs.js";
import { contextFor, pseudoMap, codesDepuisPseudos } from "../server/pseudonymes.js";
import { guardText } from "../server/sortie.js";
import { buildDocx } from "../server/word.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Le chemin de codeFreeText (texte, PDF, Word) : moteur avec le lexique et la
// clé, puis verrou — comme le connecteur.
const full = (t, book = newCodebook()) =>
  strictCode(anonymizeText(t, book, [], { knownWord: (w) => isKnownWord(w), known: knownValueMatcher(book) }).text, { book, extra: [] }).text;
const codes = (t, prefix) => [...new Set(t.match(new RegExp(`(?<![A-Z])${prefix}-\\d{3}`, "g")) || [])];
const entries = (book, prefix) => book.entries.filter((e) => e.code.startsWith(prefix + "-"));

/* 1 — une société sous toutes ses formes : un seul code. */
test("T08-1 : dénomination en mots du dictionnaire, sigle, sigle à points, avec ou sans SA, « Pour » / « Entre », casse — UN code de société", () => {
  const book = newCodebook();
  const t1 = full("ET la Société Marocaine de Distribution Alimentaire (SMDA) SA, société anonyme au capital de 12 000 000 de dirhams, représentée par M. Abdelkader Ouazzani.", book);
  assert.equal(entries(book, "SOCIETE").length, 1, JSON.stringify(book.entries));
  const code = entries(book, "SOCIETE")[0].code;
  assert.match(t1, new RegExp(`la ${code} SA, société anonyme`), t1);
  assert.ok(!book.entries.some((e) => e.type === "Nom" && /^SMDA$/i.test(e.value)), "le sigle n'est pas un patronyme");
  for (const t of ["Pour SMDA SA", "SMDA SA — FACTURE", "la S.M.D.A. a reçu le pli", "la société S.M.D.A. SA (SOCIÉTÉ MAROCAINE DE DISTRIBUTION ALIMENTAIRE), demanderesse",
    "SOCIÉTÉ MAROCAINE DE DISTRIBUTION ALIMENTAIRE", "le PDG de SMDA l'a reconnu"]) {
    const out = full(t, book);
    assert.ok(out.includes(code), `${t} → ${out}`);
    assert.ok(!/SMDA|S\.M\.D\.A|Marocaine de Distribution|MAROCAINE DE DISTRIBUTION/.test(out), out);
  }
  assert.equal(entries(book, "SOCIETE").length, 1, "toujours une seule société dans la clé");
  // Le fournisseur : dénomination nue avec son sigle, puis « SA », capitales, « Entre … », sigle seul.
  const b2 = newCodebook();
  const t2 = full("Objet : procès contre Atlas Conserves Industries (ACI). Nous distribuons les conserves ACI depuis 2019.", b2);
  assert.equal(entries(b2, "SOCIETE").length, 1, JSON.stringify(b2.entries));
  const c2 = entries(b2, "SOCIETE")[0].code;
  assert.equal(codes(t2, "SOCIETE").length, 1);
  assert.equal(t2.split(c2).length - 1, 2, `le sigle seul porte le même code : ${t2}`);
  for (const t of ["Entre Atlas Conserves Industries SA et SMDA SA", "Client : ATLAS CONSERVES INDUSTRIES SA — Agadir", "Ma cliente, ACI SA, réserve ses droits.", "conseil de la société Atlas Conserves Industries SA"]) {
    const out = full(t, b2);
    assert.ok(out.includes(c2), `${t} → ${out}`);
    assert.ok(!/Atlas|ATLAS|ACI/.test(out), out);
  }
  assert.equal(entries(b2, "SOCIETE").filter((e) => /atlas|aci/i.test(e.value)).length, 1);
  // Les mécanismes, un par un.
  assert.equal(normFor("SOCIETE", "ATLAS CONSERVES INDUSTRIES SA"), normFor("SOCIETE", "Atlas Conserves Industries SA"), "la casse ne compte pas");
  assert.equal(normFor("SOCIETE", "S.M.D.A. SA"), normFor("SOCIETE", "SMDA SA"), "les points du sigle non plus");
  assert.notEqual(normFor("SOCIETE", "Vectura SARL"), normFor("SOCIETE", "Vectura SNC"), "deux formes juridiques : deux sociétés");
  const b3 = newCodebook();
  const full1 = codeForSociete(b3, "Atlas Conserves Industries SA").code;
  assert.equal(codeForSociete(b3, "Atlas Conserves Industries").code, full1, "le nom nu rejoint la raison sociale");
  assert.equal(codeForSociete(b3, "ATLAS CONSERVES INDUSTRIES SA").code, full1);
  assert.equal(codeForSociete(b3, "Société Marocaine de Distribution Alimentaire", ["SMDA"]).code, codeForSociete(b3, "SMDA SA").code, "le sigle rejoint « SIGLE SA »");
  assert.equal(b3.entries.length, 2);
  assert.equal(initialsOf("Société Marocaine de Distribution Alimentaire"), "SMDA");
  assert.equal(initialsOf("Garage Lefèvre"), null, "deux mots : pas de sigle d'office");
  assert.equal(cleanLegalCapture("Pour SMDA SA"), "SMDA SA");
  assert.equal(cleanLegalCapture("Entre Atlas Conserves Industries SA"), "Atlas Conserves Industries SA");
});

/* 2 — le RC marocain en prose et sur deux lignes. */
test("T08-2 : le RC après « registre du commerce de <ville> sous le n° » et après « RC <ville> » coupé par une fin de ligne est codé", () => {
  const out = full("La société, immatriculée au registre du commerce\nd'Agadir sous le n° 52907, ICE 008007531513559, et sa cliente, immatriculée au registre du commerce de Casablanca sous le n° 586985.\n" +
    "Client : ATLAS CONSERVES INDUSTRIES SA — Parc industriel Tassila, lot 210, Agadir — RC Agadir\n52907 — ICE 008007531513559\n" +
    "Siège : Lot 12, zone industrielle Aïn Sebaâ, route de Rabat, Casablanca — RC Casablanca 586985 — IF 83754407");
  for (const v of ["52907", "586985"]) assert.ok(!out.includes(v), `RC ${v} en clair :\n${out}`);
  assert.equal(codes(out, "RC").length, 2, out);
  assert.match(out, /registre du commerce\nd'Agadir sous le n° RC-\d{3}/, "le libellé reste, le numéro part");
  assert.ok(!/Tassila|Sebaâ/.test(out), "le parc industriel et la zone industrielle sont des adresses");
});

/* 3 — la date de naissance à points, derrière du bruit d'OCR. */
test("T08-3 : « Né le » puis une date JJ.MM.AAAA, même séparée par du bruit d'OCR et une fin de ligne, est une date de naissance", () => {
  const book = newCodebook();
  const out = full("Nom\nOUAZZANI\nPrénom\nABDELKADER\nNé le a.\n27.07.1969 FES\nValable jusqu'au\n27.07.2031\nN205755", book);
  assert.ok(!out.includes("27.07.1969"), out);
  assert.equal(codes(out, "NAISS").length, 1, out);
  assert.ok(out.includes("27.07.2031"), "la date de validité reste lisible");
  assert.ok(!out.includes("N205755"), "le n° de CIN est codé");
  assert.ok(!book.entries.some((e) => /^(Nom|Prénom|Né)$/.test(e.value)), `les champs de la carte ne sont pas des noms : ${JSON.stringify(book.entries)}`);
  assert.doesNotMatch(full("Née le 04/07/1976 à Casablanca."), /04\/07\/1976/);
});

/* 4 — les variantes d'un patronyme. */
test("T08-4 : une faute de frappe (lettre doublée, lettres inversées) et l'initiale « A. <Nom> » partagent le code du nom ; aucun code « A »", () => {
  const book = newCodebook();
  const a = full("Représentée par M. Abdelkader Ouazzani, Président Directeur Général.", book);
  const nom = codes(a, "NOM");
  assert.equal(nom.length, 1, a);
  const b = full("Cher M. Ouazani,\nvotre courrier est arrivé. Signé : A. Ouazzani. Vu par M. A. Ouazzani, PDG.", book);
  assert.ok(!/Ouazani|Ouazzani/.test(b), b);
  assert.equal(codes(b, "NOM").length, 1, b);
  assert.equal(codes(b, "NOM")[0], nom[0], "la faute de frappe rejoint le nom");
  assert.ok(!/\bA\. /.test(b), `l'initiale disparaît dans le code du nom : ${b}`);
  assert.match(b, new RegExp(`Vu par M\\. ${nom[0]}, PDG`), b);
  assert.ok(!book.entries.some((e) => e.value === "A"), "pas de code pour une lettre");
  assert.ok(!book.entries.some((e) => e.value === "Ouazani"), "pas de second code pour la faute de frappe");
  // « OUAZZANI Abdelkader » (nom d'abord) et « ABDELKADER » seul : les mêmes codes.
  const c = full("M. OUAZZANI Abdelkader, représentant légal. Prénom : ABDELKADER.", book);
  assert.ok(c.includes(nom[0]) && !/OUAZZANI|ABDELKADER|Abdelkader/.test(c), c);
  assert.equal(entries(book, "PRENOM").length, 1, JSON.stringify(entries(book, "PRENOM")));
  assert.ok(full("Convocation de Mme Nadia Ouazzini.", book).includes("NOM-"), "un autre nom à une lettre près (substitution) reste un autre nom");
  assert.ok(book.entries.some((e) => e.value === "Ouazzini"), "il reçoit son propre code");
  // « ATLAS CONSERVES IND » dans un libellé bancaire : l'abréviation rejoint la dénomination.
  const b3 = newCodebook();
  const d = full("Nous distribuons Atlas Conserves Industries (ACI).", b3);
  const soc = codes(d, "SOCIETE")[0];
  const e = full("VIR RECU ATLAS CONSERVES IND /FA-2025-333", b3);
  assert.ok(e.includes(soc) && !/ATLAS|CONSERVES|IND\b/.test(e), e);
  assert.match(e, /^VIR RECU SOCIETE-\d{3} \/FA-2025-333$/, e);
});

/* 5 — les mots courants n'entrent jamais dans la clé comme des noms. */
test("T08-5 : Directeur, Distributeur, Exercice, Objectif, Prénom, Nom, Parc, VIR, RECU, le bandeau OCR et les en-têtes en capitales ne sont pas des noms", () => {
  const book = newCodebook();
  const texte = [
    "M. Karim Chafik, Directeur Général, représente le Fournisseur.",
    "Le Fournisseur confie au Distributeur la distribution des Produits. Le stock de Produits du Distributeur est repris.",
    "Copie de travail scannée depuis l'exemplaire Distributeur.",
    "Exercice Objectif minimum HT (DH)\n2024 12 800 000\n2025 14 500 000",
    "Le territoire comprend les régions de Casablanca-Settat et de Rabat-Salé-Kénitra.",
    "Objet : TR: échanges pour le dossier\nObjet : RE: Résiliation du contrat (ii) augmentée.",
    "Ma chère Consœur, Cabinet Belkadi et Associés — Avocats au barreau de Casablanca",
    "# scan — texte reconnu par OCR, À RELIRE AVANT USAGE",
    "ROYAUME DU MAROC\nCARTE NATIONALE D'IDENTITÉ\nNom\nPrénom",
    "ROYAUME DU MAROC TRIBUNAL DE COMMERCE DE CASABLANCA",
    "ENTRE LES SOUSSIGNÉES :\nAVENANT N° 1 AU CONTRAT DE DISTRIBUTION\nEXCLUSIVE DU 15 MARS 2019",
    "Me Mustapha Bakkali — C ommissaire judiciaire près le tribunal de première instance de C asablanca",
    "Mme Ikram El Ouafi, standardiste. Mme El Ouafi a signé. Rendez-vous à l'agence Barid Al-Maghrib d'Aïn Sebaâ, mar. 20 oct. à 19:32.",
  ].join("\n");
  const out = full(texte, book);
  const jamais = ["Directeur", "Distributeur", "Produits", "Exercice", "Objectif", "Prénom", "Nom", "Parc", "VIR", "RECU", "RELIRE", "AVANT", "USAGE", "À",
    "ROYAUME", "MAROC", "CARTE", "NATIONALE", "TRIBUNAL", "COMMERCE", "CASABLANCA", "SOUSSIGNÉES", "EXCLUSIVE", "Associés", "Consœur", "TR", "RE", "ii", "mar", "C",
    "Casablanca-Settat", "Rabat-Salé-Kénitra", "El", "Barid", "Al-Maghrib", "ommissaire", "asablanca", "Général"];
  for (const v of jamais) assert.ok(!book.entries.some((e) => e.value === v), `« ${v} » est entré dans la clé : ${JSON.stringify(book.entries.map((e) => e.value))}`);
  assert.ok(book.entries.some((e) => e.code.startsWith("SOCIETE-") && e.value === "Cabinet Belkadi et Associés"), "le cabinet est UNE société, « Associés » compris");
  for (const clair of ["Directeur Général", "au Distributeur", "Exercice Objectif minimum", "12 800 000", "Casablanca-Settat", "TR:", "RE:", "(ii)", "Consœur",
    "À RELIRE AVANT USAGE", "ROYAUME DU MAROC", "CARTE NATIONALE D'IDENTITÉ", "TRIBUNAL DE COMMERCE DE CASABLANCA", "ENTRE LES SOUSSIGNÉES", "C ommissaire judiciaire", "C asablanca",
    "Mme El NOM-", "Barid Al-Maghrib", "mar. 20 oct."]) {
    assert.ok(out.includes(clair), `« ${clair} » n'est plus lisible :\n${out}`);
  }
  // Ce qui doit être codé l'est quand même.
  for (const v of ["Chafik", "Karim", "Belkadi", "Bakkali", "Mustapha", "Ikram", "Ouafi", "Sebaâ"]) assert.ok(!out.includes(v), `${v} en clair`);
  // Le bandeau d'un scan relu est retiré avant codage par le connecteur ; ici, même laissé, il reste lisible.
  assert.ok(!nameCandidatesFromText("ROYAUME DU MAROC\nCARTE NATIONALE D'IDENTITÉ\nSMDA SA — FACTURE N° FA-2025-1129", { knownWord: (w) => isKnownWord(w) })
    .some((c) => /ROYAUME|CARTE|FACTURE/.test(c.value)), "les en-têtes en capitales ne sont pas des sociétés pour le moteur");
});

/* 7 — les nombres : colonnes d'un relevé, montants groupés. */
test("T08-7 : « Solde », « CA », « Chiffre d'affaires », « Total » sont des montants en clair ; un montant à séparateurs de milliers n'est pas un téléphone", () => {
  for (const h of ["Solde", "CA HT Produits ACI (DH)", "Chiffre d'affaires", "Total TTC", "Objectif (DH)", "Solde dû au 31/10/2026"]) {
    assert.equal(classifyNumericHeader(h).sensible, false, h);
  }
  assert.equal(classifyNumericHeader("Salaire brut").sensible, true, "la paie reste protégée");
  const ws = XLSX.utils.aoa_to_sheet([["Exercice", "CA HT Produits (DH)", "Objectif (DH)", "Solde"], [2023, 12278818.18, 12800000, 907022.52], [2024, 13172513.08, 14500000, 0]]);
  const plan = planNumbers(ws, XLSX, { mode: "auto", headerRow: 0 });
  assert.deepEqual(plan.colonnes.map((c) => c.mode), ["clair", "clair", "clair", "clair"], JSON.stringify(plan.colonnes));
  const out = full("Exercice Objectif minimum HT (DH)\n2024 12 800 000\n2025 14 500 000\nTotal : 1 039 289,75 DH. Joignable au +212 6 10 64 77 66 ou au 05 22 39 67 85.");
  assert.ok(out.includes("2024 12 800 000") && out.includes("2025 14 500 000") && out.includes("1 039 289,75"), out);
  assert.equal(codes(out, "TEL").length, 2, out);
  assert.ok(!/06 10 64 77 66|05 22 39 67 85/.test(out));
  // Le verrou de sortie non plus (l'audit du sceau comptait « 12 800 000 » comme un numéro masqué).
  assert.equal(guardText("Objectifs : 2024 12 800 000, 2025 14 500 000 ; suivi RR674701456MA").masked, 0);
  assert.equal(guardText("Appeler le 06 12 34 56 78").masked, 1);
});

/* 8 — pièces comptables et suivi postal lisibles, opérateur postal lisible. */
test("T08-8 : n° de facture et d'avoir lisibles (un n° de dossier reste codé) ; un suivi postal RR…MA n'est pas un RIB ; Barid Al-Maghrib reste lisible", () => {
  const book = newCodebook();
  const out = full("SMDA SA — FACTURE N° FA-2025-1129\nAvoir AV-2026-0016 sur FA-2025-1129. Virement VIR-468557 reçu.\n" +
    "Présenté le 27 mai 2026 (suivi Barid Al-Maghrib RR674701456MA).\nDossier FAC-2026-0142, voir BRK-220.", book);
  for (const clair of ["FACTURE N° FA-2025-1129", "Avoir AV-2026-0016 sur FA-2025-1129", "VIR-468557", "Barid Al-Maghrib RR674701456MA"]) assert.ok(out.includes(clair), `${clair} :\n${out}`);
  assert.ok(!/FAC-2026-0142|BRK-220/.test(out), "un n° de dossier et une référence d'article restent codés");
  assert.equal(entries(book, "RIB").length, 0, "pas de RIB");
  assert.equal(entries(book, "SOCIETE").length, 1, JSON.stringify(entries(book, "SOCIETE")));
  assert.equal(entries(book, "SOCIETE")[0].value, "SMDA SA", "la société seule, pas « SMDA SA — FACTURE N° … »");
  assert.ok(!book.entries.some((e) => /Barid|Maghrib/.test(e.value)), "l'opérateur postal n'est pas un nom");
  // Le moteur, avant le verrou : la ligne en capitales est lue segment par segment.
  const cands = nameCandidatesFromText("SMDA SA — FACTURE N° FA-2025-1129\nSMDA SA — AVOIR N° AV-2026-0016", { knownWord: (w) => isKnownWord(w) });
  assert.deepEqual(cands.map((c) => c.value), ["SMDA SA"]);
});

/* 11 — la couche marocaine : le pack juridique-ma. */
test("T08-11 : pack juridique-ma — n° de dossier NNNN/8202/AAAA et n° de PV codés sous leur nom, colonnes RC/ICE/IF/patente/CNSS, juridictions et institutions lisibles", () => {
  const d = developperPacks(["juridique-ma"]);
  assert.deepEqual(d.erreurs, []);
  const c = compilerRegles({ dossier: d.regles, entetes: d.entetes });
  const coder = (t) => { const book = newCodebook(); const extra = c.trouver([t]); return strictCode(anonymizeText(t, book, extra, { excludes: c.exclusions }).text, { book, extra, excludes: c.exclusions }).text; };
  const t = coder("TRIBUNAL DE COMMERCE DE CASABLANCA — Dossier n° 7944/8202/2026 — Audience du 05/11/2026. Procès-verbal de constat n° 500/2026 dressé par Me Bakkali, commissaire judiciaire. " +
    "Le pli, suivi Barid Al-Maghrib RR674701456MA, relève du tribunal de commerce de Casablanca et du Dahir des obligations et contrats.");
  assert.match(t, /Dossier n° AFFAIRE-\d{3}/, t);
  assert.match(t, /constat n° PV-\d{3}/, t);
  assert.ok(!/7944\/8202\/2026|500\/2026/.test(t));
  for (const clair of ["tribunal de commerce de Casablanca", "commissaire judiciaire", "Barid Al-Maghrib", "Dahir des obligations et contrats", "RR674701456MA"]) assert.ok(t.includes(clair), `${clair} :\n${t}`);
  assert.ok(!t.includes("Bakkali"));
  for (const [h, id] of [["RC", "rc"], ["ICE", "ice"], ["IF", "if"], ["N° patente", "patente"], ["N° CNSS", "cnss"]]) assert.equal(c.typeColonne(h), id, h);
  assert.equal(c.typeColonne("Montant"), null);
});

/* 10 — le décodage : un pseudonyme renouvelé se décode encore ; un Word incomplet est refusé (e2e plus bas). */
test("T08-10 : un pseudonyme renouvelé reste dans la clé et se décode encore", () => {
  const book = newCodebook();
  book.entries.push({ code: "NOM-001", value: "Ouazzani", type: "Nom", pseudo: "Sbaï" });
  book.byKey["NOM||Ouazzani"] = "NOM-001";
  // Une personne nommée comme le pseudonyme entre dans la clé : le pseudonyme est renouvelé…
  book.entries.push({ code: "NOM-002", value: "Sbaï", type: "Nom" });
  book.byKey["NOM||Sbaï"] = "NOM-002";
  const ctx = contextFor(book, "");
  assert.equal(ctx.renouveles, 1);
  assert.equal(book.entries[0].pseudo, undefined);
  assert.deepEqual(book.entries[0].anciensPseudos, [{ pseudo: "Sbaï" }]);
  // … mais un texte rendu avec lui se décode toujours vers la bonne personne.
  assert.equal(pseudoMap(book)["SBAÏ"], "Ouazzani");
  assert.equal(decodeText("Conclusions pour M. Sbaï.", pseudoMap(book)).text, "Conclusions pour M. Ouazzani.");
  assert.equal(codesDepuisPseudos(book)("M. Sbaï"), "M. NOM-001");
  // Une date de naissance en deux écritures (« 03/07/1975 » dans un tableur,
  // « 3 juillet 1975 » dans une note) : deux entrées, le même décalage, et
  // chacune revient à SA valeur — le pseudonyme propre l'emporte sur l'écriture
  // dérivée de l'autre (recette bloc M, M5a / M11b).
  const b2 = newCodebook();
  b2.entries.push({ code: "NAISS-001", value: "03/07/1975", type: "Date de naissance", pseudo: "27/09/1974" });
  b2.entries.push({ code: "NAISS-002", value: "3 juillet 1975", type: "Date de naissance", pseudo: "27 septembre 1974" });
  const m2 = pseudoMap(b2);
  assert.equal(m2["27 SEPTEMBRE 1974"], "3 juillet 1975");
  assert.equal(m2["27/09/1974"], "03/07/1975");
  assert.equal(decodeText("née le 27 septembre 1974, soit le 27/09/1974", m2).text, "née le 3 juillet 1975, soit le 03/07/1975");
});

/* ------------------------------------------------------- de bout en bout */

async function connecteur(root, { reglages = { packs: ["juridique-fr"] }, fichiers = {} } = {}) {
  const { Client } = await import("@modelcontextprotocol/client");
  const { StdioClientTransport } = await import("@modelcontextprotocol/client/stdio");
  const { mint } = await import("./licence-test.mjs");
  const workdir = path.join(root, "dossier");
  fs.mkdirSync(path.join(workdir, "Hidden-Tokens"), { recursive: true });
  fs.writeFileSync(path.join(workdir, "Hidden-Tokens", "reglages.json"), JSON.stringify(reglages));
  for (const [n, c] of Object.entries(fichiers)) fs.writeFileSync(path.join(workdir, n), c);
  const client = new Client({ name: "validation-t08", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Cabinet Test T08", seats: 2, iat: "2026-10-20", exp: "9999-12-31", life: true }),
      ANX_SENTINELLE: "non", ANX_CHIFFRES: "auto" },
  }));
  return { client, workdir };
}
const texte = (r) => r.content.map((c) => c.text || "").join("\n");
const roots = [];
after(() => { for (const r of roots) fs.rmSync(r, { recursive: true, force: true }); });
const root = () => { const r = fs.mkdtempSync(path.join(os.tmpdir(), "ht-t08-")); roots.push(r); return r; };

/* 6 — le contrôle final du lot. */
test("T08-6 : une valeur apprise dans une pièce ultérieure est codée dans les copies Word précédentes ; une copie refusée l'est par le contrôle final, jamais « illisible ou scannée »", async () => {
  const { client, workdir } = await connecteur(root(), {
    fichiers: {
      // La note écrit la société en minuscules : rien à coder pour le verrou, tant que la clé ne la connaît pas.
      "01-note.docx": buildDocx("Point du 12 mai : le contrat atlas négoce est signé, la livraison suit.", XLSX),
      "02-contrat.docx": buildDocx("Entre Atlas Négoce SARL, représentée par M. Karim Benali, et le cabinet.", XLSX),
    },
  });
  try {
    const out = texte(await client.callTool({ name: "anonymiser_dossier", arguments: { confirmer: true } }));
    assert.match(out, /LOT TERMINÉ — 2\/2/, out);
    assert.ok(!/illisible|scann/.test(out), out);
    const dir = path.join(workdir, "Hidden-Tokens");
    assert.ok(fs.existsSync(path.join(dir, "01-note-anonymise.docx")), "la note n'a pas été écrite");
    assert.ok(fs.existsSync(path.join(dir, "02-contrat-anonymise.docx")));
    const md = fs.readFileSync(path.join(dir, "01-note-anonymise.md"), "utf8");
    assert.match(md, /le contrat SOCIETE-\d{3} est signé/, `la société apprise dans la pièce b est codée dans la pièce a :\n${md}`);
    const rapport = fs.readFileSync(path.join(dir, fs.readdirSync(dir).find((n) => n.startsWith("rapport-lot-"))), "utf8");
    assert.ok(!/contrôle final/.test(rapport), rapport);
  } finally { await client.close(); }
});

/* 9 — le lot couvre les textes et liste les images. */
test("T08-9 : anonymiser_dossier code les .txt et .md, liste les images avec lire_scan dans le même plan, puis reprend les scans relus (motif RELIRE)", async () => {
  const { client, workdir } = await connecteur(root(), {
    fichiers: {
      "echange.txt": "De : Ayoub Mouline <ayoub66@atlas-conserves.example.ma>\nObjet : RE: Résiliation\n\nM. Ouazzani, le pli vous a été présenté le 27 mai 2026 (suivi RR674701456MA).\n",
      "scan.jpg": fs.readFileSync(path.join(here, "fixtures", "scan.jpg")),
    },
  });
  try {
    const plan = texte(await client.callTool({ name: "anonymiser_dossier", arguments: {} }));
    assert.match(plan, /PLAN DE LOT — 2 fichier/, plan);
    assert.match(plan, /echange\.txt : texte, \d+ valeur/, plan);
    assert.match(plan, /image \(scan\) → à lire par lire_scan/, plan);
    assert.match(plan, /1 image\(s\) ou PDF scanné\(s\)/, plan);
    const out = texte(await client.callTool({ name: "anonymiser_dossier", arguments: { confirmer: true } }));
    assert.match(out, /LOT TERMINÉ — 1\/2/, out);
    assert.match(out, /1 scan\(s\) à lire/, out);
    assert.ok(!/illisible/.test(out), out);
    const dir = path.join(workdir, "Hidden-Tokens");
    const md = fs.readFileSync(path.join(dir, "echange-anonymise.md"), "utf8");
    assert.ok(!/Mouline|Ouazzani|ayoub66/.test(md), md);
    assert.ok(md.includes("RE: Résiliation") && md.includes("RR674701456MA"), md);
    // Le scan : lire_scan (OCR sur le poste), puis le lot avec le motif « RELIRE » code le texte relu — une approbation.
    const ocr = texte(await client.callTool({ name: "lire_scan", arguments: { nom_fichier: "scan.jpg" } }));
    assert.match(ocr, /OCR terminé/, ocr);
    const plan2 = texte(await client.callTool({ name: "anonymiser_dossier", arguments: { motif: "RELIRE" } }));
    assert.match(plan2, /PLAN DE LOT — 1 fichier/, plan2);
    assert.match(plan2, /scan relu/, plan2);
    const out2 = texte(await client.callTool({ name: "anonymiser_dossier", arguments: { motif: "RELIRE", confirmer: true } }));
    assert.match(out2, /LOT TERMINÉ — 1\/1/, out2);
    const relu = fs.readdirSync(dir).find((n) => /-anonymise\.md$/.test(n) && n !== "echange-anonymise.md");
    assert.ok(relu, "le scan relu n'a pas de sortie");
    const t = fs.readFileSync(path.join(dir, relu), "utf8");
    assert.ok(!/À RELIRE AVANT USAGE|Confiance moyenne/.test(t), `le préambule OCR du connecteur ne part pas à l'IA :\n${t.slice(0, 300)}`);
  } finally { await client.close(); }
});

test("T08-10 (e2e) : deanonymiser refuse d'écrire un Word tant qu'un pseudonyme ou un code de la clé reste dans le texte", async () => {
  const { client, workdir } = await connecteur(root(), {
    reglages: { packs: ["juridique-fr"], rendu: "lisible" },
    fichiers: { "note.md": "Le témoin Mounir Naciri, responsable logistique, a retiré le pli pour M. Abdelkader Ouazzani.\n" },
  });
  try {
    await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "note.md", confirmer: true } });
    const cle = JSON.parse(fs.readFileSync(path.join(workdir, "Hidden-Tokens", "cle-de-session.json"), "utf8"));
    const nom = cle.entries.find((e) => e.code.startsWith("NOM-") && e.pseudo);
    assert.ok(nom, "un pseudonyme a été posé");
    // Le pseudonyme recopié en minuscules n'est pas retraduit : le Word n'est pas écrit.
    const refus = await client.callTool({ name: "deanonymiser", arguments: { contenu: `Conclusions pour ${nom.pseudo}, dit ${nom.pseudo.toLowerCase()}.`, format: "docx", nom_sortie: "conclusions" } });
    assert.ok(refus.isError, texte(refus));
    assert.match(texte(refus), /Décodage incomplet : 0 code\(s\) et 1 pseudonyme\(s\)/, texte(refus));
    assert.ok(!fs.readdirSync(path.join(workdir, "Hidden-Tokens")).some((n) => n.startsWith("conclusions-decode-")), "rien n'a été écrit");
    // Recopié tel quel : écrit, et le nom réel y est (sur le poste, jamais dans la réponse).
    const ok = texte(await client.callTool({ name: "deanonymiser", arguments: { contenu: `Conclusions pour ${nom.pseudo} et ${nom.code}.`, format: "docx", nom_sortie: "conclusions" } }));
    assert.match(ok, /2 code\(s\) remplacé\(s\)/, ok);
    assert.ok(!ok.includes(nom.value));
    assert.ok(fs.readdirSync(path.join(workdir, "Hidden-Tokens")).some((n) => n.startsWith("conclusions-decode-") && n.endsWith(".docx")));
  } finally { await client.close(); }
});
