// ============================================================================
// CLIENT DE LA SENTINELLE HIDDEN TOKENS (cycle C2, v2.12) — la prise locale.
//
// La sentinelle est le processus résident qui tient les dossiers du cabinet
// et code chaque fichier dès son dépôt. Quand elle est là, le connecteur
// Claude Desktop ne doit plus écrire la clé lui-même : deux codages
// entremêlés sur la même clé sont le seul moyen de perdre une correspondance
// (NOM-001 réattribué). Ce module est le côté client de sa prise :
//
//   socket Unix <dir>/prise.sock (tube nommé sous Windows), jeton de jumelage
//   de 64 hex dans <dir>/jeton (0600), une ligne JSON par message :
//     → { id, jeton, methode, params }
//     ← { id, ok: true, resultat } | { id, ok: false, erreur }
//
// Le protocole qui fait foi est celui de sentinelle/lib/prise.js (dépôt
// Hidden Tokens). Zéro dépendance, zéro réseau : un processus qui n'est pas sur
// ce poste, sous ce compte, ne peut ni atteindre la prise ni lire le jeton.
// Le jeton est relu à CHAQUE appel : une sentinelle réinstallée ou lancée
// après Claude Desktop est jumelée sans redémarrer Claude. Il n'est jamais
// écrit par le connecteur (c'est la sentinelle qui le crée), ni cité dans
// un message.
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import readline from "node:readline";

/* Les outils que la prise laisse passer (sentinelle v0.1, OUTILS_AUTORISES).
   reinitialiser_cle n'y est pas, et n'y sera jamais : repartir d'une clé
   vierge est un acte du détenteur de la clé, pas d'une IA. */
export const OUTILS_PRISE = new Set([
  "lister_fichiers", "anonymiser_fichier", "anonymiser_dossier", "deanonymiser", "etat_cle",
  "journal_ia", "verifier_confinement", "lire_scan", "tableau_de_bord", "remettre_chiffres",
]);

/* Délais côté client : un lot ou un OCR peuvent être longs. Un délai dépassé
   est une erreur rendue à l'IA, jamais un passage en moteur local pour cet
   appel : la sentinelle est peut-être encore en train d'écrire la clé. */
export const DELAI_LONG_MS = 600_000;
export const DELAI_COURT_MS = 180_000;
const OUTILS_LONGS = new Set(["anonymiser_dossier", "lire_scan"]);
export function delaiPour(nom) { return OUTILS_LONGS.has(nom) ? DELAI_LONG_MS : DELAI_COURT_MS; }

/* Trois familles d'erreurs, parce que le connecteur n'y répond pas pareil :
   injoignable → moteur local ; refusée → l'erreur est rendue telle quelle
   (ou moteur local, au choix de l'appelant) ; délai → erreur à l'IA. */
export class PriseInjoignable extends Error {}
export class PriseRefus extends Error {}
export class PriseDelai extends Error {}

/* Le dossier de la sentinelle, comme sentinelle/lib/config.js le calcule :
   HIDDEN_TOKENS_SENTINELLE_DIR (ou l'ancienne NANOMIZER_SENTINELLE_DIR) prime,
   sinon « Hidden Tokens » dans le dossier de la plateforme — ou l'ancien
   « Nanomizer » tant qu'une sentinelle d'avant le renommage l'occupe seule.
   Le connecteur ne renomme rien : c'est la sentinelle qui migre son dossier. */
export function dossierSentinelle(env = process.env, platform = process.platform, home = os.homedir()) {
  const force = env.HIDDEN_TOKENS_SENTINELLE_DIR || env.NANOMIZER_SENTINELLE_DIR;
  if (force) return path.resolve(force);
  const base = platform === "darwin" ? path.join(home, "Library", "Application Support")
    : platform === "win32" ? (env.APPDATA || path.join(home, "AppData", "Roaming"))
    : (env.XDG_CONFIG_HOME || path.join(home, ".config"));
  const [neuf, ancien] = platform === "darwin" || platform === "win32" ? ["Hidden Tokens", "Nanomizer"] : ["hidden-tokens", "nanomizer"];
  if (!fs.existsSync(path.join(base, neuf)) && fs.existsSync(path.join(base, ancien))) return path.join(base, ancien);
  return path.join(base, neuf);
}

export function cheminPrise(dir, platform = process.platform) {
  if (platform === "win32") {
    const h = crypto.createHash("sha256").update(dir).digest("hex").slice(0, 12);
    return `\\\\.\\pipe\\nanomizer-sentinelle-${h}`;
  }
  return path.join(dir, "prise.sock");
}

