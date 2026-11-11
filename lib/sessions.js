// Lê o histórico de conversas do Claude Code (~/.claude/projects/*/*.jsonl)
// e liga cada conversa às pastas e arquivos da biblioteca.
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const HOME = os.homedir();
const PROJECTS_DIR = path.join(HOME, '.claude', 'projects');
const INDEX_VERSION = 3;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function rootPattern(roots) {
  const alts = [];
  for (const r of roots) {
    alts.push(escapeRe(r));
    if (r.startsWith(HOME + '/')) alts.push(escapeRe('~' + r.slice(HOME.length)));
  }
  if (!alts.length) return null;
  // raiz + até dois níveis de pasta/arquivo
  return new RegExp('(' + alts.join('|') + ')/([^/"\\\\\\n]{1,120})(?:/([^/"\\\\\\n]{1,120}))?', 'g');
}

function cleanSeg(s) {
  if (!s) return '';
  const cut = s.search(/['"`)(;&|<>*$\n\r\t]/);
  return (cut >= 0 ? s.slice(0, cut) : s).trim();
}

function lineAt(text, idx) {
  const start = text.lastIndexOf('\n', idx) + 1;
  let end = text.indexOf('\n', idx);
  if (end < 0) end = text.length;
  return text.slice(start, end);
}

function lastJsonWith(text, key) {
  const idx = text.lastIndexOf(key);
  if (idx < 0) return null;
  try { return JSON.parse(lineAt(text, idx)); } catch { return null; }
}

function cleanUserText(t) {
  if (typeof t !== 'string') return '';
  if (/^\s*\[Request interrupted by user[^\]]*\]\s*$/.test(t)) return '';
  const isCommand = t.includes('<command-name>');
  const out = cleanTags(t);
  return isCommand ? out.replace(/\s+/g, ' ').trim() : out;
}

function cleanTags(t) {
  return t
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, '')
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, '')
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, '')
    .replace(/<command-args>([\s\S]*?)<\/command-args>/g, ' $1')
    .replace(/<command-name>([\s\S]*?)<\/command-name>/g, '$1')
    .replace(/<ide_[a-z_]+>[\s\S]*?<\/ide_[a-z_]+>/g, '')
    .replace(/<\/?pasted_content[^>]*>/g, '')
    .trim();
}

function userTextOf(message) {
  if (!message) return '';
  const c = message.content;
  if (typeof c === 'string') return cleanUserText(c);
  if (Array.isArray(c)) {
    return c.filter((b) => b && b.type === 'text').map((b) => cleanUserText(b.text)).filter(Boolean).join('\n\n');
  }
  return '';
}

function firstUserPrompt(text) {
  let pos = 0;
  for (let i = 0; i < 400 && pos < text.length; i++) {
    let end = text.indexOf('\n', pos);
    if (end < 0) end = text.length;
    const line = text.slice(pos, end);
    pos = end + 1;
    if (line.length > 400000 || !line.includes('"user"')) continue;
    try {
      const o = JSON.parse(line);
      if (o.type !== 'user' || o.isSidechain || o.isMeta) continue;
      const t = userTextOf(o.message);
      if (t && !t.startsWith('/')) return t;
    } catch { /* linha quebrada */ }
  }
  return '';
}

