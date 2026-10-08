// VERROU (v2.0) — les règles du codage fail-closed, cas par cas, plus le
// verrou de sortie et l'audit de confinement.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { strictCode, isKnownWord, lexiconSize, codedRatio } from "../server/verrou.js";
import { newCodebook, codeFor } from "../server/engine.js";
import { guardText, guardResult, MASK } from "../server/sortie.js";
import { auditConfinement, cloudSync, overlaps } from "../server/confinement.js";

const code = (s, book = newCodebook(), opts = {}) => strictCode(s, { book, ...opts }).text;
const CODE = /\b[A-Z]+-\d{3}\b/;

test("dictionnaire chargé, insensible aux accents", () => {
  assert.ok(lexiconSize() > 300000);
  assert.ok(isKnownWord("échéance") && isKnownWord("ECHEANCE") && isKnownWord("echeance"));
  assert.ok(isKnownWord("sous-traitant"));
  assert.ok(!isKnownWord("Benali"));
});

test("un nom écrit normalement, au fil d'une phrase, est codé (le trou de la v1.6)", () => {
  const out = code("Maître Dupont représente M. Karim Benali contre la société Atlas Négoce SARL.");
  for (const v of ["Dupont", "Karim", "Benali", "Atlas", "Négoce"]) assert.ok(!out.includes(v), `${v} en clair : ${out}`);
  // Les titres restent : ils portent le sens (« Maître », « M. »).
  assert.match(out, /^Maître NOM-\d{3} représente M\. PRENOM-\d{3} NOM-\d{3} contre la société SOCIETE-\d{3}\.$/);
});

test("les noms qui sont AUSSI des mots : codés derrière un titre, un libellé, un prénom", () => {
  assert.doesNotMatch(code("Le demandeur, M. Petit, conteste."), /Petit/);
  assert.doesNotMatch(code("Condamne Mme Rousseau aux dépens."), /Rousseau/);
  assert.doesNotMatch(code("Client : Rousseau"), /Rousseau/);
  assert.doesNotMatch(code("Pierre Blanc a signé."), /Pierre|Blanc/);
  assert.doesNotMatch(code("Blanc a ensuite contesté."), /Blanc/);
  assert.doesNotMatch(code("rdv avec pierre rousseau lundi"), /pierre|rousseau/);
  assert.doesNotMatch(code("Madame la Juge a entendu Jean-Pierre El Amrani et K. Tazi."), /Jean-Pierre|Amrani|Tazi|K\./);
});

test("les termes définis d'un contrat restent lisibles", () => {
  const s = "Le présent Contrat a pour objet de définir les conditions dans lesquelles le Prestataire fournit au " +
    "Client les Services décrits en Annexe 1. Les Parties conviennent que les Informations Confidentielles ne " +
    "pourront être divulguées sans l'accord préalable écrit de l'autre Partie. Le Contrat prend effet à la Date d'Effet.";
  assert.equal(code(s), s);
});

test("la langue du droit reste lisible : juridictions, intitulés, villes, montants, dates", () => {
  const s = "PAR CES MOTIFS, le Tribunal de commerce de Casablanca condamne la défenderesse à payer 12 500,00 Dhs " +
    "le 15 octobre 2026 devant la Cour d'appel de Rabat (Cass. soc., 27 septembre 2007).";
  assert.equal(code(s), s);
});

test("identifiants : email entier, téléphones MA/FR, IBAN, ICE non pris pour un téléphone, n° de dossier", () => {
  const b = newCodebook();
  const out = code("Joindre karim.benali@gmail.com ou 06 12 34 56 78, IBAN FR76 3000 6000 0112 3456 7890 189, " +
    "ICE 001234567000089, dossier RG 2024/01234, facture FAC-2026-0142, SIRET 123 456 789 00012.", b);
  for (const v of ["karim", "benali", "06 12", "FR76", "001234567000089", "2024/01234", "FAC-2026", "123 456 789"]) {
    assert.ok(!out.includes(v), `${v} en clair : ${out}`);
  }
  assert.match(out, /EMAIL-\d{3}/);
  assert.match(out, /ICE-\d{3}/);
  assert.ok(!b.entries.some((e) => e.code.startsWith("TEL") && e.value.includes("001234567000089")), "ICE pris pour un téléphone");
});

