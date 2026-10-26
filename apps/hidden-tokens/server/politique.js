// ============================================================================
// POLITIQUE DU CABINET, CÔTÉ POSTE (US-4) — le connecteur charge la politique
// signée par l'admin (apps/nanomizer-admin) et l'applique aux fichiers qu'on
// lui confie. Spec : apps/nanomizer-admin/SPEC-POLITIQUE-ADMIN.md, §3 et §4.3.
//
//   1. ENRÔLEMENT ET ÉPINGLAGE. Le fichier d'enrôlement (réglage du
//      connecteur) apporte la clé publique du cabinet. Au premier usage, le
//      poste l'ÉPINGLE dans son état local ; ensuite, un enrôlement qui
//      apporterait une autre clé est refusé (rotation : hors US-4).
//   2. À CHAQUE OUTIL QUI CODE, la politique du dossier partagé est relue et
//      revérifiée (les fichiers sont petits, Ed25519 est rapide) :
//        ABSENTE      aucune politique, ni partagée ni en copie locale → bloque
//        ALTEREE      signature, cabinet, format ou contenu invalide → bloque
//        RETROGRADEE  version inférieure à la plus haute déjà acceptée, ou
//                     même numéro avec un autre contenu → bloque
//        EXPIREE      expire_le dépassée : avertit pendant 72 h, puis bloque
//        NON_SYNCHRONISEE  dossier partagé injoignable, copie locale
//                     vérifiée utilisée ; avertit au-delà de 24 h
//   3. FAIL CLOSED. Toute erreur imprévue = ALTEREE. Le DÉCODAGE n'est jamais
//      bloqué : on cesse de produire, on ne prend rien en otage.
//   4. RÈGLES APPLIQUÉES : les « interdit » par détecteur (un fichier dont la
//      copie codée contient un code RIB-…, CIN-… visé n'est pas écrit), et
//      (US-5) les règles par NOMS. La politique ne contient que des
//      empreintes HMAC des noms : le poste découpe le texte en n-grammes de 1
//      à 6 mots, les normalise EXACTEMENT comme la console
//      (nanomizer-admin/lib/empreinte.js — c'est le contrat), les hache avec
//      le sel du cabinet et compare. Un nom « toujours_pseudonymiser » trouvé
//      est codé (CLI-001…) même si les détecteurs l'auraient raté ; un nom
//      « interdit » trouvé est codé INTERDIT-… et la copie n'est pas écrite ;
//      après codage, un nom listé encore en clair bloque tout (BLOQUE_ERREUR).
//
// L'état local (.nanomizer-politique-poste.json, droits 600) garde la clé
// épinglée, la plus haute version acceptée et une copie vérifiée de la
// dernière politique. Son nom en .nanomizer- le rend illisible pour l'IA.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PREFIX_LABEL } from "./engine.js";
import { normaliser, creerReconnaisseur, PREFIXE_EMPREINTE, MAX_MOTS, PREFIXE_RX, prefixesReserves, validerRegles } from "./regles.js";
import { developperPacks } from "./packs.js";
/* Le contrat des empreintes vit dans regles.js depuis la v2.18 (les règles du
   dossier s'en servent aussi) ; réexporté pour les tests et les anciens imports. */
export { normaliser, creerReconnaisseur, PREFIXE_EMPREINTE, MAX_MOTS };

export const FORMAT_ENROLEMENT = "nanomizer.enrolement/1";
export const FORMAT_POLITIQUE = "nanomizer.politique/1";
export const FICHIER_POLITIQUE = "politique.nanomizer.json";
export const FICHIER_SIGNATURE = "politique.nanomizer.json.sig";
export const ETAT_FILE = ".nanomizer-politique-poste.json";
export const SURFACE = "claude_desktop";
export const GRACE_EXPIRATION_H = 72;
export const SYNCHRO_MAX_H = 24;
const EXPIRATION_MAX_JOURS = 365;
const PLANCHER = ["PRENOM", "NOM", "PERSONNE", "EMAIL", "TEL", "ADRESSE"];
// v2.18 : « motif » et « laisser_en_clair » (SPEC-REGLES-ORGANISATION.md) ;
// un poste antérieur à la 2.18 refuse une politique qui les porte (fail closed, voulu).
const TYPES_REGLE = new Set(["toujours_pseudonymiser", "interdit", "detecteurs", "motif", "laisser_en_clair"]);

