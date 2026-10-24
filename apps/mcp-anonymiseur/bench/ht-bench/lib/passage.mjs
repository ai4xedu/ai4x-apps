// HT-BENCH — un jeu de documents à travers le moteur Hidden Tokens : un
// connecteur par configuration de packs, chaque document réaligné et noté.
// Partagé par evaluer.mjs (le banc) et comparer.mjs (Hidden Tokens face à
// un autre outil, mêmes règles de score).
import { ouvrirMoteur } from "./moteur.mjs";
import { aligner } from "./alignement.mjs";
import { evaluerDocument } from "./score.mjs";

export async function noterHiddenTokens(docs) {
  const groupes = new Map();
  for (const d of docs) {
    const k = JSON.stringify(d.packs);
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(d);
  }
  const resultats = [];
  const erreurs = [];
  for (const [k, liste] of groupes) {
    const moteur = await ouvrirMoteur(JSON.parse(k));
    try {
      for (const d of liste) {
        const { code, cle, vu } = await moteur.coder(d.texte);
        let al;
        try { al = aligner(d.texte, code, cle); }
        catch (e) { erreurs.push(`${d.id} : ${e.message}`); continue; }
        resultats.push({ id: d.id, pack: d.pack, code, imbrique: al.imbrique, ...evaluerDocument(d, al.segments, vu) });
      }
    } finally { await moteur.fermer(); }
  }
  // Même ordre que le jeu, quel que soit le regroupement par packs.
  const rang = new Map(docs.map((d, i) => [d.id, i]));
  resultats.sort((a, b) => rang.get(a.id) - rang.get(b.id));
  return { resultats, erreurs };
}
