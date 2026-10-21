// US-3 — enrôler un poste : il n'accepte ensuite que les politiques du cabinet.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  creerEnrolement, ecrireEnrolement, importerEnrolement, verifierSignature, EnrolementInvalide,
} from "../lib/enrolement.js";
import { compilerPolitique, signerPolitique } from "../lib/politique.js";
import { cabinetDeTest, dossierTemp, sourceDeTest, MAINTENANT } from "./aide.js";

function enroler(c = cabinetDeTest()) {
  const enr = creerEnrolement(c.cabinet, c.ouvert, {
    utilisateur: "S.Alaoui@cabinet-test.fr", dossierPartage: "/Volumes/NAS/nanomizer", maintenant: MAINTENANT,
  });
  return { ...c, enr, poste: importerEnrolement(enr, MAINTENANT) };
}

function politiqueSignee({ cabinet, ouvert }, version = 1) {
  const { politique } = compilerPolitique(sourceDeTest(), { cabinet, sel: ouvert.sel, version, maintenant: MAINTENANT });
  return signerPolitique(politique, ouvert.clePrivee, cabinet.cle.id);
}

test("l'enrôlement épingle la clé et le sel du cabinet", () => {
  const { cabinet, ouvert, enr, poste } = enroler();
  assert.match(enr.poste.id, /^pst_[0-9a-f]{8}$/);
  assert.equal(enr.poste.utilisateur, "s.alaoui@cabinet-test.fr");
  assert.equal(poste.cle.publique, cabinet.cle.publique);
  assert.equal(poste.sel, ouvert.sel.toString("base64"));
  assert.equal(poste.version_max, 0);
});

test("le fichier d'enrôlement ne contient pas la clé privée", () => {
  const { ouvert, enr } = enroler();
  const pkcs8 = ouvert.clePrivee.export({ format: "der", type: "pkcs8" }).toString("base64");
  assert.ok(!JSON.stringify(enr).includes(pkcs8));
});

test("champs manquants ou invalides : refus clair", () => {
  const { cabinet, ouvert } = cabinetDeTest();
  assert.throws(() => creerEnrolement(cabinet, ouvert, { utilisateur: "pas-un-email", dossierPartage: "/x" }), EnrolementInvalide);
  assert.throws(() => creerEnrolement(cabinet, ouvert, { utilisateur: "a@b.fr" }), /dossier partagé/);
});

test("un fichier d'enrôlement dont la clé a été remplacée est refusé", () => {
  const a = enroler();
  const b = cabinetDeTest("Autre");
  const trafique = { ...a.enr, cle: { ...a.enr.cle, publique: b.cabinet.cle.publique } };
  assert.throws(() => importerEnrolement(trafique), /incohérent/);
});

test("écrit sous enrolement-<poste>.nanomizer, droits restreints, sans écraser", () => {
  const { enr } = enroler();
  const d = dossierTemp();
  const f = ecrireEnrolement(d, enr);
  assert.ok(f.endsWith(`enrolement-${enr.poste.id}.nanomizer`));
  if (process.platform !== "win32") assert.equal(fs.statSync(f).mode & 0o777, 0o600); // pas de droits POSIX sous Windows
  assert.throws(() => ecrireEnrolement(d, enr), /EEXIST/);
});

test("le poste accepte une politique signée par son cabinet", () => {
  const c = enroler();
  const { octets, signature } = politiqueSignee(c);
  const r = verifierSignature(c.poste, octets, signature);
  assert.equal(r.ok, true, r.raison);
  assert.equal(r.politique.version, 1);
});

test("le poste refuse une politique signée par une autre clé (critère US-3)", () => {
  const c = enroler();
  const intrus = cabinetDeTest("Intrus");
  // L'intrus forge une politique au nom du bon cabinet, avec sa propre clé.
  const { politique } = compilerPolitique(sourceDeTest(), {
    cabinet: c.cabinet, sel: intrus.ouvert.sel, version: 99, maintenant: MAINTENANT,
  });
  const forge = signerPolitique(politique, intrus.ouvert.clePrivee, intrus.cabinet.cle.id);
  assert.match(verifierSignature(c.poste, forge.octets, forge.signature).raison, /autre clé/);
  // Même en recopiant l'identifiant de la bonne clé, la signature ne tient pas.
  const usurpe = signerPolitique(politique, intrus.ouvert.clePrivee, c.cabinet.cle.id);
  const r = verifierSignature(c.poste, usurpe.octets, usurpe.signature);
  assert.equal(r.ok, false);
  assert.equal(r.etat, "ALTEREE");
});

test("un seul octet modifié après signature : ALTEREE (critère d'acceptation 1)", () => {
  const c = enroler();
  const { octets, signature } = politiqueSignee(c);
  const trafique = Buffer.from(octets);
  const i = trafique.indexOf("bloquer");
  trafique[i] = "B".charCodeAt(0);
  const r = verifierSignature(c.poste, trafique, signature);
  assert.equal(r.ok, false);
  assert.equal(r.etat, "ALTEREE");
});

test("une politique valide d'un autre cabinet est refusée", () => {
  const c = enroler();
  const autre = cabinetDeTest("Autre");
  // Même clé épinglée simulée : on teste ici le contrôle d'identité du cabinet.
  const posteAutreCabinet = { ...c.poste, cabinet: { id: autre.cabinet.id, nom: "Autre" } };
  const { octets, signature } = politiqueSignee(c);
  assert.match(verifierSignature(posteAutreCabinet, octets, signature).raison, /autre cabinet/);
});
