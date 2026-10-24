// PSEUDONYMES (v2.23) — le rendu « lisible » : des pseudonymes plausibles,
// stables, réversibles, jamais ambigus ; et le mode « codes » inchangé.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { XLSX, newCodebook, codeFor, decodeText } from "../server/engine.js";
import { strictCode, fold, CODE_SRC } from "../server/verrou.js";
import {
  rendreLisible, rendreFeuille, contextFor, pseudonymFor, pseudoMap, codesDepuisPseudos, shiftDate,
  readRenderSetting, describeRendu, secretPseudo, DEFAULT_RENDER_MODE, PREFIXES_RENDUS,
} from "../server/pseudonymes.js";

const CODE_RX = new RegExp(CODE_SRC, "gu");
const TEXTE =
  "Me Karim Benali, né le 12/04/1981 à Fès, représente la société Atlas Négoce SARL AU contre Mme Claire Rousseau " +
  "(née le 3 juillet 1975). Joindre karim.benali@gmail.com ou le 06 61 23 45 67. Audience au TJ de Casablanca.";
const REELS = ["Karim", "Benali", "Atlas Négoce", "Claire", "Rousseau", "12/04/1981", "3 juillet 1975", "karim.benali@gmail.com", "06 61 23 45 67"];

/* Carte CODE/PSEUDO (majuscules) → valeur, comme decodeMap() dans index.js. */
function tableDecodage(book) {
  const map = {};
  for (const e of book.entries) map[e.code.toUpperCase()] = e.value;
  Object.assign(map, pseudoMap(book));
  return map;
}

function coder(book, texte) {
  return strictCode(texte, { book }).text;
}

test("mode codes par défaut : rien ne change sans réglage ni option", () => {
  assert.equal(DEFAULT_RENDER_MODE, "codes");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-rendu-"));
  assert.deepEqual(readRenderSetting(dir, {}), { mode: "codes", source: "défaut" });
  const book = newCodebook();
  const code = coder(book, TEXTE);
  assert.match(code, /PRENOM-001 NOM-001/);
  assert.ok(!book.entries.some((e) => e.pseudo), "aucun pseudonyme attribué en mode codes");
  assert.equal(book.pseudonymes, undefined, "pas de graine tant que le rendu lisible n'est pas demandé");
  assert.equal(describeRendu("codes", "défaut"), "");
});

test("réglage du dossier (reglages.json, champ rendu) puis variable ANX_RENDU", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-rendu-"));
  fs.writeFileSync(path.join(dir, "reglages.json"), JSON.stringify({ chiffres: "auto", rendu: "lisible" }));
  assert.equal(readRenderSetting(dir, {}).mode, "lisible");
  assert.match(readRenderSetting(dir, {}).source, /appli/);
  fs.writeFileSync(path.join(dir, "reglages.json"), JSON.stringify({ chiffres: "auto" }));
  assert.equal(readRenderSetting(dir, { ANX_RENDU: "lisible" }).mode, "lisible");
  assert.equal(readRenderSetting(dir, { ANX_RENDU: "n'importe" }).mode, "codes");
  fs.writeFileSync(path.join(dir, "reglages.json"), "{ cassé");
  assert.equal(readRenderSetting(dir, {}).mode, "codes");
});

test("lisible : noms, société et dates deviennent des pseudonymes ; identifiants restent des codes", () => {
  const book = newCodebook();
  const r = rendreLisible(coder(book, TEXTE), book);
  assert.equal(r.rendus, 7, "2 prénoms + 2 noms + 2 naissances + 1 société");
  assert.equal(r.restes, 2, "EMAIL-001 et TEL-001 restent des codes");
  assert.match(r.text, /EMAIL-001/);
  assert.match(r.text, /TEL-001/);
  for (const v of REELS) assert.ok(!r.text.includes(v), `valeur réelle visible : ${v}`);
  // Plus aucun code de personne, de société ni de naissance.
  for (const c of r.text.match(CODE_RX) || []) assert.ok(/^(EMAIL|TEL)-/.test(c), `code resté : ${c}`);
  // La société garde sa forme juridique, pas son nom.
  const soc = book.entries.find((e) => e.code === "SOCIETE-001");
  assert.match(soc.pseudo, /SARL AU$/);
  assert.ok(!fold(soc.pseudo).includes("atlas"), "« Atlas » est la moitié du nom réel");
  // Le texte reste du français lisible autour.
  // (un patronyme fictif peut faire deux mots : « El Fassi »)
  assert.match(r.text, /^Me \p{Lu}\p{L}+ \p{Lu}[\p{L} ]+, né le \d{2}\/\d{2}\/\d{4} à Fès, représente la société /u);
});

