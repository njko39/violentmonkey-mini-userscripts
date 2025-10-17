// ==UserScript==
// @name         Trello: Move Native Search Into Board Header + Hide Topbar
// @namespace    vm-trello-ux-tweaks
// @version      1.3.1
// @description  Move Native Search Into Board Header + Hide Topbar
// @match        https://trello.com/*
// @run-at       document-start
// @grant        none
// @updateURL https://github.com/njko39/violentmonkey-mini-userscripts/raw/refs/heads/main/trello-hide-topbar.js
// ==/UserScript==

(function () {
  'use strict';

  const LS_GLOBAL_TOGGLE_KEY = 'vmTrelloHeaderToggle'; // "on" | "off"
  const isOn = () => (localStorage.getItem(LS_GLOBAL_TOGGLE_KEY) || 'on') === 'on';
  const setOn = (v) => localStorage.setItem(LS_GLOBAL_TOGGLE_KEY, v ? 'on' : 'off');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const getBoardHeader = () =>
    document.querySelector('.board-header, .js-board-header, [data-testid="board-header"]');

  const TOP_HEADER_SEL = '[data-testid="header-container"][data-desktop-id="header"], [data-testid="header-container"]';

  function setTopHeaderHidden(hide) {
    const top = document.querySelector(TOP_HEADER_SEL);
    if (top) top.style.display = hide ? 'none' : '';
  }

  function revealTopHeaderTemporarily() {
    const top = document.querySelector(TOP_HEADER_SEL);
    if (!top) return () => {};
    const prev = top.style.display;
    top.style.display = ''; // показать, чтобы React смонтировал поиск
    return () => { top.style.display = prev; };
  }

/*** стили — кладём как можно раньше ***/
function injectBaseStyles() {
  if (document.getElementById('vm-trello-search-style')) return;
  const on = isOn();

  const css = `
    /* Центровочный слот в шапке */
    #vm-search-slot {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%,-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: min(560px, 70vw);
      width: min(420px, 70vw);
      pointer-events: auto;
      z-index: 2;
    }
    .board-header, [data-testid="board-header"] { position: relative !important; }

    /* Скрываем верхний хедер максимально рано, если включено */
    ${on ? `${TOP_HEADER_SEL}{ display:none !important; }` : ''}

    /* Сброс тёмного фона и безопасные отступы для РОДНОГО поиска */
    [data-vm-native-search] [data-test-id="search-dialog-input"] {
      height: 32px !important;
      padding: 0 10px 0 32px !important; /* запас под иконку */
      border: none !important;
      outline: none !important;
      border-radius: 8px !important;
      background: rgba(255,255,255,0.25) !important;
      color: var(--ds-text, #172B4D) !important;
      backdrop-filter: saturate(120%) blur(2px);
      max-width: 100%;
    }
    [data-vm-native-search] [data-test-id="search-dialog-input"]::placeholder {
      color: rgba(23,43,77,0.8);
      opacity: 1;
    }
    [data-vm-native-search] [role="search"], [data-vm-native-search] {
      background: transparent !important;
      box-shadow: none !important;
      border: 0 !important;
      max-width: 100% !important;
    }
    /* Попап автодропдауна не обрезается */
    [data-vm-native-search] * { overflow: visible !important; }

    /* Fallback под стиль Trello + тот же отступ слева */
    #vm-board-search input[type="search"]{
      height:32px; padding:0 10px 0 32px; border:none; outline:none;
      border-radius:8px; background:rgba(255,255,255,0.25);
      color:var(--ds-text, #172B4D); backdrop-filter:saturate(120%) blur(2px);
      width:100%;
    }
    #vm-board-search input[type="search"]::placeholder{
      color: rgba(23,43,77,0.8); opacity:1;
    }
    #vm-board-search{ width:min(420px, 70vw); display:flex; align-items:center; gap:8px; min-width:260px; }

    /* ==== ОВЕРРАЙД: делаем текст и placeholder светлее (родной + fallback) ==== */
    [data-vm-native-search] [data-test-id="search-dialog-input"],
    #vm-board-search input[type="search"] {
      color: rgba(255, 255, 255, 0.92) !important;   /* основной текст */
      caret-color: rgba(255, 255, 255, 0.92) !important;
    }
    [data-vm-native-search] [data-test-id="search-dialog-input"]::placeholder,
    #vm-board-search input[type="search"]::placeholder {
      color: rgba(255, 255, 255, 0.75) !important;   /* слово "Search" светлее */
      opacity: 1 !important;
    }
  `;
  const style = document.createElement('style');
  style.id = 'vm-trello-search-style';
  style.textContent = css;
  document.documentElement.appendChild(style);
}

// вызов (оставь только его):
injectBaseStyles();



  function findNativeSearchContainer() {
    const input = document.querySelector('[data-test-id="search-dialog-input"]');
    if (!input) return null;
    let c = input.closest('[role="search"]');
    if (c) return c;
    let p = input;
    for (let i = 0; i < 5 && p; i++) {
      if (p.querySelector && p.querySelector('[data-test-id="search-dialog-input"]')) return p;
      p = p.parentElement;
    }
    return null;
  }

  function ensureCenterSlot() {
    const header = getBoardHeader();
    if (!header) return null;
    let slot = header.querySelector('#vm-search-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'vm-search-slot';
      header.appendChild(slot);
    }
    return slot;
  }

  function placeIntoCenter(el, isNative) {
    const slot = ensureCenterSlot();
    if (!slot || !el) return false;
    if (!slot.contains(el)) {
      el.style.margin = '0';
      el.style.maxWidth = '100%';
      if (isNative) el.setAttribute('data-vm-native-search', '1');
      slot.appendChild(el);
    }
    return true;
  }

  function getFallbackNode() { return document.getElementById('vm-board-search'); }
  function removeFallback() {
    const n = getFallbackNode();
    if (n && n.parentNode) n.parentNode.removeChild(n);
  }
  function buildFallback() {
    if (getFallbackNode()) return getFallbackNode();
    const wrap = document.createElement('div');
    wrap.id = 'vm-board-search';
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Search';
    input.ariaLabel = 'Search';
    input.maxLength = 500;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = (input.value || '').trim();
        const url = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
        window.location.assign(url);
      }
    });
    wrap.appendChild(input);
    return wrap;
  }

  async function ensureSearch() {
    if (!isOn()) { removeFallback(); return false; }

    // мгновенно показываем центр-слот с fallback, чтобы «не ждать»
    const slot = ensureCenterSlot();
    if (slot && !slot.querySelector('#vm-board-search') && !slot.querySelector('[data-test-id="search-dialog-input"]')) {
      placeIntoCenter(buildFallback(), false);
    }

    // Временно покажем верхний хедер — смонтировать родной поиск
    const restore = revealTopHeaderTemporarily();

    let native = null;
    for (let i = 0; i < 40; i++) {
      native = findNativeSearchContainer();
      if (native) break;
      await sleep(200);
    }

    setTopHeaderHidden(true);
    restore();

    if (native) {
      placeIntoCenter(native, true);
      removeFallback();

      // подстраховка от перерисовок
      const keepCentered = new MutationObserver(() => {
        const s = ensureCenterSlot();
        if (s && !s.contains(native)) placeIntoCenter(native, true);
      });
      keepCentered.observe(native, { childList: true, subtree: true });

      const header = getBoardHeader();
      if (header) {
        const moHeader = new MutationObserver(() => {
          const s = ensureCenterSlot();
          if (s && !s.contains(native)) placeIntoCenter(native, true);
        });
        moHeader.observe(header, { childList: true, subtree: true });
      }
      return true;
    }
    return true;
  }

  /*** переключатель в меню доски ***/
  function ensureBoardMenuToggle() {
    const pop = document.querySelector('[data-testid="board-menu-popover"]');
    if (!pop) return;
    if (pop.querySelector('[data-vm-global-toggle]')) return;

    const ul = pop.querySelector('section ul') || pop.querySelector('ul');
    if (!ul) return;

    const li = document.createElement('li');
    li.setAttribute('data-vm-global-toggle', '1');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'H4CRJnSRKY5a_I YYRfNoEtCHWP55 ybVBgfOiuWZJtD _St8_YSRMkLv07';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '8px';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = isOn();
    chk.style.transform = 'scale(1.1)';
    chk.style.marginRight = '6px';

    const label = document.createElement('div');
    label.className = 'XTd91xrSkjN3zk';
    label.textContent = 'Скрыть верхнюю панель';

    btn.appendChild(chk);
    btn.appendChild(label);

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const v = !isOn();
      setOn(v);
      chk.checked = v;

      if (v) {
        setTopHeaderHidden(true);
        await ensureSearch();
      } else {
        setTopHeaderHidden(false);
        removeFallback();
      }
    });

    // пункт — В КОНЕЦ меню
    ul.appendChild(li);
    li.appendChild(btn);
  }

  /*** observer ***/
  const mo = new MutationObserver(() => {
    ensureBoardMenuToggle();
    if (isOn()) {
      const header = getBoardHeader();
      if (header) {
        const hasNativeInSlot = header.querySelector('#vm-search-slot [data-test-id="search-dialog-input"]');
        const hasFallback = header.querySelector('#vm-search-slot #vm-board-search');
        if (!hasNativeInSlot && !hasFallback) ensureSearch();
      }
    } else {
      removeFallback();
    }
  });

  function startObserver() {
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  /*** init как можно раньше ***/
  async function init() {
    if (isOn()) {
      // уже скрываем верхнюю панель стилем на document-start; теперь готовим поиск
      await ensureSearch();
    } else {
      setTopHeaderHidden(false);
      removeFallback();
    }
    ensureBoardMenuToggle();
    startObserver();

    // SPA-навигация
    let last = location.pathname + location.search;
    setInterval(async () => {
      const now = location.pathname + location.search;
      if (now !== last) {
        last = now;
        if (isOn()) {
          await ensureSearch();
        } else {
          setTopHeaderHidden(false);
          removeFallback();
        }
      }
    }, 700);
  }

  if (document.readyState === 'loading') {
    // document-start: DOM еще грузится — стартуем сразу
    init();
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
