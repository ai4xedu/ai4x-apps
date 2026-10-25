// HT-BENCH — le rapport Markdown (resultats/RAPPORT.md). Données
// synthétiques : les valeurs manquées peuvent y être citées en clair.
const pct = (x) => (x === null || x === undefined ? "—" : `${(100 * x).toFixed(1)} %`);
const cible = (x) => (x === null ? "—" : x >= 0.99 ? "✅" : "❌");
const md = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

export function rapportMarkdown(r) {
  const L = [];
  L.push(`# HT-Bench ${r.version_jeu}${r.split && r.split !== "dev" ? ` (jeu ${r.split})` : ""} — rapport de détection`, "");
  L.push(`Moteur Hidden Tokens **v${r.version_moteur}** · jeu \`${r.jeu_sha256.slice(0, 16)}…\` (synthétique, graine fixe) · ${r.documents} documents · ${r.global.tous.n} valeurs à coder · ${r.global.leurres.n} leurres.`, "");
  L.push(`Chemin mesuré : ${r.chemin}. Une valeur compte comme détectée si toutes ses lettres et chiffres sont sous un code (les particules d'un nom — Ben, El, Aït, de… — peuvent rester en clair). Une valeur codée en partie est une fuite : elle compte comme manquée. Définitions complètes : \`bench/ht-bench/README.md\`.`, "");
  L.push(`**Identifiants directs (noms, pièces et identifiants, téléphones, e-mails, IBAN/RIB, IMEI/IMSI) : ${pct(r.global.direct.rappel)}** (${r.global.direct.detectes}/${r.global.direct.n}) — cible ≥ 99 % par pack.`, "");

  const vs = r.verrou_de_sortie;
  L.push(`Verrou de sortie : sur ${vs.manques_directs} identifiant(s) direct(s) manqué(s) ou partiel(s) par le moteur, ${vs.manques_directs_vus_par_ia} resteraient lisibles dans la réponse de coder_texte (le reste est rattrapé par le dernier filet, « [MASQUÉ] » / « ••• » — mais le fichier écrit sur le poste, lui, les contient).`, "");
  L.push("## Par pack", "");
  L.push("| Pack | Docs | Rappel direct | Cible | Rappel (tout) | Précision | F1 | Leurres codés | « ••• » en sortie |");
  L.push("|---|---:|---:|:-:|---:|---:|---:|---:|---:|");
  for (const [p, v] of Object.entries(r.par_pack)) {
    L.push(`| ${p} | ${v.documents} | ${pct(v.direct.rappel)} (${v.direct.detectes}/${v.direct.n}) | ${cible(v.direct.rappel)} | ${pct(v.tous.rappel)} | ${pct(v.precision)} | ${pct(v.f1)} | ${v.leurres.codes}/${v.leurres.n} (${pct(v.leurres.taux_faux_positifs)}) | ${vs.masquages_par_pack[p] || 0} |`);
  }
  L.push("", "Précision du pack = passages codés qui recouvrent une valeur étiquetée / tous les passages codés : le verrou code tout mot inconnu du lexique, un mot courant codé à tort la fait baisser (cf. « Codé hors étiquette »). « ••• » en sortie : passages masqués par le verrou de sortie dans la réponse de coder_texte (souvent un code déjà posé que le motif d'un pack reconnaît à nouveau : l'IA ne peut plus le citer).", "");

  if (r.documents_imbriques.length) {
    const parPack = {};
    for (const id of r.documents_imbriques) { const p = id.split("/")[0]; parPack[p] = (parPack[p] || 0) + 1; }
    L.push(`**Sortie corrompue : ${r.documents_imbriques.length} document(s)** dont le texte codé n'est plus « l'origine + des codes » (codes imbriqués comme \`NOM-001-002\`, morceau de mot recodé) — ${Object.entries(parPack).map(([p, n]) => `${p} : ${n}`).join(", ")}. La valeur est protégée, mais le décodage ne rend pas le texte d'origine. Ces documents sont notés par plus longue sous-suite commune (cf. README).`, "");
  }
  const sansAR = r.documents_sans_aller_retour || [];
  L.push(sansAR.length
    ? `**Aller-retour : ❌ ${sansAR.length} document(s)** ne se décodent pas en l'origine : ${sansAR.map((id) => `\`${id}\``).join(", ")}. La CI (\`bench:ht:controle\`) échoue.`
    : `**Aller-retour : ✅** les ${r.documents} documents, décodés avec leur clé, rendent le texte d'origine (aucun code imbriqué, aucun morceau de mot recodé).`, "");
  L.push("## Les cinq plus gros écarts (identifiants directs)", "");
  L.push("| # | Type · écriture | Perdues | Rappel |", "|---:|---|---:|---:|");
  r.plus_gros_ecarts.forEach((e, i) => L.push(`| ${i + 1} | ${md(e.cle)} | ${e.perdues}/${e.n} (dont ${e.partiels} partielles) | ${pct(e.rappel)} |`));
  L.push("");

  L.push("## Par type d'entité", "");
  L.push("| Type | Direct | Valeurs | Rappel | Partielles | Précision | F1 | Bon préfixe |");
  L.push("|---|:-:|---:|---:|---:|---:|---:|---:|");
  for (const [t, v] of Object.entries(r.par_type)) {
    L.push(`| ${t} — ${v.libelle} | ${v.direct ? "oui" : ""} | ${v.n} | ${pct(v.rappel)} | ${v.partiels} | ${pct(v.precision)} (${v.passages_justes}/${v.passages}) | ${pct(v.f1)} | ${v.bien_etiquetes}/${v.detectes} |`);
  }
  L.push("", "Précision(type) = passages codés sous un préfixe de ce type qui recouvrent bien une valeur de ce type. « Bon préfixe » : parmi les valeurs détectées, celles codées sous un préfixe attendu (une valeur codée REF au lieu de SIRET est protégée, mais mal nommée).", "");

  L.push("## Rappel direct, pack × type", "");
  const types = [...new Set(Object.values(r.par_pack).flatMap((v) => Object.keys(v.direct_par_type)))].sort();
  L.push(`| Pack | ${types.join(" | ")} |`, `|---|${types.map(() => "---:").join("|")}|`);
  for (const [p, v] of Object.entries(r.par_pack)) {
    L.push(`| ${p} | ${types.map((t) => { const c = v.direct_par_type[t]; return c ? `${pct(c.rappel)} (${c.n})` : ""; }).join(" | ")} |`);
  }
  L.push("");

  L.push("## Par écriture", "");
  L.push("| Type · écriture | Direct | Valeurs | Rappel | Partielles |", "|---|:-:|---:|---:|---:|");
  for (const [k, v] of Object.entries(r.par_variante)) L.push(`| ${md(k)} | ${v.direct ? "oui" : ""} | ${v.n} | ${pct(v.rappel)} | ${v.partiels} |`);
  L.push("");
  L.push("## Par trait (noms)", "");
  L.push("| Type · trait | Valeurs | Rappel | Partielles |", "|---|---:|---:|---:|");
  for (const [k, v] of Object.entries(r.par_trait)) L.push(`| ${md(k)} | ${v.n} | ${pct(v.rappel)} | ${v.partiels} |`);
  L.push("");

  L.push("## Leurres (doivent rester lisibles)", "");
  L.push("| Leurre | Nombre | Codés à tort | Taux |", "|---|---:|---:|---:|");
  for (const [k, v] of Object.entries(r.par_leurre)) L.push(`| ${k} — ${v.libelle} | ${v.n} | ${v.codes} | ${pct(v.taux)} |`);
  L.push("");

  const manques = [...r.manques].sort((a, b) => Number(b.direct) - Number(a.direct) || a.type.localeCompare(b.type) || a.doc.localeCompare(b.doc));
  L.push(`## Valeurs manquées ou partielles (${manques.length})`, "");
  L.push("| Document | Type | Écriture | Valeur (synthétique) | Statut | Resté en clair | Vu par l'IA | Préfixes posés |", "|---|---|---|---|---|---|:-:|---|");
  for (const m of manques) L.push(`| ${m.doc} | ${m.type}${m.direct ? "" : " (indirect)"} | ${md(m.variante)}${m.traits.length ? ` · ${m.traits.join(", ")}` : ""} | \`${md(m.valeur)}\` | ${m.statut} | ${md(m.en_clair.join(" "))} | ${m.vu_par_ia ? "oui" : "non"} | ${m.prefixes.join(", ")} |`);
  L.push("");

  L.push(`## Leurres codés à tort (${r.faux_positifs.length})`, "");
  L.push("| Document | Leurre | Valeur | Préfixes |", "|---|---|---|---|");
  for (const f of r.faux_positifs) L.push(`| ${f.doc} | ${f.type}${f.variante ? ` · ${f.variante}` : ""} | \`${md(f.valeur)}\` | ${f.prefixes.join(", ")} |`);
  L.push("");

  const he = r.hors_etiquette;
  L.push(`## Codé hors étiquette (${he.reduce((n, x) => n + x.n, 0)} passages, ${he.length} distincts — 40 plus fréquents)`, "");
  L.push("Ni une valeur étiquetée, ni un leurre : surtout des mots du gabarit que le verrou ne connaît pas. Sur-coder est sûr, mais rend le texte moins utile à l'IA.", "");
  L.push("| Passage | Fois |", "|---|---:|");
  for (const x of he.slice(0, 40)) L.push(`| ${md(x.passage)} | ${x.n} |`);
  L.push("");
  return L.join("\n");
}
