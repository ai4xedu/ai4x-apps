// ============================================================================
// US-2 — RÉDIGER, VALIDER ET SIGNER UNE POLITIQUE.
//
// L'admin écrit une SOURCE lisible (`politique-source.json`) où les noms des
// clients figurent en clair, dans des champs `noms`. La console :
//   1. valide tout (spec §2.2) et rend TOUTES les erreurs d'un coup ;
//   2. remplace chaque liste `noms` par des empreintes HMAC (spec §2.3) ;
//   3. vérifie qu'aucun nom protégé ne traîne en clair ailleurs (libellé,
//      notice, équipes) — sinon la politique publiée le révélerait ;
//   4. numérote, date, met en forme canonique et signe (Ed25519).
//
// Les messages d'erreur ne citent JAMAIS un nom protégé : ils désignent la
// règle et la position (« R-001, nom n°2 »). Une sortie de console finit
// souvent collée dans un chat — avec une IA, justement.
//
// La source reste sur le poste de l'admin : elle contient les noms en clair.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { canonique } from "./canonique.js";
import { normaliser, empreinte, contientEnMots, MAX_MOTS, MIN_CARACTERES } from "./empreinte.js";
import {
  DETECTEURS, PLANCHER, CATEGORIES, TYPES_REGLE, ALERTES_REGLE, SURFACES, CANAUX,
} from "./catalogue.js";

export const FORMAT_POLITIQUE = "nanomizer.politique/1";
export const FICHIER_POLITIQUE = "politique.nanomizer.json";
export const FICHIER_SIGNATURE = "politique.nanomizer.json.sig";
export const EXPIRATION_DEFAUT_JOURS = 90;
export const EXPIRATION_MAX_JOURS = 365;

