// ============================================================================
// L'ATTESTATION (v2.13, cycle « preuve ») — une page de preuve qu'on ne peut
// pas retoucher sans que ça se voie.
//
// Le journal « Ce que Claude a vu » et le rapport de couverture sont des pages
// HTML sur le poste : un DPO qui les reçoit n'a aucun moyen de savoir si un
// chiffre a été corrigé à la main. L'attestation ferme ce trou : la page porte,
// dans son en-tête, un jeton signé qui dit QUI l'a produite, QUAND, les
// COMPTES qu'elle affiche, et l'EMPREINTE (SHA-256) du reste de la page.
// Changer un chiffre, c'est changer l'empreinte : la signature ne tient plus.
//
// DEUX NIVEAUX DE SIGNATURE, le même jeton :
//   - abonné : la clé de sceau du cabinet, certifiée par Ai4x (sceau.js) —
//     l'attestation est « certifiée » : on sait quel cabinet l'a produite ;
//   - essai, ou licence d'avant le sceau : une clé de poste, créée une fois
//     sur ce poste (droits 600) — l'attestation prouve l'intégrité de la page
//     et qu'un même poste l'a signée, pas l'identité du cabinet. Elle le dit.
//
// L'ATTESTATION DIT LA VÉRITÉ, FUITES COMPRISES : à la différence du sceau,
// qui refuse de sceller une fuite, une page qui affiche « 3 valeurs réelles
// retrouvées » est attestée telle quelle. Le DPO reçoit le vrai chiffre, signé.
//
// Séparation des domaines : signature sur « NANOA1.charge » — un certificat
// ou un sceau ne peuvent pas être rejoués comme attestation, ni l'inverse.
// Vérification hors ligne : scripts/verifier-preuve.mjs, l'appli de bureau
// (« Vérifier une preuve… »), et — à venir — la page ai4x.academy/verifier-sceau.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { b64urlEncode } from "./licence.js";
import { verifyCertificate } from "./sceau.js";

export const ATT_PREFIX = "NANOA1";
export const META_NAME = "nanomizer-attestation";
export const POSTE_KEY_FILE = ".nanomizer-poste-signature.json";

const b64urlDecode = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");
const encodeJson = (o) => b64urlEncode(Buffer.from(JSON.stringify(o), "utf8"));
const META_RX = new RegExp(`<meta name="${META_NAME}" content="[^"]*">\\n?`, "g");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ------------------------------------------------ identité de poste ---- */

/* Une paire Ed25519 par poste, créée à la première preuve, dans le dossier
   Anonymiseur-Ai4x (droits 600). Jamais partagée : elle ne prouve que « le
   même poste a signé », ce qui est exactement ce qu'elle doit prouver. */
export function posteIdentity(dir) {
  const f = path.join(dir, POSTE_KEY_FILE);
  let jwk = null;
  try { jwk = JSON.parse(fs.readFileSync(f, "utf8")); } catch {}
  if (!jwk || !jwk.x || !jwk.d) {
    const { privateKey } = crypto.generateKeyPairSync("ed25519");
    const full = privateKey.export({ format: "jwk" });
    jwk = { kty: "OKP", crv: "Ed25519", x: full.x, d: full.d, cree: new Date().toISOString() };
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(f, JSON.stringify(jwk, null, 2) + "\n", { mode: 0o600 });
  }
  const privateKey = crypto.createPrivateKey({ key: { kty: "OKP", crv: "Ed25519", x: jwk.x, d: jwk.d }, format: "jwk" });
  return { cert: null, posteKey: jwk.x, privateKey };
}

function publicKeyFromX(x) {
  return crypto.createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x }, format: "jwk" });
}

/* ------------------------------------------------ empreinte ------------ */

/* L'empreinte porte sur la page SANS son jeton (le jeton contient l'empreinte,
   il ne peut pas s'inclure lui-même). */
export function hashHtml(html) {
  return crypto.createHash("sha256").update(String(html).replace(META_RX, ""), "utf8").digest("hex");
}

/* ------------------------------------------------ le jeton ------------- */

/* a : { genre: "journal"|"couverture", emis, du, au, comptes: {…nombres}, sha, ver } */
export function buildAttestation(identity, a) {
  const body = encodeJson({
    v: 1, c: identity.cert || null, pk: identity.cert ? null : identity.posteKey,
    genre: a.genre, emis: a.emis, du: a.du || null, au: a.au || null, comptes: a.comptes || {}, sha: a.sha, ver: a.ver,
  });
  const sig = crypto.sign(null, Buffer.from(`${ATT_PREFIX}.${body}`), identity.privateKey);
  return `${ATT_PREFIX}.${body}.${b64urlEncode(sig)}`;
}

