// Générateur de PDF MINIMAL pour les tests — une page, texte Helvetica.
// Pourquoi à la main : pas de dépendance de génération (Chrome n'est pas
// garanti en CI, et un pdfkit pèserait dans le bundle). Un PDF 1.4 valide se
// construit en ~40 lignes tant qu'on reste en ASCII (Tj + WinAnsi).
import fs from "node:fs";

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

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

/* Une facture fournisseur en PDF, ASCII volontaire (WinAnsi + Tj). */
export const FACTURE_PDF_LIGNES = [
  "FACTURE  N. FAC-2026-100",
  "Date : 22/07/2026",
  "",
  "EMETTEUR",
  "OUKAIMEDEN SERVICES SARL",
  "ICE : 007788990000044",
  "IF : 40123456   |   RC : 118822",
  "",
  "CLIENT",
  "Menara Distribution S.A",
  "ICE : 001510119000058",
  "",
  "Designation                      Qte     Montant HT",
  "Maintenance parc informatique      1        6 000,00",
  "",
  "Total HT  : 6 000,00",
  "TVA (20%) : 1 200,00",
  "TOTAL TTC : 7 200,00 DH",
];