export class PolitiqueInvalide extends Error {
  constructor(erreurs) {
    super("politique invalide :\n  - " + erreurs.join("\n  - "));
    this.erreurs = erreurs;
  }
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_REGLE_RX = /^R-\d{3,}$/;
const ID_EQUIPE_RX = /^eq_[a-z0-9_-]+$/;
const HEURE_RX = /^([01]\d|2[0-3]):[0-5]\d$/;

const CLES_SOURCE = new Set([
  "format", "emise_par", "expiration_jours", "perimetre", "equipes", "regles",
  "alertes", "journal", "notice_salaries",
]);
const CLES_REGLE = {
  toujours_pseudonymiser: new Set(["id", "type", "libelle", "portee", "categorie", "noms"]),
  interdit: new Set(["id", "type", "libelle", "portee", "detecteurs", "noms", "alerte"]),
  detecteurs: new Set(["id", "type", "libelle", "portee", "ajoute"]),
};

const estChaine = (v) => typeof v === "string" && v.trim() !== "";
const estObjet = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function entier(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}

/* Valide et compile. Renvoie la politique prête à signer (sans les noms) et
   la liste des avertissements ; lève PolitiqueInvalide avec toutes les
   erreurs sinon. */
export function compilerPolitique(source, { cabinet, sel, version, maintenant = new Date(), jours } = {}) {
  const err = [];
  const avert = [];

  if (!estObjet(source)) throw new PolitiqueInvalide(["la source doit être un objet JSON"]);
  for (const k of Object.keys(source)) {
    if (!CLES_SOURCE.has(k)) err.push(`champ inconnu « ${k} » (faute de frappe ?)`);
  }
  for (const k of ["version", "emise_le", "expire_le", "cabinet"]) {
    if (k in source) err.push(`« ${k} » est calculé par la console, retirez-le de la source`);
  }
  if (source.format !== undefined && source.format !== "nanomizer.politique-source/1") {
    err.push("format de source inconnu (attendu : nanomizer.politique-source/1)");
  }
  if (!EMAIL_RX.test(String(source.emise_par || ""))) err.push("emise_par : l'email de l'admin qui émet la politique est obligatoire");

  // Expiration (spec §3) — l'option de la ligne de commande prime.
  const j = jours ?? source.expiration_jours ?? EXPIRATION_DEFAUT_JOURS;
  if (!entier(j, 1, EXPIRATION_MAX_JOURS)) {
    err.push(`expiration : entre 1 et ${EXPIRATION_MAX_JOURS} jours (reçu : ${j})`);
  }

  // Périmètre
  const per = source.perimetre ?? {};
  if (!estObjet(per)) err.push("perimetre doit être un objet");
  const surfaces = per.surfaces ?? ["claude_code", "claude_desktop", "claude_web"];
  if (!Array.isArray(surfaces) || surfaces.length === 0) err.push("perimetre.surfaces : au moins une surface");
  else for (const s of surfaces) if (!SURFACES.has(s)) err.push(`perimetre.surfaces : surface inconnue « ${s} » (${[...SURFACES].join(", ")})`);
  const enCasErreur = per.en_cas_erreur ?? "bloquer";
  if (enCasErreur !== "bloquer") err.push("perimetre.en_cas_erreur : seule la valeur « bloquer » est acceptée (fail closed)");

  // Équipes
  const equipes = source.equipes ?? [];
  const idsEquipes = new Set();
  if (!Array.isArray(equipes)) err.push("equipes doit être une liste");
  else equipes.forEach((e, i) => {
    const ou = `equipes[${i}]`;
    if (!estObjet(e)) { err.push(`${ou} doit être un objet`); return; }
    if (!ID_EQUIPE_RX.test(String(e.id || ""))) err.push(`${ou}.id : de la forme eq_contentieux`);
    else if (idsEquipes.has(e.id)) err.push(`${ou}.id : « ${e.id} » en double`);
    else idsEquipes.add(e.id);
    if (!estChaine(e.nom)) err.push(`${ou}.nom manquant`);
    if (!Array.isArray(e.membres) || e.membres.some((m) => !EMAIL_RX.test(String(m)))) err.push(`${ou}.membres : une liste d'emails`);
    if (!Array.isArray(e.responsables) || e.responsables.length === 0 || e.responsables.some((m) => !EMAIL_RX.test(String(m)))) {
      err.push(`${ou}.responsables : au moins un email`);
    }
  });

  // Règles
  const regles = source.regles;
  const idsRegles = new Set();
  const nomsProteges = []; // { norm, ou } — pour la vérification finale
  const reglesCompilees = [];
  if (!Array.isArray(regles) || regles.length === 0) err.push("regles : au moins une règle");
  else regles.forEach((r, i) => {
    const ou = estObjet(r) && estChaine(r.id) ? r.id : `regles[${i}]`;
    if (!estObjet(r)) { err.push(`${ou} doit être un objet`); return; }
    if (!ID_REGLE_RX.test(String(r.id || ""))) err.push(`${ou} : id de la forme R-001`);
    else if (idsRegles.has(r.id)) err.push(`${ou} : id en double`);
    else idsRegles.add(r.id);
    if (!TYPES_REGLE.has(r.type)) { err.push(`${ou} : type inconnu « ${r.type} » (${[...TYPES_REGLE].join(", ")})`); return; }
    for (const k of Object.keys(r)) {
      if ((k === "retire" || k === "desactive") && r.type === "detecteurs") {
        err.push(`${ou} : le plancher éditeur ne se retire pas — une politique peut seulement ajouter des détecteurs`);
      } else if (!CLES_REGLE[r.type].has(k)) err.push(`${ou} : champ inconnu « ${k} » pour une règle ${r.type}`);
    }
    if (!estChaine(r.libelle)) err.push(`${ou} : libellé obligatoire (c'est ce que lit le collaborateur)`);

    const out = { id: r.id, type: r.type, libelle: estChaine(r.libelle) ? r.libelle.trim() : r.libelle };

    if (r.portee !== undefined) {
      if (!estObjet(r.portee)) err.push(`${ou}.portee doit être un objet`);
      else {
        const p = {};
        for (const k of Object.keys(r.portee)) if (k !== "dossiers" && k !== "equipes") err.push(`${ou}.portee : champ inconnu « ${k} »`);
        if (r.portee.dossiers !== undefined) {
          if (!Array.isArray(r.portee.dossiers) || r.portee.dossiers.length === 0 || !r.portee.dossiers.every(estChaine)) {
            err.push(`${ou}.portee.dossiers : une liste non vide d'identifiants de dossier`);
          } else p.dossiers = [...new Set(r.portee.dossiers.map((d) => d.trim()))].sort();
        }
        if (r.portee.equipes !== undefined) {
          if (!Array.isArray(r.portee.equipes) || r.portee.equipes.length === 0) err.push(`${ou}.portee.equipes : une liste non vide`);
          else {
            for (const e of r.portee.equipes) if (!idsEquipes.has(e)) err.push(`${ou}.portee.equipes : équipe inexistante « ${e} »`);
            p.equipes = [...new Set(r.portee.equipes)].sort();
          }
        }
        if (!p.dossiers && !p.equipes) err.push(`${ou}.portee vide : retirez-la pour viser tout le cabinet`);
        out.portee = p;
      }
    }

    const compilerNoms = (obligatoire) => {
      if (r.noms === undefined) {
        if (obligatoire) err.push(`${ou} : « noms » obligatoire (les formes à protéger, en clair dans la source)`);
        return undefined;
      }
      if (!Array.isArray(r.noms) || r.noms.length === 0) { err.push(`${ou}.noms : une liste non vide`); return undefined; }
      const emp = new Set();
      r.noms.forEach((n, k) => {
        const pos = `${ou}, nom n°${k + 1}`;
        if (typeof n !== "string") { err.push(`${pos} : doit être du texte`); return; }
        const norm = normaliser(n);
        if (norm.length < MIN_CARACTERES) { err.push(`${pos} : trop court (au moins ${MIN_CARACTERES} lettres ou chiffres)`); return; }
        if (norm.split(" ").length > MAX_MOTS) { err.push(`${pos} : plus de ${MAX_MOTS} mots, le poste ne pourra pas le reconnaître`); return; }
        nomsProteges.push({ norm, pos });
        if (sel) emp.add(empreinte(sel, n));
      });
      return [...emp].sort();
    };

    if (r.type === "toujours_pseudonymiser") {
      if (!(r.categorie in CATEGORIES)) err.push(`${ou}.categorie : « ${r.categorie} » inconnue (${Object.keys(CATEGORIES).join(", ")})`);
      out.categorie = r.categorie;
      out.empreintes = compilerNoms(true);
    } else if (r.type === "interdit") {
      if (r.detecteurs === undefined && r.noms === undefined) err.push(`${ou} : un interdit vise des « detecteurs », des « noms », ou les deux`);
      if (r.detecteurs !== undefined) {
        if (!Array.isArray(r.detecteurs) || r.detecteurs.length === 0) err.push(`${ou}.detecteurs : une liste non vide`);
        else {
          for (const d of r.detecteurs) if (!(d in DETECTEURS)) err.push(`${ou}.detecteurs : « ${d} » inconnu (${Object.keys(DETECTEURS).join(", ")})`);
          out.detecteurs = [...new Set(r.detecteurs)].sort();
        }
      }
      const emp = compilerNoms(false);
      if (emp) out.empreintes = emp;
      const alerte = r.alerte ?? "responsable";
      if (!ALERTES_REGLE.has(alerte)) err.push(`${ou}.alerte : « ${alerte} » (${[...ALERTES_REGLE].join(", ")})`);
      out.alerte = alerte;
    } else if (r.type === "detecteurs") {
      if (!Array.isArray(r.ajoute) || r.ajoute.length === 0) err.push(`${ou}.ajoute : une liste non vide de détecteurs`);
      else {
        for (const d of r.ajoute) {
          if (!(d in DETECTEURS)) err.push(`${ou}.ajoute : « ${d} » inconnu (${Object.keys(DETECTEURS).join(", ")})`);
          else if (PLANCHER.has(d)) avert.push(`${ou} : ${d} fait déjà partie du plancher, inutile de l'ajouter`);
        }
        out.ajoute = [...new Set(r.ajoute)].sort();
      }
    }
    reglesCompilees.push(out);
  });

  // Alertes
  const al = source.alertes;
  let alertes;
  if (!estObjet(al)) err.push("alertes : obligatoire (canaux et admin technique)");
  else {
    for (const k of Object.keys(al)) {
      if (!["canaux", "admin_technique", "signal_de_vie_max_minutes", "heures_ouvrees", "digest"].includes(k)) err.push(`alertes : champ inconnu « ${k} »`);
    }
    if (!Array.isArray(al.canaux) || al.canaux.length === 0) err.push("alertes.canaux : au moins un canal");
    else al.canaux.forEach((c, i) => {
      if (!estObjet(c) || !CANAUX.has(c.type)) { err.push(`alertes.canaux[${i}] : type « email » ou « webhook »`); return; }
      if (c.type === "webhook") {
        let u; try { u = new URL(c.url); } catch { u = null; }
        if (!u || u.protocol !== "https:") err.push(`alertes.canaux[${i}] : un webhook doit être une URL https`);
      }
    });
    if (!Array.isArray(al.admin_technique) || al.admin_technique.length === 0 || al.admin_technique.some((m) => !EMAIL_RX.test(String(m)))) {
      err.push("alertes.admin_technique : au moins un email");
    }
    const sdv = al.signal_de_vie_max_minutes ?? 120;
    if (!entier(sdv, 15, 1440)) err.push("alertes.signal_de_vie_max_minutes : entre 15 et 1440");
    if (al.heures_ouvrees !== undefined) {
      const h = al.heures_ouvrees;
      if (!estObjet(h) || !Array.isArray(h.jours) || !h.jours.every((d) => entier(d, 1, 7))
        || !HEURE_RX.test(String(h.de)) || !HEURE_RX.test(String(h.a)) || !estChaine(h.fuseau)) {
        err.push("alertes.heures_ouvrees : { jours: [1..7], de: \"08:00\", a: \"20:00\", fuseau: \"Europe/Paris\" }");
      } else {
        try { new Intl.DateTimeFormat("fr", { timeZone: h.fuseau }); }
        catch { err.push(`alertes.heures_ouvrees.fuseau : « ${h.fuseau} » inconnu`); }
      }
    }
    if (al.digest !== undefined && typeof al.digest !== "boolean") err.push("alertes.digest : true ou false");
    alertes = { ...al, signal_de_vie_max_minutes: sdv, digest: al.digest ?? false };
  }

  // Journal
  const retention = source.journal?.retention_mois ?? 12;
  if (!entier(retention, 1, 120)) err.push("journal.retention_mois : entre 1 et 120");

  // Transparence (invariant 5) : pas de politique sans notice aux salariés.
  const notice = source.notice_salaries;
  if (!estObjet(notice) || !estChaine(notice.texte)) {
    err.push("notice_salaries.texte : obligatoire — les collaborateurs doivent être informés des règles avant qu'elles s'appliquent");
  }

  if (err.length) throw new PolitiqueInvalide(err);

  const emise = maintenant;
  const expire = new Date(emise.getTime() + j * 86400000);
  const politique = {
    format: FORMAT_POLITIQUE,
    cabinet: { id: cabinet.id, nom: cabinet.nom },
    version,
    emise_le: emise.toISOString(),
    expire_le: expire.toISOString(),
    emise_par: source.emise_par.trim().toLowerCase(),
    perimetre: { surfaces: [...new Set(surfaces)].sort(), en_cas_erreur: enCasErreur },
    equipes,
    regles: reglesCompilees,
    alertes,
    journal: { retention_mois: retention },
    notice_salaries: notice,
  };

  // Aucun nom protégé ne doit apparaître en clair dans ce qui sera publié.
  // On regarde le texte libre seulement : les mots de structure (« CLIENT »,
  // « interdit »…) déclencheraient de fausses alertes.
  const texteLibre = [
    politique.emise_par,
    politique.notice_salaries.texte,
    ...reglesCompilees.flatMap((r) => [r.libelle, ...(r.portee?.dossiers ?? [])]),
    ...equipes.flatMap((e) => [e.nom, ...e.membres, ...e.responsables]),
    ...alertes.admin_technique,
    ...alertes.canaux.map((c) => c.url ?? ""),
  ].join(" | ");
  const publie = normaliser(texteLibre);
  const fuites = nomsProteges.filter(({ norm }) => contientEnMots(publie, norm)).map(({ pos }) => pos);
  if (fuites.length) {
    throw new PolitiqueInvalide(fuites.map((pos) =>
      `${pos} : apparaît en clair ailleurs dans la politique (libellé, notice, équipes…) — la politique publiée le révélerait`));
  }

  return { politique, avertissements: avert };
}

/* Octets exacts du fichier publié + son fichier de signature. */
export function signerPolitique(politique, clePrivee, cleId) {
  const octets = Buffer.from(canonique(politique), "utf8");
  const signature = {
    alg: "ed25519",
    cle_id: cleId,
    signature: crypto.sign(null, octets, clePrivee).toString("base64"),
  };
  return { octets, signature: Buffer.from(JSON.stringify(signature) + "\n", "utf8") };
}

/* Version publiée actuellement dans le dossier partagé (0 si aucune). */
export function versionPubliee(dossier) {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(dossier, FICHIER_POLITIQUE), "utf8"));
    return Number.isInteger(p.version) ? p.version : 0;
  } catch { return 0; }
}

