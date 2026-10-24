// LES PACKS MÉTIER (v2.21) — SPEC-PACKS-METIER §5 : validité de chaque pack
// livré, transcription télécom, pièces juridique et banque, actes notariés
// marocains, activation par reglages.json, pack inconnu refusé.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listerPacks, lirePack, developperPacks, validerPack, FORMAT_PACK } from "../server/packs.js";
import { compilerRegles, lireReglesDossier, validerRegles, CONTROLES } from "../server/regles.js";
import { strictCode } from "../server/verrou.js";
import { newCodebook, luhnOk } from "../server/engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PACKS = path.join(here, "..", "packs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ht-packs-"));

/* Code un texte avec les règles compilées, comme le connecteur le fait. */
function coder(texte, ids) {
  const book = newCodebook();
  const c = compilerRegles({ dossier: developperPacks(ids).regles });
  const r = strictCode(texte, { book, extra: c.trouver([texte]), excludes: c.exclusions });
  return { texte: r.text, book, c };
}
const codesDe = (t, prefixe) => [...t.matchAll(new RegExp(`(?<![A-Z])${prefixe}-\\d{3,}`, "g"))].map((m) => m[0]);

test("chaque pack livré est valide : format, règles acceptées, exemples reconnus et contrôlés", () => {
  const fichiers = fs.readdirSync(PACKS).filter((n) => n.endsWith(".json"));
  assert.deepEqual(fichiers.sort(), ["banque-assurance.json", "expertise-comptable.json", "juridique-fr.json", "notariat-ma.json", "rh-paie.json", "sante.json", "telecom-ma.json"]);
  for (const n of fichiers) {
    const pack = JSON.parse(fs.readFileSync(path.join(PACKS, n), "utf8"));
    assert.equal(pack.format, FORMAT_PACK);
    assert.equal(`${pack.id}.json`, n, "le fichier porte l'id du pack");
    const v = validerPack(pack);
    assert.ok(v.ok, n);
    assert.deepEqual(v.erreurs, [], `${n} : toutes les règles doivent passer`);
    assert.equal(v.regles.length, pack.regles.length, `${n} : aucune règle écartée`);
    for (const r of pack.regles) if (r.type === "motif") {
      const m = r.exemple.match(new RegExp(r.motif, "iu"));
      assert.ok(m, `${n} ${r.id} : l'exemple est reconnu`);
      if (r.controle) assert.ok(CONTROLES[r.controle](m[0]), `${n} ${r.id} : l'exemple passe ${r.controle}`);
    }
    for (const e of pack.entetes || []) assert.ok(new RegExp(e.motif, "iu").test(e.exemple), `${n} en-tête ${e.prefixe} : l'exemple est reconnu`);
  }
  const l = listerPacks();
  assert.equal(l.length, 7);
  assert.ok(l.every((p) => p.nom && p.version && p.description && p.motifs >= 3));
  assert.equal(lirePack("inconnu"), null);
});

test("les contrôles : luhn = celui de la carte bancaire ; iban = clé mod 97", () => {
  for (const d of ["4111111111111111", "351234567890124", "12345678901237", "123456789"]) assert.equal(CONTROLES.luhn(d), luhnOk(d), d);
  assert.equal(CONTROLES.luhn("604010123456789"), false);
  assert.equal(CONTROLES.iban("FR76 3000 6000 0112 3456 7890 189"), true);
  assert.equal(CONTROLES.iban("FR76 3000 6000 0112 3456 7890 180"), false);
  assert.equal(CONTROLES.iban("DOCUMENT 1234"), false);
});