/* Catégorie d'une règle « toujours_pseudonymiser » → type du moteur. */
const TYPE_CATEGORIE = { CLIENT: "cat_client", PARTIE: "cat_partie", PERSONNE: "cat_personne", SOCIETE: "cat_societe", DOSSIER: "cat_dossier", PROJET: "cat_projet" };

/* États qui empêchent de coder. EXPIREE ne bloque qu'après la grâce. */
const BLOQUANTS = new Set(["ABSENTE", "ALTEREE", "RETROGRADEE"]);

export class PolitiqueBloque extends Error {
  constructor(message, { decision, regle } = {}) { super(message); this.decision = decision; this.regle = regle; }
}

const sha256 = (buf) => "sha256:" + crypto.createHash("sha256").update(buf).digest("hex");
// Même formule que la console (nanomizer-admin/lib/cabinet.js, idCle) : test/politique.test.js le vérifie.
const idCle = (spki) => "k_" + crypto.createHash("sha256").update(spki).digest("hex").slice(0, 12);

/* Contrôle du fichier d'enrôlement (même règles que la console, US-3). */
export function lireEnrolement(fichier) {
  let enr;
  try { enr = JSON.parse(fs.readFileSync(fichier, "utf8")); } catch { throw new Error("fichier d'enrôlement introuvable ou illisible"); }
  if (!enr || enr.format !== FORMAT_ENROLEMENT) throw new Error("ce n'est pas un fichier d'enrôlement Hidden Tokens");
  for (const k of ["cabinet", "cle", "sel", "poste", "distribution"]) if (!enr[k]) throw new Error(`fichier d'enrôlement incomplet (${k})`);
  if (enr.cle.alg !== "ed25519") throw new Error("algorithme de clé non pris en charge");
  let spki;
  try {
    spki = Buffer.from(enr.cle.publique, "base64");
    crypto.createPublicKey({ key: spki, format: "der", type: "spki" });
  } catch { throw new Error("clé publique illisible"); }
  if (idCle(spki) !== enr.cle.id) throw new Error("identifiant de clé incohérent (fichier modifié ?)");
  if (Buffer.from(String(enr.sel), "base64").length !== 32) throw new Error("sel illisible");
  if (!enr.distribution.dossier_partage) throw new Error("dossier partagé de la politique absent");
  return enr;
}

/* Les contrôles de chargement de la spec (§2.2, « refus de charger sur le
   poste ») : la console les fait déjà, mais un fichier signé par une console
   plus ancienne ou bricolée ne doit pas passer pour autant. */
