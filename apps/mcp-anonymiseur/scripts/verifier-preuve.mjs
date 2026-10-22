#!/usr/bin/env node
// Vérifie, hors ligne, une page de preuve Nanomizer (journal « Ce que Claude a
// vu » ou rapport de couverture) : signature et empreinte.
//   node scripts/verifier-preuve.mjs "/chemin/CE-QUE-CLAUDE-A-VU.html"
// Code de sortie 0 si la preuve tient, 1 sinon. Rien ne part sur le réseau.
import fs from "node:fs";
import { verifyAttestedHtml, decrireVerification } from "../server/attestation.js";
import { publicKeys } from "../server/licence.js";

const f = process.argv[2];
if (!f) { console.error("usage : verifier-preuve.mjs <page.html>"); process.exit(2); }
let html;
try { html = fs.readFileSync(f, "utf8"); } catch (e) { console.error(`✗ fichier illisible : ${e.message}`); process.exit(2); }
const v = verifyAttestedHtml(html, publicKeys());
console.log(decrireVerification(v));
process.exit(v.ok ? 0 : 1);
