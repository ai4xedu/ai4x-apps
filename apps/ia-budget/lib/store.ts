import type { AppState, MonthlyReport, Settings } from "./types";

/**
 * Persistance locale (localStorage) : seuls les AGRÉGATS mensuels et les
 * réglages sont stockés — jamais le contenu des conversations.
 * C'est la garantie technique de la promesse "100 % local".
 */

const KEY = "ia-budget:v1";

const DEFAULT_SETTINGS: Settings = {
  monthlyBudgetEur: 30,
  subscriptionEur: 0,
  themeNames: {},
  demoMode: false,
};

export function loadState(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function newState(reports: MonthlyReport[], demoMode: boolean): AppState {
  return {
    version: 1,
    reports,
    audit: null,
    settings: { ...DEFAULT_SETTINGS, demoMode },
  };
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
