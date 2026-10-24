// ============================================================================
// LA FEUILLE DE SECOURS — les secrets du registre sur papier, au coffre.
//
// K_codes et K_registre[1..g] sont sérialisés, encodés en base32 (alphabet
// RFC 4648 : A–Z et 2–7, pas de 0/1/8 ambigus), groupés par 4, avec une somme
// de contrôle en tête. Une feuille tapée avec une faute est refusée, jamais
// « presque » restaurée. Pas de QR : la console n'a aucune dépendance.
// ============================================================================
import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const FORMAT_FEUILLE = "HT1";

export class FeuilleInvalide extends Error {}

export function base32(buf) {
  let bits = 0, valeur = 0, out = "";
  for (const b of buf) {
    valeur = (valeur << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPHABET[(valeur >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(valeur << (5 - bits)) & 31];
  return out;
}

export function debase32(txt) {
  let bits = 0, valeur = 0;
  const out = [];
  for (const c of txt) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new FeuilleInvalide(`caractère inattendu « ${c} »`);
    valeur = (valeur << 5) | i; bits += 5;
    if (bits >= 8) { out.push((valeur >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/* Octets : [version 1][nb générations 1][K_codes 32][g1 1][K 32]… */
function serialiser(secrets) {
  const gens = Object.keys(secrets.kRegistre).map(Number).sort((a, b) => a - b);
  const parts = [Buffer.from([1, gens.length]), secrets.kCodes];
  for (const g of gens) parts.push(Buffer.from([g]), secrets.kRegistre[g]);
  return Buffer.concat(parts);
}

function deserialiser(buf) {
  if (buf[0] !== 1) throw new FeuilleInvalide("version de feuille inconnue");
  const n = buf[1];
  if (buf.length !== 2 + 32 + n * 33) throw new FeuilleInvalide("longueur inattendue");
  const kCodes = buf.subarray(2, 34);
  const kRegistre = {};
  for (let i = 0; i < n; i++) { const o = 34 + i * 33; kRegistre[buf[o]] = buf.subarray(o + 1, o + 33); }
  return { kCodes, kRegistre };
}

export function groupes(secrets) {
  const octets = serialiser(secrets);
  const somme = crypto.createHash("sha256").update(octets).digest().subarray(0, 3);
  return (FORMAT_FEUILLE + "-" + base32(Buffer.concat([somme, octets])).match(/.{1,4}/g).join("-")).split("-");
}

/* Relit ce que l'utilisateur a tapé (espaces, tirets, minuscules tolérés). */
export function lireGroupes(texte) {
  const brut = String(texte).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!brut.startsWith(FORMAT_FEUILLE)) throw new FeuilleInvalide("ce n'est pas une feuille de secours Hidden Tokens (HT1)");
  const buf = debase32(brut.slice(FORMAT_FEUILLE.length));
  const somme = buf.subarray(0, 3), octets = buf.subarray(3);
  if (!crypto.createHash("sha256").update(octets).digest().subarray(0, 3).equals(somme)) throw new FeuilleInvalide("somme de contrôle fausse : une lettre est mal recopiée");
  return deserialiser(octets);
}

export function pageFeuille(secrets, { organisation, registre, generation, maintenant = new Date() }) {
  const g = groupes(secrets);
  const lignes = [];
  for (let i = 0; i < g.length; i += 6) lignes.push(g.slice(i, i + 6).join("  "));
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Feuille de secours — Hidden Tokens</title>
<style>body{font:14px/1.5 -apple-system,Helvetica,Arial;margin:40px;color:#0B0D12}h1{font-size:20px;border-bottom:4px solid #7C5CFF;padding-bottom:8px}pre{font:16px/1.9 ui-monospace,Menlo,monospace;background:#F5F5F8;padding:16px;letter-spacing:1px}.warn{border:2px solid #0B0D12;padding:12px;margin:16px 0}</style></head><body>
<h1>Feuille de secours du registre — Hidden Tokens</h1>
<p>Organisation <strong>${esc(organisation)}</strong> · registre <strong>${esc(registre)}</strong> · génération <strong>${generation}</strong> · imprimée le ${esc(maintenant.toISOString().slice(0, 10))}.</p>
<div class="warn"><strong>Ce papier vaut toutes les correspondances de votre organisation.</strong> À ranger au coffre, jamais photographié, jamais envoyé. Après un retrait de poste, imprimer une nouvelle feuille (la génération change).</div>
<pre>${lignes.join("\n")}</pre>
<p>Restauration : <code>hidden-tokens-admin restaurer --poste pst_… </code> puis recopier les groupes ci-dessus. Une lettre fausse est détectée ; rien n'est restauré « à peu près ».</p>
</body></html>`;
}
