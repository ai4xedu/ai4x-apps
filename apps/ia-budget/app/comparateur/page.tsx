import type { Metadata } from "next";
import Link from "next/link";
import { COMPARED_MODELS, USE_CASES } from "@/lib/usecases";
import { resolvePrice, PROVIDER_LABELS, USD_TO_EUR } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "ChatGPT vs Claude vs Gemini : combien coûte l'IA selon votre usage ? | Relevé IA",
  description:
    "Comparateur de coût des IA génératives : prix au million de tokens de ChatGPT, Claude et Gemini, et estimation mensuelle en euros pour 8 cas d'usage concrets (e-mails, code, traduction, résumés…). Avec le modèle recommandé pour chaque besoin.",
  alternates: { canonical: "/comparateur" },
};

const fmtEur = (n: number, digits = 2) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: digits });

export default function Comparateur() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <nav className="mb-10 text-sm">
        <Link href="/" className="font-semibold">
          Relevé <span style={{ color: "var(--series-1)" }}>IA</span>
        </Link>
        <span style={{ color: "var(--text-muted)" }}> / Comparateur</span>
      </nav>

      <h1 className="mb-4 text-3xl font-bold leading-tight">
        ChatGPT vs Claude vs Gemini : combien coûte l&apos;IA selon votre usage ?
      </h1>
      <p className="mb-10" style={{ color: "var(--text-secondary)" }}>
        Les abonnements sont à prix fixe, mais chaque conversation a un coût réel — celui que les
        entreprises paient au token via les API. Ce comparateur le rend visible : prix officiels par
        million de tokens, et surtout ce que cela représente <em>en euros par mois</em> pour vos
        usages concrets, avec le modèle recommandé pour chaque besoin.
      </p>

      <h2 className="mb-4 text-xl font-semibold">Quelle IA pour quel usage ?</h2>
      <div className="mb-12 grid gap-3 sm:grid-cols-2">
        {USE_CASES.map((uc) => (
          <Link
            key={uc.slug}
            href={`/comparateur/${uc.slug}`}
            className="card flex items-center gap-3 px-4 py-3 text-sm font-medium hover:underline"
          >
            <span className="text-xl" aria-hidden>
              {uc.emoji}
            </span>
            {uc.title.replace("Quelle IA pour ", "").replace(" ?", "")}
          </Link>
        ))}
      </div>

      <h2 className="mb-4 text-xl font-semibold">Les tarifs API officiels (par million de tokens)</h2>
      <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        C&apos;est la base de tous nos calculs. Un token ≈ 4 caractères ; un e-mail fait ~350
        tokens, une session de code plusieurs milliers.
      </p>
      <div className="card mb-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-muted)" }}>
              <th className="px-4 py-3 font-medium">Modèle</th>
              <th className="px-4 py-3 font-medium">Entrée</th>
              <th className="px-4 py-3 font-medium">Sortie</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Positionnement</th>
            </tr>
          </thead>
          <tbody>
            {COMPARED_MODELS.map((m) => {
              const p = resolvePrice(m.provider, m.model);
              return (
                <tr key={m.model} style={{ borderTop: "1px solid var(--grid)" }}>
                  <td className="px-4 py-3 font-medium">
                    {m.label}
                    <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      {PROVIDER_LABELS[m.provider]}
                    </span>
                  </td>
                  <td className="tabular px-4 py-3">{fmtEur(p.inputPerMTok * USD_TO_EUR)}</td>
                  <td className="tabular px-4 py-3">{fmtEur(p.outputPerMTok * USD_TO_EUR)}</td>
                  <td className="hidden px-4 py-3 text-xs sm:table-cell" style={{ color: "var(--text-secondary)" }}>
                    {m.positioning}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mb-12 text-xs" style={{ color: "var(--text-muted)" }}>
        Tarifs publics des API, convertis en euros (juillet 2026, indicatif).
      </p>

      <section
        className="card p-6 text-center"
        style={{ borderColor: "var(--series-1)", borderWidth: 2 }}
      >
        <h2 className="mb-2 text-xl font-semibold">Et vous, combien « coûte » votre usage ?</h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Importez votre export ChatGPT ou Claude et découvrez votre relevé mensuel : coût
          équivalent, thématiques, conseils d&apos;optimisation. Analyse 100&nbsp;% locale — vos
          conversations ne quittent jamais votre navigateur.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg px-5 py-2.5 font-medium"
          style={{ background: "var(--series-1)", color: "#fff" }}
        >
          Mesurer ma consommation réelle →
        </Link>
      </section>
    </main>
  );
}
