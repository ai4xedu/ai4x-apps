import type { AnalyzedConversation, MonthlyReport, Recommendation } from "./types";
import { isPremiumModel } from "./pricing";

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
