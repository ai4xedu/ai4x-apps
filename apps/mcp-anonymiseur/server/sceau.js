// ============================================================================
// LE SCEAU (v2.6) — une preuve que le CLIENT de l'avocat peut vérifier.
//
// Le journal « Ce que Claude a vu » prouve, au cabinet, ce qui est sorti. Le
// client, lui, n'a aucun moyen de savoir si son avocat protège son dossier
// quand il utilise l'IA. Le sceau le lui dit, et il peut le vérifier seul.
//
// LA CHAÎNE DE CONFIANCE :
//   1. Ai4x signe, avec la clé des licences, un CERTIFICAT du cabinet :
//      « ce cabinet est abonné, et voici sa clé publique de sceau ». Il
//      voyage dans la licence (champ `sceau`), avec la clé privée de sceau.
//   2. Le connecteur du cabinet signe un SCEAU avec cette clé privée : la
//      période, les comptes du journal audité, 0 fuite. Le certificat est
//      dedans.
//   3. La page publique ai4x.academy/verifier-sceau vérifie les deux
//      signatures, HORS LIGNE (le sceau voyage dans le fragment # de l'URL,
//      que le navigateur n'envoie jamais au serveur).
//
// TROIS RÈGLES :
//   - PAS DE SCEAU SUR UNE FUITE. Si l'audit du journal retrouve une valeur
//     réelle, le connecteur refuse de sceller : un sceau ne dit que la vérité.
//   - LE SCEAU NE PARLE QUE DE COMPTES : ni valeur, ni code, ni nom de
//     fichier. Il cite le cabinet (signé par Ai4x) et une référence choisie
//     par l'avocat.
//   - HONNÊTE SUR SA LIMITE : il atteste ce qui est passé par Hidden Tokens. Un
//     texte collé directement dans une conversation n'y figure pas — le
//     sceau le dit, la page de vérification aussi.
//
// Séparation des domaines : chaque signature porte sur « PRÉFIXE.charge ».
// Sans cela, un certificat (public, dans chaque sceau) serait une licence
// valide : la licence est signée sur la charge seule, avec la même clé.
// ============================================================================
import crypto from "node:crypto";
import qrcode from "qrcode-generator";
import { b64urlEncode } from "./licence.js";

export const CERT_PREFIX = "NANOC1";
export const SEAL_PREFIX = "NANOS1";
export const VERIFY_URL = "https://ai4x.academy/verifier-sceau";

const b64urlDecode = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");
const encodeJson = (o) => b64urlEncode(Buffer.from(JSON.stringify(o), "utf8"));

/* ------------------------------------------------ émission (Ai4x) ------- */

/* Paire de clés de sceau d'un cabinet + certificat signé par Ai4x. Le
   résultat va tel quel dans la charge de la licence : { cert, d }. */
export function issueSealIdentity(ai4xPrivateKey, { org, id, iat, exp }) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const jwk = privateKey.export({ format: "jwk" });
  const spk = publicKey.export({ format: "jwk" }).x;
  const body = encodeJson({ v: 1, org, id, spk, iat, exp });
  const sig = crypto.sign(null, Buffer.from(`${CERT_PREFIX}.${body}`), ai4xPrivateKey);
  return { cert: `${CERT_PREFIX}.${body}.${b64urlEncode(sig)}`, d: jwk.d };
}

/* ------------------------------------------------ vérification --------- */

export function verifyCertificate(cert, trustedKeys) {
  const p = String(cert || "").split(".");
  if (p.length !== 3 || p[0] !== CERT_PREFIX) return { ok: false, reason: "certificat illisible" };
  let payload;
  try { payload = JSON.parse(b64urlDecode(p[1]).toString("utf8")); } catch { return { ok: false, reason: "certificat illisible" }; }
  const signed = Buffer.from(`${CERT_PREFIX}.${p[1]}`);
  let ok = false;
  try { ok = trustedKeys.some((k) => crypto.verify(null, signed, k, b64urlDecode(p[2]))); } catch {}
  return ok ? { ok: true, payload } : { ok: false, reason: "certificat non signé par Ai4x" };
}

function sealPublicKey(spk) {
  return crypto.createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: spk }, format: "jwk" });
}

/* L'identité de sceau d'une licence, ou null (essai, ancienne licence). */
export function sealIdentity(licencePayload, trustedKeys) {
  const s = licencePayload && licencePayload.sceau;
  if (!s || !s.cert || !s.d) return null;
  const c = verifyCertificate(s.cert, trustedKeys);
  if (!c.ok) return null;
  let privateKey;
  try { privateKey = crypto.createPrivateKey({ key: { kty: "OKP", crv: "Ed25519", x: c.payload.spk, d: s.d }, format: "jwk" }); }
  catch { return null; }
  return { cert: s.cert, certPayload: c.payload, privateKey };
}

/* ------------------------------------------------ le sceau ------------- */

/* attestation : { ref, du, au, echanges, codes, fichiers, version, emis } */
export function buildSeal(identity, a) {
  const body = encodeJson({
    v: 1, c: identity.cert, ref: a.ref || "", emis: a.emis, du: a.du, au: a.au,
    ech: a.echanges, codes: a.codes, fic: a.fichiers, fuites: 0, ver: a.version,
  });
  const sig = crypto.sign(null, Buffer.from(`${SEAL_PREFIX}.${body}`), identity.privateKey);
  return `${SEAL_PREFIX}.${body}.${b64urlEncode(sig)}`;
}

