import type {
  AnalyzedConversation,
  ModelBreakdown,
  MonthlyReport,
  ParsedConversation,
  Provider,
} from "./types";
import { buildMonthlyReports, mergeReports, monthKey } from "./aggregate";
import { costEur } from "./pricing";
import { buildConsoleRecommendations } from "./recommend";

/**
 * Conversations de démo (contenu synthétique réaliste) pour alimenter
 * l'audit d'usage en mode démo. Profil : fondateur d'un organisme de
 * formation IA qui fait beaucoup de marketing/contenu.
 */
export function buildDemoConversations(now = new Date()): ParsedConversation[] {
  const rand = mulberry32(917531);
  const TEMPLATES: { theme: string; model: string; titles: [string, string][] }[] = [
    {
      theme: "redaction",
      model: "claude-sonnet-5",
      titles: [
        ["Post LinkedIn pour le bootcamp", "Prépare un post LinkedIn qui dirige vers https://demo.academy/bootcamp"],
        ["Post LinkedIn replay webinaire", "Donne moi un post LinkedIn pour renvoyer au replay"],
        ["Caption Instagram pour la formation", "Fais moi une caption IG pour ce post https://demo.academy"],
        ["Reformuler ce message client", "Reformule mieux ce message pour un client"],
        ["Email de relance Brevo", "Prépare un email de relance douce pour ma base Brevo"],
      ],
    },
    {
      theme: "business",
      model: "claude-opus-4-8",
      titles: [
        ["Stratégie social media formation", "Propose des rubriques éditoriales pour https://demo.academy"],
        ["Pitch pour attirer des clients", "Prépare un pitch LinkedIn vers https://demo.academy/bootcamp"],
        ["Onboarding commercial", "Prépare une fiche pour mon commercial sur l'offre bootcamp"],
        ["Scripts commerciaux formation", "Travaille les scripts commerciaux du summer camp"],
      ],
    },
    {
      theme: "code",
      model: "claude-opus-4-8",
      titles: [
        ["App extraction highlights vidéo", "Je veux coder une app qui extrait les highlights d'une vidéo via l'IA"],
        ["Skill facturation marocaine", "Aide moi à éditer le skill facturation avec skill-creator"],
        ["Automatisation make.com leads", "Crée une automatisation make.com pour mes leads LinkedIn en JSON"],
        ["Claude Code setup github", "Comment connecter Claude Code à un nouveau compte github ?"],
      ],
    },
    {
      theme: "data",
      model: "claude-sonnet-5",
      titles: [
        ["Analyse campagne LinkedIn Ads", "Interprète ma campagne LinkedIn Ads lancée aujourd'hui"],
        ["Rapport leads du jour", "Fais un résumé du nombre de leads générés aujourd'hui"],
      ],
    },
    {
      theme: "etudes",
      model: "claude-sonnet-5",
      titles: [
        ["Expliquer le context window", "Explique moi le context window de façon pédagogique"],
        ["Plan de formation Claude", "Élabore un plan de formation Claude de A à Z pour pros"],
      ],
    },
    {
      theme: "pratique",
      model: "claude-haiku-4-5",
      titles: [
        ["Codes promo make.com", "Where can I get make.com promo codes?"],
        ["Config MX records", "Comment configurer les MX records pour mon domaine ?"],
        ["Paiement Meta ads", "Comment payer mes FB ads avec mes fonds ?"],
        ["Installer Claude Code", "Dis moi comment installer Claude Code"],
      ],
    },
  ];

  const convos: ParsedConversation[] = [];
  let id = 0;
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const base = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    // Adoption : quasi rien les 4 premiers mois, explosion sur les 2 derniers
    const count = monthsAgo >= 2 ? 2 + Math.floor(rand() * 3) : 40 + Math.floor(rand() * 15);
    for (let i = 0; i < count; i++) {
      const tpl = TEMPLATES[Math.floor(rand() * TEMPLATES.length)];
      const [title, firstUser] = tpl.titles[Math.floor(rand() * tpl.titles.length)];
      const marathon = rand() < 0.06;
      const oneShot = tpl.theme === "pratique" && rand() < 0.7;
      const turns = marathon ? 16 + Math.floor(rand() * 8) : oneShot ? 1 : 2 + Math.floor(rand() * 5);
      const day = 1 + Math.floor(rand() * daysInMonth);
      const ts = new Date(base.getFullYear(), base.getMonth(), day, 8 + Math.floor(rand() * 13)).getTime();
      const messages = [];
      for (let t = 0; t < turns; t++) {
        messages.push({ role: "user" as const, text: t === 0 ? firstUser : "suite " + t, timestamp: ts + t * 60000 });
        messages.push({ role: "assistant" as const, text: "Réponse détaillée…", timestamp: ts + t * 60000 + 30000 });
      }
      convos.push({
        id: `democonv-${id++}`,
        provider: "claude",
        title,
        model: tpl.model,
        messages,
        createdAt: ts,
      });
    }
  }
  return convos;
}