test("télécom : une transcription de centre d'appels — identifiants codés sous leur nom, offres en clair, IMSI ≠ IMEI", () => {
  const texte = [
    "Agent : Bonjour, service client Maroc Telecom. Votre numéro ?",
    "Client : +212 6 12 34 56 78, et aussi le 0661234567. Mon forfait Pass Internet ne marche plus depuis la recharge.",
    "Agent : Je vois la SIM 8921201234567890125, IMSI 604010123456789, téléphone IMEI 35 123456 789012 4 ; la box a l'adresse A4:5E:60:1B:2C:3D.",
    "Agent : Votre PUK : 12345678. Le roaming et le hors forfait sont désactivés. Un numéro de 15 chiffres sans clé : 351234567890125.",
  ].join("\n");
  const { texte: t, c } = coder(texte, ["telecom-ma"]);
  for (const v of ["+212 6 12 34 56 78", "8921201234567890125", "604010123456789", "35 123456 789012 4", "A4:5E:60:1B:2C:3D", "12345678"]) assert.ok(!t.includes(v), `« ${v} » a fui :\n${t}`);
  assert.equal(codesDe(t, "ICCID").length, 1, t);
  assert.equal(codesDe(t, "IMSI").length, 1, t);
  assert.equal(codesDe(t, "IMEI").length, 1, "un seul IMEI : le 15 chiffres sans clé de Luhn n'en est pas un\n" + t);
  assert.equal(codesDe(t, "MAC").length, 1, t);
  assert.equal(codesDe(t, "PUK").length, 1, t);
  // Le MSISDN international et la forme nationale partagent le préfixe TEL du moteur.
  assert.ok(codesDe(t, "TEL").length >= 2, t);
  for (const clair of ["Maroc Telecom", "forfait", "Pass Internet", "recharge", "roaming", "hors forfait", "service client"]) assert.ok(t.includes(clair), `« ${clair} » devait rester en clair :\n${t}`);
  assert.match(c.decrire(), /pack Télécom — opérateur marocain : 6 motifs, 19 termes en clair/);
});

test("juridique : SIRET avec Luhn codé, sans Luhn non codé par le pack ; RG, parquet, pourvoi codés ; juridictions en clair", () => {
  const texte = "La SAS Exemple (SIRET 123 456 789 01237, RCS Paris 123 456 782) a saisi le tribunal judiciaire, RG n° 24/01234, parquet n° 23 180 000123 ; pourvoi n° 21-14.432 devant la Cour de cassation ; article 1240 du Code civil. Autre numéro : 12345678901238.";
  const { texte: t } = coder(texte, ["juridique-fr"]);
  assert.equal(codesDe(t, "SIRET").length, 1, t);
  assert.ok(t.includes("12345678901238") || !/SIRET-\d+.*SIRET-\d+/s.test(t), "le 14 chiffres sans Luhn n'est pas un SIRET");
  assert.equal(codesDe(t, "SIREN").length, 1, t);
  assert.equal(codesDe(t, "RG").length, 1, t);
  assert.equal(codesDe(t, "PARQUET").length, 1, t);
  assert.equal(codesDe(t, "POURVOI").length, 1, t);
  for (const clair of ["tribunal judiciaire", "Cour de cassation", "Code civil"]) assert.ok(t.includes(clair), `« ${clair} » :\n${t}`);
});

test("banque-assurance : IBAN codé en RIB (même compteur que le RIB natif), IBAN à clé fausse non codé par le pack, BIC/police/sinistre annoncés codés", () => {
  const texte = "Virement depuis FR76 3000 6000 0112 3456 7890 189 (BIC : ABCDMAMCXXX) vers le RIB 230 780 0012345678901234 56 ; police n° AUT/2026/004512, sinistre n° SIN-26-00871, chèque n° 1234567. Faux IBAN : FR76 3000 6000 0112 3456 7890 180. Assuré chez Wafa Assurance, franchise 500 Dhs.";
  const { texte: t, c } = coder(texte, ["banque-assurance"]);
  assert.ok(!t.includes("FR76 3000 6000 0112 3456 7890 189"), t);
  assert.ok(codesDe(t, "RIB").length >= 1, t);
  assert.equal(codesDe(t, "BIC").length, 1, t);
  assert.equal(codesDe(t, "POLICE").length, 1, t);
  assert.equal(codesDe(t, "SINISTRE").length, 1, t);
  assert.equal(codesDe(t, "CHEQUE").length, 1, t);
  const m = c.trouver(["FR76 3000 6000 0112 3456 7890 180"]);
  assert.equal(m.length, 0, "clé mod 97 fausse : le pack ne le reconnaît pas");
  for (const clair of ["Wafa Assurance", "franchise"]) assert.ok(t.includes(clair), `« ${clair} » :\n${t}`);
});

