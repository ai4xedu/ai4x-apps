#!/usr/bin/env node
// ============================================================================
// Anonymiseur de données Ai4x — serveur MCP local (stdio).
//
// Ce que fait ce connecteur : il permet à Claude (Desktop) d'anonymiser des
// fichiers Excel/CSV SUR LE POSTE de l'utilisateur, de travailler sur les
// codes (NOM-001…), puis de dé-anonymiser le résultat — sans que les données
// personnelles n'entrent jamais dans la conversation.
//
// RÈGLE DE CONCEPTION N°1 (non négociable) : les valeurs réelles ne remontent
// JAMAIS dans un résultat d'outil.
//   - anonymiser_fichier renvoie le tableau CODÉ (sans échantillons réels) ;
//   - deanonymiser écrit le résultat décodé SUR DISQUE et ne renvoie que le
//     chemin + des compteurs ;
//   - etat_cle renvoie des comptes, jamais les correspondances.
// Sans cette règle, tout l'intérêt du connecteur s'effondre.
//
// Environnement (posé par le manifest .mcpb via user_config) :
//   ANX_WORKDIR — dossier de travail choisi par l'utilisateur (défaut :
//   ~/Documents). Les sorties et la clé vivent dans <ANX_WORKDIR>/Anonymiseur-Ai4x/.
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod";
import {
  XLSX, TYPES, PREFIX_LABEL, typeById, scanSheet, anonymizeSheet, leakScan,
  decodeText, sheetToTsv, looksLikeTable, newCodebook, pad, normFor,
  detectLayout, anonymizeDocument, classifyLoose, cellText, isSuspectName,
} from "./engine.js";

const WORKDIR = path.resolve(process.env.ANX_WORKDIR || path.join(os.homedir(), "Documents"));
const OUTDIR = path.join(WORKDIR, "Anonymiseur-Ai4x");
const KEY_JSON = path.join(OUTDIR, "cle-de-session.json");
const KEY_XLSX = path.join(OUTDIR, "cle-correspondance-NE-JAMAIS-PARTAGER.xlsx");
const MAX_PREVIEW_ROWS = 300;

/* ------------------------------------------------------------ clé (disque) */

function ensureOutdir() {
  fs.mkdirSync(OUTDIR, { recursive: true });
}

function loadBook() {
  try {
    const raw = JSON.parse(fs.readFileSync(KEY_JSON, "utf8"));
    if (raw && raw.byKey && raw.counters && Array.isArray(raw.entries)) return raw;
  } catch {}
  return newCodebook();
}

