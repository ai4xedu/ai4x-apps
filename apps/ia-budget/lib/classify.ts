import type { ParsedConversation } from "./types";

/**
 * Classification thématique 100 % locale, par mots-clés pondérés (FR + EN).
 * Volontairement simple pour le MVP : aucune donnée ne sort du navigateur.
 * Les thèmes sont détectés automatiquement puis renommables par l'utilisateur.
 */

export interface ThemeDef {
  id: string;
  defaultName: string;
  keywords: string[];
}

export const THEMES: ThemeDef[] = [
  {
    id: "code",
    defaultName: "Code & Tech",
    keywords: [
      "code", "bug", "fonction", "function", "python", "javascript", "typescript", "react",
      "api", "sql", "erreur", "error", "debug", "script", "compile", "serveur", "server",
      "docker", "git", "regex", "framework", "librairie", "library", "deploy", "css", "html",
    ],
  },
  {
    id: "redaction",
    defaultName: "Rédaction & Communication",
    keywords: [
      "rédige", "rédiger", "écris", "écrire", "email", "mail", "lettre", "article", "texte",
      "reformule", "corrige", "orthographe", "write", "draft", "rewrite", "linkedin", "post",
      "message", "réponse", "ton", "communiqué", "newsletter",
    ],
  },
  {
    id: "etudes",
    defaultName: "Études & Apprentissage",
    keywords: [
      "explique", "expliquer", "cours", "exercice", "examen", "réviser", "révision", "comprendre",
      "définition", "explain", "learn", "apprendre", "quiz", "dissertation", "mémoire", "thèse",
      "math", "physique", "histoire", "philosophie", "résume le chapitre",
    ],
  },
  {
    id: "business",
    defaultName: "Travail & Business",
    keywords: [
      "stratégie", "business", "client", "marché", "market", "réunion", "meeting", "présentation",
      "pitch", "budget", "projet", "roadmap", "kpi", "okr", "recrutement", "cv", "entretien",
      "contrat", "facture", "devis", "marketing", "vente",
    ],
  },
  {
    id: "creativite",
    defaultName: "Créativité & Idées",
    keywords: [
      "idée", "idées", "brainstorm", "histoire", "poème", "scénario", "roman", "créatif",
      "imagine", "invente", "story", "nom pour", "slogan", "titre pour", "chanson", "design",
    ],
  },
  {
    id: "data",
    defaultName: "Données & Analyse",
    keywords: [
      "analyse", "données", "data", "tableau", "excel", "csv", "graphique", "statistique",
      "moyenne", "pourcentage", "dataset", "chart", "dashboard", "calcul",
    ],
  },
  {
    id: "langues",
    defaultName: "Traduction & Langues",
    keywords: [
      "traduis", "traduire", "traduction", "translate", "anglais", "espagnol", "allemand",
      "italien", "grammaire", "vocabulaire", "conjugaison",
    ],
  },
  {
    id: "pratique",
    defaultName: "Vie pratique",
    keywords: [
      "recette", "cuisine", "voyage", "itinéraire", "santé", "sport", "recommande", "conseil",
      "cadeau", "film", "livre", "restaurant", "jardin", "bricolage", "enfant", "administratif",
    ],
  },
];

export const OTHER_THEME_ID = "autre";
export const OTHER_THEME_NAME = "Autre";

export function themeName(themeId: string, overrides: Record<string, string>): string {
  if (overrides[themeId]) return overrides[themeId];
  return THEMES.find((t) => t.id === themeId)?.defaultName ?? OTHER_THEME_NAME;
}

/** Classe une conversation d'après son titre et ses messages utilisateur. */
export function classifyConversation(convo: ParsedConversation): string {
  const corpus = (
    convo.title +
    " " +
    convo.messages
      .filter((m) => m.role === "user")
      .map((m) => m.text.slice(0, 500))
      .join(" ")
  ).toLowerCase();

  let best: { id: string; score: number } = { id: OTHER_THEME_ID, score: 0 };
  for (const theme of THEMES) {
    let score = 0;
    for (const kw of theme.keywords) {
      let idx = corpus.indexOf(kw);
      while (idx !== -1) {
        score += 1;
        idx = corpus.indexOf(kw, idx + kw.length);
      }
    }
    if (score > best.score) best = { id: theme.id, score };
  }
  return best.score >= 2 ? best.id : best.score === 1 ? best.id : OTHER_THEME_ID;
}
