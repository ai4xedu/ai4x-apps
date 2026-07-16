import type { AnalyzedConversation, MonthlyReport, Recommendation } from "./types";
import { isPremiumModel } from "./pricing";

/* ---------- Recommandations basées sur le CSV console (coût exact par modèle) ---------- */

const money = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

function tier(model: string): "opus" | "fable" | "sonnet" | "haiku" | "autre" {
  const s = model.toLowerCase();
  if (s.includes("opus")) return "opus";
  if (s.includes("fable")) return "fable";
  if (s.includes("sonnet")) return "sonnet";
  if (s.includes("haiku")) return "haiku";
  return "autre";
}

export function buildConsoleRecommendations(
  report: MonthlyReport,
  previous: MonthlyReport | null,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const total = report.costEur;
  if (report.models.length === 0 || total <= 0) return recs;

  const share = (pred: (t: string) => boolean) =>
    report.models.filter((m) => pred(tier(m.model))).reduce((s, m) => s + m.costEur, 0);

  // 1. Part des modèles haut de gamme (Opus / Fable)
  const premiumCost = share((t) => t === "opus" || t === "fable");
  const premiumPct = premiumCost / total;
  if (premiumPct > 0.55 && premiumCost > 3) {
    // Bascule d'une partie vers Sonnet : ~-70 % sur la portion déplaçable
    const movable = premiumCost * 0.4;
    const saving = movable * 0.7;
    recs.push({
      id: "console-premium-share",
      title: `${Math.round(premiumPct * 100)} % de votre budget part sur Opus/Fable`,
      message: `Opus et Fable sont vos plus gros postes (${money(premiumCost)}). Une bonne part des tâches courantes (rédaction, questions, code simple) tourne aussi bien sur Sonnet pour ~70 % moins cher. En déplaçant environ 40 % de cet usage, vous garderiez la qualité là où elle compte et récupéreriez ~${money(saving)}/mois.`,
      savingEur: saving,
      kind: "economie",
    });
  }

  // 2. Cache sous-utilisé (gros volume d'input, peu de cache)
  const cacheRatio = report.inputTokens > 0 ? report.cacheTokens / report.inputTokens : 0;
  if (report.inputTokens > 2_000_000 && cacheRatio < 0.1) {
    const saving = report.costEur * 0.15;
    recs.push({
      id: "console-cache",
      title: "Le cache de prompt est peu utilisé",
      message: `Vous envoyez beaucoup de tokens d'entrée (${(report.inputTokens / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M) mais très peu passent par le cache. Si vous réutilisez le même contexte (system prompt, gros document, base de code), le prompt caching le facture à ~10 % du prix. Potentiel : ~${money(saving)}/mois sur les charges répétitives.`,
      savingEur: saving,
      kind: "economie",
    });
  }

  // 3. Haiku quasi absent alors que le volume est élevé
  const haikuPct = share((t) => t === "haiku") / total;
  if (haikuPct < 0.05 && total > 20) {
    recs.push({
      id: "console-haiku",
      title: "Presque aucun usage de Haiku",
      message: `Pour la classification, l'extraction, les résumés courts et les tâches à fort volume, Haiku coûte une fraction du prix des grands modèles pour une qualité équivalente. Router ces tâches vers Haiku est souvent le levier d'économie le plus rentable sur un usage API intensif.`,
      savingEur: null,
      kind: "bonne-pratique",
    });
  }

  // 4. Tendance
  if (previous && previous.costEur > 0) {
    const delta = (total - previous.costEur) / previous.costEur;
    if (delta > 0.3) {
      const top = report.models[0];
      recs.push({
        id: "console-trend-up",
        title: `Dépense en hausse de ${Math.round(delta * 100)} %`,
        message: `Votre poste principal ce mois-ci est ${top.label} (${money(top.costEur)}). Vérifiez que cette hausse correspond à un usage à forte valeur — sinon, c'est le premier endroit où optimiser.`,
        savingEur: null,
        kind: "bonne-pratique",
      });
    } else if (delta < -0.15) {
      recs.push({
        id: "console-trend-down",
        title: `Bravo : ${Math.round(-delta * 100)} % de dépense en moins`,
        message: `Votre coût réel est passé de ${money(previous.costEur)} à ${money(total)}. Vos choix de modèles s'optimisent — continuez.`,
        savingEur: null,
        kind: "encouragement",
      });
    }
  }

  if (recs.filter((r) => r.kind !== "encouragement").length === 0) {
    recs.push({
      id: "console-all-good",
      title: "Mix de modèles déjà bien équilibré",
      message: `Votre répartition entre modèles est cohérente : pas de sur-utilisation évidente d'un modèle premium sur des tâches simples. Rien à redire ce mois-ci.`,
      savingEur: null,
      kind: "encouragement",
    });
  }

  return recs.sort((a, b) => (b.savingEur ?? 0) - (a.savingEur ?? 0));
}

/**
 * Moteur de recommandations — ton "coach bienveillant" :
 * concret, chiffré quand c'est possible, jamais culpabilisant.
 * Règles déterministes appliquées aux conversations du mois.
 */

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

