"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { unzipSync, strFromU8 } from "fflate";
import { parseExport, ParseError } from "@/lib/parsers";
import { parseConsoleCsv } from "@/lib/consoleImport";
import type { MonthlyReport, ParsedConversation } from "@/lib/types";
import { analyzeConversation, buildMonthlyReports, mergeReports } from "@/lib/aggregate";
import { buildAudit } from "@/lib/audit";
import { buildDemoReports, buildDemoConversations } from "@/lib/demo";
import { loadState, newState, saveState } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const s = loadState();
    setHasData(!!s && ((s.reports.length ?? 0) > 0 || !!s.audit));
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        const allConvos: ParsedConversation[] = [];
        const consoleReports: MonthlyReport[] = [];
        for (const file of Array.from(files)) {
          const name = file.name.toLowerCase();
          if (name.endsWith(".csv")) {
            // CSV Usage/Cost du console Anthropic → coût exact + par modèle
            consoleReports.push(...parseConsoleCsv(await file.text()));
          } else if (name.endsWith(".zip")) {
            // Zip d'export complet : on extrait les conversations.json localement
            const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
            const jsonNames = Object.keys(entries).filter((n) =>
              n.toLowerCase().endsWith("conversations.json"),
            );
            const csvNames = Object.keys(entries).filter((n) => n.toLowerCase().endsWith(".csv"));
            for (const n of csvNames) consoleReports.push(...parseConsoleCsv(strFromU8(entries[n])));
            if (jsonNames.length === 0 && csvNames.length === 0) {
              throw new ParseError(
                "Ce zip ne contient ni conversations.json ni CSV. Vérifiez qu'il s'agit bien d'un export ChatGPT/Claude ou d'un CSV Usage/Cost du console Anthropic.",
              );
            }
            for (const n of jsonNames) allConvos.push(...parseExport(strFromU8(entries[n])));
          } else {
            allConvos.push(...parseExport(await file.text()));
          }
        }
        const analyzed = allConvos.map(analyzeConversation);
        const allReports = mergeReports(buildMonthlyReports(analyzed), consoleReports);
        const existing = loadState();
        const merged = mergeReports(
          existing && !existing.settings.demoMode ? existing.reports : [],
          allReports,
        );
        const state = existing && !existing.settings.demoMode ? existing : newState([], false);
        state.reports = merged;
        state.settings.demoMode = false;
        // Un export chat → on génère l'audit d'usage (valeur phare) et on y redirige.
        if (allConvos.length > 0) {
          state.audit = buildAudit(allConvos);
          saveState(state);
          router.push("/audit");
        } else {
          saveState(state);
          router.push("/dashboard");
        }
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
    const state = newState(buildDemoReports(), true);
    state.settings.subscriptionEur = 90; // forfait Max, pour illustrer la rentabilité
    state.settings.monthlyBudgetEur = 150;
    state.audit = buildAudit(buildDemoConversations());
    saveState(state);
    router.push("/audit");
  }, [router]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12 flex items-center justify-between">
        <div className="text-lg font-semibold">
          Audit <span style={{ color: "var(--series-1)" }}>IA</span>
        </div>
        {hasData && (
          <button
            onClick={() => router.push("/audit")}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--series-1)", color: "#fff" }}
          >
            Voir mon audit →
          </button>
        )}
      </header>

      <h1 className="mb-4 text-4xl font-bold leading-tight">
        Comment utilisez-vous <em>vraiment</em> l&apos;IA&nbsp;?
      </h1>
      <p className="mb-2 text-lg" style={{ color: "var(--text-secondary)" }}>
        Importez l&apos;export de vos conversations Claude ou ChatGPT et recevez votre{" "}
        <strong>audit d&apos;usage</strong>&nbsp;: votre niveau de maturité, à quoi vous servez de
        l&apos;IA, vos tâches récurrentes à industrialiser, et un playbook concret pour passer au
        niveau supérieur. Ce qu&apos;un seul chat ne peut pas voir&nbsp;: la vue d&apos;ensemble sur
        tout votre historique.
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
            accept=".json,.zip,.csv,application/json,application/zip,text/csv"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <span className="text-3xl" aria-hidden>
            📄
          </span>
          <span className="font-semibold">{busy ? "Analyse en cours…" : "Importer mes données"}</span>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            <strong>CSV Usage/Cost</strong> du console (coût exact par modèle)
            <br />
            et/ou <strong>zip d&apos;export</strong> chat (thématiques)
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
        <ul className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li>
            <strong style={{ color: "var(--text-primary)" }}>
              💰 Coût réel par modèle, API + Claude Code (recommandé)
            </strong>
            <br />
            Lancez le script <code>scripts/fetch-anthropic-usage.mjs</code> avec votre clé{" "}
            <strong>Admin</strong> (gratuite, sur platform.claude.com/settings/admin-keys). Il
            interroge l&apos;Admin API et génère un CSV avec votre dépense exacte par modèle (Opus,
            Sonnet, Haiku, Fable) et par jour — usage API <em>et</em> Claude Code (même sur
            abonnement). La clé reste sur votre machine. Glissez le CSV produit ici.
            <br />
            <span style={{ color: "var(--text-muted)" }}>
              Alternative simple : <strong>console.anthropic.com → Usage/Cost → Export</strong> (API
              seule, sans Claude Code sur abonnement).
            </span>
          </li>
          <li>
            <strong style={{ color: "var(--text-primary)" }}>🏷️ Thématiques (optionnel)</strong>
            <br />
            <strong>claude.ai / ChatGPT</strong> → Paramètres → Exporter mes données. Glissez le zip
            reçu par e-mail : il sert à détecter <em>sur quoi</em> vous parlez. Note : cet export ne
            contient pas le coût réel ni le modèle — d&apos;où l&apos;import CSV ci-dessus pour les
            chiffres.
          </li>
        </ul>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Les deux se combinent : coût exact du CSV console + thématiques du chat. Importez l&apos;un,
          l&apos;autre, ou les deux.
        </p>
      </section>

      <footer className="mt-14 border-t pt-6 text-sm" style={{ borderColor: "var(--grid)", color: "var(--text-muted)" }}>
        <Link href="/comparateur" className="underline">
          Comparateur : combien coûte ChatGPT vs Claude vs Gemini selon votre usage ?
        </Link>
      </footer>
    </main>
  );
}
