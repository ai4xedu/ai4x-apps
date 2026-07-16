import type { ModelBreakdown, MonthlyReport, ProviderBreakdown } from "./types";
import { parseCsv } from "./csv";
import { ParseError } from "./parsers";
import { USD_TO_EUR, resolvePrice } from "./pricing";
import { buildConsoleRecommendations } from "./recommend";

/**
 * Ingestion du CSV Usage/Cost d'Anthropic (console.anthropic.com → Usage ou Cost
 * → Export). C'est la SOURCE DE VÉRITÉ financière : coût exact, par modèle, par
 * jour — couvre l'API, Claude Code et les crédits.
 *
 * Le format exact des colonnes varie selon la vue exportée, donc on auto-détecte
 * les colonnes par nom (FR/EN, plusieurs alias). Le coût est pris tel quel s'il
 * est présent (export Cost) ; sinon reconstruit depuis les tokens (export Usage)
 * via la grille tarifaire.
 */

interface ColumnMap {
  date: number;
  model: number;
  cost: number; // -1 si absent
  input: number; // -1 si absent
  output: number; // -1 si absent
  cache: number; // -1 si absent
  currency: number; // -1 si absent
}

const ALIASES = {
  date: ["date", "day", "usage_date", "start", "starting_at", "période", "periode", "jour"],
  model: ["model", "modèle", "modele", "line_item", "description", "sku"],
  cost: ["cost", "amount", "usd", "amount_usd", "spend", "coût", "cout", "montant", "total"],
  input: ["input", "input_tokens", "prompt_tokens", "tokens_in", "entrée", "entree"],
  output: ["output", "output_tokens", "completion_tokens", "tokens_out", "sortie"],
  cache: ["cache", "cache_read", "cache_creation", "cached"],
  currency: ["currency", "devise"],
};

