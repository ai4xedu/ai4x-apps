// ============================================================================
// US-1 — LE CABINET ET SA CLÉ DE SIGNATURE.
//
// L'admin est le seul à pouvoir émettre des règles : à la création, la console
// génère une paire Ed25519 et le sel des empreintes. Le fichier cabinet ne
// contient en clair que la clé PUBLIQUE ; la clé privée et le sel dorment dans
// un « coffre » chiffré (AES-256-GCM, clé dérivée de la phrase de passe par
// scrypt). Sans la phrase, le fichier volé ne permet ni de signer ni de
// calculer l'empreinte d'un nom deviné.
//
// Personne ne peut récupérer une phrase perdue, pas même l'éditeur : c'est
// voulu (spec §3, « clé perdue »). D'où l'export de secours, à mettre au
// coffre avec la phrase notée à part.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const FORMAT_CABINET = "nanomizer.cabinet/1";
export const FICHIER_CABINET = "cabinet.nanomizer.json";
export const PHRASE_MIN = 12;

/* Coût scrypt par défaut : ~0,3 s et 128 Mo, une fois par signature — rien
   pour l'admin, beaucoup pour qui essaierait des millions de phrases. Les
   tests passent un coût réduit ; il est enregistré dans le fichier. */
export const COUT_DEFAUT = { N: 2 ** 17, r: 8, p: 1 };

export class PhraseIncorrecte extends Error {
  constructor() { super("phrase de passe incorrecte (ou fichier cabinet altéré)"); }
}
export class CabinetInvalide extends Error {}

export function deriver(phrase, sel, cout) {
  return crypto.scryptSync(String(phrase).normalize("NFC"), sel, 32, {
    N: cout.N, r: cout.r, p: cout.p, maxmem: 256 * 1024 * 1024,
  });
}

export function idCle(spkiDer) {
  return "k_" + crypto.createHash("sha256").update(spkiDer).digest("hex").slice(0, 12);
}

export function verifierPhrase(phrase) {
  if (typeof phrase !== "string" || phrase.normalize("NFC").length < PHRASE_MIN) {
    throw new CabinetInvalide(`la phrase de passe doit faire au moins ${PHRASE_MIN} caractères`);
  }
}

/* Chiffre {cle_privee, sel} ; le contexte (cabinet + clé) est authentifié
   comme donnée associée : un coffre recopié dans un autre cabinet ne s'ouvre
   pas. */
export function sceller(secret, phrase, contexte, cout = COUT_DEFAUT) {
  const selKdf = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cle = deriver(phrase, selKdf, cout);
  const c = crypto.createCipheriv("aes-256-gcm", cle, iv);
  c.setAAD(Buffer.from(contexte, "utf8"));
  const donnees = Buffer.concat([c.update(JSON.stringify(secret), "utf8"), c.final()]);
  return {
    kdf: "scrypt", N: cout.N, r: cout.r, p: cout.p,
    sel_kdf: selKdf.toString("base64"),
    algo: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: c.getAuthTag().toString("base64"),
    donnees: donnees.toString("base64"),
  };
}

export function desceller(coffre, phrase, contexte) {
  const cle = deriver(phrase, Buffer.from(coffre.sel_kdf, "base64"), coffre);
  const d = crypto.createDecipheriv("aes-256-gcm", cle, Buffer.from(coffre.iv, "base64"));
  d.setAAD(Buffer.from(contexte, "utf8"));
  d.setAuthTag(Buffer.from(coffre.tag, "base64"));
  try {
    const clair = Buffer.concat([d.update(Buffer.from(coffre.donnees, "base64")), d.final()]);
    return JSON.parse(clair.toString("utf8"));
  } catch {
    throw new PhraseIncorrecte();
  }
}

const contexteDe = (cab) => `${FORMAT_CABINET}|${cab.id}|${cab.cle.id}`;

export function creerCabinet({ nom, phrase, maintenant = new Date(), cout = COUT_DEFAUT }) {
  if (!nom || !String(nom).trim()) throw new CabinetInvalide("il faut le nom du cabinet");
  verifierPhrase(phrase);
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const spki = publicKey.export({ format: "der", type: "spki" });
  const pkcs8 = privateKey.export({ format: "der", type: "pkcs8" });
  const sel = crypto.randomBytes(32);
  const cabinet = {
    format: FORMAT_CABINET,
    id: "cab_" + crypto.randomBytes(4).toString("hex"),
    nom: String(nom).trim(),
    cree_le: maintenant.toISOString(),
    cle: { id: idCle(spki), alg: "ed25519", publique: spki.toString("base64") },
    derniere_version: 0,
  };
  cabinet.coffre = sceller(
    { cle_privee: pkcs8.toString("base64"), sel: sel.toString("base64") },
    phrase, contexteDe(cabinet), cout,
  );
  return cabinet;
}