export function buildRecommendations(
  convos: AnalyzedConversation[],
  report: MonthlyReport,
  previous: MonthlyReport | null,
): Recommendation[] {
  const recs: Recommendation[] = [];
  if (convos.length === 0) return recs;

  // 1. Conversations marathon : le contexte cumulé coûte cher
  const marathons = convos.filter((c) => c.userMessages >= 15);
  if (marathons.length > 0) {
    const cost = marathons.reduce((s, c) => s + c.costEur, 0);
    const saving = cost * 0.45; // repartir sur une conversation fraîche ≈ -45 % de contexte renvoyé
    recs.push({
      id: "marathon",
      title: `${marathons.length} conversation${marathons.length > 1 ? "s" : ""} marathon détectée${marathons.length > 1 ? "s" : ""}`,
      message: `À chaque nouveau message, tout l'historique de la conversation est renvoyé au modèle. Vos ${marathons.length} conversations de plus de 15 échanges représentent ${fmt(cost)} ce mois-ci. Astuce : quand vous changez de sujet, ouvrez une nouvelle conversation — vous garderez la même qualité pour environ ${fmt(saving)} de moins.`,
      savingEur: saving,
      kind: "economie",
    });
  }

  // 2. Modèle premium pour des tâches simples
  const premiumSimple = convos.filter(
    (c) => isPremiumModel(c.provider, c.model) && c.userMessages <= 2 && c.longestUserPrompt < 120,
  );
  if (premiumSimple.length >= 5) {
    const cost = premiumSimple.reduce((s, c) => s + c.costEur, 0);
    const saving = cost * 0.7;
    recs.push({
      id: "premium-simple",
      title: "Un bolide pour aller chercher le pain",
      message: `${premiumSimple.length} questions rapides (1-2 échanges courts) ont été posées à un modèle haut de gamme. Pour les traductions, reformulations et questions simples, un modèle léger (Haiku, GPT-5 mini, Flash…) fait aussi bien pour ~70 % moins cher. Économie potentielle : ${fmt(saving)}/mois.`,
      savingEur: saving,
      kind: "economie",
    });
  }

  // 3. Sujets fragmentés : plusieurs conversations le même jour sur le même thème
  const byDayTheme = new Map<string, number>();
  for (const c of convos) {
    const key = `${new Date(c.createdAt).toDateString()}|${c.themeId}`;
    byDayTheme.set(key, (byDayTheme.get(key) ?? 0) + 1);
  }
  const fragmentedDays = [...byDayTheme.values()].filter((n) => n >= 4).length;
  if (fragmentedDays >= 2) {
    recs.push({
      id: "fragmentation",
      title: "Regroupez vos questions sur un même sujet",
      message: `Sur ${fragmentedDays} journées, vous avez ouvert 4 conversations ou plus sur le même thème. En posant vos questions liées dans une seule conversation bien démarrée (contexte donné une fois), le modèle répond mieux et vous évitez de re-expliquer — souvent 20 à 30 % de tokens en moins.`,
      savingEur: null,
      kind: "bonne-pratique",
    });
  }

  // 4. Gros collages répétés (contexte re-collé à la main)
  const bigPastes = convos.filter((c) => c.longestUserPrompt > 3000);
  if (bigPastes.length >= 3) {
    recs.push({
      id: "big-paste",
      title: "Vous re-collez souvent de gros documents",
      message: `${bigPastes.length} conversations contiennent un très long texte collé. Si c'est le même document, utilisez les Projets (Claude) ou les fichiers joints : le document est traité une fois au lieu d'être re-tokenisé à chaque collage.`,
      savingEur: null,
      kind: "bonne-pratique",
    });
  }

  // 5. Tendance vs mois précédent
  if (previous && previous.costEur > 0) {
    const delta = (report.costEur - previous.costEur) / previous.costEur;
    if (delta > 0.3) {
      recs.push({
        id: "trend-up",
        title: `Consommation en hausse de ${Math.round(delta * 100)} %`,
        message: `Rien d'alarmant — une hausse traduit souvent un usage plus utile de l'IA. Jetez un œil au thème qui a le plus progressé pour vérifier que cette valeur est au bon endroit.`,
        savingEur: null,
        kind: "bonne-pratique",
      });
    } else if (delta < -0.15) {
      recs.push({
        id: "trend-down",
        title: `Bravo : ${Math.round(-delta * 100)} % de moins que le mois dernier`,
        message: `Votre équivalent API est passé de ${fmt(previous.costEur)} à ${fmt(report.costEur)} sans que votre volume de conversations s'effondre. Vos habitudes s'optimisent — continuez comme ça.`,
        savingEur: null,
        kind: "encouragement",
      });
    }
  }

  // 6. Toujours au moins un message positif
  if (recs.filter((r) => r.kind !== "encouragement").length === 0) {
    recs.push({
      id: "all-good",
      title: "Usage déjà bien optimisé",
      message: `Pas de gaspillage notable ce mois-ci : conversations de taille raisonnable et modèles adaptés aux tâches. Le coach n'a rien à redire — revenez le mois prochain pour suivre la tendance.`,
      savingEur: null,
      kind: "encouragement",
    });
  }

  return recs.sort((a, b) => (b.savingEur ?? 0) - (a.savingEur ?? 0));
}
