// Aides partagées par les tests. Coût scrypt réduit : les tests vérifient la
// logique, pas la résistance à la force brute.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { creerCabinet, ouvrirCabinet } from "../lib/cabinet.js";
import { modeleSource } from "../lib/politique.js";

export const PHRASE = "correct cheval pile agrafe";
export const COUT_TEST = { N: 2 ** 10, r: 8, p: 1 };
export const MAINTENANT = new Date("2026-10-21T09:00:00Z");

export function cabinetDeTest(nom = "Cabinet Test") {
  const cabinet = creerCabinet({ nom, phrase: PHRASE, cout: COUT_TEST, maintenant: MAINTENANT });
  return { cabinet, ouvert: ouvrirCabinet(cabinet, PHRASE) };
}

export function dossierTemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "nanomizer-admin-test-"));
}

/* Source valide avec de vrais noms de clients fictifs. */
export function sourceDeTest() {
  const s = modeleSource();
  s.emise_par = "admin@cabinet-test.fr";
  s.equipes[0].membres = ["s.alaoui@cabinet-test.fr"];
  s.equipes[0].responsables = ["associe@cabinet-test.fr"];
  s.alertes.admin_technique = ["it@cabinet-test.fr"];
  s.regles[0].noms = ["SARL Benjelloun Frères", "Benjelloun", "Ets Moreau-Lefèvre"];
  return s;
}

export const NOMS_TEST = ["Benjelloun", "Moreau", "Lefèvre", "Lefevre"];
