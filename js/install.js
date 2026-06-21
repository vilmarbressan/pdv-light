/**
 * install.js — Gerencia a instalação do PDV Light como PWA
 *
 * Cobre 3 situações:
 *  1. Navegador in-app (WhatsApp/Instagram) → avisa para abrir no Chrome/Safari
 *  2. Android Chrome → captura beforeinstallprompt e exibe banner próprio
 *  3. iOS Safari      → exibe guia "Adicionar à Tela de Início" após 30s de uso
 */
const Install = (() => {
  'use strict';

  let _promptAndroid = null;

  // ── Detecção de ambiente ──────────────────────────────────────
  const ua          = navigator.userAgent;
  const isIOS       = /iPad|iPhone|iPod/.test(ua);
  const isAndroid   = /Android/.test(ua);
  const isStandalone = window.navigator.standalone === true
                    || window.matchMedia('(display-mode: standalone)').matches;
  const isInApp     = /WhatsApp|Instagram|FBAN|FBAV|MicroMessenger/.test(ua);
  const isIOSSafari = isIOS
                    && /Safari/.test(ua)
                    && !/CriOS|FxiOS|OPiOS/.test(ua)
                    && !isInApp;

  // ── Entrada principal ─────────────────────────────────────────
  function iniciar() {
    if (isStandalone) return; // já instalado — não exibe nada

    if (isInApp) {
      _mostrarAvisoInApp();
      return;
    }

    // Android Chrome: captura o evento de instalação nativo
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      _promptAndroid = e;
      _mostrarBannerAndroid();
    });

    // iOS Safari: guia passo-a-passo após 30s de uso (uma vez)
    if (isIOSSafari && !localStorage.getItem('pdvlight_ios_guide_ok')) {
      setTimeout(_mostrarGuiaIOS, 30_000);
    }
  }

  // ── 1. Aviso: navegador in-app ────────────────────────────────
  function _mostrarAvisoInApp() {
    const el = document.getElementById('iab-warning');
    if (!el) return;
    el.removeAttribute('hidden');

    const instrucao = el.querySelector('.iab-instrucao');
    if (instrucao) {
      instrucao.textContent = isIOS
        ? 'Toque em "Abrir no Safari" — depois instale o app pela seta ↑ Compartilhar'
        : 'Toque nos 3 pontinhos ⋮ no canto superior e escolha "Abrir no Chrome"';
    }

    el.querySelector('.btn-iab-copiar')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(window.location.href).then(() =>
        App?.toast?.('Link copiado! Cole no Chrome ou Safari')
      ).catch(() =>
        App?.toast?.('Copie o endereço da barra do navegador e abra no Chrome')
      );
    });

    el.querySelector('.btn-iab-fechar')?.addEventListener('click', () => {
      el.setAttribute('hidden', '');
    });
  }

  // ── 2. Banner: Android Chrome ─────────────────────────────────
  function _mostrarBannerAndroid() {
    const banner = document.getElementById('install-banner');
    if (!banner) return;
    banner.removeAttribute('hidden');

    banner.querySelector('#btn-instalar')?.addEventListener('click', async () => {
      if (!_promptAndroid) return;
      _promptAndroid.prompt();
      const { outcome } = await _promptAndroid.userChoice;
      _promptAndroid = null;
      if (outcome === 'accepted') {
        banner.setAttribute('hidden', '');
      }
    });

    banner.querySelector('#btn-instalar-fechar')?.addEventListener('click', () => {
      banner.setAttribute('hidden', '');
    });
  }

  // ── 3. Guia: iOS Safari ───────────────────────────────────────
  function _mostrarGuiaIOS() {
    const guia = document.getElementById('ios-guide');
    if (!guia) return;
    guia.removeAttribute('hidden');

    guia.querySelector('#btn-ios-ok')?.addEventListener('click', () => {
      localStorage.setItem('pdvlight_ios_guide_ok', '1');
      guia.setAttribute('hidden', '');
    });
  }

  return { iniciar };
})();

document.addEventListener('DOMContentLoaded', () => Install.iniciar());
