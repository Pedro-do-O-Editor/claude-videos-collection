/* Acervo — interface */
'use strict';

const api = window.acervo;
const $ = (id) => document.getElementById(id);

// ---------- utilidades ----------
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const fileUrl = (p) => 'file://' + p.split('/').map(encodeURIComponent).join('/');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const I = {
  grid: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>',
  clock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.2 1.6"/></svg>',
  chat: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2.5 3.5h11v7.5H7l-3 2.5V11H2.5z"/></svg>',
  folder: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M1.8 4.2h4.3l1.5 1.6h6.6v6.9H1.8z"/></svg>',
  folderFill: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.6h4.9l1.5 1.6h6.6v7.9h-13z"/></svg>',
  chev: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5L8 6l-3.5 3.5"/></svg>',
  plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" width="13" height="13"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>',
  refresh: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M13.2 2.5v3h-3"/></svg>',
  back: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3L4.5 8l5 5"/></svg>',
  fwd: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3l5 5-5 5"/></svg>',
  play: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 3.8v12.4a.6.6 0 0 0 .9.5l10-6.2a.6.6 0 0 0 0-1L6.9 3.3a.6.6 0 0 0-.9.5z"/></svg>',
  pause: '<svg viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="3.5" width="3.6" height="13" rx="1"/><rect x="11.4" y="3.5" width="3.6" height="13" rx="1"/></svg>',
  loop: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V6a2 2 0 0 1 2-2h7"/><path d="M10.5 2l2 2-2 2"/><path d="M13 9v1a2 2 0 0 1-2 2H4"/><path d="M5.5 14l-2-2 2-2"/></svg>',
  vol: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6v4h2.6L8.5 13V3L5.1 6z"/><path d="M11 5.8a3.2 3.2 0 0 1 0 4.4"/></svg>',
  mute: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6v4h2.6L8.5 13V3L5.1 6z"/><path d="M11 6.2l3 3.6M14 6.2l-3 3.6"/></svg>',
  full: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
  panel: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M10 3v10"/></svg>',
  code: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12l-8 8 8 8M26 12l8 8-8 8M22.5 9l-5 22"/></svg>',
  wave: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 17v6M12 11v18M18 15v10M24 7v26M30 13v14M36 18v4"/></svg>',
  film: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="5" y="8" width="30" height="24" rx="3"/><path d="M17 15v10l8-5z" fill="currentColor"/></svg>',
  image: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="5" y="8" width="30" height="24" rx="3"/><circle cx="14" cy="16" r="2.5"/><path d="M6 28l9-8 7 6 5-4 8 6"/></svg>',
  list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 4h10M3 8h10M3 12h10"/></svg>',
  send: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5l12.5 5.5L2 13.500l1.800-5.500z"/></svg>',
};
const icon = (name, cls) => h('span', { class: cls || 'ico', html: I[name] });

const KIND_LABEL = { video: 'Vídeos', html: 'HTML', audio: 'Áudio', image: 'Imagens' };
const KIND_ONE = { video: 'Vídeo', html: 'Composição HTML', audio: 'Áudio', image: 'Imagem' };
const KIND_GLYPH = { video: 'film', html: 'code', audio: 'wave', image: 'image' };

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
  return b.toFixed(b >= 100 || i === 0 ? 0 : 1).replace('.', ',') + ' ' + u[i];
}
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function fmtDate(ms, withTime) {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  let s;
  if (diff === 0) s = 'Hoje';
  else if (diff === 1) s = 'Ontem';
  else s = d.getDate() + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : '');
  return withTime || diff <= 1 ? s + ', ' + time : s;
}
function fmtDur(s) {
  if (!s || !isFinite(s)) return '';
  s = Math.round(s);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return (hh ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0');
}
function timecode(t, fps) {
  if (!isFinite(t) || t < 0) t = 0;
  const hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = Math.floor(t % 60);
  const p = (n) => String(n).padStart(2, '0');
  let s = (hh ? p(hh) + ':' : '') + p(mm) + ':' + p(ss);
  if (fps) s += ':' + p(Math.min(Math.round(fps) - 1, Math.floor((t % 1) * fps + 0.0001)));
  return s;
}
const dirOf = (p) => p.slice(0, p.lastIndexOf('/'));
const baseOf = (p) => p.slice(p.lastIndexOf('/') + 1);

let toastTimer = null;
function toast(msg, isErr) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('err', !!isErr);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, isErr ? 6000 : 2600);
}

// ---------- estado ----------
const prefs = (() => {
  let p = {};
  try { p = JSON.parse(localStorage.getItem('acervo.prefs') || '{}'); } catch { /* padrão */ }
  return Object.assign({ kinds: ['video', 'html'], sort: 'date', card: 240, flat: false, panel: true, open: {} }, p);
})();
const savePrefs = () => { try { localStorage.setItem('acervo.prefs', JSON.stringify(prefs)); } catch { /* sem armazenamento */ } };

const S = {
  env: { roots: [], home: '' },
  libs: [],          // [{root, name, exists, assets, tree}]
  nav: { mode: 'folder', path: null }, // folder | recent | sessions
  query: '',
  sessions: [],
  sessionsReady: false,
  viewer: null,
  infoCache: new Map(),
};

// ---------- árvore ----------
function buildTree(lib) {
  const root = { name: lib.name, path: lib.root, dirs: new Map(), assets: [], all: [], parent: null };
  for (const a of lib.assets) {
    const parts = a.rel.split('/');
    let node = root;
    node.all.push(a);
    for (let i = 0; i < parts.length - 1; i++) {
      let next = node.dirs.get(parts[i]);
      if (!next) {
        next = { name: parts[i], path: node.path + '/' + parts[i], dirs: new Map(), assets: [], all: [], parent: node };
        node.dirs.set(parts[i], next);
      }
      node = next;
      node.all.push(a);
    }
    node.assets.push(a);
  }
  return root;
}
function nodeAt(p) {
  for (const lib of S.libs) {
    if (p === lib.root) return lib.tree;
    if (p && p.startsWith(lib.root + '/')) {
      let node = lib.tree;
      for (const part of p.slice(lib.root.length + 1).split('/')) {
        node = node.dirs.get(part);
        if (!node) return null;
      }
      return node;
    }
  }
  return null;
}
const rootOf = (p) => (S.libs.find((l) => p === l.root || p.startsWith(l.root + '/')) || {}).root || null;

