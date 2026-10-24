// ============================================================================
// HT-BENCH — les chemins Word et Excel : le même document étiqueté, mis dans
// un .docx ou un .xlsx, puis la sortie *-anonymise.* relue et ramenée à un
// texte où les étendues retombent à leur place.
//
// Le principe : on découpe le texte d'origine en blocs (paragraphes, lignes
// de tableau, cellules) sans jamais couper une valeur étiquetée. Le texte
// « dérivé » est la suite des blocs : paragraphes Word joints par « \n »,
// cellules Excel par « \t » et lignes par « \n ». Les étendues y sont
// recalculées. On écrit le fichier à partir des blocs, le moteur le code, on
// relit la sortie dans le même ordre, et alignement.mjs compare les deux
// textes comme pour un .md.
//
//   docx           une ligne = un paragraphe ; une ligne « a | b | c » = une
//                  ligne de tableau Word. Un paragraphe arabe est marqué
//                  droite-à-gauche (w:bidi, w:rtl). Les runs sont coupés
//                  comme Word les coupe : libellé en gras, puis une coupure
//                  au hasard, parfois au milieu d'un mot ou d'une valeur.
//   xlsx-document  la mise en page d'un bulletin ou d'une fiche dans Excel :
//                  une ligne = une ligne de la feuille ; « Libellé : valeur »,
//                  « a | b », « a — b » = des cellules voisines.
//   xlsx-tableau   les documents « tableau » (lib/tableaux.mjs) tels quels.
// ============================================================================
import { escapeXml, zipParts } from "../../../server/word.js";
import { hasard } from "./hasard.mjs";

const ARABE = /[؀-ۿ]/;

/* Les coupures d'une ligne → ses cellules [début, fin) (positions du texte
   d'origine). Une coupure qui recouvre une étendue ou un leurre n'est pas
   faite : une valeur ne se retrouve jamais à cheval sur deux cellules. */
function cellules(texte, debut, fin, regles, protege) {
  const ligne = texte.slice(debut, fin);
  const coupes = [];
  for (const r of regles) {
    for (const m of ligne.matchAll(r.rx)) {
      const a = debut + m.index, b = a + m[0].length;
      if (protege(a, b) || coupes.some(([x, y]) => a < y && x < b)) continue;
      coupes.push([a, b]);
      if (r.une) break;
    }
  }
  coupes.sort((x, y) => x[0] - y[0]);
  const out = [];
  let p = debut;
  for (const [a, b] of coupes) { out.push([p, a]); p = b; }
  out.push([p, fin]);
  return out;
}

/* doc → { blocs, derive } : blocs = lignes de cellules (textes) ; derive =
   le document dérivé, cellules jointes par sep et lignes par « \n », chaque
   ligne complétée à largeur cellules (le quadrillage d'une feuille Excel),
   étendues et leurres recalculés. */
export function decouper(doc, regles, sep, largeur = 0) {
  const toutes = [...doc.etendues, ...doc.leurres];
  const protege = (a, b) => toutes.some((e) => a < e.fin && e.debut < b);
  const lignes = [];
  let p = 0;
  for (const l of doc.texte.split("\n")) {
    lignes.push(cellules(doc.texte, p, p + l.length, regles, protege));
    p += l.length + 1;
  }
  const n = largeur ? Math.max(...lignes.map((l) => l.length)) : 0;
  const vers = new Int32Array(doc.texte.length).fill(-1);
  let texte = "";
  lignes.forEach((cs, i) => {
    if (i) texte += "\n";
    cs.forEach(([a, b], j) => {
      if (j) texte += sep;
      for (let k = a; k < b; k++) vers[k] = texte.length + (k - a);
      texte += doc.texte.slice(a, b);
    });
    texte += sep.repeat(Math.max(0, n - cs.length));
  });
  const remap = (e) => {
    const d = vers[e.debut], f = vers[e.fin - 1];
    if (d < 0 || f - d !== e.fin - 1 - e.debut) throw new Error(`${doc.id} : la mise en forme coupe « ${e.valeur} »`);
    return { ...e, debut: d, fin: f + 1 };
  };
  const blocs = lignes.map((cs) => {
    const t = cs.map(([a, b]) => doc.texte.slice(a, b));
    return n ? [...t, ...Array(n - t.length).fill("")] : t;
  });
  return { blocs, derive: { ...doc, texte, etendues: doc.etendues.map(remap), leurres: doc.leurres.map(remap) } };
}

/* ------------------------------------------------------------- WORD ---- */
const REGLES_DOCX = [{ rx: / \| /g }];