export function verifyAttestation(token, trustedKeys) {
  const p = String(token || "").trim().split(".");
  if (p.length !== 3 || p[0] !== ATT_PREFIX) return { ok: false, reason: "ce n'est pas une attestation Nanomizer" };
  let a;
  try { a = JSON.parse(b64urlDecode(p[1]).toString("utf8")); } catch { return { ok: false, reason: "attestation illisible" }; }
  let publicKey, cabinet = null, certifie = false;
  if (a.c) {
    const c = verifyCertificate(a.c, trustedKeys);
    if (!c.ok) return { ok: false, reason: c.reason };
    cabinet = c.payload;
    certifie = true;
    try { publicKey = publicKeyFromX(c.payload.spk); } catch { return { ok: false, reason: "clé du cabinet illisible" }; }
  } else if (a.pk) {
    try { publicKey = publicKeyFromX(a.pk); } catch { return { ok: false, reason: "clé de poste illisible" }; }
  } else {
    return { ok: false, reason: "attestation sans signataire" };
  }
  let ok = false;
  try { ok = crypto.verify(null, Buffer.from(`${ATT_PREFIX}.${p[1]}`), publicKey, b64urlDecode(p[2])); } catch {}
  if (!ok) return { ok: false, reason: certifie ? "signature du cabinet invalide (attestation modifiée)" : "signature du poste invalide (attestation modifiée)" };
  if (certifie && a.emis > cabinet.exp) return { ok: false, reason: "émise après la fin de l'abonnement du cabinet" };
  return { ok: true, certifie, cabinet, att: a };
}

/* ------------------------------------------------ la page -------------- */

function piedDePage(identity, a) {
  const qui = identity.cert
    ? "signée par le cabinet, dont l'identité est certifiée par Ai4x"
    : "signée par ce poste seul (essai ou licence sans sceau) : elle prouve que la page n'a pas été modifiée, pas l'identité du cabinet";
  return `<section class="attestation" style="margin-top:28px;padding:12px 14px;border:1px solid #d9d4c7;border-radius:8px;font-size:13px;color:#555">` +
    `<strong>Page de preuve signée.</strong> Produite le ${esc(a.emis)}${a.du ? `, période du ${esc(a.du)} au ${esc(a.au)}` : ""}, ` +
    `${qui}. Le jeton d'attestation (<code>NANOA1…</code>) est dans l'en-tête HTML de cette page et porte son empreinte : ` +
    `un chiffre modifié à la main invalide la signature. Vérifier hors ligne : l'appli Nanomizer → « Vérifier une preuve… », ` +
    `ou <code>node scripts/verifier-preuve.mjs &lt;cette page&gt;</code>.</section>\n`;
}

/* Signe une page : pied de page visible (dans l'empreinte), puis jeton dans
   l'en-tête (hors empreinte). → { html, token, certifie } */
export function attestHtml(identity, html, a) {
  let page = String(html);
  const pied = piedDePage(identity, a);
  page = page.includes("</main>") ? page.replace("</main>", pied + "</main>") : page.replace("</body>", pied + "</body>");
  const sha = hashHtml(page);
  const token = buildAttestation(identity, { ...a, sha });
  const meta = `<meta name="${META_NAME}" content="${token}">\n`;
  page = page.includes("<head>") ? page.replace("<head>", "<head>" + meta) : meta + page;
  return { html: page, token, certifie: !!identity.cert };
}

export function extractAttestation(html) {
  const m = String(html).match(new RegExp(`<meta name="${META_NAME}" content="([^"]*)">`));
  return m ? m[1] : null;
}

/* Vérifie une page reçue : jeton présent, signature valide, empreinte exacte. */
export function verifyAttestedHtml(html, trustedKeys) {
  const token = extractAttestation(html);
  if (!token) return { ok: false, reason: "cette page ne porte pas d'attestation Nanomizer" };
  const v = verifyAttestation(token, trustedKeys);
  if (!v.ok) return v;
  if (hashHtml(html) !== v.att.sha) return { ok: false, reason: "page modifiée après signature (empreinte différente)", certifie: v.certifie, cabinet: v.cabinet, att: v.att };
  return v;
}

/* Le verdict en français, pour la ligne de commande, l'appli et l'IA. */
export function decrireVerification(v) {
  if (!v.ok) return `✗ Preuve NON vérifiée : ${v.reason}.`;
  const a = v.att;
  const comptes = Object.entries(a.comptes || {}).map(([k, n]) => `${k} ${n}`).join(", ");
  return [
    `✓ Preuve vérifiée — ${a.genre === "couverture" ? "rapport de couverture" : "journal « Ce que l'IA a vu »"}, produit le ${a.emis}` +
      (a.du ? ` (période ${a.du} → ${a.au})` : "") + `, Nanomizer ${a.ver}.`,
    v.certifie ? `Signée par ${v.cabinet.org}, identité certifiée par Ai4x.` : "Signée par un poste seul (essai ou licence sans sceau) : intégrité prouvée, identité du cabinet non certifiée.",
    comptes ? `Comptes attestés : ${comptes}.` : "",
  ].filter(Boolean).join("\n");
}
