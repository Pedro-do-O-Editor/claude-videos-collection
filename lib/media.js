// Miniaturas, dados técnicos e proxies de reprodução, via ffmpeg/ffprobe.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const BIN_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/opt/local/bin'];
function findBin(name) {
  for (const d of BIN_DIRS) {
    const p = path.join(d, name);
    try { fs.accessSync(p, fs.constants.X_OK); return p; } catch { /* próximo */ }
  }
  return null;
}

const run = (bin, args, opts = {}) => new Promise((resolve, reject) => {
  execFile(bin, args, { maxBuffer: 16 * 1024 * 1024, timeout: 120000, ...opts }, (err, stdout, stderr) => {
    if (err) { err.stderr = stderr; reject(err); } else resolve(stdout);
  });
});

// fila simples para não disparar dezenas de ffmpeg ao mesmo tempo
function makeQueue(limit) {
  let active = 0;
  const waiting = [];
  const pump = () => {
    while (active < limit && waiting.length) {
      const job = waiting.shift();
      active++;
      job.fn().then(job.resolve, job.reject).finally(() => { active--; pump(); });
    }
  };
  return (fn, front) => new Promise((resolve, reject) => {
    const job = { fn, resolve, reject };
    if (front) waiting.unshift(job); else waiting.push(job);
    pump();
  });
}

class Media {
  constructor(cacheDir) {
    this.cacheDir = cacheDir;
    this.thumbDir = path.join(cacheDir, 'thumbs');
    this.proxyDir = path.join(cacheDir, 'proxies');
    fs.mkdirSync(this.thumbDir, { recursive: true });
    fs.mkdirSync(this.proxyDir, { recursive: true });
    this.ffmpeg = findBin('ffmpeg');
    this.ffprobe = findBin('ffprobe');
    this.queue = makeQueue(3);
    this.pending = new Map();
    this.metaFile = path.join(cacheDir, 'meta.json');
    this.meta = {};
    try { this.meta = JSON.parse(fs.readFileSync(this.metaFile, 'utf8')); } catch { /* vazio */ }
    this.metaTimer = null;
  }

  key(a) {
    return crypto.createHash('sha1').update(a.path + '|' + a.mtime + '|' + a.size).digest('hex');
  }

  saveMetaSoon() {
    clearTimeout(this.metaTimer);
    this.metaTimer = setTimeout(() => {
      fs.promises.writeFile(this.metaFile, JSON.stringify(this.meta)).catch(() => {});
    }, 1500);
  }

  async probe(file) {
    if (!this.ffprobe) return null;
    try {
      const out = await run(this.ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
      const j = JSON.parse(out);
      const v = (j.streams || []).find((s) => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
      const a = (j.streams || []).find((s) => s.codec_type === 'audio');
      const fps = (r) => {
        if (!r) return 0;
        const [n, d] = String(r).split('/').map(Number);
        return d ? n / d : n || 0;
      };
      let rot = 0;
      if (v && Array.isArray(v.side_data_list)) {
        const sd = v.side_data_list.find((x) => x.rotation !== undefined);
        if (sd) rot = Math.abs(Number(sd.rotation)) % 180;
      }
      return {
        duration: Number(j.format && j.format.duration) || 0,
        bitrate: Number(j.format && j.format.bit_rate) || 0,
        width: v ? (rot === 90 ? v.height : v.width) : 0,
        height: v ? (rot === 90 ? v.width : v.height) : 0,
        vcodec: v ? v.codec_name : '',
        pixfmt: v ? v.pix_fmt : '',
        fps: v ? Math.round(fps(v.avg_frame_rate || v.r_frame_rate) * 100) / 100 : 0,
        acodec: a ? a.codec_name : '',
        channels: a ? a.channels : 0,
        sampleRate: a ? Number(a.sample_rate) : 0,
      };
    } catch { return null; }
  }

  // devolve { thumb, duration, width, height, ... } — gera na primeira vez
  info(asset, front) {
    const k = this.key(asset);
    const cached = this.meta[k];
    if (cached && (!cached.thumb || fs.existsSync(cached.thumb))) return Promise.resolve(cached);
    if (this.pending.has(k)) return this.pending.get(k);
    const p = this.queue(() => this._build(asset, k), front).finally(() => this.pending.delete(k));
    this.pending.set(k, p);
    return p;
  }

  async _build(asset, k) {
    const out = { thumb: '' };
    const jpg = path.join(this.thumbDir, k + '.jpg');
    if (asset.kind === 'video' || asset.kind === 'audio') {
      const pr = await this.probe(asset.path);
      if (pr) Object.assign(out, pr);
    }
    if (this.ffmpeg && asset.kind === 'video') {
      const dur = out.duration || 0;
      const at = dur > 0 ? Math.min(dur * 0.3, Math.max(0, dur - 0.1), 20) : 0;
      const shot = (ss) => run(this.ffmpeg, ['-y', '-v', 'error', '-ss', String(ss), '-i', asset.path, '-frames:v', '1',
        '-vf', 'scale=640:640:force_original_aspect_ratio=decrease', '-q:v', '4', jpg]);
      try { await shot(at.toFixed(2)); } catch { try { await shot(0); } catch { /* sem miniatura */ } }
      if (fs.existsSync(jpg)) out.thumb = jpg;
    } else if (this.ffmpeg && asset.kind === 'image' && asset.ext !== 'svg' && asset.size > 350 * 1024) {
      try {
        await run(this.ffmpeg, ['-y', '-v', 'error', '-i', asset.path, '-frames:v', '1',
          '-vf', 'scale=640:640:force_original_aspect_ratio=decrease', '-q:v', '4', jpg]);
        if (fs.existsSync(jpg)) out.thumb = jpg;
      } catch { /* usa o original */ }
    }
    this.meta[k] = out;
    this.saveMetaSoon();
    return out;
  }

  setThumb(asset, file, extra) {
    const k = this.key(asset);
    this.meta[k] = { ...(this.meta[k] || {}), thumb: file, ...(extra || {}) };
    this.saveMetaSoon();
    return this.meta[k];
  }

  // versão H.264 para arquivos que o player não abre (ProRes, HEVC etc.)
  async proxy(asset) {
    if (!this.ffmpeg) throw new Error('ffmpeg não encontrado');
    const out = path.join(this.proxyDir, this.key(asset) + '.mp4');
    if (fs.existsSync(out)) return out;
    const tmp = out + '.part.mp4';
    await run(this.ffmpeg, ['-y', '-v', 'error', '-i', asset.path,
      '-vf', 'scale=-2:min(1080\\,ih)', '-pix_fmt', 'yuv420p',
      '-c:v', 'h264_videotoolbox', '-b:v', '6M', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', tmp],
    { timeout: 30 * 60 * 1000 });
    await fs.promises.rename(tmp, out);
    return out;
  }
}

module.exports = { Media, findBin };
