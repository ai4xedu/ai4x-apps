import type { Provider } from "./types";
import { costEur } from "./pricing";

/**
 * Données du comparateur public (lead magnet / SEO).
 * Chaque cas d'usage a sa propre URL statique (/comparateur/[slug])
 * pour cibler les recherches du type "quelle IA pour traduire un texte".
 * Les coûts sont calculés à partir de la même grille tarifaire que le
 * dashboard (lib/pricing.ts) — une seule source de vérité.
 */

export interface ComparedModel {
  provider: Provider;
  model: string;
  label: string;
  /** Positionnement en une ligne, affiché dans le comparateur */
  positioning: string;
}

export const COMPARED_MODELS: ComparedModel[] = [
  { provider: "claude", model: "claude-opus-4-8", label: "Claude Opus 4.8", positioning: "Le haut de gamme pour les tâches longues et complexes" },
  { provider: "claude", model: "claude-sonnet-5", label: "Claude Sonnet 5", positioning: "L'équilibre qualité/prix, excellent en rédaction et code" },
  { provider: "claude", model: "claude-haiku-4-5", label: "Claude Haiku 4.5", positioning: "Rapide et économique pour les tâches simples" },
  { provider: "chatgpt", model: "gpt-5", label: "GPT-5", positioning: "Le généraliste polyvalent d'OpenAI" },
  { provider: "chatgpt", model: "gpt-5-mini", label: "GPT-5 mini", positioning: "La version légère, très bon marché" },
  { provider: "gemini", model: "gemini-2.5-pro", label: "Gemini 2.5 Pro", positioning: "Fort sur les très longs documents et la vidéo" },
  { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash", positioning: "Le plus économique des trois écosystèmes" },
];

export interface UseCase {
  slug: string;
  title: string; // H1 SEO
  question: string; // formulation "recherche Google"
  emoji: string;
  /** Profil de tokens par tâche type */
  inputTokensPerTask: number;
  outputTokensPerTask: number;
  taskLabel: string; // "e-mail", "session de débogage"…
  /** Nombre de tâches/mois : léger, régulier, intensif */
  tasksPerMonth: [number, number, number];
  /** model slugs recommandés, du meilleur choix au choix éco */
  recommended: { model: string; why: string }[];
  advice: string; // paragraphe conseil (SEO + valeur réelle)
}

export const USE_CASES: UseCase[] = [
  {
    slug: "rediger-des-emails",
    title: "Quelle IA pour rédiger vos e-mails professionnels ?",
    question: "quelle ia choisir pour rédiger des emails",
    emoji: "✉️",
    inputTokensPerTask: 400,
    outputTokensPerTask: 350,
    taskLabel: "e-mail",
    tasksPerMonth: [20, 60, 150],
    recommended: [
      { model: "claude-sonnet-5", why: "Le meilleur ton naturel en français, reformulations fines, et un prix contenu pour un usage quotidien." },
      { model: "gpt-5-mini", why: "L'option éco : largement suffisant pour des e-mails courts et factuels." },
    ],
    advice:
      "Pour un e-mail, inutile de mobiliser un modèle premium : la différence de qualité est marginale et le prix peut être 5 à 10 fois supérieur. Donnez plutôt un bon contexte (destinataire, objectif, ton souhaité) à un modèle intermédiaire — c'est le prompt qui fait la qualité d'un e-mail, pas la taille du modèle.",
  },
  {
    slug: "generer-du-code",
    title: "Quelle IA pour coder et déboguer ?",
    question: "meilleure ia pour coder",
    emoji: "💻",
    inputTokensPerTask: 2500,
    outputTokensPerTask: 1800,
    taskLabel: "session de code",
    tasksPerMonth: [10, 40, 100],
    recommended: [
      { model: "claude-sonnet-5", why: "Référence du marché en génération de code : qualité proche du haut de gamme pour un tiers du prix." },
      { model: "claude-opus-4-8", why: "À réserver aux refactorings complexes et aux bugs difficiles — là où sa profondeur de raisonnement change le résultat." },
    ],
    advice:
      "Le code est le cas d'usage le plus gourmand en tokens : chaque échange renvoie le code déjà discuté. Deux réflexes économisent gros : ouvrir une nouvelle conversation quand vous changez de fichier ou de bug, et ne coller que la fonction concernée plutôt que le fichier entier.",
  },
  {
    slug: "traduire-des-textes",
    title: "Quelle IA pour traduire des textes ?",
    question: "quelle ia pour traduire un texte",
    emoji: "🌍",
    inputTokensPerTask: 900,
    outputTokensPerTask: 900,
    taskLabel: "traduction",
    tasksPerMonth: [15, 50, 120],
    recommended: [
      { model: "gemini-2.5-flash", why: "La traduction est une tâche où les petits modèles excellent : Flash est quasi gratuit et très bon." },
      { model: "claude-haiku-4-5", why: "Alternative de même calibre, très bonne restitution des nuances en français." },
    ],
    advice:
      "La traduction est LE cas d'usage où payer un modèle premium est du gaspillage pur : les modèles légers atteignent une qualité équivalente sur la quasi-totalité des textes. Réservez un grand modèle aux traductions littéraires ou juridiques où chaque nuance compte.",
  },
  {
    slug: "resumer-des-documents",
    title: "Quelle IA pour résumer des documents ?",
    question: "ia pour résumer un document pdf",
    emoji: "📑",
    inputTokensPerTask: 8000,
    outputTokensPerTask: 600,
    taskLabel: "document",
    tasksPerMonth: [8, 25, 60],
    recommended: [
      { model: "gemini-2.5-pro", why: "Son immense fenêtre de contexte digère rapports et livres entiers sans découpage." },
      { model: "claude-sonnet-5", why: "Résumés mieux structurés et plus fidèles sur les documents complexes ou techniques." },
    ],
    advice:
      "Le coût d'un résumé vient à 90 % du document lui-même (les tokens d'entrée). Si vous interrogez plusieurs fois le même document, posez toutes vos questions dans la même conversation — le re-coller dans une nouvelle conversation double la facture à chaque fois.",
  },
  {
    slug: "analyser-des-donnees",
    title: "Quelle IA pour analyser des données ?",
    question: "ia pour analyser un fichier excel csv",
    emoji: "📊",
    inputTokensPerTask: 4000,
    outputTokensPerTask: 1200,
    taskLabel: "analyse",
    tasksPerMonth: [6, 20, 50],
    recommended: [
      { model: "gpt-5", why: "Exécution de code intégrée et très à l'aise sur les calculs et graphiques à partir de CSV/Excel." },
      { model: "claude-sonnet-5", why: "Excellent pour l'interprétation et la mise en récit des résultats." },
    ],
    advice:
      "Envoyez des extraits représentatifs plutôt que le fichier brut complet : 200 lignes bien choisies suffisent souvent à établir la logique d'analyse, que vous appliquez ensuite à tout le fichier dans un tableur.",
  },
  {
    slug: "creer-du-contenu",
    title: "Quelle IA pour créer du contenu marketing ?",
    question: "ia pour créer du contenu réseaux sociaux",
    emoji: "📣",
    inputTokensPerTask: 800,
    outputTokensPerTask: 900,
    taskLabel: "contenu",
    tasksPerMonth: [12, 40, 100],
    recommended: [
      { model: "claude-sonnet-5", why: "Le ton le plus naturel et le moins « généré par IA » — décisif pour du contenu public." },
      { model: "gpt-5", why: "Très bon en variations multiples (10 accroches, 5 angles) grâce à sa vitesse." },
    ],
    advice:
      "Créez une conversation « charte éditoriale » où vous définissez une fois votre ton, vos cibles et vos exemples, puis demandez vos contenus dedans : le modèle reste cohérent et vous évitez de re-briefer à chaque post.",
  },
  {
    slug: "reviser-et-etudier",
    title: "Quelle IA pour réviser et étudier ?",
    question: "quelle ia pour réviser un examen",
    emoji: "🎓",
    inputTokensPerTask: 1500,
    outputTokensPerTask: 1500,
    taskLabel: "session de révision",
    tasksPerMonth: [10, 35, 90],
    recommended: [
      { model: "claude-sonnet-5", why: "Pédagogie pas à pas et capacité à générer quiz et fiches de révision fidèles au cours." },
      { model: "gemini-2.5-flash", why: "Pour les questions rapides de compréhension, quasi gratuit." },
    ],
    advice:
      "Demandez à l'IA de vous interroger plutôt que de lui demander des réponses : « pose-moi 10 questions sur ce chapitre et corrige-moi » est plus efficace pédagogiquement — et consomme moins de tokens qu'une explication complète à chaque fois.",
  },
  {
    slug: "brainstorming",
    title: "Quelle IA pour brainstormer et générer des idées ?",
    question: "ia pour brainstorming idées",
    emoji: "💡",
    inputTokensPerTask: 600,
    outputTokensPerTask: 1400,
    taskLabel: "session d'idéation",
    tasksPerMonth: [8, 25, 60],
    recommended: [
      { model: "claude-opus-4-8", why: "Les idées les moins convenues et la meilleure capacité à creuser une piste avec vous." },
      { model: "gpt-5", why: "Génération rapide de longues listes à trier ensuite." },
    ],
    advice:
      "En idéation, la quantité prime au premier tour : demandez 30 idées en vrac à un modèle rapide, puis approfondissez les 3 meilleures avec un modèle premium. Ce pipeline en deux temps coûte moins cher qu'une longue session unique haut de gamme.",
  },
];

export interface UseCaseCost {
  model: ComparedModel;
  monthly: [number, number, number]; // € pour léger / régulier / intensif
}

export function useCaseCosts(uc: UseCase): UseCaseCost[] {
  return COMPARED_MODELS.map((m) => ({
    model: m,
    monthly: uc.tasksPerMonth.map((n) =>
      costEur(m.provider, m.model, uc.inputTokensPerTask * n, uc.outputTokensPerTask * n),
    ) as [number, number, number],
  })).sort((a, b) => a.monthly[1] - b.monthly[1]);
}

export function findUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((u) => u.slug === slug);
}

export function modelLabel(slug: string): string {
  return COMPARED_MODELS.find((m) => m.model === slug)?.label ?? slug;
}
