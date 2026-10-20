// Devis et factures : les totaux et le montant en lettres doivent être justes —
// une facture fausse se paie en crédibilité.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chiffrer, enLettres, montantEnLettres, renderDocument } from "../scripts/devis-lib.mjs";

test("tarifs : Solo, Équipe, postes supplémentaires, remise, TVA 20 %", () => {
  assert.deepEqual([chiffrer({ offre: "solo" }).ht, chiffrer({ offre: "solo" }).ttc], [500, 600]);
  const eq = chiffrer({ offre: "equipe", postes: 20 });
  assert.equal(eq.lignes.length, 1);
  assert.equal(eq.ttc, 6000);
  const big = chiffrer({ offre: "equipe", postes: 25 });
  assert.equal(big.lignes[1].qte, 5);
  assert.equal(big.ht, 6000);
  assert.equal(big.tva, 1200);
  const remise = chiffrer({ offre: "equipe", postes: 20, remisePct: 10 });
  assert.equal(remise.ht, 4500);
  assert.equal(remise.ttc, 5400);
  assert.throws(() => chiffrer({ offre: "or" }));
});

test("montant en lettres (orthographe traditionnelle)", () => {
  const cases = { 0: "zéro", 1: "un", 21: "vingt et un", 71: "soixante et onze", 80: "quatre-vingts", 81: "quatre-vingt-un",
    91: "quatre-vingt-onze", 100: "cent", 200: "deux cents", 201: "deux cent un", 1000: "mille", 2000: "deux mille",
    6000: "six mille", 80000: "quatre-vingt mille", 200000: "deux cent mille", 1200000: "un million deux cent mille" };
  for (const [n, w] of Object.entries(cases)) assert.equal(enLettres(Number(n)), w, `${n}`);
  assert.equal(montantEnLettres(6000), "six mille dirhams");
  assert.equal(montantEnLettres(5400.5), "cinq mille quatre cents dirhams et cinquante centimes");
});

test("la facture porte l'ICE des deux parties, sans zone « bon pour accord »", () => {
  const html = renderDocument({ type: "facture", numero: "FA-2026-014", date: "2026-10-21",
    vendeur: { raison: "YGH", ice: "111111111111111", rib: "000" }, client: { raison: "Client SA", ice: "222222222222222" },
    calcul: chiffrer({ offre: "equipe", postes: 20 }) });
  assert.match(html, /FACTURE/);
  assert.match(html, /ICE : 111111111111111/);
  assert.match(html, /ICE : 222222222222222/);
  assert.match(html, /six mille dirhams TTC/);
  assert.ok(!/Bon pour accord/.test(html));
  const devis = renderDocument({ type: "devis", numero: "DEV-1", date: "2026-10-21", vendeur: { raison: "YGH" }, client: { raison: "X" }, calcul: chiffrer({ offre: "solo" }) });
  assert.match(devis, /Valable jusqu'au : 2026-11-20/);
  assert.match(devis, /Bon pour accord/);
});
