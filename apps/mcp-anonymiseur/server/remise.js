// ============================================================================
// REMISE DES CHIFFRES — « Claude construit la machine, Nanomizer la nourrit ».
//
// L'IA a construit, sur le GABARIT, un classeur : formules, tableaux croisés,
// graphiques, mise en forme. Ce module y remet, SUR LE POSTE, les vraies
// valeurs et les vrais noms. On ne passe PAS par la lecture/réécriture
// SheetJS, qui perdrait les graphiques : on modifie le XML du .xlsx en place.
//
//   - cellules de données : la valeur factice est remplacée par la vraie,
//     SEULEMENT si la cellule contient toujours la valeur factice posée par
//     Nanomizer (une donnée déplacée ou retapée par l'IA n'est pas écrasée :
//     elle est comptée et signalée) ;
//   - codes (NOM-001…) des textes : remplacés par les vraies valeurs, dans les
//     chaînes partagées, les chaînes en ligne et les titres de graphiques ;
//   - formules : leur résultat en cache (calculé sur le gabarit) est retiré
//     et le recalcul complet est demandé à l'ouverture ;
//   - graphiques et tableaux croisés : leurs caches (valeurs du gabarit) sont
//     retirés / marqués à rafraîchir — Excel relit les cellules à l'ouverture.
// Les noms d'onglets ne sont pas décodés : formules et graphiques y font
// référence.
// ============================================================================

const unescapeXml = (s) => String(s)
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, "&");
const escapeXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sameNumber = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/* Fusionne les correspondances de plusieurs fichiers .nanomizer-chiffres-*.json :
   { "Nom d'onglet codé": { real, fake } } (le plus récent l'emporte). */
export function mergeNumberMaps(maps) {
  const sheets = {};
  for (const m of [...maps].sort((a, b) => String(a.cree).localeCompare(String(b.cree)))) {
    for (const [name, s] of Object.entries(m.feuilles || {})) if (s && s.cells) sheets[name] = s;
  }
  return sheets;
}

