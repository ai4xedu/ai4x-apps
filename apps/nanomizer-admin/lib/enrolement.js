// ============================================================================
// US-3 — ENRÔLER UN POSTE.
//
// L'admin produit un fichier `enrolement-<poste>.nanomizer` par collaborateur.
// Le poste l'importe une fois ; à partir de là, il a ÉPINGLÉ la clé publique
// du cabinet et refuse toute politique qui n'est pas signée par elle.
//
// Ce que le fichier contient : l'identité du cabinet, la clé publique, le sel
// des empreintes (le poste en a besoin pour reconnaître les noms listés), le
// dossier partagé où lire la politique et l'adresse du relais.
//
// ⚠️ Le sel y est en clair : le fichier se remet en main propre ou par le
// dossier partagé du cabinet, jamais par une messagerie externe. Il ne permet
// pas de signer — seulement de calculer des empreintes.
//
// Confiance au premier usage : le fichier n'est pas signé (il APPORTE la clé
// qui servirait à le vérifier). C'est l'admin qui l'installe ; ensuite, plus
// rien ne peut changer la clé épinglée sauf une rotation signée par
// l'ancienne (hors périmètre de cette story).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { idCle } from "./cabinet.js";
import { FORMAT_POLITIQUE } from "./politique.js";

export const FORMAT_ENROLEMENT = "nanomizer.enrolement/1";
export const FORMAT_POSTE = "nanomizer.poste/1";

export class EnrolementInvalide extends Error {}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function creerEnrolement(cabinet, { sel }, { utilisateur, dossierPartage, relais = null, maintenant = new Date() }) {
  if (!EMAIL_RX.test(String(utilisateur || ""))) {
    throw new EnrolementInvalide("il faut l'adresse email professionnelle du collaborateur (--utilisateur)");
  }
  if (!dossierPartage || !String(dossierPartage).trim()) {
    throw new EnrolementInvalide("il faut le dossier partagé où le poste lira la politique (--dossier-partage)");
  }
  if (!Buffer.isBuffer(sel) || sel.length !== 32) throw new EnrolementInvalide("sel du cabinet invalide");
  return {
    format: FORMAT_ENROLEMENT,
    cabinet: { id: cabinet.id, nom: cabinet.nom },
    cle: { id: cabinet.cle.id, alg: "ed25519", publique: cabinet.cle.publique },
    sel: sel.toString("base64"),
    poste: { id: "pst_" + crypto.randomBytes(4).toString("hex"), utilisateur: String(utilisateur).trim().toLowerCase() },
    distribution: { dossier_partage: String(dossierPartage), relais: relais || null },
    emis_le: maintenant.toISOString(),
  };
}

export function nomFichierEnrolement(enr) {
  return `enrolement-${enr.poste.id}.nanomizer`;
}

export function ecrireEnrolement(dossier, enr) {
  fs.mkdirSync(dossier, { recursive: true });
  const fichier = path.join(dossier, nomFichierEnrolement(enr));
  fs.writeFileSync(fichier, JSON.stringify(enr, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  return fichier;
}

/* Côté poste : contrôle le fichier reçu et en tire l'état local du poste.
   `version_max` démarre à 0 ; c'est l'anti-retour en arrière d'US-4. */
export function importerEnrolement(enr, maintenant = new Date()) {
  if (!enr || enr.format !== FORMAT_ENROLEMENT) throw new EnrolementInvalide("ce n'est pas un fichier d'enrôlement Hidden Tokens");
  const manque = ["cabinet", "cle", "sel", "poste", "distribution"].filter((k) => !enr[k]);
  if (manque.length) throw new EnrolementInvalide(`fichier d'enrôlement incomplet (${manque.join(", ")})`);
  if (enr.cle.alg !== "ed25519") throw new EnrolementInvalide("algorithme de clé non pris en charge");
  let spki;
  try {
    spki = Buffer.from(enr.cle.publique, "base64");
    crypto.createPublicKey({ key: spki, format: "der", type: "spki" });
  } catch { throw new EnrolementInvalide("clé publique illisible"); }
  if (idCle(spki) !== enr.cle.id) throw new EnrolementInvalide("identifiant de clé incohérent (fichier modifié ?)");
  if (Buffer.from(enr.sel, "base64").length !== 32) throw new EnrolementInvalide("sel illisible");
  return {
    format: FORMAT_POSTE,
    cabinet: enr.cabinet,
    cle: enr.cle,
    sel: enr.sel,
    poste: enr.poste,
    distribution: enr.distribution,
    enrole_le: maintenant.toISOString(),
    version_max: 0,
  };
}

/* Premier contrôle d'US-4, limité ici à ce qu'exige US-3 : la politique
   est-elle signée par la clé épinglée, et vise-t-elle ce cabinet ? L'anti-
   retour, l'expiration et le rechargement viennent avec US-4.
   La signature porte sur les OCTETS du fichier, tels quels. */
export function verifierSignature(etatPoste, octetsPolitique, octetsSignature) {
  let sig;
  try { sig = JSON.parse(Buffer.from(octetsSignature).toString("utf8")); }
  catch { return { ok: false, etat: "ALTEREE", raison: "fichier de signature illisible" }; }
  if (sig.alg !== "ed25519") return { ok: false, etat: "ALTEREE", raison: "algorithme de signature inattendu" };
  if (sig.cle_id !== etatPoste.cle.id) {
    return { ok: false, etat: "ALTEREE", raison: "signée par une autre clé que celle du cabinet" };
  }
  const cle = crypto.createPublicKey({
    key: Buffer.from(etatPoste.cle.publique, "base64"), format: "der", type: "spki",
  });
  let valide = false;
  try { valide = crypto.verify(null, Buffer.from(octetsPolitique), cle, Buffer.from(sig.signature, "base64")); }
  catch { valide = false; }
  if (!valide) return { ok: false, etat: "ALTEREE", raison: "signature invalide (politique modifiée après signature ?)" };
  let politique;
  try { politique = JSON.parse(Buffer.from(octetsPolitique).toString("utf8")); }
  catch { return { ok: false, etat: "ALTEREE", raison: "politique illisible" }; }
  if (politique.format !== FORMAT_POLITIQUE) return { ok: false, etat: "ALTEREE", raison: "format de politique inconnu" };
  if (politique.cabinet?.id !== etatPoste.cabinet.id) {
    return { ok: false, etat: "ALTEREE", raison: "politique d'un autre cabinet" };
  }
  return { ok: true, etat: "OK", politique };
}