test("activation par reglages.json : packs par référence, pack inconnu = erreur (rien n'est codé), controle interdit hors pack", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "reglages.json"), JSON.stringify({ chiffres: "auto", packs: ["telecom-ma", "juridique-fr"] }));
  const r = lireReglesDossier(dir);
  assert.deepEqual(r.erreurs, []);
  assert.deepEqual(r.packs, ["telecom-ma", "juridique-fr"]);
  assert.equal(r.regles.length, 15);
  assert.ok(r.regles.every((x) => x.pack));
  fs.writeFileSync(path.join(dir, "reglages.json"), JSON.stringify({ packs: ["sante-animale"] }));
  const r2 = lireReglesDossier(dir);
  assert.equal(r2.regles.length, 0);
  assert.match(r2.erreurs[0], /pack « sante-animale » inconnu de ce connecteur/);
  const v = validerRegles([{ id: "D-001", type: "motif", libelle: "x", prefixe: "IMEI", motif: "\\d{15}", exemple: "351234567890124", controle: "luhn" }], { niveau: "dossier" });
  assert.equal(v.regles.length, 0);
  assert.match(v.erreurs[0], /réservé aux packs/);
  const v2 = validerRegles([{ id: "D-001", type: "motif", libelle: "x", prefixe: "TEL", motif: "\\d{10}", exemple: "0612345678" }], { niveau: "dossier" });
  assert.match(v2.erreurs[0], /réservé au moteur/);
});

/* De bout en bout : une politique signée par la console cite un pack ; le
   poste (vrai connecteur, stdio) le développe et code un IMEI. */
test("politique avec packs : signée par la console, appliquée par le poste", async () => {
  const { Client } = await import("@modelcontextprotocol/client");
  const { StdioClientTransport } = await import("@modelcontextprotocol/client/stdio");
  const { mint } = await import("./licence-test.mjs");
  const { creerCabinet, ouvrirCabinet } = await import("../../nanomizer-admin/lib/cabinet.js");
  const { creerEnrolement, ecrireEnrolement } = await import("../../nanomizer-admin/lib/enrolement.js");
  const { publierPolitique, modeleSource } = await import("../../nanomizer-admin/lib/politique.js");
  const root = tmp(), partage = path.join(root, "partage"), workdir = path.join(root, "dossier");
  fs.mkdirSync(partage); fs.mkdirSync(workdir);
  const cabinet = creerCabinet({ nom: "Télécom Test", phrase: "correct cheval pile agrafe", cout: { N: 2 ** 10, r: 8, p: 1 } });
  const ouvert = ouvrirCabinet(cabinet, "correct cheval pile agrafe");
  const enr = creerEnrolement(cabinet, ouvert, { utilisateur: "agent@telecom-test.ma", dossierPartage: partage });
  const fichierEnr = ecrireEnrolement(root, enr);
  const source = modeleSource();
  source.emise_par = "admin@telecom-test.ma"; source.equipes[0].membres = ["agent@telecom-test.ma"]; source.equipes[0].responsables = ["admin@telecom-test.ma"];
  source.alertes.admin_technique = ["it@telecom-test.ma"]; source.regles[0].noms = ["Société Fictive Sans Rapport"];
  source.packs = ["telecom-ma"];
  publierPolitique({ source, cabinet, ouvert, dossierPartage: partage, dossierArchives: path.join(root, "archives") });
  fs.writeFileSync(path.join(workdir, "appel.txt"), "Client : mon téléphone IMEI 35 123456 789012 4 ne capte plus, forfait Pass Internet.\n");
  const client = new Client({ name: "packs", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Télécom Test", seats: 20, iat: "2026-10-20", exp: "9999-12-31", life: true }), ANX_TEAM_DIR: "", ANX_REGISTRE_DIR: "", ANX_ENROLEMENT: fichierEnr, ANX_SENTINELLE: "non", NANOMIZER_SENTINELLE_DIR: path.join(root, ".absente") },
  }));
  try {
    const plan = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "appel.txt" } });
    const tp = plan.content.map((c) => c.text || "").join("\n");
    assert.match(tp, /pack Télécom — opérateur marocain/, tp);
    const r = await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "appel.txt", confirmer: true } });
    const t = r.content.map((c) => c.text || "").join("\n");
    assert.ok(!t.includes("789012"), t);
    assert.ok(!/NOM-\d/.test(t), "IMEI n'est pas un nom :\n" + t);
    const code = fs.readFileSync(path.join(workdir, "Hidden-Tokens", "appel-anonymise.md"), "utf8");
    assert.match(code, /IMEI-\d{3,}/, code);
    assert.ok(code.includes("forfait") && code.includes("Pass Internet"), code);
  } finally { await client.close(); fs.rmSync(root, { recursive: true, force: true }); }
});

