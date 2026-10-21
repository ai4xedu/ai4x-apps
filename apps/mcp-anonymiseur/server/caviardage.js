// ============================================================================
// CAVIARDAGE DES IMAGES (v2.8) — des bandeaux noirs sur les captures et les
// scans, posés sur le poste.
//
// Les avocats collent des captures d'écran de contrats et des photos de
// pièces dans l'IA : le texte est pseudonymisé partout, l'IMAGE passait en
// clair. Ici, l'OCR local donne chaque mot et sa boîte ; le moteur et le
// verrou (les mêmes que pour un texte) décident ce qui est sensible ; les
// bandeaux sont GRAVÉS dans les pixels d'une nouvelle image PNG.
//
// TROIS RÈGLES :
//   1. GRAVÉ, PAS SUPERPOSÉ. Un rectangle noir posé par-dessus (SVG, PDF
//      annoté) laisse l'original dans le fichier : un copier-coller suffit à
//      le retrouver. Ici, les pixels sont remplacés et l'image réencodée (les
//      métadonnées EXIF, GPS compris, ne survivent pas au réencodage).
//   2. DANS LE DOUTE, ON NOIRCIT. Un mot que l'OCR lit mal n'est reconnu par
//      aucun dictionnaire : il traverserait. Un mot peu sûr qui n'est pas un
//      mot courant est donc caviardé d'office. Sur-caviarder est inoffensif.
//   3. L'ŒIL HUMAIN AVANT L'IA. L'OCR ne voit ni une signature, ni un tampon,
//      ni une écriture manuscrite, ni un visage. L'image caviardée est écrite
//      sur le poste ; elle n'est envoyée à l'IA qu'après que l'utilisateur
//      l'a regardée (outil caviarder_image, en deux temps).
// ============================================================================
import { PNG } from "pngjs";
import { strictCode, isKnownWord, fold, CODE_SRC } from "./verrou.js";
import { anonymizeText, PREFIX_LABEL } from "./engine.js";

export const LOW_CONFIDENCE = 60;
const PAD = 3;

const tokens = (s) => fold(s).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2 || /\d/.test(t));

/* Les boîtes à noircir sur une page. `lines` : sortie d'ocrWords. Le carnet
   `book` est une COPIE de la clé (probeBook) : une personne déjà connue d'un
   autre dossier est reconnue ici aussi, mais rien n'est écrit dans la clé.
   Renvoie { boxes, byType, illisibles, mots }. */
export function selectRedactions(lines, book, { extra = [], excludes = [] } = {}) {
  const valueOf = () => Object.fromEntries(book.entries.map((e) => [e.code, e.value]));
  const keep = new Set(excludes.flatMap(tokens));
  const boxes = [];
  const byType = {};
  let illisibles = 0, mots = 0;
  for (const words of lines) {
    if (!words.length) continue;
    const lineText = words.map((w) => w.text).join(" ");
    const base = anonymizeText(lineText, book, extra, { excludes });
    const coded = strictCode(base.text, { book, extra, excludes }).text;
    const values = valueOf();
    const hot = new Set();
    for (const m of coded.matchAll(new RegExp(CODE_SRC, "gu"))) {
      const v = values[m[0]];
      if (v === undefined) continue;
      const label = PREFIX_LABEL[m[0].split("-")[0]] || "Autre donnée sensible";
      byType[label] = (byType[label] || 0) + 1;
      for (const t of tokens(v)) hot.add(t);
    }
    for (const w of words) {
      mots++;
      const ts = tokens(w.text).filter((t) => !keep.has(t));
      if (!ts.length) continue;
      if (ts.some((t) => hot.has(t))) { boxes.push({ ...w.bbox, raison: "donnée" }); continue; }
      // Règle 2 : lu de travers et inconnu du dictionnaire → noirci.
      const letters = w.text.replace(/[^\p{L}\p{N}]/gu, "");
      if (w.conf < LOW_CONFIDENCE && letters.length >= 3 && !isKnownWord(letters)) {
        boxes.push({ ...w.bbox, raison: "illisible" });
        illisibles++;
      }
    }
  }
  return { boxes, byType, illisibles, mots };
}

/* Grave les boîtes dans l'image (PNG en entrée, PNG en sortie). */
export function burnBoxes(pngBuffer, boxes) {
  const img = PNG.sync.read(pngBuffer);
  const { width, height, data } = img;
  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor(b.x0) - PAD), y0 = Math.max(0, Math.floor(b.y0) - PAD);
    const x1 = Math.min(width, Math.ceil(b.x1) + PAD), y1 = Math.min(height, Math.ceil(b.y1) + PAD);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4;
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
      }
    }
  }
  return { png: PNG.sync.write(img), width, height };
}