const kindOn = (a) => prefs.kinds.includes(a.kind);
function matches(a) {
  if (!kindOn(a)) return false;
  if (!S.query) return true;
  return a.rel.toLowerCase().includes(S.query);
}
function sortAssets(list) {
  const by = prefs.sort;
  const out = list.slice();
  if (by === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }));
  else if (by === 'size') out.sort((a, b) => b.size - a.size);
  else out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

// ---------- miniaturas ----------
function getInfo(a, front) {
  const k = a.path + '|' + a.mtime;
  let p = S.infoCache.get(k);
  if (!p) {
    p = api.info(a.path, front).catch(() => ({ thumb: '' }));
    S.infoCache.set(k, p);
  }
  return p;
}
const lazy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    lazy.unobserve(e.target);
    if (e.target._load) e.target._load();
  }
}, { root: null, rootMargin: '300px' });

function setThumb(img, a, info) {
  let src = '';
  if (info && info.thumb) src = fileUrl(info.thumb);
  else if (a.kind === 'image') src = fileUrl(a.path);
  if (!src) return false;
  img.onload = () => img.classList.add('ready');
  img.src = src;
  return true;
}

// ---------- cartões ----------
function assetCard(a, list) {
  const img = h('img', { alt: '', draggable: 'false' });
  const dur = h('span', { class: 'badge dur', hidden: true });
  const thumb = h('div', { class: 'thumb' },
    h('div', { class: 'glyph', html: I[KIND_GLYPH[a.kind]] }),
    img,
    h('span', { class: 'badge kind ' + a.kind }, a.kind === 'html' ? 'HTML' : a.ext),
    dur,
    h('div', { class: 'scrubline' }));
  const sub = h('div', { class: 'sub' }, fmtDate(a.mtime) + ' · ' + fmtSize(a.size));
  const card = h('div', { class: 'card asset', tabindex: '0', title: a.rel },
    thumb,
    h('div', { class: 'meta' }, h('div', { class: 'name' }, a.name), sub));

  card._load = () => {
    getInfo(a).then((info) => {
      setThumb(img, a, info);
      if (info && info.duration) { dur.textContent = fmtDur(info.duration); dur.hidden = false; }
    });
  };
  lazy.observe(card);

  const open = () => openViewer(a, list);
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  if (a.kind === 'video') attachScrub(card, thumb, a);
  return card;
}

// passar o mouse sobre a miniatura percorre o vídeo
function attachScrub(card, thumb, a) {
  let video = null, timer = null, want = -1, busy = false;
  const line = thumb.querySelector('.scrubline');
  const seek = () => {
    if (!video || busy || want < 0 || !video.duration) return;
    busy = true;
    video.currentTime = want * video.duration;
    want = -1;
  };
  thumb.addEventListener('mouseenter', () => {
    timer = setTimeout(() => {
      video = h('video', { muted: true, preload: 'auto', playsinline: true });
      video.muted = true;
      video.style.opacity = '0';
      video.addEventListener('loadeddata', () => { if (video) { video.style.opacity = '1'; card.classList.add('scrubbing'); seek(); } });
      video.addEventListener('seeked', () => { busy = false; seek(); });
      video.addEventListener('error', () => { if (video) { video.remove(); video = null; } });
      video.src = fileUrl(a.path);
      thumb.insertBefore(video, line);
    }, 140);
  });
  thumb.addEventListener('mousemove', (e) => {
    const r = thumb.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    line.style.left = f * 100 + '%';
    want = f;
    seek();
  });
  thumb.addEventListener('mouseleave', () => {
    clearTimeout(timer);
    card.classList.remove('scrubbing');
    if (video) { video.removeAttribute('src'); video.load(); video.remove(); video = null; }
    busy = false; want = -1;
  });
}

function folderCard(node) {
  const items = node.all.filter(matches);
  const img = h('img', { alt: '', draggable: 'false' });
  const cover = sortAssets(items).find((a) => a.kind === 'video') || items.find((a) => a.kind === 'html') || items.find((a) => a.kind === 'image');
  const latest = items.reduce((m, a) => Math.max(m, a.mtime), 0);
  const card = h('div', { class: 'card folder', tabindex: '0', title: node.path },
    h('div', { class: 'thumb' },
      h('div', { class: 'glyph', html: I.folderFill }),
      img,
      h('div', { class: 'folder-tab', html: I.folderFill + '<span>' + items.length + (items.length === 1 ? ' item' : ' itens') + '</span>' })),
    h('div', { class: 'meta' },
      h('div', { class: 'name' }, node.name),
      h('div', { class: 'sub' }, latest ? 'Atualizada ' + fmtDate(latest).toLowerCase() : '')));
  if (cover) {
    card._load = () => getInfo(cover).then((info) => setThumb(img, cover, info));
    lazy.observe(card);
  }
  const open = () => go({ mode: 'folder', path: node.path });
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
  return card;
}

// ---------- navegação ----------
function go(nav) {
  S.nav = nav;
  if (nav.mode !== 'sessions') { S.query = ''; $('search').value = ''; }
  if (nav.mode === 'folder' && nav.path) { prefs.last = nav.path; savePrefs(); }
  render();
}

function render() {
  renderSidebar();
  renderCrumbs();
  const isSess = S.nav.mode === 'sessions';
  $('view-library').hidden = isSess;
  $('view-sessions').hidden = !isSess;
  $('search').parentElement.hidden = isSess;
  if (isSess) renderSessionsPage(); else renderLibrary();
}

