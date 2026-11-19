const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('acervo', {
  state: () => ipcRenderer.invoke('state'),
  addRoot: () => ipcRenderer.invoke('roots:add'),
  removeRoot: (p) => ipcRenderer.invoke('roots:remove', p),
  scan: () => ipcRenderer.invoke('scan'),
  info: (p, front) => ipcRenderer.invoke('media:info', p, front),
  htmlDims: (p) => ipcRenderer.invoke('media:htmlDims', p),
  proxy: (p) => ipcRenderer.invoke('media:proxy', p),
  indexSessions: () => ipcRenderer.invoke('sessions:index'),
  sessionsFor: (p, isDir) => ipcRenderer.invoke('sessions:for', p, isDir),
  refineSessions: (p, list) => ipcRenderer.invoke('sessions:refine', p, list),
  transcript: (file) => ipcRenderer.invoke('sessions:transcript', file),
  openClaude: (opts) => ipcRenderer.invoke('claude:open', opts),
  runDev: (dir) => ipcRenderer.invoke('project:dev', dir),
  reveal: (p) => ipcRenderer.invoke('shell:reveal', p),
  open: (p) => ipcRenderer.invoke('shell:open', p),
  contextMenu: (p, opts) => ipcRenderer.invoke('ctx:menu', p, opts),
  reorgPlan: (root, t) => ipcRenderer.invoke('reorg:plan', root, t),
  reorgApply: (root, groups) => ipcRenderer.invoke('reorg:apply', root, groups),
  reorgLast: (root) => ipcRenderer.invoke('reorg:last', root),
  reorgUndo: (root) => ipcRenderer.invoke('reorg:undo', root),
  rename: (p, name) => ipcRenderer.invoke('files:rename', p, name),
  onFiles: (fn) => {
    for (const ch of ['files:changed', 'files:error', 'files:busy', 'files:info', 'ctx:rename', 'ctx:goto', 'reorg:open']) {
      ipcRenderer.on(ch, (e, payload) => fn(ch, payload));
    }
  },
  onMenu: (fn) => ipcRenderer.on('menu', (e, what) => fn(what)),
  onSessionsProgress: (fn) => ipcRenderer.on('sessions:progress', (e, p) => fn(p)),
});
