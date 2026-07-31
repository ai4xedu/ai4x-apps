// ============================================================================
// OCR LOCAL — lecture des scans (images et PDF images), 100 % hors ligne.
//
// RÈGLE DE CONCEPTION (aussi importante que la RÈGLE N°1) :
// le texte reconnu par l'OCR N'ENTRE JAMAIS dans la conversation. Il est
// écrit sur le poste dans un fichier « À RELIRE », l'utilisateur le corrige,
// PUIS il passe par l'anonymisation normale. Pourquoi cette gymnastique :
//
//   1. Le texte brut d'un scan contient les vraies valeurs — le renvoyer au
//      modèle serait exactement la fuite qu'on prétend empêcher.
//   2. L'OCR se trompe. Constaté sur une facture de test propre : une ligne
//      entière du tableau perdue, « Hassan II » lu « Hassan Il ». Un
//      identifiant mal lu n'est plus reconnu par le dictionnaire → il
//      traverserait en clair pendant que le rapport annonce « rien détecté ».
//      Un OCR silencieux transformerait un refus honnête en fausse sécurité.
//
// D'où le triptyque : OCR → relecture humaine → anonymisation.
//
// Modèle de langue : tessdata/fra.traineddata, EMBARQUÉ dans l'extension.
// Aucun téléchargement au premier usage (ce serait une requête réseau, donc
// une trahison de la promesse « rien ne sort »).
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorker } from "tesseract.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const TESSDATA_DIR = path.join(here, "..", "tessdata");

export const IMAGE_RX = /\.(png|jpe?g|webp|bmp|tiff?)$/i;

/* Les formats d'image que Tesseract lit directement. */
export function isImageFile(name) {
  return IMAGE_RX.test(String(name));
}

/* ---------------------------------------------------------------- PDF ---- *
 * Extraction des images d'un PDF scanné. On vise le cas réel : un scanner   *
 * produit une page = une image JPEG (filtre DCTDecode), stockée telle       *
 * quelle dans le PDF. On récupère donc les octets du flux, qui FORMENT      *
 * déjà un JPEG valide — aucun décodage, aucune dépendance native, aucun     *
 * canvas (qui rendrait le bundle spécifique à une plateforme).              *
 *                                                                          *
 * Les autres compressions de scan (CCITT G4, JBIG2, JPX) ne sont pas        *
 * couvertes : on préfère le dire que rendre un texte vide.                  */
export function extractPdfJpegs(buffer, maxImages = 30) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const hay = buf.toString("latin1");
  const out = [];
  const objRx = /<<([^]*?)>>\s*stream\r?\n/g;
  let m;
  while ((m = objRx.exec(hay)) && out.length < maxImages) {
    const dict = m[1];
    if (!/\/Subtype\s*\/Image/.test(dict)) continue;
    if (!/\/DCTDecode/.test(dict)) continue;          // seul le JPEG est traité
    const start = objRx.lastIndex;
    const lenMatch = /\/Length\s+(\d+)/.exec(dict);
    let end;
    if (lenMatch) {
      end = start + parseInt(lenMatch[1], 10);
    } else {
      const idx = hay.indexOf("endstream", start);
      end = idx === -1 ? buf.length : idx;
    }
    const data = buf.subarray(start, Math.min(end, buf.length));
    // Un JPEG commence par FFD8 : garde-fou contre un /Length menteur.
    if (data.length > 1024 && data[0] === 0xff && data[1] === 0xd8) out.push(data);
  }
  return out;
}

/* --------------------------------------------------------------- OCR ----- */

/* Reconnaît le texte d'une ou plusieurs images. Renvoie
   { text, confidence, pages } — le TEXTE reste local, l'appelant ne doit
   jamais le renvoyer dans un résultat d'outil. */
export async function ocrImages(images, opts = {}) {
  if (!fs.existsSync(path.join(TESSDATA_DIR, "fra.traineddata"))) {
    throw new Error(
      "Modèle de langue OCR introuvable dans l'extension (tessdata/fra.traineddata). " +
      "Réinstalle le connecteur — le modèle est embarqué, il n'est jamais téléchargé."
    );
  }
  const worker = await createWorker("fra", 1, {
    langPath: TESSDATA_DIR,
    gzip: false,
    // Jamais dans le dossier de l'extension : une extension installée n'est
    // pas forcément inscriptible. Le cache est jetable, le temporaire suffit.
    cachePath: opts.cachePath || path.join(os.tmpdir(), "anonymiseur-ai4x-ocr"),
    logger: () => {},
  });
  const pages = [];
  try {
    for (const img of images) {
      const { data } = await worker.recognize(img);
      pages.push({ text: String(data.text || "").trim(), confidence: Number(data.confidence) || 0 });
    }
  } finally {
    await worker.terminate();
  }
  const confidences = pages.map((p) => p.confidence).filter((c) => c > 0);
  return {
    pages,
    text: pages.map((p, i) => (pages.length > 1 ? `----- Page ${i + 1} -----\n${p.text}` : p.text)).join("\n\n"),
    confidence: confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
  };
}

/* Signale à l'utilisateur ce qu'il doit regarder EN PRIORITÉ dans sa
   relecture, sans citer aucune valeur : les zones où l'OCR se trompe le
   plus (chiffres collés, l/I/1, O/0) et les lignes très courtes. */
export function reviewHints(text) {
  const lines = String(text).split(/\r?\n/);
  const hints = [];
  const digitRuns = (text.match(/\d[\d\s.\-]{8,}/g) || []).length;
  if (digitRuns) hints.push(`${digitRuns} suite(s) de chiffres (ICE, RIB, IF, téléphones) — à vérifier chiffre à chiffre`);
  const confusable = (text.match(/[A-Za-z][0O1lI][A-Za-z0-9]/g) || []).length;
  if (confusable) hints.push(`${confusable} endroit(s) où O/0 et l/I/1 se confondent`);
  const shorties = lines.filter((l) => l.trim().length > 0 && l.trim().length < 4).length;
  if (shorties) hints.push(`${shorties} ligne(s) très courte(s) — souvent des morceaux de tableau perdus`);
  return hints;
}
