export type Provider = "claude" | "chatgpt" | "gemini";

export interface ParsedMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: number; // epoch ms
}

export interface ParsedConversation {
  id: string;
  provider: Provider;
  title: string;
  model: string; // model slug as found in the export, or provider default
  messages: ParsedMessage[];
  createdAt: number;
}

/** Conversation enrichie après analyse locale (jamais envoyée nulle part). */
export interface AnalyzedConversation {
  id: string;
  provider: Provider;
  title: string;
  model: string;
  themeId: string;
  createdAt: number;
  month: string; // "2026-07"
  userMessages: number;
  assistantMessages: number;
  inputTokens: number; // estimation, contexte cumulé inclus
  outputTokens: number;
  costEur: number;
  longestUserPrompt: number; // en tokens estimés
}

export interface ThemeBreakdown {
  themeId: string;
  costEur: number;
  conversations: number;
  tokens: number;
}

export interface ProviderBreakdown {
  provider: Provider;
  costEur: number;
  conversations: number;
  tokens: number;
}

/** Ventilation par modèle — vient du CSV de coût console (source de vérité). */
export interface ModelBreakdown {
  model: string; // slug tel qu'affiché par le console, ex. "claude-opus-4-8"
  label: string;
  costEur: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
}

export interface Recommendation {
  id: string;
  title: string;
  message: string;
  savingEur: number | null; // estimation d'économie mensuelle, null si non chiffrable
  kind: "economie" | "bonne-pratique" | "encouragement";
}

/**
 * Provenance des chiffres d'un mois :
 * - "console"       : CSV Usage/Cost d'Anthropic → coût EXACT + détail par modèle.
 * - "conversations" : export chat → coût ESTIMÉ + thématiques (pas de modèle).
 */
export type ReportSource = "console" | "conversations";

/** Agrégat mensuel — la seule donnée persistée (aucun contenu de conversation). */
export interface MonthlyReport {
  month: string; // "2026-07"
  source: ReportSource;
  costEur: number; // exact si console, estimé si conversations
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  conversations: number; // 0 si source console
  messages: number;
  avgTurnsPerConversation: number;
  themes: ThemeBreakdown[]; // vide si source console
  providers: ProviderBreakdown[];
  models: ModelBreakdown[]; // vide si source conversations
  recommendations: Recommendation[];
}

export interface Settings {
  monthlyBudgetEur: number;
  /** Coût réel du forfait chat (Claude Max/Pro), € par mois. 0 = pas de forfait. */
  subscriptionEur: number;
  /** Renommages utilisateur : themeId -> libellé personnalisé */
  themeNames: Record<string, string>;
  demoMode: boolean;
}

export interface AppState {
  version: 1;
  reports: MonthlyReport[]; // triés par mois croissant
  settings: Settings;
}
