#!/usr/bin/env node
// ============================================================================
// CONSOLE ADMIN NANOMIZER (v0, en ligne de commande) — US-1, US-2, US-3.
//
//   nanomizer-admin creer-cabinet --nom "Cabinet Exemple"
//   nanomizer-admin secours [--sortie secours.txt]
//   nanomizer-admin enroler --utilisateur s.alaoui@cabinet.fr --dossier-partage /Volumes/NAS/nanomizer [--relais nas.local:7443] [--sortie .]
//   nanomizer-admin modele > politique-source.json
//   nanomizer-admin signer --source politique-source.json --dossier-partage /Volumes/NAS/nanomizer [--jours 90]
//   nanomizer-admin verifier --enrolement enrolement-pst_xxxx.nanomizer --dossier-partage /Volumes/NAS/nanomizer
//
// Le registre de pseudonymes de l'organisation (SPEC-REGISTRE-ORGANISATION) :
//   nanomizer-admin registre-creer --dossier-partage … [--depuis-equipe /Volumes/NAS/equipe]
//   nanomizer-admin registre-etat --dossier-partage …
//   nanomizer-admin poste-certifier --dossier-partage … --poste pst_xxxxxxxx     (compare l'empreinte avec le collaborateur)
//   nanomizer-admin poste-retirer --dossier-partage … --poste pst_xxxxxxxx
//   nanomizer-admin sequestre-creer --dossier-partage … --gardien "Me A" --gardien "Me B" [--gardien …] [--quorum 2]
//   nanomizer-admin sequestre-ouvrir --dossier-partage … --poste pst_xxxxxxxx [--console]
//   nanomizer-admin feuille-secours --dossier-partage … [--sortie feuille.html]
//   nanomizer-admin restaurer --dossier-partage … --poste pst_xxxxxxxx [--console]     (recopie la feuille)
//   nanomizer-admin registre-fusionner --dossier-partage … --garde NOM-48291374 --alias NOM-001
//
// Le dossier du cabinet est ~/.nanomizer-admin (ou NANOMIZER_ADMIN_DIR).
// La phrase de passe est demandée sans écho (ou lue dans NANOMIZER_PHRASE,
// pour les scripts). Rien ne part sur le réseau.
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import {
  FICHIER_CABINET, creerCabinet, ouvrirCabinet, lireCabinet, ecrireCabinet, exporterSecours, verifierPhrase,
} from "../lib/cabinet.js";
import { creerEnrolement, ecrireEnrolement, importerEnrolement, verifierSignature } from "../lib/enrolement.js";
import {
  publierPolitique, modeleSource, PolitiqueInvalide, FICHIER_POLITIQUE, FICHIER_SIGNATURE,
} from "../lib/politique.js";
import {
  FICHIER_ADMIN, creerAdmin, ouvrirAdmin, lireAdmin, ecrireAdmin, creerRegistre, lireRegistre, certifierPoste, retirerPoste,
  attacherSequestre, restaurerSecrets, secretsAdmin, secretsSequestre, ajouterEntreesAdmin, fusionnerDoublon, etatRegistre,
  lireFiche, lireEquipeV23,
} from "../lib/registre.js";
import { FICHIER_SEQUESTRE, creerSequestre, ouvrirSequestre } from "../lib/sequestre.js";
import { groupes, lireGroupes, pageFeuille } from "../lib/feuille.js";

const DOSSIER = process.env.NANOMIZER_ADMIN_DIR || path.join(os.homedir(), ".nanomizer-admin");
const FICHIER = path.join(DOSSIER, FICHIER_CABINET);
const FICHIER_REGISTRE_ADMIN = path.join(DOSSIER, FICHIER_ADMIN);

function args(nom) {
  const out = [];
  process.argv.forEach((a, i) => { if (a === "--" + nom && process.argv[i + 1] !== undefined) out.push(process.argv[i + 1]); });
  return out;
}