function renderSidebar() {
  const nav = $('nav-main');
  nav.textContent = '';
  const total = S.libs.reduce((n, l) => n + l.assets.length, 0);
  const item = (ico, label, on, fn, n) => h('button', { class: 'nav-item' + (on ? ' on' : ''), onclick: fn }, icon(ico), h('span', null, label), n !== undefined ? h('span', { class: 'n' }, n) : null);
  nav.append(
    item('grid', 'Todos os arquivos', S.nav.mode === 'folder' && !S.nav.path, () => go({ mode: 'folder', path: null }), total || undefined),
    item('clock', 'Recentes', S.nav.mode === 'recent', () => go({ mode: 'recent' })),
    item('chat', 'Conversas', S.nav.mode === 'sessions', () => { SP.filter = null; go({ mode: 'sessions' }); }, S.sessionsReady ? S.sessions.length : undefined),
  );

  const tree = $('tree');
  tree.textContent = '';
  if (!S.libs.length) tree.append(h('div', { class: 'tree-empty' }, 'Nenhuma pasta ainda.'));
  const cur = S.nav.mode === 'folder' ? S.nav.path : null;
  for (const lib of S.libs) {
    const open = prefs.open[lib.root] !== false;
    const chev = h('span', { class: 'chev' + (open ? ' open' : ''), html: I.chev });
    chev.addEventListener('click', (e) => { e.stopPropagation(); prefs.open[lib.root] = !open; savePrefs(); renderSidebar(); });
    const rm = h('button', { class: 'x', title: 'Tirar esta pasta da biblioteca', html: I.x });
    rm.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Tirar "' + lib.name + '" da biblioteca?\n\nOs arquivos continuam no disco; a pasta só deixa de aparecer aqui.')) return;
      await api.removeRoot(lib.root);
      if (cur && (cur === lib.root || cur.startsWith(lib.root + '/'))) S.nav = { mode: 'folder', path: null };
      await reload();
    });
    tree.append(h('button', {
      class: 'tree-item' + (cur === lib.root ? ' on' : '') + (lib.exists ? '' : ' missing'),
      title: lib.root + (lib.exists ? '' : ' (não encontrada)'),
      onclick: () => go({ mode: 'folder', path: lib.root }),
    }, chev, icon('folder'), h('span', { class: 'label' }, lib.name), rm));
    if (!open) continue;
    const kids = [...lib.tree.dirs.values()].filter((n) => n.all.some(kindOn)).sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }));
    for (const n of kids) {
      const on = cur && (cur === n.path || cur.startsWith(n.path + '/'));
      tree.append(h('button', { class: 'tree-item child' + (on ? ' on' : ''), title: n.path, onclick: () => go({ mode: 'folder', path: n.path }) },
        icon('folder'), h('span', { class: 'label' }, n.name)));
    }
  }
}

function renderCrumbs() {
  const c = $('crumbs');
  c.textContent = '';
  const add = (label, fn, last) => {
    if (c.childNodes.length) c.append(h('span', { class: 'crumb-sep', html: I.chev, style: 'width:12px;height:12px;display:inline-flex' }));
    c.append(h('button', { class: 'crumb' + (last ? ' last' : ''), onclick: fn }, label));
  };
  if (S.nav.mode === 'recent') return add('Recentes', null, true);
  if (S.nav.mode === 'sessions') return add('Conversas', null, true);
  const p = S.nav.path;
  if (!p) return add('Todos os arquivos', null, true);
  const root = rootOf(p);
  if (!root) return add('Todos os arquivos', null, true);
  const parts = p === root ? [] : p.slice(root.length + 1).split('/');
  add(baseOf(root), () => go({ mode: 'folder', path: root }), !parts.length);
  let acc = root;
  parts.forEach((part, i) => {
    acc += '/' + part;
    const target = acc;
    add(part, () => go({ mode: 'folder', path: target }), i === parts.length - 1);
  });
}

function renderChips(scope) {
  const chips = $('chips');
  chips.textContent = '';
  const counts = { video: 0, html: 0, audio: 0, image: 0 };
  for (const a of scope) counts[a.kind]++;
  for (const k of Object.keys(KIND_LABEL)) {
    const on = prefs.kinds.includes(k);
    chips.append(h('button', {
      class: 'chip' + (on ? ' on' : ''),
      'aria-pressed': String(on),
      onclick: () => {
        prefs.kinds = on ? prefs.kinds.filter((x) => x !== k) : prefs.kinds.concat(k);
        if (!prefs.kinds.length) prefs.kinds = [k];
        savePrefs(); render();
      },
    }, KIND_LABEL[k], h('span', { class: 'n' }, counts[k])));
  }
}