test("genre et aire culturelle : un prénom féminin français reste féminin français, un marocain reste marocain", () => {
  const book = newCodebook();
  const lex = JSON.parse(fs.readFileSync(new URL("../lexique/pseudonymes.json", import.meta.url), "utf8"));
  const inList = (l, v) => l.map(fold).includes(fold(v));
  rendreLisible(coder(book, TEXTE), book);
  const by = Object.fromEntries(book.entries.map((e) => [e.value, e.pseudo]));
  assert.ok(inList(lex.prenoms.fr.f, by["Claire"]), `Claire → ${by["Claire"]} (attendu : prénom féminin français)`);
  assert.ok(inList(lex.prenoms.ma.m, by["Karim"]), `Karim → ${by["Karim"]} (attendu : prénom masculin marocain)`);
  assert.ok(inList(lex.noms.ma, by["Benali"]), `Benali → ${by["Benali"]} (attendu : patronyme marocain)`);
  assert.ok(inList(lex.noms.fr, by["Rousseau"]), `Rousseau → ${by["Rousseau"]} (attendu : patronyme français)`);
});

test("stabilité : même personne → même pseudonyme dans deux textes, deux feuilles, et après rechargement de la clé", () => {
  const book = newCodebook();
  const a = rendreLisible(coder(book, TEXTE), book).text;
  const b = rendreLisible(coder(book, "Rappel : M. Karim Benali et Atlas Négoce doivent répondre. Claire Rousseau aussi."), book).text;
  const pseudoKarim = book.entries.find((e) => e.value === "Karim").pseudo;
  const pseudoBenali = book.entries.find((e) => e.value === "Benali").pseudo;
  assert.ok(a.includes(`${pseudoKarim} ${pseudoBenali}`) && b.includes(`${pseudoKarim} ${pseudoBenali}`));
  // La clé rechargée depuis le disque (JSON) garde les pseudonymes : c'est le format de cle-de-session.json.
  const reloaded = JSON.parse(JSON.stringify(book));
  const c = rendreLisible(coder(reloaded, "Convocation de Karim Benali."), reloaded).text;
  assert.ok(c.includes(`${pseudoKarim} ${pseudoBenali}`));
  assert.deepEqual(reloaded.pseudonymes, book.pseudonymes, "la graine et le delta voyagent avec la clé");
  // Une feuille : mêmes codes, mêmes pseudonymes.
  const ws = XLSX.utils.aoa_to_sheet([["Nom", "Prénom", "Note"], ["NOM-001", "PRENOM-001", "voir SOCIETE-001"], ["NOM-002", "PRENOM-002", "RAS"]]);
  const r = rendreFeuille(ws, book);
  assert.equal(r.rendus, 5);
  assert.equal(ws.A2.v, pseudoBenali);
  assert.equal(ws.B2.v, pseudoKarim);
  assert.equal(ws.C3.v, "RAS");
});

test("réversibilité complète : decodeText retraduit pseudonymes et codes, y compris en Word/majuscules et sans forme juridique", () => {
  const book = newCodebook();
  const r = rendreLisible(coder(book, TEXTE), book);
  const map = tableDecodage(book);
  assert.equal(decodeText(r.text, map).text, TEXTE);
  // Une réponse de l'IA qui mélange codes, pseudonymes, et la société sans sa forme juridique.
  const soc = book.entries.find((e) => e.code === "SOCIETE-001").pseudo;
  const core = soc.replace(/\s+SARL AU$/, "");
  const karim = book.entries.find((e) => e.value === "Karim").pseudo;
  const reponse = `Courrier à ${karim.toUpperCase()} (PRENOM-001) au sujet de ${core} : ${book.entries.find((e) => e.value === "12/04/1981").pseudo}.`;
  const d = decodeText(reponse, map);
  // La société sans sa forme juridique redevient la valeur complète de la clé (comme son alias réel).
  assert.equal(d.text, "Courrier à Karim (Karim) au sujet de Atlas Négoce SARL AU : 12/04/1981.");
  assert.equal(d.replaced, 4);
  // Retour aux codes (contrôle d'aperçu).
  assert.equal(codesDepuisPseudos(book)(r.text), coder(newCodebook(), TEXTE));
});