function saveBook(book) {
  ensureOutdir();
  fs.writeFileSync(KEY_JSON, JSON.stringify(book), "utf8");
  // Export xlsx : même format que l'appli web (réimportable dans /anonymiseur-donnees).
  const aoa = [["Code", "Valeur d'origine", "Type"]];
  for (const e of book.entries) aoa.push([e.code, e.value, e.type]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 14 }, { wch: 42 }, { wch: 24 }];
  const readme = XLSX.utils.aoa_to_sheet([
    ["CLÉ DE CORRESPONDANCE — À GARDER POUR VOUS"],
    [""],
    ["Ce fichier permet de retrouver les vraies valeurs derrière les codes."],
    ["Il ne doit JAMAIS être envoyé à une IA, ni par email, ni partagé."],
    [""],
    ["Généré par le connecteur MCP Anonymiseur Ai4x — https://ai4x.academy/anonymiseur-donnees"],
  ]);
  readme["!cols"] = [{ wch: 80 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clé");
  XLSX.utils.book_append_sheet(wb, readme, "Lisez-moi");
  XLSX.writeFile(wb, KEY_XLSX);
}

/* --------------------------------------------------------------- sécurité */

/* Résout un nom de fichier DANS le dossier de travail, refuse toute évasion. */
function safeResolve(name) {
  const p = path.resolve(WORKDIR, String(name || ""));
  if (p !== WORKDIR && !p.startsWith(WORKDIR + path.sep)) {
    throw new Error(
      `Chemin refusé : « ${name} » sort du dossier de travail (${WORKDIR}). ` +
      "Donnez un nom de fichier ou un chemin relatif à ce dossier."
    );
  }
  return p;
}

function sanitizeBase(name, fallback) {
  const base = String(name || fallback).replace(/\.(xlsx|xls|csv|txt|md)$/i, "");
  return base.replace(/[^\p{L}\p{N} ._-]/gu, "_").slice(0, 80) || fallback;
}

function text(s) {
  return { content: [{ type: "text", text: s }] };
}

function err(s) {
  return { content: [{ type: "text", text: `⚠️ ${s}` }], isError: true };
}

/* Les consignes qui voyagent AVEC les données codées : c'est ce qui empêche
   le modèle de reformuler les codes (cause n°1 d'un décodage raté). */
function rulesBlock(book) {
  const prefixes = [...new Set(book.entries.map((e) => e.code.split("-")[0]))];
  const ex = prefixes.length ? prefixes.map((p) => p + "-001").join(", ") : "NOM-001, TEL-002";
  return [
    "RÈGLES SUR LES CODES (à respecter dans toutes tes réponses) :",
    `1. Les données personnelles sont remplacées par des codes de la forme ${ex}, etc. Recopie chaque code EXACTEMENT tel quel — jamais « le client 1 » ni un nom inventé.`,
    "2. N'essaie pas de deviner les identités réelles ; n'invente aucun nom, email ou numéro.",
    "3. Dans les tableaux ou documents produits, garde les codes dans les mêmes colonnes.",
    "4. Pour rendre les vraies valeurs à l'utilisateur, utilise l'outil deanonymiser — le fichier décodé reste sur son ordinateur, ne tente jamais de reconstruire les valeurs toi-même.",
  ].join("\n");
}

/* ------------------------------------------------------------------ MCP */

const server = new McpServer({ name: "anonymiseur-ai4x", version: "1.2.0" });

const RESTART_HINT =
  "Si tu viens de changer le dossier dans les réglages de l'extension, REDÉMARRE Claude Desktop : " +
  "un changement de dossier n'est pris en compte qu'au redémarrage.";

server.registerTool(
  "lister_fichiers",
  {
    title: "Lister les fichiers Excel/CSV du dossier de travail",
    description:
      "Liste les fichiers .xlsx/.xls/.csv du dossier de travail configuré (sans lire leur contenu). " +
      "À utiliser pour retrouver le fichier que l'utilisateur veut anonymiser.",
    inputSchema: z.object({}),
  },
  async () => {
    let names;
    try {
      names = fs.readdirSync(WORKDIR);
    } catch (e) {
      return err(`Dossier de travail introuvable : ${WORKDIR}. Configure-le dans les réglages de l'extension. ${RESTART_HINT}`);
    }
    const rows = [];
    for (const n of names) {
      if (!/\.(xlsx|xls|csv)$/i.test(n)) continue;
      if (n.startsWith("~$") || n.startsWith(".")) continue;
      try {
        const st = fs.statSync(path.join(WORKDIR, n));
        rows.push({ n, size: st.size, m: st.mtime });
      } catch {}
      if (rows.length >= 100) break;
    }
    rows.sort((a, b) => b.m - a.m);
    if (!rows.length) {
      return text(`Aucun fichier Excel/CSV dans ${WORKDIR}. L'utilisateur peut y déposer son fichier, ou changer le dossier dans les réglages de l'extension.`);
    }
    const list = rows
      .map((r) => `- ${r.n} (${Math.max(1, Math.round(r.size / 1024))} Ko, modifié le ${r.m.toISOString().slice(0, 10)})`)
      .join("\n");
    return text(`Fichiers dans ${WORKDIR} :\n${list}`);
  }
);

server.registerTool(
  "anonymiser_fichier",
  {
    title: "Anonymiser un fichier Excel/CSV (sur le poste)",
    description:
      "Pseudonymise les données sensibles d'un fichier Excel/CSV du dossier de travail. Deux modes, choisis " +
      "automatiquement : TABLEAU (ligne d'en-têtes → colonnes entières codées : noms, CIN, emails, téléphones, RIB…) " +
      "et DOCUMENT (facture, document mis en page → codage À L'INTÉRIEUR des cellules avec le dictionnaire marocain " +
      "ICE/IF/RC/CNSS/patente/RIB/téléphone ; les libellés, montants, quantités et dates restent en clair). " +
      "FONCTIONNEMENT EN DEUX TEMPS : un premier appel SANS confirmer renvoie le PLAN (rien n'est écrit) — " +
      "présente-le à l'utilisateur, demande-lui les noms propres à coder (valeurs_a_coder), puis rappelle avec " +
      "confirmer: true. Les valeurs réelles ne sont jamais renvoyées. Toujours utiliser cet outil AVANT de " +
      "travailler sur un fichier contenant des données personnelles.",
    inputSchema: z.object({
      nom_fichier: z.string().describe("Nom du fichier dans le dossier de travail, ex. « clients.xlsx »"),
      onglet: z.string().optional().describe("Nom de l'onglet à traiter (défaut : le premier)"),
      mode: z.enum(["auto", "tableau", "document"]).optional()
        .describe("Défaut auto : la mise en page décide (en-têtes homogènes = tableau, sinon document)"),
      colonnes_a_coder: z.array(z.string()).optional()
        .describe("Mode tableau : en-têtes de colonnes à coder EN PLUS de la détection automatique"),
      colonnes_a_exclure: z.array(z.string()).optional()
        .describe("Mode tableau : en-têtes de colonnes à laisser en clair malgré la détection"),
      valeurs_a_coder: z.array(z.string()).optional()
        .describe("Mode document : noms propres à coder EN PLUS de la détection automatique (personnes, sociétés) — demande-les à l'utilisateur, ne les invente jamais"),
      valeurs_a_exclure: z.array(z.string()).optional()
        .describe("Mode document : noms détectés automatiquement que l'utilisateur veut laisser EN CLAIR (sur-codage inoffensif par défaut ; n'exclure que sur demande explicite)"),
      confirmer: z.boolean().optional()
        .describe("false/absent = renvoyer le PLAN sans rien écrire ; true = exécuter (après accord de l'utilisateur)"),
    }),
  },
  async ({ nom_fichier, onglet, mode, colonnes_a_coder = [], colonnes_a_exclure = [], valeurs_a_coder = [], valeurs_a_exclure = [], confirmer = false }) => {
    if (!fs.existsSync(WORKDIR)) {
      return err(`Dossier de travail introuvable : ${WORKDIR}. Configure-le dans les réglages de l'extension. ${RESTART_HINT}`);
    }
    let file;
    try { file = safeResolve(nom_fichier); } catch (e) { return err(e.message); }
    if (!fs.existsSync(file)) {
      return err(`Fichier introuvable : ${nom_fichier}. Utilise lister_fichiers pour voir les fichiers disponibles.`);
    }
    let wb;
    try { wb = XLSX.read(fs.readFileSync(file), { type: "buffer", cellDates: false }); }
    catch { return err(`Fichier illisible (${nom_fichier}) — .xlsx, .xls ou .csv attendu.`); }

    const sheetName = onglet || wb.SheetNames[0];
    if (!wb.SheetNames.includes(sheetName)) {
      return err(`Onglet « ${onglet} » introuvable. Onglets disponibles : ${wb.SheetNames.join(", ")}.`);
    }
    const ws = wb.Sheets[sheetName];
    const layout = detectLayout(ws);
    const effectiveMode = mode === "tableau" || mode === "document" ? mode : layout.layout;

    /* ------------------------------------------------- MODE DOCUMENT ------ */
    if (effectiveMode === "document") {
      const extras = valeurs_a_coder.map((v) => ({ value: v, type: "autre" }));
      const docOpts = { excludes: valeurs_a_exclure };
      const fmt = (byType) => Object.entries(byType).map(([k, n]) => `${n} × ${k}`).join(", ");

      if (!confirmer) {
        // Répétition à blanc sur une COPIE de la clé : rien n'est écrit.
        const probe = anonymizeDocument(ws, JSON.parse(JSON.stringify(loadBook())), extras, docOpts);
        return text([
          `📋 PLAN D'ANONYMISATION — mode DOCUMENT (mise en page type facture/document, pas un tableau de données). RIEN n'a encore été écrit.`,
          probe.stats.replaced
            ? `Serait codé, à l'intérieur des cellules (libellés conservés) : ${fmt(probe.stats.byType)} — soit ${probe.stats.replaced} valeur(s) dans ${probe.stats.cellsTouched} cellule(s).`
            : `Rien détecté (ni dictionnaire ICE/IF/RC/CNSS/patente/RIB/téléphone/email/CIN, ni nom probable).`,
          `Dont ${probe.stats.autoNames} nom(s)/adresse(s) probables CODÉS D'OFFICE (sociétés, zones émetteur/client, adresses) — leurs valeurs ne sont jamais citées ici, c'est voulu. Sur-coder est inoffensif ; si l'utilisateur veut en garder en clair, il les indique dans valeurs_a_exclure.`,
          `Les montants, quantités, dates et libellés ne sont JAMAIS codés — c'est la matière de travail de l'IA.`,
          `Présente ce plan à l'utilisateur, attends son accord, puis rappelle l'outil avec les mêmes options et confirmer: true.`,
        ].join("\n"));
      }

      const book = loadBook();
      const res = anonymizeDocument(ws, book, extras, docOpts);
      if (!res.stats.replaced) {
        return err("Rien à coder : ni le dictionnaire ni valeurs_a_coder n'ont trouvé de correspondance dans ce document.");
      }
      saveBook(book);
      ensureOutdir();
      const base = sanitizeBase(path.basename(file), "fichier");
      const outPath = path.join(OUTDIR, `${base}-anonymise.xlsx`);
      const outWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(outWb, res.ws, sheetName);
      XLSX.writeFile(outWb, outPath);

      // RÈGLE N°1 : si des motifs sensibles restent dans une cellule codée
      // (format étranger, cas non couvert), elle est masquée dans l'aperçu.
      const previewWs = { ...res.ws };
      let masked = 0;
      for (const addr of Object.keys(res.ws)) {
        if (addr[0] === "!") continue;
        const cell = res.ws[addr];
        if (!cell || (cell.t !== "s" && cell.t !== "str")) continue;
        const t = cellText(cell);
        if (classifyLoose(t).length || isSuspectName(t)) {
          previewWs[addr] = { t: "s", v: "[MASQUÉ — fuite possible]" };
          masked++;
        }
      }
      const { tsv, totalRows, shownRows } = sheetToTsv(previewWs, MAX_PREVIEW_ROWS);
      const lines = [
        `✅ Anonymisation terminée (mode DOCUMENT) — onglet « ${sheetName} » de ${path.basename(file)}.`,
        `Codé à l'intérieur des cellules (libellés conservés) : ${fmt(res.stats.byType)} — ${res.stats.replaced} valeur(s), ${res.stats.newCodes} nouveau(x) code(s). Clé cumulée : ${book.entries.length} codes.`,
        `Montants, quantités, dates et libellés laissés en clair.`,
        `Fichier anonymisé écrit : ${outPath}`,
        `Clé (JAMAIS à partager, restée sur le poste) : ${KEY_XLSX}`,
      ];
      if (wb.SheetNames.length > 1) {
        lines.push(`⚠️ Le classeur contient ${wb.SheetNames.length} onglets — seul « ${sheetName} » a été traité.`);
      }
      if (masked) {
        lines.push(`⚠️ CONTRÔLE DE FUITE — ${masked} cellule(s) masquée(s) dans l'aperçu (motifs sensibles résiduels ; le fichier local reste complet).`);
      }
      lines.push(
        `${res.stats.autoNames} nom(s)/adresse(s) probables codés d'office. Si un nom de personne reste visible dans ` +
        "l'aperçu (la détection n'est pas infaillible), préviens l'utilisateur et relance avec valeurs_a_coder ; " +
        "s'il veut au contraire garder un nom en clair, relance avec valeurs_a_exclure."
      );
      lines.push("", rulesBlock(book), "");
      lines.push(shownRows < totalRows ? `DOCUMENT CODÉ (aperçu ${shownRows}/${totalRows} lignes) :` : "DOCUMENT CODÉ :");
      lines.push(tsv);
      return text(lines.join("\n"));
    }

    /* ------------------------------------------------- MODE TABLEAU ------- */
    const cols = scanSheet(ws);
    if (!cols.length) return err(`L'onglet « ${sheetName} » est vide.`);

    const norm = (s) => String(s).trim().toLowerCase();
    const force = colonnes_a_coder.map(norm);
    const excl = colonnes_a_exclure.map(norm);
    for (const col of cols) {
      const h = norm(col.header);
      if (force.includes(h)) col.checked = true;
      if (excl.includes(h)) col.checked = false;
    }
    if (!cols.some((c) => c.checked)) {
      return err(
        "Aucune colonne sensible détectée ni demandée. Colonnes trouvées : " +
        cols.map((c) => `« ${c.header} »`).join(", ") +
        ". Si une colonne précise doit être codée, indique-la dans colonnes_a_coder ; " +
        "si ce fichier est un document mis en page (facture…), relance avec mode: \"document\"."
      );
    }

    // Garde-fou : une mise en page DOCUMENT forcée en mode tableau finit en
    // « tout codé » (libellés et montants compris) — vécu sur une facture
    // réelle, 32 cellules sur 33 codées. On refuse, quel que soit l'appelant.
    if (layout.layout === "document") {
      const totalCells = cols.reduce((s, c) => s + c.nonEmpty, 0);
      const toCode = cols.filter((c) => c.checked).reduce((s, c) => s + c.nonEmpty, 0);
      if (totalCells && toCode > totalCells * 0.4) {
        return err(
          `Ce fichier ressemble à un DOCUMENT mis en page (facture, courrier…), pas à un tableau de données : ` +
          `coder ces colonnes reviendrait à coder ${Math.round((toCode / totalCells) * 100)} % des cellules, ` +
          `libellés et montants compris — le fichier deviendrait inutilisable. ` +
          `Relance avec mode: "document" (codage chirurgical à l'intérieur des cellules, montants préservés).`
        );
      }
    }

    if (!confirmer) {
      const codedCols = cols.filter((c) => c.checked)
        .map((c) => `« ${c.header} » (${typeById(c.type).label}, ${c.nonEmpty} cellule(s))`).join(", ");
      const planLeaks = leakScan(ws, cols);
      const planLines = [
        `📋 PLAN D'ANONYMISATION — mode TABLEAU. RIEN n'a encore été écrit.`,
        `Colonnes qui seraient codées : ${codedCols}.`,
        `Colonnes laissées en clair : ${cols.filter((c) => !c.checked).map((c) => `« ${c.header} »`).join(", ") || "aucune"}.`,
      ];
      if (planLeaks.length) {
        planLines.push(
          `⚠️ Des colonnes non codées semblent contenir des données personnelles : ` +
          planLeaks.map((l) => `« ${l.header} » (${l.parts})`).join(" ; ") +
          ` — propose à l'utilisateur de les ajouter à colonnes_a_coder.`
        );
      }
      planLines.push(`Présente ce plan à l'utilisateur, attends son accord, puis rappelle l'outil avec les mêmes options et confirmer: true.`);
      return text(planLines.join("\n"));
    }

    const book = loadBook();
    const res = anonymizeSheet(ws, cols, book);
    if (!res.stats.replaced) return err("Aucune valeur à coder dans les colonnes retenues.");
    saveBook(book);

    ensureOutdir();
    const base = sanitizeBase(path.basename(file), "fichier");
    const outPath = path.join(OUTDIR, `${base}-anonymise.xlsx`);
    const outWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outWb, res.ws, sheetName);
    XLSX.writeFile(outWb, outPath);

    const leaks = leakScan(ws, cols);

    // RÈGLE N°1 : les colonnes non codées où le contrôle de fuite a trouvé des
    // données personnelles sont MASQUÉES dans l'aperçu envoyé au modèle (le
    // fichier local, lui, reste complet). Sans ça, un email enfoui dans une
    // colonne « Commentaires » partirait quand même dans la conversation.
    const previewWs = { ...res.ws };
    if (leaks.length) {
      const leakHeaders = new Set(leaks.map((l) => l.header));
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (const col of cols) {
        if (!leakHeaders.has(col.header)) continue;
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ r, c: col.c });
          if (previewWs[addr]) previewWs[addr] = { t: "s", v: "[MASQUÉ — fuite possible]" };
        }
      }
    }
    const { tsv, totalRows, shownRows } = sheetToTsv(previewWs, MAX_PREVIEW_ROWS);

    const codedCols = cols.filter((c) => c.checked)
      .map((c) => `« ${c.header} » (${typeById(c.type).label})`).join(", ");
    const lines = [
      `✅ Anonymisation terminée — onglet « ${sheetName} » de ${path.basename(file)}.`,
      `Colonnes codées : ${codedCols}.`,
      `${res.stats.replaced} cellules remplacées (${res.stats.newCodes} nouveaux codes, ${res.stats.reusedCells} réutilisés — même valeur = même code, y compris entre fichiers). Clé cumulée : ${book.entries.length} codes.`,
      `Fichier anonymisé écrit : ${outPath}`,
      `Clé (JAMAIS à partager, restée sur le poste) : ${KEY_XLSX}`,
    ];
    if (wb.SheetNames.length > 1) {
      lines.push(`⚠️ Le classeur contient ${wb.SheetNames.length} onglets — seul « ${sheetName} » a été traité. Traite les autres séparément si besoin.`);
    }
    if (leaks.length) {
      lines.push(
        "⚠️ CONTRÔLE DE FUITE — des colonnes NON codées semblent contenir des données personnelles : " +
        leaks.map((l) => `« ${l.header} » (${l.parts})`).join(" ; ") +
        ". Ces colonnes sont MASQUÉES dans l'aperçu ci-dessous (le fichier local reste complet). " +
        "Préviens l'utilisateur et propose de relancer avec colonnes_a_coder pour les coder."
      );
    } else {
      lines.push("Contrôle de fuite : rien de suspect dans les colonnes non codées.");
    }
    lines.push("", rulesBlock(book), "");
    lines.push(
      shownRows < totalRows
        ? `TABLEAU CODÉ (aperçu ${shownRows}/${totalRows} lignes — le fichier complet est sur le poste) :`
        : "TABLEAU CODÉ :"
    );
    lines.push(tsv);
    return text(lines.join("\n"));
  }
);

