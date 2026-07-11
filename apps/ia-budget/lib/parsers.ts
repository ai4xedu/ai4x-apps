import type { ParsedConversation, ParsedMessage } from "./types";

/**
 * Parseurs d'exports officiels. Tout s'exécute dans le navigateur :
 * le fichier n'est jamais téléversé.
 *
 * - ChatGPT : Paramètres → Gestion des données → Exporter → conversations.json
 * - Claude  : Paramètres → Confidentialité → Exporter mes données → conversations.json
 */

export class ParseError extends Error {}

export function parseExport(raw: string): ParsedConversation[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ParseError(
      "Ce fichier n'est pas un JSON valide. Attendu : le fichier conversations.json de votre export ChatGPT ou Claude.",
    );
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new ParseError("Le fichier ne contient aucune conversation.");
  }
  const first = data[0] as Record<string, unknown>;
  if ("mapping" in first) return parseChatGpt(data as ChatGptConversation[]);
  if ("chat_messages" in first) return parseClaude(data as ClaudeConversation[]);
  throw new ParseError(
    "Format non reconnu. Formats pris en charge : export ChatGPT (conversations.json) et export Claude (conversations.json). Gemini arrive bientôt.",
  );
}

/* ---------- ChatGPT ---------- */

interface ChatGptNode {
  message?: {
    author?: { role?: string };
    content?: { parts?: unknown[] };
    create_time?: number | null;
    metadata?: { model_slug?: string };
  } | null;
}

interface ChatGptConversation {
  id?: string;
  conversation_id?: string;
  title?: string;
  create_time?: number;
  mapping?: Record<string, ChatGptNode>;
}

function parseChatGpt(convos: ChatGptConversation[]): ParsedConversation[] {
  const out: ParsedConversation[] = [];
  for (const c of convos) {
    const messages: ParsedMessage[] = [];
    let model = "gpt-5";
    for (const node of Object.values(c.mapping ?? {})) {
      const m = node.message;
      if (!m?.author?.role) continue;
      const role = m.author.role;
      if (role !== "user" && role !== "assistant") continue;
      const text = (m.content?.parts ?? [])
        .filter((p): p is string => typeof p === "string")
        .join("\n")
        .trim();
      if (!text) continue;
      if (m.metadata?.model_slug) model = m.metadata.model_slug;
      messages.push({
        role,
        text,
        timestamp: m.create_time ? m.create_time * 1000 : (c.create_time ?? 0) * 1000,
      });
    }
    if (messages.length === 0) continue;
    messages.sort((a, b) => a.timestamp - b.timestamp);
    out.push({
      id: c.conversation_id ?? c.id ?? `chatgpt-${out.length}`,
      provider: "chatgpt",
      title: c.title ?? "Sans titre",
      model,
      messages,
      createdAt: messages[0].timestamp || (c.create_time ?? 0) * 1000,
    });
  }
  return out;
}

/* ---------- Claude ---------- */

interface ClaudeMessage {
  sender?: string;
  text?: string;
  created_at?: string;
}

interface ClaudeConversation {
  uuid?: string;
  name?: string;
  created_at?: string;
  model?: string;
  chat_messages?: ClaudeMessage[];
}

function parseClaude(convos: ClaudeConversation[]): ParsedConversation[] {
  const out: ParsedConversation[] = [];
  for (const c of convos) {
    const messages: ParsedMessage[] = [];
    for (const m of c.chat_messages ?? []) {
      const role = m.sender === "human" ? "user" : m.sender === "assistant" ? "assistant" : null;
      const text = (m.text ?? "").trim();
      if (!role || !text) continue;
      messages.push({
        role,
        text,
        timestamp: m.created_at ? Date.parse(m.created_at) : Date.parse(c.created_at ?? "") || 0,
      });
    }
    if (messages.length === 0) continue;
    messages.sort((a, b) => a.timestamp - b.timestamp);
    out.push({
      id: c.uuid ?? `claude-${out.length}`,
      provider: "claude",
      title: c.name || "Sans titre",
      model: c.model ?? "claude-sonnet",
      messages,
      createdAt: messages[0].timestamp,
    });
  }
  return out;
}