test("les dates, montants, ordinaux et unités ne sont PAS des identifiants", () => {
  const s = "Le 12/03/2024, 1er janvier, 3 250,00 MAD HT, TVA 20 %, 24h/24, format A4, T3 2026, 5 kg.";
  assert.equal(code(s), s);
});

test("même entité = même code, d'une phrase et d'un fichier à l'autre", () => {
  const b = newCodebook();
  const a = code("M. Karim Benali a signé.", b);
  const c = code("BENALI Karim conteste.", b);
  const n1 = a.match(/NOM-\d{3}/)[0];
  const p1 = a.match(/PRENOM-\d{3}/)[0];
  assert.ok(c.includes(n1) && c.includes(p1), `${a} / ${c}`);
  // Société : l'alias sans forme juridique reçoit le même code.
  const s1 = code("La société Transports Moreau & Fils SAS conteste.", b).match(/SOCIETE-\d{3}/)[0];
  assert.ok(code("Transports Moreau & Fils a payé.", b).includes(s1));
});

test("valeurs connues de la clé : réutilisées, même hors de leur colonne d'origine", () => {
  const b = newCodebook();
  codeFor(b, "nom", "El Amrani");
  assert.equal(code("Appeler M. El Amrani demain.", b), "Appeler M. NOM-001 demain.");
});

test("valeurs_a_exclure : gardées en clair, et seulement elles", () => {
  const out = code("TARDIGRADE et Benali", newCodebook(), { excludes: ["TARDIGRADE"] });
  assert.match(out, /^TARDIGRADE et NOM-\d{3}$/);
});

test("mode masque : rien n'entre dans la clé", () => {
  const b = newCodebook();
  const r = strictCode("Dossier Benali - conclusions.pdf", { book: b, mask: true });
  assert.equal(r.text, "Dossier ••• - conclusions.pdf");
  assert.equal(b.entries.length, 0);
});

test("idempotence : un texte codé repassé au verrou n'a plus rien à coder (base du contrôle d'aperçu)", () => {
  const b = newCodebook();
  const once = code("Madame Sophie Lefèvre, née le 12 mars 1975, demeurant 8 avenue Jean Jaurès, a pour avocat Maître Antoine Garnier.", b);
  assert.equal(strictCode(once, { mask: true }).replaced, 0, once);
});

test("texte non français : codé presque entièrement, et on le mesure pour le dire", () => {
  const s = "The Supplier shall indemnify the Customer against all losses arising from any breach.";
  assert.ok(codedRatio(s, code(s)) > 0.35);
});

test("mots inconnus en minuscules : codés (fail-closed)", () => {
  assert.doesNotMatch(code("rappeler benali demain"), /benali/);
  assert.match(code("rappeler benali demain"), /^rappeler (?:NOM|CODE)-\d{3} demain$/);
});

/* --------------------------------------------------- verrou de sortie ---- */

test("sortie : une valeur connue de la clé redevient son code, partout (chemins, erreurs…)", () => {
  const book = newCodebook();
  codeFor(book, "nom", "Benali");
  codeFor(book, "email", "karim.benali@gmail.com");
  const g = guardText("Fichier introuvable : Dossier Benali.pdf — contact karim.benali@gmail.com — BENALI", { book });
  assert.ok(!/benali/i.test(g.text), g.text);
  assert.match(g.text, /NOM-001/);
});

