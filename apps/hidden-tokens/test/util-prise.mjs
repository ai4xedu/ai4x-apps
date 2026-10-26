// Une FAUSSE sentinelle pour les tests : la prise locale telle que
// sentinelle/lib/prise.js (dépôt Nanomizer) la sert — socket Unix (tube nommé
// sous Windows), jeton de 64 hex dans <dir>/jeton, une ligne JSON par message.
// Elle ne code rien : elle note ce qu'on lui demande et répond ce qu'on lui
// a dit de répondre. Zéro dépendance, comme la vraie.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { cheminPrise } from "../server/sentinelle.js";

export function ecrireJeton(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const jeton = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(path.join(dir, "jeton"), jeton + "\n", { mode: 0o600 });
  return jeton;
}

/* { dir, dossiers: [chemins tenus], version, outil(params) → { texte, erreur } }
   → { chemin, jeton, appels: [...], demarrer(), arreter(), dossiers } */
export function fausseSentinelle({ dir, dossiers = [], version = "0.1.0", outil } = {}) {
  const jeton = ecrireJeton(dir);
  const chemin = cheminPrise(dir);
  const appels = [];
  const etat = { dossiers: [...dossiers] };
  const repondreOutil = outil || (({ nom }) => ({ texte: `✓ ${nom} codé par la sentinelle`, erreur: false }));
  const branches = new Set();
  const serveur = net.createServer((socket) => {
    branches.add(socket);
    socket.on("close", () => branches.delete(socket));
    socket.on("error", () => {});
    socket.setEncoding("utf8");
    const rl = readline.createInterface({ input: socket });
    rl.on("line", async (ligne) => {
      const repondre = (msg) => { try { socket.write(JSON.stringify(msg) + "\n"); } catch {} };
      let req;
      try { req = JSON.parse(ligne); } catch { return repondre({ id: null, ok: false, erreur: "JSON illisible" }); }
      const id = req.id ?? null;
      if (req.jeton !== jeton) return repondre({ id, ok: false, erreur: "jeton de jumelage refusé" });
      appels.push({ methode: req.methode, params: req.params || {} });
      try {
        switch (req.methode) {
          case "ping": return repondre({ id, ok: true, resultat: { version, nom: "nanomizer-sentinelle" } });
          case "etat": return repondre({ id, ok: true, resultat: { version, dossiers: etat.dossiers.map((chemin) => ({ chemin, codes: 0 })) } });
          case "outil": {
            const p = req.params || {};
            if (p.nom === "reinitialiser_cle") throw new Error(`outil non autorisé par la prise : ${p.nom}`);
            if (!etat.dossiers.includes(p.dossier)) throw new Error(`dossier non surveillé : ${p.dossier}`);
            return repondre({ id, ok: true, resultat: await repondreOutil(p) });
          }
          default: throw new Error(`méthode inconnue : ${req.methode}`);
        }
      } catch (e) { repondre({ id, ok: false, erreur: e.message }); }
    });
  });
  return {
    chemin, jeton, appels, dossiers: etat.dossiers,
    demarrer() {
      return new Promise((resolve, reject) => {
        if (process.platform !== "win32" && fs.existsSync(chemin)) { try { fs.unlinkSync(chemin); } catch {} }
        serveur.once("error", reject);
        serveur.listen(chemin, () => { serveur.off("error", reject); resolve(chemin); });
      });
    },
    arreter() {
      return new Promise((resolve) => {
        serveur.close(() => { if (process.platform !== "win32") { try { fs.unlinkSync(chemin); } catch {} } resolve(); });
        for (const s of branches) s.destroy();
      });
    },
  };
}
