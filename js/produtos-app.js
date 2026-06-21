/**
 * ProdutosApp — Tela de cadastro e gestão de produtos
 */
const ProdutosApp = {
  categoriaFiltro: '',
  editandoId:      null,
  fotoBase64:      null,   // foto atual no formulário

  // ── Init ──────────────────────────────────────────────────────

  init() {
    this.renderCategorias();
    this.renderLista();
    this.bindEvents();
  },

  // ── Categorias ────────────────────────────────────────────────

  renderCategorias() {
    const bar   = document.getElementById('cat-bar');
    const cats  = ProdutosDB.getCategorias();

    // Mantém apenas o "Todos" padrão e acrescenta as dinâmicas
    const btns  = cats.map(c => `
      <button class="cat-pill ${c === this.categoriaFiltro ? 'active' : ''}" data-cat="${c}">
        ${c}
      </button>
    `).join('');

    // Remove pills anteriores (exceto "Todos")
    bar.querySelectorAll('[data-cat]:not([data-cat=""])').forEach(el => el.remove());
    bar.insertAdjacentHTML('beforeend', btns);

    // Sincroniza estado do "Todos"
    const todos = bar.querySelector('[data-cat=""]');
    if (todos) todos.classList.toggle('active', this.categoriaFiltro === '');
  },

  preencherSelectCategorias(selecionada = '') {
    const sel  = document.getElementById('f-categoria');
    const cats = ProdutosDB.getCategorias();
    sel.innerHTML = `<option value="">— Selecione ou digite nova —</option>` +
      cats.map(c => `<option value="${c}" ${c === selecionada ? 'selected' : ''}>${c}</option>`).join('');
  },

  // ── Lista ─────────────────────────────────────────────────────

  renderLista() {
    const todos = ProdutosDB.getAll();
    const lista = this.categoriaFiltro
      ? todos.filter(p => p.categoria === this.categoriaFiltro)
      : todos;

    const container = document.getElementById('prod-list');

    if (!lista.length) {
      container.innerHTML = `<div class="empty-state">
        <span>📦</span>
        <p>Nenhum produto cadastrado.<br>Toque em <strong>+ Novo</strong> para começar.</p>
      </div>`;
      return;
    }

    container.innerHTML = lista.map(p => `
      <div class="prod-item ${p.ativo === false ? 'inativo' : ''}" data-id="${p.id}">
        <img class="prod-item-img"
             src="${p.imagem || 'images/placeholder.svg'}"
             onerror="this.src='images/placeholder.svg'"
             alt="${p.nome}">
        <div class="prod-item-info">
          <div class="prod-item-nome">${p.nome}</div>
          <div class="prod-item-cat">${p.categoria || '—'} ${p.ativo === false ? '· Inativo' : ''}</div>
          <div class="prod-item-preco">${fmt(p.preco)}</div>
        </div>
        <div class="prod-item-actions">
          <button class="btn-edit" onclick="ProdutosApp.abrirEdicao(${p.id})" title="Editar">✏️</button>
        </div>
      </div>
    `).join('');
  },

  // ── Formulário ────────────────────────────────────────────────

  abrirNovo() {
    this.editandoId = null;
    this.fotoBase64 = null;

    document.getElementById('form-title').textContent = 'Novo Produto';
    document.getElementById('btn-deletar').style.display = 'none';
    document.getElementById('form-error').textContent = '';
    document.getElementById('f-nome').value       = '';
    document.getElementById('f-preco').value      = '';
    document.getElementById('f-ativo').value      = '1';
    document.getElementById('f-nova-cat').value   = '';
    document.getElementById('foto-status').textContent = '';

    const fotoImg     = document.getElementById('foto-img');
    const fotoPreview = document.getElementById('foto-preview');
    fotoImg.src       = 'images/placeholder.svg';
    fotoPreview.classList.remove('has-photo');

    this.preencherSelectCategorias();
    document.getElementById('form-overlay').classList.add('open');
    setTimeout(() => document.getElementById('f-nome').focus(), 350);
  },

  abrirEdicao(id) {
    const p = ProdutosDB.getById(id);
    if (!p) return;

    this.editandoId = id;
    this.fotoBase64 = p.imagem || null;

    document.getElementById('form-title').textContent   = 'Editar Produto';
    document.getElementById('btn-deletar').style.display = 'block';
    document.getElementById('form-error').textContent   = '';
    document.getElementById('f-nome').value    = p.nome;
    document.getElementById('f-preco').value   = p.preco;
    document.getElementById('f-ativo').value   = p.ativo === false ? '0' : '1';
    document.getElementById('f-nova-cat').value = '';
    document.getElementById('foto-status').textContent = p.imagem ? '✅ Foto carregada' : '';

    const fotoImg     = document.getElementById('foto-img');
    const fotoPreview = document.getElementById('foto-preview');

    if (p.imagem) {
      fotoImg.src = p.imagem;
      fotoPreview.classList.add('has-photo');
    } else {
      fotoImg.src = 'images/placeholder.svg';
      fotoPreview.classList.remove('has-photo');
    }

    this.preencherSelectCategorias(p.categoria);
    document.getElementById('form-overlay').classList.add('open');
  },

  fecharFormulario() {
    document.getElementById('form-overlay').classList.remove('open');
  },

  // ── Câmera / Foto ──────────────────────────────────────────────

  acionarCamera() {
    document.getElementById('foto-input').click();
  },

  async processarFoto(file) {
    if (!file) return;

    const status = document.getElementById('foto-status');
    const btn    = document.getElementById('btn-salvar');

    try {
      status.textContent = '⏳ Processando foto...';
      btn.disabled = true;

      const base64 = await ProdutosDB.comprimirImagem(file, 400, 0.72);

      // Estimativa de tamanho
      const kb = Math.round((base64.length * 3 / 4) / 1024);
      status.textContent = `✅ Foto pronta (${kb} KB)`;

      this.fotoBase64 = base64;

      const fotoImg     = document.getElementById('foto-img');
      const fotoPreview = document.getElementById('foto-preview');
      fotoImg.src = base64;
      fotoPreview.classList.add('has-photo');
    } catch (err) {
      status.textContent = '❌ Erro ao processar a foto. Tente novamente.';
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  },

  // ── Salvar ────────────────────────────────────────────────────

  salvar() {
    const nome     = document.getElementById('f-nome').value.trim();
    const precoRaw = document.getElementById('f-preco').value.replace(',', '.');
    const preco    = parseFloat(precoRaw);
    const ativo    = document.getElementById('f-ativo').value === '1';
    const catSel   = document.getElementById('f-categoria').value.trim();
    const catNova  = document.getElementById('f-nova-cat').value.trim();
    const categoria = catNova || catSel;
    const errEl    = document.getElementById('form-error');

    errEl.textContent = '';

    if (!nome)           { errEl.textContent = 'Digite o nome do produto.';         return; }
    if (!categoria)      { errEl.textContent = 'Selecione ou digite uma categoria.'; return; }
    if (isNaN(preco) || preco < 0) { errEl.textContent = 'Preço inválido.'; return; }

    const dados = { nome, preco, categoria, ativo, imagem: this.fotoBase64 || '' };

    if (this.editandoId !== null) {
      ProdutosDB.update(this.editandoId, dados);
      this.toast('Produto atualizado!');
    } else {
      ProdutosDB.add(dados);
      this.toast('Produto cadastrado!');
    }

    this.fecharFormulario();
    this.renderCategorias();
    this.renderLista();
  },

  // ── Excluir ───────────────────────────────────────────────────

  excluir() {
    if (!this.editandoId) return;
    const p = ProdutosDB.getById(this.editandoId);
    if (!p) return;

    if (!confirm(`Excluir "${p.nome}" permanentemente?\n\nEssa ação não pode ser desfeita.`)) return;

    ProdutosDB.delete(this.editandoId);
    this.fecharFormulario();
    this.renderCategorias();
    this.renderLista();
    this.toast('Produto excluído.');
  },

  // ── Toast ─────────────────────────────────────────────────────

  toast(msg, ms = 2200) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => el.classList.remove('show'), ms);
  },

  // ── Eventos ───────────────────────────────────────────────────

  bindEvents() {
    document.getElementById('btn-novo').addEventListener('click', () => this.abrirNovo());
    document.getElementById('btn-close-form').addEventListener('click', () => this.fecharFormulario());
    document.getElementById('btn-salvar').addEventListener('click', () => this.salvar());
    document.getElementById('btn-deletar').addEventListener('click', () => this.excluir());

    document.getElementById('form-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.fecharFormulario();
    });

    // Filtro por categoria
    document.getElementById('cat-bar').addEventListener('click', e => {
      const pill = e.target.closest('.cat-pill');
      if (!pill) return;
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      this.categoriaFiltro = pill.dataset.cat;
      this.renderLista();
    });

    // Foto — input file
    document.getElementById('foto-input').addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) this.processarFoto(file);
      e.target.value = ''; // permite re-selecionar a mesma foto
    });

    // Se o usuário digitar nova categoria, limpa o select
    document.getElementById('f-nova-cat').addEventListener('input', e => {
      if (e.target.value.trim()) {
        document.getElementById('f-categoria').value = '';
      }
    });

    // Se selecionar categoria existente, limpa a nova
    document.getElementById('f-categoria').addEventListener('change', e => {
      if (e.target.value) {
        document.getElementById('f-nova-cat').value = '';
      }
    });
  },
};

function fmt(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

document.addEventListener('DOMContentLoaded', () => ProdutosApp.init());