test("sortie : formes sensibles masquées, codes et liens Ai4x intacts", () => {
  const g = guardText(
    "Tél 06 61 23 45 67, +33 6 12 34 56 78, IBAN FR76 3000 6000 0112 3456 7890 189, CIN BE123456, " +
    "compte 00781000012345678. Codes NOM-001 TEL-002. Achat : https://wa.me/212680092567?text=Bonjour " +
    "ou +212 680 092 567 — appli https://ai4x.academy/anonymiseur-donnees. Rapport rapport-lot-2026-09-18-21-30.md",
    {}
  );
  for (const v of ["06 61", "+33 6", "FR76", "BE123456", "00781000012345678"]) assert.ok(!g.text.includes(v), `${v} : ${g.text}`);
  for (const v of ["NOM-001", "TEL-002", "https://wa.me/212680092567?text=Bonjour", "+212 680 092 567",
    "https://ai4x.academy/anonymiseur-donnees", "rapport-lot-2026-09-18-21-30.md"]) {
    assert.ok(g.text.includes(v), `${v} abîmé : ${g.text}`);
  }
  assert.equal(g.masked, 5);
});

test("sortie : le dossier personnel devient « ~ », et un masquage est signalé au modèle", () => {
  const res = guardResult({ content: [{ type: "text", text: "Écrit dans /Users/karim.benali/Documents — tél 0661234567" }] },
    { home: "/Users/karim.benali" });
  const all = res.content.map((c) => c.text).join("\n");
  assert.ok(!all.includes("karim.benali"));
  assert.match(all, /~\/Documents/);
  assert.match(all, new RegExp(`Verrou de sortie : 1 élément`));
  assert.match(all, new RegExp(MASK.replace(/[[\]]/g, "\\$&")));
});

/* ------------------------------------------------ audit de confinement --- */

function fakeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "anx-home-"));
  const claude = path.join(home, "Library", "Application Support", "Claude");
  fs.mkdirSync(path.join(claude, "Claude Extensions Settings"), { recursive: true });
  fs.mkdirSync(path.join(claude, "Claude Extensions", "ant.dir.ant.anthropic.filesystem"), { recursive: true });
  fs.mkdirSync(path.join(home, "Documents", "Cabinet"), { recursive: true });
  return { home, claude };
}