test("santé : patient, assuré, praticien et lot annoncés codés ; spécialités, examens et médicaments en clair", () => {
  const texte = "Patient IPP : 2026-048812, CNOPS n° 1234567890, vu aux urgences en cardiologie ; prescripteur RPPS 10001234567. Traitement : metformine, paracétamol. Lot n° B2026-0417. Diagnostic : diabète de type 2, échographie demandée au CHU.";
  const { texte: t } = coder(texte, ["sante"]);
  for (const v of ["2026-048812", "1234567890", "10001234567", "B2026-0417"]) assert.ok(!t.includes(v), `« ${v} » a fui :\n${t}`);
  assert.equal(codesDe(t, "PATIENT").length, 1, t);
  assert.equal(codesDe(t, "ASSURE").length, 1, t);
  assert.equal(codesDe(t, "PRATICIEN").length, 1, t);
  assert.equal(codesDe(t, "LOT").length, 1, t);
  for (const clair of ["urgences", "cardiologie", "metformine", "paracétamol", "diabète de type 2", "échographie", "CHU", "CNOPS"]) assert.ok(t.includes(clair), `« ${clair} » :\n${t}`);
});

test("expertise comptable : facture, pièce, TVA intracom et déclaration codées ; plan comptable, impôts et logiciels en clair", () => {
  const texte = "Facture n° FA-2026-00412 du fournisseur, pièce n° OD-0917, TVA intracom FR 12 123 456 782 ; déclaration n° DGI-2026-118877 déposée sur SIMPL. Le chiffre d'affaires et la TVA collectée sont au grand livre, saisis dans Sage avant la clôture de l'exercice comptable.";
  const { texte: t } = coder(texte, ["expertise-comptable"]);
  for (const v of ["FA-2026-00412", "OD-0917", "123 456 782", "DGI-2026-118877"]) assert.ok(!t.includes(v), `« ${v} » a fui :\n${t}`);
  assert.equal(codesDe(t, "FACTURE").length, 1, t);
  assert.equal(codesDe(t, "PIECE").length, 1, t);
  assert.equal(codesDe(t, "TVA").length, 1, t);
  assert.equal(codesDe(t, "DECLAR").length, 1, t);
  for (const clair of ["chiffre d'affaires", "TVA collectée", "grand livre", "Sage", "clôture", "exercice comptable", "SIMPL"]) assert.ok(t.includes(clair), `« ${clair} » :\n${t}`);
});

