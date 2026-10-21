// ============================================================================
// WORD (.docx) — v2.7. Le format n° 1 d'un avocat : conclusions, contrats,
// assignations, courriers. Trois gestes :
//
//   1. codeDocx    — une COPIE CODÉE du .docx, mise en forme conservée : le
//                    texte de chaque paragraphe (corps, en-têtes, pieds de
//                    page, notes, zones de texte) passe par le même codage que
//                    le PDF (moteur + verrou), puis est remis run par run.
//   2. decodeDocx  — l'inverse, sur le poste : les codes d'un .docx (la copie
//                    codée retravaillée, ou un .docx produit par l'IA)
//                    redeviennent les vraies valeurs, mise en forme conservée.
//   3. buildDocx   — un .docx neuf à partir du texte de l'IA (titres, listes,
//                    gras/italique, tableaux) : le rendu de deanonymiser.
//
// Un .docx est un dossier de fichiers XML compressé ; il cache des données
// ailleurs que dans le texte visible. La copie codée les RETIRE, toutes :
//   - métadonnées (auteur, « modifié par », société, titre, mots-clés),
//     propriétés personnalisées, miniature de la première page ;
//   - commentaires et leurs auteurs ; suivi des modifications (le texte
//     supprimé disparaît, le texte inséré est accepté) ;
//   - champs (HYPERLINK "mailto:…", REF, MERGEFIELD) et liens : le texte
//     affiché reste, l'instruction et la cible partent ;
//   - images, objets incorporés, données liées (customXml), variables du
//     document, chemin du modèle (qui contient souvent un nom d'utilisateur),
//     blocs de construction (glossary), macros.
// Et un contrôle final FAIL-CLOSED (residue) : si une valeur connue de la clé
// apparaît encore quelque part dans le paquet, la copie n'est pas écrite.
//
// Le module ne connaît ni la clé ni le verrou : index.js lui passe une
// fonction code(texte) / decode(texte). Le zip passe par XLSX.CFB (déjà
// embarqué avec SheetJS) : aucune dépendance de plus.
// ============================================================================

const dec = new TextDecoder("utf-8");
const enc = new TextEncoder();

export const unescapeXml = (s) => String(s)
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, "&");
export const escapeXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ------------------------------------------------------------ zip ------ */

