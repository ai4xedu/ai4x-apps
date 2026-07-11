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

export interface Recommendation {
  id: string;
  title: string;
  message: string;
  savingEur: number | null; // estimation d'économie mensuelle, null si non chiffrable
  kind: "economie" | "bonne-pratique" | "encouragement";
}

/** Agrégat mensuel — la seule donnée persistée (aucun contenu de conversation). */
export interface MonthlyReport {
  month: string; // "2026-07"
  costEur: number;
  inputTokens: number;
  outputTokens: number;
  conversations: number;
  messages: number;
  avgTurnsPerConversation: number;
  themes: ThemeBreakdown[];
  providers: ProviderBreakdown[];
  recommendations: Recommendation[];
}

export interface Settings {
  monthlyBudgetEur: number;
  /** Renommages utilisateur : themeId -> libellé personnalisé */
  themeNames: Record<string, string>;
  demoMode: boolean;
}

export interface AppState {
  version: 1;
  reports: MonthlyReport[]; // triés par mois croissant
  settings: Settings;
}