/**
 * Jeu de données de démonstration : 6 mois d'usage réaliste d'un
 * utilisateur multi-IA, généré de façon déterministe (PRNG seedé)
 * pour que la démo soit identique à chaque visite.
 */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ThemeProfile {
  themeId: string;
  weight: number;
  titles: string[];
  avgTurns: number;
  avgPromptTokens: number;
}

const PROFILES: ThemeProfile[] = [
  {
    themeId: "code",
    weight: 0.3,
    titles: ["Debug script Python", "Refacto composant React", "Requête SQL lente", "Config Docker"],
    avgTurns: 9,
    avgPromptTokens: 350,
  },
  {
    themeId: "redaction",
    weight: 0.22,
    titles: ["Email client délicat", "Post LinkedIn", "Relecture rapport", "Réponse candidature"],
    avgTurns: 4,
    avgPromptTokens: 220,
  },
  {
    themeId: "business",
    weight: 0.16,
    titles: ["Préparation pitch", "Analyse concurrents", "Plan de réunion", "Feedback équipe"],
    avgTurns: 6,
    avgPromptTokens: 300,
  },
  {
    themeId: "etudes",
    weight: 0.12,
    titles: ["Explication statistiques", "Révision certification", "Résumé article"],
    avgTurns: 7,
    avgPromptTokens: 260,
  },
  {
    themeId: "data",
    weight: 0.08,
    titles: ["Analyse CSV ventes", "Formule Excel", "Graphique tendances"],
    avgTurns: 5,
    avgPromptTokens: 400,
  },
  {
    themeId: "creativite",
    weight: 0.06,
    titles: ["Idées de nom produit", "Brainstorm atelier"],
    avgTurns: 5,
    avgPromptTokens: 150,
  },
  {
    themeId: "pratique",
    weight: 0.06,
    titles: ["Itinéraire week-end", "Idées repas semaine", "Choix ordinateur portable"],
    avgTurns: 3,
    avgPromptTokens: 120,
  },
];

const PROVIDERS: { provider: Provider; model: string; weight: number }[] = [
  { provider: "claude", model: "claude-sonnet-5", weight: 0.42 },
  { provider: "claude", model: "claude-opus-4-8", weight: 0.1 },
  { provider: "chatgpt", model: "gpt-5", weight: 0.3 },
  { provider: "chatgpt", model: "gpt-4o-mini", weight: 0.08 },
  { provider: "gemini", model: "gemini-2.5-pro", weight: 0.1 },
];

function pick<T extends { weight: number }>(items: T[], r: number): T {
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (r <= acc) return item;
  }
  return items[items.length - 1];
}

