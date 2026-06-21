/**
 * ConfigApp — Tela de configurações (empresa + vendedores)
 */
const ConfigApp = {
  editandoVendedorId: null,
  logoBase64: null,

  // ── Init ──────────────────────────────────────────────────────

  init() {
    this.carregarEmpresa();
    this.renderVendedores();
    this.bindEvents();
  },

  // ── Empresa ───────────────────────────────────────────────────

  carregarEmpresa() {
    const nome = ConfigDB.getNomeEmpresa();
    const logo = ConfigDB.getLogo();

    document.getElementById('f-nome-empresa').value = nome;

    if (logo) {
      document.getElementById('logo-img').src = logo;
      document.getElementById('logo-preview').classList.add('has-logo');
      this.logoBase64 = logo;
    }
  },

  salvarEmpresa() {
    const nome = document.getElementById('f-nome-empresa').value.trim();
    ConfigDB.salvar({ nomeEmpresa: nome, logo: this.logoBase64 || '' });
    this.toast('Dados da empresa salvos!');
  },

  acionarLogoInput() {
    document.getElementById('logo-input').click();
  },

  async processarLogo(file) {
    if (!file) return;
    try {
      this.toast('⏳ Processando...');
      const base64 = await ConfigDB.comprimirImagem(file, 300, 0.82);
      this.logoBase64 = base64;
      document.getElementById('logo-img').src = base64;
      document.getElementById('logo-preview').classList.add('has-logo');
      this.toast('Logo carregado. Salve para confirmar.');
    } catch {
      this.toast('Erro ao carregar a imagem.');
    }
  },

  // ── Vendedores ────────────────────────────────────────────────

  renderVendedores() {
    const todos = VendedoresDB.getAll();
    const lista = document.getElementById('vendedores-lista');

    if (!todos.length) {
      lista.innerHTML = '<div class="empty-vendors">Nenhum vendedor cadastrado.</div>';
      return;
    }

    // Ativos primeiro, inativos depois
    const ordenados = [...todos].sort((a, b) => {
      if (a.ativo === b.ativo) return a.nome.localeCompare(b.nome);
      return a.ativo ? -1 : 1;
    });

    lista.innerHTML = ordenados.map(v => `
      <div class="vendor-item ${v.ativo === false ? 'inativo' : ''}">
        <div class="vendor-avatar-cfg">${v.nome.charAt(0).toUpperCase()}</div>
        <div class="vendor-item-info">
          <div class="vendor-item-nome">${v.nome}</div>
          <div class="vendor-status ${v.ativo !== false ? 'ativo' : 'inativo'}">
            ${v.ativo !== false ? '● Ativo' : '● Inativo'}
          </div>
        </div>
        <button class="btn-edit-vendor" onclick="ConfigApp.abrirEdicaoVendedor('${v.id}')">✏️</button>
      </div>
    `).join('');
  },

  abrirNovoVendedor() {
    this.editandoVendedorId = null;
    document.getElementById('vendor-form-title').textContent = 'Novo Vendedor';
    document.getElementById('f-v-nome').value  = '';
    document.getElementById('f-v-ativo').value = '1';
    document.getElementById('vendor-error').textContent  = '';
    document.getElementById('btn-deletar-vendor').style.display = 'none';
    document.getElementById('vendor-overlay').classList.add('open');
    setTimeout(() => document.getElementById('f-v-nome').focus(), 350);
  },

  abrirEdicaoVendedor(id) {
    const v = VendedoresDB.getById(id);
    if (!v) return;
    this.editandoVendedorId = id;
    document.getElementById('vendor-form-title').textContent = 'Editar Vendedor';
    document.getElementById('f-v-nome').value  = v.nome;
    document.getElementById('f-v-ativo').value = v.ativo !== false ? '1' : '0';
    document.getElementById('vendor-error').textContent  = '';
    document.getElementById('btn-deletar-vendor').style.display = 'block';
    document.getElementById('vendor-overlay').classList.add('open');
  },

  fecharPainelVendedor() {
    document.getElementById('vendor-overlay').classList.remove('open');
  },

  salvarVendedor() {
    const nome  = document.getElementById('f-v-nome').value.trim();
    const ativo = document.getElementById('f-v-ativo').value === '1';
    const errEl = document.getElementById('vendor-error');

    errEl.textContent = '';
    if (!nome) { errEl.textContent = 'Digite o nome do vendedor.'; return; }

    if (this.editandoVendedorId !== null) {
      VendedoresDB.update(this.editandoVendedorId, { nome, ativo });
      this.toast('Vendedor atualizado!');
    } else {
      VendedoresDB.add({ nome, ativo });
      this.toast('Vendedor cadastrado!');
    }

    this.fecharPainelVendedor();
    this.renderVendedores();
  },

  excluirVendedor() {
    if (!this.editandoVendedorId) return;
    const v = VendedoresDB.getById(this.editandoVendedorId);
    if (!v) return;

    if (!confirm(
      `Excluir "${v.nome}" permanentemente?\n\n` +
      `O histórico de vendas deste vendedor é preservado, mas o nome não aparecerá mais.`
    )) return;

    VendedoresDB.delete(this.editandoVendedorId);
    this.fecharPainelVendedor();
    this.renderVendedores();
    this.toast('Vendedor excluído.');
  },

  // ── Toast ─────────────────────────────────────────────────────

  toast(msg, ms = 2400) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => el.classList.remove('show'), ms);
  },

  // ── Eventos ───────────────────────────────────────────────────

  bindEvents() {
    document.getElementById('btn-salvar-empresa').addEventListener('click',  () => this.salvarEmpresa());
    document.getElementById('btn-novo-vendedor').addEventListener('click',   () => this.abrirNovoVendedor());
    document.getElementById('btn-close-vendor').addEventListener('click',   () => this.fecharPainelVendedor());
    document.getElementById('btn-salvar-vendor').addEventListener('click',  () => this.salvarVendedor());
    document.getElementById('btn-deletar-vendor').addEventListener('click', () => this.excluirVendedor());

    document.getElementById('vendor-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.fecharPainelVendedor();
    });

    document.getElementById('logo-input').addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) this.processarLogo(file);
      e.target.value = '';
    });
  },
};

document.addEventListener('DOMContentLoaded', () => ConfigApp.init());