/* ------------------------------------------------------------------ *
 *  TRAITEMENT PAR LOTS — un cabinet ne traite pas une facture, il en   *
 *  traite quarante. Une seule clé pour tout le lot (même valeur =      *
 *  même code d'un fichier à l'autre), TOUS les onglets de chaque       *
 *  classeur, et AUCUN aperçu de contenu dans la conversation : le      *
 *  compte rendu ne contient que des comptes et des chemins.            *
 * ------------------------------------------------------------------ */

const BATCH_MAX_FILES = 200;

function listBatchFiles(motif) {
  const names = fs.readdirSync(WORKDIR);
  const needle = String(motif || "").trim().toLowerCase();
  const out = [];
  for (const n of names) {
    if (!/\.(xlsx|xls|csv)$/i.test(n)) continue;
    if (n.startsWith("~$") || n.startsWith(".")) continue;
    if (/-anonymise\.xlsx$/i.test(n)) continue;               // déjà des sorties
    if (/CLE-NE-JAMAIS-PARTAGER/i.test(n)) continue;          // jamais la clé
    if (needle && n.toLowerCase().indexOf(needle) === -1) continue;
    out.push(n);
    if (out.length >= BATCH_MAX_FILES) break;
  }
  out.sort();
  return out;
}

/* Traite toutes les feuilles d'un classeur avec le carnet fourni.
   Mode choisi feuille par feuille (tableau ou document). Renvoie
   { outWb, perSheet: [{ name, mode, replaced, byType, untouched }] }. */