export function validerPolitique(p, cabinetId) {
  const e = [];
  if (!p || p.format !== FORMAT_POLITIQUE) return ["format de politique inconnu"];
  if (p.cabinet?.id !== cabinetId) e.push("politique d'un autre cabinet");
  if (!Number.isInteger(p.version) || p.version < 1) e.push("numéro de version invalide");
  const emise = Date.parse(p.emise_le), expire = Date.parse(p.expire_le);
  if (!Number.isFinite(emise) || !Number.isFinite(expire) || expire <= emise) e.push("dates d'émission ou d'expiration invalides");
  else if (expire - emise > EXPIRATION_MAX_JOURS * 86400000 + 60000) e.push(`expiration au-delà de ${EXPIRATION_MAX_JOURS} jours`);
  if (p.perimetre?.en_cas_erreur !== "bloquer") e.push("en_cas_erreur doit valoir « bloquer »");
  if (!Array.isArray(p.perimetre?.surfaces)) e.push("surfaces absentes");
  const equipes = new Set((p.equipes || []).map((x) => x.id));
  const ids = new Set();
  if (p.packs !== undefined && (!Array.isArray(p.packs) || p.packs.some((x) => typeof x !== "string"))) e.push("packs : liste d'identifiants attendue");
  if (!Array.isArray(p.regles)) return [...e, "règles absentes"];
  for (const r of p.regles) {
    const ou = r?.id || "règle sans id";
    if (!r || !/^R-\d{3,}$/.test(String(r.id))) { e.push(`${ou} : id invalide`); continue; }
    if (ids.has(r.id)) e.push(`${ou} : id en double`);
    ids.add(r.id);
    if (!TYPES_REGLE.has(r.type)) { e.push(`${ou} : type inconnu`); continue; }
    if ("retire" in r || "desactive" in r) e.push(`${ou} : le plancher éditeur ne se retire pas`);
    for (const d of [...(r.detecteurs || []), ...(r.ajoute || [])]) if (!(d in PREFIX_LABEL)) e.push(`${ou} : détecteur inconnu « ${d} »`);
    for (const q of r.portee?.equipes || []) if (!equipes.has(q)) e.push(`${ou} : équipe inexistante`);
    for (const h of r.empreintes || []) if (!/^hm1:[0-9a-f]{64}$/.test(String(h))) e.push(`${ou} : empreinte illisible`);
    // v2.18 — catégorie maison d'une règle par noms : son préfixe doit être
    // libre ; motifs et termes en clair passent la validation des règles.
    if (r.type === "toujours_pseudonymiser" && r.prefixe !== undefined
        && (!PREFIXE_RX.test(String(r.prefixe)) || prefixesReserves().has(String(r.prefixe)))) e.push(`${ou} : préfixe invalide ou réservé`);
    if (r.type === "motif" || r.type === "laisser_en_clair") for (const m of validerRegles([r], { niveau: "organisation", verifierIdentifiants: false }).erreurs) e.push(m);
  }
  return e;
}

/* La règle vise-t-elle ce collaborateur ? Une portée par DOSSIERS ne peut pas
   être évaluée sur un fichier (le connecteur ne connaît pas le dossier) :
   la règle s'applique alors partout — plus strict, jamais plus permissif. */
function viseUtilisateur(regle, politique, utilisateur) {
  const eqs = regle.portee?.equipes;
  if (!eqs || !eqs.length) return true;
  const u = String(utilisateur || "").toLowerCase();
  return (politique.equipes || []).some((q) => eqs.includes(q.id) &&
    [...(q.membres || []), ...(q.responsables || [])].some((m) => String(m).toLowerCase() === u));
}

