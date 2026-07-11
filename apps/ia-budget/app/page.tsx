"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseExport, ParseError } from "@/lib/parsers";
import { analyzeConversation, buildMonthlyReports, mergeReports } from "@/lib/aggregate";
import { buildDemoReports } from "@/lib/demo";
import { loadState, newState, saveState } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setHasData((loadState()?.reports.length ?? 0) > 0);
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        const allReports = [];
        for (const file of Array.from(files)) {
          const raw = await file.text();
          const convos = parseExport(raw);
          const analyzed = convos.map(analyzeConversation);
          allReports.push(...buildMonthlyReports(analyzed));
        }
        const existing = loadState();
        const merged = mergeReports(
          existing && !existing.settings.demoMode ? existing.reports : [],
          allReports,
        );
        const state = existing && !existing.settings.demoMode ? existing : newState([], false);
        state.reports = merged;
        state.settings.demoMode = false;
        saveState(state);
        router.push("/dashboard");
      } catch (e) {
        setError(
          e instanceof ParseError
            ? e.message
            : "Impossible d'analyser ce fichier. Vérifiez qu'il s'agit bien du conversations.json de votre export.",
        );
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const startDemo = useCallback(() => {
    saveState(newState(buildDemoReports(), true));
    router.push("/dashboard");
  }, [router]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12 flex items-center justify-between">
        <div className="text-lg font-semibold">
          Relevé <span style={{ color: "var(--series-1)" }}>IA</span>
        </div>
        {hasData && (
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--series-1)", color: "#fff" }}
          >
            Voir mon dernier relevé →
          </button>
        )}
      </header>

      <h1 className="mb-4 text-4xl font-bold leading-tight">
        Combien vous « coûte » vraiment votre usage de l&apos;IA&nbsp;?
      </h1>
      <p className="mb-2 text-lg" style={{ color: "var(--text-secondary)" }}>
        Chaque mois, importez votre export ChatGPT ou Claude et recevez votre relevé&nbsp;: coût
        équivalent en euros, répartition par thématique, et les conseils d&apos;un coach pour
        consommer plus malin.
      </p>
      <p className="mb-10 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--delta-good)" }}>
        <span aria-hidden>🔒</span> Analyse 100&nbsp;% locale — vos conversations ne quittent jamais
        votre navigateur.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label
          className="card flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-10 text-center transition-transform"
          style={{
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: dragging ? "var(--series-1)" : "var(--baseline)",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            type="file"
            accept=".json,application/json"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <span className="text-3xl" aria-hidden>
            📄
          </span>
          <span className="font-semibold">{busy ? "Analyse en cours…" : "Importer mon export"}</span>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Glissez votre <code>conversations.json</code> ici
            <br />
            (ChatGPT ou Claude — 2 minutes, une fois par mois)
          </span>
        </label>

        <button
          onClick={startDemo}
          className="card flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
        >
          <span className="text-3xl" aria-hidden>
            ✨
          </span>
          <span className="font-semibold">Découvrir avec des données démo</span>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            6 mois d&apos;usage simulé pour explorer le
            <br />
            dashboard sans rien importer
          </span>
        </button>
      </div>

      {error && (
        <p
          className="mt-6 rounded-lg px-4 py-3 text-sm"
          style={{ background: "var(--surface-1)", color: "var(--status-critical)", border: "1px solid var(--border)" }}
          role="alert"
        >
          {error}
        </p>
      )}

      <section className="mt-14">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Comment récupérer votre export ?
        </h2>
        <ol className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li>
            <strong>ChatGPT</strong> — Paramètres → Gestion des données → Exporter les données. Vous
            recevez un e-mail avec un zip : glissez le fichier <code>conversations.json</code> ici.
          </li>
          <li>
            <strong>Claude</strong> — Paramètres → Confidentialité → Exporter mes données. Même
            principe : le zip contient un <code>conversations.json</code>.
          </li>
          <li>
            <strong>Gemini</strong> — bientôt disponible (Google Takeout).
          </li>
        </ol>
      </section>
    </main>
  );
}
