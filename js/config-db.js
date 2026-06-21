/**
 * ConfigDB — Configurações da empresa (nome + logo)
 * VendedoresDB — Banco de vendedores dinâmico (substitui vendors.js estático)
 */

// ── Empresa ────────────────────────────────────────────────────

const ConfigDB = {
  KEY: 'pdvlight_config_v1',

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); }
    catch { return {}; }
  },

  salvar(dados) {
    const atual = this.get();
    localStorage.setItem(this.KEY, JSON.stringify({ ...atual, ...dados }));
  },

  getNomeEmpresa() { return this.get().nomeEmpresa || ''; },
  getLogo()        { return this.get().logo        || ''; },

  /**
   * Redimensiona e comprime imagem para base64.
   * Reutilizado tanto para o logo quanto para fotos de produtos.
   */
  async comprimirImagem(file, maxDim = 300, quality = 0.80) {
    return new Promise((resolve, reject) => {
      const reader  = new FileReader();
      reader.onload = ev => {
        const img   = new Image();
        img.onload  = () => {
          const ratio  = Math.min(maxDim / img.width, maxDim / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src     = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};

// ── Vendedores ─────────────────────────────────────────────────

const VendedoresDB = {
  KEY: 'pdvlight_vendedores_v1',

  getAll() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* corrompido, reinicia */ }

    // Seed a partir do vendors.js estático
    const seed = (typeof VENDEDORES !== 'undefined' ? [...VENDEDORES] : []);
    this._save(seed);
    return seed;
  },

  getAtivos() {
    return this.getAll().filter(v => v.ativo !== false);
  },

  getById(id) {
    return this.getAll().find(v => String(v.id) === String(id)) || null;
  },

  add(dados) {
    const todos = this.getAll();
    const novo  = { id: Date.now(), ativo: true, ...dados };
    todos.push(novo);
    this._save(todos);
    return novo;
  },

  update(id, dados) {
    const todos = this.getAll();
    const idx   = todos.findIndex(v => String(v.id) === String(id));
    if (idx === -1) return false;
    todos[idx] = { ...todos[idx], ...dados };
    this._save(todos);
    return true;
  },

  delete(id) {
    this._save(this.getAll().filter(v => String(v.id) !== String(id)));
  },

  _save(arr) {
    try { localStorage.setItem(this.KEY, JSON.stringify(arr)); return true; }
    catch { return false; }
  },
};