test("un pseudonyme en minuscules au fil d'une phrase n'est pas décodé (ce n'est pas la personne)", () => {
  const book = newCodebook();
  codeFor(book, "societe", "Atlas Négoce SARL");
  const e = book.entries[0];
  e.pseudo = "Horizon Services SARL";
  const map = tableDecodage(book);
  assert.equal(decodeText("l'horizon services est dégagé ; Horizon Services a signé.", map).text, "l'horizon services est dégagé ; Atlas Négoce SARL a signé.");
  // Les codes, eux, se décodent quelle que soit leur casse (comportement historique).
  assert.equal(decodeText("voir societe-001", map).text, "voir Atlas Négoce SARL");
});

test("dates de naissance : delta secret constant par dossier, écriture conservée, durées justes", () => {
  assert.equal(shiftDate("12/04/1981", 63), "14/06/1981");
  assert.equal(shiftDate("12.04.1981", -40), "03.03.1981");
  assert.equal(shiftDate("3 juillet 1975", 63), "4 septembre 1975");
  assert.equal(shiftDate("1er mars 1979", 1), "2 mars 1979");
  assert.equal(shiftDate("30 Décembre 1979", 2), "1er Janvier 1980");
  assert.equal(shiftDate("03/07/85", 63), "04/09/85");
  assert.equal(shiftDate("1990", 200), "1991");
  assert.equal(shiftDate("1990", -200), "1989");
  assert.equal(shiftDate("un jour", 5), null);
  const book = newCodebook();
  const r = rendreLisible(coder(book, "A est né le 12/04/1981. B est née le 12/04/1983. C est né le 15 mai 1981."), book);
  const d = secretPseudo(book).deltaJours;
  assert.ok(Math.abs(d) >= 30 && Math.abs(d) <= 400);
  const dates = [...r.text.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map((m) => m[0]);
  const jours = (s) => { const [dd, mm, yy] = s.split("/").map(Number); return Date.UTC(yy, mm - 1, dd) / 86400000; };
  assert.equal(jours(dates[1]) - jours(dates[0]), 730, "deux ans entre A et B, comme dans la réalité");
  assert.equal(jours(dates[0]) - jours("12/04/1981"), d, "A est décalé du delta du dossier");
  const c = book.entries.find((e) => e.value === "15 mai 1981").pseudo;
  assert.match(c, /^(1er|\d{1,2}) \p{L}+ \d{4}$/u, "écriture en lettres conservée");
});

test("aucune collision : jamais une valeur réelle de la clé, jamais un mot du texte, jamais deux fois le même, jamais un mot du dictionnaire", () => {
  const book = newCodebook();
  // Beaucoup de personnes : les pseudonymes doivent rester tous distincts.
  const noms = ["Benali", "Tazi", "Alaoui", "Berrada", "Rousseau", "Moreau", "Lefèvre", "Smith", "Brown", "Zerouali", "Kettani", "Idrissi"];
  const prenoms = ["Karim", "Mehdi", "Salma", "Claire", "Pierre", "Jean", "Emma", "Oliver", "Yassine", "Nadia", "Aïcha", "Omar"];
  let texte = "";
  for (let i = 0; i < noms.length; i++) texte += `M. ${prenoms[i]} ${noms[i]} est partie. `;
  const r = rendreLisible(coder(book, texte), book);
  const pseudos = book.entries.map((e) => e.pseudo).filter(Boolean);
  assert.equal(pseudos.length, 24);
  assert.equal(new Set(pseudos.map(fold)).size, 24, "tous distincts");
  const reels = new Set(book.entries.map((e) => fold(e.value)));
  for (const p of pseudos) assert.ok(!reels.has(fold(p)), `pseudonyme = valeur réelle : ${p}`);
  // Un pseudonyme ne coïncide pas avec un mot du texte : « partie » et « est » sont dans le texte.
  for (const p of pseudos) assert.ok(!/^(partie|est|m)$/i.test(p));
  // Mot entier : « Emmanuel » contient « Emma » sans être Emma.
  const motEntier = (v) => new RegExp(`(?<![\\p{L}])${v}(?![\\p{L}])`, "u");
  for (const v of [...noms, ...prenoms]) assert.ok(!motEntier(v).test(r.text), `valeur réelle visible : ${v}`);
  // Le candidat naturel d'une ville ne peut pas être une ville du texte.
  const book2 = newCodebook();
  codeFor(book2, "lieu", "Fès");
  for (let i = 0; i < 40; i++) {
    const b = JSON.parse(JSON.stringify(book2));
    b.pseudonymes = { graine: `g${i}`, deltaJours: 40 };
    const t = rendreLisible("Domicilié à LIEU-001, audience à Casablanca puis à Rabat.", b).text;
    assert.ok(!/LIEU-001/.test(t));
    assert.ok(!/Casablanca.*Casablanca|Rabat.*Rabat|Fès/.test(t), `collision ville : ${t}`);
  }
});

test("aucun MOT d'un pseudonyme n'est une valeur réelle : le verrou de sortie ne recode rien dedans", async () => {
  const { guardText } = await import("../server/sortie.js");
  // Toutes les suites de raisons sociales, et quelques amorces, sont déjà des valeurs réelles de la clé
  // (un mot inconnu codé un jour dans un scan, par exemple) : le pseudonyme de la société doit les éviter.
  const lex = JSON.parse(fs.readFileSync(new URL("../lexique/pseudonymes.json", import.meta.url), "utf8"));
  for (let i = 0; i < 20; i++) {
    const book = newCodebook();
    for (const su of lex.societes.suites) codeFor(book, "autre", su);
    for (const am of lex.societes.amorces.slice(0, 30)) codeFor(book, "autre", am);
    codeFor(book, "nom", "Garage");
    codeFor(book, "societe", "Garage Lefèvre");
    codeFor(book, "societe", "Gharb Primeurs SARL");
    book.pseudonymes = { graine: `g${i}`, deltaJours: 40 };
    const r = rendreLisible("SOCIETE-001 et SOCIETE-002", book);
    const g = guardText(r.text, { book });
    assert.equal(g.recoded, 0, `recodé dans un pseudonyme : ${r.text} → ${g.text}`);
    for (const e of book.entries.filter((e) => e.pseudo)) assert.ok(!/Garage/.test(e.pseudo), `« Garage » est une valeur réelle : ${e.pseudo}`);
  }
});

test("une valeur réelle qui coïncide avec un pseudonyme existant le fait renouveler, et le dit", () => {
  const book = newCodebook();
  rendreLisible(coder(book, "Dossier de Karim Benali."), book);
  const ancien = book.entries.find((e) => e.value === "Benali").pseudo;
  // Une vraie personne porte ce nom : elle entre dans la clé.
  const r = rendreLisible(coder(book, `Convocation de Mme Nadia ${ancien} et de M. Karim Benali.`), book);
  const nouveau = book.entries.find((e) => e.value === "Benali").pseudo;
  assert.notEqual(nouveau, ancien);
  assert.equal(r.renouveles, 1);
  assert.ok(!r.text.includes(ancien), "la vraie personne est codée, le vieux pseudonyme ne traîne pas");
  assert.match(describeRendu("lisible", "test", r), /1 pseudonyme\(s\) renouvelé/);
  // Le décodage ne connaît plus que le nouveau pseudonyme pour Benali, et la vraie personne par son code.
  const map = tableDecodage(book);
  assert.equal(decodeText(`${nouveau}`, map).text, "Benali");
});

test("nom complet (colonne « Nom complet ») : prénom + patronyme, ordre et casse du texte, alias du patronyme", () => {
  const book = newCodebook();
  codeFor(book, "personne", "Yassine El Amrani");
  codeFor(book, "personne", "BENKIRANE Salma");
  const r = rendreLisible("PERSONNE-001 et PERSONNE-002", book);
  const [p1, p2] = book.entries.map((e) => e.pseudo);
  assert.match(p1, /^\p{Lu}\p{Ll}+ \p{Lu}[\p{L} ]+$/u, `prénom puis nom : ${p1}`);
  assert.match(p2, /^[\p{Lu} ]+ \p{Lu}\p{Ll}+$/u, `NOM en majuscules puis prénom : ${p2}`);
  assert.equal(r.text, `${p1} et ${p2}`);
  const map = tableDecodage(book);
  assert.equal(decodeText(r.text, map).text, "Yassine El Amrani et BENKIRANE Salma");
  // « Mme Tazi » dans la réponse de l'IA → le patronyme réel.
  const nomFictif = p1.split(" ").slice(1).join(" ");
  assert.equal(decodeText(`Mme ${nomFictif} a signé.`, map).text, "Mme El Amrani a signé.");
});

test("société : la forme juridique et le mot générique restent, le nom change ; une ville est remplacée par une ville du même pays", () => {
  const book = newCodebook();
  codeFor(book, "societe", "Garage Lefèvre");
  codeFor(book, "societe", "SOPHATEL S.A");
  codeFor(book, "lieu", "Settat");
  codeFor(book, "lieu", "Poitiers");
  const r = rendreLisible("SOCIETE-001, SOCIETE-002, LIEU-001, LIEU-002", book);
  const [g, s, v1, v2] = book.entries.map((e) => e.pseudo);
  assert.match(g, /^Garage \p{Lu}/u);
  assert.ok(!g.includes("Lefèvre"));
  assert.match(s, /^[\p{Lu} \-]+ S\.A$/u, `majuscules conservées : ${s}`);
  const lex = JSON.parse(fs.readFileSync(new URL("../lexique/pseudonymes.json", import.meta.url), "utf8"));
  assert.ok(lex.villes.ma.moyenne.includes(v1), `Settat → ${v1} (ville marocaine moyenne attendue)`);
  assert.ok(lex.villes.fr.moyenne.includes(v2), `Poitiers → ${v2} (ville française moyenne attendue)`);
  assert.equal(r.rendus, 4);
});

test("les identifiants, adresses, références et éléments interdits ne sont jamais rendus", () => {
  const book = newCodebook();
  for (const [t, v] of [["email", "a@b.ma"], ["tel", "0661234567"], ["rib", "123456789012345678901234"], ["cin", "AB123456"], ["adresse", "12 rue des Lilas"], ["reference", "DOS-2024-17"], ["cat_interdit", "Projet Phénix"], ["cat_dossier", "Succession K"]]) codeFor(book, t, v);
  const codes = book.entries.map((e) => e.code).join(" ");
  const r = rendreLisible(codes, book);
  assert.equal(r.rendus, 0);
  assert.equal(r.text, codes);
  assert.ok(!PREFIXES_RENDUS.includes("EMAIL") && !PREFIXES_RENDUS.includes("INTERDIT"));
});

test("un pseudonyme n'est pas une donnée pour le verrou de sortie, mais la valeur réelle l'est toujours", async () => {
  const { guardText } = await import("../server/sortie.js");
  const book = newCodebook();
  const r = rendreLisible(coder(book, TEXTE), book);
  const g = guardText(r.text, { book });
  assert.equal(g.recoded, 0, "aucun pseudonyme recodé par le verrou de sortie");
  assert.equal(g.text, r.text);
  const fuite = guardText("Contacter Karim Benali et Atlas Négoce SARL AU.", { book });
  assert.ok(fuite.recoded >= 2);
  assert.match(fuite.text, /PRENOM-001 NOM-001/);
});

test("pseudonymFor : type non rendu → null, entrée déjà pseudonymisée → inchangée", () => {
  const book = newCodebook();
  codeFor(book, "email", "x@y.z");
  codeFor(book, "nom", "Benali");
  const ctx = contextFor(book, "");
  assert.equal(pseudonymFor(book, book.entries[0], ctx), null);
  const p = pseudonymFor(book, book.entries[1], ctx);
  assert.ok(p && p !== "Benali");
  assert.equal(pseudonymFor(book, book.entries[1], contextFor(book, "")), p);
});