test("RH et paie : matricule, badge et contrat codés ; postes, droit du travail et paie en clair", () => {
  const texte = "Matricule : EMP-04471, badge n° 00812, contrat de travail n° CT/2026/031. Poste : chef de projet en CDI, période d'essai de 3 mois, convention collective applicable ; bulletin de paie avec salaire brut, prime d'ancienneté, cotisations CNSS et CIMR. Entretien annuel prévu.";
  const { texte: t } = coder(texte, ["rh-paie"]);
  for (const v of ["EMP-04471", "00812", "CT/2026/031"]) assert.ok(!t.includes(v), `« ${v} » a fui :\n${t}`);
  assert.equal(codesDe(t, "MATRICULE").length, 1, t);
  assert.equal(codesDe(t, "BADGE").length, 1, t);
  assert.equal(codesDe(t, "DOSSIERRH").length, 1, t);
  for (const clair of ["chef de projet", "CDI", "période d'essai", "convention collective", "bulletin de paie", "salaire brut", "prime d'ancienneté", "CNSS", "CIMR", "Entretien annuel"]) assert.ok(t.includes(clair), `« ${clair} » :\n${t}`);
});

test("en-têtes de colonnes : typeColonne du pack télécom force MSISDN → TEL, IMSI, IMEI, ICCID, ID client → REF ; un en-tête quelconque reste au moteur", () => {
  const c = compilerRegles({ dossier: developperPacks(["telecom-ma"]).regles, entetes: developperPacks(["telecom-ma"]).entetes });
  assert.equal(c.typeColonne("MSISDN appelant"), "tel");
  assert.equal(c.typeColonne("IMSI"), "regle_IMSI");
  assert.equal(c.typeColonne("IMEI"), "regle_IMEI");
  assert.equal(c.typeColonne("ICCID SIM"), "regle_ICCID");
  assert.equal(c.typeColonne("ID client"), "reference");
  assert.equal(c.typeColonne("Durée (s)"), null);
  assert.match(c.decrire(), /7 en-têtes de colonnes/);
});

/* De bout en bout : un export CDR fictif (Excel) avec le pack télécom activé
   dans reglages.json — les colonnes MSISDN, IMSI, IMEI sont codées dès le
   plan, la durée et le type d'appel restent lisibles. */
test("export CDR (mode tableau) : les colonnes des identifiants sont codées par le pack, les mesures restent lisibles", async () => {
  const { Client } = await import("@modelcontextprotocol/client");
  const { StdioClientTransport } = await import("@modelcontextprotocol/client/stdio");
  const { mint } = await import("./licence-test.mjs");
  const { XLSX } = await import("../server/engine.js");
  const root = tmp(), workdir = path.join(root, "dossier");
  fs.mkdirSync(path.join(workdir, "Hidden-Tokens"), { recursive: true });
  fs.writeFileSync(path.join(workdir, "Hidden-Tokens", "reglages.json"), JSON.stringify({ chiffres: "clair", packs: ["telecom-ma"] }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["MSISDN appelant", "IMSI", "IMEI", "Type d'appel", "Durée (s)"],
    ["212612345678", "604010123456789", "351234567890124", "voix sortant", 184],
    ["212698765432", "604010987654321", "351234567890132", "data", 3600],
  ]), "CDR");
  XLSX.writeFile(wb, path.join(workdir, "cdr.xlsx"));
  const client = new Client({ name: "cdr", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Télécom Test", seats: 20, iat: "2026-10-20", exp: "9999-12-31", life: true }), ANX_TEAM_DIR: "", ANX_REGISTRE_DIR: "", ANX_ENROLEMENT: "", ANX_SENTINELLE: "non", NANOMIZER_SENTINELLE_DIR: path.join(root, ".absente") },
  }));
  try {
    const plan = (await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "cdr.xlsx" } })).content.map((c) => c.text || "").join("\n");
    assert.match(plan, /IMSI/, plan);
    assert.match(plan, /IMEI/, plan);
    const r = (await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "cdr.xlsx", confirmer: true } })).content.map((c) => c.text || "").join("\n");
    for (const v of ["212612345678", "604010123456789", "351234567890124", "604010987654321"]) assert.ok(!r.includes(v), `« ${v} » a fui :\n${r}`);
    assert.ok(/TEL-\d+/.test(r) && /IMSI-\d+/.test(r) && /IMEI-\d+/.test(r), r);
    assert.ok(r.includes("voix sortant") && r.includes("184"), r);
  } finally { await client.close(); fs.rmSync(root, { recursive: true, force: true }); }
});

