// ============================================================================
// HT-BENCH — le moteur, par le VRAI chemin : le connecteur lancé comme Claude
// Desktop le lance (stdio MCP), anonymiser_fichier sur un .md (codeFreeText :
// moteur, puis verrou — le même que coder_texte et qu'un PDF), un pack activé
// par reglages.json comme dans l'appli. Aucune connexion réseau : le
// serveur est un processus local, la licence est signée par la clé de TEST.
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { mint } from "../../../test/licence-test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..", "..");
export const MARQUE = "⟦HIDDEN-TOKENS:TEXTE-CODE⟧";

/* Un connecteur par configuration de packs : un dossier de travail jetable,
   ses réglages, sa clé. La clé est remise à zéro avant chaque document
   (reinitialiser_cle) : un document ne profite pas des codes d'un autre. */
export async function ouvrirMoteur(packs) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ht-bench-"));
  const workdir = path.join(base, "dossier");
  const outdir = path.join(workdir, "Hidden-Tokens");
  fs.mkdirSync(outdir, { recursive: true });
  fs.writeFileSync(path.join(outdir, "reglages.json"), JSON.stringify({ chiffres: "clair", packs }));
  const client = new Client({ name: "ht-bench", version: "0.1.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [path.join(root, "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_TEAM_DIR: "", ANX_REGISTRE_DIR: "", ANX_ENROLEMENT: "", ANX_SENTINELLE: "non",
      NANOMIZER_SENTINELLE_DIR: path.join(base, ".absente"),
      ANX_LICENCE: mint({ v: 1, org: "HT-Bench", seats: 1, iat: "2026-10-24", exp: "9999-12-31", life: true }) },
    stderr: "ignore",
  }));
  const texte = (res) => res.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
  const appeler = async (name, args) => {
    const res = await client.callTool({ name, arguments: args });
    return { t: texte(res), erreur: !!res.isError };
  };
  /* Un fichier déposé dans le dossier de travail, anonymisé (confirmer:
     true), la sortie relue. La clé est remise à zéro avant. */
  const fichier = async (nom, contenu, args = {}) => {
    await appeler("reinitialiser_cle", { confirmer: true });
    for (const n of fs.readdirSync(outdir)) if (/-anonymise\.(md|docx|xlsx)$/.test(n)) fs.rmSync(path.join(outdir, n));
    const src = path.join(workdir, nom);
    fs.writeFileSync(src, contenu);
    const r = await appeler("anonymiser_fichier", { nom_fichier: nom, confirmer: true, ...args });
    fs.rmSync(src);
    // Un .docx donne aussi un *-anonymise.md (le texte extrait) : on lit la
    // sortie du même format que l'entrée.
    const ext = path.extname(nom);
    const produit = fs.readdirSync(outdir).filter((n) => n.endsWith(`-anonymise${ext}`));
    if (produit.length > 1) throw new Error(`anonymiser_fichier a produit ${produit.length} fichiers`);
    const fc = path.join(outdir, "cle-de-session.json");
    const cle = fs.existsSync(fc) ? JSON.parse(fs.readFileSync(fc, "utf8")).entries : [];
    return {
      sortie: produit.length ? fs.readFileSync(path.join(outdir, produit[0])) : null,
      cle: Object.fromEntries(cle.map((e) => [e.code, e.value])),
      refus: produit.length ? "" : r.t,
    };
  };
  return {
    /* Un document → { code, cle, vu } :
       code = le fichier *-anonymise.md écrit par anonymiser_fichier (ce que
              produit le moteur, AVANT le verrou de sortie) ;
       cle  = code → valeur, pour CE document seul (clé remise à zéro) ;
       vu   = la réponse de coder_texte sur le même texte, verrou de sortie
              compris : ce que l'IA lirait. */
    async coder(contenu) {
      const { sortie, cle, refus } = await fichier("document.md", contenu);
      let code;
      if (sortie) {
        code = sortie.toString("utf8");
        // handlePlainText ajoute un saut de ligne final s'il manque.
        if (!contenu.endsWith("\n") && code.endsWith("\n")) code = code.slice(0, -1);
      } else if (/Rien à coder/.test(refus)) {
        code = contenu;
      } else {
        throw new Error(`anonymiser_fichier n'a pas produit de fichier : ${refus.slice(0, 400)}`);
      }
      const v = await appeler("coder_texte", { contenu, source: "ht-bench" });
      const i = v.t.indexOf(MARQUE);
      const vu = i >= 0 ? v.t.slice(i + MARQUE.length + 1) : v.t;
      return { code, cle, vu };
    },
    /* Un .docx ou un .xlsx → { sortie (Buffer du *-anonymise.*, ou null),
       cle, refus (le message d'erreur s'il n'y a pas de sortie) }.
       args : les options d'anonymiser_fichier (mode pour un classeur). */
    async coderFichier(nom, buf, args = {}) {
      return fichier(nom, buf, args);
    },
    async fermer() {
      await client.close();
      fs.rmSync(base, { recursive: true, force: true });
    },
  };
}
