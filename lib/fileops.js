// Ações de arquivo do menu de botão direito, no mesmo padrão do Finder.
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

const run = (bin, args, opts = {}) => new Promise((resolve, reject) => {
  execFile(bin, args, { maxBuffer: 8 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
    if (err) { err.stderr = String(stderr || ''); reject(err); } else resolve(String(stdout));
  });
});

const exists = (p) => fs.promises.lstat(p).then(() => true, () => false);

function splitName(name, isDir) {
  if (isDir) return [name, ''];
  const ext = path.extname(name);
  if (!ext || ext === name) return [name, ''];
  return [name.slice(0, -ext.length), ext];
}

// "nome cópia.mp4", "nome cópia 2.mp4"… como o Finder em português
async function freeName(dir, base, ext, suffix) {
  let n = 1;
  for (;;) {
    const name = base + (suffix ? ' ' + suffix : '') + (n > 1 ? ' ' + n : '') + ext;
    const full = path.join(dir, name);
    if (!(await exists(full))) return full;
    n++;
  }
}

function checkName(name) {
  const n = String(name || '').trim();
  if (!n) return 'O nome não pode ficar vazio.';
  if (n.includes('/') || n.includes(':')) return 'O nome não pode ter "/" nem ":".';
  if (n.startsWith('.')) return 'O nome não pode começar com ponto (o arquivo ficaria oculto).';
  if (Buffer.byteLength(n) > 255) return 'O nome é longo demais.';
  return null;
}

async function rename(src, newName) {
  const err = checkName(newName);
  if (err) throw new Error(err);
  const dest = path.join(path.dirname(src), newName.trim());
  if (dest === src) return src;
  // troca só de maiúsculas/minúsculas é permitida no mesmo item
  if (await exists(dest) && dest.toLowerCase() !== src.toLowerCase()) throw new Error('Já existe um item chamado "' + newName.trim() + '" nesta pasta.');
  await fs.promises.rename(src, dest);
  return dest;
}

async function copyTo(src, destDir, { suffix } = {}) {
  const st = await fs.promises.stat(src);
  const [base, ext] = splitName(path.basename(src), st.isDirectory());
  const dest = suffix !== undefined || path.dirname(src) === destDir
    ? await freeName(destDir, base, ext, suffix === undefined ? 'cópia' : suffix)
    : path.join(destDir, path.basename(src));
  if (await exists(dest)) throw new Error('Já existe "' + path.basename(dest) + '" no destino.');
  await fs.promises.cp(src, dest, { recursive: true, preserveTimestamps: true, errorOnExist: true, force: false, verbatimSymlinks: true });
  return dest;
}

async function moveTo(src, destDir) {
  const dest = path.join(destDir, path.basename(src));
  if (dest === src) return src;
  if ((destDir + '/').startsWith(src + '/')) throw new Error('Não dá para mover uma pasta para dentro dela mesma.');
  if (await exists(dest)) throw new Error('Já existe "' + path.basename(src) + '" no destino. Renomeie um dos dois antes de mover.');
  try {
    await fs.promises.rename(src, dest);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    // outro disco: copia tudo e só apaga o original se a cópia terminou
    await fs.promises.cp(src, dest, { recursive: true, preserveTimestamps: true, errorOnExist: true, force: false, verbatimSymlinks: true });
    await fs.promises.rm(src, { recursive: true, force: false });
  }
  return dest;
}

async function compress(src) {
  const st = await fs.promises.stat(src);
  const [base] = splitName(path.basename(src), st.isDirectory());
  const zip = await freeName(path.dirname(src), base, '.zip', '');
  // mesmo formato do "Comprimir" do Finder
  await run('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', src, zip], { timeout: 6 * 3600 * 1000 });
  return zip;
}

async function duplicate(src) {
  return copyTo(src, path.dirname(src), { suffix: 'cópia' });
}

// atalho de verdade do Finder (alias); se o macOS negar o controle do Finder, cria um link simbólico
async function makeAlias(src) {
  const dir = path.dirname(src);
  try {
    const out = await run('/usr/bin/osascript', [
      '-e', 'on run argv',
      '-e', 'tell application "Finder"',
      '-e', 'set a to make new alias file to (POSIX file (item 1 of argv) as alias) at (POSIX file (item 2 of argv) as alias)',
      '-e', 'return POSIX path of (a as alias)',
      '-e', 'end tell',
      '-e', 'end run',
      src, dir,
    ], { timeout: 20000 });
    return { file: out.trim().replace(/\/$/, ''), kind: 'alias' };
  } catch (e) {
    const st = await fs.promises.stat(src);
    const [base, ext] = splitName(path.basename(src), st.isDirectory());
    const link = await freeName(dir, base, ext, 'atalho');
    await fs.promises.symlink(src, link);
    return { file: link, kind: 'symlink', reason: String(e.stderr || e.message).slice(0, 200) };
  }
}

function getInfo(src) {
  return run('/usr/bin/osascript', [
    '-e', 'on run argv',
    '-e', 'tell application "Finder"',
    '-e', 'activate',
    '-e', 'open information window of (POSIX file (item 1 of argv) as alias)',
    '-e', 'end tell',
    '-e', 'end run',
    src,
  ], { timeout: 20000 });
}

// coloca o item na área de transferência como arquivo: dá para colar no Finder com ⌘V
function copyToClipboard(src) {
  const js = [
    'function run(argv) {',
    '  ObjC.import("AppKit");',
    '  var pb = $.NSPasteboard.generalPasteboard;',
    '  pb.clearContents;',
    '  pb.writeObjects($.NSArray.arrayWithObject($.NSURL.fileURLWithPath(argv[0])));',
    '}',
  ].join('\n');
  return run('/usr/bin/osascript', ['-l', 'JavaScript', '-e', js, src], { timeout: 10000 });
}

let quickLook = null;
function quickLookOpen(src) {
  if (quickLook && !quickLook.killed) { try { quickLook.kill(); } catch { /* já fechou */ } }
  quickLook = spawn('/usr/bin/qlmanage', ['-p', src], { stdio: 'ignore' });
  quickLook.on('exit', () => { quickLook = null; });
}

function openWith(appName, src) {
  return run('/usr/bin/open', ['-a', appName, src], { timeout: 20000 });
}

module.exports = { rename, copyTo, moveTo, compress, duplicate, makeAlias, getInfo, copyToClipboard, quickLookOpen, openWith, checkName };
