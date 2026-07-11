import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findUseCase, modelLabel, useCaseCosts, USE_CASES } from "@/lib/usecases";
import { PROVIDER_LABELS } from "@/lib/pricing";

export function generateStaticParams() {
  return USE_CASES.map((uc) => ({ slug: uc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const uc = findUseCase((await params).slug);
  if (!uc) return {};
  return {
    title: `${uc.title} Comparatif de coût ChatGPT, Claude, Gemini | Relevé IA`,
    description: `${uc.title} Comparatif du coût mensuel réel (en euros) de ChatGPT, Claude et Gemini pour ce cas d'usage, notre recommandation de modèle et un conseil pour consommer moins.`,
    alternates: { canonical: `/comparateur/${uc.slug}` },
  };
}

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const uc = findUseCase((await params).slug);
  if (!uc) notFound();

  const costs = useCaseCosts(uc);
  const recommendedSlugs = new Set(uc.recommended.map((r) => r.model));

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <nav className="mb-10 text-sm">
        <Link href="/" className="font-semibold">
          Relevé <span style={{ color: "var(--series-1)" }}>IA</span>
        </Link>
        <span style={{ color: "var(--text-muted)" }}>
          {" "}
          / <Link href="/comparateur" className="underline">Comparateur</Link> /{" "}
          {uc.title.replace("Quelle IA pour ", "").replace(" ?", "")}
        </span>
      </nav>

      <h1 className="mb-4 text-3xl font-bold leading-tight">
        {uc.emoji} {uc.title}
      </h1>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Notre recommandation</h2>
        <ul className="space-y-3">
          {uc.recommended.map((r, i) => (
            <li key={r.model} className="card p-4">
              <p className="font-semibold">
                {i === 0 ? "🥇 Meilleur choix : " : "💰 Option éco / alternative : "}
                {modelLabel(r.model)}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {r.why}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">
          Combien ça coûte par mois ? (équivalent API en euros)
        </h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Estimation pour un{" "}
          <strong>
            usage léger ({uc.tasksPerMonth[0]} {uc.taskLabel}s/mois)
          </strong>
          ,{" "}
          <strong>
            régulier ({uc.tasksPerMonth[1]}/mois)
          </strong>{" "}
          ou{" "}
          <strong>
            intensif ({uc.tasksPerMonth[2]}/mois)
          </strong>
          , sur la base des tarifs API publics.
        </p>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                <th className="px-4 py-3 font-medium">Modèle</th>
                <th className="px-4 py-3 font-medium">Léger</th>
                <th className="px-4 py-3 font-medium">Régulier</th>
                <th className="px-4 py-3 font-medium">Intensif</th>
              </tr>
            </thead>
            <tbody>
              {costs.map(({ model, monthly }) => (
                <tr key={model.model} style={{ borderTop: "1px solid var(--grid)" }}>
                  <td className="px-4 py-3 font-medium">
                    {recommendedSlugs.has(model.model) && <span aria-hidden>⭐ </span>}
                    {model.label}
                    <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      {PROVIDER_LABELS[model.provider]}
                    </span>
                  </td>
                  <td className="tabular px-4 py-3">{fmtEur(monthly[0])}</td>
                  <td className="tabular px-4 py-3 font-semibold">{fmtEur(monthly[1])}</td>
                  <td className="tabular px-4 py-3">{fmtEur(monthly[2])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          ⭐ = recommandé pour ce cas d&apos;usage. Base : ~{uc.inputTokensPerTask} tokens envoyés et ~
          {uc.outputTokensPerTask} tokens générés par {uc.taskLabel}.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Le conseil du coach 💡</h2>
        <p className="card p-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {uc.advice}
        </p>
      </section>

      <section
        className="card mb-10 p-6 text-center"
        style={{ borderColor: "var(--series-1)", borderWidth: 2 }}
      >
        <h2 className="mb-2 text-xl font-semibold">Ces chiffres sont des moyennes. Et vous ?</h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Importez votre export ChatGPT ou Claude et obtenez votre relevé personnel : coût réel par
          thématique et conseils sur mesure. Gratuit, analyse 100&nbsp;% locale.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg px-5 py-2.5 font-medium"
          style={{ background: "var(--series-1)", color: "#fff" }}
        >
          Mesurer ma consommation réelle →
        </Link>
      </section>

      <nav className="text-sm" style={{ color: "var(--text-muted)" }}>
        <p className="mb-2 font-medium">Autres cas d&apos;usage :</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {USE_CASES.filter((u) => u.slug !== uc.slug).map((u) => (
            <li key={u.slug}>
              <Link href={`/comparateur/${u.slug}`} className="underline">
                {u.emoji} {u.title.replace("Quelle IA pour ", "").replace(" ?", "")}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
