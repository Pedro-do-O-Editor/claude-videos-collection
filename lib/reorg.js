// Reorganizar pastas: junta subpastas de nomes parecidos dentro de uma subpasta nova.
// Só regras fixas (comparação de letras), sem IA. A pasta matriz nunca é renomeada nem movida:
// só são criadas subpastas dentro dela e as subpastas existentes mudam de lugar.
const fs = require('fs');
const path = require('path');

// "Feijoada_Psíquica-B1" -> "feijoada psiquica b1"
function normalize(name) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[_\-.\s]+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

// quanto os nomes são iguais letra a letra (0 a 1)
function charRatio(a, b) {
  const max = Math.max(a.length, b.length);
  return max ? 1 - levenshtein(a, b) / max : 1;
}

// quanto do nome mais curto é o começo do outro (0 a 1)
function prefixRatio(a, b) {
  const min = Math.min(a.length, b.length);
  if (min < 4) return 0; // nomes curtos demais ("mcp", "app") não agrupam só pelo começo
  let i = 0;
  while (i < min && a[i] === b[i]) i++;
  return i / min;
}

function similarity(a, b) {
  return Math.max(charRatio(a, b), prefixRatio(a, b));
}

function commonPrefix(names) {
  if (!names.length) return '';
  let p = names[0];
  for (const n of names.slice(1)) {
    let i = 0;
    while (i < p.length && i < n.length && p[i].toLowerCase() === n[i].toLowerCase()) i++;
    p = p.slice(0, i);
  }
  return p;
}

// nome da subpasta nova: o começo comum dos nomes, sem cortar palavra no meio
function groupName(members) {
  const sorted = members.slice().sort((a, b) => a.length - b.length || a.localeCompare(b));
  let p = commonPrefix(sorted);
  const full = sorted.find((m) => m.toLowerCase() === p.toLowerCase());
  if (full) return full;
  if (!/[_\-.\s]$/.test(p)) {
    const cut = Math.max(p.lastIndexOf('-'), p.lastIndexOf('_'), p.lastIndexOf(' '), p.lastIndexOf('.'));
    if (cut > 0) p = p.slice(0, cut);
  }
  p = p.replace(/[_\-.\s]+$/, '').trim();
  return p.length >= 3 ? p : sorted[0];
}

async function childDirs(root) {
  const entries = await fs.promises.readdir(root, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && !e.isSymbolicLink() && !e.name.startsWith('.')).map((e) => e.name);
}

function uniqueName(base, taken) {
  const lower = new Set([...taken].map((t) => t.toLowerCase()));
  let name = base;
  let n = 1;
  while (lower.has(name.toLowerCase())) {
    n++;
    name = base + (n === 2 ? ' (grupo)' : ' (grupo ' + (n - 1) + ')');
  }
  return name;
}

// monta a proposta sem mexer em nada
async function plan(root, threshold, groupDirs) {
  const t = Math.min(0.99, Math.max(0.5, Number(threshold) || 0.8));
  const names = await childDirs(root);
  const groupSet = new Set((groupDirs || []).filter((g) => path.dirname(g) === root).map((g) => path.basename(g)));
  const norm = names.map(normalize);

  // união das pastas parecidas (se A~B e B~C, as três ficam juntas)
  const parent = names.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const best = new Map();
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      // duas subpastas criadas pelo app nunca se juntam entre si
      if (groupSet.has(names[i]) && groupSet.has(names[j])) continue;
      const s = similarity(norm[i], norm[j]);
      if (s >= t) {
        const a = find(i), b = find(j);
        if (a !== b) parent[a] = b;
        const k = i + '|' + j;
        best.set(k, s);
      }
    }
  }
  const clusters = new Map();
  names.forEach((n, i) => {
    const r = find(i);
    if (!clusters.has(r)) clusters.set(r, []);
    clusters.get(r).push(i);
  });

  const taken = new Set(names);
  const groups = [];
  for (const idx of clusters.values()) {
    if (idx.length < 2) continue;
    const members = idx.map((i) => names[i]);
    // menor semelhança entre membros ligados, para mostrar na prévia
    let min = 1;
    for (let a = 0; a < idx.length; a++) {
      for (let b = a + 1; b < idx.length; b++) {
        const k = Math.min(idx[a], idx[b]) + '|' + Math.max(idx[a], idx[b]);
        if (best.has(k)) min = Math.min(min, best.get(k));
      }
    }
    const existing = members.find((m) => groupSet.has(m));
    if (existing) {
      groups.push({ name: existing, existing: true, members: members.filter((m) => m !== existing).sort(), score: Math.round(min * 100) });
      continue;
    }
    const name = uniqueName(groupName(members), taken);
    taken.add(name);
    groups.push({ name, existing: false, members: members.sort((a, b) => a.localeCompare(b, 'pt', { numeric: true })), score: Math.round(min * 100) });
  }
  groups.sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }));
  return { root, threshold: Math.round(t * 100), folders: names.length, groups };
}