/* La console ouverte sur le registre : cabinet, clé privée, clé de réception. */
async function consoleRegistre({ sansAdmin = false } = {}) {
  const cabinet = lireCabinet(FICHIER);
  const p = await phrase();
  const ouvert = ouvrirCabinet(cabinet, p);
  const partage = obligatoire("dossier-partage");
  if (sansAdmin) return { cabinet, ouvert, partage, phraseCabinet: p };
  const admin = lireAdmin(FICHIER_REGISTRE_ADMIN);
  return { cabinet, ouvert, partage, phraseCabinet: p, admin, adminPrivee: ouvrirAdmin(admin, cabinet, p) };
}

async function phraseGardien(nom) {
  const v = process.env[`NANOMIZER_PHRASE_${nom}`];
  if (v) return v;
  return demander(`Phrase du gardien ${nom} (≥ 12 caractères, tapée par lui) : `, { cache: true });
}

function arg(nom, defaut) {
  const i = process.argv.indexOf("--" + nom);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : defaut;
}

function obligatoire(nom) {
  const v = arg(nom);
  if (!v) throw new Error(`il manque --${nom}`);
  return v;
}

function demander(question, { cache = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error("pas de terminal interactif : définissez NANOMIZER_PHRASE"));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (cache) {
      rl._writeToOutput = (s) => { if (!rl.silencieux) process.stdout.write(s); };
    }
    rl.question(question, (r) => { rl.close(); if (cache) process.stdout.write("\n"); resolve(r); });
    rl.silencieux = cache;
  });
}

async function phrase({ confirmer = false } = {}) {
  if (process.env.NANOMIZER_PHRASE) return process.env.NANOMIZER_PHRASE;
  const p = await demander("Phrase de passe du cabinet : ", { cache: true });
  if (confirmer) {
    verifierPhrase(p);
    const p2 = await demander("Confirmez la phrase de passe : ", { cache: true });
    if (p !== p2) throw new Error("les deux phrases diffèrent");
  }
  return p;
}

