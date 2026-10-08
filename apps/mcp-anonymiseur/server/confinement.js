// ============================================================================
// AUDIT DE CONFINEMENT — ce que le verrou ne peut pas empêcher, on le DIT.
//
// Le connecteur garantit que SES réponses ne contiennent aucune valeur
// réelle. Il ne peut pas empêcher Claude de lire vos originaux par une
// AUTRE porte, si vous la lui avez ouverte :
//   - une autre extension qui a accès au même dossier (Filesystem…) ;
//   - un serveur MCP déclaré dans claude_desktop_config.json ;
//   - le dossier partagé du mode Cowork ;
//   - le pilotage du navigateur ou de l'écran (un navigateur ouvre un PDF
//     local, une capture d'écran montre un Excel ouvert).
// Et une fuite qui ne passe pas par Claude du tout : un dossier de travail
// SYNCHRONISÉ (iCloud, Google Drive, Dropbox, OneDrive) emporte la clé de
// correspondance — donc toutes les vraies valeurs — hors du poste.
//
// L'audit lit la configuration LOCALE de Claude Desktop (jamais le réseau),
// n'en garde que des noms d'extensions et des chemins, et ne cite rien
// d'autre. Il ne modifie rien : il nomme le risque et le geste qui le ferme.
// ============================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function claudeConfigDir(platform = process.platform, env = process.env, home = os.homedir()) {
  if (platform === "darwin") return path.join(home, "Library", "Application Support", "Claude");
  if (platform === "win32") return path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), "Claude");
  return path.join(env.XDG_CONFIG_HOME || path.join(home, ".config"), "Claude");
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function real(p) {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

function expandHome(p, home) {
  return String(p).replace(/^~(?=$|[\\/])/, home);
}

function looksLikePath(v) {
  return typeof v === "string" && (/^(?:\/|~[\\/]|~$)/.test(v) || /^[A-Za-z]:[\\/]/.test(v));
}

/* Deux chemins se recouvrent si l'un contient l'autre. */
export function overlaps(a, b) {
  const A = real(a);
  const B = real(b);
  const inside = (c, p) => {
    const r = path.relative(p, c);
    return r === "" || (!r.startsWith("..") && !path.isAbsolute(r));
  };
  return inside(A, B) || inside(B, A);
}

function collectPaths(value, home, out = []) {
  if (Array.isArray(value)) { for (const v of value) collectPaths(v, home, out); return out; }
  if (value && typeof value === "object") { for (const v of Object.values(value)) collectPaths(v, home, out); return out; }
  if (looksLikePath(value)) out.push(expandHome(value, home));
  return out;
}

const CLOUD_MARKERS = [
  { rx: /[\\/]Library[\\/]CloudStorage[\\/]GoogleDrive/i, name: "Google Drive" },
  { rx: /[\\/]Library[\\/]CloudStorage[\\/]OneDrive/i, name: "OneDrive" },
  { rx: /[\\/]Library[\\/]CloudStorage[\\/]Dropbox/i, name: "Dropbox" },
  { rx: /[\\/]Library[\\/]CloudStorage[\\/]Box/i, name: "Box" },
  { rx: /[\\/]Library[\\/]CloudStorage[\\/]/i, name: "un service de stockage en ligne" },
  { rx: /[\\/]Library[\\/]Mobile Documents[\\/]/i, name: "iCloud Drive" },
  { rx: /[\\/]iCloud ?Drive[\\/]?/i, name: "iCloud Drive" },
  { rx: /[\\/]Dropbox(?:[\\/]|$)/i, name: "Dropbox" },
  { rx: /[\\/]OneDrive(?:[ -][^\\/]*)?(?:[\\/]|$)/i, name: "OneDrive" },
  { rx: /[\\/](?:Google Drive|My Drive|Mon Drive)(?:[\\/]|$)/i, name: "Google Drive" },
  { rx: /[\\/]pCloud ?Drive(?:[\\/]|$)/i, name: "pCloud" },
];

/* Le dossier de travail part-il dans le cloud ? Renvoie le nom du service
   ou "". Cas piège sur Mac : l'option iCloud « Bureau et Documents » laisse
   ~/Documents à sa place mais le synchronise — on la repère par le dossier
   miroir dans iCloud Drive. */
export function cloudSync(workdir, { home = os.homedir(), platform = process.platform } = {}) {
  const p = real(workdir);
  for (const c of CLOUD_MARKERS) if (c.rx.test(p)) return c.name;
  if (platform === "darwin") {
    const cloudDocs = path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs");
    for (const d of ["Documents", "Desktop"]) {
      if (overlaps(p, path.join(home, d)) && fs.existsSync(path.join(cloudDocs, d))) {
        return `iCloud Drive (option « Bureau et Documents »)`;
      }
    }
  }
  return "";
}

/* Audit complet. ctx : { workdir, keyFiles, selfId, shown, home, platform, env }
   Renvoie { findings: [{ level: "ok"|"info"|"risque", text }], risks }. */
export function auditConfinement(ctx) {
  const home = ctx.home || os.homedir();
  const shown = ctx.shown || ((p) => p);
  const selfRx = ctx.selfRx || /anonymiseur-ai4x/i;
  const dir = claudeConfigDir(ctx.platform, ctx.env, home);
  const findings = [];
  const risk = (text) => findings.push({ level: "risque", text });
  const info = (text) => findings.push({ level: "info", text });
  const ok = (text) => findings.push({ level: "ok", text });

  // 1. Extensions (.mcpb / .dxt) installées dans Claude Desktop.
  let overlapping = 0;
  const settingsDir = path.join(dir, "Claude Extensions Settings");
  let extFiles = [];
  try { extFiles = fs.readdirSync(settingsDir).filter((f) => f.endsWith(".json")); } catch {}
  for (const f of extFiles) {
    const id = f.replace(/\.json$/, "");
    if (selfRx.test(id)) continue;
    const settings = readJson(path.join(settingsDir, f)) || {};
    if (settings.isEnabled === false) continue;
    const manifest = readJson(path.join(dir, "Claude Extensions", id, "manifest.json")) || {};
    const name = manifest.display_name || manifest.name || id.split(".").pop();
    const paths = collectPaths(settings.userConfig || {}, home);
    const hit = paths.find((p) => overlaps(p, ctx.workdir));
    if (hit) {
      overlapping++;
      risk(`L'extension « ${name} » a accès à ${shown(hit)}, qui recouvre votre dossier de travail : Claude peut y lire ` +
        `vos originaux SANS passer par le verrou. → Retirez ce dossier de ses autorisations (Réglages → Extensions → ${name}), ` +
        `ou désactivez-la pendant que vous travaillez sur des dossiers sensibles.`);
    }
    if (/chrome|browser|navigat|computer|screen|[eé]cran/i.test(`${id} ${name}`)) {
      info(`L'extension « ${name} » permet à Claude de piloter le navigateur ou l'écran : un navigateur peut ouvrir un ` +
        `fichier local, une capture montre ce qui est affiché. Nanomizer interdit à Claude de s'en servir sur vos ` +
        `dossiers, mais pour une étanchéité totale, désactivez-la pendant vos dossiers sensibles.`);
    }
  }

  // 2. Serveurs MCP déclarés à la main + dossier Cowork.
  const cfg = readJson(path.join(dir, "claude_desktop_config.json")) || {};
  for (const [name, srv] of Object.entries(cfg.mcpServers || {})) {
    if (selfRx.test(name) || selfRx.test(JSON.stringify(srv.args || []))) continue;
    const paths = collectPaths([srv.args || [], srv.env || {}], home).filter((p) => !/\.(?:js|mjs|cjs|py|exe|json)$/i.test(p));
    const hit = paths.find((p) => overlaps(p, ctx.workdir));
    if (hit) {
      overlapping++;
      risk(`Le serveur MCP « ${name} » (claude_desktop_config.json) a accès à ${shown(hit)}, qui recouvre votre dossier ` +
        `de travail : Claude peut y lire vos originaux sans passer par le verrou. → Retirez ce chemin de sa configuration.`);
    }
  }
  if (cfg.coworkUserFilesPath && overlaps(expandHome(cfg.coworkUserFilesPath, home), ctx.workdir)) {
    overlapping++;
    risk(`Le dossier du mode Cowork (${shown(expandHome(cfg.coworkUserFilesPath, home))}) recouvre votre dossier de ` +
      `travail : en Cowork, Claude y lit les fichiers directement. → Choisissez des dossiers séparés.`);
  }
  if (!overlapping) ok("Aucune autre extension ni aucun serveur MCP n'a accès à votre dossier de travail.");

  // 3. Synchronisation cloud du dossier (donc de la clé).
  const cloud = cloudSync(ctx.workdir, { home, platform: ctx.platform || process.platform });
  if (cloud) {
    risk(`Votre dossier de travail est synchronisé avec ${cloud} : la clé de correspondance — qui contient TOUTES les ` +
      `vraies valeurs — quitte votre poste à chaque enregistrement. → Choisissez un dossier de travail hors ` +
      `synchronisation (réglages de l'extension), puis redémarrez Claude Desktop.`);
  } else {
    ok("Le dossier de travail n'est pas dans un dossier synchronisé repéré (iCloud, Google Drive, Dropbox, OneDrive).");
  }

  // 4. Droits de la clé (Mac / Linux).
  if ((ctx.platform || process.platform) !== "win32") {
    const loose = (ctx.keyFiles || []).filter((p) => {
      try { return (fs.statSync(p).mode & 0o077) !== 0; } catch { return false; }
    });
    if (loose.length) info(`${loose.length} fichier(s) de clé lisibles par d'autres comptes de ce poste — corrigé au prochain enregistrement.`);
    else ok("Clé de correspondance lisible par votre seul compte.");
  }

  return { findings, risks: findings.filter((f) => f.level === "risque").length };
}
