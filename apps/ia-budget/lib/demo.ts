import type { AnalyzedConversation, MonthlyReport, Provider } from "./types";
import { buildMonthlyReports, monthKey } from "./aggregate";
import { costEur } from "./pricing";

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

  return buildMonthlyReports(convos);
}
