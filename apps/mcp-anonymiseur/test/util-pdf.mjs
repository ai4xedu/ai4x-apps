// Générateur de PDF MINIMAL pour les tests — une page, texte Helvetica.
// Pourquoi à la main : pas de dépendance de génération (pdfkit pèserait dans
// le bundle .mcpb, Chrome n'est pas garanti en CI). Un PDF 1.4 valide se
// construit en ~40 lignes tant qu'on reste en ASCII (Tj + WinAnsi).
import fs from "node:fs";

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/* Écrit un PDF d'une page contenant `lines` (une ligne de texte par entrée). */
export function writeMinimalPdf(filePath, lines) {
  const content = [
    "BT", "/F1 11 Tf", "50 780 Td", "13 TL",
    ...lines.map((l, i) => (i === 0 ? `(${esc(l)}) Tj` : `T* (${esc(l)}) Tj`)),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += String(off).padStart(10, "0") + " 00000 n \n";
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(filePath, pdf, "binary");
  return filePath;
}

/* Une facture fournisseur type (ASCII volontaire — le moteur normalise les
   accents de toute façon, et WinAnsi + Tj restent triviaux en ASCII). */
export const FACTURE_PDF_LINES = [
  "FACTURE  N. FAC-2026-042",
  "Date : 2026-07-28    Echeance : 2026-08-28",
  "",
  "EMETTEUR",
  "ATLAS NEGOCE",
  "12 Rue des Oudayas, Res. Yasmine, Maarif",
  "ICE : 003463957000076",
  "IF : 65908714   |   RC : 620437 (Casablanca)",
  "Patente : 35788345   |   Tel : +212 6 61 23 45 67",
  "",
  "CLIENT",
  "Menara Distribution S.A",
  "ICE : 001510119000058",
  "",
  "Designation                     Qte     Montant HT",
  "Prestation de conseil juillet    1        8500",
  "Formation equipe (2 jours)       1       12000",
  "",
  "Total HT : 20500",
  "TVA (20%) : 4100",
  "TOTAL TTC : 24600",
  "",
  "Reglement par virement - RIB : 007810000123456789012345",
];

/* Écrit un PDF « scanné » : une page = une image JPEG (DCTDecode), sans
   aucune couche de texte. C'est exactement ce que produit un scanner. */
export function writeScannedPdf(filePath, jpegBuffer, width, height) {
  const head = Buffer.from(
    "%PDF-1.4\n" +
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>\nendobj\n`,
    "binary"
  );
  const content = "q 595 0 0 842 0 0 cm /Im0 Do Q";
  const obj4 = Buffer.from(`4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`, "binary");
  const obj5head = Buffer.from(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuffer.length} >>\nstream\n`,
    "binary"
  );
  const obj5tail = Buffer.from("\nendstream\nendobj\n", "binary");
  const body = Buffer.concat([head, obj4, obj5head, jpegBuffer, obj5tail]);
  const trailer = Buffer.from(
    `trailer\n<< /Size 6 /Root 1 0 R >>\n%%EOF\n`, "binary"
  );
  fs.writeFileSync(filePath, Buffer.concat([body, trailer]));
  return filePath;
}