/* NOTARIAT (v2.24) : deux actes fictifs d'une étude marocaine. Chaque valeur
   réelle est cherchée dans la sortie ; le vocabulaire de l'acte doit rester
   lisible pour que l'IA puisse relire, résumer ou rédiger. Le prix relève du
   réglage Nombres (mode tableau), pas du pack. */
const VENTE_MA = [
  "ACTE DE VENTE",
  "L'an deux mille vingt-six, le quinze mars, par-devant Maître Karim Benjelloun, notaire à Casablanca, soussigné, minute n° 2026/0412, répertoire n° 8817.",
  "ONT COMPARU : Monsieur Ahmed El Fassi, né le 12/04/1971 à Fès, titulaire de la CIN n° BE123456, demeurant 14 rue Ibn Battouta, Casablanca, ci-après « le vendeur » ;",
  "Madame Salma Berrada, titulaire de la CIN n° BK789012, demeurant à Rabat, ci-après « l'acquéreur ».",
  "DÉSIGNATION : la propriété dite « Villa Yasmine », objet du titre foncier n° 12345/63, sise à Bouskoura, d'une superficie de quatre cent cinquante mètres carrés, ainsi que la parcelle objet de la réquisition d'immatriculation n° 6789/63, et l'appartement objet du T.F. 1234/45. Ancien titre : TF n° 28.517/C.",
  "Le bien est libre de toute hypothèque, à l'exception de l'inscription prise à la conservation foncière de Casablanca (ANCFCC).",
  "PRIX : un million deux cent mille dirhams, payé par virement du RIB 230 780 0012345678901234 56.",
  "Les droits d'enregistrement, la taxe notariale et les frais de conservation foncière sont à la charge de l'acquéreur. Une promesse de vente avait été signée ; le dossier est suivi sur Tadbirnot.",
].join("\n");
const SUCCESSION_MA = [
  "ACTE DE PARTAGE SUCCESSORAL",
  "Minute numéro 2026-0733 — répertoire général n° 15/2026. Par-devant Maître Nadia Tazi, notaire à Fès,",
  "Feu Monsieur Driss Alaoui, de cujus, laissant pour lui succéder, selon l'acte d'hérédité (frida) dressé par deux adouls, acte adoulaire n° 345, page 210, du tribunal de première instance de Fès :",
  "- Madame Fatima Zahra Alaoui, sa fille, héritière, CIN C456789 ;",
  "- Monsieur Youness Alaoui, son fils, héritier, CIN CD112233.",
  "Les héritiers sortent de l'indivision portant sur la propriété dite « Dar Al Amal », titre foncier n° 4521/F, et sur les titres fonciers n° 3310/F et 3311/F, ainsi que sur le terrain objet de la réquisition n° 18 220/F.",
  "Mainlevée de l'hypothèque inscrite au profit de la banque, radiée par la conservation foncière. Les droits d'enregistrement et la taxe notariale sont réglés via Tadbirnot ; quitus fiscal délivré par la DGI ; acte adoulaire et Code de la famille.",
].join("\n");
const fuites = (t, valeurs) => valeurs.filter((v) => t.includes(v) || t.replace(/\s/g, "").includes(v.replace(/\s/g, "")));

