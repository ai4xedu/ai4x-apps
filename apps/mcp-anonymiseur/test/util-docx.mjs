// Fixtures Word écrites à la main (comme util-pdf.mjs pour les PDF) : un
// .docx PIÉGÉ, où les vraies valeurs se cachent partout où Word sait cacher
// quelque chose — runs coupés, en-tête, pied de page, note, zone de texte,
// texte alternatif, commentaire, révision supprimée, champ HYPERLINK, lien
// mailto, métadonnées, propriétés personnalisées, chemin du modèle,
// variables du document, données liées (customXml), miniature, auteurs.
import { zipParts } from "../server/word.js";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export const SECRETS_WORD = [
  "Bennani", "Lahlou", "Karim", "Chraibi", "Tazi", "Berrada", "Nadia",
  "0661234567", "karim.lahlou@gmail.com", "saratazi", "Orangers", "007780000123456789012345",
];

const p = (inner, ppr = "") => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${inner}</w:p>`;
const r = (t, rpr = "") => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ""}<w:t xml:space="preserve">${t}</w:t></w:r>`;

export function trappedDocxParts() {
  const body = [
    p(r("CONCLUSIONS", "<w:b/>"), '<w:pStyle w:val="Titre1"/>'),
    // « Bennani » coupé entre un run gras et un run normal.
    p(r("Maître ") + r("Ben", "<w:b/>") + r("nani") + r(" représente M. Karim Lahlou, demeurant 12 rue des Orangers, Casablanca.")),
    p(r("Tél.") + "<w:r><w:tab/></w:r>" + r("0661234567 — karim.lahlou@gmail.com")),
    p(`<w:hyperlink r:id="rIdMail"><w:r><w:t>écrire à Maître Bennani</w:t></w:r></w:hyperlink>`),
    p('<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> HYPERLINK "mailto:k.lahlou@x.ma" </w:instrText></w:r>' +
      '<w:r><w:fldChar w:fldCharType="separate"/></w:r>' + r("le lien") + '<w:r><w:fldChar w:fldCharType="end"/></w:r>'),
    p('<w:del w:id="1" w:author="Sara Tazi" w:date="2026-10-01T10:00:00Z"><w:r><w:delText>ancien client Omar Chraibi</w:delText></w:r></w:del>' +
      '<w:ins w:id="2" w:author="Sara Tazi" w:date="2026-10-01T10:00:00Z">' + r("Le demandeur sollicite le renvoi.") + "</w:ins>"),
    p('<w:commentRangeStart w:id="0"/>' + r("Le RIB figure en annexe.") + '<w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r>'),
    p('<w:r><w:drawing><wp:inline><wp:docPr id="1" name="Image 1" descr="Signature de Karim Lahlou"/>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
      '<pic:nvPicPr><pic:cNvPr id="1" name="sig.png" descr="Karim Lahlou"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="rIdImg"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'),
    p('<w:r><w:drawing><wp:anchor><wp:docPr id="2" name="Zone 1" title="Nadia Berrada"/><a:graphic><a:graphicData uri="x"><wps:wsp><wps:txbx><w:txbxContent>' +
      p(r("Client : Karim Lahlou")) + "</w:txbxContent></wps:txbx></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>" + r(" Pièce n° 3.")),
    p('<w:sdt><w:sdtPr><w:alias w:val="Nom du client"/><w:tag w:val="Lahlou"/><w:dataBinding w:xpath="/client/nom" w:storeItemID="{1}"/></w:sdtPr>' +
      `<w:sdtContent>${r("Karim Lahlou")}</w:sdtContent></w:sdt>`),
    p(r("PAR CES MOTIFS, plaise au Tribunal de commerce de Casablanca de faire droit à la demande.")),
  ].join("");

  return {
    "[Content_Types].xml": HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>' +
      '<Default Extension="jpeg" ContentType="image/jpeg"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' +
      '<Override PartName="/word/people.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.people+xml"/>' +
      '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
      '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
      '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>' +
      "</Types>",
    "_rels/.rels": HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>' +
      '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail" Target="docProps/thumbnail.jpeg"/>' +
      "</Relationships>",
    "word/_rels/document.xml.rels": HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      `<Relationship Id="rIdMail" Type="${REL}/hyperlink" Target="mailto:bennani@cabinet-bennani.ma" TargetMode="External"/>` +
      `<Relationship Id="rIdImg" Type="${REL}/image" Target="media/image1.png"/>` +
      `<Relationship Id="rIdCom" Type="${REL}/comments" Target="comments.xml"/>` +
      `<Relationship Id="rIdPeople" Type="http://schemas.microsoft.com/office/2011/relationships/people" Target="people.xml"/>` +
      `<Relationship Id="rIdH" Type="${REL}/header" Target="header1.xml"/>` +
      `<Relationship Id="rIdF" Type="${REL}/footer" Target="footer1.xml"/>` +
      `<Relationship Id="rIdFn" Type="${REL}/footnotes" Target="footnotes.xml"/>` +
      `<Relationship Id="rIdSet" Type="${REL}/settings" Target="settings.xml"/>` +
      `<Relationship Id="rIdCx" Type="${REL}/customXml" Target="../customXml/item1.xml"/>` +
      "</Relationships>",
    "word/_rels/settings.xml.rels": HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      `<Relationship Id="rIdTpl" Type="${REL}/attachedTemplate" Target="file:///Users/saratazi/Modeles/Bennani.dotx" TargetMode="External"/>` +
      "</Relationships>",
    "word/document.xml": HEAD + `<w:document ${W}><w:body>${body}` +
      '<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/></w:sectPr></w:body></w:document>',
    "word/header1.xml": HEAD + `<w:hdr ${W}>${p(r("Cabinet Bennani & Associés — Dossier Lahlou c/ Atlas Négoce"))}</w:hdr>`,
    "word/footer1.xml": HEAD + `<w:ftr ${W}>${p(r("RIB : 007780000123456789012345"))}</w:ftr>`,
    "word/footnotes.xml": HEAD + `<w:footnotes ${W}><w:footnote w:id="1">${p(r("Voir l'attestation de Mme Nadia Berrada."))}</w:footnote></w:footnotes>`,
    "word/comments.xml": HEAD + `<w:comments ${W}><w:comment w:id="0" w:author="Sara Tazi" w:initials="ST">${p(r("Vérifier le RIB de Lahlou"))}</w:comment></w:comments>`,
    "word/people.xml": HEAD + '<w15:people xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"><w15:person w15:author="Sara Tazi"/></w15:people>',
    "word/settings.xml": HEAD + `<w:settings ${W}><w:attachedTemplate r:id="rIdTpl"/>` +
      '<w:docVars><w:docVar w:name="client" w:val="Lahlou"/></w:docVars><w:defaultTabStop w:val="708"/></w:settings>',
    "word/media/image1.png": "PNG-FACTICE signature Karim Lahlou",
    "customXml/item1.xml": HEAD + "<client><nom>Karim Lahlou</nom></client>",
    "docProps/core.xml": HEAD + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Conclusions Lahlou</dc:title><dc:creator>Sara Tazi</dc:creator>' +
      "<cp:lastModifiedBy>Karim Lahlou</cp:lastModifiedBy><cp:keywords>Chraibi</cp:keywords></cp:coreProperties>",
    "docProps/app.xml": HEAD + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
      "<Application>Microsoft Office Word</Application><Company>Cabinet Bennani</Company><Manager>Nadia Berrada</Manager></Properties>",
    "docProps/custom.xml": HEAD + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">' +
      '<property name="Client"><vt:lpwstr xmlns:vt="x">Karim Lahlou</vt:lpwstr></property></Properties>',
    "docProps/thumbnail.jpeg": "JPEG-FACTICE premiere page Lahlou Bennani",
  };
}

export const trappedDocx = (XLSX) => zipParts(trappedDocxParts(), XLSX);

/* Toutes les entrées du paquet, en texte brut (binaire compris) : la chasse
   aux fuites ne fait confiance à aucune partie. */
export function allPartsText(buf, XLSX) {
  const cfb = XLSX.CFB.read(buf instanceof Uint8Array ? buf : new Uint8Array(buf), { type: "array" });
  const out = {};
  cfb.FullPaths.forEach((fp, i) => {
    const e = cfb.FileIndex[i];
    const name = fp.replace(/^Root Entry\//, "");
    // « \u0001Sh33tJ5 » : amorce ajoutée par le LECTEUR de SheetJS, absente du zip.
    if (e && e.type === 2 && e.content && name !== "\u0001Sh33tJ5") out[name] = Buffer.from(e.content).toString("utf8");
  });
  return out;
}