/* Même vérification que la page publique (verifier-sceau.html), en Node :
   pour les tests, et pour que le cabinet contrôle son sceau avant envoi. */
export function verifySeal(seal, trustedKeys) {
  const p = String(seal || "").trim().split(".");
  if (p.length !== 3 || p[0] !== SEAL_PREFIX) return { ok: false, reason: "ce n'est pas un sceau Hidden Tokens" };
  let s;
  try { s = JSON.parse(b64urlDecode(p[1]).toString("utf8")); } catch { return { ok: false, reason: "sceau illisible" }; }
  const c = verifyCertificate(s.c, trustedKeys);
  if (!c.ok) return { ok: false, reason: c.reason };
  let ok = false;
  try { ok = crypto.verify(null, Buffer.from(`${SEAL_PREFIX}.${p[1]}`), sealPublicKey(c.payload.spk), b64urlDecode(p[2])); } catch {}
  if (!ok) return { ok: false, reason: "signature du cabinet invalide (sceau modifié)" };
  if (s.emis > c.payload.exp) return { ok: false, reason: "émis après la fin de l'abonnement du cabinet" };
  return { ok: true, cabinet: c.payload, seal: s };
}

/* ------------------------------------------------ la page locale ------- */

export const CLAUSE =
  "Le cabinet peut recourir à des outils d'intelligence artificielle pour traiter votre dossier. Avant tout envoi à " +
  "une IA, les données qui vous identifient (noms, coordonnées, numéros, références) sont remplacées, sur le poste du " +
  "cabinet, par des codes au moyen de Hidden Tokens ; la clé de correspondance ne quitte jamais le cabinet. Le sceau " +
  "ci-joint, vérifiable par vous-même sur ai4x.academy/verifier-sceau, atteste qu'aucune de ces données n'a été " +
  "retrouvée dans ce que l'IA a reçu par Hidden Tokens sur la période indiquée.";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const frDate = (iso) => new Date(iso + "T12:00:00Z")
  .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).replace(/^1 /, "1er ");

export function verifyLink(seal) { return `${VERIFY_URL}#${seal}`; }

function qrSvg(textToEncode) {
  const qr = qrcode(0, "M");
  qr.addData(textToEncode, "Byte");
  qr.make();
  return qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true });
}

export function renderSealPage(seal, identity, a) {
  const link = verifyLink(seal);
  const org = identity.certPayload.org;
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>Sceau Hidden Tokens — ${esc(org)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; color: #111; background: #f4f4f0; margin: 0; padding: 24px 16px; }
  .sceau { max-width: 720px; margin: 0 auto; background: #fff; border: 2px solid #111; border-radius: 14px; padding: 24px; }
  .haut { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
  .qr { width: 150px; flex: none; } .qr svg { width: 100%; height: auto; display: block; }
  h1 { font-size: 20px; margin: 0 0 6px; } .mut { color: #555; font-size: 13px; line-height: 1.5; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 14px 0; font-size: 14px; }
  dt { color: #555; } dd { margin: 0; font-weight: 600; }
  .clause { background: #f4f4f0; border-left: 3px solid #111; padding: 12px 14px; font-size: 14px; line-height: 1.55; margin: 16px 0; }
  code { display: block; word-break: break-all; font-size: 9px; color: #555; margin-top: 12px; }
  @media print { body { background: #fff; padding: 0; } .noprint { display: none; } }
</style></head><body>
<div class="sceau">
  <div class="haut">
    <div class="qr">${qrSvg(link)}</div>
    <div>
      <h1>Sceau Hidden Tokens — données protégées avant l'IA</h1>
      <p class="mut">Délivré par Hidden Tokens sous licence de <strong>${esc(org)}</strong>, certifié par Ai4x.
        Scannez le code ou ouvrez <strong>ai4x.academy/verifier-sceau</strong> pour le vérifier vous-même.</p>
    </div>
  </div>
  <dl>
    <dt>Cabinet</dt><dd>${esc(org)}</dd>
    ${a.ref ? `<dt>Dossier</dt><dd>${esc(a.ref)}</dd>` : ""}
    <dt>Période</dt><dd>du ${frDate(a.du)} au ${frDate(a.au)}</dd>
    <dt>Échanges avec l'IA</dt><dd>${a.echanges}</dd>
    <dt>Données codées</dt><dd>${a.codes} donnée(s) identifiante(s) distincte(s)</dd>
    <dt>Retrouvées en clair</dt><dd>0</dd>
    <dt>Émis le</dt><dd>${frDate(a.emis)}</dd>
  </dl>
  <p class="mut">Ce sceau atteste ce qui est passé par Hidden Tokens. Un texte collé directement dans une conversation n'y figure pas.</p>
  <div class="clause"><strong>Clause pour la lettre de mission</strong><br>${esc(CLAUSE)}</div>
  <p class="noprint mut">Lien de vérification : <a href="${esc(link)}">${esc(VERIFY_URL)}</a></p>
  <code>${esc(seal)}</code>
</div>
</body></html>
`;
}