function anonymizeWorkbook(wb, book, extras, docOpts) {
  const outWb = XLSX.utils.book_new();
  const perSheet = [];
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    if (!ws || !ws["!ref"]) {
      XLSX.utils.book_append_sheet(outWb, XLSX.utils.aoa_to_sheet([[]]), sn);
      perSheet.push({ name: sn, mode: "vide", replaced: 0, byType: {}, untouched: true });
      continue;
    }
    const layout = detectLayout(ws).layout;
    if (layout === "document") {
      const res = anonymizeDocument(ws, book, extras, docOpts);
      XLSX.utils.book_append_sheet(outWb, res.ws, sn);
      perSheet.push({ name: sn, mode: "document", replaced: res.stats.replaced, byType: res.stats.byType, untouched: !res.stats.replaced });
    } else {
      const cols = scanSheet(ws);
      const checked = cols.filter((c) => c.checked);
      if (!checked.length) {
        // Rien de sensible détecté : la feuille passe telle quelle, mais on le DIT.
        XLSX.utils.book_append_sheet(outWb, ws, sn);
        perSheet.push({ name: sn, mode: "tableau", replaced: 0, byType: {}, untouched: true });
        continue;
      }
      const res = anonymizeSheet(ws, cols, book);
      const byType = {};
      for (const c of checked) {
        const label = typeById(c.type).label;
        byType[label] = (byType[label] || 0) + c.nonEmpty;
      }
      XLSX.utils.book_append_sheet(outWb, res.ws, sn);
      perSheet.push({ name: sn, mode: "tableau", replaced: res.stats.replaced, byType, untouched: false });
    }
  }
  return { outWb, perSheet };
}