let renderToken = 0;
function renderLibrary() {
  const token = ++renderToken;
  const content = $('content');
  content.textContent = '';
  $('scroller').scrollTop = 0;
  document.documentElement.style.setProperty('--card', prefs.card + 'px');

  const segView = $('seg-view');
  segView.textContent = '';
  const mk = (flat, ico, title) => h('button', { class: prefs.flat === flat ? 'on' : '', title, html: I[ico], onclick: () => { prefs.flat = flat; savePrefs(); renderLibrary(); } });
  segView.append(mk(false, 'folder', 'Por pasta'), mk(true, 'list', 'Tudo junto'));

  if (!S.libs.length) {
    renderChips([]);
    $('count').textContent = '';
    $('btn-folder-sessions').hidden = true;
    content.append(h('div', { class: 'empty' },
      h('h2', null, 'Sua biblioteca está vazia'),
      h('p', null, 'Adicione a pasta onde ficam os vídeos e as composições HTML feitos com o Claude Code. O app lê a pasta sem mexer em nenhum arquivo.'),
      h('button', { class: 'btn', onclick: addRoot }, 'Adicionar pasta')));
    return;
  }

  let folders = [];
  let assets = [];
  let scope = [];
  const recent = S.nav.mode === 'recent';
  const searching = !!S.query;
  if (recent) {
    scope = S.libs.flatMap((l) => l.assets);
    assets = scope.filter(matches).sort((a, b) => b.mtime - a.mtime).slice(0, 300);
  } else if (!S.nav.path) {
    scope = S.libs.flatMap((l) => l.assets);
    if (prefs.flat || searching) assets = sortAssets(scope.filter(matches));
    else if (S.libs.length === 1) {
      const t = S.libs[0].tree;
      folders = [...t.dirs.values()];
      assets = sortAssets(t.assets.filter(matches));
    } else folders = S.libs.map((l) => l.tree);
  } else {
    const node = nodeAt(S.nav.path);
    if (!node) { S.nav = { mode: 'folder', path: null }; return render(); }
    scope = node.all;
    if (prefs.flat || searching) assets = sortAssets(node.all.filter(matches));
    else {
      folders = [...node.dirs.values()];
      assets = sortAssets(node.assets.filter(matches));
    }
  }
  renderChips(scope);
  $('seg-view').style.visibility = recent ? 'hidden' : '';
  $('sort').style.visibility = recent ? 'hidden' : '';
  $('btn-folder-sessions').hidden = !(S.nav.mode === 'folder' && S.nav.path && rootOf(S.nav.path) !== S.nav.path);

  folders = folders.filter((n) => n.all.some(matches));
  if (prefs.sort === 'name') folders.sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }));
  else {
    const latest = new Map(folders.map((n) => [n, n.all.reduce((m, a) => (matches(a) ? Math.max(m, a.mtime) : m), 0)]));
    folders.sort((a, b) => latest.get(b) - latest.get(a));
  }

  const nItems = assets.length;
  $('count').textContent = (folders.length ? folders.length + (folders.length === 1 ? ' pasta · ' : ' pastas · ') : '') + nItems + (nItems === 1 ? ' arquivo' : ' arquivos');

  if (!folders.length && !assets.length) {
    content.append(h('div', { class: 'empty' },
      h('h2', null, searching ? 'Nada encontrado' : 'Nenhum arquivo aqui'),
      h('p', null, searching ? 'Nenhum arquivo com "' + S.query + '" nos tipos selecionados.' : 'Não há arquivos dos tipos selecionados nesta pasta. Ative outro tipo nos filtros acima.')));
    return;
  }

  if (folders.length) {
    if (assets.length) content.append(h('div', { class: 'group-title' }, 'Pastas'));
    const g = h('div', { class: 'grid' });
    for (const n of folders) g.append(folderCard(n));
    content.append(g);
  }
  if (assets.length) {
    if (folders.length) content.append(h('div', { class: 'group-title' }, 'Arquivos'));
    const g = h('div', { class: 'grid' });
    content.append(g);
    const more = h('div', { class: 'more' });
    content.append(more);
    let i = 0;
    const page = () => {
      if (token !== renderToken) return;
      const end = Math.min(assets.length, i + 120);
      for (; i < end; i++) g.append(assetCard(assets[i], assets));
      if (i >= assets.length) { pager.disconnect(); more.remove(); }
    };
    const pager = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) page(); }, { rootMargin: '900px' });
    page();
    if (i < assets.length) pager.observe(more);
  }
}

