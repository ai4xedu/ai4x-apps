// ============================================================================
// L'ENVELOPPE — sceller un secret pour un destinataire, sans serveur.
//
// Même recette que la spec C3 (reprise par SPEC-REGISTRE-ORGANISATION §2) :
//   paire X25519 éphémère → secret = DH(éphémère, réception du destinataire)
//   → K_env = HKDF-SHA256(secret, sel = éphémère publique, info)
//   → AES-256-GCM(K_env, iv aléatoire, AAD = info) sur le JSON du secret.
// `info` nomme l'organisation et le destinataire : une enveloppe recopiée
// vers un autre poste ou une autre organisation ne s'ouvre pas.
//
// Ce fichier existe en deux copies identiques (connecteur et console admin,
// qui ne partagent pas de dépendance) ; test/registre.test.js vérifie qu'une
// enveloppe scellée par l'une s'ouvre par l'autre.
// ============================================================================
import crypto from "node:crypto";

export const INFO_ENVELOPPE = "hidden-tokens.enveloppe/1";

/* Clés de réception : X25519, publique en SPKI DER, privée en PKCS8 DER (base64). */
export function genererPaireReception() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");
  return {
    publique: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    privee: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
  };
}

export function cleReceptionPublique(publiqueB64) {
  return crypto.createPublicKey({ key: Buffer.from(publiqueB64, "base64"), format: "der", type: "spki" });
}

/* « a7f3-91c0-2b4e-d8f1 » : ce que l'admin et le collaborateur se lisent à
   voix haute avant la certification. 64 bits suffisent contre une fiche
   substituée sur le partage : il faudrait fabriquer une clé qui tombe sur la
   même empreinte pendant que les deux la comparent. */
export function empreinte(publiqueB64) {
  const h = crypto.createHash("sha256").update(Buffer.from(publiqueB64, "base64")).digest("hex").slice(0, 16);
  return h.match(/.{4}/g).join("-");
}

export function infoEnveloppe(organisation, destinataire) {
  return `${INFO_ENVELOPPE}|${organisation}|${destinataire}`;
}

export function sceller(publiqueB64, info, secret) {
  const eph = crypto.generateKeyPairSync("x25519");
  const partage = crypto.diffieHellman({ privateKey: eph.privateKey, publicKey: cleReceptionPublique(publiqueB64) });
  const ephPub = eph.publicKey.export({ format: "der", type: "spki" });
  const kEnv = Buffer.from(crypto.hkdfSync("sha256", partage, ephPub, info, 32));
  const c = chiffrer(kEnv, info, secret);
  return { eph: ephPub.toString("base64"), ...c };
}

export function desceller(priveeB64, info, enveloppe) {
  const privee = crypto.createPrivateKey({ key: Buffer.from(priveeB64, "base64"), format: "der", type: "pkcs8" });
  const ephPub = Buffer.from(enveloppe.eph, "base64");
  const partage = crypto.diffieHellman({ privateKey: privee, publicKey: crypto.createPublicKey({ key: ephPub, format: "der", type: "spki" }) });
  const kEnv = Buffer.from(crypto.hkdfSync("sha256", partage, ephPub, info, 32));
  return dechiffrer(kEnv, info, enveloppe);
}

/* AES-256-GCM sur un objet JSON, AAD authentifiée. Sert aux enveloppes et
   aux entrées du registre. */
export function chiffrer(cle32, aad, objet) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", cle32, iv);
  c.setAAD(Buffer.from(aad, "utf8"));
  const donnees = Buffer.concat([c.update(JSON.stringify(objet), "utf8"), c.final()]);
  return { iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), donnees: donnees.toString("base64") };
}

export class Indechiffrable extends Error {}

export function dechiffrer(cle32, aad, { iv, tag, donnees }) {
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", cle32, Buffer.from(iv, "base64"));
    d.setAAD(Buffer.from(aad, "utf8"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    const clair = Buffer.concat([d.update(Buffer.from(donnees, "base64")), d.final()]);
    return JSON.parse(clair.toString("utf8"));
  } catch {
    throw new Indechiffrable("enveloppe ou entrée indéchiffrable (mauvais destinataire, mauvaise organisation, ou contenu altéré)");
  }
}

/* JSON canonique (même règle que lib/canonique.js de la console) : la
   signature d'un registre porte sur ces octets-là. */
export function canonique(v) {
  if (v === null || typeof v !== "object") {
    if (typeof v === "number" && !Number.isFinite(v)) throw new TypeError("nombre non fini");
    if (v === undefined) throw new TypeError("valeur indéfinie");
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return "[" + v.map(canonique).join(",") + "]";
  return "{" + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + canonique(v[k])).join(",") + "}";
}
