import type { Provider } from "./types";

/**
 * Grille de prix API indicative (USD par million de tokens).
 * C'est la base du "coût équivalent" : ce que l'usage aurait coûté
 * s'il avait été facturé au token via l'API de chaque fournisseur.
 * Mise à jour : juillet 2026. Modifiable sans toucher au reste du code.
 */
interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
  label: string;
}

export const USD_TO_EUR = 0.92;

const CLAUDE_PRICES: Record<string, ModelPrice> = {
  "claude-fable-5": { inputPerMTok: 10, outputPerMTok: 50, label: "Claude Fable 5" },
  "claude-opus-4-8": { inputPerMTok: 5, outputPerMTok: 25, label: "Claude Opus 4.8" },
  "claude-opus": { inputPerMTok: 5, outputPerMTok: 25, label: "Claude Opus" },
  "claude-sonnet-5": { inputPerMTok: 3, outputPerMTok: 15, label: "Claude Sonnet 5" },
  "claude-sonnet": { inputPerMTok: 3, outputPerMTok: 15, label: "Claude Sonnet" },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5, label: "Claude Haiku 4.5" },
  "claude-haiku": { inputPerMTok: 1, outputPerMTok: 5, label: "Claude Haiku" },
};

const CHATGPT_PRICES: Record<string, ModelPrice> = {
  "gpt-5": { inputPerMTok: 1.25, outputPerMTok: 10, label: "GPT-5" },
  "gpt-5-mini": { inputPerMTok: 0.25, outputPerMTok: 2, label: "GPT-5 mini" },
  "gpt-4o": { inputPerMTok: 2.5, outputPerMTok: 10, label: "GPT-4o" },
  "gpt-4o-mini": { inputPerMTok: 0.15, outputPerMTok: 0.6, label: "GPT-4o mini" },
  o3: { inputPerMTok: 2, outputPerMTok: 8, label: "o3" },
  "gpt-4": { inputPerMTok: 30, outputPerMTok: 60, label: "GPT-4" },
};

const GEMINI_PRICES: Record<string, ModelPrice> = {
  "gemini-2.5-pro": { inputPerMTok: 1.25, outputPerMTok: 10, label: "Gemini 2.5 Pro" },
  "gemini-2.5-flash": { inputPerMTok: 0.3, outputPerMTok: 2.5, label: "Gemini 2.5 Flash" },
};

const DEFAULT_BY_PROVIDER: Record<Provider, ModelPrice> = {
  claude: CLAUDE_PRICES["claude-sonnet"],
  chatgpt: CHATGPT_PRICES["gpt-5"],
  gemini: GEMINI_PRICES["gemini-2.5-pro"],
};

/** Un modèle est "premium" si son prix de sortie dépasse ce seuil ($/MTok). */
export const PREMIUM_OUTPUT_THRESHOLD = 15;

export function resolvePrice(provider: Provider, model: string): ModelPrice {
  const slug = model.toLowerCase();
  const tables =
    provider === "claude" ? CLAUDE_PRICES : provider === "chatgpt" ? CHATGPT_PRICES : GEMINI_PRICES;
  // Correspondance par préfixe : "gpt-4o-2024-08-06" → "gpt-4o"
  const keys = Object.keys(tables).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (slug.startsWith(key) || slug.includes(key)) return tables[key];
  }
  return DEFAULT_BY_PROVIDER[provider];
}

export function costEur(
  provider: Provider,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = resolvePrice(provider, model);
  const usd =
    (inputTokens / 1_000_000) * p.inputPerMTok + (outputTokens / 1_000_000) * p.outputPerMTok;
  return usd * USD_TO_EUR;
}

export function isPremiumModel(provider: Provider, model: string): boolean {
  return resolvePrice(provider, model).outputPerMTok >= PREMIUM_OUTPUT_THRESHOLD;
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
};
