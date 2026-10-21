// ============================================================================
// TEST DE RÉIDENTIFICATION (v2.6) — « eux cachent les noms, nous cachons la
// personne ».
//
// Coder les noms ne suffit pas. « Le PDG d'une biotech lyonnaise, 47 ans, né
// le 12/04/1971 » ne contient aucun nom, et n'importe qui retrouve la
// personne : c'est la COMBINAISON d'indices anodins (lieu, date de naissance,
// âge, fonction rare) qui identifie. Ce module passe sur le texte CODÉ — ce
// que l'IA recevra — et compte ces indices, passage par passage.
//
// TROIS RÈGLES :
//   1. ON MESURE CE QUI SORT. Le test tourne après le verrou : un nom déjà
//      codé n'est plus un indice ; une ville restée en clair en est un.
//   2. UNE COMBINAISON, PAS UN MOT. Un lieu seul ne dit rien (« TJ de
//      Paris ») ; lieu + âge + fonction dans le même passage, si. Le niveau
//      vient du nombre d'indices DIFFÉRENTS réunis dans un passage (la date de
//      naissance compte double : c'est le quasi-identifiant le plus fort).
//   3. GÉNÉRALISER SANS DÉTRUIRE. L'option `generaliser` code les villes
//      (LIEU-001, décodées dans la réponse comme un nom), ramène une date de
//      naissance à sa décennie et un âge à sa tranche. Les autres dates
//      restent exactes : un délai de prescription se calcule au jour près.
//      Les fonctions sont signalées, jamais réécrites : « chirurgien » compte
//      pour une affaire de responsabilité médicale, c'est à l'avocat de juger.
// ============================================================================
import { fold, isKnownWord, CITY_WORDS, CODE_SRC } from "./verrou.js";
import { codeFor } from "./engine.js";

export const CATEGORIES = {
  lieu: "lieu (ville)",
  naissance: "date de naissance",
  date: "date précise",
  age: "âge",
  fonction: "fonction rare",
  nationalite: "nationalité",
};
const WEIGHT = { naissance: 2 };
export const LEVELS = ["anonyme", "devinable", "identifiable"];

/* Gentilés des villes que le verrou laisse lisibles : « une biotech
   lyonnaise » situe aussi bien que « à Lyon ». */
const DEMONYMS = new Set(`
parisien parisienne lyonnais lyonnaise marseillais marseillaise toulousain toulousaine nicois nicoise
nantais nantaise strasbourgeois strasbourgeoise montpellierain montpellieraine bordelais bordelaise lillois
lilloise rennais rennaise remois remoise grenoblois grenobloise toulonnais toulonnaise dijonnais dijonnaise
angevin angevine brestois brestoise nimois nimoise havrais havraise stephanois stephanoise clermontois
clermontoise casablancais casablancaise rbati rbatie marrakchi marrakchie fassi fassie tangerois tangeroise
agadirois agadiroise meknassi meknassie oujdi oujdie tetouanais tetouanaise kenitreen kenitreenne
bruxellois bruxelloise genevois genevoise lausannois lausannoise montrealais montrealaise londonien
londonienne madrilene
`.split(/\s+/).filter(Boolean).flatMap((w) => [w, w + "s"]));

/* Fonctions qui désignent presque une personne : il y a un maire par
   commune, quelques chirurgiens cardiaques par CHU. Les acteurs de la
   procédure (juge, procureur, greffier, notaire, huissier, avocat) n'y sont
   PAS : ils figurent dans toute pièce et ne désignent pas la partie. */