function detectColumns(header: string[]): ColumnMap {
  const norm = header.map((h) => h.toLowerCase().trim());
  const find = (aliases: string[]) => {
    // priorité aux correspondances exactes, puis inclusions
    for (const a of aliases) {
      const exact = norm.indexOf(a);
      if (exact !== -1) return exact;
    }
    for (const a of aliases) {
      const idx = norm.findIndex((h) => h.includes(a));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  return {
    date: find(ALIASES.date),
    model: find(ALIASES.model),
    cost: find(ALIASES.cost),
    input: find(ALIASES.input),
    output: find(ALIASES.output),
    cache: find(ALIASES.cache),
    currency: find(ALIASES.currency),
  };
}

function toMonth(dateStr: string): string | null {
  const s = dateStr.trim();
  // formats courants : 2026-07-15, 2026-07, 15/07/2026, 2026/07/15
  let m = s.match(/^(\d{4})[-/](\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2]}`;
  const d = Date.parse(s);
  if (!Number.isNaN(d)) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}

function num(v: string | undefined): number {
  if (!v) return 0;
  // gère "1 234,56", "1,234.56", "$12.34"
  const cleaned = v.replace(/[^0-9,.-]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // le dernier séparateur est le décimal
    return Number(cleaned.replace(/,/g, "")) || 0;
  }
  if (cleaned.includes(",")) return Number(cleaned.replace(",", ".")) || 0;
  return Number(cleaned) || 0;
}

function modelLabel(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("opus")) return `Claude Opus${extractVersion(s)}`;
  if (s.includes("sonnet")) return `Claude Sonnet${extractVersion(s)}`;
  if (s.includes("haiku")) return `Claude Haiku${extractVersion(s)}`;
  if (s.includes("fable")) return "Claude Fable 5";
  return raw.trim() || "Claude";
}

function extractVersion(s: string): string {
  // capture la version qui suit le nom du modèle : "-5", "-4-8", "-4-5", "4.6"…
  const m = s.match(/(?:opus|sonnet|haiku|fable)[-_ ]?(\d+(?:[-._]\d+)?)/);
  return m ? ` ${m[1].replace(/[-_]/g, ".")}` : "";
}

/** Regroupe les lignes du CSV en relevés mensuels avec détail par modèle. */
export function parseConsoleCsv(text: string): MonthlyReport[] {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new ParseError("Le CSV est vide ou ne contient qu'un en-tête.");
  }
  const header = rows[0];
  const cols = detectColumns(header);

  if (cols.date === -1) {
    throw new ParseError(
      `Colonne de date introuvable dans le CSV. En-têtes détectés : ${header.join(", ")}. Exportez la vue Usage ou Cost depuis console.anthropic.com.`,
    );
  }
  if (cols.cost === -1 && cols.input === -1 && cols.output === -1) {
    throw new ParseError(
      `Ni colonne de coût ni colonnes de tokens trouvées. En-têtes : ${header.join(", ")}. Il faut l'export Usage (tokens) ou Cost (montant) du console Anthropic.`,
    );
  }

  // month -> model -> agrégat
  const byMonth = new Map<string, Map<string, ModelBreakdown>>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const month = toMonth(r[cols.date] ?? "");
    if (!month) continue;
    const rawModel = cols.model !== -1 ? r[cols.model] : "claude";
    const modelKey = (rawModel || "claude").trim().toLowerCase();

    const input = cols.input !== -1 ? num(r[cols.input]) : 0;
    const output = cols.output !== -1 ? num(r[cols.output]) : 0;
    const cache = cols.cache !== -1 ? num(r[cols.cache]) : 0;

    // Coût : direct si présent (converti en €), sinon reconstruit depuis les tokens
    let costEur: number;
    if (cols.cost !== -1) {
      const raw = num(r[cols.cost]);
      const cur = cols.currency !== -1 ? (r[cols.currency] ?? "").toUpperCase() : "";
      costEur = cur.includes("EUR") ? raw : raw * USD_TO_EUR;
    } else {
      const p = resolvePrice("claude", modelKey);
      costEur =
        ((input / 1_000_000) * p.inputPerMTok + (output / 1_000_000) * p.outputPerMTok) *
        USD_TO_EUR;
    }

    const monthMap = byMonth.get(month) ?? new Map<string, ModelBreakdown>();
    const agg = monthMap.get(modelKey) ?? {
      model: modelKey,
      label: modelLabel(rawModel),
      costEur: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
    };
    agg.costEur += costEur;
    agg.inputTokens += input;
    agg.outputTokens += output;
    agg.cacheTokens += cache;
    monthMap.set(modelKey, agg);
    byMonth.set(month, monthMap);
  }

  if (byMonth.size === 0) {
    throw new ParseError(
      "Aucune ligne datée exploitable trouvée dans le CSV. Vérifiez le format de la colonne de date.",
    );
  }

  const months = [...byMonth.keys()].sort();
  const reports: MonthlyReport[] = [];
  for (const month of months) {
    const models = [...byMonth.get(month)!.values()].sort((a, b) => b.costEur - a.costEur);
    const cost = models.reduce((s, m) => s + m.costEur, 0);
    const inTok = models.reduce((s, m) => s + m.inputTokens, 0);
    const outTok = models.reduce((s, m) => s + m.outputTokens, 0);
    const cacheTok = models.reduce((s, m) => s + m.cacheTokens, 0);

    const providers: ProviderBreakdown[] = [
      { provider: "claude", costEur: cost, conversations: 0, tokens: inTok + outTok },
    ];
    const report: MonthlyReport = {
      month,
      source: "console",
      costEur: cost,
      inputTokens: inTok,
      outputTokens: outTok,
      cacheTokens: cacheTok,
      conversations: 0,
      messages: 0,
      avgTurnsPerConversation: 0,
      themes: [],
      providers,
      models,
      recommendations: [],
    };
    report.recommendations = buildConsoleRecommendations(
      report,
      reports[reports.length - 1] ?? null,
    );
    reports.push(report);
  }
  return reports;
}
