import type { MonthlyReport } from "./types";
import { themeName } from "./classify";
import { PROVIDER_LABELS } from "./pricing";

/**
 * Carte de partage façon "Wrapped" : une image 1080×1350 générée
 * entièrement côté client, contenant uniquement des agrégats
 * (jamais de contenu de conversation). Conçue pour être postée
 * telle quelle — c'est le canal d'acquisition du produit.
 */

const COFFEE_PRICE_EUR = 2.5;

const PALETTE = ["#2a78d6", "#1baf7a", "#eda100", "#4a3aa7", "#e34948", "#e87ba4"];

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

export async function renderShareCard(
  report: MonthlyReport,
  monthLabel: string,
  themeNames: Record<string, string>,
): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const sans = "system-ui, -apple-system, 'Segoe UI', sans-serif";

  // Fond
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, W, H);
  // Halo décoratif discret
  const glow = ctx.createRadialGradient(W / 2, 260, 60, W / 2, 260, 620);
  glow.addColorStop(0, "rgba(42,120,214,0.28)");
  glow.addColorStop(1, "rgba(42,120,214,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Marque
  ctx.textAlign = "center";
  ctx.fillStyle = "#c3c2b7";
  ctx.font = `600 34px ${sans}`;
  ctx.fillText("RELEVÉ IA", W / 2, 110);
  ctx.fillStyle = "#898781";
  ctx.font = `400 30px ${sans}`;
  ctx.fillText(`Mon mois d'IA — ${monthLabel}`, W / 2, 165);

  // Montant héros
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 170px ${sans}`;
  ctx.fillText(fmtEur(report.costEur), W / 2, 360);

  const coffees = Math.max(1, Math.round(report.costEur / COFFEE_PRICE_EUR));
  ctx.fillStyle = "#c3c2b7";
  ctx.font = `400 38px ${sans}`;
  ctx.fillText(`soit l'équivalent de ${coffees} café${coffees > 1 ? "s" : ""} ☕`, W / 2, 435);

  // Stats clés
  const totalTokens = report.inputTokens + report.outputTokens;
  const tokensLabel =
    totalTokens >= 1_000_000
      ? `${(totalTokens / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} millions de tokens`
      : `${Math.max(1, Math.round(totalTokens / 1000))} 000 tokens`;
  ctx.font = `400 32px ${sans}`;
  ctx.fillStyle = "#898781";
  ctx.fillText(`${report.conversations} conversations · ${tokensLabel}`, W / 2, 500);

  // Top thématiques (3)
  ctx.textAlign = "left";
  ctx.fillStyle = "#c3c2b7";
  ctx.font = `600 34px ${sans}`;
  ctx.fillText("Mes sujets du mois", 120, 610);

  const top = report.themes.slice(0, 3);
  const maxCost = Math.max(...top.map((t) => t.costEur), 0.01);
  top.forEach((t, i) => {
    const y = 670 + i * 110;
    const name = themeName(t.themeId, themeNames);
    ctx.fillStyle = "#ffffff";
    ctx.font = `500 36px ${sans}`;
    ctx.fillText(name, 120, y);
    ctx.textAlign = "right";
    ctx.fillText(fmtEur(t.costEur), W - 120, y);
    ctx.textAlign = "left";
    // Barre
    const barW = (W - 240) * (t.costEur / maxCost);
    ctx.fillStyle = "#2c2c2a";
    roundRect(ctx, 120, y + 20, W - 240, 18, 9);
    ctx.fill();
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    roundRect(ctx, 120, y + 20, Math.max(barW, 24), 18, 9);
    ctx.fill();
  });

  // Outils
  const provLine = report.providers
    .map((p) => `${PROVIDER_LABELS[p.provider]} ${fmtEur(p.costEur)}`)
    .join("   ·   ");
  ctx.fillStyle = "#c3c2b7";
  ctx.font = `600 34px ${sans}`;
  ctx.fillText("Mes outils", 120, 1070);
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 34px ${sans}`;
  ctx.fillText(provLine, 120, 1125);

  // Pied de carte
  ctx.textAlign = "center";
  ctx.fillStyle = "#898781";
  ctx.font = `400 28px ${sans}`;
  ctx.fillText("Ce que mon usage de l'IA aurait coûté facturé au token via les API", W / 2, 1230);
  ctx.fillStyle = "#3987e5";
  ctx.font = `600 30px ${sans}`;
  ctx.fillText("Relevé IA — mesurez le vôtre · analyse 100 % locale 🔒", W / 2, 1285);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob a échoué"))), "image/png"),
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Partage natif si dispo (mobile), sinon téléchargement du PNG. */
export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Mon relevé IA" });
      return;
    } catch {
      // partage annulé → repli sur le téléchargement
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
