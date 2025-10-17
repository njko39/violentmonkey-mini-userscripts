// ==UserScript==
// @name         Trello: completion ding 
// @namespace    https://trello.com/
// @version      1.0
// @description  Plays a sound when a Trello card is marked complete 
// @match        https://trello.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_getResourceURL
// @resource     SFX https://raw.githubusercontent.com/njko39/violentmonkey-mini-userscripts/refs/heads/main/src/sound/198401__ani_music__ani-wine-glass-hard.wav
// @updateURL https://github.com/njko39/violentmonkey-mini-userscripts/raw/refs/heads/main/trello-completion-sfx.user.js
// ==/UserScript==

(() => {
  'use strict';

  const SEL = '[data-testid="card-done-state-completion-button"]';
  const getLabel = (btn) => btn.querySelector('span[role="img"]')?.getAttribute('aria-label') || '';
  const isComplete = (btn) => /^Mark this card incomplete/i.test(getLabel(btn));
  const afterPaint = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  let ctx, buffer, loadPromise;

  async function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }

  async function ensureBuffer() {
    if (buffer) return buffer;
    if (!loadPromise) {
      loadPromise = (async () => {
        const resUrl = GM_getResourceURL('SFX');        // blob:/data: — не трогает CSP страницы
        const ab = await (await fetch(resUrl)).arrayBuffer();
        const ac = await ensureCtx();
        buffer = await ac.decodeAudioData(ab);
        return buffer;
      })();
    }
    return loadPromise;
  }

  async function playDing() {
    const ac = await ensureCtx();
    const buf = await ensureBuffer();
    if (!buf) return;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start(0);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest(SEL);
    if (!btn) return;

    // сначала ждём следующий кадр — DOM обычно уже обновился
    afterPaint(() => {
      if (isComplete(btn)) return void playDing();

      // редкий случай — не успело обновиться: короткий fallback на мутации aria-label
      const icon = btn.querySelector('span[role="img"]');
      if (!icon) return;
      const mo = new MutationObserver(() => {
        if (isComplete(btn)) { mo.disconnect(); playDing(); }
      });
      mo.observe(icon, { attributes: true, attributeFilter: ['aria-label'] });
      setTimeout(() => mo.disconnect(), 1200);
    });
  }, { capture: true, passive: true });
})();