const FUNCTIONS = [
  "pdg", "p-dg", "president-directeur general", "presidente-directrice generale", "directeur general",
  "directrice generale", "ceo", "fondateur", "fondatrice", "cofondateur", "cofondatrice", "co-fondateur",
  "co-fondatrice", "maire", "adjoint au maire", "adjointe au maire", "depute", "deputee", "senateur", "senatrice",
  "ministre", "prefet", "prefete", "ambassadeur", "ambassadrice", "consul", "consule", "chirurgien",
  "chirurgienne", "recteur", "rectrice", "doyen", "doyenne", "imam", "eveque", "footballeur", "footballeuse",
  "joueur professionnel", "joueuse professionnelle", "entraineur", "entraineuse", "chanteur", "chanteuse",
  "acteur", "actrice", "journaliste", "influenceur", "influenceuse", "astronaute", "pilote de ligne",
  "champion", "championne", "caid", "wali", "gouverneur",
];
const FUNCTION_RX = new RegExp(`(?<![\\p{L}\\p{N}])(?:${FUNCTIONS.map((f) => f.replace(/[-]/g, "[- ]?")).join("|")})s?(?![\\p{L}\\p{N}])`, "gu");

const MONTHS = "janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre";
const DATE_NUM = "(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{4}|\\d{2})";
const DATE_TXT = `(?:1er|\\d{1,2})\\s+(?:${MONTHS})\\s+(\\d{4})`;
// Sur le texte REPLIÉ (sans accents, minuscules) : mêmes positions que l'original.
const DATE_RX = new RegExp(`(?<![\\p{N}/.-])(?:${DATE_NUM}|${DATE_TXT})(?![\\p{N}])`, "gu");
const BIRTH_BEFORE = /(?:\bnee?s?\s+(?:le|du)?\s*|naissance\s*(?:le|du)?\s*:?\s*)$/u;
const BIRTH_YEAR_RX = /(?<![\p{L}])(nee?s?)\s+en\s+(\d{4})(?![\p{N}])/gu;
const AGE_RX = /(?:agee?s?\s+de\s+|[,(]\s*)(\d{1,3})\s?ans(?![\p{L}])/gu;
const NATIONALITY_RX = /de\s+nationalite\s+(\p{L}+)/gu;
const WORD_RX = /\p{L}[\p{L}'’-]*/gu;
const PREPS = new Set(["a", "de", "d", "au", "en", "sur", "pres", "vers", "chez"]);
const TITLES = new Set(["m", "mme", "mlle", "me", "dr", "pr", "monsieur", "madame", "maitre"]);
/* Une ville de juridiction (« TJ de Paris », « juge aux affaires familiales
   de Casablanca ») situe le PROCÈS, pas la personne — et l'IA en a besoin
   pour savoir quel droit appliquer. Elle n'est ni un indice ni généralisée. */
const JURISDICTION = new Set(["tribunal", "tribunaux", "cour", "tj", "tgi", "tc", "ca", "prud'hommes", "prudhommes",
  "prud", "barreau", "parquet", "greffe", "juge", "juges", "juridiction", "cassation", "chambre", "conseil", "jaf",
  "batonnier", "procureur", "procureure", "notaire", "huissier"]);

const isCap = (w) => /^\p{Lu}/u.test(w);

/* Les indices d'un texte, avec leur position : [{ cat, start, end, value }]. */
export function findIndicators(input) {
  const text = String(input || "").normalize("NFC");
  const f = fold(text);
  if (f.length !== text.length) return [];   // repli non aligné (rare) : on ne devine pas
  const out = [];
  const add = (cat, start, end) => out.push({ cat, start, end, value: text.slice(start, end) });
  const codes = [];
  for (const m of text.matchAll(new RegExp(CODE_SRC, "gu"))) codes.push([m.index, m.index + m[0].length]);
  const inCode = (i) => codes.some(([a, b]) => i >= a && i < b);

  // Lieux : une ville avec majuscule ; si c'est aussi un mot (« Rennes »,
  // « Tours »), seulement après une préposition (« au CHU de Rennes »).
  const last = [];   // les cinq mots précédents, repliés
  for (const m of text.matchAll(WORD_RX)) {
    const w = m[0].replace(/['’]$/, ""), fw = fold(w), at = m.index;
    const prev = last[last.length - 1] || "", prev2 = last[last.length - 2] || "";
    if (!inCode(at) && !last.some((x) => JURISDICTION.has(x))) {
      if (DEMONYMS.has(fw)) add("lieu", at, at + w.length);
      else if (CITY_WORDS.has(fw) && isCap(w) && !TITLES.has(prev) &&
        (!isKnownWord(w) || PREPS.has(prev) || (prev === "la" && PREPS.has(prev2)))) add("lieu", at, at + w.length);
    }
    last.push(fold(m[0]).replace(/['’]$/, ""));
    if (last.length > 5) last.shift();
  }
  for (const m of f.matchAll(DATE_RX)) {
    if (inCode(m.index)) continue;
    const birth = BIRTH_BEFORE.test(f.slice(Math.max(0, m.index - 30), m.index));
    add(birth ? "naissance" : "date", m.index, m.index + m[0].length);
  }
  for (const m of f.matchAll(BIRTH_YEAR_RX)) add("naissance", m.index + m[0].length - m[2].length, m.index + m[0].length);
  for (const m of f.matchAll(AGE_RX)) add("age", m.index + m[0].indexOf(m[1]), m.index + m[0].length);
  for (const m of f.matchAll(FUNCTION_RX)) if (!inCode(m.index)) add("fonction", m.index, m.index + m[0].length);
  for (const m of f.matchAll(NATIONALITY_RX)) add("nationalite", m.index, m.index + m[0].length);
  return out.sort((a, b) => a.start - b.start);
}

/* Passages : paragraphes ; un paragraphe long est lu par groupes de trois
   phrases (un PDF extrait tient souvent en un seul bloc). */
function windows(text) {
  const out = [];
  const rx = /[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g;
  for (const p of text.matchAll(rx)) {
    if (p[0].length <= 600) { out.push([p.index, p.index + p[0].length]); continue; }
    const cuts = [p.index];
    for (const s of p[0].matchAll(/[.!?;](?=\s)/g)) cuts.push(p.index + s.index + 1);
    cuts.push(p.index + p[0].length);
    for (let i = 0; i < cuts.length - 1; i += 3) out.push([cuts[i], cuts[Math.min(i + 3, cuts.length - 1)]]);
  }
  return out;
}

const scoreOf = (cats) => [...cats].reduce((s, c) => s + (WEIGHT[c] || 1), 0);
const levelOf = (score) => (score >= 3 ? "identifiable" : score >= 2 ? "devinable" : "anonyme");

/* Le verdict : niveau du pire passage, indices par catégorie, et le nombre
   de passages à risque. Sur l'ensemble du texte, quatre indices différents
   rendent au moins « devinable » : une même personne est souvent décrite
   par morceaux, d'un paragraphe à l'autre. */
export function assessReidentification(input) {
  const text = String(input || "").normalize("NFC");
  const found = findIndicators(text);
  const indices = {};
  for (const x of found) (indices[x.cat] ||= new Set()).add(x.value.trim());
  let worst = 0, worstCats = [];
  const passages = { identifiable: 0, devinable: 0 };
  for (const [a, b] of windows(text)) {
    const cats = new Set(found.filter((x) => x.start >= a && x.start < b).map((x) => x.cat));
    const lvl = levelOf(scoreOf(cats));
    if (lvl !== "anonyme") passages[lvl]++;
    if (scoreOf(cats) > worst) { worst = scoreOf(cats); worstCats = [...cats]; }
  }
  let niveau = levelOf(worst);
  if (niveau === "anonyme" && scoreOf(new Set(Object.keys(indices))) >= 4) niveau = "devinable";
  return {
    niveau,
    indices: Object.fromEntries(Object.entries(indices).map(([k, v]) => [k, [...v]])),
    passages,
    pire: worstCats.map((c) => CATEGORIES[c]),
  };
}

function decade(yearStr) {
  let y = Number(yearStr);
  if (yearStr.length === 2) y += y > new Date().getFullYear() % 100 ? 1900 : 2000;
  return `${Math.floor(y / 10) * 10}`;
}

/* Généralise un texte codé (cf. règle 3). Mute `book` (les villes y entrent
   comme LIEU-NNN). Renvoie { text, changes: { lieu, naissance, age } }. */
export function generalize(input, book) {
  const text = String(input || "").normalize("NFC");
  const changes = { lieu: 0, naissance: 0, age: 0 };
  const edits = [];
  for (const x of findIndicators(text)) {
    if (x.cat === "lieu") {
      edits.push([x.start, x.end, codeFor(book, "lieu", x.value).code]);
      changes.lieu++;
    } else if (x.cat === "naissance") {
      const y = (x.value.match(/(\d{4}|\d{2})\s*$/) || [])[1];
      if (!y) continue;
      edits.push([x.start, x.end, `dans les années ${decade(y)}`]);
      changes.naissance++;
    } else if (x.cat === "age") {
      const n = Number((x.value.match(/\d+/) || [])[0]);
      const lo = Math.floor(n / 10) * 10;
      // « âgé de 47 ans » → « âgé de 40 à 49 ans » ; « , 38 ans, » → « , entre 30 et 39 ans, ».
      const afterDe = /\bde\s+$/i.test(text.slice(Math.max(0, x.start - 4), x.start));
      edits.push([x.start, x.end, afterDe ? `${lo} à ${lo + 9} ans` : `entre ${lo} et ${lo + 9} ans`]);
      changes.age++;
    }
  }
  let out = text;
  // De la fin vers le début : les positions restent justes.
  for (const [a, b, s] of edits.sort((p, q) => q[0] - p[0])) {
    // « né le 12/04/1971 » → « né dans les années 1970 » (pas « né le dans… »).
    let start = a;
    if (s.startsWith("dans les")) {
      const before = out.slice(Math.max(0, a - 6), a);
      const m = before.match(/\s(?:le|du|en)\s+$/i);
      if (m) start = a - m[0].length + 1;
    }
    out = out.slice(0, start) + s + out.slice(b);
  }
  return { text: out, changes };
}

/* Le bloc à joindre au plan ou au compte rendu d'anonymisation. */
export function describeReidentification(r, { generalized = null } = {}) {
  const icon = { anonyme: "🟢", devinable: "🟠", identifiable: "🔴" }[r.niveau];
  const head = {
    anonyme: "aucune combinaison d'indices ne désigne une personne.",
    devinable: "certains passages réunissent des indices qui, ensemble, laissent DEVINER une personne.",
    identifiable: "au moins un passage réunit assez d'indices pour IDENTIFIER une personne sans son nom.",
  }[r.niveau];
  const lines = [`${icon} TEST DE RÉIDENTIFICATION (ce que l'IA recevra) : ${r.niveau.toUpperCase()} — ${head}`];
  const list = Object.entries(r.indices).map(([k, v]) => `${CATEGORIES[k]} ×${v.length}`);
  if (list.length) lines.push(`Indices restés lisibles : ${list.join(", ")}.`);
  if (r.niveau !== "anonyme" && r.pire.length) lines.push(`Pire passage : ${r.pire.join(" + ")}.`);
  if (generalized) {
    const g = generalized;
    lines.push(`Généralisé : ${g.lieu} lieu(x) codé(s) (LIEU-…, décodés dans la réponse), ${g.naissance} date(s) de naissance ` +
      `ramenée(s) à la décennie, ${g.age} âge(s) ramené(s) à une tranche. Les autres dates restent exactes.`);
  } else if (r.niveau !== "anonyme") {
    lines.push("→ Propose à l'utilisateur de relancer avec generaliser: true (villes codées, naissance → décennie, âge → tranche). " +
      "Une fonction rare (« PDG », « chirurgien ») n'est jamais réécrite : s'il le souhaite, il l'ajoute à valeurs_a_coder.");
  }
  return lines.join("\n");
}
