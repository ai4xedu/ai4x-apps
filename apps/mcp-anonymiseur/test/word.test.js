// WORD (.docx, v2.7) — la copie codée garde la mise en forme et ne garde
// RIEN d'autre : chasse aux fuites sur toutes les parties du paquet, puis
// aller-retour (decoder_word, deanonymiser format docx).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { XLSX } from "../server/engine.js";
import { codeDocx, decodeDocx, buildDocx, residue, docxParagraphs, zipParts } from "../server/word.js";
import { mint } from "./licence-test.mjs";
import { trappedDocx, trappedDocxParts, allPartsText, SECRETS_WORD } from "./util-docx.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "..", "server", "index.js");
const LICENCE = mint({ v: 1, org: "Cabinet Test", seats: 1, iat: "2026-10-20", exp: "9999-12-31", life: true });
const out = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
const lower = (s) => String(s).toLowerCase();

let workdir, client;

before(async () => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-word-"));
  fs.writeFileSync(path.join(workdir, "Conclusions Lahlou.docx"), trappedDocx(XLSX));
  fs.writeFileSync(path.join(workdir, "ancien.doc"), "binaire Word 97");
  // Un vrai .docx, écrit par LibreOffice depuis fixtures/piege-libreoffice.fodt
  // (soffice --headless --convert-to "docx:MS Word 2007 XML") : commentaire,
  // révisions, note, en-tête, image et zone de texte au format qu'écrit un
  // vrai traitement de texte. Vérifié aussi dans Microsoft Word (ouverture et
  // export PDF de la copie codée et de la copie décodée, 21/10/2026).
  fs.copyFileSync(path.join(here, "fixtures", "piege-libreoffice.docx"), path.join(workdir, "Assignation Bennani.docx"));
  client = new Client({ name: "word", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: LICENCE },
  }));
});

after(async () => {
  await client.close().catch(() => {});
  fs.rmSync(workdir, { recursive: true, force: true });
});

const call = async (name, args = {}) => out(await client.callTool({ name, arguments: args }));
const outdir = () => path.join(workdir, "Hidden-Tokens");

/* ----------------------------------------------------- unitaires ------ */

// Un « codage » de test : remplace une liste fixe de mots.
const FAKE = { Bennani: "NOM-001", Lahlou: "NOM-002", Karim: "PRENOM-001" };
const fakeCode = (t) => t.replace(/\b(Bennani|Lahlou|Karim)\b/g, (m) => FAKE[m]);

test("unitaire : un nom coupé entre deux runs est codé d'un bloc, la mise en forme du début du mot est gardée", () => {
  const { buf } = codeDocx(trappedDocx(XLSX), fakeCode, XLSX);
  const doc = allPartsText(buf, XLSX)["word/document.xml"];
  assert.match(doc, /<w:r><w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">NOM-001<\/w:t><\/w:r><w:r><w:t xml:space="preserve"><\/w:t><\/w:r>/,
    "le code prend le run gras de « Ben », le run « nani » est vidé");
  assert.match(doc, /<w:tab\/>/, "la tabulation reste à sa place");
  assert.match(doc, /<w:pStyle w:val="Titre1"\/>/, "les styles de paragraphe restent");
});

test("unitaire : métadonnées, commentaires, révisions, champs, liens, images, données cachées sont retirés", () => {
  const { buf, removed } = codeDocx(trappedDocx(XLSX), fakeCode, XLSX);
  const parts = allPartsText(buf, XLSX);
  const names = Object.keys(parts);
  for (const gone of ["word/comments.xml", "word/people.xml", "docProps/custom.xml", "docProps/thumbnail.jpeg", "customXml/item1.xml", "word/media/image1.png"]) {
    assert.ok(!names.includes(gone), `${gone} doit disparaître`);
  }
  const all = Object.values(parts).join("\n");
  assert.doesNotMatch(all, /Chraibi/, "le texte supprimé (suivi des modifications) disparaît");
  assert.doesNotMatch(all, /Tazi|saratazi/i, "auteurs et chemin du modèle disparaissent");
  assert.doesNotMatch(all, /mailto:/i, "cibles de liens et instructions de champ disparaissent");
  assert.doesNotMatch(all, /Signature de|descr=|<w:tag |<w:alias |dataBinding|docVar|attachedTemplate/);
  assert.match(parts["word/document.xml"], /Le demandeur sollicite le renvoi\./, "l'insertion est acceptée");
  assert.match(parts["word/document.xml"], /\[image retirée par Hidden Tokens\]/);
  assert.match(parts["word/document.xml"], /PRENOM-001 NOM-002/, "le texte de la zone de texte est codé, pas supprimé");
  assert.match(parts["docProps/core.xml"], /<dc:creator>Hidden Tokens<\/dc:creator>/);
  assert.doesNotMatch(parts["docProps/app.xml"], /Company|Manager/);
  assert.doesNotMatch(parts["[Content_Types].xml"], /comments|people|custom\.xml/);
  assert.doesNotMatch(parts["word/_rels/document.xml.rels"], /comments|people|image1|mailto|customXml/);
  assert.ok(removed.comments >= 1 && removed.revisions >= 2 && removed.images >= 1 && removed.links >= 1 && removed.fields >= 1);
});