test("confinement : une extension Filesystem qui voit le dossier est un RISQUE nommé", () => {
  const { home, claude } = fakeHome();
  const workdir = path.join(home, "Documents", "Cabinet");
  fs.writeFileSync(path.join(claude, "Claude Extensions", "ant.dir.ant.anthropic.filesystem", "manifest.json"),
    JSON.stringify({ display_name: "Filesystem" }));
  fs.writeFileSync(path.join(claude, "Claude Extensions Settings", "ant.dir.ant.anthropic.filesystem.json"),
    JSON.stringify({ isEnabled: true, userConfig: { allowed_directories: [path.join(home, "Documents")] } }));
  fs.writeFileSync(path.join(claude, "Claude Extensions Settings", "local.mcpb.ai4x.anonymiseur-ai4x.json"),
    JSON.stringify({ isEnabled: true, userConfig: { dossier_travail: workdir } }));
  fs.writeFileSync(path.join(claude, "claude_desktop_config.json"), JSON.stringify({
    mcpServers: { fs2: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", workdir] } },
    coworkUserFilesPath: path.join(home, "Documents"),
  }));
  const a = auditConfinement({ workdir, home, platform: "darwin", keyFiles: [] });
  const txt = a.findings.map((f) => `${f.level}: ${f.text}`).join("\n");
  assert.equal(a.risks, 3, txt);
  assert.match(txt, /Filesystem/);
  assert.match(txt, /fs2/);
  assert.match(txt, /Cowork/);
  // L'anonymiseur lui-même n'est jamais compté comme une fuite.
  assert.doesNotMatch(txt, /anonymiseur/i);

  // Extension désactivée ou dossier disjoint : plus de risque.
  fs.writeFileSync(path.join(claude, "Claude Extensions Settings", "ant.dir.ant.anthropic.filesystem.json"),
    JSON.stringify({ isEnabled: false, userConfig: { allowed_directories: [path.join(home, "Documents")] } }));
  fs.writeFileSync(path.join(claude, "claude_desktop_config.json"), JSON.stringify({}));
  assert.equal(auditConfinement({ workdir, home, platform: "darwin", keyFiles: [] }).risks, 0);
  fs.rmSync(home, { recursive: true, force: true });
});

test("confinement : un dossier synchronisé (iCloud Bureau et Documents, Google Drive…) est repéré", () => {
  const { home } = fakeHome();
  const workdir = path.join(home, "Documents", "Cabinet");
  assert.equal(cloudSync(workdir, { home, platform: "darwin" }), "");
  fs.mkdirSync(path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs", "Documents"), { recursive: true });
  assert.match(cloudSync(workdir, { home, platform: "darwin" }), /iCloud/);
  const gd = path.join(home, "Library", "CloudStorage", "GoogleDrive-x@y.com", "Mon Drive", "Clients");
  fs.mkdirSync(gd, { recursive: true });
  assert.match(cloudSync(gd, { home, platform: "darwin" }), /Google Drive/);
  assert.ok(overlaps(path.join(home, "Documents"), workdir) && !overlaps(gd, workdir));
  fs.rmSync(home, { recursive: true, force: true });
});

test("un code déjà posé n'est jamais recodé (« RC : RC-001 » ne devient pas « RC-RC-002 »)", () => {
  const b = newCodebook();
  const once = code("IF : 65908714 | RC : 620437 (Casablanca) | Patente : 35788345", b);
  assert.match(once, /^IF : IF-001 \| RC : RC-001 \(Casablanca\) \| Patente : PATENTE-001$/);
  assert.equal(code(once, b), once);
  assert.equal(strictCode(once, { mask: true }).text, once);
});

/* ---------------------------------- relecture adverse du 18/09/2026 ---- */

test("R1 — patronymes qui sont aussi des mots (INSEE) : codés en tête de phrase, en capitales, derrière un rôle", () => {
  const b = newCodebook();
  const cases = [
    ["Affaire MOULIN c/ BOULANGER.", ["MOULIN", "BOULANGER"]],
    ["Jacques Moulin a signé le bail.", ["Jacques", "Moulin"]],
    ["l'expert GERMAIN a déposé son rapport (Boulanger).", ["GERMAIN", "Boulanger"]],
    ["- Cousin\n- Poulain", ["Cousin", "Poulain"]],
    ["Il dîne chez les Rousseau. Le Président Robin préside.", ["Rousseau", "Robin"]],
    ["Henry a démissionné. Léger conteste. Bourgeois et Guillaume témoignent.", ["Henry", "Léger", "Bourgeois", "Guillaume"]],
    ["Marine a appelé. Aurore aussi. Maxime et Romain confirment.", ["Marine", "Aurore", "Maxime", "Romain"]],
    ["Horizon Immobilier a résilié le bail.", ["Horizon", "Immobilier"]],
    ["rdv avec me moulin", ["moulin"]],
  ];
  for (const [s, leaks] of cases) {
    const out = code(s, b);
    for (const v of leaks) assert.ok(!new RegExp(`(?<![\\p{L}])${v}(?![\\p{L}])`, "u").test(out), `${v} en clair : ${out}`);
  }
});

test("R1 — …sans coder le français courant : déterminants, intitulés, amorces de phrase", () => {
  for (const s of [
    "Le Boulanger du quartier et la Marine nationale.",
    "Six mois plus tard, le Grand Casablanca a changé. Bon pour accord.",
    "PAR CES MOTIFS\nRAPPEL DES FAITS\nDISCUSSION",
    "Mes demandes sont fondées.",
    "la loi Informatique et Libertés, le conseil de prud'hommes, Cass. ass. plén.",
    "Le Tribunal judiciaire de Nanterre, le TJ de Bobigny.",
  ]) assert.equal(code(s), s);
});

test("R1 — un nom codé une fois recode ses autres occurrences capitalisées (second passage)", () => {
  const out = code("Allier a signé. Puis M. Allier est parti.");
  assert.doesNotMatch(out, /Allier/);
});

test("R2 — une ville ou un mois derrière un prénom est un patronyme (« Karim Bouazza », « Karim Avril »)", () => {
  const out = code("Monsieur Karim Bouazza et Monsieur Karim Avril, à Casablanca en avril.");
  assert.doesNotMatch(out, /Bouazza|Avril|Karim/);
  assert.match(out, /à Casablanca en avril\.$/);
});

test("R3 — téléphones et pièces d'identité sous toutes leurs formes", () => {
  const out = code("Tél : +33 (0)6 12 34 56 78, +212 (0)6 61 23 45 67, 06/12/34/56/78, 01 423 456 78, " +
    "٠٦١٢٣٤٥٦٧٨, ０６１２３４５６７８, 06‑12‑34‑56‑78, 06·12·34·56·78. Passeport : AB 1234567. karim [at] gmail [dot] com");
  for (const v of ["12 34", "61 23", "06/12", "423 456", "٠٦١٢", "０６１", "‑12", "·12", "1234567", "gmail"]) {
    assert.ok(!out.includes(v), `${v} en clair : ${out}`);
  }
});

test("R4 — sortie : un mot courant qui est aussi un nom n'est recodé que capitalisé (pas de désignation par le contexte)", () => {
  const book = newCodebook();
  codeFor(book, "nom", "Petit");
  codeFor(book, "prenom", "Claire");
  codeFor(book, "nom", "Blanc");
  const g = guardText("le délai est petit, la situation est claire, le chèque est en blanc. M. Petit et Claire Blanc.", { book });
  assert.match(g.text, /^le délai est petit, la situation est claire, le chèque est en blanc\. M\. NOM-001 et PRENOM-001 NOM-002\.$/);
});

test("R6 — le fichier produit ne garde ni formule, ni lien, ni commentaire ; un numéro stocké en nombre est codé", async () => {
  const { XLSX } = await import("../server/engine.js");
  const { strictSheet } = await import("../server/verrou.js");
  const ws = {
    "!ref": "A1:C2",
    A1: { t: "s", v: "Contact", f: 'HYPERLINK("mailto:youssef.tazi@gmail.com","Contact")', l: { Target: "mailto:youssef.tazi@gmail.com" } },
    B1: { t: "n", v: 612345678 },
    C1: { t: "n", v: 4500, c: [{ a: "x", t: "Client Youssef Tazi, joignable au 0661234567" }] },
    A2: { t: "s", v: "Honoraires" },
  };
  strictSheet(ws, XLSX, { book: newCodebook() });
  const dump = JSON.stringify(ws);
  for (const v of ["youssef", "Tazi", "0661234567", "612345678", "mailto"]) assert.ok(!dump.includes(v), `${v} survit : ${dump}`);
  assert.equal(ws.C1.v, 4500);                 // un montant reste un montant
  assert.equal(ws.A2.v, "Honoraires");
});

test("v2.1 — carte bancaire et permis codés sous leur nom ; date et montant restent lisibles", () => {
  const out = code("Payé 1 250,40 DH le 06/10/2026 avec la carte 5555 5555 5555 4444 (permis 15/284731).");
  assert.match(out, /CARTE-001/);
  assert.match(out, /PERMIS-001/);
  for (const v of ["5555", "284731"]) assert.ok(!out.includes(v), `${v} en clair : ${out}`);
  assert.ok(out.includes("06/10/2026") && out.includes("1 250,40"), out);
  // Le verrou de sortie masque aussi un permis qui aurait échappé au codage.
  const g = guardText("Réglé avec la 4111 1111 1111 1111, permis 08/551902.", {});
  assert.ok(!g.text.includes("4111") && !g.text.includes("08/551902"), g.text);
});

test("performance : une clé de 20 000 codes ne ralentit pas le verrou", () => {
  const b = newCodebook();
  for (let i = 0; i < 20000; i++) codeFor(b, "nom", "Nomxyz" + i.toString(36) + "abc");
  const t0 = Date.now();
  for (let i = 0; i < 200; i++) code("Rappeler M. Karim Benali" + i + " et Nomxyz1abc demain.", b);
  assert.ok(Date.now() - t0 < 3000, `trop lent : ${Date.now() - t0} ms`);
  const g0 = Date.now();
  guardText("Nomxyz1abc et Nomxyz2abc", { book: b });
  assert.ok(Date.now() - g0 < 1500);
});
