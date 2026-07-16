#!/usr/bin/env node
/**
 * Récupère votre consommation Claude RÉELLE via l'Admin API Anthropic et
 * produit un CSV (anthropic-usage.csv) que vous glissez dans Relevé IA.
 *
 * Couvre, ventilé PAR MODÈLE et par jour :
 *   - tout l'usage API (clés API, crédits, et Claude Code sur clé API)
 *   - Claude Code sur abonnement Max/Pro (via l'endpoint analytics dédié)
 *
 * Ce qui reste hors de portée (limite d'Anthropic, pas du script) :
 *   - le chat claude.ai pur en Pro/Max : forfaitaire, non ventilé par modèle.
 *     Saisissez son prix comme "forfait" directement dans l'app.
 *
 * CONFIDENTIALITÉ : votre clé admin ne sert qu'à appeler api.anthropic.com
 * depuis votre machine. Rien n'est envoyé ailleurs. Le CSV ne contient que
 * des agrégats (dates, modèles, tokens, coût) — aucun contenu de conversation.
 *
 * USAGE :
 *   export ANTHROPIC_ADMIN_KEY=sk-ant-admin01-...
 *   node fetch-anthropic-usage.mjs                # 6 derniers mois
 *   node fetch-anthropic-usage.mjs --months 12    # 12 mois
 *   node fetch-anthropic-usage.mjs --out mon.csv  # nom de sortie
 *
 * Créez la clé admin ici (gratuit, rôle admin requis) :
 *   https://platform.claude.com/settings/admin-keys
 */

import { writeFileSync } from "node:fs";

const KEY = process.env.ANTHROPIC_ADMIN_KEY;
if (!KEY) {
  console.error(
    "❌ Variable ANTHROPIC_ADMIN_KEY absente.\n" +
      "   export ANTHROPIC_ADMIN_KEY=sk-ant-admin01-...\n" +
      "   (créez-la sur https://platform.claude.com/settings/admin-keys)",
  );
  process.exit(1);
}
if (!KEY.startsWith("sk-ant-admin")) {
  console.warn(
    "⚠️  La clé ne ressemble pas à une clé admin (sk-ant-admin01-…). " +
      "Les endpoints d'organisation exigent une clé ADMIN, pas une clé API classique.",
  );
}

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const MONTHS = Number(getArg("--months", "6")) || 6;
const OUT = getArg("--out", "anthropic-usage.csv");

const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);
const startingAt = start.toISOString();
const endingAt = now.toISOString();

const BASE = "https://api.anthropic.com";
const HEADERS = { "x-api-key": KEY, "anthropic-version": "2023-06-01" };

// Grille tarifaire (USD / M tokens) — cache_read ≈ 0,1× input, cache_write ≈ 1,25× input
const PRICES = {
  opus: { in: 5, out: 25 },
  fable: { in: 10, out: 50 },
  sonnet: { in: 3, out: 15 },
  haiku: { in: 1, out: 5 },
};
function priceFor(model) {
  const s = (model || "").toLowerCase();
  if (s.includes("opus")) return PRICES.opus;
  if (s.includes("fable")) return PRICES.fable;
  if (s.includes("sonnet")) return PRICES.sonnet;
  if (s.includes("haiku")) return PRICES.haiku;
  return PRICES.sonnet; // défaut prudent
}
function costUsd(model, inTok, outTok, cacheRead = 0, cacheWrite = 0) {
  const p = priceFor(model);
  return (
    (inTok / 1e6) * p.in +
    (outTok / 1e6) * p.out +
    (cacheRead / 1e6) * p.in * 0.1 +
    (cacheWrite / 1e6) * p.in * 1.25
  );
}

