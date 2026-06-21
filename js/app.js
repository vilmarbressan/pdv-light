/**
 * App — Lógica principal do PDV Light
 */
const App = {
  carrinho: [],
  categoriaAtiva: '',
  termoBusca: '',
  pagamento: 'Dinheiro',
  vendedorAtual: null,   // { id, nome }

  // ── Inicialização ─────────────────────────────────────────────

  init() {
    this.carrinho = DB.getCarrinho();
    this.renderCategorias();
    this.renderProdutos();
    this.bindEvents();
    this.atualizarFab();
    this.iniciarSelecaoVendedor();
    if (typeof PDVSync !== 'undefined') PDVSync.inicializar();
  },

  // ── Seleção de Vendedor ───────────────────────────────────────

  iniciarSelecaoVendedor() {
    const salvo = sessionStorage.getItem('pdvlight_vendedor');
    if (salvo) {
      try {
        this.vendedorAtual = JSON.parse(salvo);
        this.mostrarPDV();
        return;
      } catch { /* inválido, pede nova seleção */ }
    }
    this.mostrarTelaVendedor();
  },

  mostrarTelaVendedor() {
    const lista  = document.getElementById('vendor-list');
    const ativos = VendedoresDB.getAtivos();   // dinâmico, não mais o array estático

    if (!ativos.length) {
      const temProdutos = ProdutosDB.getAtivos().length > 0;
      lista.innerHTML = `
        <div class="setup-guide">
          <p class="setup-guide-msg">Configure sua loja em 2 passos para começar a vender:</p>
          <a href="configuracoes.html" class="setup-step-btn">
            <span class="setup-step-num">1</span>
            <span class="setup-step-txt">Nome da loja e vendedores</span>
            <span class="setup-step-arrow">→</span>
          </a>
          <a href="produtos.html" class="setup-step-btn ${temProdutos ? 'done' : ''}">
            <span class="setup-step-num">${temProdutos ? '✓' : '2'}</span>
            <span class="setup-step-txt">${temProdutos ? 'Produtos já cadastrados ✅' : 'Cadastrar produtos e preços'}</span>
            ${temProdutos ? '' : '<span class="setup-step-arrow">→</span>'}
          </a>
        </div>`;
    } else {
      lista.innerHTML = ativos.map(v => `
        <button class="vendor-btn" data-id="${v.id}" data-nome="${v.nome}">
          <span class="vendor-avatar">${v.nome.charAt(0).toUpperCase()}</span>
          <span>${v.nome}</span>
        </button>
      `).join('');
    }

    // Ajusta o subtítulo conforme o estado
    const subtitleEl = document.querySelector('.vendor-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = ativos.length ? 'Quem está vendendo agora?' : 'Vamos começar!';
    }

    // Preenche nome/logo da empresa na tela de seleção
    const nome = ConfigDB.getNomeEmpresa();
    const logo = ConfigDB.getLogo();
    if (nome) document.querySelector('.vendor-title').textContent = nome;
    if (logo) {
      const logoEl = document.querySelector('.vendor-logo');
      logoEl.innerHTML = `<img src="${logo}" alt="Logo" style="width:72px;height:72px;border-radius:16px;object-fit:cover">`;
    }

    document.getElementById('vendor-screen').classList.add('open');
  },

  selecionarVendedor(id, nome) {
    // Preserva o id como string para consistência com VendedoresDB
    this.vendedorAtual = { id: String(id), nome };
    sessionStorage.setItem('pdvlight_vendedor', JSON.stringify(this.vendedorAtual));
    this.mostrarPDV();
    this.toast(`Bem-vindo(a), ${nome}!`);
  },

  trocarVendedor() {
    sessionStorage.removeItem('pdvlight_vendedor');
    this.vendedorAtual = null;
    this.mostrarTelaVendedor();
  },

  mostrarPDV() {
    document.getElementById('vendor-screen').classList.remove('open');
    document.getElementById('vendor-badge').textContent = this.vendedorAtual?.nome || '';
    this.atualizarHeaderEmpresa();
  },

  atualizarHeaderEmpresa() {
    const nome = ConfigDB.getNomeEmpresa();
    const logo = ConfigDB.getLogo();
    const nomeEl = document.getElementById('header-nome-empresa');
    const iconEl = document.getElementById('header-logo-icon');
    if (nomeEl && nome) nomeEl.textContent = nome;
    if (iconEl && logo) {
      iconEl.innerHTML = `<img src="${logo}" alt=""
        style="width:30px;height:30px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:2px">`;
    }
  },

  // ── Categorias ────────────────────────────────────────────────

  renderCategorias() {
    const container = document.getElementById('categories');
    const cats = ProdutosDB.getCategorias();
    const todas = ['', ...cats];
    container.innerHTML = todas.map(cat => `
      <button class="cat-btn ${cat === this.categoriaAtiva ? 'active' : ''}" data-cat="${cat}">
        ${cat || 'Todos'}
      </button>
    `).join('');
  },

  // ── Produtos ──────────────────────────────────────────────────

  renderProdutos() {
    const termo = this.termoBusca.toLowerCase().trim();
    const lista = ProdutosDB.getAtivos().filter(p => {
      const matchCat  = !this.categoriaAtiva || p.categoria === this.categoriaAtiva;
      const matchNome = !termo || p.nome.toLowerCase().includes(termo);
      return matchCat && matchNome;
    });

    const grid = document.getElementById('products-grid');
    if (!lista.length) {
      const totalProdutos = ProdutosDB.getAtivos().length;
      if (totalProdutos > 0) {
        grid.innerHTML = `<div class="empty-state">
          <div style="font-size:48px">🔍</div>
          <p>Nenhum produto encontrado</p>
        </div>`;
      } else {
        grid.innerHTML = `<div class="empty-state">
          <div style="font-size:48px">📦</div>
          <p>Nenhum produto cadastrado ainda</p>
          <a href="produtos.html" class="btn-empty-add">📦 Cadastrar produtos</a>
        </div>`;
      }
      return;
    }
    grid.innerHTML = lista.map(p => this.renderCard(p)).join('');
  },

  renderCard(p) {
    const item  = this.carrinho.find(i => i.id === p.id);
    const qty   = item ? item.qty : 0;
    const imgSrc = p.imagem || 'images/placeholder.svg';

    return `
      <div class="product-card ${qty > 0 ? 'in-cart' : ''}" data-id="${p.id}">
        ${qty > 0 ? `<div class="qty-badge">${qty}</div>` : ''}
        <div class="product-img-wrap" onclick="App.addToCart(${p.id})">
          <img src="${imgSrc}" alt="${p.nome}"
               onerror="this.src='images/placeholder.svg'"
               class="product-img" loading="lazy">
        </div>
        <div class="product-info">
          <div class="product-name">${p.nome}</div>
          <div class="product-price">${fmt(p.preco)}</div>
        </div>
        <div class="product-actions">
          ${qty > 0 ? `
            <button class="btn-qty" onclick="App.changeQty(${p.id}, -1)">−</button>
            <span class="qty-num">${qty}</span>
            <button class="btn-qty" onclick="App.changeQty(${p.id}, 1)">+</button>
          ` : `
            <button class="btn-add" onclick="App.addToCart(${p.id})">+ Adicionar</button>
          `}
        </div>
      </div>
    `;
  },

  // ── Carrinho ──────────────────────────────────────────────────

  addToCart(produtoId) {
    const produto = ProdutosDB.getById(produtoId);
    if (!produto) return;
    const item = this.carrinho.find(i => i.id === produtoId);
    if (item) { item.qty++; }
    else { this.carrinho.push({ id: produto.id, nome: produto.nome, preco: produto.preco, qty: 1 }); }
    DB.salvarCarrinho(this.carrinho);
    this.renderProdutos();
    this.atualizarFab();
    this.toast(`${produto.nome} adicionado`);
  },

  changeQty(produtoId, delta) {
    // Comparação via String para evitar mismatch entre number (seed) e timestamp (novo)
    const idx = this.carrinho.findIndex(i => String(i.id) === String(produtoId));
    if (idx === -1) return;
    this.carrinho[idx].qty += delta;
    if (this.carrinho[idx].qty <= 0) this.carrinho.splice(idx, 1);
    DB.salvarCarrinho(this.carrinho);
    this.renderProdutos();
    this.atualizarFab();
    this.renderItensCarrinho();
    this.atualizarTotalPainel();
  },

  limparCarrinho() {
    if (!confirm('Limpar todos os itens do carrinho?')) return;
    this.carrinho = [];
    DB.limparCarrinho();
    this.renderProdutos();
    this.atualizarFab();
    this.fecharCarrinho();
  },

  atualizarFab() {
    const total = this.carrinho.reduce((s, i) => s + i.preco * i.qty, 0);
    const count = this.carrinho.reduce((s, i) => s + i.qty, 0);
    document.getElementById('cart-count-fab').textContent = count === 1 ? '1 item' : `${count} itens`;
    document.getElementById('cart-total-fab').textContent = fmt(total);
    document.getElementById('cart-fab').classList.toggle('visible', count > 0);
  },

  atualizarTotalPainel() {
    const total = this.carrinho.reduce((s, i) => s + i.preco * i.qty, 0);
    document.getElementById('cart-total-panel').textContent = fmt(total);
  },

  // ── Painel do carrinho ────────────────────────────────────────

  abrirCarrinho() {
    this.renderItensCarrinho();
    this.atualizarTotalPainel();
    document.getElementById('cart-overlay').classList.add('open');
  },

  fecharCarrinho() {
    document.getElementById('cart-overlay').classList.remove('open');
  },

  renderItensCarrinho() {
    const container = document.getElementById('cart-items');
    if (!this.carrinho.length) {
      container.innerHTML = `<div class="empty-cart">
        <span style="font-size:36px">🛒</span><p>Carrinho vazio</p>
      </div>`;
      return;
    }
    container.innerHTML = this.carrinho.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <span class="cart-item-name">${item.nome}</span>
          <span class="cart-item-price">
            ${fmt(item.preco)} × ${item.qty} = <strong>${fmt(item.preco * item.qty)}</strong>
          </span>
        </div>
        <div class="cart-item-ctrl">
          <button class="btn-qty" onclick="App.changeQty(${item.id}, -1)">−</button>
          <span>${item.qty}</span>
          <button class="btn-qty" onclick="App.changeQty(${item.id}, 1)">+</button>
        </div>
      </div>
    `).join('');
  },

  // ── Finalizar venda ───────────────────────────────────────────

  finalizarVenda() {
    if (!this.carrinho.length) { this.toast('Carrinho vazio!'); return; }

    const nome = document.getElementById('client-name').value.trim();
    const tel  = document.getElementById('client-phone').value.trim();

    const venda = {
      id:         uid(),
      timestamp:  new Date().toISOString(),
      itens:      this.carrinho.map(i => ({ ...i })),
      total:      this.carrinho.reduce((s, i) => s + i.preco * i.qty, 0),
      pagamento:  this.pagamento,
      cliente:    nome ? { nome, telefone: tel } : null,
      vendedor:   this.vendedorAtual || null,
    };

    DB.salvarVenda(venda);
    if (typeof PDVSync !== 'undefined') PDVSync.pushVenda(venda);
    this.carrinho = [];
    DB.limparCarrinho();
    document.getElementById('client-name').value = '';
    document.getElementById('client-phone').value = '';

    this.fecharCarrinho();
    this.renderProdutos();
    this.atualizarFab();

    document.getElementById('success-info-total').textContent   = `💰 ${fmt(venda.total)}`;
    document.getElementById('success-info-pay').textContent     = `Pagamento: ${venda.pagamento}`;
    document.getElementById('success-info-client').textContent  = venda.cliente ? `👤 ${venda.cliente.nome}` : '';
    document.getElementById('success-overlay').classList.add('open');
  },

  // ── Histórico ─────────────────────────────────────────────────

  abrirHistorico() {
    const vendas      = DB.getVendasHoje();
    const minhas      = this.vendedorAtual
      ? vendas.filter(v => v.vendedor?.id === this.vendedorAtual.id)
      : vendas;
    const total       = vendas.reduce((s, v) => s + v.total, 0);
    const totalMeu    = minhas.reduce((s, v) => s + v.total, 0);

    document.getElementById('history-summary').innerHTML = `
      <div class="summary-card">
        <div>
          <div class="summary-count">Total empresa: ${vendas.length} venda(s)</div>
          <div class="summary-date">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          ${this.vendedorAtual ? `<div class="summary-mine">Suas vendas: ${minhas.length} · ${fmt(totalMeu)}</div>` : ''}
        </div>
        <div class="summary-total">${fmt(total)}</div>
      </div>
    `;

    document.getElementById('history-list').innerHTML = !vendas.length
      ? `<div class="empty-state"><p>Nenhuma venda registrada hoje</p></div>`
      : [...vendas].reverse().map(v => `
          <div class="history-item ${v.vendedor?.id === this.vendedorAtual?.id ? 'mine' : ''}">
            <div class="history-header">
              <div>
                <span class="history-time">${fmtHora(v.timestamp)}</span>
                ${v.vendedor ? `<span class="history-seller">· ${v.vendedor.nome}</span>` : ''}
              </div>
              <span class="history-total">${fmt(v.total)}</span>
            </div>
            <div class="history-itens">${v.itens.map(i => `${i.qty}× ${i.nome}`).join(' · ')}</div>
            ${v.cliente ? `<div class="history-cliente">👤 ${v.cliente.nome}${v.cliente.telefone ? ' · ' + v.cliente.telefone : ''}</div>` : ''}
            <span class="history-pay">${v.pagamento}</span>
          </div>
        `).join('');

    document.getElementById('history-overlay').classList.add('open');
  },

  fecharHistorico() { document.getElementById('history-overlay').classList.remove('open'); },

  // ── Exportar CSV ──────────────────────────────────────────────

  exportarCSV() {
    const vendas = DB.getVendasHoje();
    if (!vendas.length) { this.toast('Sem vendas hoje para exportar'); return; }

    const cab = ['Data/Hora','Vendedor','Cliente','Telefone','Itens','Qtd','Total (R$)','Pagamento'];
    const linhas = vendas.map(v => [
      fmtDateTime(v.timestamp),
      v.vendedor?.nome || '',
      v.cliente?.nome  || '',
      v.cliente?.telefone || '',
      v.itens.map(i => `${i.qty}x ${i.nome}`).join(' | '),
      v.itens.reduce((s, i) => s + i.qty, 0),
      v.total.toFixed(2).replace('.', ','),
      v.pagamento,
    ]);

    const csv  = [cab, ...linhas].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vendas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast('CSV exportado!');
  },

  // ── Toast ─────────────────────────────────────────────────────

  toast(msg, ms = 2200) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  },

  // ── Eventos ───────────────────────────────────────────────────

  bindEvents() {
    // Seleção de vendedor
    document.getElementById('vendor-list').addEventListener('click', e => {
      const btn = e.target.closest('.vendor-btn');
      if (btn) this.selecionarVendedor(btn.dataset.id, btn.dataset.nome);
    });
    document.getElementById('btn-change-vendor').addEventListener('click', () => this.trocarVendedor());

    // Busca
    document.getElementById('search').addEventListener('input', e => {
      this.termoBusca = e.target.value;
      this.renderProdutos();
    });

    // Categorias
    document.getElementById('categories').addEventListener('click', e => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.categoriaAtiva = btn.dataset.cat;
      this.renderProdutos();
    });

    // Carrinho
    document.getElementById('btn-open-cart').addEventListener('click', () => this.abrirCarrinho());
    document.getElementById('btn-close-cart').addEventListener('click', () => this.fecharCarrinho());
    document.getElementById('cart-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.fecharCarrinho();
    });

    // Pagamento
    document.querySelectorAll('.pay-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.pagamento = btn.dataset.pay;
      });
    });

    document.getElementById('btn-confirm').addEventListener('click',    () => this.finalizarVenda());
    document.getElementById('btn-clear-cart').addEventListener('click', () => this.limparCarrinho());
    document.getElementById('btn-new-sale').addEventListener('click', () => {
      document.getElementById('success-overlay').classList.remove('open');

      // Apresenta o PDV Pro uma única vez após a 1ª venda concluída
      if (typeof PDVSync !== 'undefined' && !PDVSync.isLoggedIn() && !localStorage.getItem('pdvpro_modo')) {
        const todasVendas = JSON.parse(localStorage.getItem('pdvlight_vendas_v1') || '[]');
        if (todasVendas.length === 1) {
          setTimeout(() => PDVSync.abrirAuth(), 800);
        }
      }
    });

    // Histórico
    document.getElementById('btn-history').addEventListener('click',       () => this.abrirHistorico());
    document.getElementById('btn-close-history').addEventListener('click', () => this.fecharHistorico());
    document.getElementById('history-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.fecharHistorico();
    });
    document.getElementById('btn-export-csv').addEventListener('click', () => this.exportarCSV());
  },
};

// ── Utilitários ───────────────────────────────────────────────────

function fmt(v)        { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtHora(iso)  { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function fmtDateTime(iso) { return new Date(iso).toLocaleString('pt-BR'); }
function uid()         { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

document.addEventListener('DOMContentLoaded', () => App.init());
