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

const DOSSIER = process.env.NANOMIZER_ADMIN_DIR || path.join(os.homedir(), ".nanomizer-admin");
const FICHIER = path.join(DOSSIER, FICHIER_CABINET);

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
