// ============================================================================
// LICENCE — vérification 100 % HORS LIGNE (modèle « clé de licence »).
//
// Contrainte fondatrice : un outil qui promet « rien ne sort de votre poste »
// ne peut pas appeler un serveur pour valider sa licence. La vérification est
// donc CRYPTOGRAPHIQUE et locale : la clé est un jeton signé (Ed25519) que le
// connecteur vérifie avec une clé publique embarquée. Aucune requête réseau,
// jamais — ni à l'installation, ni à l'usage.
//
// TROIS RÈGLES DE CONCEPTION, qui priment sur la protection :
//
//   1. LE DÉCODAGE NE S'ARRÊTE JAMAIS. À l'expiration, on cesse d'anonymiser
//      de NOUVEAUX fichiers ; `deanonymiser` et `etat_cle` continuent de
//      fonctionner pour toujours. Les données d'un client ne sont jamais
//      prises en otage par une facture impayée — ce serait indéfendable, et
//      commercialement suicidaire sur un outil de confiance.
//   2. ON PRÉVIENT LARGEMENT. Un avertissement apparaît dès J-30, dans chaque
//      réponse d'outil. Personne ne doit découvrir l'expiration un matin de
//      clôture.
//   3. LA LICENCE NE PARLE DE PERSONNE. Elle contient un titulaire, un nombre
//      de postes et des dates — aucune donnée d'usage, aucun identifiant
//      machine, rien qui puisse ressembler à de la télémétrie.
//
// Honnêteté sur la protection : c'est une serrure de courtoisie, pas un DRM.
// Le code est du JavaScript lisible ; un utilisateur déterminé peut le
// contourner. Le but est de structurer une relation commerciale avec des
// cabinets sérieux, pas de gagner une course aux armements — et le coût d'un
// vrai DRM (activation en ligne, empreinte machine) serait payé en promesse
// de confidentialité, donc bien trop cher.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/* Clé PUBLIQUE de signature (SPKI, base64). La privée n'est pas dans ce
   dépôt : sans elle, personne ne peut émettre de licence ; avec elle,
   n'importe qui le peut. */
const PUBLIC_KEY_B64 = "MCowBQYDK2VwAyEA2ecQy6JVQUtn9e+yrbuzQf7I9dcplI8T6dr2fiWTovY=";

export const WARN_DAYS = 30;

function publicKey() {
  return crypto.createPublicKey({
    key: Buffer.from(PUBLIC_KEY_B64, "base64"),
    format: "der",
    type: "spki",
  });
}

function b64urlDecode(s) {
  return Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function b64urlEncode(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* Une clé a la forme NANO1.<payload b64url>.<signature b64url>. */
export function parseKey(raw) {
  const key = String(raw || "").trim().replace(/\s+/g, "");
  if (!key) return { ok: false, reason: "absente" };
  const parts = key.split(".");
  if (parts.length !== 3 || parts[0] !== "NANO1") {
    return { ok: false, reason: "format inconnu (une clé commence par NANO1.)" };
  }
  let payload;
  try { payload = JSON.parse(b64urlDecode(parts[1]).toString("utf8")); }
  catch { return { ok: false, reason: "clé illisible (copiée en entier ?)" }; }
  let valid = false;
  try {
    // ⚠️ La signature porte sur la charge ENCODÉE (parts[1] tel quel), pas sur
    // le JSON décodé — c'est ce que signe scripts/emettre-licence.mjs. Vérifier
    // le décodé rejetterait toutes les licences, y compris les vraies.
    valid = crypto.verify(null, Buffer.from(parts[1]), publicKey(), b64urlDecode(parts[2]));
  } catch { valid = false; }
  if (!valid) return { ok: false, reason: "signature invalide (clé modifiée ou inventée)" };
  return { ok: true, payload };
}

/* État de la licence, à un instant donné (l'horloge est injectable pour les
   tests — et parce qu'un test qui dépend de la date du jour est un test qui
   cassera un matin). */
export function licenceStatus(raw, now = new Date()) {
  const parsed = parseKey(raw);
  if (!parsed.ok) return { valid: false, reason: parsed.reason };
  const p = parsed.payload;
  const expires = new Date(p.exp + "T23:59:59");
  if (Number.isNaN(expires.getTime())) return { valid: false, reason: "date d'expiration illisible" };
  const days = Math.ceil((expires - now) / 86400000);
  return {
    valid: days >= 0,
    reason: days >= 0 ? "" : "licence expirée",
    holder: p.org || "—",
    seats: p.seats || 1,
    issuedAt: p.iat || "",
    expiresAt: p.exp,
    daysLeft: days,
    expiringSoon: days >= 0 && days <= WARN_DAYS,
    id: p.id || "",
  };
}

/* Où l'utilisateur peut poser sa clé :
   1. le réglage « Clé de licence » de l'extension (env ANX_LICENCE) ;
   2. un fichier licence.txt dans le dossier de travail — pratique pour un
      cabinet qui déploie sur plusieurs postes par copie. */
export function readLicence(workdir, env = process.env) {
  const fromEnv = String(env.ANX_LICENCE || "").trim();
  if (fromEnv) return { raw: fromEnv, source: "réglages de l'extension" };
  for (const candidate of ["licence.txt", path.join("Anonymiseur-Ai4x", "licence.txt")]) {
    try {
      const p = path.join(workdir, candidate);
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf8").trim();
        if (raw) return { raw, source: candidate };
      }
    } catch {}
  }
  return { raw: "", source: "" };
}

/* Message affiché quand la licence manque ou a expiré. Il doit VENDRE, pas
   punir : l'utilisateur garde l'appli web gratuite et son décodage. */
export function blockedMessage(status) {
  const why = status.reason === "licence expirée"
    ? `Votre licence a expiré le ${status.expiresAt}.`
    : `Aucune licence valide n'est configurée (${status.reason || "absente"}).`;
  return [
    `🔒 ${why}`,
    "Le connecteur (traitement par lots, PDF, OCR, clé d'équipe) fait partie de l'offre Équipes.",
    "Ce qui continue de fonctionner, et continuera toujours : la DÉ-ANONYMISATION de vos fichiers déjà",
    "codés (outil deanonymiser) et l'état de votre clé. Vos données ne sont jamais prises en otage.",
    "L'appli gratuite reste disponible : https://ai4x.academy/anonymiseur-donnees",
    "Pour renouveler ou obtenir une clé : https://ai4x.academy/anonymiseur-donnees#plans",
  ].join("\n");
}

/* Bandeau d'avertissement à coller aux réponses quand l'échéance approche. */
export function warningBanner(status) {
  if (!status.valid || !status.expiringSoon) return "";
  return `⏳ Licence ${status.holder} : ${status.daysLeft} jour(s) restant(s) (expire le ${status.expiresAt}). ` +
    "Pensez au renouvellement — à l'échéance, l'anonymisation s'arrêtera, mais la dé-anonymisation continuera de fonctionner.";
}