function openZip(buf, XLSX) {
  const cfb = XLSX.CFB.read(buf instanceof Uint8Array ? buf : new Uint8Array(buf), { type: "array" });
  const names = () => cfb.FullPaths
    .map((p, i) => ({ p: p.replace(/^Root Entry\//, ""), e: cfb.FileIndex[i] }))
    .filter((x) => x.e && x.e.type === 2 && x.p !== "\u0001Sh33tJ5")
    .map((x) => x.p);
  const entry = (p) => XLSX.CFB.find(cfb, `/${p}`);
  const get = (p) => {
    const e = entry(p);
    return e && e.content ? dec.decode(e.content instanceof Uint8Array ? e.content : Uint8Array.from(e.content)) : null;
  };
  const put = (p, s) => { const e = entry(p); if (e) e.content = enc.encode(s); };
  const del = (p) => { if (entry(p)) XLSX.CFB.utils.cfb_del(cfb, `/${p}`); };
  const write = () => {
    const out = XLSX.CFB.write(cfb, { type: "array", fileType: "zip" });
    return out instanceof Uint8Array ? out : Uint8Array.from(out);
  };
  return { cfb, names, get, put, del, write };
}

/* Un paquet neuf à partir de { chemin: texte }. */
export function zipParts(parts, XLSX) {
  const cfb = XLSX.CFB.utils.cfb_new();
  for (const [p, s] of Object.entries(parts)) XLSX.CFB.utils.cfb_add(cfb, `/${p}`, enc.encode(s));
  // (cfb_new crée une entrée amorce « \u0001Sh33tJ5 » : l'écriture en zip
  // l'ignore, elle ne finit jamais dans le .docx.)
  const out = XLSX.CFB.write(cfb, { type: "array", fileType: "zip" });
  return out instanceof Uint8Array ? out : Uint8Array.from(out);
}

export function isDocx(buf, XLSX) {
  try { return !!openZip(buf, XLSX).get("word/document.xml"); } catch { return false; }
}

/* ------------------------------------------------------------ XML ------ *
 * Un tokenizer minimal, suffisant pour WordprocessingML : balises, texte,
 * commentaires, instructions. Il garde le texte brut de chaque jeton, donc
 * on réécrit le fichier en ne touchant QUE ce qu'on a décidé de toucher. */

const TOKEN_RX = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/?[^>]+>|[^<]+/g;

function tokenize(xml) {
  const out = [];
  for (const m of String(xml).matchAll(TOKEN_RX)) {
    const raw = m[0];
    if (raw[0] !== "<") { out.push({ t: "text", raw }); continue; }
    if (/^<[!?]/.test(raw)) { out.push({ t: "other", raw }); continue; }
    const name = (raw.match(/^<\/?([^\s/>]+)/) || [])[1] || "";
    if (raw[1] === "/") out.push({ t: "close", name, raw });
    else if (/\/>$/.test(raw)) out.push({ t: "self", name, raw });
    else out.push({ t: "open", name, raw });
  }
  return out;
}

const join = (tokens) => tokens.map((x) => x.raw).join("");

/* Retire (drop) ou déballe (unwrap : on garde le contenu, pas la balise) des
   éléments ; remplace (replace) un élément entier par un fragment XML.
   decide(token, ancestors, indice, jetons) → "drop" | "unwrap" | { replace: xml } | null. */
function transform(tokens, decide) {
  const out = [];
  const stack = [];   // { name, action }
  let dropDepth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (dropDepth) {
      if (tk.t === "open") dropDepth++;
      else if (tk.t === "close") dropDepth--;
      continue;
    }
    if (tk.t === "open" || tk.t === "self") {
      const d = decide(tk, stack, i, tokens);
      const replaced = d !== null && typeof d === "object";
      if (d === "drop" || replaced) {
        if (replaced && d.replace) out.push({ t: "other", raw: d.replace });
        if (tk.t === "open") dropDepth = 1;
        continue;
      }
      if (tk.t === "open") stack.push({ name: tk.name, action: d });
      if (d !== "unwrap") out.push(tk);
      continue;
    }
    if (tk.t === "close") {
      const top = stack.pop();
      if (top && top.action === "unwrap") continue;
      out.push(tk);
      continue;
    }
    out.push(tk);
  }
  return out;
}

/* Le sous-arbre d'un élément ouvert à l'indice i (pour savoir si un dessin
   contient une image, une zone de texte…). */
function subtree(tokens, i) {
  if (tokens[i].t === "self") return [tokens[i]];
  let depth = 0;
  for (let j = i; j < tokens.length; j++) {
    if (tokens[j].t === "open") depth++;
    else if (tokens[j].t === "close" && --depth === 0) return tokens.slice(i, j + 1);
  }
  return tokens.slice(i);
}

/* ------------------------------------------------------- paragraphes --- *
 * Un paragraphe Word (w:p) est fait de runs (w:r) qui portent la mise en
 * forme, et le texte d'un même mot peut être coupé entre deux runs (« Ben »
 * en gras + « ali »). On travaille donc sur le TEXTE DU PARAGRAPHE, puis on
 * redistribue le résultat sur les segments d'origine. Les paragraphes
 * imbriqués (zone de texte dans un dessin) sont des paragraphes à part. */

function collectParagraphs(tokens) {
  const paras = [];
  const pstack = [];
  const estack = [];
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    const parent = estack[estack.length - 1];
    if (tk.t === "open") {
      if (tk.name === "w:p") { const p = { segs: [] }; paras.push(p); pstack.push(p); }
      estack.push(tk.name);
      if (tk.name === "w:t") tk.wt = true;
      continue;
    }
    if (tk.t === "close") {
      estack.pop();
      if (tk.name === "w:p") pstack.pop();
      continue;
    }
    const para = pstack[pstack.length - 1];
    if (!para) continue;
    if (tk.t === "text" && parent === "w:t") {
      para.segs.push({ i, text: unescapeXml(tk.raw), open: i - 1 });
    } else if (tk.t === "self" && parent === "w:r") {
      if (tk.name === "w:tab") para.segs.push({ fixed: true, text: "\t" });
      else if (tk.name === "w:br" || tk.name === "w:cr") para.segs.push({ fixed: true, text: " " });
      else if (tk.name === "w:noBreakHyphen") para.segs.push({ fixed: true, text: "-" });
    }
  }
  for (const p of paras) {
    let at = 0;
    for (const s of p.segs) { s.start = at; at += s.text.length; s.end = at; }
    p.text = p.segs.map((s) => s.text).join("");
  }
  return paras;
}

const WORD_RX = /[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu;
const MAX_DIFF_CELLS = 40e6;

/* Aligne le texte d'origine et le texte transformé (codé ou décodé) par
   plus longue sous-suite commune de mots ; renvoie les zones remplacées en
   positions de caractères de l'ORIGINAL. null si le paragraphe est trop long
   pour un alignement fin (on se rabat alors sur un seul segment). */
function diffRegions(a, b) {
  const A = a.match(WORD_RX) || [], B = b.match(WORD_RX) || [];
  const n = A.length, m = B.length;
  if ((n + 1) * (m + 1) > MAX_DIFF_CELLS) return null;
  const L = new Uint32Array((n + 1) * (m + 1));
  const W = m + 1;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i * W + j] = A[i] === B[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
    }
  }
  const offA = [0];
  for (const t of A) offA.push(offA[offA.length - 1] + t.length);
  const regions = [];
  let i = 0, j = 0, ri = -1, rj = -1;
  const flush = () => {
    if (ri < 0) return;
    regions.push({ start: offA[ri], end: offA[i], text: B.slice(rj, j).join("") });
    ri = rj = -1;
  };
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { flush(); i++; j++; continue; }
    if (ri < 0) { ri = i; rj = j; }
    if (j < m && (i >= n || L[i * W + j + 1] >= L[(i + 1) * W + j])) j++;
    else i++;
  }
  flush();
  return regions;
}

