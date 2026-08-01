#!/usr/bin/env node
// ============================================================================
// Daftar — serveur MCP local (stdio).
//
// Ce que fait ce connecteur : il transforme un carton de factures d'ACHAT en
// un journal d'écritures importable, SUR LE POSTE, sans qu'aucune facture ne
// quitte l'ordinateur. Le comptable ne tape plus, il révise.
//
// DEUX RÈGLES DE CONCEPTION, non négociables :
//
//   N°1 — LE DOUTE NE SORT JAMAIS DANS LE FICHIER D'IMPORT.
//         Le journal ne contient que des écritures sûres ; tout le reste part
//         dans une liste de travail. Une écriture manquante se rattrape, une
//         écriture fausse importée en silence se paie au bilan.
//
//   N°2 — CE QUI TRAVERSE VERS LA CONVERSATION EST CODÉ.
//         Les tiers remontent en FOURN-001. Le tableau nominatif est écrit
//         sur le disque, jamais dans le chat. Les montants, dates et taux
//         passent en clair : ils sont l'objet même de la révision et
//         n'identifient personne. Même doctrine que l'Anonymiseur Ai4x.
//
// Environnement (posé par le manifest .mcpb via user_config) :
//   DAFTAR_WORKDIR — dossier de travail (défaut : ~/Documents). Les sorties
//   et la mémoire vivent dans <DAFTAR_WORKDIR>/Daftar/.
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod";
import { extractText } from "unpdf";

import { extraireFacture } from "./extract.js";
import {
  chargerSocle, chargerDossier, sauverDossier, resoudreCompte, apprendreCompte,
  codeTiers, resoudreCode, dejaPassee, enregistrerPieces, cleFournisseur,
} from "./mapping.js";
import { proposerEcriture, resumerLot, arrondi, JOURNAL_DEFAUT } from "./ecritures.js";
import { journalCsv, revisionCsv, listeDeTravailMd, periodeDuLot } from "./csv.js";

const VERSION = "0.1.0";
const WORKDIR = path.resolve(process.env.DAFTAR_WORKDIR || path.join(os.homedir(), "Documents"));
const ROOT = path.join(WORKDIR, "Daftar");

const EXT_LISIBLES = /\.(pdf|txt|md)$/i;
const EXT_SCANS = /\.(png|jpe?g|webp|bmp|tiff?|heic)$/i;

const RAPPEL_REDEMARRAGE =
  "Si le dossier de travail vient d'être changé dans les réglages de l'extension, REDÉMARRE Claude Desktop : " +
  "le changement n'est pris en compte qu'au redémarrage.";

/* --------------------------------------------------------------- sécurité */

/* Résout un chemin DANS le dossier de travail, refuse toute évasion. */
function safeResolve(nom) {
  const p = path.resolve(WORKDIR, String(nom || ""));
  if (p !== WORKDIR && !p.startsWith(WORKDIR + path.sep)) {
    throw new Error(
      `Chemin refusé : « ${nom} » sort du dossier de travail (${WORKDIR}). ` +
      "Donne un nom de dossier ou un chemin relatif à celui-ci."
    );
  }
  return p;
}

function texte(s) { return { content: [{ type: "text", text: s }] }; }
function err(s) { return { content: [{ type: "text", text: `⚠️ ${s}` }], isError: true }; }

