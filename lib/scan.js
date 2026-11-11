// Varre as pastas da biblioteca e devolve a lista de arquivos de mídia.
const fs = require('fs');
const path = require('path');

const KINDS = {
  video: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi'],
  html: ['html', 'htm'],
  audio: ['wav', 'mp3', 'm4a', 'aac', 'aif', 'aiff', 'flac', 'ogg'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'],
};
const EXT_KIND = {};
for (const [kind, exts] of Object.entries(KINDS)) for (const e of exts) EXT_KIND[e] = kind;

const SKIP_DIRS = new Set([
  'node_modules', 'bower_components', '__pycache__', 'venv', 'site-packages',
  'DerivedData', 'Pods', 'Library', 'dist', '$RECYCLE.BIN',
]);
const SKIP_SUFFIX = ['.app', '.framework', '.xcodeproj', '.xcworkspace', '.photoslibrary', '.fcpbundle', '.bundle', '.plugin'];
const MAX_DEPTH = 9;
const MAX_IMAGES_PER_DIR = 80; // acima disso é sequência de frames: ignora
const MAX_ASSETS = 60000;

function skipDir(name) {
  if (name.startsWith('.')) return true;
  if (SKIP_DIRS.has(name)) return true;
  return SKIP_SUFFIX.some((s) => name.endsWith(s));
}

async function scanRoot(root) {
  const assets = [];
  let truncated = false;

  async function walk(dir, depth) {
    if (assets.length >= MAX_ASSETS) { truncated = true; return; }
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch { return; }

    const files = [];
    const dirs = [];
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!skipDir(e.name)) dirs.push(e.name);
      } else if (e.isFile()) {
        if (e.name.startsWith('.')) continue;
        const ext = path.extname(e.name).slice(1).toLowerCase();
        const kind = EXT_KIND[ext];
        if (kind) files.push({ name: e.name, ext, kind });
      }
    }

    const imageCount = files.reduce((n, f) => n + (f.kind === 'image' ? 1 : 0), 0);
    const keep = imageCount > MAX_IMAGES_PER_DIR ? files.filter((f) => f.kind !== 'image') : files;

    await Promise.all(keep.map(async (f) => {
      const full = path.join(dir, f.name);
      try {
        const st = await fs.promises.stat(full);
        assets.push({
          path: full,
          name: f.name,
          ext: f.ext,
          kind: f.kind,
          size: st.size,
          mtime: Math.round(st.mtimeMs),
          rel: path.relative(root, full),
        });
      } catch { /* arquivo sumiu no meio da varredura */ }
    }));

    if (depth >= MAX_DEPTH) return;
    for (const d of dirs) await walk(path.join(dir, d), depth + 1);
  }

  let exists = true;
  try { await fs.promises.access(root); } catch { exists = false; }
  if (exists) await walk(root, 0);
  return { root, name: path.basename(root), exists, truncated, assets };
}

module.exports = { scanRoot, KINDS };
