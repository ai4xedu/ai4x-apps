// Calcul et mise en page des devis et factures Nanomizer (usage interne YGH).
// Séparé de devis.mjs pour être testé (test/devis.test.js).

export const TVA = 0.2;
export const OFFRES = {
  solo: { libelle: "Nanomizer — licence à vie, 1 poste", prixHT: 500, postesInclus: 1, supplement: 500 },
  equipe: { libelle: "Nanomizer Équipe — licence à vie, une clé, jusqu'à 20 postes, 1 h de prise en main", prixHT: 5000, postesInclus: 20, supplement: 200 },
};

/* Lignes et totaux, en dirhams HT/TVA/TTC, arrondis au centime. */
export function chiffrer({ offre = "equipe", postes = 1, remisePct = 0 }) {
  const o = OFFRES[offre];
  if (!o) throw new Error(`Offre inconnue : ${offre} (solo ou equipe)`);
  const lignes = [{ libelle: o.libelle, qte: 1, pu: o.prixHT }];
  const extra = Math.max(0, postes - o.postesInclus);
  if (extra) lignes.push({ libelle: "Poste supplémentaire sur la même clé", qte: extra, pu: o.supplement });
  const brut = lignes.reduce((s, l) => s + l.qte * l.pu, 0);
  const remise = Math.round(brut * (remisePct / 100) * 100) / 100;
  const ht = Math.round((brut - remise) * 100) / 100;
  const tva = Math.round(ht * TVA * 100) / 100;
  return { lignes, brut, remise, remisePct, ht, tva, ttc: Math.round((ht + tva) * 100) / 100 };
}

const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
  "treize", "quatorze", "quinze", "seize"];