function mad(n) {
  return n == null ? "?" : Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ------------------------------------------------------------ lecture --- */

/* Le texte d'une pièce. Un PDF sans couche de texte est REFUSÉ, avec
   l'explication : c'est un scan. Annoncer « 0 facture lue » sur un carton
   plein serait un mensonge poli — et l'utilisateur repartirait taper à la
   main sans comprendre pourquoi. L'OCR est l'incrément suivant. */
async function lireTexte(fichier) {
  const ext = path.extname(fichier).toLowerCase();
  if (ext === ".pdf") {
    const buf = fs.readFileSync(fichier);
    const { text } = await extractText(new Uint8Array(buf), { mergePages: true });
    const t = String(Array.isArray(text) ? text.join("\n") : text || "").trim();
    if (t.length < 40) {
      return { texte: null, refus: "scan" };
    }
    return { texte: t, refus: null };
  }
  return { texte: fs.readFileSync(fichier, "utf8"), refus: null };
}

function listerPieces(dossierSource) {
  if (!fs.existsSync(dossierSource)) return { pieces: [], scans: [] };
  const noms = fs.readdirSync(dossierSource, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
  return {
    pieces: noms.filter((n) => EXT_LISIBLES.test(n)),
    scans: noms.filter((n) => EXT_SCANS.test(n)),
  };
}

/* ------------------------------------------------------- cœur du produit */

/* Analyse un lot : lecture → extraction → mémoire → contrôles → propositions.
   Fonction déterministe : elle est rejouée à l'identique par l'export, ce qui
   évite tout état caché entre deux appels d'outil. */
async function analyser({ dossier, sousDossier, journal }) {
  const socle = chargerSocle(ROOT);
  const d = chargerDossier(ROOT, dossier);
  const source = sousDossier ? safeResolve(sousDossier) : WORKDIR;
  const { pieces, scans } = listerPieces(source);

  const propositions = [];
  const illisibles = [];

  for (const nom of pieces) {
    const chemin = path.join(source, nom);
    let lu;
    try {
      lu = await lireTexte(chemin);
    } catch (e) {
      illisibles.push({ fichier: nom, raison: `illisible (${e.message})` });
      continue;
    }
    if (lu.refus === "scan") {
      illisibles.push({ fichier: nom, raison: "PDF scanné (aucune couche de texte)" });
      continue;
    }

    const facture = extraireFacture(lu.texte, { iceSociete: d.fiche.ice, fichier: nom });
    const resolution = resoudreCompte(facture.fournisseur, d, socle);
    const cle = cleFournisseur(facture.fournisseur);
    const doublon = dejaPassee(d.historique, { cle, numero: facture.numero });
    const prop = proposerEcriture(facture, resolution, {
      journal: journal || d.fiche.journal || JOURNAL_DEFAUT,
      doublon,
    });
    prop.code = codeTiers(d.codes, facture.fournisseur);
    propositions.push(prop);
  }

  return { d, socle, source, propositions, illisibles, scans };
}

/* Le compte rendu qui remonte dans la CONVERSATION : codé, compact, orienté
   décision. Tout ce qui est nominatif reste dans les fichiers. */
function rendreLot({ propositions, illisibles, scans, fichierRevision }) {
  const r = resumerLot(propositions);
  const douteuses = propositions.filter((p) => p.statut !== "sure");

  const l = [
    `📋 LOT ANALYSÉ — ${r.total} pièce(s) lue(s) · ${r.sures} sûre(s) · ${r.aVerifier} à vérifier.`,
    `Rien n'a encore été exporté : ceci est un PLAN.`,
    "",
  ];

  if (r.sures) {
    l.push(`✅ ${r.sures} écriture(s) prête(s) — total débit ${mad(r.totalDebitSur)}.`);
  }

  if (douteuses.length) {
    l.push("", `🔍 À VÉRIFIER (les tiers sont codés — le tableau nominatif est sur le disque) :`);
    for (const p of douteuses.slice(0, 40)) {
      const tete = [
        p.code,
        p.piece ? `facture ${p.piece}` : "n° manquant",
        p.ttc != null ? `TTC ${mad(p.ttc)}` : "TTC ?",
      ].join(" · ");
      l.push(`- ${tete}`);
      for (const raison of p.raisons) l.push(`    ↳ ${raison}`);
    }
    if (douteuses.length > 40) l.push(`  … et ${douteuses.length - 40} autre(s), toutes dans le fichier.`);
  }

  if (illisibles.length) {
    l.push("", `📄 Non lues (${illisibles.length}) :`);
    for (const i of illisibles.slice(0, 15)) l.push(`- ${i.fichier} — ${i.raison}`);
    if (illisibles.some((i) => i.raison.startsWith("PDF scanné"))) {
      l.push(
        "  Ces PDF sont des images : Daftar ne sait pas encore les lire (l'OCR arrive). " +
        "En attendant, réexporte-les depuis le scanner avec l'option « PDF recherchable / OCR »."
      );
    }
  }
  if (scans.length) {
    l.push("", `🖼️ ${scans.length} image(s) ignorée(s) (photos/scans) — même raison : l'OCR n'est pas encore branché.`);
  }

  l.push(
    "",
    `Tableau complet et nominatif (à ouvrir dans Excel) : ${fichierRevision}`,
    "",
    "SUITE : présente ce plan à l'utilisateur.",
    "- pour affecter un fournisseur inconnu : `apprendre_compte` avec son code (ex. FOURN-002) et le compte ;",
    "- quand il est d'accord : `exporter_ecritures` avec confirmer: true.",
    "N'invente jamais un compte de charge à sa place, et ne remplace jamais un code FOURN-xxx par un nom.",
  );
  return l.join("\n");
}

/* ------------------------------------------------------------------ MCP */

const server = new McpServer({ name: "daftar-ai4x", version: VERSION });

server.registerTool(
  "lister_factures",
  {
    title: "Lister les pièces du dossier de travail",
    description:
      "Liste les fichiers lisibles (PDF avec texte, .txt, .md) présents dans le dossier de travail ou dans " +
      "un sous-dossier, ainsi que les fichiers qui seront ignorés (images, PDF scannés). À appeler en premier " +
      "pour savoir sur quoi on travaille.",
    inputSchema: z.object({
      sous_dossier: z.string().optional().describe("Sous-dossier du dossier de travail (ex. « Menara/juillet »). Vide = la racine."),
    }),
  },
  async ({ sous_dossier }) => {
    let source;
    try { source = sous_dossier ? safeResolve(sous_dossier) : WORKDIR; }
    catch (e) { return err(e.message); }
    if (!fs.existsSync(source)) {
      return err(`Dossier introuvable : ${source}. ${RAPPEL_REDEMARRAGE}`);
    }
    const { pieces, scans } = listerPieces(source);
    if (!pieces.length && !scans.length) {
      return texte(`Aucun fichier dans ${source}.\n${RAPPEL_REDEMARRAGE}`);
    }
    return texte([
      `Dossier : ${source}`,
      "",
      `${pieces.length} pièce(s) lisible(s) :`,
      ...pieces.slice(0, 200).map((n) => `- ${n}`),
      pieces.length > 200 ? `… et ${pieces.length - 200} autre(s).` : "",
      scans.length ? `\n${scans.length} image(s) ignorée(s) (OCR non branché) : ${scans.slice(0, 10).join(", ")}` : "",
    ].filter(Boolean).join("\n"));
  }
);

server.registerTool(
  "analyser_lot",
  {
    title: "Analyser un lot de factures d'achat (plan, rien n'est exporté)",
    description:
      "Lit toutes les factures d'achat d'un dossier, en extrait fournisseur/ICE/date/n°/HT/TVA/TTC, propose " +
      "une écriture par pièce et trie entre « sûres » et « à vérifier ». RIEN n'est exporté à ce stade : c'est " +
      "un plan à présenter à l'utilisateur. Les tiers remontent codés (FOURN-001) ; le tableau nominatif est " +
      "écrit sur le disque.",
    inputSchema: z.object({
      dossier: z.string().describe("Nom du dossier client (ex. « Menara Distribution »). Sa mémoire de comptes lui est propre."),
      sous_dossier: z.string().optional().describe("Où sont les factures, relatif au dossier de travail. Vide = la racine."),
      ice_societe: z.string().optional().describe("ICE de la société du dossier (15 chiffres). Fortement recommandé : c'est ce qui permet de distinguer le fournisseur du client sur la facture."),
      journal: z.string().optional().describe("Code du journal d'achat (défaut : ACH)."),
    }),
  },
  async ({ dossier, sous_dossier, ice_societe, journal }) => {
    try {
      const d0 = chargerDossier(ROOT, dossier);
      if (ice_societe) {
        const ice = String(ice_societe).replace(/\D/g, "");
        if (ice.length !== 15) return err(`ICE société invalide : attendu 15 chiffres, reçu ${ice.length}.`);
        d0.fiche.ice = ice;
        d0.fiche.cree = d0.fiche.cree || new Date().toISOString().slice(0, 10);
        sauverDossier(d0);
      }

      const { d, propositions, illisibles, scans, source } = await analyser({ dossier, sousDossier: sous_dossier, journal });
      if (!propositions.length && !illisibles.length && !scans.length) {
        return err(`Aucune pièce trouvée dans ${source}. ${RAPPEL_REDEMARRAGE}`);
      }

      // Écrit UNIQUEMENT le tableau de révision et le carnet de codes : le
      // journal, la mémoire et l'historique attendent un accord explicite.
      const periode = periodeDuLot(propositions);
      fs.mkdirSync(d.chemins.base, { recursive: true });
      const fichierRevision = path.join(d.chemins.base, `revision-${periode}.csv`);
      fs.writeFileSync(fichierRevision, revisionCsv(propositions), "utf8");
      sauverDossier(d);

      const premierLot = Object.keys(d.mapping.comptes).length === 0;
      const entete = premierLot
        ? "ℹ️ Premier lot de ce dossier : la mémoire est vide, presque tout part en « à vérifier ». " +
          "C'est normal — chaque compte confirmé maintenant sera automatique au prochain lot.\n\n"
        : "";
      return texte(entete + rendreLot({ propositions, illisibles, scans, fichierRevision }));
    } catch (e) {
      return err(e.message);
    }
  }
);

server.registerTool(
  "apprendre_compte",
  {
    title: "Affecter un fournisseur à un compte de charge, pour ce dossier",
    description:
      "Enregistre « ce fournisseur → ce compte » dans la mémoire du dossier. À utiliser quand l'utilisateur " +
      "tranche une pièce « à vérifier ». Le tiers se désigne par son code (FOURN-002) — jamais par un nom " +
      "que tu aurais reconstitué. Au prochain lot, la pièce sortira automatiquement en « sûre ».",
    inputSchema: z.object({
      dossier: z.string().describe("Nom du dossier client"),
      tiers: z.string().describe("Code du tiers tel qu'affiché dans le plan (ex. « FOURN-002 »), ou à défaut son ICE"),
      compte: z.string().describe("Compte de charge du plan comptable (4 à 10 chiffres, ex. 61325)"),
      libelle: z.string().optional().describe("Libellé du compte, pour la relecture humaine"),
    }),
  },
  async ({ dossier, tiers, compte, libelle }) => {
    try {
      const d = chargerDossier(ROOT, dossier);
      let cible = resoudreCode(d.codes, tiers);
      if (!cible) {
        const ice = String(tiers).replace(/\D/g, "");
        if (ice.length === 15) cible = { nom: null, ice };
      }
      if (!cible) {
        return err(
          `Tiers « ${tiers} » inconnu de ce dossier. Utilise le code affiché dans le plan (ex. FOURN-002) ` +
          `ou l'ICE à 15 chiffres. Relance analyser_lot si le plan date d'une autre conversation.`
        );
      }
      apprendreCompte(d, { nom: cible.nom, ice: cible.ice, compte, libelle });
      sauverDossier(d);
      const code = d.codes.parCle[cleFournisseur(cible)] || tiers;
      return texte(
        `✅ ${code} → compte ${compte}${libelle ? ` (${libelle})` : ""}, mémorisé pour le dossier « ${d.fiche.nom} ».\n` +
        `Mémoire du dossier : ${Object.keys(d.mapping.comptes).length} fournisseur(s) connu(s).\n` +
        `Relance analyser_lot pour voir la pièce basculer en « sûre », ou exporte directement.`
      );
    } catch (e) {
      return err(e.message);
    }
  }
);

server.registerTool(
  "exporter_ecritures",
  {
    title: "Écrire le journal importable + la liste de travail",
    description:
      "Écrit sur le poste : (1) le journal CSV des écritures SÛRES uniquement, prêt à importer dans le logiciel " +
      "comptable, (2) la liste de travail de ce qui reste à vérifier. À n'appeler qu'après accord explicite de " +
      "l'utilisateur sur le plan. Les pièces exportées sont mémorisées pour détecter les doublons au lot suivant.",
    inputSchema: z.object({
      dossier: z.string().describe("Nom du dossier client"),
      sous_dossier: z.string().optional().describe("Où sont les factures (mêmes valeurs que pour analyser_lot)"),
      journal: z.string().optional().describe("Code du journal d'achat (défaut : ACH)"),
      confirmer: z.boolean().describe("Doit être true — confirme que l'utilisateur a vu le plan et l'accepte"),
    }),
  },
  async ({ dossier, sous_dossier, journal, confirmer }) => {
    if (!confirmer) {
      return err("Export annulé (confirmer=false). Montre d'abord le plan d'analyser_lot et demande son accord.");
    }
    try {
      const { d, propositions } = await analyser({ dossier, sousDossier: sous_dossier, journal });
      if (!propositions.length) return err("Aucune pièce lisible à exporter.");

      const sures = propositions.filter((p) => p.statut === "sure");
      const periode = periodeDuLot(propositions);
      fs.mkdirSync(d.chemins.base, { recursive: true });

      const fJournal = path.join(d.chemins.base, `journal-${periode}.csv`);
      const fListe = path.join(d.chemins.base, `a-verifier-${periode}.md`);
      const fRevision = path.join(d.chemins.base, `revision-${periode}.csv`);

      fs.writeFileSync(fRevision, revisionCsv(propositions), "utf8");
      fs.writeFileSync(fListe, listeDeTravailMd(propositions, { dossier: d.fiche.nom, periode, journalFichier: fJournal }), "utf8");
      if (sures.length) fs.writeFileSync(fJournal, journalCsv(propositions), "utf8");

      enregistrerPieces(d.historique, sures.map((p) => ({ cle: p.cle, numero: p.piece, ttc: p.ttc, date: p.date })));
      sauverDossier(d);

      const totalDebit = arrondi(sures.reduce((s, p) => s + (p.ht || 0) + (p.tva || 0), 0));
      return texte([
        `✅ Export terminé — dossier « ${d.fiche.nom} », période ${periode}.`,
        "",
        sures.length
          ? `Journal importable (${sures.length} pièce(s), ${sures.reduce((s, p) => s + p.lignes.length, 0)} lignes, débit ${mad(totalDebit)}) :\n${fJournal}`
          : `Aucune écriture sûre sur ce lot — pas de journal écrit. Tout est dans la liste de travail.`,
        "",
        `À vérifier (${propositions.length - sures.length}) : ${fListe}`,
        `Tableau complet : ${fRevision}`,
        "",
        `Rappel : le journal ne contient AUCUNE pièce douteuse. Une fois les points réglés `,
        `(apprendre_compte, ou correction du justificatif), relance l'export : les pièces réglées basculeront.`,
      ].join("\n"));
    } catch (e) {
      return err(e.message);
    }
  }
);

server.registerTool(
  "etat_dossier",
  {
    title: "Ce que Daftar sait de ce dossier",
    description:
      "Renvoie l'état de la mémoire d'un dossier : ICE de la société, nombre de fournisseurs appris, nombre de " +
      "pièces déjà exportées. Ne renvoie aucune liste nominative.",
    inputSchema: z.object({
      dossier: z.string().describe("Nom du dossier client"),
    }),
  },
  async ({ dossier }) => {
    const d = chargerDossier(ROOT, dossier);
    const socle = chargerSocle(ROOT);
    return texte([
      `Dossier « ${d.fiche.nom} » — ${d.chemins.base}`,
      `ICE société : ${d.fiche.ice || "non renseigné (⚠️ la détection du fournisseur est moins fiable sans lui)"}`,
      `Journal d'achat : ${d.fiche.journal || JOURNAL_DEFAUT}`,
      `Fournisseurs appris pour ce dossier : ${Object.keys(d.mapping.comptes).length}`,
      `Règles du socle cabinet disponibles : ${Object.keys(socle.comptes).length}`,
      `Tiers codés dans le carnet : ${d.codes.entrees.length}`,
      `Pièces déjà exportées (contrôle des doublons) : ${d.historique.pieces.length}`,
    ].join("\n"));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