async function indexOne(file, stat, re, roots) {
  const text = await fs.promises.readFile(file, 'utf8');
  const id = path.basename(file, '.jsonl');

  const custom = lastJsonWith(text, '"customTitle"');
  const ai = lastJsonWith(text, '"aiTitle"');
  const last = lastJsonWith(text, '"lastPrompt"');
  const first = firstUserPrompt(text);

  const cwdM = /"cwd":\s*"((?:[^"\\]|\\.)*)"/.exec(text);
  let cwd = '';
  if (cwdM) { try { cwd = JSON.parse('"' + cwdM[1] + '"'); } catch { cwd = cwdM[1]; } }

  const tsFirst = /"timestamp":\s*"([^"]+)"/.exec(text);
  const tsIdx = text.lastIndexOf('"timestamp":');
  const tsLast = tsIdx >= 0 ? /"timestamp":\s*"([^"]+)"/.exec(text.slice(tsIdx, tsIdx + 80)) : null;

  // conta menções às pastas da biblioteca
  const tally = {};
  let keys = 0;
  const bump = (k, n) => {
    if (!k) return;
    if (tally[k] === undefined) { if (keys >= 600) return; keys++; tally[k] = 0; }
    tally[k] += n;
  };
  if (re) {
    re.lastIndex = 0;
    let m;
    let guard = 0;
    while ((m = re.exec(text)) && guard++ < 200000) {
      const root = m[1].startsWith('~') ? HOME + m[1].slice(1) : m[1];
      const ri = roots.indexOf(root);
      if (ri < 0) continue;
      const a = cleanSeg(m[2]);
      if (!a) continue;
      bump(ri + '|' + a, 1);
      // só desce um nível se o primeiro segmento veio inteiro
      if (a === m[2] && m[3]) {
        const b = cleanSeg(m[3]);
        if (b) bump(ri + '|' + a + '/' + b, 1);
      }
    }
  }
  // a pasta onde a conversa rodou conta bastante
  for (let ri = 0; ri < roots.length; ri++) {
    const r = roots[ri];
    if (cwd.startsWith(r + '/')) {
      const segs = cwd.slice(r.length + 1).split('/');
      bump(ri + '|' + segs[0], 40);
      if (segs[1]) bump(ri + '|' + segs[0] + '/' + segs[1], 40);
    }
  }

  const title = (custom && custom.customTitle) || (ai && ai.aiTitle) || first.split('\n')[0].slice(0, 90) || 'Conversa sem título';
  const userCount = (text.match(/"type":\s*"user"/g) || []).length;

  return {
    id,
    file,
    title,
    first: first.slice(0, 280),
    last: last && last.lastPrompt ? cleanUserText(String(last.lastPrompt)).slice(0, 280) : '',
    cwd,
    started: tsFirst ? Date.parse(tsFirst[1]) : Math.round(stat.birthtimeMs),
    updated: tsLast ? Date.parse(tsLast[1]) : Math.round(stat.mtimeMs),
    size: stat.size,
    mtime: Math.round(stat.mtimeMs),
    turns: userCount,
    tally,
  };
}

class SessionStore {
  constructor(cacheFile) {
    this.cacheFile = cacheFile;
    this.sessions = [];
    this.roots = [];
    this.fileHits = new Map(); // "sessão|arquivo" -> contagem exata
    this.indexing = null;
  }

  async index(roots, onProgress) {
    if (this.indexing) return this.indexing;
    this.indexing = this._index(roots, onProgress).finally(() => { this.indexing = null; });
    return this.indexing;
  }

  async _index(roots, onProgress) {
    const sig = INDEX_VERSION + '::' + roots.join('::');
    let cache = {};
    try {
      const raw = JSON.parse(await fs.promises.readFile(this.cacheFile, 'utf8'));
      if (raw.sig === sig) cache = raw.items || {};
    } catch { /* sem cache ainda */ }

    const files = [];
    let dirs = [];
    try { dirs = await fs.promises.readdir(PROJECTS_DIR, { withFileTypes: true }); } catch { /* sem histórico */ }
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const dir = path.join(PROJECTS_DIR, d.name);
      let names = [];
      try { names = await fs.promises.readdir(dir); } catch { continue; }
      // conversas automáticas de plugins (observadores) não entram
      if (/observer-sessions/.test(d.name)) continue;
      for (const n of names) if (n.endsWith('.jsonl')) files.push(path.join(dir, n));
    }

