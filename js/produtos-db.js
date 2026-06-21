/**
 * ProdutosDB — Banco de produtos dinâmico (localStorage)
 *
 * Na primeira execução, importa os produtos de products.js como ponto de partida.
 * Daí em diante, todas as alterações (add/edit/delete + fotos) ficam gravadas aqui.
 */
const ProdutosDB = {
  KEY: 'pdvlight_produtos_v2',

  // ── Leitura ───────────────────────────────────────────────────

  getAll() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* corrompido, reinicia */ }

    // Primeira execução: seed a partir do products.js (sem fotos)
    const seed = (typeof PRODUTOS !== 'undefined' ? PRODUTOS : []).map(p => ({
      id:        p.id,
      nome:      p.nome,
      preco:     p.preco,
      categoria: p.categoria,
      imagem:    '',          // fotos serão adicionadas pela UI
      ativo:     true,
    }));
    this._save(seed);
    return seed;
  },

  getAtivos() {
    return this.getAll().filter(p => p.ativo !== false);
  },

  getCategorias() {
    return [...new Set(this.getAtivos().map(p => p.categoria).filter(Boolean))].sort();
  },

  getById(id) {
    return this.getAll().find(p => String(p.id) === String(id)) || null;
  },

  // ── Escrita ───────────────────────────────────────────────────

  add(dados) {
    const todos = this.getAll();
    const novo  = { id: Date.now(), ativo: true, ...dados };
    todos.push(novo);
    this._save(todos);
    return novo;
  },

  update(id, dados) {
    const todos = this.getAll();
    const idx   = todos.findIndex(p => String(p.id) === String(id));
    if (idx === -1) return false;
    todos[idx] = { ...todos[idx], ...dados };
    this._save(todos);
    return true;
  },

  delete(id) {
    const todos = this.getAll().filter(p => String(p.id) !== String(id));
    this._save(todos);
  },

  // ── Utilitários ───────────────────────────────────────────────

  _save(arr) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(arr));
      return true;
    } catch (e) {
      // localStorage cheio (raro, mas pode acontecer com muitas fotos grandes)
      console.warn('ProdutosDB: localStorage cheio.', e);
      return false;
    }
  },

  /**
   * Redimensiona e comprime uma imagem antes de gravar.
   * Retorna uma Promise<string> com o base64 resultante.
   * @param {File} file
   * @param {number} maxDim — dimensão máxima (px)
   * @param {number} quality — 0.0–1.0
   */
  async comprimirImagem(file, maxDim = 400, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const ratio  = Math.min(maxDim / img.width, maxDim / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx = canvas.getContext('2d');
          // Fundo branco para imagens PNG com transparência
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};