function fmtByType(byType) {
  const parts = Object.entries(byType).map(([k, n]) => `${n} × ${k}`);
  return parts.length ? parts.join(", ") : "rien détecté";
}

server.registerTool(
  "anonymiser_dossier",
  {
    title: "Anonymiser un LOT de fichiers (dossier entier, une seule clé)",
    description:
      "Traite d'un coup tous les fichiers Excel/CSV du dossier de travail (ou ceux dont le nom contient `motif`) : " +
      "chaque feuille est anonymisée en mode tableau ou document selon sa mise en page, avec UNE SEULE clé — la même " +
      "valeur garde le même code d'un fichier à l'autre, c'est ce qui permet de croiser les fichiers codés. " +
      "FONCTIONNEMENT EN DEUX TEMPS : sans confirmer, renvoie le PLAN (liste des fichiers + comptes par type, rien " +
      "n'est écrit) — présente-le à l'utilisateur puis rappelle avec confirmer: true. Le compte rendu ne contient " +
      "JAMAIS de contenu, seulement des comptes et des chemins ; un rapport de synthèse est écrit sur le poste. " +
      "Pour travailler ensuite sur UN fichier dans la conversation, utiliser anonymiser_fichier.",
    inputSchema: z.object({
      motif: z.string().optional()
        .describe("Filtre sur le nom de fichier (contient, insensible à la casse), ex. « facture ». Vide = tous"),
      valeurs_a_coder: z.array(z.string()).optional()
        .describe("Noms propres à coder en plus dans tout le lot — demande-les à l'utilisateur, ne les invente jamais"),
      valeurs_a_exclure: z.array(z.string()).optional()
        .describe("Noms détectés automatiquement à laisser en clair dans tout le lot (sur demande explicite)"),
      confirmer: z.boolean().optional()
        .describe("false/absent = PLAN sans rien écrire ; true = exécuter (après accord de l'utilisateur)"),
    }),
  },
  async ({ motif, valeurs_a_coder = [], valeurs_a_exclure = [], confirmer = false }) => {
    if (!fs.existsSync(WORKDIR)) {
      return err(`Dossier de travail introuvable : ${WORKDIR}. Configure-le dans les réglages de l'extension. ${RESTART_HINT}`);
    }
    const files = listBatchFiles(motif);
    if (!files.length) {
      return err(motif
        ? `Aucun fichier Excel/CSV dont le nom contient « ${motif} » dans ${WORKDIR}.`
        : `Aucun fichier Excel/CSV dans ${WORKDIR}.`);
    }
    const extras = valeurs_a_coder.map((v) => ({ value: v, type: "autre" }));
    const docOpts = { excludes: valeurs_a_exclure };

    if (!confirmer) {
      // Répétition à blanc sur une COPIE de la clé, partagée par tout le lot
      // (les comptes « nouveaux codes » reflètent la déduplication réelle).
      const probeBook = JSON.parse(JSON.stringify(loadBook()));
      const lines = [
        `📋 PLAN DE LOT — ${files.length} fichier(s) dans ${WORKDIR}. RIEN n'a encore été écrit.`,
      ];
      let total = 0;
      let unreadable = 0;
      for (const name of files) {
        let wb;
        try { wb = XLSX.read(fs.readFileSync(path.join(WORKDIR, name)), { type: "buffer", cellDates: false }); }
        catch { lines.push(`— ${name} : ILLISIBLE (sera ignoré)`); unreadable++; continue; }
        const { perSheet } = anonymizeWorkbook(wb, probeBook, extras, docOpts);
        const agg = {};
        let fileTotal = 0;
        for (const s of perSheet) {
          fileTotal += s.replaced;
          for (const k of Object.keys(s.byType)) agg[k] = (agg[k] || 0) + s.byType[k];
        }
        total += fileTotal;
        const modes = [...new Set(perSheet.filter((s) => s.mode !== "vide").map((s) => s.mode))].join("+") || "vide";
        lines.push(`— ${name} : ${wb.SheetNames.length} onglet(s), mode ${modes}, ${fileTotal} valeur(s) (${fmtByType(agg)})`);
      }
      lines.push(
        `TOTAL : ~${total} valeur(s) seraient codées avec UNE SEULE clé (même valeur = même code sur tout le lot).`,
        `Les montants, quantités, dates et libellés ne sont jamais codés. Les noms propres probables sont codés d'office ` +
        `(ajuste avec valeurs_a_exclure) ; fournis les noms supplémentaires connus de l'utilisateur via valeurs_a_coder.`,
        `Présente ce plan à l'utilisateur, attends son accord, puis rappelle l'outil avec les mêmes options et confirmer: true.`
      );
      if (unreadable) lines.push(`⚠️ ${unreadable} fichier(s) illisible(s) seront ignorés.`);
      return text(lines.join("\n"));
    }

    /* ------------------------------------------------------- exécution */
    const book = loadBook();
    ensureOutdir();
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    const report = [
      `# Rapport d'anonymisation par lot — ${stamp}`,
      "",
      `Dossier : ${WORKDIR}`,
      `Ce rapport ne contient que des comptes — aucune valeur d'origine. Il peut être partagé.`,
      "",
    ];
    let done = 0;
    let totalReplaced = 0;
    let totalNew = 0;
    const failed = [];
    const outNames = [];
    for (const name of files) {
      let wb;
      try { wb = XLSX.read(fs.readFileSync(path.join(WORKDIR, name)), { type: "buffer", cellDates: false }); }
      catch { failed.push(name); report.push(`- ❌ ${name} : illisible, ignoré`); continue; }
      const before = book.entries.length;
      const { outWb, perSheet } = anonymizeWorkbook(wb, book, extras, docOpts);
      const base = sanitizeBase(name, "fichier");
      const outPath = path.join(OUTDIR, `${base}-anonymise.xlsx`);
      XLSX.writeFile(outWb, outPath);
      outNames.push(`${base}-anonymise.xlsx`);
      done++;
      const fileReplaced = perSheet.reduce((s, x) => s + x.replaced, 0);
      totalReplaced += fileReplaced;
      totalNew += book.entries.length - before;
      report.push(`- ✅ ${name} → ${base}-anonymise.xlsx`);
      for (const s of perSheet) {
        report.push(`    - onglet « ${s.name} » (${s.mode}) : ${s.replaced ? s.replaced + " valeur(s) — " + fmtByType(s.byType) : "rien détecté, copié tel quel"}`);
      }
    }
    saveBook(book);
    report.push(
      "",
      `Total : ${totalReplaced} valeur(s) codée(s), ${totalNew} nouveau(x) code(s), clé cumulée ${book.entries.length} codes.`,
      `Clé (à ne JAMAIS partager) : ${KEY_XLSX}`
    );
    const reportPath = path.join(OUTDIR, `rapport-lot-${stamp}.md`);
    fs.writeFileSync(reportPath, report.join("\n"), "utf8");

    const lines = [
      `✅ LOT TERMINÉ — ${done}/${files.length} fichier(s) anonymisé(s) dans ${OUTDIR}.`,
      `${totalReplaced} valeur(s) codée(s) (${totalNew} nouveaux codes) avec une seule clé : la même valeur porte le même code dans tous les fichiers — les fichiers codés restent croisables entre eux.`,
      `Rapport de synthèse (comptes uniquement, partageable) : ${reportPath}`,
      `Clé (JAMAIS à partager, restée sur le poste) : ${KEY_XLSX}`,
    ];
    if (failed.length) lines.push(`⚠️ Ignorés (illisibles) : ${failed.join(", ")}.`);
    lines.push(
      "Aucun contenu n'est affiché ici — c'est voulu. Pour travailler sur un fichier précis dans la conversation, " +
      "appelle anonymiser_fichier sur ce fichier (il renverra le tableau codé)."
    );
    lines.push("", rulesBlock(book));
    return text(lines.join("\n"));
  }
);

