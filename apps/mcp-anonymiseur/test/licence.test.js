// Tests de la licence — la vérification est locale et cryptographique.
// L'horloge est injectée : un test qui dépend de la date du jour est un test
// qui cassera un matin.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseKey, licenceStatus, readLicence, blockedMessage, warningBanner, b64urlEncode, isUnsubstituted } from "../server/licence.js";

/* Émet une clé signée par la VRAIE clé privée si elle est disponible sur ce
   poste ; sinon, les tests de signature valide sont ignorés (un contributeur
   sans la clé privée doit quand même pouvoir lancer la suite). */
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

const KEY = privateKeyOrNull();
const skip = KEY ? false : "clé privée absente de ce poste";

test("une clé absente ou malformée est refusée, avec une raison lisible", () => {
  assert.equal(parseKey("").ok, false);
  assert.match(parseKey("").reason, /absente/);
  assert.match(parseKey("bonjour").reason, /format inconnu/);
  assert.match(parseKey("NANO1.abc").reason, /format inconnu/);
});

test("une clé inventée ou modifiée est rejetée par la signature", { skip }, () => {
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

test("statut : valide, bientôt expirée, expirée — sur une horloge injectée", { skip }, () => {
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

  const expiree = licenceStatus(key, new Date("2027-01-05T10:00:00"));
  assert.equal(expiree.valid, false);
  assert.match(expiree.reason, /expirée/);
});

test("le message de blocage vend, ne punit pas, et promet le décodage", { skip }, () => {
  const key = mint({ v: 1, org: "X", seats: 1, iat: "2026-01-01", exp: "2026-01-02" }, KEY);
  const msg = blockedMessage(licenceStatus(key, new Date("2026-06-01")));
  assert.match(msg, /expiré/);
  assert.match(msg, /DÉ-ANONYMISATION/);
  assert.match(msg, /jamais prises en otage/);
  assert.match(msg, /anonymiseur-donnees/);       // l'appli gratuite reste
  assert.match(msg, /#plans/);                     // et la voie du renouvellement
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