/* Écrit la politique et sa signature dans le dossier partagé, plus une copie
   d'archive. La version suit la plus haute connue (fichier cabinet OU
   dossier partagé) : un fichier cabinet restauré depuis une vieille sauvegarde
   ne doit pas émettre une version que les postes refuseraient (anti-retour). */
export function publierPolitique({ source, cabinet, ouvert, dossierPartage, dossierArchives, maintenant = new Date(), jours }) {
  const version = Math.max(cabinet.derniere_version, versionPubliee(dossierPartage)) + 1;
  const { politique, avertissements } = compilerPolitique(source, {
    cabinet, sel: ouvert.sel, version, maintenant, jours,
  });
  const { octets, signature } = signerPolitique(politique, ouvert.clePrivee, cabinet.cle.id);

  fs.mkdirSync(dossierPartage, { recursive: true });
  const ecrire = (dossier, nom, contenu) => {
    const f = path.join(dossier, nom);
    const tmp = f + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, contenu);
    fs.renameSync(tmp, f);
    return f;
  };
  // Signature d'abord : un poste qui lit entre les deux renommages voit une
  // signature neuve sur l'ancien fichier → échec ; US-4 relit avant d'alerter.
  ecrire(dossierPartage, FICHIER_SIGNATURE, signature);
  const fichier = ecrire(dossierPartage, FICHIER_POLITIQUE, octets);
  if (dossierArchives) {
    const d = path.join(dossierArchives, `v${version}`);
    fs.mkdirSync(d, { recursive: true });
    ecrire(d, FICHIER_POLITIQUE, octets);
    ecrire(d, FICHIER_SIGNATURE, signature);
  }
  return { version, fichier, politique, avertissements };
}

