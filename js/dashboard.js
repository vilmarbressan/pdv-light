/**
 * Dashboard — PDV Light
 * Requer: vendors.js, db.js, Chart.js 4.x
 */
const Dashboard = {
  grafico: null,
  tabAtiva: 'periodo',

  filtros: {
    periodo:    'hoje',
    vendedorId: null,
    inicio:     null,
    fim:        null,
  },

  // ── Inicialização ────────────────────────────────────────────

  init() {
    this.preencherFiltroVendedor();
    this.bindEvents();
    this.atualizar();
    // Auto-refresh a cada 60 segundos
    setInterval(() => this.atualizar(), 60000);
  },

  preencherFiltroVendedor() {
    const sel = document.getElementById('filter-vendedor');
    VendedoresDB.getAtivos().forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.nome;
      sel.appendChild(opt);
    });
  },

  // ── Eventos ──────────────────────────────────────────────────

  bindEvents() {
    document.getElementById('filter-periodo').addEventListener('change', e => {
      this.filtros.periodo = e.target.value;
      const customRange = document.getElementById('custom-range');
      customRange.style.display = e.target.value === 'custom' ? 'flex' : 'none';
      if (e.target.value !== 'custom') this.atualizar();
    });

    document.getElementById('filter-inicio').addEventListener('change', () => {
      this.filtros.inicio = document.getElementById('filter-inicio').value;
      if (this.filtros.fim) this.atualizar();
    });

    document.getElementById('filter-fim').addEventListener('change', () => {
      this.filtros.fim = document.getElementById('filter-fim').value;
      if (this.filtros.inicio) this.atualizar();
    });

    document.getElementById('filter-vendedor').addEventListener('change', e => {
      this.filtros.vendedorId = e.target.value || null;
      this.atualizar();
    });

    document.getElementById('chart-tabs').addEventListener('click', e => {
      const tab = e.target.closest('.chart-tab');
      if (!tab) return;
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      this.tabAtiva = tab.dataset.tab;
      this.renderGrafico(this._lastStats, this._lastVendas);
    });

    document.getElementById('btn-refresh').addEventListener('click', () => this.atualizar(true));

    document.getElementById('btn-export-dash').addEventListener('click', () => this.exportarCSV());
  },

  // ── Atualização principal ─────────────────────────────────────

  atualizar(comSpin = false) {
    const btn = document.getElementById('btn-refresh');
    if (comSpin) btn.classList.add('spinning');

    const { inicio, fim } = this.getDateRange();
    const vendas  = DB.getVendasPorFiltro({ inicio, fim, vendedorId: this.filtros.vendedorId });
    const stats   = DB.calcularStats(vendas);

    this._lastStats  = stats;
    this._lastVendas = vendas;

    this.renderMetricas(stats, vendas.length);
    this.renderGrafico(stats, vendas);
    this.renderTabela(vendas);

    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-update').textContent = `Atualizado às ${agora}`;

    setTimeout(() => btn.classList.remove('spinning'), 600);
  },

  // ── Intervalo de datas ────────────────────────────────────────

  getDateRange() {
    const hoje    = new Date();
    const diaBase = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimDia  = new Date(diaBase.getTime() + 86399999);

    switch (this.filtros.periodo) {
      case 'hoje':
        return { inicio: diaBase, fim: fimDia };
      case 'ontem': {
        const ontem = new Date(diaBase.getTime() - 86400000);
        return { inicio: ontem, fim: new Date(ontem.getTime() + 86399999) };
      }
      case '7dias':
        return { inicio: new Date(diaBase.getTime() - 6 * 86400000), fim: fimDia };
      case '30dias':
        return { inicio: new Date(diaBase.getTime() - 29 * 86400000), fim: fimDia };
      case 'mes':
        return {
          inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
          fim:    new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59),
        };
      case 'custom': {
        const i = this.filtros.inicio ? new Date(this.filtros.inicio + 'T00:00:00') : diaBase;
        const f = this.filtros.fim    ? new Date(this.filtros.fim    + 'T23:59:59') : fimDia;
        return { inicio: i, fim: f };
      }
      default:
        return { inicio: diaBase, fim: fimDia };
    }
  },

  // ── Métricas ─────────────────────────────────────────────────

  renderMetricas(s, count) {
    document.getElementById('m-total').textContent  = fmt(s.total);
    document.getElementById('m-count').textContent  = s.count;
    document.getElementById('m-ticket').textContent = fmt(s.ticket);
    document.getElementById('m-itens').textContent  = s.qtdItens;

    // Sub-textos: produto mais vendido e forma dominante
    const topProduto   = topKey(s.porProduto, 'qty');
    const topPagamento = topKey(s.porPagamento);

    document.getElementById('m-total-sub').textContent  = topPagamento  ? `Mais usado: ${topPagamento}` : '';
    document.getElementById('m-count-sub').textContent  = '';
    document.getElementById('m-ticket-sub').textContent = '';
    document.getElementById('m-itens-sub').textContent  = topProduto ? `Top: ${topProduto}` : '';
  },

  // ── Gráficos ─────────────────────────────────────────────────

  renderGrafico(stats, vendas) {
    if (!stats) return;

    const vazio = !vendas || vendas.length === 0;
    document.getElementById('chart-empty').style.display  = vazio ? 'flex'  : 'none';
    document.getElementById('chart-canvas').style.display = vazio ? 'none'  : 'block';

    if (vazio) {
      if (this.grafico) { this.grafico.destroy(); this.grafico = null; }
      return;
    }

    switch (this.tabAtiva) {
      case 'periodo':   this.graficoPeriodo(stats);   break;
      case 'hora':      this.graficoHora(stats);      break;
      case 'produto':   this.graficoProduto(stats);   break;
      case 'vendedor':  this.graficoVendedor(stats);  break;
      case 'pagamento': this.graficoPagamento(stats); break;
    }
  },

  criarGrafico(config) {
    if (this.grafico) { this.grafico.destroy(); this.grafico = null; }
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    this.grafico = new Chart(ctx, config);
  },

  graficoPeriodo(stats) {
    const isSingleDay = this.filtros.periodo === 'hoje' || this.filtros.periodo === 'ontem';

    if (isSingleDay) {
      // Por hora
      const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}h`);
      this.criarGrafico({
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Receita (R$)',
            data: stats.porHora,
            backgroundColor: CORES[0] + 'cc',
            borderColor: CORES[0],
            borderWidth: 1,
            borderRadius: 5,
          }],
        },
        options: opcoesBase('Receita por hora do dia'),
      });
    } else {
      // Por dia
      const dias   = Object.keys(stats.porDia).sort();
      const valores = dias.map(d => stats.porDia[d]);
      this.criarGrafico({
        type: 'bar',
        data: {
          labels: dias.map(d => fmtDia(d)),
          datasets: [{
            label: 'Receita (R$)',
            data: valores,
            backgroundColor: CORES[0] + 'cc',
            borderColor: CORES[0],
            borderWidth: 1,
            borderRadius: 5,
          }],
        },
        options: opcoesBase('Receita por dia'),
      });
    }
  },

  graficoHora(stats) {
    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}h`);
    const countPorHora = Array(24).fill(0);
    (this._lastVendas || []).forEach(v => {
      countPorHora[new Date(v.timestamp).getHours()]++;
    });

    this.criarGrafico({
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Receita (R$)',
            data: stats.porHora,
            backgroundColor: CORES[0] + 'bb',
            borderColor: CORES[0],
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Nº de Vendas',
            data: countPorHora,
            type: 'line',
            borderColor: CORES[1],
            backgroundColor: CORES[1] + '22',
            tension: 0.4,
            pointRadius: 4,
            fill: true,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        ...opcoesBase('Distribuição por hora'),
        scales: {
          x: { grid: { display: false } },
          y:  { beginAtZero: true, position: 'left',  ticks: { callback: v => 'R$' + v.toFixed(0) } },
          y2: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { stepSize: 1 } },
        },
      },
    });
  },

  graficoProduto(stats) {
    const entradas = Object.entries(stats.porProduto)
      .sort((a, b) => b[1].receita - a[1].receita)
      .slice(0, 12);

    this.criarGrafico({
      type: 'bar',
      data: {
        labels: entradas.map(([nome]) => nome),
        datasets: [{
          label: 'Receita (R$)',
          data: entradas.map(([, d]) => d.receita),
          backgroundColor: entradas.map((_, i) => CORES[i % CORES.length] + 'cc'),
          borderColor:     entradas.map((_, i) => CORES[i % CORES.length]),
          borderWidth: 1,
          borderRadius: 5,
        }],
      },
      options: {
        ...opcoesBase('Top produtos por receita'),
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const nome = ctx.label;
                const rec  = entradas.find(([n]) => n === nome)?.[1];
                return rec
                  ? [`Receita: ${fmt(rec.receita)}`, `Qtd vendida: ${rec.qty}`]
                  : '';
              },
            },
          },
        },
        scales: {
          x: { beginAtZero: true, ticks: { callback: v => 'R$' + v.toFixed(0) } },
          y: { grid: { display: false } },
        },
      },
    });
  },

  graficoVendedor(stats) {
    const entradas = Object.entries(stats.porVendedor)
      .sort((a, b) => b[1].receita - a[1].receita);

    this.criarGrafico({
      type: 'bar',
      data: {
        labels: entradas.map(([nome]) => nome),
        datasets: [
          {
            label: 'Receita (R$)',
            data: entradas.map(([, d]) => d.receita),
            backgroundColor: entradas.map((_, i) => CORES[i % CORES.length] + 'cc'),
            borderColor:     entradas.map((_, i) => CORES[i % CORES.length]),
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            label: 'Nº de Vendas',
            data: entradas.map(([, d]) => d.count),
            type: 'line',
            borderColor: '#94a3b8',
            backgroundColor: '#94a3b822',
            tension: 0.3,
            pointRadius: 5,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        ...opcoesBase('Vendas por vendedor'),
        scales: {
          x:  { grid: { display: false } },
          y:  { beginAtZero: true, position: 'left',  ticks: { callback: v => 'R$' + v.toFixed(0) } },
          y2: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { stepSize: 1 } },
        },
      },
    });
  },

  graficoPagamento(stats) {
    const entradas = Object.entries(stats.porPagamento)
      .sort((a, b) => b[1] - a[1]);

    this.criarGrafico({
      type: 'doughnut',
      data: {
        labels: entradas.map(([k]) => k),
        datasets: [{
          data: entradas.map(([, v]) => v),
          backgroundColor: CORES.slice(0, entradas.length).map(c => c + 'dd'),
          borderColor: CORES.slice(0, entradas.length),
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'right', labels: { padding: 14, font: { size: 13 } } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct   = ((ctx.parsed / total) * 100).toFixed(1);
                return `${ctx.label}: ${fmt(ctx.parsed)} (${pct}%)`;
              },
            },
          },
          title: { display: true, text: 'Receita por forma de pagamento', padding: { bottom: 12 }, font: { size: 14 } },
        },
      },
    });
  },

  // ── Tabela ────────────────────────────────────────────────────

  renderTabela(vendas) {
    document.getElementById('table-count').textContent = `${vendas.length} venda(s)`;
    const tbody = document.getElementById('table-body');

    if (!vendas.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Sem vendas no período selecionado</td></tr>`;
      return;
    }

    tbody.innerHTML = [...vendas].reverse().map(v => `
      <tr>
        <td>${fmtHora(v.timestamp)}<br><small style="color:var(--muted)">${fmtData(v.timestamp)}</small></td>
        <td class="td-seller">${v.vendedor?.nome || '<span style="color:var(--muted)">—</span>'}</td>
        <td>${v.cliente?.nome || '<span style="color:var(--muted)">—</span>'}
            ${v.cliente?.telefone ? `<br><small style="color:var(--muted)">${v.cliente.telefone}</small>` : ''}</td>
        <td class="td-itens">${v.itens.map(i => `${i.qty}× ${i.nome}`).join(' · ')}</td>
        <td class="td-valor">${fmt(v.total)}</td>
        <td><span class="td-pay">${v.pagamento}</span></td>
      </tr>
    `).join('');
  },

  // ── Exportar CSV ──────────────────────────────────────────────

  exportarCSV() {
    const vendas = this._lastVendas || [];
    if (!vendas.length) { alert('Sem dados para exportar no período selecionado.'); return; }

    const cab = ['Data','Hora','Vendedor','Cliente','Telefone','Itens','Qtd Total','Total (R$)','Pagamento'];
    const linhas = [...vendas].reverse().map(v => [
      fmtData(v.timestamp),
      fmtHora(v.timestamp),
      v.vendedor?.nome || '',
      v.cliente?.nome  || '',
      v.cliente?.telefone || '',
      v.itens.map(i => `${i.qty}x ${i.nome}`).join(' | '),
      v.itens.reduce((s, i) => s + i.qty, 0),
      v.total.toFixed(2).replace('.', ','),
      v.pagamento,
    ]);

    const csv  = [cab, ...linhas].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const data = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    a.href     = url;
    a.download = `dashboard_${data}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ── Utilitários ───────────────────────────────────────────────────

const CORES = ['#16a34a','#0284c7','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#65a30d'];

function fmt(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function fmtHora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtDia(yyyy_mm_dd) {
  const [y, m, d] = yyyy_mm_dd.split('-');
  return `${d}/${m}`;
}

function topKey(obj, subkey) {
  if (!obj || !Object.keys(obj).length) return null;
  if (subkey) {
    return Object.entries(obj).sort((a, b) => b[1][subkey] - a[1][subkey])[0]?.[0] || null;
  }
  return Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function opcoesBase(titulo) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title:  { display: !!titulo, text: titulo, padding: { bottom: 12 }, font: { size: 14 } },
      tooltip: {
        callbacks: {
          label: ctx => {
            const v = ctx.parsed.y ?? ctx.parsed;
            return typeof v === 'number' && ctx.dataset.label?.includes('R$')
              ? `${ctx.dataset.label}: ${fmt(v)}`
              : `${ctx.dataset.label}: ${v}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { callback: v => 'R$' + v.toFixed(0) } },
    },
  };
}

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
