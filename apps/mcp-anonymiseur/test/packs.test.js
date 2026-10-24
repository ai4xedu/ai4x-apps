// LES PACKS MÉTIER (v2.21) — SPEC-PACKS-METIER §5 : validité de chaque pack
// livré, transcription télécom, pièces juridique et banque, activation par
// reglages.json, pack inconnu refusé.
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
  assert.deepEqual(fichiers.sort(), ["banque-assurance.json", "juridique-fr.json", "telecom-ma.json"]);
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
  }
  const l = listerPacks();
  assert.equal(l.length, 3);
  assert.ok(l.every((p) => p.nom && p.version && p.description && p.motifs >= 4));
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
  fs.writeFileSync(path.join(dir, "reglages.json"), JSON.stringify({ packs: ["sante"] }));
  const r2 = lireReglesDossier(dir);
  assert.equal(r2.regles.length, 0);
  assert.match(r2.erreurs[0], /pack « sante » inconnu de ce connecteur/);
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
