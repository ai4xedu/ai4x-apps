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

const server = new McpServer({ name: "anonymiseur-ai4x", version: "1.0.0" });

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
      return err(`Dossier de travail introuvable : ${WORKDIR}. Configurez-le dans les réglages de l'extension.`);
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
      "Pseudonymise les colonnes sensibles d'un fichier Excel/CSV du dossier de travail : noms, CIN, emails, " +
      "téléphones, RIB… deviennent des codes (NOM-001…). Détection automatique des colonnes ; ajustable via " +
      "colonnes_a_coder / colonnes_a_exclure (noms d'en-têtes). Renvoie le tableau CODÉ (utilisable directement " +
      "dans la conversation) et écrit le fichier anonymisé + la clé sur le poste. Les valeurs réelles ne sont " +
      "jamais renvoyées. Toujours appeler cet outil AVANT de travailler sur un fichier contenant des données personnelles.",
    inputSchema: z.object({
      nom_fichier: z.string().describe("Nom du fichier dans le dossier de travail, ex. « clients.xlsx »"),
      onglet: z.string().optional().describe("Nom de l'onglet à traiter (défaut : le premier)"),
      colonnes_a_coder: z.array(z.string()).optional()
        .describe("En-têtes de colonnes à coder EN PLUS de la détection automatique"),
      colonnes_a_exclure: z.array(z.string()).optional()
        .describe("En-têtes de colonnes à laisser en clair malgré la détection"),
    }),
  },
  async ({ nom_fichier, onglet, colonnes_a_coder = [], colonnes_a_exclure = [] }) => {
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
        ". Précise colonnes_a_coder si une colonne doit être codée."
      );
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