server.registerTool(
  "deanonymiser",
  {
    title: "Dé-anonymiser un résultat (écrit sur le poste, jamais dans le chat)",
    description:
      "Remplace les codes (NOM-001…) d'un texte ou d'un tableau par les vraies valeurs, LOCALEMENT : le résultat " +
      "décodé est écrit dans un fichier sur le poste de l'utilisateur et n'apparaît JAMAIS dans la conversation. " +
      "À utiliser en fin de travail, sur ta réponse finale (texte ou tableau TSV contenant les codes).",
    inputSchema: z.object({
      contenu: z.string().describe("Le texte ou tableau (TSV, tabulations) contenant les codes à retraduire"),
      nom_sortie: z.string().optional().describe("Nom de base du fichier de sortie (défaut : « resultat »)"),
    }),
  },
  async ({ contenu, nom_sortie }) => {
    const book = loadBook();
    if (!book.entries.length) {
      return err("Aucune clé de session — anonymise d'abord un fichier avec anonymiser_fichier.");
    }
    const map = {};
    for (const e of book.entries) map[e.code.toUpperCase()] = e.value;
    const res = decodeText(contenu, map);
    if (!res.replaced) {
      return err(`Aucun code de la clé trouvé dans ce contenu (clé : ${book.entries.length} codes). Vérifie que les codes sont recopiés tels quels.`);
    }
    ensureOutdir();
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    const base = sanitizeBase(nom_sortie, "resultat");
    let outPath;
    if (looksLikeTable(res.text)) {
      outPath = path.join(OUTDIR, `${base}-decode-${stamp}.xlsx`);
      const rows = res.text.replace(/\r/g, "").split("\n").filter((l) => l.length)
        .map((l) => l.split("\t"));
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Résultat");
      XLSX.writeFile(wb, outPath);
    } else {
      outPath = path.join(OUTDIR, `${base}-decode-${stamp}.md`);
      fs.writeFileSync(outPath, res.text, "utf8");
    }
    return text(
      [
        `✅ ${res.replaced} code(s) remplacé(s) (${res.used} distincts sur les ${book.entries.length} de la clé).`,
        `Fichier décodé écrit sur le poste : ${outPath}`,
        "IMPORTANT : les valeurs réelles n'apparaissent pas dans cette conversation — c'est voulu. " +
        "Dis à l'utilisateur d'ouvrir ce fichier sur son ordinateur.",
      ].join("\n")
    );
  }
);