function sheetPaths(get) {
  const wbXml = get("xl/workbook.xml") || "";
  const rels = get("xl/_rels/workbook.xml.rels") || "";
  const target = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = (m[0].match(/\bId="([^"]+)"/) || [])[1];
    const t = (m[0].match(/\bTarget="([^"]+)"/) || [])[1];
    if (id && t) target[id] = t.replace(/^\/?xl\//, "").replace(/^\//, "");
  }
  const out = [];
  for (const m of wbXml.matchAll(/<sheet\b[^>]*>/g)) {
    const name = unescapeXml((m[0].match(/\bname="([^"]*)"/) || [])[1] || "");
    const rid = (m[0].match(/\br:id="([^"]+)"/) || [])[1];
    if (rid && target[rid]) out.push({ name, path: `xl/${target[rid]}` });
  }
  return out;
}

/* Remet vraies valeurs et vrais noms dans un .xlsx (octets : Buffer ou
   Uint8Array — ce module sert au connecteur ET à l'appli web). sheets : sortie
   de mergeNumberMaps ; decode : fonction texte → { text, replaced }. */
export function restoreWorkbook(buf, sheets, decode, XLSX) {
  const cfb = XLSX.CFB.read(buf instanceof Uint8Array ? buf : new Uint8Array(buf), { type: "array" });
  const dec = new TextDecoder("utf-8"), enc = new TextEncoder();
  const entry = (p) => XLSX.CFB.find(cfb, `/${p}`);
  const get = (p) => { const e = entry(p); return e && e.content ? dec.decode(e.content instanceof Uint8Array ? e.content : Uint8Array.from(e.content)) : null; };
  const put = (p, s) => { const e = entry(p); if (e) e.content = enc.encode(s); };
  const stats = { matchedSheets: [], missingSheets: [], restored: 0, moved: 0, decoded: 0, formulas: 0, charts: 0, pivots: 0 };

  const decodeIn = (xml, rx) => xml.replace(rx, (m, open, inner, close) => {
    const r = decode(unescapeXml(inner));
    if (!r.replaced) return m;
    stats.decoded += r.replaced;
    return open + escapeXml(r.text) + close;
  });

  const present = sheetPaths(get);
  for (const name of Object.keys(sheets)) {
    if (!present.some((s) => s.name === name)) stats.missingSheets.push(name);
  }
  for (const s of present) {
    let xml = get(s.path);
    if (xml == null) continue;
    const map = sheets[s.name];
    if (map) stats.matchedSheets.push(s.name);
    xml = xml.replace(/<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g, (whole, attrs, _end, inner) => {
      if (inner === undefined) return whole;
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
      const type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      if (/<f[\s>/]/.test(inner)) {
        // Résultat calculé sur le gabarit : retiré, Excel recalcule.
        if (/<v>/.test(inner)) stats.formulas++;
        return `<c${attrs.replace(/\s+t="[^"]*"/, "")}>${inner.replace(/<v>[\s\S]*?<\/v>/, "")}</c>`;
      }
      if (map && ref && ref in map.real && (!type || type === "n")) {
        const v = Number((inner.match(/<v>([^<]*)<\/v>/) || [])[1]);
        if (Number.isFinite(v) && map.fake && ref in map.fake && sameNumber(v, map.fake[ref])) {
          stats.restored++;
          return `<c${attrs}>${inner.replace(/<v>[^<]*<\/v>/, `<v>${map.real[ref]}</v>`)}</c>`;
        }
        stats.moved++;
        return whole;
      }
      if (type === "inlineStr" || type === "str") {
        return decodeIn(whole, /(<(?:t|v)(?:\s[^>]*)?>)([^<]*)(<\/(?:t|v)>)/g);
      }
      return whole;
    });
    put(s.path, xml);
  }

  const shared = get("xl/sharedStrings.xml");
  if (shared) put("xl/sharedStrings.xml", decodeIn(shared, /(<t(?:\s[^>]*)?>)([^<]*)(<\/t>)/g));

  for (const p of cfb.FullPaths) {
    const rel = p.replace(/^Root Entry\//, "");
    if (/^xl\/charts\/chart\d+\.xml$/.test(rel)) {
      let xml = get(rel);
      stats.charts++;
      xml = xml.replace(/<c:numCache>[\s\S]*?<\/c:numCache>/g, "").replace(/<c:strCache>[\s\S]*?<\/c:strCache>/g, "");
      xml = decodeIn(xml, /(<a:t>)([^<]*)(<\/a:t>)/g);
      put(rel, xml);
    } else if (/^xl\/pivotCache\/pivotCacheDefinition\d+\.xml$/.test(rel)) {
      stats.pivots++;
      put(rel, get(rel).replace(/<pivotCacheDefinition\b(?![^>]*refreshOnLoad)/, '<pivotCacheDefinition refreshOnLoad="1"'));
    }
  }

  // Recalcul complet à l'ouverture. calcPr vient après sheets / functionGroups /
  // externalReferences / definedNames dans le schéma : on l'y insère.
  let wbXml = get("xl/workbook.xml");
  if (wbXml) {
    if (/<calcPr\b/.test(wbXml)) {
      wbXml = wbXml.replace(/<calcPr\b([^>]*?)\s*(\/?)>/, (m, a, sl) =>
        `<calcPr${a.replace(/\s+fullCalcOnLoad="[^"]*"/, "")} fullCalcOnLoad="1"${sl ? "/" : ""}>`);
    } else {
      const ends = ["</sheets>", "</functionGroups>", "</externalReferences>", "</definedNames>"]
        .map((t) => ({ t, i: wbXml.lastIndexOf(t) })).filter((x) => x.i >= 0).sort((a, b) => b.i - a.i);
      if (ends.length) {
        const at = ends[0].i + ends[0].t.length;
        wbXml = wbXml.slice(0, at) + '<calcPr fullCalcOnLoad="1"/>' + wbXml.slice(at);
      }
    }
    put("xl/workbook.xml", wbXml);
  }

  const out = XLSX.CFB.write(cfb, { type: "array", fileType: "zip" });
  return { buf: out instanceof Uint8Array ? out : Uint8Array.from(out), stats };
}
