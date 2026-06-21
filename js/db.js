/**
 * DB — Camada de persistência via localStorage
 */
const DB = {
  KEYS: {
    vendas:    'pdvlight_vendas_v1',
    carrinho:  'pdvlight_carrinho_v1',
  },

  // ── Vendas ────────────────────────────────────────────────────

  getTodasVendas() {
    try { return JSON.parse(localStorage.getItem(this.KEYS.vendas) || '[]'); }
    catch { return []; }
  },

  salvarVenda(venda) {
    const vendas = this.getTodasVendas();
    vendas.push(venda);
    localStorage.setItem(this.KEYS.vendas, JSON.stringify(vendas));
  },

  getVendasHoje() {
    const hoje = new Date().toDateString();
    return this.getTodasVendas().filter(v =>
      new Date(v.timestamp).toDateString() === hoje
    );
  },

  /**
   * Filtra vendas por período e/ou vendedor.
   * @param {Object} filtro
   * @param {Date}   filtro.inicio
   * @param {Date}   filtro.fim
   * @param {number|null} filtro.vendedorId — null = todos
   */
  getVendasPorFiltro({ inicio, fim, vendedorId = null }) {
    return this.getTodasVendas().filter(v => {
      const ts = new Date(v.timestamp);
      const matchData     = ts >= inicio && ts <= fim;
      const matchVendedor = !vendedorId || String(v.vendedor?.id) === String(vendedorId);
      return matchData && matchVendedor;
    });
  },

  /**
   * Calcula todas as estatísticas de um array de vendas.
   * Retorna objeto pronto para os gráficos.
   */
  calcularStats(vendas) {
    const vazio = {
      total: 0, count: 0, ticket: 0, qtdItens: 0,
      porHora:      Array(24).fill(0),
      porDia:       {},
      porProduto:   {},
      porVendedor:  {},
      porPagamento: {},
    };
    if (!vendas.length) return vazio;

    const s = {
      total:    vendas.reduce((a, v) => a + v.total, 0),
      count:    vendas.length,
      qtdItens: vendas.reduce((a, v) => a + v.itens.reduce((b, i) => b + i.qty, 0), 0),
      porHora:      Array(24).fill(0),
      porDia:       {},
      porProduto:   {},
      porVendedor:  {},
      porPagamento: {},
    };
    s.ticket = s.total / s.count;

    vendas.forEach(v => {
      const d  = new Date(v.timestamp);
      const hr = d.getHours();
      const dia = v.timestamp.slice(0, 10);

      // Por hora
      s.porHora[hr] += v.total;

      // Por dia
      s.porDia[dia] = (s.porDia[dia] || 0) + v.total;

      // Por vendedor
      const vNome = v.vendedor?.nome || 'Sem vendedor';
      if (!s.porVendedor[vNome]) s.porVendedor[vNome] = { receita: 0, count: 0 };
      s.porVendedor[vNome].receita += v.total;
      s.porVendedor[vNome].count++;

      // Por pagamento
      s.porPagamento[v.pagamento] = (s.porPagamento[v.pagamento] || 0) + v.total;

      // Por produto
      v.itens.forEach(i => {
        if (!s.porProduto[i.nome]) s.porProduto[i.nome] = { receita: 0, qty: 0 };
        s.porProduto[i.nome].receita += i.preco * i.qty;
        s.porProduto[i.nome].qty     += i.qty;
      });
    });

    return s;
  },

  // ── Carrinho ──────────────────────────────────────────────────

  getCarrinho() {
    try { return JSON.parse(localStorage.getItem(this.KEYS.carrinho) || '[]'); }
    catch { return []; }
  },

  salvarCarrinho(c)  { localStorage.setItem(this.KEYS.carrinho, JSON.stringify(c)); },
  limparCarrinho()   { localStorage.removeItem(this.KEYS.carrinho); },
};