/* Lecture SEULE du jeton : null s'il manque ou n'a pas la forme attendue.
   Le connecteur ne fabrique jamais de jeton — ce serait jumeler une prise
   qui n'existe pas. */
export function lireJeton(dir) {
  try {
    const j = fs.readFileSync(path.join(dir, "jeton"), "utf8").trim();
    return /^[0-9a-f]{64}$/.test(j) ? j : null;
  } catch { return null; }
}

/* Un appel : une connexion, une ligne écrite, une ligne lue, fermeture. */
export function appelerPrise({ chemin, jeton, methode, params = {}, delai = DELAI_COURT_MS }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(chemin);
    const id = crypto.randomUUID();
    let fini = false;
    const terminer = (fn, v) => { if (fini) return; fini = true; clearTimeout(minuteur); try { socket.destroy(); } catch {} fn(v); };
    const minuteur = setTimeout(() => terminer(reject, new PriseDelai(`la sentinelle n'a pas répondu (${methode}, ${Math.round(delai / 1000)} s)`)), delai);
    socket.setEncoding("utf8");
    // Avant la connexion, l'erreur typique est ENOENT / ECONNREFUSED : la
    // prise n'est pas là. Après, c'est une sentinelle qui s'est arrêtée au
    // milieu de l'appel : injoignable aussi.
    socket.on("error", (e) => terminer(reject, new PriseInjoignable(`sentinelle injoignable (${(e && e.code) || "erreur de prise"})`)));
    socket.on("close", () => terminer(reject, new PriseInjoignable("sentinelle injoignable (connexion fermée sans réponse)")));
    socket.once("connect", () => {
      const rl = readline.createInterface({ input: socket });
      rl.on("error", () => {});
      rl.once("line", (l) => {
        let rep;
        try { rep = JSON.parse(l); } catch { return terminer(reject, new PriseRefus("réponse de la sentinelle illisible")); }
        if (rep && rep.ok) return terminer(resolve, rep.resultat);
        terminer(reject, new PriseRefus((rep && rep.erreur) || "erreur de la sentinelle"));
      });
      socket.write(JSON.stringify({ id, jeton, methode, params }) + "\n");
    });
  });
}

/* Le client tel que le connecteur s'en sert : il redécouvre dossier, prise et
   jeton à chaque appel (un connect local coûte moins d'une milliseconde). */
export function creerClientSentinelle({ env = process.env, platform = process.platform } = {}) {
  const dir = () => dossierSentinelle(env, platform);
  async function appeler(methode, params = {}, { delai = DELAI_COURT_MS } = {}) {
    const d = dir();
    const jeton = lireJeton(d);
    if (!jeton) throw new PriseInjoignable("sentinelle injoignable (pas de jeton de jumelage sur ce poste)");
    return appelerPrise({ chemin: cheminPrise(d, platform), jeton, methode, params, delai });
  }
  return {
    get dossier() { return dir(); },
    get chemin() { return cheminPrise(dir(), platform); },
    appeler,
    ping: (delai = 3_000) => appeler("ping", {}, { delai }),
    etat: (delai = 5_000) => appeler("etat", {}, { delai }),
    outil: ({ dossier, nom, args = {} }) => appeler("outil", { dossier, nom, args }, { delai: delaiPour(nom) }),
  };
}

/* Deux chemins désignent-ils le même dossier ? Résolus et, quand le disque
   le permet, ramenés au chemin réel (/tmp → /private/tmp sur macOS). */
export function memeDossier(a, b) {
  const reel = (p) => { const r = path.resolve(String(p || "")); try { return fs.realpathSync.native(r); } catch { return r; } };
  if (!a || !b) return false;
  const ra = reel(a), rb = reel(b);
  if (ra === rb) return true;
  return platformInsensible() && ra.toLowerCase() === rb.toLowerCase();
}
function platformInsensible() { return process.platform === "win32" || process.platform === "darwin"; }

/* Cette sentinelle tient-elle ce dossier de travail ? → { tenue, version, raison } */
export async function sonderSentinelle(client, workdir) {
  let pong;
  try { pong = await client.ping(); }
  catch (e) { return { tenue: false, version: null, raison: e instanceof PriseInjoignable ? "absente" : `prise refusée : ${e.message}` }; }
  const version = pong && pong.version ? String(pong.version) : "?";
  let etat;
  try { etat = await client.etat(); }
  catch (e) { return { tenue: false, version, raison: `état illisible : ${e.message}` }; }
  const dossiers = Array.isArray(etat && etat.dossiers) ? etat.dossiers : [];
  const tenue = dossiers.some((d) => memeDossier(d && d.chemin, workdir));
  return { tenue, version, raison: tenue ? "" : "ne tient pas ce dossier" };
}
