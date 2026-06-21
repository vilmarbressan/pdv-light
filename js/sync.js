/**
 * PDVSync — Sincronização com o PDV Light Pro (backend na nuvem)
 * Fire-and-forget: nunca bloqueia a UI do PDV.
 *
 * Configure a URL da API antes de publicar:
 *   localStorage.setItem('pdvpro_api_url', 'https://api.seudominio.com')
 */
const PDVSync = (() => {
  'use strict';

  // ── Configuração ────────────────────────────────────────────────
  const API      = () => localStorage.getItem('pdvpro_api_url') || 'https://pdvapi.inteligenciaparacrescer.com';
  const K_TOKEN  = 'pdvpro_token';
  const K_MODO   = 'pdvpro_modo';   // 'local' | 'cloud'

  // ── Token ────────────────────────────────────────────────────────
  const getToken   = ()  => localStorage.getItem(K_TOKEN);
  const setToken   = t   => localStorage.setItem(K_TOKEN, t);
  const delToken   = ()  => localStorage.removeItem(K_TOKEN);
  const isLoggedIn = ()  => !!getToken();

  // ── HTTP helper ──────────────────────────────────────────────────
  async function http(method, path, body) {
    const token = getToken();
    const res = await fetch(API() + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (res.status === 401) { _deslogar(false); return null; }
    return res.json().catch(() => null);
  }

  // ── Auth ─────────────────────────────────────────────────────────
  async function entrar(email, senha) {
    const data = await http('POST', '/auth/login', { email, senha });
    if (data?.token) {
      setToken(data.token);
      localStorage.setItem(K_MODO, 'cloud');
      return { ok: true };
    }
    return { ok: false, erro: data?.error || 'Credenciais inválidas' };
  }

  async function registrar(email, senha, nome, empresaNome) {
    const data = await http('POST', '/auth/register', {
      email, senha, nome, empresa_nome: empresaNome,
    });
    if (data?.token) {
      setToken(data.token);
      localStorage.setItem(K_MODO, 'cloud');
      return { ok: true };
    }
    return { ok: false, erro: data?.error || 'Erro ao criar conta' };
  }

  function _deslogar(reload = true) {
    delToken();
    localStorage.setItem(K_MODO, 'local');
    _atualizarIconeNuvem();
    if (reload) location.reload();
  }

  // ── Normalização de venda ────────────────────────────────────────
  // O app usa `timestamp`; o backend espera `created_at`
  function _normVenda(v) {
    return { ...v, created_at: v.created_at || v.timestamp || new Date().toISOString() };
  }

  // ── Push de uma venda (chamado após cada finalização) ────────────
  function pushVenda(venda) {
    if (!isLoggedIn()) return;
    http('POST', '/sync/push', { vendas: [_normVenda(venda)] })
      .then(r => _setNuvemStatus(r?.ok ? 'ok' : 'erro'))
      .catch(() => _setNuvemStatus('erro'));
  }

  // ── Push completo (todos os dados locais → nuvem) ────────────────
  async function pushAll() {
    if (!isLoggedIn()) return;
    const config     = _ls('pdvlight_config_v1',    {});
    const vendedores = _ls('pdvlight_vendedores_v1', []);
    const produtos   = _ls('pdvlight_produtos_v2',   []);
    const vendas     = _ls('pdvlight_vendas_v1',     []);

    const r = await http('POST', '/sync/push', {
      config, vendedores, produtos,
      vendas: vendas.map(_normVenda),
    }).catch(() => null);
    _setNuvemStatus(r?.ok ? 'ok' : 'erro');
    return r;
  }

  // ── Pull (nuvem → dispositivo; usado ao logar em novo celular) ───
  async function pull() {
    if (!isLoggedIn()) return;
    const data = await http('GET', '/sync/pull').catch(() => null);
    if (!data) return;

    if (data.config?.nome) {
      const local = _ls('pdvlight_config_v1', {});
      localStorage.setItem('pdvlight_config_v1', JSON.stringify({ ...local, ...data.config }));
    }
    if (data.vendedores?.length) {
      localStorage.setItem('pdvlight_vendedores_v1', JSON.stringify(data.vendedores));
    }
    if (data.produtos?.length) {
      localStorage.setItem('pdvlight_produtos_v2', JSON.stringify(data.produtos));
    }
    if (data.vendas?.length) {
      const locais  = _ls('pdvlight_vendas_v1', []);
      const idsNuvem = new Set(data.vendas.map(v => String(v.id)));
      const merged   = [...data.vendas, ...locais.filter(v => !idsNuvem.has(String(v.id)))];
      localStorage.setItem('pdvlight_vendas_v1', JSON.stringify(merged));
    }
    _setNuvemStatus('ok');
    return data;
  }

  // ── Helpers localStorage ─────────────────────────────────────────
  function _ls(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }

  // ── Ícone de nuvem no header ─────────────────────────────────────
  function _setNuvemStatus(status) {
    const btn = document.getElementById('btn-cloud');
    if (!btn) return;
    if (status === 'erro') {
      btn.textContent = '⚠️';
      btn.title = 'Falha na sincronização — toque para tentar novamente';
    } else {
      btn.textContent = '☁️';
      btn.title = 'Dados sincronizados na nuvem';
    }
  }

  function _atualizarIconeNuvem() {
    const btn = document.getElementById('btn-cloud');
    if (!btn) return;
    if (isLoggedIn()) {
      btn.removeAttribute('hidden');
      _setNuvemStatus('ok');
    } else {
      btn.setAttribute('hidden', '');
    }
  }

  // ── Modal de autenticação ────────────────────────────────────────
  function abrirAuth() {
    document.getElementById('auth-overlay')?.classList.add('open');
  }

  function _fecharAuth() {
    document.getElementById('auth-overlay')?.classList.remove('open');
  }

  function _setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (!btn._txt) btn._txt = btn.textContent;
    btn.disabled    = loading;
    btn.textContent = loading ? 'Aguarde...' : btn._txt;
  }

  function _setErro(msg) {
    const el = document.getElementById('auth-error');
    if (el) el.textContent = msg;
  }

  function _bindModal() {
    const overlay = document.getElementById('auth-overlay');
    if (!overlay) return;

    // Tabs login / criar conta
    overlay.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.tab;
        document.getElementById('form-login').hidden    = which !== 'login';
        document.getElementById('form-register').hidden = which !== 'register';
        _setErro('');
      });
    });

    // Entrar
    document.getElementById('btn-entrar').addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      const senha = document.getElementById('auth-senha').value;
      if (!email || !senha) { _setErro('Preencha e-mail e senha'); return; }

      _setLoading('btn-entrar', true);
      const r = await entrar(email, senha).catch(() => ({ ok: false, erro: 'Sem conexão com o servidor' }));
      _setLoading('btn-entrar', false);

      if (r.ok) {
        _fecharAuth();
        _atualizarIconeNuvem();
        App?.toast?.('☁️ Conectado! Sincronizando dados...');
        pull().then(() => location.reload()).catch(() => {});
      } else {
        _setErro(r.erro);
      }
    });

    // Criar conta
    document.getElementById('btn-registrar').addEventListener('click', async () => {
      const nome    = document.getElementById('auth-nome').value.trim();
      const empresa = document.getElementById('auth-empresa').value.trim();
      const email   = document.getElementById('auth-reg-email').value.trim();
      const senha   = document.getElementById('auth-reg-senha').value;

      if (!nome || !empresa || !email || !senha) { _setErro('Preencha todos os campos'); return; }
      if (senha.length < 6)                       { _setErro('Senha: mínimo 6 caracteres'); return; }

      _setLoading('btn-registrar', true);
      const r = await registrar(email, senha, nome, empresa).catch(() => ({ ok: false, erro: 'Sem conexão com o servidor' }));
      _setLoading('btn-registrar', false);

      if (r.ok) {
        _fecharAuth();
        _atualizarIconeNuvem();
        App?.toast?.('✅ Conta criada! Enviando seus dados...');
        pushAll().then(() => App?.toast?.('☁️ Dados enviados para a nuvem!')).catch(() => {});
      } else {
        _setErro(r.erro);
      }
    });

    // Continuar sem conta
    document.getElementById('btn-auth-skip').addEventListener('click', () => {
      localStorage.setItem(K_MODO, 'local');
      _fecharAuth();
    });

    // Botão ☁️ no header
    document.getElementById('btn-cloud')?.addEventListener('click', () => {
      if (!isLoggedIn()) {
        abrirAuth();
      } else if (document.getElementById('btn-cloud').textContent === '⚠️') {
        App?.toast?.('Tentando sincronizar...');
        pushAll().catch(() => {});
      } else if (confirm('Desconectar da nuvem?\nSeus dados locais serão mantidos.')) {
        _deslogar(true);
      }
    });
  }

  // ── Inicialização (chamada pelo App.init) ────────────────────────
  async function inicializar() {
    _bindModal();
    _atualizarIconeNuvem();

    if (isLoggedIn()) {
      // Sincroniza em background sem bloquear
      pull().catch(() => {});
    }
    // O modal Pro é acionado pelo app.js após a 1ª venda concluída
  }

  return { inicializar, isLoggedIn, pushVenda, pushAll, pull, abrirAuth };
})();
