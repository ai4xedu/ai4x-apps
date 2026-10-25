// Tests de la licence — la vérification est locale et cryptographique.
// L'horloge est injectée : un test qui dépend de la date du jour est un test
// qui cassera un matin.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TEST_KEY, mint as mintTest } from "./licence-test.mjs";
import { parseKey, licenceStatus, readLicence, blockedMessage, warningBanner, b64urlEncode, isUnsubstituted, trialStatus } from "../server/licence.js";

/* Les clés sont signées par la clé de TEST du dépôt (cf. licence-test.mjs) :
   la suite tourne sur tous les postes. La VRAIE clé privée, si elle est sur
   ce poste, ne sert qu'à un contrôle : qu'elle corresponde toujours à la clé
   publique embarquée. */
const PRIVATE_KEY_FILE = process.env.NANOMIZER_PRIVATE_KEY_FILE ||
  path.join(os.homedir(), "Desktop", "nanomizer-cle-privee-NE-JAMAIS-PARTAGER.txt");

function privateKeyOrNull() {
  try {
    const raw = fs.readFileSync(PRIVATE_KEY_FILE, "utf8")
      .split("\n").map((l) => l.trim())
      .filter((l) => l.length > 40 && /^[A-Za-z0-9+/=]+$/.test(l)).pop();
    return crypto.createPrivateKey({ key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8" });
  } catch { return null; }
}

function mint(payload, key) {
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64urlEncode(crypto.sign(null, Buffer.from(body), key));
  return `NANO1.${body}.${sig}`;
}

const KEY = TEST_KEY;
const PROD_KEY = privateKeyOrNull();

test("la vraie clé privée correspond à la clé publique embarquée", { skip: PROD_KEY ? false : "clé privée absente de ce poste" }, () => {
  assert.equal(parseKey(mintTest({ v: 1, org: "Prod", seats: 1, iat: "2026-01-01", exp: "2099-01-01" }, PROD_KEY)).ok, true);
});

test("une clé signée par une clé INCONNUE est refusée", () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const res = parseKey(mintTest({ v: 1, org: "Pirate", seats: 1, iat: "2026-01-01", exp: "2099-01-01" }, privateKey));
  assert.equal(res.ok, false);
  assert.match(res.reason, /signature invalide/);
});

test("une clé absente ou malformée est refusée, avec une raison lisible", () => {
  assert.equal(parseKey("").ok, false);
  assert.match(parseKey("").reason, /absente/);
  assert.match(parseKey("bonjour").reason, /format inconnu/);
  assert.match(parseKey("NANO1.abc").reason, /format inconnu/);
});

test("une clé inventée ou modifiée est rejetée par la signature", () => {
  const good = mint({ v: 1, org: "Cabinet Test", seats: 5, iat: "2026-01-01", exp: "2027-01-01" }, KEY);
  assert.equal(parseKey(good).ok, true);
  // On gonfle le nombre de postes dans le payload : la signature ne suit pas.
  const [, body, sig] = good.split(".");
  const tampered = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  tampered.seats = 500;
  const forged = `NANO1.${b64urlEncode(Buffer.from(JSON.stringify(tampered)))}.${sig}`;
  const res = parseKey(forged);
  assert.equal(res.ok, false);
  assert.match(res.reason, /signature invalide/);
});

test("statut : valide, bientôt expirée, expirée — sur une horloge injectée", () => {
  const key = mint({ v: 1, org: "Cabinet Sekkat", seats: 5, iat: "2026-01-01", exp: "2026-12-31" }, KEY);

  const large = licenceStatus(key, new Date("2026-06-01T10:00:00"));
  assert.equal(large.valid, true);
  assert.equal(large.expiringSoon, false);
  assert.equal(large.holder, "Cabinet Sekkat");
  assert.equal(large.seats, 5);

  const bientot = licenceStatus(key, new Date("2026-12-20T10:00:00"));
  assert.equal(bientot.valid, true);
  assert.equal(bientot.expiringSoon, true);
  assert.ok(bientot.daysLeft <= 30 && bientot.daysLeft >= 0);
  assert.match(warningBanner(bientot), /jour\(s\) restant/);
  // L'avertissement rappelle que le décodage survit.
  assert.match(warningBanner(bientot), /dé-anonymisation continuera/);

  // Délai de grâce (abonnement, v2.5) : une facture d'entreprise se règle
  // rarement le jour de l'échéance.
  const grace = licenceStatus(key, new Date("2027-01-05T10:00:00"));
  assert.equal(grace.valid, true);
  assert.equal(grace.grace, true);
  assert.equal(grace.graceLeft, 11);   // grâce jusqu'au 15/01 inclus
  assert.match(warningBanner(grace), /délai de grâce de 11 jour\(s\)/);
  assert.match(warningBanner(grace), /dé-anonymisation continuera/);

  const expiree = licenceStatus(key, new Date("2027-01-20T10:00:00"));
  assert.equal(expiree.valid, false);
  assert.equal(expiree.grace, false);
  assert.match(expiree.reason, /expirée/);
});

test("le message de blocage vend, ne punit pas, et promet le décodage", () => {
  const key = mint({ v: 1, org: "X", seats: 1, iat: "2026-01-01", exp: "2026-01-02" }, KEY);
  const msg = blockedMessage(licenceStatus(key, new Date("2026-06-01")));
  assert.match(msg, /expiré/);
  assert.match(msg, /DÉ-ANONYMISATION/);
  assert.match(msg, /jamais prises en otage/);
  assert.match(msg, /anonymiseur-donnees/);       // l'appli gratuite reste
  assert.match(msg, /ABONNEMENT ANNUEL : 390 € HT/);   // l'offre (v2.5)…
  assert.match(msg, /ai4x\.academy\/nanomizer#plans/); // …commandée sur la page
  assert.match(msg, /wa\.me\/212680092567/);          // …ou sur WhatsApp
  assert.doesNotMatch(msg, /à vie/i);                    // plus vendue
});

test("essai terminé sans clé : le message donne le geste exact pour coller la clé (v2.26.1, campagne C1)", () => {
  // Le jour 15, le client qui vient de payer cherche OÙ coller sa clé.
  const debut = "2020-01-01T00:00:00Z";
  for (const brut of ["", "${user_config.licence}"]) {   // champ vide, ou gabarit non substitué par Claude Desktop
    // Comme readLicence : un gabarit non substitué compte pour « pas de clé ».
    const st = trialStatus(licenceStatus(isUnsubstituted(brut) ? "" : brut), debut);
    assert.equal(st.reason, "essai terminé");
    const msg = blockedMessage(st);
    assert.match(msg, /essai gratuit de 14 jours est terminé/);
    assert.match(msg, /Aucune clé de licence n'est configurée/);
    assert.match(msg, /champ « Clé de licence »/);
    assert.match(msg, /REDÉMARREZ Claude Desktop/);
    assert.doesNotMatch(msg, /format inconnu|refusée/);
    assert.match(msg, /jamais prises en otage/);
  }
  // Une clé présente mais fausse : on parle de la clé, pas d'un champ vide.
  const refusee = blockedMessage(trialStatus(licenceStatus("NANO1.nawak.nawak"), debut));
  assert.match(refusee, /essai gratuit de 14 jours est terminé/);
  assert.match(refusee, /La clé configurée a été refusée/);
  assert.doesNotMatch(refusee, /Aucune clé de licence n'est configurée/);
});

test("clé absente ≠ clé refusée : deux messages, deux gestes à faire", () => {
  // Absente : on donne le MODE D'EMPLOI (le client a peut-être déjà payé).
  const absente = blockedMessage(licenceStatus(""));
  assert.match(absente, /Aucune clé de licence n'est configurée/);
  assert.match(absente, /Clé de licence/);
  assert.match(absente, /REDÉMARREZ/);
  assert.doesNotMatch(absente, /format inconnu/);

  // Présente mais fausse : on parle de la clé, pas des réglages vides.
  const refusee = blockedMessage(licenceStatus("NANO1.nawak.nawak"));
  assert.match(refusee, /refusée/);
  assert.match(refusee, /EN ENTIER/);

  // Les deux gardent la promesse fondatrice.
  for (const m of [absente, refusee]) assert.match(m, /jamais prises en otage/);
});

test("un gabarit ${user_config.*} non substitué vaut « pas de valeur »", () => {
  // Le bug du 01/08/2026 : champ laissé vide → Claude Desktop passe le
  // littéral, et l'utilisateur lisait « format inconnu » sans rien avoir collé.
  assert.equal(isUnsubstituted("${user_config.licence}"), true);
  assert.equal(isUnsubstituted("  ${user_config.dossier_travail}  "), true);
  assert.equal(isUnsubstituted(""), false);
  assert.equal(isUnsubstituted("NANO1.a.b"), false);
  // Une vraie clé n'est jamais prise pour un gabarit.
  assert.equal(isUnsubstituted("${NANO1.a.b"), false);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-lic-"));
  const lu = readLicence(dir, { ANX_LICENCE: "${user_config.licence}" });
  assert.equal(lu.raw, "");                       // traité comme absent…
  assert.match(blockedMessage(licenceStatus(lu.raw)), /Aucune clé de licence/);

  // …et on retombe bien sur le fichier licence.txt s'il existe.
  fs.writeFileSync(path.join(dir, "licence.txt"), "NANO1.depuis.fichier\n");
  assert.equal(readLicence(dir, { ANX_LICENCE: "${user_config.licence}" }).raw, "NANO1.depuis.fichier");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("la clé se lit dans l'env, ou dans licence.txt du dossier de travail", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-lic-"));
  assert.equal(readLicence(dir, {}).raw, "");
  assert.equal(readLicence(dir, { ANX_LICENCE: "NANO1.a.b" }).source, "réglages de l'extension");
  fs.writeFileSync(path.join(dir, "licence.txt"), "  NANO1.depuis.fichier  \n");
  const fromFile = readLicence(dir, {});
  assert.equal(fromFile.raw, "NANO1.depuis.fichier");
  assert.match(fromFile.source, /licence\.txt/);
  // L'env prime sur le fichier.
  assert.equal(readLicence(dir, { ANX_LICENCE: "NANO1.env.gagne" }).raw, "NANO1.env.gagne");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("licence À VIE : valide dans 100 ans, jamais d'avertissement, affichée « à vie »", () => {
  const key = mint({ v: 1, org: "Maître Sekkat", seats: 1, iat: "2026-09-18", exp: "9999-12-31", life: true }, KEY);
  for (const when of ["2026-09-18", "2031-01-01", "2126-06-30"]) {
    const st = licenceStatus(key, new Date(when + "T10:00:00"));
    assert.equal(st.valid, true, `à vie doit être valide le ${when}`);
    assert.equal(st.lifetime, true);
    assert.equal(st.expiringSoon, false);
    assert.equal(st.expiresAt, "à vie");
    assert.equal(warningBanner(st), "");
  }
});

test("licence À VIE : une v1.6 déjà installée l'accepte aussi (exp lointain, pas seulement le drapeau)", () => {
  // Ce que fait emettre-licence.mjs --a-vie : exp « 9999-12-31 » ET life: true.
  const key = mint({ v: 1, org: "Cabinet Ancien", seats: 1, iat: "2026-09-18", exp: "9999-12-31", life: true }, KEY);
  const payload = parseKey(key).payload;
  // Logique de la v1.6 : date d'expiration lue telle quelle.
  const expires = new Date(payload.exp + "T23:59:59");
  assert.ok(!Number.isNaN(expires.getTime()) && expires > new Date("2126-01-01"));
});

test("une licence à vie falsifiée (drapeau ajouté à une clé datée) est refusée", () => {
  const key = mint({ v: 1, org: "Malin", seats: 1, iat: "2026-01-01", exp: "2026-02-01" }, KEY);
  const [head, body, sig] = key.split(".");
  const p = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  p.life = true;
  const forged = `${head}.${b64urlEncode(Buffer.from(JSON.stringify(p), "utf8"))}.${sig}`;
  const st = licenceStatus(forged);
  assert.equal(st.valid, false);
  assert.match(st.reason, /signature invalide/);
});

/* v2.27 — la caisse en ligne (Polar) : ses licences portent src « polar »,
   et le renouvellement renvoie vers la page où l'on récupère la nouvelle clé. */
test("licence vendue en ligne : source « polar », renouvellement par hiddentokens.com/activer", async () => {
  const { mint } = await import("./licence-test.mjs");
  const { ACTIVATION_URL, publicKeys } = await import("../server/licence.js");
  const cle = mint({ v: 1, org: "Cabinet en ligne", seats: 3, iat: "2026-10-25", exp: "2027-10-25", id: "ab12cd34", src: "polar" });
  const bientot = licenceStatus(cle, new Date("2027-10-10T10:00:00"));
  assert.equal(bientot.valid, true);
  assert.equal(bientot.source, "polar");
  assert.equal(bientot.seats, 3);
  assert.match(warningBanner(bientot), new RegExp(ACTIVATION_URL.replace(/[.]/g, "\\.")));
  assert.match(warningBanner(bientot), /se renouvelle tout seul/);
  const grace = licenceStatus(cle, new Date("2027-11-01T10:00:00"));
  assert.match(warningBanner(grace), /^⏳ .*Votre abonnement en ligne se renouvelle tout seul/);
  // Une licence émise à la main garde le renouvellement par commande.
  const main = licenceStatus(mint({ v: 1, org: "X", seats: 1, iat: "2026-10-25", exp: "2027-10-25", id: "ef56ab78" }), new Date("2027-10-10T10:00:00"));
  assert.equal(main.source, "");
  assert.doesNotMatch(warningBanner(main), /se renouvelle tout seul/);
  // La clé publique de la caisse fait partie des clés de confiance, à côté de la maîtresse.
  const der = publicKeys().map((k) => k.export({ format: "der", type: "spki" }).toString("base64"));
  assert.ok(der.includes("MCowBQYDK2VwAyEA6lNO1wNtFUg7ul6KmGbDoki50F6rJrtI+BHCEUfZ0cc="), "clé de caisse absente");
  assert.ok(der.includes("MCowBQYDK2VwAyEA2ecQy6JVQUtn9e+yrbuzQf7I9dcplI8T6dr2fiWTovY="), "clé maîtresse absente");
});
