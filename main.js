const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, Menu } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { scanRoot } = require('./lib/scan');
const { SessionStore } = require('./lib/sessions');
const { Media } = require('./lib/media');

const HOME = os.homedir();
let win = null;
let config = { roots: [] };
let configFile = '';
let media = null;
let sessions = null;
let library = []; // resultado da última varredura
const assetByPath = new Map();

// ---------- configuração ----------
function loadConfig() {
  configFile = path.join(app.getPath('userData'), 'config.json');
  try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch {
    const def = path.join(HOME, 'Documents', 'CLAUDE');
    config = { roots: fs.existsSync(def) ? [def] : [] };
  }
  if (!Array.isArray(config.roots)) config.roots = [];
}
function saveConfig() {
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

// ---------- janela ----------
function createWindow() {
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: '#0f1014',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 19 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // links externos abrem no navegador, nunca dentro do app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) e.preventDefault();
  });
  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const template = [
    { role: 'appMenu' },
    {
      label: 'Arquivo',
      submenu: [
        { label: 'Adicionar pasta…', accelerator: 'CmdOrCtrl+O', click: () => win && win.webContents.send('menu', 'add-root') },
        { label: 'Atualizar biblioteca', accelerator: 'CmdOrCtrl+R', click: () => win && win.webContents.send('menu', 'rescan') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'togglefullscreen' },
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- miniaturas de HTML (captura fora da tela) ----------
let htmlBusy = false;
const htmlWaiting = [];
function htmlDims(file) {
  let head = '';
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(6000);
    const n = fs.readSync(fd, buf, 0, 6000, 0);
    fs.closeSync(fd);
    head = buf.slice(0, n).toString('utf8');
  } catch { /* usa o padrão */ }
  let w = 0, h = 0;
  const vp = /name=["']viewport["'][^>]*content=["'][^"']*width=(\d+)[^"']*height=(\d+)/i.exec(head);
  if (vp) { w = +vp[1]; h = +vp[2]; }
  if (!w) {
    const dw = /data-width=["'](\d+)["']/i.exec(head);
    const dh = /data-height=["'](\d+)["']/i.exec(head);
    if (dw && dh) { w = +dw[1]; h = +dh[1]; }
  }
  const dir = path.dirname(file);
  const extra = { composition: /data-composition-id=/.test(head) || fs.existsSync(path.join(dir, 'hyperframes.json')), hasDev: false };
  try { extra.hasDev = !!JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts.dev; } catch { /* sem package.json */ }
  if (!w || !h || w > 4096 || h > 4096) return { width: 1280, height: 800, fixed: false, ...extra };
  return { width: w, height: h, fixed: true, ...extra };
}

function captureHtml(asset) {
  return new Promise((resolve) => {
    htmlWaiting.push({ asset, resolve });
    pumpHtml();
  });
}
async function pumpHtml() {
  if (htmlBusy || !htmlWaiting.length) return;
  htmlBusy = true;
  const { asset, resolve } = htmlWaiting.shift();
  let result = { thumb: '' };
  let w = null;
  try {
    const dims = htmlDims(asset.path);
    const out = path.join(media.thumbDir, media.key(asset) + '.jpg');
    w = new BrowserWindow({
      show: false,
      width: dims.width,
      height: dims.height,
      useContentSize: true,
      webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    w.webContents.setAudioMuted(true);
    w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    await Promise.race([
      w.loadFile(asset.path),
      new Promise((r) => setTimeout(r, 6000)),
    ]);
    await new Promise((r) => setTimeout(r, 1400));
    const img = await w.webContents.capturePage();
    if (!img.isEmpty()) {
      const small = img.resize({ width: 640, quality: 'good' });
      await fs.promises.writeFile(out, small.toJPEG(80));
      result = media.setThumb(asset, out, { width: dims.width, height: dims.height, fixed: dims.fixed });
    }
  } catch { /* fica sem miniatura */ }
  if (w && !w.isDestroyed()) w.destroy();
  resolve(result);
  htmlBusy = false;
  pumpHtml();
}

// ---------- Claude Code ----------
function findClaude() {
  const cands = [
    path.join(HOME, '.local', 'bin', 'claude'),
    path.join(HOME, '.claude', 'local', 'claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
  ];
  const ok = (p) => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } };
  const hit = cands.find(ok);
  if (hit) return hit;
  // o atalho em ~/.local/bin quebra quando o app do Claude atualiza: procura a versão instalada
  const base = path.join(HOME, 'Library', 'Application Support', 'Claude', 'claude-code');
  try {
    const versions = fs.readdirSync(base).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const v of versions) {
      let builds = [];
      try { builds = fs.readdirSync(path.join(base, v)); } catch { continue; }
      const found = builds
        .map((b) => path.join(base, v, b, 'claude.app', 'Contents', 'MacOS', 'claude'))
        .filter(ok)
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      if (found.length) return found[0];
    }
  } catch { /* sem app do Claude */ }
  return null;
}
const shq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";

function openInTerminal({ cwd, sessionId, prompt, raw }) {
  const claude = raw ? null : findClaude();
  if (!raw && !claude) return { ok: false, error: 'Não encontrei o comando "claude" neste Mac.' };
  if (!cwd || !fs.existsSync(cwd)) return { ok: false, error: 'A pasta não existe mais: ' + (cwd || '?') };
  const dir = path.join(app.getPath('userData'), 'run');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = Date.now();
  let lines = ['#!/bin/zsh -l', 'clear', 'cd ' + shq(cwd) + ' || exit 1'];
  let cmd = raw || shq(claude);
  if (!raw && sessionId) cmd += ' --resume ' + shq(sessionId);
  if (!raw && prompt && prompt.trim()) {
    const pf = path.join(dir, 'pedido-' + stamp + '.txt');
    fs.writeFileSync(pf, prompt);
    cmd += ' "$(cat ' + shq(pf) + ')"';
  }
  lines.push('exec ' + cmd);
  const script = path.join(dir, 'claude-' + stamp + '.command');
  fs.writeFileSync(script, lines.join('\n') + '\n', { mode: 0o755 });
  spawn('/usr/bin/open', ['-a', 'Terminal', script], { detached: true, stdio: 'ignore' }).unref();
  // limpa scripts antigos
  try {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (Date.now() - fs.statSync(p).mtimeMs > 24 * 3600 * 1000) fs.unlinkSync(p);
    }
  } catch { /* tanto faz */ }
  return { ok: true };
}

// ---------- IPC ----------
function known(p) {
  // só mexe em caminhos que estão dentro das pastas da biblioteca
  return typeof p === 'string' && config.roots.some((r) => p === r || p.startsWith(r + '/'));
}

function registerIpc() {
  ipcMain.handle('state', () => ({ roots: config.roots, home: HOME, hasFfmpeg: !!media.ffmpeg, hasClaude: !!findClaude() }));

  ipcMain.handle('roots:add', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Adicionar pasta à biblioteca',
      buttonLabel: 'Adicionar',
      properties: ['openDirectory', 'multiSelections', 'createDirectory'],
    });
    if (r.canceled) return config.roots;
    for (const p of r.filePaths) {
      const clean = p.replace(/\/+$/, '');
      if (!config.roots.includes(clean)) config.roots.push(clean);
    }
    saveConfig();
    return config.roots;
  });

  ipcMain.handle('roots:remove', (e, p) => {
    config.roots = config.roots.filter((r) => r !== p);
    saveConfig();
    return config.roots;
  });

  ipcMain.handle('scan', async () => {
    library = await Promise.all(config.roots.map((r) => scanRoot(r)));
    assetByPath.clear();
    for (const lib of library) for (const a of lib.assets) assetByPath.set(a.path, a);
    return library;
  });

  ipcMain.handle('media:info', async (e, p, front) => {
    const a = assetByPath.get(p);
    if (!a) return { thumb: '' };
    if (a.kind === 'html') {
      const k = media.key(a);
      const c = media.meta[k];
      if (c && c.thumb && fs.existsSync(c.thumb)) return c;
      return captureHtml(a);
    }
    return media.info(a, !!front);
  });

  ipcMain.handle('media:htmlDims', (e, p) => (known(p) ? htmlDims(p) : null));

  ipcMain.handle('media:proxy', async (e, p) => {
    const a = assetByPath.get(p);
    if (!a) return { ok: false, error: 'Arquivo fora da biblioteca.' };
    try { return { ok: true, file: await media.proxy(a) }; } catch (err) { return { ok: false, error: String(err.stderr || err.message).slice(0, 400) }; }
  });

  ipcMain.handle('sessions:index', async () => sessions.index(config.roots, (done, total) => {
    if (win && (done % 5 === 0 || done === total)) win.webContents.send('sessions:progress', { done, total });
  }));
  ipcMain.handle('sessions:for', (e, p, isDir) => sessions.forPath(p, !!isDir));
  ipcMain.handle('sessions:refine', (e, p, list) => sessions.refine(p, list));
  ipcMain.handle('sessions:transcript', async (e, file) => {
    const s = sessions.sessions.find((x) => x.file === file);
    if (!s) return [];
    return sessions.transcript(file);
  });
  ipcMain.handle('claude:open', (e, opts) => {
    if (opts.sessionFile) {
      const s = sessions.sessions.find((x) => x.file === opts.sessionFile);
      if (!s) return { ok: false, error: 'Conversa não encontrada.' };
      return openInTerminal({ cwd: s.cwd, sessionId: s.id, prompt: opts.prompt });
    }
    if (!known(opts.cwd)) return { ok: false, error: 'Pasta fora da biblioteca.' };
    return openInTerminal({ cwd: opts.cwd, prompt: opts.prompt });
  });

  ipcMain.handle('project:dev', (e, dir) => {
    if (!known(dir)) return { ok: false, error: 'Pasta fora da biblioteca.' };
    try {
      if (!JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts.dev) throw new Error('sem dev');
    } catch { return { ok: false, error: 'Este projeto não tem o comando de preview (npm run dev).' }; }
    return openInTerminal({ cwd: dir, raw: 'npm run dev' });
  });

  ipcMain.handle('shell:reveal', (e, p) => { if (known(p)) shell.showItemInFolder(p); });
  ipcMain.handle('shell:open', (e, p) => (known(p) ? shell.openPath(p) : 'fora da biblioteca'));
}

// ---------- ganchos de teste (só em desenvolvimento) ----------
async function devHooks() {
  if (app.isPackaged || !process.env.ACERVO_TEST) return;
  const out = process.env.ACERVO_SHOT_DIR || os.tmpdir();
  const steps = JSON.parse(fs.readFileSync(process.env.ACERVO_TEST, 'utf8'));
  await new Promise((r) => win.webContents.once('did-finish-load', r));
  for (const s of steps) {
    await new Promise((r) => setTimeout(r, s.wait || 800));
    if (s.size) win.setContentSize(s.size[0], s.size[1]);
    if (s.js) {
      try {
        const res = await win.webContents.executeJavaScript(s.js, true);
        if (res !== undefined) console.log('[test]', s.name || '', JSON.stringify(res));
      } catch (err) { console.log('[test-error]', s.name || '', String(err)); }
    }
    if (s.shot) {
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(out, s.shot), img.toPNG());
    }
  }
  app.quit();
}

app.whenReady().then(() => {
  loadConfig();
  const cache = path.join(app.getPath('userData'), 'cache');
  media = new Media(cache);
  sessions = new SessionStore(path.join(cache, 'sessions-index.json'));
  registerIpc();
  buildMenu();
  createWindow();
  if (process.env.ACERVO_TEST) {
    win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) console.log('[console]', e.message); });
  }
  devHooks();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => app.quit());
