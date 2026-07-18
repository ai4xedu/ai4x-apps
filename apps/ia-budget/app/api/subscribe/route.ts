import { NextResponse } from "next/server";

/**
 * Capture email du lead magnet → Brevo.
 * La clé API et l'ID de liste vivent dans les variables d'environnement
 * Netlify (jamais dans le navigateur). SEUL l'email transite ici — jamais
 * le contenu des conversations, qui reste 100 % local.
 */

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let email = "";
  let level = "";
  let score: number | null = null;
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
    level = String(body.level ?? "").slice(0, 40);
    score = Number.isFinite(body.score) ? Number(body.score) : null;
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Email invalide." }, { status: 400 });
  }

  const key = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!key || !listId) {
    // Le lead magnet ne doit pas casser si Brevo n'est pas encore branché :
    // on débloque quand même le rapport, mais on signale la non-config.
    return NextResponse.json({ ok: true, stored: false, note: "Brevo non configuré." });
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true,
        attributes: {
          IA_AUDIT_SCORE: score,
          IA_AUDIT_LEVEL: level,
          SOURCE: "audit-ia-lead-magnet",
        },
      }),
    });
    // Brevo renvoie 201 (créé) ou 204 (mis à jour) ; 400 "already in list" est OK aussi.
    if (res.ok || res.status === 204) {
      return NextResponse.json({ ok: true, stored: true });
    }
    const detail = await res.text().catch(() => "");
    if (detail.includes("already") || detail.includes("duplicate")) {
      return NextResponse.json({ ok: true, stored: true });
    }
    return NextResponse.json({ ok: true, stored: false, note: "Brevo: " + res.status });
  } catch {
    // On ne punit pas l'utilisateur pour une panne côté serveur : on débloque.
    return NextResponse.json({ ok: true, stored: false, note: "Brevo injoignable." });
  }
}