/* Nouveaux textes des segments d'un paragraphe, d'après les zones remplacées. */
function redistribute(para, newText) {
  const texts = para.segs.map((s) => (s.fixed ? null : ""));
  const textSegs = para.segs.map((s, k) => ({ s, k })).filter((x) => !x.s.fixed);
  if (!textSegs.length) return texts;
  const regions = diffRegions(para.text, newText);
  if (!regions) {
    // Paragraphe démesuré : tout le texte dans le premier segment, sans les
    // tabulations et sauts (ils restent à leur place).
    texts[textSegs[0].k] = newText.replace(/[\t]/g, " ");
    return texts;
  }
  const segAt = (pos) => {
    let best = textSegs[0];
    for (const x of textSegs) { if (x.s.start <= pos) best = x; else break; }
    return best;
  };
  const copy = (a, b) => {
    for (const x of textSegs) {
      const lo = Math.max(a, x.s.start), hi = Math.min(b, x.s.end);
      if (lo < hi) texts[x.k] += x.s.text.slice(lo - x.s.start, hi - x.s.start);
    }
  };
  let at = 0;
  for (const r of regions) {
    copy(at, r.start);
    // Une zone remplacée va dans le segment où elle commence — le mot codé
    // prend la mise en forme du début du mot d'origine. Les blancs qui
    // tombaient sur une tabulation ou un saut (gardés à part) sont retirés.
    const host = r.start < r.end ? segAt(r.start) : segAt(Math.max(0, r.start - 1));
    texts[host.k] += r.text.replace(/\t/g, "");
    at = r.end;
  }
  copy(at, para.text.length);
  return texts;
}

/* Applique une transformation de texte à tous les paragraphes d'un ensemble
   de parties XML. Le texte de TOUTES les parties est traité d'un seul tenant
   (une ligne par paragraphe) : le codage voit le document entier — un nom
   codé une fois est reconnu partout — puis on redécoupe. */