function validName(n) {
  const s = String(n || '').trim();
  return s && !s.includes('/') && !s.includes(':') && !s.startsWith('.') && Buffer.byteLength(s) <= 255 ? s : null;
}

// executa a proposta aprovada; devolve o registro para poder desfazer
async function apply(root, groups, groupDirs) {
  const existingNames = new Set(await childDirs(root));
  const groupSet = new Set((groupDirs || []).map((g) => path.basename(g)));
  const lowerExisting = new Map([...existingNames].map((n) => [n.toLowerCase(), n]));
  const record = { root, at: Date.now(), moves: [], created: [], errors: [] };
  for (const g of groups) {
    const name = validName(g.name);
    if (!name) { record.errors.push('Nome inválido: "' + g.name + '"'); continue; }
    const members = (g.members || []).filter((m) => typeof m === 'string' && !m.includes('/') && existingNames.has(m) && m !== name);
    if (members.length < (g.existing ? 1 : 2)) continue;
    const target = path.join(root, name);
    if (path.dirname(target) !== root) continue; // nunca fora da matriz
    const clash = lowerExisting.get(name.toLowerCase());
    if (clash) {
      // só aproveita pasta existente se ela for uma subpasta criada pelo app
      if (!(g.existing && groupSet.has(clash))) { record.errors.push('Já existe a pasta "' + clash + '"; escolha outro nome para o grupo.'); continue; }
    } else {
      await fs.promises.mkdir(target);
      record.created.push(target);
      lowerExisting.set(name.toLowerCase(), name);
    }
    const dir = clash ? path.join(root, clash) : target;
    for (const m of members) {
      const from = path.join(root, m);
      const to = path.join(dir, m);
      try {
        await fs.promises.access(to).then(() => { throw new Error('já existe "' + m + '" dentro de "' + path.basename(dir) + '"'); }, () => {});
        await fs.promises.rename(from, to);
        record.moves.push({ from, to });
        existingNames.delete(m);
      } catch (e) {
        record.errors.push('"' + m + '": ' + e.message);
      }
    }
  }
  return record;
}

// desfaz uma reorganização: devolve cada pasta e apaga as subpastas criadas que ficaram vazias
async function undo(record) {
  const out = { restored: 0, errors: [] };
  for (const mv of record.moves.slice().reverse()) {
    try {
      await fs.promises.access(mv.from).then(() => { throw new Error('o lugar original já está ocupado'); }, () => {});
      await fs.promises.rename(mv.to, mv.from);
      out.restored++;
    } catch (e) {
      out.errors.push('"' + path.basename(mv.from) + '": ' + (e.code === 'ENOENT' ? 'não foi encontrada no grupo' : e.message));
    }
  }
  for (const dir of record.created) {
    try {
      const left = await fs.promises.readdir(dir);
      if (left.length === 1 && left[0] === '.DS_Store') await fs.promises.unlink(path.join(dir, '.DS_Store'));
      await fs.promises.rmdir(dir);
    } catch { /* ficou algo dentro: a pasta fica */ }
  }
  return out;
}

module.exports = { normalize, similarity, charRatio, prefixRatio, groupName, plan, apply, undo };
