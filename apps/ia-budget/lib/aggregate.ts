import type {
  AnalyzedConversation,
  MonthlyReport,
  ParsedConversation,
  ProviderBreakdown,
  ThemeBreakdown,
} from "./types";
import { classifyConversation } from "./classify";
import { conversationInputTokens, estimateTokens } from "./tokens";
import { costEur } from "./pricing";
import { buildRecommendations } from "./recommend";

export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function analyzeConversation(convo: ParsedConversation): AnalyzedConversation {
  const turns = convo.messages.map((m) => ({
    role: m.role,
    tokens: estimateTokens(m.text),
  }));
  const inputTokens = conversationInputTokens(turns);
  const outputTokens = turns
    .filter((t, i) => convo.messages[i].role === "assistant")
    .reduce((s, t) => s + t.tokens, 0);
  const userMessages = convo.messages.filter((m) => m.role === "user").length;
  const longestUserPrompt = Math.max(
    0,
    ...convo.messages.filter((m) => m.role === "user").map((m) => estimateTokens(m.text)),
  );

  return {
    id: convo.id,
    provider: convo.provider,
    title: convo.title,
    model: convo.model,
    themeId: classifyConversation(convo),
    createdAt: convo.createdAt,
    month: monthKey(convo.createdAt),
    userMessages,
    assistantMessages: convo.messages.length - userMessages,
    inputTokens,
    outputTokens,
    costEur: costEur(convo.provider, convo.model, inputTokens, outputTokens),
    longestUserPrompt,
  };
}

/** Transforme des conversations analysées en relevés mensuels (agrégats seuls). */
export function buildMonthlyReports(convos: AnalyzedConversation[]): MonthlyReport[] {
  const byMonth = new Map<string, AnalyzedConversation[]>();
  for (const c of convos) {
    const list = byMonth.get(c.month) ?? [];
    list.push(c);
    byMonth.set(c.month, list);
  }

  const months = [...byMonth.keys()].sort();
  const reports: MonthlyReport[] = [];

  for (const month of months) {
    const list = byMonth.get(month)!;
    const themes = new Map<string, ThemeBreakdown>();
    const providers = new Map<string, ProviderBreakdown>();
    let cost = 0,
      inTok = 0,
      outTok = 0,
      messages = 0;

    for (const c of list) {
      cost += c.costEur;
      inTok += c.inputTokens;
      outTok += c.outputTokens;
      messages += c.userMessages + c.assistantMessages;

      const t = themes.get(c.themeId) ?? {
        themeId: c.themeId,
        costEur: 0,
        conversations: 0,
        tokens: 0,
      };
      t.costEur += c.costEur;
      t.conversations += 1;
      t.tokens += c.inputTokens + c.outputTokens;
      themes.set(c.themeId, t);

      const p = providers.get(c.provider) ?? {
        provider: c.provider,
        costEur: 0,
        conversations: 0,
        tokens: 0,
      };
      p.costEur += c.costEur;
      p.conversations += 1;
      p.tokens += c.inputTokens + c.outputTokens;
      providers.set(c.provider, p);
    }

    const previous = reports[reports.length - 1] ?? null;
    const report: MonthlyReport = {
      month,
      source: "conversations",
      costEur: cost,
      inputTokens: inTok,
      outputTokens: outTok,
      cacheTokens: 0,
      conversations: list.length,
      messages,
      avgTurnsPerConversation: list.length ? messages / list.length / 2 : 0,
      themes: [...themes.values()].sort((a, b) => b.costEur - a.costEur),
      providers: [...providers.values()].sort((a, b) => b.costEur - a.costEur),
      models: [],
      recommendations: [],
    };
    report.recommendations = buildRecommendations(list, report, previous);
    reports.push(report);
  }

  return reports;
}

/**
 * Fusionne de nouveaux relevés avec l'existant.
 * Deux lentilles complémentaires par mois :
 *  - console       → coût exact + détail par modèle (source de vérité $)
 *  - conversations → thématiques (sur quoi je parle)
 * Quand les deux existent pour un mois, on combine : le coût et les modèles
 * viennent du console, les thématiques des conversations.
 */
export function mergeReports(existing: MonthlyReport[], incoming: MonthlyReport[]): MonthlyReport[] {
  const map = new Map(existing.map((r) => [r.month, r]));
  for (const r of incoming) {
    const prev = map.get(r.month);
    map.set(r.month, prev ? combine(prev, r) : r);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function combine(a: MonthlyReport, b: MonthlyReport): MonthlyReport {
  // Le plus récent des deux dans chaque rôle l'emporte pour son rôle.
  const console = a.source === "console" ? a : b.source === "console" ? b : null;
  const convo = a.source === "conversations" ? a : b.source === "conversations" ? b : null;
  const money = console ?? b; // fallback : le nouvel import
  const themesFrom = convo ?? (a.themes.length ? a : b);

  return {
    month: money.month,
    source: console ? "console" : money.source,
    costEur: money.costEur,
    inputTokens: money.inputTokens,
    outputTokens: money.outputTokens,
    cacheTokens: money.cacheTokens,
    conversations: themesFrom.conversations,
    messages: themesFrom.messages,
    avgTurnsPerConversation: themesFrom.avgTurnsPerConversation,
    themes: themesFrom.themes,
    providers: money.providers,
    models: money.models,
    // Recos : coût réel prioritaire, complété par les recos thématiques
    recommendations: dedupeRecs([...money.recommendations, ...themesFrom.recommendations]),
  };
}

function dedupeRecs<T extends { id: string; savingEur: number | null }>(recs: T[]): T[] {
  const seen = new Set<string>();
  return recs
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .sort((x, y) => (y.savingEur ?? 0) - (x.savingEur ?? 0));
}