/* Ouvre le coffre : renvoie la clé privée (KeyObject) et le sel. Vérifie
   aussi que la clé privée correspond bien à la clé publique affichée. */
export function ouvrirCabinet(cabinet, phrase) {
  const secret = desceller(cabinet.coffre, phrase, contexteDe(cabinet));
  const clePrivee = crypto.createPrivateKey({
    key: Buffer.from(secret.cle_privee, "base64"), format: "der", type: "pkcs8",
  });
  const spki = crypto.createPublicKey(clePrivee).export({ format: "der", type: "spki" });
  if (spki.toString("base64") !== cabinet.cle.publique) {
    throw new CabinetInvalide("la clé privée ne correspond pas à la clé publique du cabinet");
  }
  return { clePrivee, sel: Buffer.from(secret.sel, "base64") };
}

export function clePublique(cabinet) {
  return crypto.createPublicKey({
    key: Buffer.from(cabinet.cle.publique, "base64"), format: "der", type: "spki",
  });
}

export function validerCabinet(c) {
  if (!c || c.format !== FORMAT_CABINET) throw new CabinetInvalide("ce n'est pas un fichier cabinet Hidden Tokens");
  for (const k of ["id", "nom", "cle", "coffre"]) {
    if (!c[k]) throw new CabinetInvalide(`fichier cabinet incomplet (${k})`);
  }
  if (idCle(Buffer.from(c.cle.publique, "base64")) !== c.cle.id) {
    throw new CabinetInvalide("identifiant de clé incohérent (fichier modifié ?)");
  }
  if (!Number.isInteger(c.derniere_version) || c.derniere_version < 0) {
    throw new CabinetInvalide("dernière version invalide");
  }
  return c;
}

export function lireCabinet(fichier) {
  let c;
  try { c = JSON.parse(fs.readFileSync(fichier, "utf8")); }
  catch (e) {
    if (e.code === "ENOENT") throw new CabinetInvalide(`aucun cabinet ici (${fichier}) — lancez d'abord « creer-cabinet »`);
    throw new CabinetInvalide("fichier cabinet illisible");
  }
  return validerCabinet(c);
}

/* Écriture atomique, lisible par le seul utilisateur. `nouveau` refuse
   d'écraser : on ne remplace jamais un cabinet existant par accident (les
   postes enrôlés n'accepteraient plus aucune politique). */
export function ecrireCabinet(fichier, cabinet, { nouveau = false } = {}) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true, mode: 0o700 });
  if (nouveau && fs.existsSync(fichier)) {
    throw new CabinetInvalide(`un cabinet existe déjà ici (${fichier}) — le remplacer couperait tous les postes enrôlés`);
  }
  const tmp = fichier + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(cabinet, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(tmp, fichier);
}

/* Export de secours : le fichier cabinet entier, encadré. Il reste chiffré :
   il faut AUSSI la phrase pour s'en servir — à ranger séparément. */
export function exporterSecours(cabinet, maintenant = new Date()) {
  const corps = Buffer.from(JSON.stringify(cabinet), "utf8").toString("base64").match(/.{1,64}/g).join("\n");
  return [
    "NANOMIZER — SECOURS DE LA CLÉ DU CABINET",
    `Cabinet : ${cabinet.nom} (${cabinet.id}) — clé ${cabinet.cle.id}`,
    `Exporté le : ${maintenant.toISOString()}`,
    "À imprimer et ranger au coffre. Inutilisable sans la phrase de passe,",
    "qui ne doit JAMAIS être rangée au même endroit.",
    "-----DEBUT SECOURS NANOMIZER-----",
    corps,
    "-----FIN SECOURS NANOMIZER-----",
    "",
  ].join("\n");
}

export function importerSecours(texte) {
  const m = String(texte).match(/-----DEBUT SECOURS NANOMIZER-----([\s\S]*?)-----FIN SECOURS NANOMIZER-----/);
  if (!m) throw new CabinetInvalide("bloc de secours introuvable");
  let c;
  try { c = JSON.parse(Buffer.from(m[1].replace(/\s+/g, ""), "base64").toString("utf8")); }
  catch { throw new CabinetInvalide("bloc de secours illisible (recopié en entier ?)"); }
  return validerCabinet(c);
}
