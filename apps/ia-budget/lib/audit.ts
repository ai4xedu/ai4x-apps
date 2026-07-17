import type { ParsedConversation } from "./types";
import { classifyConversation, themeName } from "./classify";

/**
 * Moteur d'audit d'usage IA (lead magnet B2C).
 * Prend les conversations d'un export chat et produit un rapport de maturité
 * + un playbook actionnable — la valeur qu'un seul chat Claude ne peut pas
 * donner (vue transversale sur tout le corpus).
 *
 * 100 % local : ne sort que des agrégats/insights (jamais le texte des chats).
 */

export interface RecurringTask {
  label: string;
  count: number;
  examples: string[]; // titres, métadonnée légère
}

export interface PlaybookItem {
  id: string;
  title: string;
  body: string;
  impact: string; // gain estimé / bénéfice
  priority: number; // 1 = le plus fort
}

export interface AuditReport {
  periodeLabel: string;
  totalConversations: number;
  activeDays: number;
  perMonth: { month: string; count: number }[];
  adoptionInflection: string | null;
  peakMonth: { month: string; count: number } | null;
  userMessages: number;
  avgExchanges: number;
  oneShotPct: number;
  marathonPct: number;
  toolPct: number;
  attachmentPct: number;
  themes: { themeId: string; label: string; count: number; pct: number }[];
  topTopics: { term: string; count: number }[];
  recurringTasks: RecurringTask[];
  maturity: { score: number; level: string; nextLevel: string; signals: string[] };
  playbook: PlaybookItem[];
  hourHistogram: number[];
  dowHistogram: number[];
}

const FR_STOP = new Set(
  ("le la les un une des de du et à a au aux en dans pour par sur avec sans que qui quoi je tu il " +
    "elle on nous vous ils elles me te se ce cet cette ces mon ma mes ton ta tes son sa ses est " +
    "sont ai as ont être avoir fait faire peux peut veux veut dois doit ne pas plus moins très " +
    "comme mais ou où donc car si oui non tout tous toute toutes bien va vais comment quel quelle " +
    "the to of and a in is it you i for on this that my me can with your what how do please give " +
    "j l d n c s t qu m aussi alors puis apres avant entre sous chaque autre meme voici voila " +
    "besoin quand leur notre votre nos vos moi toi lui suis d'un d'une c'est j'ai depuis " +
    "https http com www donne prepare propose dis aide fais veux").split(/\s+/),
);

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const monthLabel = (m: string) => {
  const [y, mm] = m.split("-").map(Number);
  return `${MONTHS_FR[mm - 1]} ${y}`;
};

function words(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôöùûüç'\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FR_STOP.has(w));
}

/** Libellé humain pour un bigramme de tâche récurrente. */
function taskLabel(bigram: string): string {
  const map: Record<string, string> = {
    "post linkedin": "Rédiger un post LinkedIn",
    "linkedin post": "Rédiger un post LinkedIn",
    "caption ig": "Écrire une caption Instagram",
    "caption instagram": "Écrire une caption Instagram",
    "landing page": "Créer une landing page",
    "linkedin ads": "Écrire une pub LinkedIn",
    "meta ads": "Écrire une pub Meta",
    "fb ads": "Écrire une pub Facebook",
  };
  if (map[bigram]) return map[bigram];
  return bigram.charAt(0).toUpperCase() + bigram.slice(1);
}