server.registerTool(
  "etat_cle",
  {
    title: "État de la clé de session",
    description:
      "Indique combien de codes la clé de session contient (par type), et où vivent la clé et les fichiers " +
      "produits. Ne révèle jamais les correspondances.",
    inputSchema: z.object({}),
  },
  async () => {
    // Distinguer « dossier introuvable » de « clé vide » : sinon on croit
    // repartir sur une clé neuve alors qu'on est branché dans le vide
    // (vécu après un renommage du dossier de travail).
    if (!fs.existsSync(WORKDIR)) {
      return err(`Dossier de travail introuvable : ${WORKDIR} — impossible de dire s'il existe une clé. ${RESTART_HINT}`);
    }
    const book = loadBook();
    if (!book.entries.length) {
      return text(`Clé de session vide. Dossier de travail : ${WORKDIR}. Les sorties iront dans ${OUTDIR}.`);
    }
    const byPrefix = {};
    for (const e of book.entries) {
      const p = e.code.split("-")[0];
      byPrefix[p] = (byPrefix[p] || 0) + 1;
    }
    const detail = Object.entries(byPrefix)
      .map(([p, n]) => `${n} × ${PREFIX_LABEL[p] || p}`).join(", ");
    return text(
      [
        `Clé de session : ${book.entries.length} codes (${detail}).`,
        `Clé (à ne jamais partager) : ${KEY_XLSX}`,
        `Sorties : ${OUTDIR}`,
        "La même valeur garde le même code sur tous les fichiers traités avec cette clé.",
      ].join("\n")
    );
  }
);