// ---------- texto das conversas ----------
function mdToHtml(text) {
  const parts = text.split(/```/);
  let out = '';
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      const body = part.replace(/^[a-zA-Z0-9_+-]*\n/, '');
      out += '<pre><code>' + esc(body.replace(/\n$/, '')) + '</code></pre>';
      return;
    }
    let s = esc(part);
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    s = s.replace(/^#{1,4} +(.+)$/gm, '<span class="h">$1</span>');
    s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    out += s;
  });
  return out;
}

function messageEl(m) {
  const user = m.role === 'user';
  const wrap = h('div', { class: 'msg ' + (user ? 'user' : 'assistant') },
    h('div', { class: 'msg-who' },
      h('span', { class: 'avatar ' + (user ? 'user' : 'claude') }, user ? 'P' : 'C'),
      h('b', null, user ? 'Você' : 'Claude'),
      m.ts ? h('span', null, fmtDate(m.ts, true)) : null));
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const tools = run; run = [];
    const els = tools.map((b) => h('div', { class: 'tool' }, h('b', null, b.name.replace(/^mcp__.*__/, '')), h('span', null, b.info || '')));
    if (tools.length <= 2) { wrap.append(...els); return; }
    const box = h('div', { hidden: true }, els);
    const names = [...new Set(tools.map((b) => b.name.replace(/^mcp__.*__/, '')))].slice(0, 4).join(', ');
    const btn = h('button', { class: 'tools-more' }, tools.length + ' ações (' + names + ')');
    btn.addEventListener('click', () => { box.hidden = !box.hidden; });
    wrap.append(btn, box);
  };
  for (const b of m.blocks) {
    if (b.t === 'tool') { run.push(b); continue; }
    flush();
    wrap.append(h('div', { class: 'bubble', html: mdToHtml(b.text) }));
  }
  flush();
  return wrap;
}

function sessionItem(s, opts) {
  const el = h('button', { class: 'sess' + (opts.selected === s.file ? ' on' : ''), onclick: () => opts.onPick(s) },
    h('div', { class: 'sess-title' }, s.title),
    s.first && s.first.split('\n')[0].slice(0, 90) !== s.title ? h('div', { class: 'sess-prev' }, s.first) : null,
    h('div', { class: 'sess-meta' },
      h('span', null, fmtDate(s.updated)),
      h('span', null, '·'),
      h('span', null, s.turns + (s.turns === 1 ? ' mensagem' : ' mensagens')),
      s.exact > 0 ? h('span', { class: 'tag hit' }, 'cita este arquivo') : null));
  return el;
}

// caixa de pedido: abre o Claude Code no Terminal já com o texto
function composer({ session, asset, cwd }) {
  const ta = h('textarea', { rows: '2', placeholder: session ? 'Peça uma alteração para continuar esta conversa…' : 'Descreva o que quer mudar para começar uma conversa nova…' });
  const btn = h('button', { class: 'btn small' }, session ? 'Continuar no Claude' : 'Abrir no Claude');
  const send = async () => {
    const text = ta.value.trim();
    if (!session && !text) { ta.focus(); return; }
    let prompt = text;
    if (text && asset) prompt = 'Arquivo: ' + asset.path + '\n\n' + text;
    btn.disabled = true;
    const r = await api.openClaude(session ? { sessionFile: session.file, prompt } : { cwd, prompt });
    btn.disabled = false;
    if (r && r.ok) { ta.value = ''; toast('Abrindo o Claude Code no Terminal…'); } else toast((r && r.error) || 'Não foi possível abrir o Claude.', true);
  };
  btn.addEventListener('click', send);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } e.stopPropagation(); });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(150, ta.scrollHeight) + 'px'; });
  return h('div', { class: 'composer' },
    h('div', { class: 'composer-target' }, session ? 'Continuar:' : 'Nova conversa em', h('b', null, session ? session.title : baseOf(cwd || ''))),
    h('div', { class: 'composer-box' }, ta,
      h('div', { class: 'composer-row' }, h('span', { class: 'composer-hint' }, '⌘ Enter envia · abre no Terminal'), btn)));
}

function mountTranscript(container, s, { asset, onBack }) {
  container.textContent = '';
  const scroll = h('div', { class: 'chat-scroll' }, h('div', { class: 'chat-note' }, h('div', { class: 'spinner', style: 'margin:0 auto 12px' }), 'Abrindo conversa…'));
  container.append(
    h('div', { class: 'chat-head' },
      onBack ? h('button', { class: 'icon-btn', title: 'Voltar à lista', html: I.back, onclick: onBack }) : null,
      h('div', { class: 't' },
        h('div', { class: 't1', title: s.title }, s.title),
        h('div', { class: 't2', title: s.cwd }, fmtDate(s.started, true) + ' · ' + s.cwd.replace(S.env.home, '~')))),
    scroll,
    composer({ session: s, asset }));
  api.transcript(s.file).then((msgs) => {
    if (!scroll.isConnected) return;
    scroll.textContent = '';
    if (!msgs.length) { scroll.append(h('div', { class: 'chat-note' }, 'Esta conversa não tem mensagens de texto.')); return; }
    const frag = document.createDocumentFragment();
    for (const m of msgs) frag.append(messageEl(m));
    scroll.append(frag);
    scroll.scrollTop = scroll.scrollHeight;
  });
}

// ---------- página de conversas ----------
const SP = { query: '', selected: null, filter: null, list: [] };
async function renderSessionsPage() {
  const listEl = $('sess-list');
  const detail = $('sess-detail');
  const f = $('sess-filter');
  f.textContent = '';
  f.hidden = !SP.filter;
  if (SP.filter) {
    f.append(h('span', { title: SP.filter }, 'Só as que mexeram em ' + baseOf(SP.filter)),
      h('button', { class: 'icon-btn', title: 'Mostrar todas', html: I.x, style: 'width:20px;height:20px', onclick: () => { SP.filter = null; SP.selected = null; renderSessionsPage(); } }));
  }
  let list = S.sessions;
  if (SP.filter) list = await api.sessionsFor(SP.filter, true);
  if (S.nav.mode !== 'sessions') return;
  const q = SP.query;
  if (q) list = list.filter((s) => (s.title + ' ' + s.first + ' ' + s.last + ' ' + s.cwd).toLowerCase().includes(q));
  SP.list = list;
  listEl.textContent = '';
  if (!S.sessionsReady) listEl.append(h('div', { class: 'panel-note' }, h('div', { class: 'spinner', style: 'margin:0 auto 12px' }), 'Lendo o histórico do Claude Code…'));
  else if (!list.length) listEl.append(h('div', { class: 'panel-note' }, q || SP.filter ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa do Claude Code neste Mac.'));
  const pick = (s) => { SP.selected = s.file; renderSessionsPage(); };
  for (const s of list.slice(0, 400)) listEl.append(sessionItem(s, { selected: SP.selected, onPick: pick }));
  const sel = list.find((s) => s.file === SP.selected);
  if (sel) {
    if (detail.dataset.file !== sel.file) { detail.dataset.file = sel.file; mountTranscript(detail, sel, {}); }
  } else {
    detail.dataset.file = '';
    detail.textContent = '';
    detail.append(h('div', { class: 'chat-note', style: 'margin-top:16vh' }, 'Escolha uma conversa para ler o histórico e continuar de onde parou.'));
  }
}

// ---------- visualizador ----------
const V = { video: null, raf: 0, fps: 0, token: 0, chat: { mode: 'list', list: [], session: null } };

function openViewer(a, list) {
  const idx = list.indexOf(a);
  S.viewer = { asset: a, list, index: idx };
  $('viewer').hidden = false;
  showAsset();
}
function closeViewer() {
  if (document.fullscreenElement) document.exitFullscreen();
  teardownStage();
  S.viewer = null;
  $('viewer').hidden = true;
}
function step(d) {
  const v = S.viewer;
  if (!v) return;
  const i = v.index + d;
  if (i < 0 || i >= v.list.length) return;
  v.index = i; v.asset = v.list[i];
  showAsset();
}
function teardownStage() {
  cancelAnimationFrame(V.raf);
  if (V.video) { V.video.pause(); V.video.removeAttribute('src'); V.video.load(); }
  V.video = null;
  if (V.ro) { V.ro.disconnect(); V.ro = null; }
  $('stage').textContent = '';
}

function showAsset() {
  const { asset: a, list, index } = S.viewer;
  const token = ++V.token;
  teardownStage();
  $('v-name').textContent = a.name;
  $('v-path').textContent = dirOf(a.path).replace(S.env.home, '~');
  $('v-pos').textContent = (index + 1) + ' de ' + list.length;
  $('v-prev').disabled = index <= 0;
  $('v-next').disabled = index >= list.length - 1;
  $('viewer').querySelector('.viewer-body').classList.toggle('no-panel', !prefs.panel);
  $('v-panel').classList.toggle('on', prefs.panel);

  const playable = a.kind === 'video' || a.kind === 'audio';
  $('transport').hidden = !playable;
  $('htmlbar').hidden = a.kind !== 'html';
  V.fps = 0;
  $('t-meta').textContent = '';

  if (playable) mountPlayer(a, token);
  else if (a.kind === 'image') $('stage').append(h('img', { class: 'still', src: fileUrl(a.path), alt: a.name, draggable: 'false' }));
  else mountHtml(a, token);

  // painel
  V.chat = { mode: 'list', list: [], session: null };
  renderChatTab(token);
  renderInfoTab(a, null);
  getInfo(a, true).then((info) => {
    if (token !== V.token) return;
    renderInfoTab(a, info);
    if (info && info.fps) V.fps = info.fps;
    if (info && playable) {
      const bits = [];
      if (info.width) bits.push(info.width + '×' + info.height);
      if (info.fps) bits.push(String(info.fps).replace('.', ',') + ' fps');
      if (info.vcodec) bits.push(info.vcodec.toUpperCase());
      $('t-meta').textContent = bits.join(' · ');
      updateTime();
    }
  });
}

function mountPlayer(a, token) {
  const stage = $('stage');
  const video = h('video', { playsinline: true, preload: 'auto' });
  V.video = video;
  video.loop = !!prefs.loop;
  video.volume = prefs.vol === undefined ? 1 : prefs.vol;
  video.muted = !!prefs.muted;
  video.playbackRate = Number($('t-speed').value) || 1;
  stage.append(video);
  if (a.kind === 'audio') stage.append(h('div', { class: 'audio-art' }, h('span', { html: I.wave }), h('span', null, a.name)));
  video.addEventListener('click', togglePlay);
  video.addEventListener('play', syncPlay);
  video.addEventListener('pause', syncPlay);
  video.addEventListener('loadedmetadata', updateTime);
  video.addEventListener('timeupdate', updateTime);
  video.addEventListener('progress', updateTime);
  video.addEventListener('volumechange', syncVol);
  let triedProxy = false;
  const fail = async () => {
    if (token !== V.token || triedProxy) return;
    triedProxy = true;
    const ov = h('div', { class: 'overlay' }, h('div', { class: 'spinner' }), h('div', null, 'Este formato não toca direto no player.'), h('div', null, 'Convertendo uma cópia de preview (o original não é alterado)…'));
    stage.append(ov);
    const r = await api.proxy(a.path);
    if (token !== V.token) return;
    if (r.ok) { ov.remove(); video.src = fileUrl(r.file); video.play().catch(() => {}); } else {
      ov.textContent = '';
      ov.append(h('div', null, 'Não consegui gerar o preview deste arquivo.'), h('button', { class: 'btn ghost small', onclick: () => api.open(a.path) }, 'Abrir no app padrão'));
    }
  };
  video.addEventListener('error', fail);
  // vídeo que carrega mas não tem imagem decodificável (ex.: ProRes)
  video.addEventListener('loadedmetadata', () => { if (a.kind === 'video' && video.videoWidth === 0) fail(); });
  video.src = fileUrl(a.path);
  video.play().catch(() => {});
  syncPlay(); syncVol();
  $('t-loop').classList.toggle('on', video.loop);
}

async function mountHtml(a, token) {
  const stage = $('stage');
  const dims = await api.htmlDims(a.path);
  if (token !== V.token || !dims) return;
  const frame = h('iframe', { src: fileUrl(a.path), sandbox: 'allow-scripts allow-same-origin', title: a.name });
  // composição HyperFrames: o HTML cru não anima sozinho, então oferece o render e o preview
  const dir = dirOf(a.path);
  const renders = (nodeAt(dir) ? nodeAt(dir).all : []).filter((x) => x.kind === 'video' && x.path.startsWith(dir + '/renders/')).sort((x, y) => y.mtime - x.mtime);
  V.html = { dir, renders, dims };
  $('h-render').hidden = !(dims.composition && renders.length);
  $('h-dev').hidden = !(dims.composition && dims.hasDev);
  const extra = dims.composition ? ' · quadro parado, sem animação' : '';
  if (dims.fixed) {
    const wrap = h('div', { class: 'frame-wrap' }, frame);
    wrap.style.width = dims.width + 'px';
    wrap.style.height = dims.height + 'px';
    const fit = () => {
      const s = Math.min((stage.clientWidth - 32) / dims.width, (stage.clientHeight - 32) / dims.height);
      wrap.style.transform = 'scale(' + s + ') translate(-50%, -50%)';
    };
    stage.append(wrap);
    fit();
    V.ro = new ResizeObserver(fit);
    V.ro.observe(stage);
    $('htmlbar-note').textContent = 'Composição ' + dims.width + '×' + dims.height + extra;
  } else {
    stage.append(h('div', { class: 'fill-frame' }, frame));
    $('htmlbar-note').textContent = 'Página HTML' + extra;
  }
}

function togglePlay() {
  const v = V.video;
  if (!v) return;
  if (v.paused) v.play().catch(() => {}); else v.pause();
}
function syncPlay() {
  const v = V.video;
  $('t-play').innerHTML = v && !v.paused ? I.pause : I.play;
  cancelAnimationFrame(V.raf);
  if (v && !v.paused) {
    const tick = () => { updateTime(); V.raf = requestAnimationFrame(tick); };
    V.raf = requestAnimationFrame(tick);
  }
}
function syncVol() {
  const v = V.video;
  if (!v) return;
  $('t-mute').innerHTML = v.muted || v.volume === 0 ? I.mute : I.vol;
  $('t-vol').value = v.muted ? 0 : v.volume;
}
function updateTime() {
  const v = V.video;
  if (!v) return;
  const d = v.duration || 0;
  const f = d ? v.currentTime / d : 0;
  $('scrub-fill').style.width = f * 100 + '%';
  $('scrub-knob').style.left = f * 100 + '%';
  if (d && v.buffered.length) $('scrub-buf').style.width = (v.buffered.end(v.buffered.length - 1) / d) * 100 + '%';
  $('t-cur').textContent = timecode(v.currentTime, V.fps);
  $('t-dur').textContent = timecode(d, V.fps);
}
function seekBy(sec) {
  const v = V.video;
  if (!v || !v.duration) return;
  v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + sec));
  updateTime();
}

function initTransport() {
  $('t-play').addEventListener('click', togglePlay);
  $('t-loop').innerHTML = I.loop;
  $('t-loop').addEventListener('click', () => {
    prefs.loop = !prefs.loop; savePrefs();
    if (V.video) V.video.loop = prefs.loop;
    $('t-loop').classList.toggle('on', prefs.loop);
  });
  $('t-loop').classList.toggle('on', !!prefs.loop);
  $('t-speed').addEventListener('change', (e) => { if (V.video) V.video.playbackRate = Number(e.target.value); e.target.blur(); });
  $('t-mute').addEventListener('click', () => { if (V.video) { V.video.muted = !V.video.muted; prefs.muted = V.video.muted; savePrefs(); } });
  $('t-vol').addEventListener('input', (e) => {
    if (!V.video) return;
    V.video.volume = Number(e.target.value); V.video.muted = V.video.volume === 0;
    prefs.vol = V.video.volume; prefs.muted = V.video.muted; savePrefs();
  });
  $('t-full').innerHTML = I.full;
  $('t-full').addEventListener('click', toggleFull);

  const scrub = $('scrub');
  const tip = $('scrub-tip');
  const frac = (e) => { const r = scrub.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
  let dragging = false, wasPlaying = false;
  const seekTo = (e) => { const v = V.video; if (v && v.duration) { v.currentTime = frac(e) * v.duration; updateTime(); } };
  scrub.addEventListener('pointerdown', (e) => {
    if (!V.video) return;
    dragging = true; wasPlaying = !V.video.paused;
    V.video.pause();
    scrub.setPointerCapture(e.pointerId);
    scrub.classList.add('dragging');
    seekTo(e);
  });
  scrub.addEventListener('pointermove', (e) => {
    const v = V.video;
    if (v && v.duration) {
      const f = frac(e);
      tip.hidden = false;
      tip.style.left = f * 100 + '%';
      tip.textContent = timecode(f * v.duration, V.fps);
    }
    if (dragging) seekTo(e);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    scrub.classList.remove('dragging');
    if (wasPlaying && V.video) V.video.play().catch(() => {});
  };
  scrub.addEventListener('pointerup', end);
  scrub.addEventListener('pointercancel', end);
  scrub.addEventListener('mouseleave', () => { tip.hidden = true; });
}
function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen();
  else $('stage').requestFullscreen().catch(() => {});
}

// ---------- painel: conversas do arquivo ----------
async function renderChatTab(token) {
  const a = S.viewer.asset;
  const body = $('tab-chat');
  const tabN = $('tabs').querySelector('[data-tab="chat"]');
  const setCount = (n) => { tabN.textContent = 'Conversas'; if (n) tabN.append(h('span', { class: 'n' }, n)); };
  const cwdNew = rootOf(a.path);

  const drawList = () => {
    body.textContent = '';
    const listEl = h('div', { class: 'panel-list' });
    const list = V.chat.list;
    if (!S.sessionsReady) listEl.append(h('div', { class: 'panel-note' }, h('div', { class: 'spinner', style: 'margin:0 auto 12px' }), 'Lendo o histórico do Claude Code…'));
    else if (!list.length) listEl.append(h('div', { class: 'panel-note' }, 'Nenhuma conversa do Claude Code mexeu nesta pasta. Você pode começar uma nova aqui embaixo.'));
    for (const s of list) listEl.append(sessionItem(s, { onPick: (x) => { V.chat.mode = 'detail'; V.chat.session = x; drawDetail(); } }));
    body.append(listEl, composer({ session: null, asset: a, cwd: cwdNew }));
    setCount(list.length);
  };
  const drawDetail = () => {
    mountTranscript(body, V.chat.session, { asset: a, onBack: () => { V.chat.mode = 'list'; drawList(); } });
  };

  drawList();
  if (!S.sessionsReady) return;
  const quick = await api.sessionsFor(a.path, false);
  if (token !== V.token) return;
  V.chat.list = quick;
  if (V.chat.mode === 'list') drawList();
  const refined = await api.refineSessions(a.path, quick);
  if (token !== V.token) return;
  V.chat.list = refined;
  if (V.chat.mode === 'list') drawList();
}

function renderInfoTab(a, info) {
  const body = $('tab-info');
  body.textContent = '';
  const rows = [['Tipo', KIND_ONE[a.kind] + ' (.' + a.ext + ')']];
  if (info) {
    if (info.width) rows.push(['Resolução', info.width + ' × ' + info.height]);
    if (info.duration) rows.push(['Duração', timecode(info.duration, info.fps)]);
    if (info.fps) rows.push(['Quadros/s', String(info.fps).replace('.', ',')]);
    if (info.vcodec) rows.push(['Vídeo', info.vcodec.toUpperCase() + (info.pixfmt ? ' · ' + info.pixfmt : '')]);
    if (info.acodec) rows.push(['Áudio', info.acodec.toUpperCase() + (info.channels ? ' · ' + (info.channels === 2 ? 'estéreo' : info.channels === 1 ? 'mono' : info.channels + ' canais') : '') + (info.sampleRate ? ' · ' + info.sampleRate / 1000 + ' kHz' : '')]);
    if (info.bitrate) rows.push(['Taxa', (info.bitrate / 1e6).toFixed(1).replace('.', ',') + ' Mb/s']);
  }
  rows.push(['Tamanho', fmtSize(a.size)], ['Modificado', fmtDate(a.mtime, true)], ['Pasta', dirOf(a.path).replace(S.env.home, '~')]);
  const box = h('div', { class: 'info' });
  for (const [k, v] of rows) box.append(h('div', { class: 'info-row' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v)));
  box.append(h('div', { class: 'info-actions' },
    h('button', { class: 'btn ghost small', onclick: () => api.reveal(a.path) }, 'Mostrar no Finder'),
    h('button', { class: 'btn ghost small', onclick: () => api.open(a.path) }, 'Abrir no app padrão'),
    h('button', { class: 'btn ghost small', onclick: () => navigator.clipboard.writeText(a.path).then(() => toast('Caminho copiado')) }, 'Copiar caminho')));
  body.append(box);
}

// ---------- carga ----------
async function reload() {
  $('status').textContent = 'Lendo pastas…';
  S.env = await api.state();
  const libs = await api.scan();
  for (const l of libs) l.tree = buildTree(l);
  S.libs = libs;
  const total = libs.reduce((n, l) => n + l.assets.length, 0);
  $('status').textContent = total + ' arquivos em ' + libs.length + (libs.length === 1 ? ' pasta' : ' pastas');
  if (S.nav.mode === 'folder' && S.nav.path && !nodeAt(S.nav.path)) S.nav.path = null;
  render();
  indexSessions();
}
async function indexSessions() {
  S.sessionsReady = false;
  try { S.sessions = await api.indexSessions(); } catch { S.sessions = []; }
  S.sessionsReady = true;
  const total = S.libs.reduce((n, l) => n + l.assets.length, 0);
  $('status').textContent = total + ' arquivos · ' + S.sessions.length + ' conversas';
  renderSidebar();
  if (S.nav.mode === 'sessions') renderSessionsPage();
  if (S.viewer) renderChatTab(V.token);
}
async function addRoot() {
  const before = S.env.roots.length;
  const roots = await api.addRoot();
  if (roots.length !== before) {
    S.nav = { mode: 'folder', path: roots[roots.length - 1] };
    await reload();
  }
}

function init() {
  $('btn-add-root-small').innerHTML = I.plus;
  $('btn-rescan').innerHTML = I.refresh;
  $('v-back').innerHTML = I.back;
  $('v-prev').innerHTML = I.back;
  $('v-next').innerHTML = I.fwd;
  $('v-panel').innerHTML = I.panel;
  for (const el of document.querySelectorAll('.search-ico')) el.innerHTML = I.search;

  $('btn-add-root').addEventListener('click', addRoot);
  $('btn-add-root-small').addEventListener('click', addRoot);
  $('btn-rescan').addEventListener('click', () => { S.infoCache.clear(); reload(); });
  $('btn-folder-sessions').addEventListener('click', () => { SP.filter = S.nav.path; SP.selected = null; SP.query = ''; $('sess-search').value = ''; go({ mode: 'sessions' }); });

  let st = null;
  $('search').addEventListener('input', (e) => {
    clearTimeout(st);
    st = setTimeout(() => { S.query = e.target.value.trim().toLowerCase(); renderLibrary(); }, 140);
  });
  $('sess-search').addEventListener('input', (e) => {
    clearTimeout(st);
    st = setTimeout(() => { SP.query = e.target.value.trim().toLowerCase(); renderSessionsPage(); }, 140);
  });
  $('sort').value = prefs.sort;
  $('sort').addEventListener('change', (e) => { prefs.sort = e.target.value; savePrefs(); renderLibrary(); e.target.blur(); });
  $('size').value = prefs.card;
  $('size').addEventListener('input', (e) => {
    prefs.card = Number(e.target.value); savePrefs();
    document.documentElement.style.setProperty('--card', prefs.card + 'px');
  });

  $('v-back').addEventListener('click', closeViewer);
  $('v-prev').addEventListener('click', () => step(-1));
  $('v-next').addEventListener('click', () => step(1));
  $('v-reveal').addEventListener('click', () => S.viewer && api.reveal(S.viewer.asset.path));
  $('v-open').addEventListener('click', () => S.viewer && api.open(S.viewer.asset.path));
  $('v-panel').addEventListener('click', () => {
    prefs.panel = !prefs.panel; savePrefs();
    $('viewer').querySelector('.viewer-body').classList.toggle('no-panel', !prefs.panel);
    $('v-panel').classList.toggle('on', prefs.panel);
  });
  $('h-reload').addEventListener('click', () => { const f = $('stage').querySelector('iframe'); if (f) f.src = f.src; });
  $('h-render').addEventListener('click', () => { if (V.html && V.html.renders.length) openViewer(V.html.renders[0], V.html.renders); });
  $('h-dev').addEventListener('click', async () => {
    if (!V.html) return;
    const r = await api.runDev(V.html.dir);
    if (r && r.ok) toast('Abrindo o preview no Terminal…'); else toast((r && r.error) || 'Não foi possível abrir o preview.', true);
  });
  $('h-browser').addEventListener('click', () => S.viewer && api.open(S.viewer.asset.path));
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('.tab');
    if (!b) return;
    for (const t of $('tabs').children) t.classList.toggle('on', t === b);
    $('tab-chat').hidden = b.dataset.tab !== 'chat';
    $('tab-info').hidden = b.dataset.tab !== 'info';
  });
  initTransport();

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName) && document.activeElement.type !== 'range';
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && !S.viewer) { e.preventDefault(); (S.nav.mode === 'sessions' ? $('sess-search') : $('search')).focus(); return; }
    if (!S.viewer) return;
    if (e.key === 'Escape') { if (typing) document.activeElement.blur(); else if (!document.fullscreenElement) closeViewer(); return; }
    if (typing) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') { e.preventDefault(); return step(-1); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') { e.preventDefault(); return step(1); }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const v = V.video;
    const frame = 1 / (V.fps || 30);
    switch (e.key) {
      case ' ': case 'k': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft': e.preventDefault(); if (v) { v.pause(); seekBy(e.shiftKey ? -1 : -frame); } break;
      case 'ArrowRight': e.preventDefault(); if (v) { v.pause(); seekBy(e.shiftKey ? 1 : frame); } break;
      case 'j': seekBy(-5); break;
      case 'l': seekBy(5); break;
      case 'm': $('t-mute').click(); break;
      case 'f': toggleFull(); break;
      case 'Home': if (v) { v.currentTime = 0; updateTime(); } break;
      case 'End': if (v && v.duration) { v.currentTime = v.duration; updateTime(); } break;
      default: break;
    }
  });

  api.onMenu((what) => { if (what === 'add-root') addRoot(); if (what === 'rescan') { S.infoCache.clear(); reload(); } });
  api.onSessionsProgress((p) => { if (!S.sessionsReady) $('status').textContent = 'Lendo conversas ' + p.done + ' de ' + p.total + '…'; });

  api.state().then((env) => {
    S.env = env;
    if (prefs.last && env.roots.some((r) => prefs.last === r || prefs.last.startsWith(r + '/'))) S.nav = { mode: 'folder', path: prefs.last };
    else if (env.roots.length === 1) S.nav = { mode: 'folder', path: env.roots[0] };
    reload();
  });
}

init();