export function buildAudit(convos: ParsedConversation[]): AuditReport {
  const perConvo = convos.map((c) => {
    const userMsgs = c.messages.filter((m) => m.role === "user");
    let hasTool = false,
      hasAttach = false;
    // Les blocs tool/attachment ne sont pas dans ParsedMessage ; on approxime
    // via la longueur & le nombre de tours + heuristique de contenu.
    const firstUser = userMsgs[0]?.text ?? "";
    const maxUser = Math.max(0, ...userMsgs.map((m) => m.text.length));
    if (/```|http|\.js|\.py|def |function |api|json/i.test(firstUser)) hasTool = true;
    if (maxUser > 3000) hasAttach = true;
    return {
      title: c.title || "(sans titre)",
      createdAt: c.createdAt,
      userMsgs: userMsgs.length,
      themeId: classifyConversation(c),
      firstUser,
      maxUser,
      hasTool,
      hasAttach,
    };
  });

  // --- Temporalité ---
  const dated = perConvo.filter((c) => c.createdAt > 0);
  const times = dated.map((c) => c.createdAt);
  const first = Math.min(...times);
  const last = Math.max(...times);
  const activeDays = Math.max(1, Math.round((last - first) / 86400000));

  const monthMap = new Map<string, number>();
  const hourHistogram = new Array(24).fill(0);
  const dowHistogram = new Array(7).fill(0);
  for (const c of dated) {
    const d = new Date(c.createdAt);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(mk, (monthMap.get(mk) ?? 0) + 1);
    hourHistogram[d.getHours()]++;
    dowHistogram[d.getDay()]++;
  }
  const perMonth = [...monthMap.entries()].sort().map(([month, count]) => ({ month, count }));
  const peakMonth = perMonth.reduce<{ month: string; count: number } | null>(
    (best, m) => (!best || m.count > best.count ? m : best),
    null,
  );
  // Inflexion : 1er mois qui dépasse 3× la moyenne des mois précédents
  let adoptionInflection: string | null = null;
  for (let i = 1; i < perMonth.length; i++) {
    const prevAvg = perMonth.slice(0, i).reduce((s, m) => s + m.count, 0) / i;
    if (perMonth[i].count >= Math.max(10, prevAvg * 3)) {
      adoptionInflection = perMonth[i].month;
      break;
    }
  }

  // --- Volumes & patterns ---
  const total = perConvo.length;
  const userMessages = perConvo.reduce((s, c) => s + c.userMsgs, 0);
  const oneShot = perConvo.filter((c) => c.userMsgs <= 1).length;
  const marathon = perConvo.filter((c) => c.userMsgs >= 15).length;
  const withTool = perConvo.filter((c) => c.hasTool).length;
  const withAttach = perConvo.filter((c) => c.hasAttach).length;
  const pct = (n: number) => Math.round((n / Math.max(1, total)) * 100);

  // --- Portefeuille de tâches (thèmes) ---
  const themeCount = new Map<string, number>();
  for (const c of perConvo) themeCount.set(c.themeId, (themeCount.get(c.themeId) ?? 0) + 1);
  const themes = [...themeCount.entries()]
    .map(([themeId, count]) => ({
      themeId,
      label: themeName(themeId, {}),
      count,
      pct: pct(count),
    }))
    .sort((a, b) => b.count - a.count);

  // --- Sujets récurrents (bigrammes par fréquence documentaire) ---
  const bigramDf = new Map<string, number>();
  const bigramExamples = new Map<string, string[]>();
  for (const c of perConvo) {
    const ws = words(c.title + " " + c.firstUser.slice(0, 300));
    const seen = new Set<string>();
    for (let i = 0; i < ws.length - 1; i++) {
      const bg = ws[i] + " " + ws[i + 1];
      if (seen.has(bg)) continue;
      seen.add(bg);
      bigramDf.set(bg, (bigramDf.get(bg) ?? 0) + 1);
      const ex = bigramExamples.get(bg) ?? [];
      if (ex.length < 3 && c.title !== "(sans titre)") ex.push(c.title.slice(0, 60));
      bigramExamples.set(bg, ex);
    }
  }
  const topTopics = [...bigramDf.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([term, count]) => ({ term, count }));

  // Tâches récurrentes = bigrammes contenant un mot "action/livrable"
  // (évite le bruit : noms de domaine, marques, mots vides).
  const ACTION = new Set(
    ("post linkedin caption instagram email mail newsletter ads pub publicité landing page " +
      "rédige rédiger écris écrire reformule corrige traduis traduction résume résumé analyse " +
      "rapport script pitch facture devis prompt tableau visuel vidéo caption message article " +
      "skill agent automatisation workflow benchmark audit stratégie plan formation quiz").split(/\s+/),
  );
  const recurringTasks: RecurringTask[] = [...bigramDf.entries()]
    .filter(([bg, n]) => n >= 3 && bg.split(" ").some((w) => ACTION.has(w)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([bg, count]) => ({
      label: taskLabel(bg),
      count,
      examples: bigramExamples.get(bg) ?? [],
    }));

  // --- Maturité ---
  const signals: string[] = [];
  let score = 20;
  if (withTool > total * 0.3) { score += 18; signals.push("usage d'outils / connecteurs / code"); }
  if (withAttach > total * 0.2) { score += 12; signals.push("travail avec des fichiers joints"); }
  if (themes.length >= 5) { score += 12; signals.push(`diversité des usages (${themes.length} thématiques)`); }
  if (marathon >= 3) { score += 8; signals.push("conversations longues et structurées"); }
  if (total >= 100) { score += 15; signals.push("volume d'usage élevé (power user)"); }
  const buildKw = perConvo.filter((c) =>
    /skill|agent|automat|make\.com|n8n|claude code|app|workflow|projet|api/i.test(c.title + c.firstUser),
  ).length;
  if (buildKw >= 10) { score += 15; signals.push("construction (skills, agents, automatisations, apps)"); }
  score = Math.min(100, score);
  const LEVELS = ["Explorateur", "Praticien", "Power User", "Architecte IA"];
  const idx = score < 35 ? 0 : score < 60 ? 1 : score < 82 ? 2 : 3;

  // --- Playbook ---
  const playbook: PlaybookItem[] = [];
  if (recurringTasks.length > 0) {
    const top = recurringTasks.slice(0, 3);
    playbook.push({
      id: "industrialiser",
      title: "Industrialise tes tâches récurrentes",
      body: `Tu répètes plusieurs tâches à l'identique en re-briefant à chaque fois — notamment : ${top
        .map((t) => `« ${t.label} » (${t.count}×)`)
        .join(", ")}. Transforme chacune en Skill Claude ou en template réutilisable : le contexte et le format sont donnés une seule fois, puis tu déclenches en une phrase.`,
      impact: "Gain de temps majeur + qualité constante",
      priority: 1,
    });
  }
  if (oneShot > total * 0.3) {
    playbook.push({
      id: "one-shot",
      title: `${pct(oneShot)} % de tes conversations sont des questions ponctuelles`,
      body: `Beaucoup de recherches jetables (how-to, configs, codes promo…). C'est normal, mais à faible levier. Regroupe le récurrent dans un Project « base de connaissances perso » et garde une conversation dédiée par grand chantier pour capitaliser au lieu de repartir de zéro.`,
      impact: "Moins de dispersion, plus de contexte réutilisé",
      priority: 3,
    });
  }
  if (marathon >= 3) {
    playbook.push({
      id: "marathon",
      title: `${marathon} conversations très longues`,
      body: `Au-delà de ~15 échanges, le contexte s'alourdit et la qualité se dilue. Quand tu changes de sujet, ouvre une nouvelle conversation ; pour un gros sujet, structure-le en Project avec des instructions claires.`,
      impact: "Réponses plus nettes, moins de tokens gaspillés",
      priority: 4,
    });
  }
  // Détection de re-briefing de marque : un même domaine revient souvent
  const domainCount = new Map<string, number>();
  for (const c of perConvo) {
    const m = (c.firstUser.match(/https?:\/\/([\w.-]+)/g) || []).map((u) =>
      u.replace(/https?:\/\//, "").replace(/^www\./, "").split("/")[0],
    );
    for (const d of new Set(m)) domainCount.set(d, (domainCount.get(d) ?? 0) + 1);
  }
  const topDomain = [...domainCount.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topDomain && topDomain[1] >= 5) {
    playbook.push({
      id: "brand-project",
      title: "Tu re-colles ton contexte de marque en permanence",
      body: `Le lien « ${topDomain[0]} » revient dans ${topDomain[1]} conversations — tu ré-expliques ton offre, ton ton, ta cible à chaque fois. Crée un Project Claude avec ta marque, ton offre et ta charte en base de connaissances : Claude les connaîtra sans que tu aies à les redonner.`,
      impact: `~${topDomain[1]} re-briefings évités`,
      priority: 2,
    });
  }
  if (buildKw >= 10 && score < 82) {
    playbook.push({
      id: "next-level",
      title: "Passe de l'usage manuel à l'orchestration",
      body: `Tu construis déjà (skills, automatisations, apps). Le prochain palier : chaîner ces briques en workflows/agents qui tournent seuls (Claude Code, connecteurs, n8n/make) plutôt que de piloter chaque étape à la main.`,
      impact: "Effet de levier — l'IA travaille sans toi",
      priority: 5,
    });
  }
  playbook.sort((a, b) => a.priority - b.priority);

  return {
    periodeLabel: dated.length
      ? `${monthLabel(perMonth[0].month)} → ${monthLabel(perMonth[perMonth.length - 1].month)}`
      : "période inconnue",
    totalConversations: total,
    activeDays,
    perMonth,
    adoptionInflection,
    peakMonth,
    userMessages,
    avgExchanges: Math.round((userMessages / Math.max(1, total)) * 10) / 10,
    oneShotPct: pct(oneShot),
    marathonPct: pct(marathon),
    toolPct: pct(withTool),
    attachmentPct: pct(withAttach),
    themes,
    topTopics,
    recurringTasks,
    maturity: {
      score,
      level: LEVELS[idx],
      nextLevel: LEVELS[Math.min(3, idx + 1)],
      signals,
    },
    playbook,
    hourHistogram,
    dowHistogram,
  };
}