server.registerTool(
  "reinitialiser_cle",
  {
    title: "Repartir d'une clé vierge (archive l'actuelle)",
    description:
      "Archive la clé de session actuelle (rien n'est supprimé — l'archive reste sur le poste, datée) et repart " +
      "d'une clé vierge. À n'utiliser que si l'utilisateur le demande explicitement : après ça, les anciens " +
      "fichiers codés ne pourront être décodés qu'avec l'archive.",
    inputSchema: z.object({
      confirmer: z.boolean().describe("Doit être true — confirme que l'utilisateur veut bien repartir de zéro"),
    }),
  },
  async ({ confirmer }) => {
    if (!confirmer) return err("Réinitialisation annulée (confirmer=false). Demande d'abord son accord à l'utilisateur.");
    const book = loadBook();
    if (!book.entries.length) return text("La clé de session est déjà vierge.");
    ensureOutdir();
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    const archJson = path.join(OUTDIR, `cle-archivee-${stamp}.json`);
    const archXlsx = path.join(OUTDIR, `cle-archivee-${stamp}-NE-JAMAIS-PARTAGER.xlsx`);
    fs.renameSync(KEY_JSON, archJson);
    if (fs.existsSync(KEY_XLSX)) fs.renameSync(KEY_XLSX, archXlsx);
    return text(
      `✅ Clé archivée (${book.entries.length} codes) : ${archXlsx}. Nouvelle clé vierge active. ` +
      "Les anciens fichiers codés se décodent avec l'archive (via l'appli web ai4x.academy/anonymiseur-donnees)."
    );
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