export function creerPolitiquePoste({ enrolement, etatDir, now = () => new Date() }) {
  const etatFile = path.join(etatDir, ETAT_FILE);
  const lireEtat = () => { try { return JSON.parse(fs.readFileSync(etatFile, "utf8")); } catch { return null; } };
  const ecrireEtat = (s) => {
    fs.mkdirSync(etatDir, { recursive: true, mode: 0o700 });
    const tmp = `${etatFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(s), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tmp, etatFile);
  };

  function verifier(enr, etat, octets, octetsSig) {
    let sig;
    try { sig = JSON.parse(Buffer.from(octetsSig).toString("utf8")); } catch { return { ok: false, raison: "fichier de signature illisible" }; }
    if (sig.alg !== "ed25519" || sig.cle_id !== etat.cle.id) return { ok: false, raison: "signée par une autre clé que celle du cabinet" };
    const cle = crypto.createPublicKey({ key: Buffer.from(etat.cle.publique, "base64"), format: "der", type: "spki" });
    let valide = false;
    try { valide = crypto.verify(null, octets, cle, Buffer.from(String(sig.signature), "base64")); } catch {}
    if (!valide) return { ok: false, raison: "signature invalide (politique modifiée après signature ?)" };
    let p;
    try { p = JSON.parse(octets.toString("utf8")); } catch { return { ok: false, raison: "politique illisible" }; }
    const erreurs = validerPolitique(p, enr.cabinet.id);
    if (erreurs.length) return { ok: false, raison: erreurs[0] };
    return { ok: true, politique: p };
  }

  /* Le contrôle complet. Ne lève jamais : toute surprise = ALTEREE. */
  function controler() {
    const t = now();
    let enr;
    try { enr = lireEnrolement(enrolement); } catch (e) { return { etat: "ALTEREE", bloque: true, raison: `enrôlement : ${e.message}` }; }
    try {
      let etat = lireEtat();
      if (!etat || etat.cabinet?.id !== enr.cabinet.id || etat.poste?.id !== enr.poste.id) {
        if (etat && etat.cle && etat.cle.id !== enr.cle.id) {
          return { etat: "ALTEREE", bloque: true, raison: "l'enrôlement apporte une autre clé que celle épinglée sur ce poste" };
        }
        etat = { cabinet: enr.cabinet, cle: enr.cle, poste: enr.poste, version_max: 0, empreinte_max: null, synchro: null, copie: null, epingle_le: t.toISOString() };
        ecrireEtat(etat);
      } else if (etat.cle.id !== enr.cle.id) {
        return { etat: "ALTEREE", bloque: true, raison: "l'enrôlement apporte une autre clé que celle épinglée sur ce poste" };
      }

      const dir = enr.distribution.dossier_partage;
      const lirePartage = () => {
        try {
          return { octets: fs.readFileSync(path.join(dir, FICHIER_POLITIQUE)), sig: fs.readFileSync(path.join(dir, FICHIER_SIGNATURE)) };
        } catch { return null; }
      };
      let partage = lirePartage();
      let v = partage ? verifier(enr, etat, partage.octets, partage.sig) : null;
      // La console écrit la signature AVANT la politique : un poste qui lit
      // entre les deux renommages voit un couple incohérent. On relit une fois.
      if (v && !v.ok) { partage = lirePartage(); v = partage ? verifier(enr, etat, partage.octets, partage.sig) : null; }

      let source = "partage", octets;
      if (v && !v.ok) return { etat: "ALTEREE", bloque: true, raison: v.raison, cabinet: enr.cabinet };
      if (!v) {
        if (!etat.copie) return { etat: "ABSENTE", bloque: true, raison: `aucune politique dans le dossier partagé (${FICHIER_POLITIQUE})`, cabinet: enr.cabinet };
        octets = Buffer.from(etat.copie.octets, "base64");
        v = verifier(enr, etat, octets, Buffer.from(etat.copie.sig, "base64"));
        if (!v.ok) return { etat: "ALTEREE", bloque: true, raison: `copie locale : ${v.raison}`, cabinet: enr.cabinet };
        source = "copie";
      } else octets = partage.octets;

      const p = v.politique;
      const emp = sha256(octets);
      if (p.version < etat.version_max || (p.version === etat.version_max && emp !== etat.empreinte_max)) {
        return {
          etat: "RETROGRADEE", bloque: true, cabinet: enr.cabinet,
          raison: p.version < etat.version_max
            ? `version ${p.version} alors que ce poste a déjà accepté la version ${etat.version_max}`
            : `version ${p.version} au contenu différent de celle déjà acceptée`,
        };
      }
      if (source === "partage") {
        const neuve = p.version > etat.version_max;
        etat = { ...etat, version_max: p.version, empreinte_max: emp, synchro: t.toISOString(),
          copie: neuve || !etat.copie ? { octets: octets.toString("base64"), sig: partage.sig.toString("base64") } : etat.copie };
        ecrireEtat(etat);
      }

      const base = { politique: p, version: p.version, empreinte: emp, cabinet: enr.cabinet, utilisateur: enr.poste.utilisateur, source,
        sel: Buffer.from(enr.sel, "base64") };   // pour les empreintes des noms ; jamais affiché
      const retardH = (t - Date.parse(p.expire_le)) / 3600000;
      if (retardH > GRACE_EXPIRATION_H) {
        return { ...base, etat: "EXPIREE", bloque: true, raison: `politique v${p.version} expirée le ${p.expire_le.slice(0, 10)}, délai de ${GRACE_EXPIRATION_H} h dépassé` };
      }
      if (retardH > 0) {
        return { ...base, etat: "EXPIREE", bloque: false, avert: `politique v${p.version} expirée le ${p.expire_le.slice(0, 10)} : prévenez votre admin, le codage s'arrêtera ${GRACE_EXPIRATION_H} h après l'échéance` };
      }
      const synchroH = etat.synchro ? (t - Date.parse(etat.synchro)) / 3600000 : Infinity;
      if (source === "copie" && synchroH > SYNCHRO_MAX_H) {
        return { ...base, etat: "NON_SYNCHRONISEE", bloque: false, avert: `dossier partagé injoignable depuis plus de ${SYNCHRO_MAX_H} h : la dernière politique vérifiée (v${p.version}) s'applique` };
      }
      return { ...base, etat: "OK", bloque: false };
    } catch (e) {
      return { etat: "ALTEREE", bloque: true, raison: "erreur inattendue au contrôle de la politique" };
    }
  }

  /* Règles « interdit » par détecteur qui visent ce poste. */
  function interditsDetecteurs(c) {
    if (!c.politique || !c.politique.perimetre.surfaces.includes(SURFACE)) return [];
    return c.politique.regles.filter((r) => r.type === "interdit" && r.detecteurs?.length && viseUtilisateur(r, c.politique, c.utilisateur));
  }

  /* Règles par noms (US-5) : un reconnaisseur par version de politique.
     Une même empreinte sous « interdit » et « toujours_pseudonymiser » :
     l'interdit l'emporte (priorité de la spec §2.2). */
  let noms = null;
  function reconnaisseur(c) {
    if (!c || !c.politique || !c.sel || !c.politique.perimetre.surfaces.includes(SURFACE)) return null;
    if (noms && noms.cle === c.empreinte) return noms;
    const parEmpreinte = new Map();
    for (const r of c.politique.regles) {
      if (!r.empreintes?.length || !viseUtilisateur(r, c.politique, c.utilisateur)) continue;
      for (const e of r.empreintes) {
        const avant = parEmpreinte.get(e);
        if (!avant || (r.type === "interdit" && avant.type !== "interdit")) parEmpreinte.set(e, r);
      }
    }
    noms = { cle: c.empreinte, parEmpreinte, trouver: parEmpreinte.size ? creerReconnaisseur(c.sel, [...parEmpreinte.keys()]) : null };
    return noms;
  }

  /* Les noms listés présents dans ces textes : valeurs à coder (au format
     des « extras » du moteur) et règles « interdit » touchées. */
  function analyserNoms(c, textes) {
    const rec = reconnaisseur(c);
    const extras = [], interdits = [];
    if (!rec || !rec.trouver) return { extras, interdits };
    for (const t of textes) {
      for (const m of rec.trouver(t)) {
        const r = rec.parEmpreinte.get(m.empreinte);
        if (r.type === "interdit") { extras.push({ value: m.value, type: "cat_interdit" }); interdits.push(r); }
        else extras.push({ value: m.value, type: r.prefixe ? "regle_" + r.prefixe : (TYPE_CATEGORIE[r.categorie] || "cat_client") });
      }
    }
    return { extras, interdits };
  }

  /* Contrôle résiduel (spec §4.2, étape 4) : un nom listé encore en clair
     dans ce que l'IA lirait. Renvoie la règle, ou null. */
  function residuNoms(c, texteCode) {
    const rec = reconnaisseur(c);
    if (!rec || !rec.trouver) return null;
    const m = rec.trouver(texteCode)[0];
    return m ? rec.parEmpreinte.get(m.empreinte) : null;
  }

  function nbNoms(c) { const rec = reconnaisseur(c); return rec ? rec.parEmpreinte.size : 0; }

  /* v2.18 — les règles de la politique que regles.js applique comme celles du
     dossier (motifs, termes en clair), celles qui visent ce poste ; et les
     catégories maison des règles par noms, à enregistrer dans le moteur. */
  function reglesOrganisation(c) {
    if (!c || !c.politique || c.bloque || !c.politique.perimetre.surfaces.includes(SURFACE)) return { regles: [], erreurs: [] };
    const brutes = c.politique.regles.filter((r) => (r.type === "motif" || r.type === "laisser_en_clair") && viseUtilisateur(r, c.politique, c.utilisateur));
    const v = validerRegles(brutes, { niveau: "organisation" });
    // Les packs métier de la politique (SPEC-PACKS-METIER §3) : développés ici,
    // depuis les fichiers de CE connecteur ; un pack inconnu bloque (fail closed).
    const d = developperPacks(c.politique.packs);
    return { regles: [...v.regles, ...d.regles], entetes: d.entetes, erreurs: [...v.erreurs, ...d.erreurs].map((m) => `politique du cabinet, ${m}`) };
  }
  function typesOrganisation(c) {
    if (!c || !c.politique || c.bloque) return [];
    return c.politique.regles.filter((r) => r.type === "toujours_pseudonymiser" && r.prefixe)
      .map((r) => ({ id: "regle_" + r.prefixe, prefix: r.prefixe, label: `${r.libelle} (règle de l'organisation)` }));
  }

  /* v2.25 — la politique choisit-elle les packs de CE poste ? (« packs »
     présent, même vide, dans une politique qui vise cette surface.) Si oui,
     aucun pack par défaut ne s'ajoute. */
  function declarePacks(c) {
    return !!(c && c.politique && !c.bloque && c.politique.perimetre.surfaces.includes(SURFACE) && c.politique.packs !== undefined);
  }

  return { controler, interditsDetecteurs, analyserNoms, residuNoms, nbNoms, reglesOrganisation, typesOrganisation, declarePacks, bloquant: (c) => c.bloque || BLOQUANTS.has(c.etat) };
}

