/**
 * Estimation locale du nombre de tokens.
 * Heuristique : ~4 caractères par token pour du texte courant,
 * un peu plus dense pour du code. Suffisant pour un coût équivalent
 * indicatif — l'app assume une précision de l'ordre de ±15 %.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const looksLikeCode = /```|;\n|=>|def |function |import |const /.test(text);
  const charsPerToken = looksLikeCode ? 3.2 : 4;
  return Math.max(1, Math.round(text.length / charsPerToken));
}

/**
 * Coût en tokens d'entrée d'une conversation complète, en tenant compte
 * du fait que chaque tour renvoie tout l'historique au modèle.
 * C'est ce cumul qui rend les conversations longues coûteuses — et que
 * le coach explique à l'utilisateur.
 */
export function conversationInputTokens(
  turns: { role: "user" | "assistant"; tokens: number }[],
): number {
  let context = 0;
  let total = 0;
  for (const turn of turns) {
    if (turn.role === "user") {
      context += turn.tokens;
      total += context; // tout l'historique est renvoyé à chaque requête
    } else {
      context += turn.tokens;
    }
  }
  return total;
}