/* Modèle de source commenté par l'exemple, pour démarrer. */
export function modeleSource() {
  return {
    format: "nanomizer.politique-source/1",
    emise_par: "admin@votre-cabinet.fr",
    expiration_jours: EXPIRATION_DEFAUT_JOURS,
    perimetre: { surfaces: ["claude_code", "claude_desktop", "claude_web"], en_cas_erreur: "bloquer" },
    equipes: [
      {
        id: "eq_contentieux",
        nom: "Contentieux",
        membres: ["collaborateur@votre-cabinet.fr"],
        responsables: ["associe@votre-cabinet.fr"],
      },
    ],
    regles: [
      {
        id: "R-001",
        type: "toujours_pseudonymiser",
        libelle: "Clients actifs",
        categorie: "CLIENT",
        noms: ["Nom du client", "Variante du nom"],
      },
      {
        id: "R-010",
        type: "interdit",
        libelle: "Pièces d'identité et coordonnées bancaires",
        detecteurs: ["CIN", "RIB", "CARTE", "PERMIS"],
        alerte: "responsable",
      },
      {
        id: "R-020",
        type: "detecteurs",
        libelle: "Identifiants d'entreprise",
        ajoute: ["ICE", "IF", "RC", "CNSS"],
      },
    ],
    alertes: {
      canaux: [{ type: "email" }],
      admin_technique: ["it@votre-cabinet.fr"],
      signal_de_vie_max_minutes: 120,
      heures_ouvrees: { jours: [1, 2, 3, 4, 5], de: "08:00", a: "20:00", fuseau: "Europe/Paris" },
    },
    journal: { retention_mois: 12 },
    notice_salaries: {
      texte: "Nanomizer protège les données de nos clients avant tout envoi à Claude. Les règles appliquées et votre propre journal sont consultables depuis Nanomizer.",
      communiquee_le: "AAAA-MM-JJ",
    },
  };
}