async function getJson(path, params) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, x));
    else url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText} sur ${path}\n${body.slice(0, 500)}`);
  }
  return res.json();
}

/** Pagination générique (page / next_page). */
async function getAll(path, params) {
  const out = [];
  let page = undefined;
  for (let guard = 0; guard < 200; guard++) {
    const data = await getJson(path, page ? { ...params, page } : params);
    if (Array.isArray(data.data)) out.push(...data.data);
    if (data.has_more && data.next_page) page = data.next_page;
    else break;
  }
  return out;
}

const dayOf = (iso) => (iso || "").slice(0, 10); // YYYY-MM-DD

// date|model -> agrégat
const rows = new Map();
function add(date, model, inTok, outTok, cacheRead, cacheWrite, exactCostUsd) {
  if (!date || !model) return;
  const key = `${date}|${model}`;
  const r = rows.get(key) ?? {
    date,
    model,
    input: 0,
    output: 0,
    cache: 0,
    cost: 0,
  };
  r.input += inTok || 0;
  r.output += outTok || 0;
  r.cache += (cacheRead || 0) + (cacheWrite || 0);
  r.cost += exactCostUsd != null ? exactCostUsd : costUsd(model, inTok, outTok, cacheRead, cacheWrite);
  rows.set(key, r);
}

async function main() {
  console.log(`📅 Période : ${startingAt.slice(0, 10)} → ${endingAt.slice(0, 10)} (${MONTHS} mois)`);

  // 1) Usage API par modèle et par jour (inclut Claude Code sur clé API)
  try {
    console.log("→ Usage API (usage_report/messages, group_by model)…");
    const buckets = await getAll("/v1/organizations/usage_report/messages", {
      starting_at: startingAt,
      ending_at: endingAt,
      bucket_width: "1d",
      "group_by[]": ["model"],
    });
    let n = 0;
    for (const b of buckets) {
      const date = dayOf(b.starting_at || b.start || b.date);
      for (const r of b.results ?? b.data ?? []) {
        const model = r.model || r.group?.model || "claude";
        add(
          date,
          model,
          num(r.input_tokens ?? r.uncached_input_tokens),
          num(r.output_tokens),
          num(r.cache_read_input_tokens ?? r.cache_read_tokens),
          num(r.cache_creation_input_tokens ?? r.cache_creation_tokens),
        );
        n++;
      }
    }
    console.log(`  ✓ ${n} lignes d'usage API`);
  } catch (e) {
    console.warn(`  ⚠️ usage_report/messages a échoué : ${e.message}`);
  }

  // 2) Claude Code — capte l'usage sur ABONNEMENT (absent du rapport API ci-dessus)
  try {
    console.log("→ Claude Code (usage_report/claude_code, model_breakdown)…");
    const records = await getAll("/v1/organizations/usage_report/claude_code", {
      starting_at: startingAt.slice(0, 10),
      ending_at: endingAt.slice(0, 10),
    });
    let n = 0;
    for (const rec of records) {
      // On n'ajoute que l'usage "subscription" pour éviter le double-comptage
      // avec le rapport API (customer_type "api" est déjà compté en 1).
      if (rec.customer_type && rec.customer_type !== "subscription") continue;
      const date = dayOf(rec.date || rec.starting_at);
      for (const mb of rec.model_breakdown ?? []) {
        const model = mb.model || "claude";
        const t = mb.tokens ?? {};
        const cents = mb.estimated_cost?.amount;
        add(
          date,
          model,
          num(t.input),
          num(t.output),
          num(t.cache_read),
          num(t.cache_creation),
          cents != null ? Number(cents) / 100 : undefined,
        );
        n++;
      }
    }
    console.log(`  ✓ ${n} lignes Claude Code (abonnement)`);
  } catch (e) {
    console.warn(
      `  ⚠️ usage_report/claude_code a échoué : ${e.message}\n` +
        "     (normal si vous n'utilisez pas Claude Code, ou si l'endpoint n'est pas activé sur votre orga)",
    );
  }

  if (rows.size === 0) {
    console.error(
      "❌ Aucune donnée récupérée. Vérifiez que la clé est bien une clé ADMIN et que l'orga a de l'usage sur la période.",
    );
    process.exit(2);
  }

  // Écriture du CSV (format lu directement par Relevé IA)
  const header = "date,model,cost,input_tokens,output_tokens,cache_read_tokens,currency";
  const lines = [...rows.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) =>
      [r.date, r.model, r.cost.toFixed(4), r.input, r.output, r.cache, "USD"].join(","),
    );
  writeFileSync(OUT, header + "\n" + lines.join("\n") + "\n", "utf8");

  // Récap console
  const byMonth = {};
  for (const r of rows.values()) {
    const m = r.date.slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + r.cost;
  }
  console.log(`\n✅ Écrit : ${OUT} (${rows.size} lignes)`);
  console.log("   Coût estimé par mois (USD) :");
  for (const [m, c] of Object.entries(byMonth).sort())
    console.log(`     ${m} : $${c.toFixed(2)}`);
  console.log(`\n👉 Glissez ${OUT} dans Relevé IA (zone d'import).`);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

main().catch((e) => {
  console.error("❌ Erreur :", e.message);
  process.exit(1);
});