test("unitaire : le filet final retrouve une valeur dans n'importe quelle partie (attributs compris)", () => {
  const buf = zipParts(trappedDocxParts(), XLSX);
  const has = (v) => (t) => new RegExp(`\\b${v}\\b`).test(t);
  assert.ok(residue(buf, has("Chraibi"), XLSX).includes("docProps/core.xml"));
  assert.ok(residue(buf, has("Lahlou"), XLSX).includes("word/settings.xml"), "w:val=\"Lahlou\" d'une variable du document");
  assert.deepEqual(residue(buf, has("Xyzzyx"), XLSX), []);
  assert.ok(residue(buf, has("Tazi"), XLSX).includes("word/document.xml"), "w:author");
});

test("unitaire : aller-retour — decodeDocx remet les vraies valeurs, même mise en forme", () => {
  const coded = codeDocx(trappedDocx(XLSX), fakeCode, XLSX).buf;
  const inv = Object.fromEntries(Object.entries(FAKE).map(([k, v]) => [v, k]));
  const decoded = decodeDocx(coded, (t) => {
    let replaced = 0;
    const text = t.replace(/\b(NOM-00[12]|PRENOM-001)\b/g, (m) => { replaced++; return inv[m]; });
    return { text, replaced };
  }, XLSX);
  assert.ok(decoded.replaced >= 6);
  const doc = allPartsText(decoded.buf, XLSX)["word/document.xml"];
  assert.match(doc, /<w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">Bennani<\/w:t>/);
  assert.ok(docxParagraphs(decoded.buf, XLSX).some((l) => l.includes("Cabinet Bennani & Associés")), "en-tête décodé");
});

test("unitaire : buildDocx rend titres, listes, gras et tableaux, dans un paquet Word valide", () => {
  const buf = buildDocx("# Synthèse\n\nLe client **NOM-001** conteste.\n\n- premier point\n- second *point*\n\n| Pièce | Date |\n|---|---|\n| Contrat | 2026-01-02 |", XLSX);
  const parts = allPartsText(buf, XLSX);
  for (const k of ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/_rels/document.xml.rels"]) assert.ok(parts[k], k);
  assert.ok(!Object.keys(parts).some((k) => /Sh33tJ5/.test(k)), "pas d'entrée parasite");
  const doc = parts["word/document.xml"];
  assert.match(doc, /<w:pStyle w:val="Titre1"\/><\/w:pPr><w:r><w:t xml:space="preserve">Synthèse/);
  assert.match(doc, /<w:b\/><\/w:rPr><w:t xml:space="preserve">NOM-001/);
  assert.match(doc, /• premier point/);
  assert.match(doc, /<w:tbl>[\s\S]*Contrat[\s\S]*<\/w:tbl>/);
  assert.doesNotMatch(doc, /\|---/);
});

/* ------------------------------------------------------------ E2E ----- */

test("E2E : lister_fichiers montre le .docx (nom masqué) ; un .doc reçoit le geste à faire", async () => {
  const list = await call("lister_fichiers");
  assert.match(list, /\[F-[A-Z2-7]{5}\] .*\.docx/);
  assert.doesNotMatch(list, /Lahlou/);
  const res = await call("anonymiser_fichier", { nom_fichier: "ancien.doc" });
  assert.match(res, /Enregistrer sous/);
});

test("E2E : plan puis copie codée — rien des valeurs dans la conversation, rien dans AUCUNE partie du .docx produit", async () => {
  const plan = await call("anonymiser_fichier", { nom_fichier: "Conclusions Lahlou.docx" });
  assert.match(plan, /PLAN D'ANONYMISATION — document Word/);
  assert.match(plan, /Retiré de la copie : métadonnées/);
  assert.match(plan, /🟢|🟠|🔴/u, "le test de réidentification (v2.6) s'applique aussi au Word");
  assert.ok(!fs.existsSync(outdir()) || !fs.readdirSync(outdir()).some((n) => n.endsWith(".docx")), "le plan n'écrit rien");

  const done = await call("anonymiser_fichier", { nom_fichier: "Conclusions Lahlou.docx", confirmer: true });
  assert.match(done, /Anonymisation terminée \(document Word\)/);
  for (const s of SECRETS_WORD) assert.ok(!lower(done).includes(lower(s)), `« ${s} » ne doit pas sortir dans la réponse`);
  assert.match(done, /PAR CES MOTIFS/, "le français juridique reste lisible");

  const docx = fs.readdirSync(outdir()).find((n) => /-anonymise\.docx$/.test(n));
  assert.ok(docx && !/Lahlou/.test(docx), "fichier produit au nom codé");
  const parts = allPartsText(fs.readFileSync(path.join(outdir(), docx)), XLSX);
  for (const [name, content] of Object.entries(parts)) {
    for (const s of SECRETS_WORD) assert.ok(!lower(content).includes(lower(s)), `« ${s} » trouvé dans ${name}`);
  }
  const md = fs.readFileSync(path.join(outdir(), docx.replace(/\.docx$/, ".md")), "utf8");
  for (const s of SECRETS_WORD) assert.ok(!lower(md).includes(lower(s)), `« ${s} » trouvé dans le .md`);
});

test("E2E : decoder_word remet les vraies valeurs dans la copie codée — sur le disque, jamais dans le chat", async () => {
  const list = await call("lister_fichiers");
  const handle = (list.match(/\[(F-[A-Z2-7]{5})\][^\n]*copie Word codée/) || [])[1];
  assert.ok(handle, "la copie codée est listée pour decoder_word");
  const res = await call("decoder_word", { nom_fichier: handle });
  assert.match(res, /code\(s\) remplacé\(s\) dans le document Word/);
  for (const s of SECRETS_WORD) assert.ok(!lower(res).includes(lower(s)));
  const f = fs.readdirSync(outdir()).find((n) => /-decode-.*\.docx$/.test(n));
  const paras = docxParagraphs(fs.readFileSync(path.join(outdir(), f)), XLSX).join("\n");
  assert.match(paras, /Maître Bennani représente M\. Karim Lahlou/);
  assert.match(paras, /Cabinet Bennani & Associés/);
  if (process.platform !== "win32") assert.equal(fs.statSync(path.join(outdir(), f)).mode & 0o777, 0o600);
});

test("E2E : deanonymiser format docx rend un document Word décodé", async () => {
  const done = await call("anonymiser_fichier", { nom_fichier: "Conclusions Lahlou.docx", confirmer: true });
  const code = (done.match(/\b(NOM-\d{3})\b/) || [])[1];
  const res = await call("deanonymiser", { contenu: `# Note\n\nLe dossier de **${code}** est complet.`, nom_sortie: "note", format: "docx" });
  assert.match(res, /code\(s\) remplacé\(s\)/);
  const f = fs.readdirSync(outdir()).find((n) => /^note-decode-.*\.docx$/.test(n));
  assert.ok(f, "un .docx est écrit");
  const paras = docxParagraphs(fs.readFileSync(path.join(outdir(), f)), XLSX);
  assert.equal(paras[0], "Note");
  assert.doesNotMatch(paras.join("\n"), /NOM-\d{3}/);
});

test("E2E : anonymiser_dossier traite aussi les .docx, une clé pour tout le lot", async () => {
  const plan = await call("anonymiser_dossier");
  assert.match(plan, /document Word, \d+ paragraphe\(s\)/);
  const done = await call("anonymiser_dossier", { confirmer: true });
  for (const s of SECRETS_WORD) assert.ok(!lower(done).includes(lower(s)));
});

test("E2E : un vrai .docx (LibreOffice) — chasse aux fuites sur tout le paquet, mise en page gardée", async () => {
  const done = await call("anonymiser_fichier", { nom_fichier: "Assignation Bennani.docx", confirmer: true });
  assert.match(done, /1 commentaire\(s\), 2 révision\(s\)/);
  for (const s of SECRETS_WORD) assert.ok(!lower(done).includes(lower(s)), `« ${s} » dans la réponse`);
  const f = fs.readdirSync(outdir()).find((n) => /^Assignation NOM-\d{3}-anonymise\.docx$/.test(n));
  assert.ok(f, "copie au nom codé");
  const parts = allPartsText(fs.readFileSync(path.join(outdir(), f)), XLSX);
  for (const [name, content] of Object.entries(parts)) {
    for (const s of [...SECRETS_WORD, "mailto"]) assert.ok(!lower(content).includes(lower(s)), `« ${s} » trouvé dans ${name}`);
  }
  for (const k of ["word/header1.xml", "word/footer1.xml", "word/footnotes.xml", "word/styles.xml", "word/numbering.xml"]) assert.ok(parts[k], `${k} gardé`);
  assert.ok(!parts["word/comments.xml"] && !parts["docProps/custom.xml"] && !Object.keys(parts).some((k) => k.startsWith("word/media/")));
  const paras = docxParagraphs(fs.readFileSync(path.join(outdir(), f)), XLSX).join("\n");
  assert.match(paras, /PAR CES MOTIFS, plaise au Tribunal de commerce de Casablanca/);
  assert.match(paras, /Le demandeur sollicite le renvoi\./);
});
