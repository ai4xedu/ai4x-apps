"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppState, MonthlyReport, Provider } from "@/lib/types";
import { loadState, saveState, clearState } from "@/lib/store";
import { themeName } from "@/lib/classify";
import { PROVIDER_LABELS } from "@/lib/pricing";
import { renderShareCard, shareOrDownload } from "@/lib/sharecard";

/* ---------- helpers ---------- */

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : `${Math.round(n / 1000)} k`;

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const MONTHS_FR_SHORT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function monthLabel(month: string, short = false): string {
  const [y, m] = month.split("-").map(Number);
  return short ? `${MONTHS_FR_SHORT[m - 1]} ${String(y).slice(2)}` : `${MONTHS_FR[m - 1]} ${y}`;
}

/** Couleur par entité, jamais par rang (règle data-viz). */
const THEME_COLORS: Record<string, string> = {
  code: "var(--series-1)",
  redaction: "var(--series-2)",
  etudes: "var(--series-3)",
  data: "var(--series-4)",
  business: "var(--series-5)",
  pratique: "var(--series-6)",
  creativite: "var(--series-7)",
  langues: "var(--series-8)",
  autre: "var(--text-muted)",
};

const PROVIDER_COLORS: Record<Provider, string> = {
  claude: "var(--series-8)",
  chatgpt: "var(--series-2)",
  gemini: "var(--series-1)",
};

/** Couleur par famille de modèle (par entité, jamais par rang). */
function modelColor(model: string): string {
  const s = model.toLowerCase();
  if (s.includes("opus")) return "var(--series-5)"; // violet — premium
  if (s.includes("fable")) return "var(--series-6)"; // rouge — le plus cher
  if (s.includes("sonnet")) return "var(--series-1)"; // bleu — équilibré
  if (s.includes("haiku")) return "var(--series-2)"; // aqua — éco
  return "var(--text-muted)";
}

/* ---------- page ---------- */