const commandes = {
  async "creer-cabinet"() {
    const nom = obligatoire("nom");
    const p = await phrase({ confirmer: true });
    const cabinet = creerCabinet({ nom, phrase: p });
    ecrireCabinet(FICHIER, cabinet, { nouveau: true });
    console.log(`Cabinet créé : ${cabinet.nom} (${cabinet.id})`);
    console.log(`Clé de signature : ${cabinet.cle.id}`);
    console.log(`Fichier : ${FICHIER}`);
    console.log("\nÉtape suivante, indispensable : « nanomizer-admin secours », à imprimer et ranger au coffre.");
    console.log("Une phrase de passe perdue ne se récupère pas, pas même par l'éditeur.");
  },

  async secours() {
    const cabinet = lireCabinet(FICHIER);
    ouvrirCabinet(cabinet, await phrase()); // prouve que la phrase est connue avant d'exporter
    const texte = exporterSecours(cabinet);
    const sortie = arg("sortie");
    if (sortie) {
      fs.writeFileSync(sortie, texte, { mode: 0o600, flag: "wx" });
      console.log(`Secours écrit : ${sortie} — imprimez-le, rangez-le, puis supprimez le fichier.`);
    } else process.stdout.write(texte);
  },

  async enroler() {
    const cabinet = lireCabinet(FICHIER);
    const ouvert = ouvrirCabinet(cabinet, await phrase());
    const enr = creerEnrolement(cabinet, ouvert, {
      utilisateur: obligatoire("utilisateur"),
      dossierPartage: obligatoire("dossier-partage"),
      relais: arg("relais", null),
    });
    const fichier = ecrireEnrolement(arg("sortie", "."), enr);
    console.log(`Poste ${enr.poste.id} enrôlé pour ${enr.poste.utilisateur}.`);
    console.log(`Fichier : ${fichier}`);
    console.log("À installer sur le poste en main propre ou via le dossier partagé du cabinet — jamais par une messagerie externe.");
  },

  async modele() {
    process.stdout.write(JSON.stringify(modeleSource(), null, 2) + "\n");
  },

  async signer() {
    const cabinet = lireCabinet(FICHIER);
    const sourceFichier = obligatoire("source");
    let source;
    try { source = JSON.parse(fs.readFileSync(sourceFichier, "utf8")); }
    catch (e) { throw new Error(`source illisible (${e.code || "JSON invalide"})`); }
    const jours = arg("jours") !== undefined ? Number(arg("jours")) : undefined;
    const ouvert = ouvrirCabinet(cabinet, await phrase());
    const r = publierPolitique({
      source, cabinet, ouvert, jours,
      dossierPartage: obligatoire("dossier-partage"),
      dossierArchives: path.join(DOSSIER, "archives"),
    });
    cabinet.derniere_version = r.version;
    ecrireCabinet(FICHIER, cabinet);
    for (const a of r.avertissements) console.log(`Attention : ${a}`);
    console.log(`Politique v${r.version} signée (clé ${cabinet.cle.id}), valable jusqu'au ${r.politique.expire_le.slice(0, 10)}.`);
    console.log(`Publiée : ${r.fichier}`);
    console.log(`${r.politique.regles.length} règle(s). Les noms n'y figurent qu'en empreintes.`);
  },

  /* ---------------------------------------------------- le registre de l'organisation */

  async "registre-creer"() {
    const cabinet = lireCabinet(FICHIER);
    const p = await phrase();
    const ouvert = ouvrirCabinet(cabinet, p);
    const partage = obligatoire("dossier-partage");
    let admin;
    if (fs.existsSync(FICHIER_REGISTRE_ADMIN)) admin = lireAdmin(FICHIER_REGISTRE_ADMIN);
    else { admin = creerAdmin(cabinet, p); ecrireAdmin(FICHIER_REGISTRE_ADMIN, admin); }
    let kCodes = null, importes = null;
    const equipe = arg("depuis-equipe");
    if (equipe) { importes = lireEquipeV23(equipe); kCodes = importes.secret; }
    const reg = creerRegistre({ cabinet, ouvert, admin, partage, kCodes });
    console.log(`Registre ${reg.id} créé pour ${cabinet.nom} dans ${path.join(partage, "registre")}.`);
    if (importes) {
      const n = ajouterEntreesAdmin(reg, secretsAdmin(reg, ouvrirAdmin(admin, cabinet, p)), partage, importes.entries);
      console.log(`Clé d'équipe reprise : même secret de codes, ${n} correspondance(s) importée(s) chiffrées.`);
      if (importes.fichiers.length) console.log(`Supprimez maintenant les fichiers en clair : ${importes.fichiers.join(", ")}`);
    }
    console.log("\nÉtapes suivantes : « sequestre-creer » (continuité), « feuille-secours » (au coffre), puis « poste-certifier » pour chaque poste qui a importé son enrôlement.");
  },

  async "registre-etat"() {
    const cabinet = fs.existsSync(FICHIER) ? lireCabinet(FICHIER) : null;
    const e = etatRegistre(obligatoire("dossier-partage"), cabinet);
    console.log(`Registre ${e.id} · organisation ${e.organisation} · génération ${e.generation} · créé le ${e.cree_le.slice(0, 10)}${cabinet ? (e.signee_par_ce_cabinet ? " · signé par ce cabinet" : " · ⚠️ PAS signé par ce cabinet") : ""}`);
    console.log(`Séquestre : ${e.sequestre || "AUCUN — créez-le (sequestre-creer)"} · console : ${e.console ? "oui" : "non"} · journal : ${e.journal} événement(s)`);
    console.log(`Postes certifiés (${e.certifies.length}) :`); for (const p of e.certifies) console.log(`  ${p.poste}  ${p.utilisateur}  depuis le ${p.ajoute_le.slice(0, 10)}`);
    console.log(`En attente de certification (${e.en_attente.length}) :`); for (const p of e.en_attente) console.log(`  ${p.poste}  ${p.utilisateur}  empreinte ${p.empreinte}`);
    if (e.retires.length) console.log(`Retirés : ${e.retires.join(", ")}`);
  },

  async "poste-certifier"() {
    const c = await consoleRegistre();
    const posteId = obligatoire("poste");
    const fiche = lireFiche(c.partage, posteId);
    console.log(`Poste ${posteId} — ${fiche.utilisateur}
Empreinte : ${fiche.empreinte}`);
    console.log("Demandez au collaborateur de lire l'empreinte affichée dans son appli (menu Hidden Tokens → Registre). Elle doit être IDENTIQUE.");
    const ok = process.env.NANOMIZER_CONFIRMER === "oui" || /^o/i.test(await demander("Identique ? (oui/non) : "));
    if (!ok) { console.log("Certification annulée. Si les empreintes diffèrent, la fiche sur le partage n'est pas celle du collaborateur : prévenez-le."); process.exitCode = 2; return; }
    certifierPoste({ ...c, posteId });
    console.log(`Poste ${posteId} certifié : il reçoit le registre à son prochain démarrage (ou dans la minute).`);
  },

  async "poste-retirer"() {
    const c = await consoleRegistre();
    const posteId = obligatoire("poste");
    const reg = retirerPoste({ ...c, posteId });
    console.log(`Poste ${posteId} retiré. Génération ${reg.generation} : les autres postes reçoivent la nouvelle clé automatiquement.`);
    console.log("Ce poste ne lira plus rien de ce qui est codé désormais. Ce qu'il avait, il a pu le copier. Réimprimez la feuille de secours (feuille-secours).");
  },

  async "sequestre-creer"() {
    const c = await consoleRegistre();
    const noms = args("gardien");
    if (!noms.length) throw new Error("il manque --gardien \"Nom\" (1 à 4 fois)");
    const quorum = Number(arg("quorum", noms.length >= 2 ? 2 : 1));
    const gardiens = [];
    for (let i = 0; i < noms.length; i++) gardiens.push({ id: `g${i + 1}`, nom: noms[i], phrase: await phraseGardien(`g${i + 1}`) });
    const seq = creerSequestre({ organisation: c.cabinet.id, gardiens, quorum });
    const f = path.join(c.partage, "registre", FICHIER_SEQUESTRE);
    if (fs.existsSync(f)) throw new Error(`un séquestre existe déjà (${f}) : la rotation n'est pas dans cette version`);
    fs.writeFileSync(f, JSON.stringify(seq, null, 2) + "\n", { flag: "wx" });
    attacherSequestre({ ...c, cleId: seq.cle.id, publique: seq.cle.publique });
    console.log(`Séquestre ${seq.cle.id} créé : ${gardiens.map((g) => g.nom).join(", ")}, ouverture à ${quorum}. Chaque gardien garde sa phrase pour lui ; aucune phrase ne se récupère.`);
  },

  async "sequestre-ouvrir"() {
    const c = await consoleRegistre({ sansAdmin: true });
    const posteId = arg("poste", null);
    const pourConsole = process.argv.includes("--console");
    if (!posteId && !pourConsole) throw new Error("il faut --poste pst_… et/ou --console");
    const seq = JSON.parse(fs.readFileSync(path.join(c.partage, "registre", FICHIER_SEQUESTRE), "utf8"));
    const phrases = {};
    for (const g of seq.gardiens) { const ph = process.env[`NANOMIZER_PHRASE_${g.id}`] || (Object.keys(phrases).length < seq.quorum ? await demander(`Phrase de ${g.nom} (${g.id}) — Entrée pour passer : `, { cache: true }) : ""); if (ph) phrases[g.id] = ph; }
    const { privee, gardiens } = ouvrirSequestre(seq, phrases);
    const secrets = secretsSequestre(lireRegistre(c.partage), privee);
    let adminPublique = null;
    if (pourConsole) { const admin = fs.existsSync(FICHIER_REGISTRE_ADMIN) ? lireAdmin(FICHIER_REGISTRE_ADMIN) : (() => { const a = creerAdmin(c.cabinet, c.phraseCabinet); ecrireAdmin(FICHIER_REGISTRE_ADMIN, a); return a; })(); adminPublique = admin.reception.publique; }
    restaurerSecrets({ ...c, secrets, posteId, adminPublique, origine: "sequestre", gardiens });
    console.log(`Séquestre ouvert par ${gardiens.join(" + ")} ; secrets rescellés pour ${[posteId, pourConsole ? "la console" : null].filter(Boolean).join(" et ")}. Événement journalisé.`);
  },

  async "feuille-secours"() {
    const c = await consoleRegistre();
    const reg = lireRegistre(c.partage);
    const secrets = secretsAdmin(reg, c.adminPrivee);
    const html = pageFeuille(secrets, { organisation: c.cabinet.nom, registre: reg.id, generation: reg.generation });
    const sortie = arg("sortie");
    if (sortie) { fs.writeFileSync(sortie, html, { mode: 0o600, flag: "wx" }); console.log(`Feuille écrite : ${sortie} — imprimez-la, rangez-la au coffre, puis supprimez le fichier.`); }
    else { console.log(groupes(secrets).join(" ")); }
  },

  async restaurer() {
    const c = await consoleRegistre({ sansAdmin: true });
    const posteId = arg("poste", null);
    const pourConsole = process.argv.includes("--console");
    if (!posteId && !pourConsole) throw new Error("il faut --poste pst_… et/ou --console");
    const texte = process.env.NANOMIZER_FEUILLE || await demander("Recopiez les groupes de la feuille (HT1-…) : ");
    const secrets = lireGroupes(texte);
    let adminPublique = null;
    if (pourConsole) { const a = creerAdmin(c.cabinet, c.phraseCabinet); ecrireAdmin(FICHIER_REGISTRE_ADMIN, a); adminPublique = a.reception.publique; }
    restaurerSecrets({ ...c, secrets, posteId, adminPublique, origine: "feuille" });
    console.log("Feuille acceptée : secrets rescellés. Événement journalisé.");
  },

  async "registre-fusionner"() {
    const c = await consoleRegistre();
    fusionnerDoublon({ ...c, garde: obligatoire("garde"), alias: obligatoire("alias") });
    console.log(`${arg("alias")} devient un alias de ${arg("garde")} : les deux se décodent, seul ${arg("garde")} est attribué désormais.`);
  },

  /* Simule ce que fera le poste (contrôle de signature d'US-3), pour vérifier
     une installation sans attendre US-4. */
  async verifier() {
    const enr = JSON.parse(fs.readFileSync(obligatoire("enrolement"), "utf8"));
    const poste = importerEnrolement(enr);
    const d = obligatoire("dossier-partage");
    const r = verifierSignature(
      poste,
      fs.readFileSync(path.join(d, FICHIER_POLITIQUE)),
      fs.readFileSync(path.join(d, FICHIER_SIGNATURE)),
    );
    if (!r.ok) { console.log(`REFUSÉE (${r.etat}) : ${r.raison}`); process.exitCode = 2; return; }
    console.log(`OK : politique v${r.politique.version} de ${r.politique.cabinet.nom}, signée par la clé épinglée ${poste.cle.id}.`);
  },
};

const nom = process.argv[2];
if (!commandes[nom]) {
  console.error("Commandes : " + Object.keys(commandes).join(", ") + ". Voir l'en-tête de bin/nanomizer-admin.mjs.");
  process.exit(1);
}
try {
  await commandes[nom]();
} catch (e) {
  console.error(e instanceof PolitiqueInvalide ? e.message : `Erreur : ${e.message}`);
  process.exit(1);
}