function mapParagraphs(parts, fn) {
  const all = [];
  for (const part of parts) {
    part.paras = collectParagraphs(part.tokens);
    all.push(...part.paras);
  }
  const SEP = "\n";
  const source = all.map((p) => p.text.replace(/\n/g, " "));
  const whole = fn(source.join(SEP));
  let lines = whole.split(SEP);
  if (lines.length !== all.length) lines = source.map((s) => (s.trim() ? fn(s) : s));
  all.forEach((p, k) => {
    if (lines[k] === p.text) return;
    const texts = redistribute(p, lines[k]);
    p.segs.forEach((s, j) => {
      if (s.fixed) return;
      const part = parts.find((x) => x.paras.includes(p));
      part.tokens[s.i].raw = escapeXml(texts[j]);
      const open = part.tokens[s.open];
      if (open && open.wt && !/xml:space=/.test(open.raw)) open.raw = open.raw.replace(/^<w:t\b/, '<w:t xml:space="preserve"');
    });
  });
  return lines;
}

/* --------------------------------------------------------- nettoyage --- */

const STORY_RX = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;
const DROP_ELEMENTS = new Set([
  // suivi des modifications : le texte supprimé part, les traces d'auteur aussi
  "w:del", "w:moveFrom", "w:rPrChange", "w:pPrChange", "w:sectPrChange", "w:tblPrChange", "w:tcPrChange",
  "w:trPrChange", "w:tblGridChange", "w:numberingChange", "w:tblPrExChange",
  "w:moveFromRangeStart", "w:moveFromRangeEnd", "w:moveToRangeStart", "w:moveToRangeEnd",
  "w:customXmlInsRangeStart", "w:customXmlInsRangeEnd", "w:customXmlDelRangeStart", "w:customXmlDelRangeEnd",
  // commentaires
  "w:commentRangeStart", "w:commentRangeEnd", "w:commentReference",
  // champs : l'instruction part, le résultat affiché reste
  "w:instrText", "w:delInstrText", "w:fldChar",
  // objets incorporés, données liées, étiquettes des contrôles de contenu
  "w:object", "w:altChunk", "w:dataBinding", "w:alias", "w:tag", "w:placeholder",
  "w:permStart", "w:permEnd",
]);
const UNWRAP_ELEMENTS = new Set(["w:ins", "w:moveTo", "w:hyperlink", "w:fldSimple", "w:smartTag", "w:customXml"]);
const IMAGE_NOTE = '<w:t xml:space="preserve">[image retirée par Nanomizer]</w:t>';
const PERSONAL_ATTR_RX = /\s(?:w:author|w:initials|w15:userId|w15:providerId|w:date)="[^"]*"/g;

function sanitizeStory(tokens, removed) {
  return transform(tokens, (tk, stack, i) => {
    const name = tk.name;
    if (DROP_ELEMENTS.has(name)) {
      if (name === "w:del" || name === "w:moveFrom") removed.revisions++;
      if (name === "w:commentReference") removed.comments++;
      if (name === "w:instrText" || name === "w:fldChar") removed.fields++;
      if (name === "w:object" || name === "w:altChunk") removed.objects++;
      return "drop";
    }
    if (UNWRAP_ELEMENTS.has(name)) {
      if (name === "w:hyperlink" || name === "w:fldSimple") removed.links++;
      if (name === "w:ins" || name === "w:moveTo") removed.revisions++;
      return "unwrap";
    }
    if ((name === "w:drawing" || name === "w:pict") && tk.t === "open") {
      const raw = join(subtree(tokens, i));
      const hasText = /<w:txbxContent\b/.test(raw);
      if (!hasText) { removed.images++; return { replace: IMAGE_NOTE }; }
    }
    tk.raw = tk.raw.replace(PERSONAL_ATTR_RX, "");
    // Texte alternatif et titre d'un dessin gardé (zone de texte).
    if (/^(wp:docPr|pic:cNvPr|v:shape|v:imagedata)$/.test(name)) {
      tk.raw = tk.raw.replace(/\s(descr|title|alt|o:title)="[^"]*"/g, "");
    }
    // Images DANS une zone de texte gardée : retirées aussi (le dessin, lui,
    // reste : il porte le texte).
    if (name === "a:blip" || name === "v:imagedata") { removed.images++; return "drop"; }
    return null;
  });
}