export default function Dashboard() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [editingTheme, setEditingTheme] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editingSub, setEditingSub] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const s = loadState();
    if (!s || s.reports.length === 0) {
      router.replace("/");
      return;
    }
    setState(s);
    setSelectedMonth(s.reports[s.reports.length - 1].month);
  }, [router]);

  const report = useMemo(
    () => state?.reports.find((r) => r.month === selectedMonth) ?? null,
    [state, selectedMonth],
  );
  const previous = useMemo(() => {
    if (!state || !report) return null;
    const idx = state.reports.findIndex((r) => r.month === report.month);
    return idx > 0 ? state.reports[idx - 1] : null;
  }, [state, report]);

  if (!state || !report || !selectedMonth) return null;

  const { settings } = state;
  const budget = settings.monthlyBudgetEur;
  const budgetRatio = budget > 0 ? report.costEur / budget : 0;
  const delta = previous && previous.costEur > 0 ? (report.costEur - previous.costEur) / previous.costEur : null;
  const totalSavings = report.recommendations.reduce((s, r) => s + (r.savingEur ?? 0), 0);
  const maxThemeCost = Math.max(...report.themes.map((t) => t.costEur), 0.01);
  const themeTotal = report.themes.reduce((s, t) => s + t.costEur, 0) || 1;
  const maxModelCost = Math.max(...report.models.map((m) => m.costEur), 0.01);
  const isExact = report.source === "console";
  const sub = settings.subscriptionEur;
  const roi = sub > 0 ? report.costEur / sub : null; // valeur API équivalente / prix du forfait

  const update = (mut: (s: AppState) => void) => {
    const next = structuredClone(state);
    mut(next);
    saveState(next);
    setState(next);
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      {/* En-tête */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="text-lg font-semibold">
          Relevé <span style={{ color: "var(--series-1)" }}>IA</span>
          {settings.demoMode && (
            <span
              className="ml-3 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              mode démo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="card px-3 py-2 text-sm"
            aria-label="Choisir le mois"
          >
            {[...state.reports].reverse().map((r) => (
              <option key={r.month} value={r.month}>
                {monthLabel(r.month)}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              setSharing(true);
              try {
                const blob = await renderShareCard(
                  report,
                  monthLabel(report.month),
                  settings.themeNames,
                );
                await shareOrDownload(blob, `releve-ia-${report.month}.png`);
              } finally {
                setSharing(false);
              }
            }}
            className="card px-3 py-2 text-sm font-medium"
            title="Générer une image de votre bilan (agrégats uniquement, jamais vos conversations)"
          >
            {sharing ? "Génération…" : "📤 Partager"}
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "var(--series-1)", color: "#fff" }}
          >
            + Importer un mois
          </button>
        </div>
      </header>

      {/* Métrique héros + budget */}
      <section className="card mb-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            {isExact
              ? `Votre dépense Claude de ${monthLabel(report.month)}`
              : `Votre mois d'IA de ${monthLabel(report.month)} vaut`}
          </p>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              color: isExact ? "var(--delta-good)" : "var(--status-serious)",
            }}
            title={
              isExact
                ? "Coût facturé réel, issu du CSV Usage/Cost du console Anthropic."
                : "Estimation depuis l'export de conversations (texte du chat uniquement) — importez le CSV du console pour le coût réel."
            }
          >
            {isExact ? "✓ coût réel (console)" : "≈ estimation (chat)"}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-4">
          <span className="text-5xl font-bold tracking-tight">{fmtEur(report.costEur)}</span>
          {delta !== null && (
            <span
              className="text-sm font-semibold"
              style={{ color: delta > 0 ? "var(--status-serious)" : "var(--delta-good)" }}
            >
              {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))} % vs {monthLabel(previous!.month, true)}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          {isExact ? (
            <>
              Dépense réelle facturée au token (API + Claude Code + crédits) —{" "}
              {fmtTokens(report.inputTokens + report.outputTokens)} tokens sur {report.models.length}{" "}
              modèle{report.models.length > 1 ? "s" : ""}.
            </>
          ) : (
            <>
              Estimation de ce que cet usage aurait coûté au token — {report.conversations}{" "}
              conversations, {fmtTokens(report.inputTokens + report.outputTokens)} tokens. Pour le
              coût réel par modèle, importez le CSV du console.
            </>
          )}
        </p>

        {/* Rentabilité de l'abonnement */}
        {sub > 0 && isExact && (
          <p
            className="mt-3 rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
          >
            <span aria-hidden>💡 </span>
            Votre forfait à{" "}
            <button
              className="font-semibold underline decoration-dotted"
              onClick={() => setEditingSub(true)}
            >
              {editingSub ? "" : fmtEur(sub)}
            </button>
            {editingSub && (
              <input
                type="number"
                min={0}
                defaultValue={sub}
                autoFocus
                className="card w-20 px-2 py-0.5 tabular"
                onBlur={(e) => {
                  update((s) => void (s.settings.subscriptionEur = Math.max(0, Number(e.target.value) || 0)));
                  setEditingSub(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
            )}{" "}
            vous a rapporté <strong>{fmtEur(report.costEur)}</strong> de valeur API —{" "}
            <strong style={{ color: "var(--delta-good)" }}>rentabilisé ×{roi!.toFixed(1)}</strong>.
          </p>
        )}

        {/* Jauge de budget */}
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>
              Budget mensuel :{" "}
              {editingBudget ? (
                <input
                  type="number"
                  min={1}
                  defaultValue={budget}
                  autoFocus
                  className="card w-20 px-2 py-0.5 tabular"
                  onBlur={(e) => {
                    const v = Math.max(1, Number(e.target.value) || budget);
                    update((s) => void (s.settings.monthlyBudgetEur = v));
                    setEditingBudget(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <button className="font-semibold underline decoration-dotted" onClick={() => setEditingBudget(true)}>
                  {fmtEur(budget)}
                </button>
              )}
            </span>
            <span className="tabular font-medium" style={{ color: "var(--text-secondary)" }}>
              {Math.round(budgetRatio * 100)} %
            </span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full"
            style={{ background: "var(--grid)" }}
            role="progressbar"
            aria-valuenow={Math.round(budgetRatio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Consommation du budget mensuel"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, budgetRatio * 100)}%`,
                background:
                  budgetRatio > 1
                    ? "var(--status-critical)"
                    : budgetRatio > 0.8
                      ? "var(--status-warning)"
                      : "var(--status-good)",
              }}
            />
          </div>
          <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {budgetRatio > 1
              ? `Budget dépassé de ${fmtEur(report.costEur - budget)} — les conseils ci-dessous peuvent aider.`
              : `Encore ${fmtEur(budget - report.costEur)} de marge ce mois-ci.`}
          </p>
        </div>
      </section>

      {/* Par modèle — le détail Opus / Fable / Sonnet / Haiku (source console) */}
      {report.models.length > 0 && (
        <section className="card mb-6 p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">Par modèle</h2>
            <span className="text-xs" style={{ color: "var(--delta-good)" }}>
              coût réel facturé
            </span>
          </div>
          <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
            Ce que chaque modèle vous a réellement coûté ce mois-ci.
          </p>
          <ul className="space-y-3">
            {report.models.map((m) => {
              const pct = report.costEur > 0 ? (m.costEur / report.costEur) * 100 : 0;
              return (
                <li key={m.model}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: modelColor(m.model) }}
                        aria-hidden
                      />
                      <span className="truncate font-medium">{m.label}</span>
                    </span>
                    <span className="tabular shrink-0 font-semibold">{fmtEur(m.costEur)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--grid)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(m.costEur / maxModelCost) * 100}%`, background: modelColor(m.model) }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    {Math.round(pct)} % de la dépense · {fmtTokens(m.inputTokens)} in ·{" "}
                    {fmtTokens(m.outputTokens)} out
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* Par thématique */}
        <section className="card p-6">
          <h2 className="mb-1 font-semibold">
            Par thématique
            {report.themes.length === 0 && (
              <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                — importez un export chat
              </span>
            )}
          </h2>
          <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
            Détection automatique — cliquez sur un nom pour le renommer.
          </p>
          {report.themes.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Les thématiques viennent de l&apos;export de conversations (claude.ai → Exporter mes
              données). Le CSV du console ne contient pas le contenu des chats — glissez aussi votre
              zip d&apos;export pour voir sur quels sujets part votre budget.
            </p>
          )}
          <ul className="space-y-3">
            {report.themes.map((t) => {
              const name = themeName(t.themeId, settings.themeNames);
              const pct = (t.costEur / themeTotal) * 100;
              return (
                <li key={t.themeId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: THEME_COLORS[t.themeId] ?? "var(--text-muted)" }}
                        aria-hidden
                      />
                      {editingTheme === t.themeId ? (
                        <input
                          defaultValue={name}
                          autoFocus
                          className="card w-40 px-2 py-0.5 text-sm"
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v) update((s) => void (s.settings.themeNames[t.themeId] = v));
                            setEditingTheme(null);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        />
                      ) : (
                        <button
                          className="truncate text-left hover:underline"
                          onClick={() => setEditingTheme(t.themeId)}
                          title="Renommer cette thématique"
                        >
                          {name}
                        </button>
                      )}
                    </span>
                    <span className="tabular shrink-0 font-medium">{fmtEur(t.costEur)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--grid)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(t.costEur / maxThemeCost) * 100}%`,
                        background: THEME_COLORS[t.themeId] ?? "var(--text-muted)",
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    {t.conversations} conv. · {Math.round(pct)} % de vos échanges
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Par outil + tendance */}
        <div className="flex flex-col gap-6">
          <section className="card p-6">
            <h2 className="mb-4 font-semibold">Par outil</h2>
            <ul className="space-y-3">
              {report.providers.map((p) => (
                <li key={p.provider} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: PROVIDER_COLORS[p.provider] }}
                      aria-hidden
                    />
                    {PROVIDER_LABELS[p.provider]}
                    <span style={{ color: "var(--text-muted)" }}>· {p.conversations} conv.</span>
                  </span>
                  <span className="tabular font-medium">{fmtEur(p.costEur)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="mb-1 font-semibold">Tendance</h2>
            <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
              Coût équivalent par mois, ligne pointillée = budget.
            </p>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <LineChart
                  data={state.reports.map((r) => ({
                    month: monthLabel(r.month, true),
                    cout: Number(r.costEur.toFixed(2)),
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                >
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--baseline)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit=" €"
                  />
                  <Tooltip
                    formatter={(v) => [fmtEur(Number(v)), "Coût équivalent"]}
                    contentStyle={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--text-primary)",
                    }}
                  />
                  <ReferenceLine y={budget} stroke="var(--text-muted)" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="cout"
                    stroke="var(--series-1)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--series-1)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>

      {/* Coach */}
      <section className="card mb-6 p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">💡 Les conseils de votre coach</h2>
          {totalSavings > 0 && (
            <span className="text-sm font-medium" style={{ color: "var(--delta-good)" }}>
              Jusqu&apos;à {fmtEur(totalSavings)}/mois d&apos;économies identifiées
            </span>
          )}
        </div>
        <ul className="space-y-4">
          {report.recommendations.map((rec) => (
            <li key={rec.id} className="flex gap-3">
              <span className="mt-0.5 text-lg" aria-hidden>
                {rec.kind === "economie" ? "💶" : rec.kind === "encouragement" ? "🎉" : "🧭"}
              </span>
              <div>
                <p className="font-medium">
                  {rec.title}
                  {rec.savingEur !== null && (
                    <span className="ml-2 text-sm font-semibold" style={{ color: "var(--delta-good)" }}>
                      ≈ {fmtEur(rec.savingEur)}/mois
                    </span>
                  )}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {rec.message}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>
          🔒 Analyse 100 % locale — seuls les totaux mensuels sont conservés dans ce navigateur,
          jamais vos conversations.{" "}
          {isExact
            ? "Coût réel issu du CSV Usage/Cost du console Anthropic, converti en euros."
            : "Coûts estimés (±15 %) sur la base des tarifs API publics."}
        </span>
        <button
          className="underline"
          onClick={() => {
            clearState();
            router.push("/");
          }}
        >
          Tout effacer
        </button>
      </footer>
    </main>
  );
}