test("notariat : acte de vente — titres fonciers, réquisition, minute, répertoire et propriété codés ; aucune valeur réelle ; vocabulaire lisible", () => {
  const { texte: t } = coder(VENTE_MA, ["notariat-ma"]);
  assert.deepEqual(fuites(t, [
    "Karim", "Benjelloun", "Ahmed", "Fassi", "Salma", "Berrada", "BE123456", "BK789012", "12/04/1971", "Ibn Battouta",
    "Villa Yasmine", "12345/63", "6789/63", "1234/45", "28.517/C", "2026/0412", "8817", "0012345678901234",
  ]), [], t);
  assert.equal(codesDe(t, "TF").length, 3, "trois titres distincts\n" + t);
  assert.equal(codesDe(t, "REQUISIT").length, 1, t);
  assert.equal(codesDe(t, "MINUTE").length, 1, t);
  assert.equal(codesDe(t, "REPERTOIRE").length, 1, t);
  assert.equal(codesDe(t, "PROPRIETE").length, 1, t);
  // Le libellé reste devant le code : l'IA sait de quoi il s'agit.
  assert.match(t, /titre foncier n° TF-\d{3}/, t);
  assert.match(t, /TF n° TF-\d{3}/, t);
  assert.match(t, /T\.F\. TF-\d{3}/, "« T.F. » reste lisible : le lexique le sait\n" + t);
  assert.match(t, /réquisition d'immatriculation n° REQUISIT-\d{3}/, t);
  assert.match(t, /propriété dite « PROPRIETE-\d{3} »/, t);
  for (const clair of ["ACTE DE VENTE", "notaire", "hypothèque", "conservation foncière", "ANCFCC", "droits d'enregistrement", "taxe notariale",
    "frais de conservation foncière", "promesse de vente", "Tadbirnot", "le vendeur", "l'acquéreur", "superficie"]) assert.ok(t.includes(clair), `« ${clair} » devait rester en clair :\n${t}`);
});

test("notariat : partage successoral — énumération de titres, réquisition à séparateur, acte adoulaire codés ; héritiers au moteur ; vocabulaire lisible", () => {
  const { texte: t } = coder(SUCCESSION_MA, ["notariat-ma"]);
  assert.deepEqual(fuites(t, [
    "Nadia", "Tazi", "Driss", "Alaoui", "Fatima", "Youness", "C456789", "CD112233",
    "Dar Al Amal", "4521/F", "3310/F", "3311/F", "18 220/F", "220/F", "2026-0733", "15/2026", "page 210",
  ]), [], t);
  assert.equal(codesDe(t, "TF").length, 3, "4521/F, 3310/F et 3311/F, l'énumération comprise\n" + t);
  assert.equal(codesDe(t, "REQUISIT").length, 1, t);
  assert.equal(codesDe(t, "ADOUL").length, 1, t);
  assert.equal(codesDe(t, "MINUTE").length, 1, t);
  assert.equal(codesDe(t, "REPERTOIRE").length, 1, t);
  for (const clair of ["ACTE DE PARTAGE SUCCESSORAL", "de cujus", "acte d'hérédité", "frida", "adouls", "acte adoulaire", "tribunal de première instance",
    "héritière", "héritier", "indivision", "titres fonciers", "Mainlevée", "hypothèque", "conservation foncière", "droits d'enregistrement",
    "taxe notariale", "Tadbirnot", "quitus fiscal", "DGI", "Code de la famille"]) assert.ok(t.includes(clair), `« ${clair} » devait rester en clair :\n${t}`);
});

test("notariat : pas de faux titre — dates, n° RG, fractions et numéros non annoncés restent au moteur", () => {
  const texte = "Le 12/2026, RG n° 24/01234 ; trois quarts, soit 3/4 ; la minute du jour ; le répertoire des actes ; le titre foncier est délivré.";
  const { texte: t } = coder(texte, ["notariat-ma"]);
  for (const p of ["TF", "REQUISIT", "MINUTE", "REPERTOIRE", "ADOUL"]) assert.equal(codesDe(t, p).length, 0, `${p} :\n${t}`);
  for (const v of ["12/2026", "3/4", "la minute du jour", "le répertoire des actes", "le titre foncier est délivré"]) assert.ok(t.includes(v), `« ${v} » :\n${t}`);
  // « TF » nu, sans « n° », n'est pas pris pour un nom (lexique du verrou).
  const { texte: t2 } = coder("Le lot est objet du TF 77123/63.", ["notariat-ma"]);
  assert.match(t2, /du TF TF-\d{3}\./, t2);
});

test("notariat : en mode tableau, les colonnes TF, réquisition, minute et répertoire sont codées par le pack", () => {
  const { regles, entetes } = developperPacks(["notariat-ma"]);
  const c = compilerRegles({ dossier: regles, entetes });
  assert.equal(c.typeColonne("N° TF"), "regle_TF");
  assert.equal(c.typeColonne("Titre foncier"), "regle_TF");
  assert.equal(c.typeColonne("Réquisition"), "regle_REQUISIT");
  assert.equal(c.typeColonne("N° minute"), "regle_MINUTE");
  assert.equal(c.typeColonne("Répertoire"), "regle_REPERTOIRE");
  assert.equal(c.typeColonne("Superficie (m²)"), null);
  assert.match(c.decrire(), /pack Notariat — étude de notaire, Maroc : 7 motifs/);
});

/* De bout en bout : l'acte de vente en .txt, pack activé dans reglages.json ;
   ce que Claude lit (réponse et fichier codé) ne porte aucune valeur réelle. */
test("notariat de bout en bout : acte de vente codé par le connecteur avec le pack activé dans reglages.json", async () => {
  const { Client } = await import("@modelcontextprotocol/client");
  const { StdioClientTransport } = await import("@modelcontextprotocol/client/stdio");
  const { mint } = await import("./licence-test.mjs");
  const root = tmp(), workdir = path.join(root, "dossier");
  fs.mkdirSync(path.join(workdir, "Hidden-Tokens"), { recursive: true });
  fs.writeFileSync(path.join(workdir, "Hidden-Tokens", "reglages.json"), JSON.stringify({ packs: ["notariat-ma"] }));
  fs.writeFileSync(path.join(workdir, "acte.txt"), VENTE_MA + "\n");
  const client = new Client({ name: "notariat", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(here, "..", "server", "index.js")],
    env: { ...process.env, ANX_WORKDIR: workdir, ANX_LICENCE: mint({ v: 1, org: "Étude Test", seats: 1, iat: "2026-10-20", exp: "9999-12-31", life: true }), ANX_TEAM_DIR: "", ANX_REGISTRE_DIR: "", ANX_ENROLEMENT: "", ANX_SENTINELLE: "non", NANOMIZER_SENTINELLE_DIR: path.join(root, ".absente") },
  }));
  try {
    const plan = (await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "acte.txt" } })).content.map((c) => c.text || "").join("\n");
    assert.match(plan, /pack Notariat — étude de notaire, Maroc/, plan);
    const r = (await client.callTool({ name: "anonymiser_fichier", arguments: { nom_fichier: "acte.txt", confirmer: true } })).content.map((c) => c.text || "").join("\n");
    const code = fs.readFileSync(path.join(workdir, "Hidden-Tokens", "acte-anonymise.md"), "utf8");
    for (const lu of [r, code]) {
      assert.deepEqual(fuites(lu, ["Benjelloun", "Fassi", "Berrada", "BE123456", "BK789012", "Villa Yasmine", "12345/63", "6789/63", "1234/45", "28.517/C", "2026/0412", "8817", "0012345678901234"]), [], lu);
    }
    assert.match(code, /titre foncier n° TF-\d{3}/, code);
    assert.match(code, /réquisition d'immatriculation n° REQUISIT-\d{3}/, code);
    for (const clair of ["conservation foncière", "ANCFCC", "hypothèque", "droits d'enregistrement", "taxe notariale", "promesse de vente", "Tadbirnot"]) assert.ok(code.includes(clair), `« ${clair} » :\n${code}`);
  } finally { await client.close(); fs.rmSync(root, { recursive: true, force: true }); }
});