const CORE_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
  'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
  'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
  "<dc:creator>Nanomizer</dc:creator><cp:lastModifiedBy>Nanomizer</cp:lastModifiedBy></cp:coreProperties>";

/* Retire du paquet les parties qui ne portent que des données à risque, et
   les relations / types de contenu qui les désignaient. */
function prunePackage(z, removed) {
  const gone = new Set();
  for (const p of z.names()) {
    if (/^word\/(comments|commentsExtended|commentsIds|commentsExtensible|people)\.xml$/.test(p)) { if (/comments\.xml$/.test(p)) removed.commentParts++; gone.add(p); }
    else if (/^docProps\/(custom\.xml|thumbnail\.[a-z]+)$/i.test(p)) { removed.metadata++; gone.add(p); }
    else if (/^customXml\//.test(p)) gone.add(p);
    else if (/^word\/(glossary\/|embeddings\/|vbaProject|vbaData|activeX\/)/.test(p)) gone.add(p);
  }
  for (const p of gone) z.del(p);
  // Métadonnées : un cœur neutre ; app.xml sans société ni responsable.
  if (z.get("docProps/core.xml") != null) { z.put("docProps/core.xml", CORE_XML); removed.metadata++; }
  const app = z.get("docProps/app.xml");
  if (app != null) {
    z.put("docProps/app.xml", app.replace(/<(Company|Manager|HyperlinkBase|TitlesOfParts|HeadingPairs)\b[\s\S]*?<\/\1>|<(Company|Manager|HyperlinkBase)\/>/g, ""));
  }
  // Réglages : chemin du modèle, variables du document, publipostage.
  const settings = z.get("word/settings.xml");
  if (settings != null) {
    const toks = transform(tokenize(settings), (tk) =>
      /^w:(attachedTemplate|docVars|mailMerge|documentProtection|writeProtection|saveThroughXslt|attachedSchema)$/.test(tk.name) ? "drop" : null);
    z.put("word/settings.xml", join(toks).replace(PERSONAL_ATTR_RX, ""));
  }
  return gone;
}

/* Après coup : relations vers des parties disparues, liens externes (cibles
   d'hyperliens, modèle attaché), images plus référencées. */
function pruneRelations(z, gone) {
  const used = new Set();
  for (const p of z.names()) {
    if (!/\.xml$/.test(p) || /_rels\//.test(p)) continue;
    const xml = z.get(p) || "";
    for (const m of xml.matchAll(/\br:(?:id|embed|link|pict|href)="([^"]+)"/g)) used.add(`${p}#${m[1]}`);
  }
  const media = new Set();
  for (const p of z.names()) {
    const m = p.match(/^(.*?)_rels\/([^/]+)\.rels$/);
    if (!m) continue;
    const owner = `${m[1]}${m[2]}`;
    const dir = m[1];
    const xml = z.get(p) || "";
    const kept = xml.replace(/<Relationship\b[^>]*\/>/g, (rel) => {
      const id = (rel.match(/\bId="([^"]+)"/) || [])[1];
      const target = unescapeXml((rel.match(/\bTarget="([^"]+)"/) || [])[1] || "");
      const external = /TargetMode="External"/.test(rel);
      const type = (rel.match(/\bType="([^"]+)"/) || [])[1] || "";
      if (external) return "";
      const abs = target.startsWith("/") ? target.slice(1) : normalize(dir + target);
      if (gone.has(abs)) return "";
      if (/\/(image|oleObject|package)$/.test(type) && !used.has(`${owner}#${id}`)) { media.add(abs); return ""; }
      return rel;
    });
    z.put(p, kept);
  }
  for (const p of media) z.del(p);
  const ct = z.get("[Content_Types].xml");
  if (ct != null) {
    const present = new Set(z.names());
    z.put("[Content_Types].xml", ct.replace(/<Override\b[^>]*\/>/g, (o) => {
      const part = ((o.match(/\bPartName="([^"]+)"/) || [])[1] || "").replace(/^\//, "");
      return present.has(part) ? o : "";
    }));
  }
}

function normalize(p) {
  const out = [];
  for (const seg of p.split("/")) {
    if (seg === "..") out.pop();
    else if (seg && seg !== ".") out.push(seg);
  }
  return out.join("/");
}

/* --------------------------------------------------------- résidus ----- *
 * Le filet final : le texte de TOUTES les parties XML (attributs compris)
 * est passé à find(texte), qui dit s'il y reste une valeur connue de la clé.
 * index.js lui donne le détecteur du verrou de sortie (knownValueMatcher) :
 * mêmes règles que pour une réponse à l'IA — un mot courant qui est aussi
 * une valeur de la clé (« ATTESTATION » codé en titre) ne compte que
 * capitalisé, un numéro est reconnu quels que soient ses séparateurs.
 * Renvoie les parties où il reste quelque chose. */
export function residue(buf, find, XLSX) {
  const z = openZip(buf, XLSX);
  const hits = [];
  for (const p of z.names()) {
    if (!/\.(xml|rels)$/i.test(p)) continue;
    const xml = z.get(p) || "";
    const plain = unescapeXml(xml.replace(/<[^>]*?(\s[^>]*)?>/g, (tag, attrs) => " " + (attrs || "").replace(/[\w:.-]+="([^"]*)"/g, " $1 ") + " "));
    if (find(plain)) hits.push(p);
  }
  return hits;
}

/* ------------------------------------------------------- API : coder --- */

export function docxParagraphs(buf, XLSX) {
  const z = openZip(buf, XLSX);
  const parts = z.names().filter((p) => STORY_RX.test(p)).sort(storyOrder)
    .map((p) => ({ p, tokens: tokenize(z.get(p)) }));
  return parts.flatMap((x) => collectParagraphs(x.tokens).map((q) => q.text));
}

function storyOrder(a, b) {
  const rank = (p) => (/document/.test(p) ? 0 : /header/.test(p) ? 1 : /footer/.test(p) ? 2 : 3);
  return rank(a) - rank(b) || a.localeCompare(b);
}

/* Copie codée. code(texte) → texte codé (moteur + verrou, avec la clé).
   Renvoie { buf, lines, removed } ; lines = paragraphes codés (aperçu). */
export function codeDocx(buf, code, XLSX) {
  const z = openZip(buf, XLSX);
  if (!z.get("word/document.xml")) throw new Error("pas un document Word (.docx)");
  const removed = { comments: 0, commentParts: 0, revisions: 0, fields: 0, links: 0, images: 0, objects: 0, metadata: 0 };
  const parts = [];
  for (const p of z.names().filter((x) => STORY_RX.test(x)).sort(storyOrder)) {
    const tokens = sanitizeStory(tokenize(z.get(p)), removed);
    parts.push({ p, tokens: tokenize(join(tokens)) });
  }
  const lines = mapParagraphs(parts, code);
  for (const part of parts) z.put(part.p, join(part.tokens));
  const gone = prunePackage(z, removed);
  pruneRelations(z, gone);
  return { buf: z.write(), lines, removed };
}

/* -------------------------------------------------- API : décoder ------ *
 * Sur un .docx qui ne contient que des codes (la copie codée retravaillée,
 * ou un .docx de l'IA) : TOUTES les parties de texte, commentaires compris
 * — c'est désormais le fichier de l'utilisateur, sur son poste. */
export function decodeDocx(buf, decode, XLSX) {
  const z = openZip(buf, XLSX);
  if (!z.get("word/document.xml")) throw new Error("pas un document Word (.docx)");
  const parts = z.names()
    .filter((p) => STORY_RX.test(p) || /^word\/comments\.xml$/.test(p))
    .sort(storyOrder)
    .map((p) => ({ p, tokens: tokenize(z.get(p)) }));
  let replaced = 0;
  mapParagraphs(parts, (t) => { const r = decode(t); replaced += r.replaced; return r.text; });
  for (const part of parts) z.put(part.p, join(part.tokens));
  return { buf: z.write(), replaced };
}

/* ----------------------------------------------- API : construire ------ *
 * Un .docx neuf à partir du texte de l'IA, en Markdown simple : titres (#),
 * listes (- / 1.), **gras**, *italique*, tableaux (| a | b |), séparateurs. */

function inlineRuns(s, base = "") {
  const out = [];
  const rx = /(\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|_([^_\s][^_]*)_)/g;
  let at = 0;
  const run = (text, rpr = "") => {
    if (!text) return;
    const props = base + (base.includes(rpr) ? "" : rpr);
    out.push(`<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`);
  };
  for (const m of s.matchAll(rx)) {
    run(s.slice(at, m.index));
    if (m[2] || m[4]) run(m[2] || m[4], "<w:b/>");
    else run(m[3] || m[5], "<w:i/>");
    at = m.index + m[0].length;
  }
  run(s.slice(at));
  return out.join("");
}

const para = (runs, ppr = "") => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${runs}</w:p>`;

function tableXml(rows) {
  const cells = rows.map((r) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim()));
  const body = cells.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
  const cols = Math.max(...body.map((r) => r.length));
  const border = '<w:tblBorders>' + ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`).join("") + "</w:tblBorders>";
  return `<w:tbl><w:tblPr><w:tblStyle w:val="Tableau"/><w:tblW w:w="5000" w:type="pct"/>${border}</w:tblPr>` +
    `<w:tblGrid>${'<w:gridCol/>'.repeat(cols)}</w:tblGrid>` +
    body.map((r, i) => `<w:tr>${Array.from({ length: cols }, (_, c) =>
      `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${para(inlineRuns(r[c] || "", i === 0 ? "<w:b/>" : ""))}</w:tc>`).join("")}</w:tr>`).join("") +
    "</w:tbl>";
}

export function markdownToBody(md) {
  const lines = String(md).replace(/\r/g, "").split("\n");
  const out = [];
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k];
    if (/^\s*\|.*\|\s*$/.test(l)) {
      const rows = [];
      while (k < lines.length && /^\s*\|.*\|\s*$/.test(lines[k])) rows.push(lines[k++]);
      k--;
      out.push(tableXml(rows));
      continue;
    }
    const h = l.match(/^(#{1,3})\s+(.*)$/);
    if (h) { out.push(para(inlineRuns(h[2]), `<w:pStyle w:val="Titre${h[1].length}"/>`)); continue; }
    const li = l.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
    if (li) {
      const mark = /\d/.test(li[1]) ? li[1].replace(")", ".") + " " : "• ";
      out.push(para(inlineRuns(mark + li[2]), '<w:pStyle w:val="Liste"/>'));
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) {
      out.push(para("", '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>'));
      continue;
    }
    out.push(para(inlineRuns(l)));
  }
  return out.join("");
}

const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function stylesXml() {
  const st = (id, name, ppr, rpr) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>` +
    `<w:basedOn w:val="Normal"/><w:qFormat/><w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="${NS_W}">` +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    st("Titre1", "heading 1", '<w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/>', '<w:b/><w:sz w:val="32"/>') +
    st("Titre2", "heading 2", '<w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/>', '<w:b/><w:sz w:val="26"/>') +
    st("Titre3", "heading 3", '<w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/>', '<w:b/><w:sz w:val="23"/>') +
    st("Liste", "List Paragraph", '<w:ind w:left="567" w:hanging="283"/><w:spacing w:after="60"/>', "") +
    '<w:style w:type="table" w:styleId="Tableau"><w:name w:val="Table Grid"/><w:tblPr><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
    "</w:styles>";
}

export function buildDocx(md, XLSX) {
  const body = markdownToBody(md);
  return zipParts({
    "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      "</Types>",
    "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      "</Relationships>",
    "word/_rels/document.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      "</Relationships>",
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="${NS_W}"><w:body>${body}` +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>' +
      "</w:body></w:document>",
    "word/styles.xml": stylesXml(),
    "docProps/core.xml": CORE_XML,
  }, XLSX);
}

