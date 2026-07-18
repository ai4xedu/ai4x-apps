"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AppState } from "@/lib/types";
import { loadState, clearState } from "@/lib/store";

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

const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthShort = (m: string) => {
  const [y, mm] = m.split("-").map(Number);
  return `${MONTHS_FR[mm - 1]} ${String(y).slice(2)}`;
};
const monthFull = (m: string) => {
  const full = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const [y, mm] = m.split("-").map(Number);
  return `${full[mm - 1]} ${y}`;
};

const UNLOCK_KEY = "ia-audit:unlocked";

export default function AuditPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadState();
    if (!s || !s.audit) {
      router.replace("/");
      return;
    }
    setState(s);
    try {
      setUnlocked(window.localStorage.getItem(UNLOCK_KEY) === "1");
    } catch {}
  }, [router]);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setGateError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, score: a?.maturity.score, level: a?.maturity.level }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) throw new Error(data.error || "Échec de l'envoi.");
      try {
        window.localStorage.setItem(UNLOCK_KEY, "1");
      } catch {}
      setUnlocked(true);
    } catch (err) {
      setGateError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!state || !state.audit) return null;
  const a = state.audit;
  const maxMonth = Math.max(...a.perMonth.map((m) => m.count), 1);
  const maxTheme = Math.max(...a.themes.map((t) => t.count), 1);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="text-lg font-semibold">
          Audit <span style={{ color: "var(--series-1)" }}>IA</span>
          {state.settings.demoMode && (
            <span
              className="ml-3 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              mode démo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.reports.length > 0 && (
            <Link href="/dashboard" className="card px-3 py-2 text-sm font-medium">
              💶 Voir les coûts
            </Link>
          )}
          <button
            onClick={() => router.push("/")}
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "var(--series-1)", color: "#fff" }}
          >
            + Nouvel import
          </button>
        </div>
      </header>

      {/* Hero : maturité */}
      <section className="card mb-6 p-6">
        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Votre audit d&apos;usage de l&apos;IA — {a.periodeLabel}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight">{a.maturity.score}</span>
              <span className="text-lg" style={{ color: "var(--text-muted)" }}>/100</span>
            </div>
            <p className="mt-1 text-lg font-semibold" style={{ color: "var(--series-1)" }}>
              Niveau : {a.maturity.level}
            </p>
          </div>
          <div className="min-w-[180px] flex-1">
            <div className="mb-1.5 h-3 overflow-hidden rounded-full" style={{ background: "var(--grid)" }}>
              <div className="h-full rounded-full" style={{ width: `${a.maturity.score}%`, background: "var(--series-1)" }} />
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Prochain palier : <strong>{a.maturity.nextLevel}</strong> — voir le playbook ci-dessous.
            </p>
          </div>
        </div>
        {a.maturity.signals.length > 0 && (
          <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Ce qui tire votre niveau vers le haut : {a.maturity.signals.join(", ")}.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span><strong>{a.totalConversations}</strong> conversations</span>
          <span><strong>{a.avgExchanges}</strong> échanges/conv. en moyenne</span>
          <span><strong>{a.oneShotPct}%</strong> de questions ponctuelles</span>
          {a.toolPct > 0 && <span><strong>{a.toolPct}%</strong> avec outils/code</span>}
        </div>
      </section>

      {/* Adoption */}
      <section className="card mb-6 p-6">
        <h2 className="mb-1 font-semibold">Votre courbe d&apos;adoption</h2>
        {a.adoptionInflection ? (
          <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Bascule nette en <strong>{monthFull(a.adoptionInflection)}</strong> : c&apos;est le moment où
            vous êtes passé d&apos;un usage occasionnel à un usage intensif.
          </p>
        ) : (
          <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Répartition de vos conversations dans le temps.
          </p>
        )}
        <div className="flex items-end gap-1.5" style={{ height: 140 }}>
          {a.perMonth.map((m) => (
            <div key={m.month} className="flex h-full flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${(m.count / maxMonth) * 100}%`,
                    minHeight: m.count > 0 ? 3 : 0,
                    background: m.month === a.adoptionInflection ? "var(--series-6)" : "var(--series-1)",
                  }}
                  title={`${m.count} conversations`}
                />
              </div>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{monthShort(m.month)}</span>
              <span className="text-[10px] tabular font-medium">{m.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Portefeuille de tâches */}
      <section className="card mb-6 p-6">
        <h2 className="mb-1 font-semibold">À quoi vous servez de l&apos;IA</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
          Répartition de vos conversations par type de tâche.
        </p>
        <ul className="space-y-3">
          {a.themes.slice(0, 8).map((t) => (
            <li key={t.themeId}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: THEME_COLORS[t.themeId] ?? "var(--text-muted)" }} aria-hidden />
                  {t.label}
                </span>
                <span className="tabular font-medium">{t.count} · {t.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--grid)" }}>
                <div className="h-full rounded-full" style={{ width: `${(t.count / maxTheme) * 100}%`, background: THEME_COLORS[t.themeId] ?? "var(--text-muted)" }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* PORTE EMAIL : le playbook et les tâches récurrentes sont le "reveal" */}
      {!unlocked && (
        <section className="card mb-6 p-6 text-center" style={{ borderColor: "var(--series-1)", borderWidth: 2 }}>
          <p className="text-3xl" aria-hidden>🔓</p>
          <h2 className="mt-2 text-xl font-semibold">Débloquez votre playbook complet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
            Vous avez votre score. Recevez maintenant vos <strong>tâches récurrentes à
            industrialiser</strong> et votre <strong>plan d&apos;action priorisé</strong> pour passer
            au niveau <strong>{a.maturity.nextLevel}</strong>.
          </p>
          <form onSubmit={submitEmail} className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="card flex-1 px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--baseline)" }}
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg px-5 py-2.5 text-sm font-medium"
              style={{ background: "var(--series-1)", color: "#fff", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "…" : "Voir mon playbook →"}
            </button>
          </form>
          {gateError && (
            <p className="mt-2 text-sm" style={{ color: "var(--status-critical)" }}>{gateError}</p>
          )}
          <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
            🔒 Seul votre email est envoyé — vos conversations restent dans votre navigateur.
          </p>
        </section>
      )}

      {unlocked && (
        <>
      {/* Tâches récurrentes */}
      {a.recurringTasks.length > 0 && (
        <section className="card mb-6 p-6">
          <h2 className="mb-1 font-semibold">🔁 Vos tâches récurrentes (à industrialiser)</h2>
          <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
            Ces tâches reviennent souvent — chacune est un candidat idéal pour un Skill ou un template réutilisable.
          </p>
          <ul className="space-y-2">
            {a.recurringTasks.map((t) => (
              <li key={t.label} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
                <span className="font-medium">{t.label}</span>
                <span className="tabular shrink-0" style={{ color: "var(--series-1)" }}>{t.count}× </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Playbook */}
      <section className="card mb-6 p-6">
        <h2 className="mb-1 font-semibold">🎯 Votre playbook d&apos;optimisation</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
          Les actions à plus fort impact, classées par priorité.
        </p>
        <ol className="space-y-4">
          {a.playbook.map((p, i) => (
            <li key={p.id} className="flex gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "var(--series-1)", color: "#fff" }}
              >
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{p.body}</p>
                <p className="mt-1 text-xs font-medium" style={{ color: "var(--delta-good)" }}>→ {p.impact}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA (lead magnet) */}
      <section className="card mb-6 p-6 text-center" style={{ borderColor: "var(--series-1)", borderWidth: 2 }}>
        <h2 className="mb-2 text-xl font-semibold">Envie d&apos;appliquer ce playbook ?</h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Transformer vos tâches récurrentes en Skills, monter vos Projects, passer à l&apos;orchestration :
          c&apos;est exactement ce qu&apos;on enseigne. Découvrez la formation.
        </p>
        <a
          href="https://ai4x.academy/claude-bootcamp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg px-5 py-2.5 font-medium"
          style={{ background: "var(--series-1)", color: "#fff" }}
        >
          Découvrir la formation →
        </a>
      </section>
        </>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>
          🔒 Analyse 100 % locale — vos conversations ne quittent jamais ce navigateur. Seuls les insights
          agrégés sont conservés, jamais le texte de vos échanges.
        </span>
        <button className="underline" onClick={() => { clearState(); router.push("/"); }}>
          Tout effacer
        </button>
      </footer>
    </main>
  );
}