    const re = rootPattern(roots);
    const out = [];
    const next = {};
    let done = 0;
    let dirty = false;
    for (const file of files) {
      let st;
      try { st = await fs.promises.stat(file); } catch { continue; }
      const hit = cache[file];
      let item;
      if (hit && hit.mtime === Math.round(st.mtimeMs) && hit.size === st.size) {
        item = hit;
      } else {
        try { item = await indexOne(file, st, re, roots); dirty = true; } catch { item = null; }
      }
      done++;
      if (onProgress) onProgress(done, files.length);
      if (!item) continue;
      next[file] = item;
      // conversas automáticas (observadores, sem nenhuma mensagem humana) ficam de fora
      if (item.turns > 0 && item.first) out.push(item);
    }
    if (dirty || Object.keys(cache).length !== Object.keys(next).length) {
      try {
        await fs.promises.mkdir(path.dirname(this.cacheFile), { recursive: true });
        await fs.promises.writeFile(this.cacheFile, JSON.stringify({ sig, items: next }));
      } catch { /* cache é opcional */ }
    }
    out.sort((a, b) => b.updated - a.updated);
    this.sessions = out;
    this.roots = roots.slice();
    this.fileHits.clear();
    return this.list();
  }

  list() {
    return this.sessions.map(({ tally, ...rest }) => rest);
  }

  // pontuação de uma conversa para um caminho dentro de uma raiz
  _score(s, ri, segs) {
    const t = s.tally;
    const get = (key) => {
      const v = t[ri + '|' + key];
      if (v) return v;
      // segmento que veio com lixo de linha de comando ("pasta && npm run ...")
      let sum = 0;
      const pre = ri + '|' + key + ' ';
      for (const k in t) if (k.startsWith(pre)) sum += t[k];
      return sum;
    };
    let score = 0;
    if (segs.length >= 1) score += get(segs[0]);
    if (segs.length >= 2) score += get(segs[0] + '/' + segs[1]) * 3;
    return score;
  }

  forPath(target, isDir) {
    const ri = this.roots.findIndex((r) => target === r || target.startsWith(r + '/'));
    if (ri < 0) return [];
    const rel = target.slice(this.roots[ri].length + 1);
    if (!rel) return [];
    const segs = rel.split('/');
    // para arquivo, o segundo nível só conta se for pasta
    const use = isDir ? segs.slice(0, 2) : segs.slice(0, Math.min(2, Math.max(1, segs.length - 1)));
    const res = [];
    for (const s of this.sessions) {
      const score = this._score(s, ri, use);
      if (score > 0) {
        const { tally, ...rest } = s;
        res.push({ ...rest, score, exact: 0 });
      }
    }
    res.sort((a, b) => b.score - a.score || b.updated - a.updated);
    return res.slice(0, 40);
  }

  // segunda passada: quais conversas citam exatamente este arquivo
  async refine(target, list) {
    const base = path.basename(target);
    const generic = /^(index|main|app|style|styles|output|out|final|video|audio|render)\.[a-z0-9]+$/i.test(base) || base.length < 9;
    const out = [];
    for (const s of list.slice(0, 25)) {
      const key = s.file + '|' + target;
      let exact = this.fileHits.get(key);
      if (exact === undefined) {
        exact = 0;
        try {
          const text = await fs.promises.readFile(s.file, 'utf8');
          const count = (needle, cap) => {
            let n = 0, i = 0;
            while (n < cap && (i = text.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
            return n;
          };
          exact = count(target, 200) * 4;
          if (!generic) exact += count(base, 200);
        } catch { /* conversa removida */ }
        this.fileHits.set(key, exact);
      }
      out.push({ ...s, exact });
    }
    out.sort((a, b) => (b.exact > 0) - (a.exact > 0) || b.exact - a.exact || b.score - a.score || b.updated - a.updated);
    return out.concat(list.slice(25));
  }

  async transcript(file) {
    const messages = [];
    const push = (role, ts, block) => {
      const prev = messages[messages.length - 1];
      if (prev && prev.role === role && role === 'assistant') prev.blocks.push(block);
      else messages.push({ role, ts, blocks: [block] });
    };
    const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line || line.length > 3000000) continue;
      if (!line.includes('"user"') && !line.includes('"assistant"')) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      if (o.isSidechain || o.isMeta || o.isCompactSummary) continue;
      const ts = o.timestamp ? Date.parse(o.timestamp) : 0;
      if (o.type === 'user') {
        const t = userTextOf(o.message);
        if (t) push('user', ts, { t: 'text', text: t.slice(0, 20000) });
      } else if (o.type === 'assistant' && o.message && Array.isArray(o.message.content)) {
        for (const b of o.message.content) {
          if (b.type === 'text' && b.text && b.text.trim()) {
            push('assistant', ts, { t: 'text', text: b.text.slice(0, 20000) });
          } else if (b.type === 'tool_use') {
            push('assistant', ts, { t: 'tool', name: b.name, info: toolInfo(b) });
          }
        }
      }
    }
    return messages;
  }
}

function toolInfo(b) {
  const i = b.input || {};
  if (i.file_path) return path.basename(String(i.file_path));
  if (i.description) return String(i.description).slice(0, 120);
  if (i.command) return String(i.command).split('\n')[0].slice(0, 120);
  if (i.pattern) return String(i.pattern).slice(0, 80);
  if (i.url) return String(i.url).slice(0, 100);
  if (i.query) return String(i.query).slice(0, 100);
  if (i.prompt) return String(i.prompt).slice(0, 100);
  return '';
}

module.exports = { SessionStore, PROJECTS_DIR };