const TENS = { 20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante", 60: "soixante" };

function below100(n) {
  if (n <= 16) return UNITS[n];
  if (n < 20) return "dix-" + UNITS[n - 10];
  if (n < 70) {
    const t = Math.floor(n / 10) * 10, u = n % 10;
    return TENS[t] + (u === 0 ? "" : u === 1 ? " et un" : "-" + UNITS[u]);
  }
  if (n < 80) return "soixante" + (n === 71 ? " et onze" : "-" + below100(n - 60));
  const u = n - 80;
  return u === 0 ? "quatre-vingts" : "quatre-vingt-" + below100(u);
}

function below1000(n) {
  const c = Math.floor(n / 100), r = n % 100;
  if (!c) return below100(r);
  const head = c === 1 ? "cent" : UNITS[c] + " cent" + (r === 0 ? "s" : "");
  return r ? `${head} ${below100(r)}` : head;
}

/* Nombre entier en toutes lettres (orthographe traditionnelle). */
export function enLettres(n) {
  n = Math.floor(n);
  if (n === 0) return "zéro";
  const parts = [];
  const millions = Math.floor(n / 1e6), milliers = Math.floor((n % 1e6) / 1000), reste = n % 1000;
  if (millions) parts.push(millions === 1 ? "un million" : `${below1000(millions)} millions`);
  if (milliers) parts.push(milliers === 1 ? "mille" : `${below1000(milliers).replace(/s$/, "")} mille`);
  if (reste) parts.push(below1000(reste));
  return parts.join(" ");
}

export function montantEnLettres(v) {
  const dh = Math.floor(v + 1e-9), cts = Math.round((v - dh) * 100);
  const s = `${enLettres(dh)} dirham${dh > 1 ? "s" : ""}`;
  return cts ? `${s} et ${enLettres(cts)} centime${cts > 1 ? "s" : ""}` : s;
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mad = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";

/* Document HTML A4, à imprimer en PDF depuis le navigateur. */
export function renderDocument({ type, numero, date, validiteJours = 30, vendeur, client, calcul, licenceRef = "" }) {
  const isFacture = type === "facture";
  const titre = isFacture ? "FACTURE" : "DEVIS";
  const v = vendeur, c = client;
  const ids = (o) => [o.ice && `ICE : ${o.ice}`, o.if && `IF : ${o.if}`, o.rc && `RC : ${o.rc}`, o.patente && `Patente : ${o.patente}`, o.cnss && `CNSS : ${o.cnss}`]
    .filter(Boolean).map(esc).join(" · ");
  const lignes = calcul.lignes.map((l) => `<tr><td>${esc(l.libelle)}</td><td class="n">${l.qte}</td><td class="n">${mad(l.pu)}</td><td class="n">${mad(l.qte * l.pu)}</td></tr>`).join("");
  const echeance = new Date(new Date(date).getTime() + validiteJours * 86400000).toISOString().slice(0, 10);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${titre} ${esc(numero)} — ${esc(c.raison)}</title>
<style>
@page { size: A4; margin: 18mm; }
body { font: 11pt/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0B0D12; margin: 0; }
.page { max-width: 180mm; margin: 0 auto; padding: 8mm 0; display: flex; flex-direction: column; gap: 7mm; }
header { display: flex; justify-content: space-between; gap: 8mm; align-items: flex-start; }
h1 { font: 700 20pt/1 ui-monospace, Menlo, monospace; margin: 0; letter-spacing: .02em; }
.mark { font: 700 12pt ui-monospace, Menlo, monospace; } .mark i { display: inline-block; width: 9mm; height: 3mm; background: #0B0D12; margin-right: 2mm; vertical-align: 1px; }
.muted { color: #585C6C; font-size: 9.5pt; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
.box { border: 1px solid #DCDCE6; padding: 4mm; } .box b { display: block; margin-bottom: 1mm; }
table { width: 100%; border-collapse: collapse; } th, td { padding: 2.2mm 2mm; border-bottom: 1px solid #DCDCE6; text-align: left; vertical-align: top; }
th { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; color: #585C6C; font-weight: 500; }
.n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.totaux { margin-left: auto; width: 75mm; } .totaux td { border: 0; padding: 1mm 2mm; } .totaux tr.ttc td { font-weight: 700; border-top: 1.5px solid #0B0D12; padding-top: 2mm; }
.lettres { font-style: italic; }
footer { border-top: 1px solid #DCDCE6; padding-top: 3mm; font-size: 8.5pt; color: #585C6C; }
</style></head><body><div class="page">
<header>
  <div><div class="mark"><i></i>${esc(v.marque || "Nanomizer")}</div><p class="muted" style="margin:2mm 0 0">${esc(v.raison)}<br>${esc(v.adresse || "")}</p></div>
  <div style="text-align:right"><h1>${titre}</h1><p style="margin:2mm 0 0">N° <b>${esc(numero)}</b><br>Date : ${esc(date)}${isFacture ? "" : `<br>Valable jusqu'au : ${esc(echeance)}`}</p></div>
</header>
<div class="parties">
  <div class="box"><b>Émetteur</b>${esc(v.raison)}<br><span class="muted">${ids(v)}</span>${v.email ? `<br><span class="muted">${esc(v.email)}${v.telephone ? " · " + esc(v.telephone) : ""}</span>` : ""}</div>
  <div class="box"><b>Client</b>${esc(c.raison)}${c.adresse ? `<br>${esc(c.adresse)}` : ""}<br><span class="muted">${ids(c) || "ICE du client : à compléter"}</span></div>
</div>
<table><thead><tr><th>Désignation</th><th class="n">Qté</th><th class="n">P.U. HT</th><th class="n">Total HT</th></tr></thead><tbody>${lignes}</tbody></table>
<table class="totaux"><tbody>
  ${calcul.remise ? `<tr><td>Sous-total HT</td><td class="n">${mad(calcul.brut)}</td></tr><tr><td>Remise ${calcul.remisePct} %</td><td class="n">− ${mad(calcul.remise)}</td></tr>` : ""}
  <tr><td>Total HT</td><td class="n">${mad(calcul.ht)}</td></tr>
  <tr><td>TVA 20 %</td><td class="n">${mad(calcul.tva)}</td></tr>
  <tr class="ttc"><td>Total TTC</td><td class="n">${mad(calcul.ttc)}</td></tr>
</tbody></table>
<p class="lettres">Arrêté${isFacture ? "e la présente facture" : " le présent devis"} à la somme de : ${esc(montantEnLettres(calcul.ttc))} TTC.</p>
<div class="box"><b>Ce qui est inclus</b>Licence à vie, mises à jour comprises, sans abonnement. Le connecteur fonctionne entièrement sur vos postes : aucune donnée n'est envoyée à ${esc(v.raison)} ni à un serveur. La dé-anonymisation de vos fichiers reste disponible pour toujours, même sans licence.${licenceRef ? `<br><span class="muted">Référence de licence : ${esc(licenceRef)}</span>` : ""}</div>
<div><b>Règlement</b><p style="margin:1mm 0 0">Par virement${isFacture ? "" : ", à la commande"} — RIB : ${esc(v.rib || "à compléter")}${v.banque ? ` (${esc(v.banque)})` : ""}. La clé de licence est délivrée à réception du virement.</p></div>
${isFacture ? "" : `<p class="muted">Bon pour accord (date, cachet et signature) :</p><div style="height:22mm;border:1px dashed #DCDCE6"></div>`}
<footer>${esc(v.raison)} · ${ids(v)}${v.mentions ? " · " + esc(v.mentions) : ""}</footer>
</div></body></html>
`;
}