/* Première règle « interdit » dont un détecteur a produit un code dans le
   texte codé (les codes sont PRÉFIXE-NNN… ; le préfixe est le détecteur). */
export function regleInterditeTouchee(regles, texteCode) {
  const s = String(texteCode);
  for (const r of regles) {
    for (const d of r.detecteurs) {
      if (new RegExp(`(?<![\\p{L}\\p{N}])${d}-\\d{3,}(?![\\p{L}\\p{N}])`, "u").test(s)) return { regle: r, detecteur: d };
    }
  }
  return null;
}

/* La ligne de compte rendu pour le salarié (transparence, invariant 5). */
export function decrirePolitique(c, { nbNoms = 0 } = {}) {
  if (!c) return "";
  if (c.bloque) {
    return `🛑 Politique du cabinet${c.cabinet ? ` ${c.cabinet.nom}` : ""} : ${c.etat} — ${c.raison}. Par sécurité, RIEN n'est codé ni préparé pour l'IA ; ` +
      "prévenez votre admin. Le décodage reste disponible.";
  }
  const p = c.politique;
  const TYPE_LIBELLE = { interdit: "interdit", detecteurs: "détecteurs ajoutés", toujours_pseudonymiser: "toujours pseudonymiser", motif: "motif", laisser_en_clair: "laissé en clair" };
  const regles = p.regles.map((r) => `${r.id} (${TYPE_LIBELLE[r.type] || r.type}) « ${r.libelle} »`).join(" ; ");
  return [
    `Politique du cabinet ${c.cabinet.nom} : v${p.version}, valide jusqu'au ${p.expire_le.slice(0, 10)}${c.source === "copie" ? " (copie locale vérifiée)" : ""}. Règles : ${regles}.`,
    p.perimetre.surfaces.includes(SURFACE) ? "" : "Cette politique ne vise pas Claude Desktop : ses règles ne s'appliquent pas ici (signature et version restent contrôlées).",
    c.avert ? `⚠️ ${c.avert}.` : "",
    nbNoms ? `${nbNoms} forme(s) de noms protégée(s) par empreintes : codées même si les détecteurs les ratent ; un nom interdit bloque la copie.` : "",
    p.notice_salaries?.texte ? `Notice du cabinet : ${p.notice_salaries.texte}` : "",
  ].filter(Boolean).join("\n");
}