export function buildDemoReports(now = new Date()): MonthlyReport[] {
  const rand = mulberry32(20260711);
  const convos: AnalyzedConversation[] = [];
  let id = 0;

  // 6 mois, avec une intensité qui monte doucement (adoption croissante)
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const base = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const intensity = 0.75 + (5 - monthsAgo) * 0.09; // ~28 → ~42 convos/mois
    const count = Math.round(30 * intensity + rand() * 6);

    for (let i = 0; i < count; i++) {
      const profile = pick(PROFILES, rand());
      const prov = pick(PROVIDERS, rand());
      const turns = Math.max(1, Math.round(profile.avgTurns * (0.4 + rand() * 1.6)));
      // Quelques marathons pour nourrir le coach
      const marathon = rand() < 0.07;
      const userTurns = marathon ? 16 + Math.round(rand() * 10) : turns;

      const promptTokens = profile.avgPromptTokens * (0.5 + rand());
      const answerTokens = promptTokens * (2 + rand() * 2);
      // Contexte cumulé approximé : somme arithmétique des tours
      const perTurn = promptTokens + answerTokens;
      // Facteur ×4 : profil d'utilisateur intensif, pour une démo parlante (~20-30 €/mois)
      const inputTokens = Math.round(((userTurns * (userTurns + 1)) / 2) * perTurn * 2.2);
      const outputTokens = Math.round(userTurns * answerTokens * 4);

      const day = 1 + Math.floor(rand() * daysInMonth);
      const ts = new Date(base.getFullYear(), base.getMonth(), day, 9 + Math.floor(rand() * 11)).getTime();

      convos.push({
        id: `demo-${id++}`,
        provider: prov.provider,
        title: profile.titles[Math.floor(rand() * profile.titles.length)],
        model: prov.model,
        themeId: profile.themeId,
        createdAt: ts,
        month: monthKey(ts),
        userMessages: userTurns,
        assistantMessages: userTurns,
        inputTokens,
        outputTokens,
        costEur: costEur(prov.provider, prov.model, inputTokens, outputTokens),
        longestUserPrompt: Math.round(promptTokens * (rand() < 0.06 ? 12 : 1.4)),
      });
    }
  }

  // Lentille "thématiques" (issue des conversations)
  const themeReports = buildMonthlyReports(convos);
  // Lentille "coût réel par modèle" (façon CSV console) sur les mêmes mois
  const costReports = buildDemoConsoleReports(themeReports);
  // Fusion : coût exact + modèles (console) + thématiques (conversations)
  return mergeReports(themeReports, costReports);
}

/**
 * Synthétise une ventilation par modèle réaliste (Opus, Fable, Sonnet, Haiku)
 * pour chaque mois, façon export Cost du console Anthropic — pour montrer la
 * fonctionnalité "coût par modèle" dans la démo.
 */
function buildDemoConsoleReports(themeReports: MonthlyReport[]): MonthlyReport[] {
  const rand = mulberry32(424242);
  const MODELS: { model: string; label: string; inPrice: number; outPrice: number }[] = [
    { model: "claude-opus-4-8", label: "Claude Opus 4.8", inPrice: 5, outPrice: 25 },
    { model: "claude-fable-5", label: "Claude Fable 5", inPrice: 10, outPrice: 50 },
    { model: "claude-sonnet-5", label: "Claude Sonnet 5", inPrice: 3, outPrice: 15 },
    { model: "claude-haiku-4-5", label: "Claude Haiku 4.5", inPrice: 1, outPrice: 5 },
  ];
  // Répartition de la dépense entre modèles (profil "power user" : Opus dominant)
  const MIX = [0.5, 0.18, 0.24, 0.08];

  const out: MonthlyReport[] = [];
  themeReports.forEach((tr, i) => {
    // Coût réel bien supérieur à l'estimation conversations (usage API + Claude Code)
    const monthTotal = 60 + i * 22 + rand() * 40; // ~60 € → ~200 €
    const models: ModelBreakdown[] = MODELS.map((m, k) => {
      const cost = monthTotal * MIX[k] * (0.8 + rand() * 0.4);
      const usd = cost / 0.92;
      // reconstitution approximative des tokens à partir du coût
      const inputTokens = Math.round(((usd * 0.4) / m.inPrice) * 1_000_000);
      const outputTokens = Math.round(((usd * 0.6) / m.outPrice) * 1_000_000);
      return {
        model: m.model,
        label: m.label,
        costEur: cost,
        inputTokens,
        outputTokens,
        cacheTokens: Math.round(inputTokens * rand() * 0.05),
      };
    }).sort((a, b) => b.costEur - a.costEur);

    const cost = models.reduce((s, m) => s + m.costEur, 0);
    const inTok = models.reduce((s, m) => s + m.inputTokens, 0);
    const outTok = models.reduce((s, m) => s + m.outputTokens, 0);
    const cacheTok = models.reduce((s, m) => s + m.cacheTokens, 0);

    const report: MonthlyReport = {
      month: tr.month,
      source: "console",
      costEur: cost,
      inputTokens: inTok,
      outputTokens: outTok,
      cacheTokens: cacheTok,
      conversations: 0,
      messages: 0,
      avgTurnsPerConversation: 0,
      themes: [],
      providers: [{ provider: "claude", costEur: cost, conversations: 0, tokens: inTok + outTok }],
      models,
      recommendations: [],
    };
    report.recommendations = buildConsoleRecommendations(report, out[out.length - 1] ?? null);
    out.push(report);
  });
  return out;
}