function runs(texte, h) {
  const rtl = ARABE.test(texte);
  const rpr = (gras) => (gras || rtl ? `<w:rPr>${gras ? "<w:b/>" : ""}${rtl ? "<w:rtl/>" : ""}</w:rPr>` : "");
  const run = (t, gras = false) => (t ? `<w:r>${rpr(gras)}<w:t xml:space="preserve">${escapeXml(t)}</w:t></w:r>` : "");
  const m = texte.match(/^([^:\n]{1,40}:)(.*)$/s);
  const [libelle, reste] = m ? [m[1], m[2]] : ["", texte];
  // Word coupe les runs n'importe où (correcteur, révision, mise en forme) :
  // une fois sur deux, une coupure au hasard dans le reste, et parfois une
  // marque du correcteur orthographique entre les deux morceaux.
  let corps = run(reste);
  if (reste.length > 3 && h.pile(0.5)) {
    const k = h.entier(1, reste.length - 1);
    corps = run(reste.slice(0, k)) + (h.pile(0.3) ? '<w:proofErr w:type="spellStart"/>' : "") + run(reste.slice(k));
  }
  return run(libelle, true) + corps;
}

const paragraphe = (texte, h) => `<w:p>${ARABE.test(texte) ? "<w:pPr><w:bidi/></w:pPr>" : ""}${runs(texte, h)}</w:p>`;

function corpsDocx(blocs, h) {
  const out = [];
  for (let i = 0; i < blocs.length; i++) {
    if (blocs[i].length === 1) { out.push(paragraphe(blocs[i][0], h)); continue; }
    // Lignes à plusieurs cellules qui se suivent : un tableau.
    // Chaque rang garde son nombre de cellules (Word l'accepte) : le dérivé
    // suit les paragraphes un à un.
    const rangs = [];
    while (i < blocs.length && blocs[i].length > 1) rangs.push(blocs[i++]);
    i--;
    const n = Math.max(...rangs.map((r) => r.length));
    out.push(`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid>${"<w:gridCol/>".repeat(n)}</w:tblGrid>` +
      rangs.map((r) => `<w:tr>${r.map((x) => `<w:tc>${paragraphe(x, h)}</w:tc>`).join("")}</w:tr>`).join("") +
      "</w:tbl>");
  }
  return out.join("");
}

const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/* doc → { buf, derive } : le .docx et le document dérivé (un paragraphe
   par ligne, une cellule de tableau par paragraphe). */
export function versDocx(doc, XLSX) {
  const { blocs, derive } = decouper(doc, REGLES_DOCX, "\n");
  const h = hasard(`docx/${doc.id}`);
  const buf = zipParts({
    "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      "</Types>",
    "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>",
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="${NS_W}"><w:body>${corpsDocx(blocs, h)}` +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>',
  }, XLSX);
  return { buf, derive };
}

/* ------------------------------------------------------------ EXCEL ---- */
// « Libellé : valeur » (la première, en début de ligne), « a | b », « a — b ».
const REGLES_XLSX_DOCUMENT = [
  { rx: /(?<=^[^:\n]{1,45}:) +/g, une: true },
  { rx: / \| /g },
  { rx: / — /g },
];

/* Les cellules d'une feuille → le texte dérivé (cellules par « \t », lignes
   par « \n »), dans l'ordre du quadrillage d'origine. */
export function texteFeuille(ws, XLSX, nl, nc) {
  const lignes = [];
  for (let r = 0; r < nl; r++) {
    const l = [];
    for (let c = 0; c < nc; c++) {
      const x = ws[XLSX.utils.encode_cell({ r, c })];
      l.push(x && x.v !== undefined && x.v !== null ? String(x.v) : "");
    }
    lignes.push(l.join("\t"));
  }
  return lignes.join("\n");
}

/* doc → { buf, derive, nl, nc } : le classeur (une feuille) et le document
   dérivé. mode « document » : le texte mis en cellules ; « tableau » : un
   document « tableau », déjà en lignes et cellules. */
export function versXlsx(doc, XLSX, mode) {
  const { blocs, derive } = decouper(doc, mode === "tableau" ? [{ rx: /\t/g }] : REGLES_XLSX_DOCUMENT, "\t", true);
  // Un export de tableur : une cellule de chiffres sans zéro en tête est un
  // nombre (mode tableau seulement ; une fiche mise en page reste du texte).
  const aoa = blocs.map((l) => l.map((v) => (mode === "tableau" && /^[1-9]\d{0,14}$/.test(v) ? Number(v) : v)));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Feuil1");
  return { buf: XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), derive, nl: aoa.length, nc: aoa[0].length };
}
