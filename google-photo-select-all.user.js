// ==UserScript==
// @name         Google Photos — Выделить всё
// @namespace    vm-gphotos-select-all-page
// @match        https://photos.google.com/*
// @run-at       document-idle
// @grant        none
// @updateURL   https://github.com/njko39/violentmonkey-mini-userscripts/raw/refs/heads/main/google-photo-select-all.user.js
// ==/UserScript==

(() => {
  'use strict';

  const BTN_ID = 'gp-select-all-page';
  const SEL_TILE_CB = "[role='checkbox'].QcpS9c.ckGgle:not(.R4HkWb)"; // чекбоксы миниатюр (не «за день»)
  const SEL_LABEL   = "span.rtExYb";                                   // «Выбрано X фото»
  const DWELL_MS    = 220;   // пауза между шагами прокрутки (мс)
  const STEP_FRAC   = 0.85;  // шаг ≈85% высоты видимой области контейнера
  const MAX_MS      = 4 * 60 * 1000; // защитный таймаут (4 мин)

  // --- UI: маленький тост прогресса
  let toastEl = null;
  function showToast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      Object.assign(toastEl.style, {
        position: 'fixed', right: '16px', bottom: '16px', zIndex: 999999,
        padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.75)',
        color: '#fff', font: '500 12px/1.4 Roboto, Arial, sans-serif', boxShadow: '0 4px 16px rgba(0,0,0,.3)'
      });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
  }
  function hideToast() { if (toastEl) toastEl.remove(), (toastEl = null); }

  // Найти скролл-контейнер: ближайший ancestor с overflowY=auto/scroll и реальной прокруткой
  function getScrollableAncestor(startEl) {
    let el = startEl;
    while (el) {
      const cs = getComputedStyle(el);
      const canScroll = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && (el.scrollHeight - el.clientHeight > 50);
      if (canScroll) return el;
      el = el.parentElement;
    }
    // fallback
    return document.scrollingElement || document.documentElement || document.body;
  }

  // Выбрать/кликнуть все видимые сейчас чекбоксы
  function clickVisible(select = true) {
    const cbs = document.querySelectorAll(SEL_TILE_CB);
    let n = 0;
    for (const cb of cbs) {
      const checked = cb.getAttribute('aria-checked') === 'true';
      if (select ? !checked : checked) {
        cb.click();
        n++;
      }
    }
    return n;
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function scrollAndSelectAll() {
    const startTs = Date.now();

    // Берём любой чекбокс, чтобы вычислить правильный скролл-контейнер
    let anyCb = document.querySelector(SEL_TILE_CB);
    if (!anyCb) {
      // если чекбоксов нет — пробуем лёгкий скролл вниз-вверх, чтобы заставить виртуализацию отрисовать первые элементы
      (document.scrollingElement || document.documentElement).scrollBy(0, 1);
      await sleep(DWELL_MS);
      anyCb = document.querySelector(SEL_TILE_CB);
      if (!anyCb) {
        showToast('Не нашёл плиток — убедись, что открыт список фото.');
        await sleep(1800); hideToast(); return;
      }
    }

    const scroller = getScrollableAncestor(anyCb);
    const isGlobalScroller = (scroller === document.scrollingElement || scroller === document.documentElement || scroller === document.body);

    // Функция корректного шага прокрутки
    function doScrollBy(px) {
      if (isGlobalScroller) {
        window.scrollBy(0, px);
      } else {
        scroller.scrollBy(0, px);
      }
    }
    function getViewportH() {
      return isGlobalScroller ? window.innerHeight : scroller.clientHeight;
    }
    function atBottom() {
      const top = isGlobalScroller ? (document.scrollingElement || document.documentElement).scrollTop : scroller.scrollTop;
      const max = (isGlobalScroller ? (document.scrollingElement || document.documentElement) : scroller).scrollHeight - getViewportH();
      return top >= max - 2;
    }
    function scrollToTop() {
      if (isGlobalScroller) window.scrollTo(0, 0);
      else scroller.scrollTop = 0;
    }

    // Стартуем с самого верха
    scrollToTop();
    await sleep(DWELL_MS);

    let totalClicked = 0;
    let lastTop = -1;
    let lastHeight = -1;
    let steps = 0;

    while (true) {
      // клик по видимым на текущем экране
      totalClicked += clickVisible(true);
      steps++;

      showToast(`Выделяю… шаг ${steps} • всего кликов: ${totalClicked}`);

      // Проверяем низ
      if (atBottom()) {
        // финальный проход внизу
        totalClicked += clickVisible(true);
        break;
      }

      // Делаем шаг прокрутки
      const stepPx = Math.max(64, Math.floor(getViewportH() * STEP_FRAC));
      doScrollBy(stepPx);
      await sleep(DWELL_MS);

      // Страховки от зависания (нет движения/роста высоты)
      const currTop = isGlobalScroller ? (document.scrollingElement || document.documentElement).scrollTop : scroller.scrollTop;
      const currHeight = (isGlobalScroller ? (document.scrollingElement || document.documentElement) : scroller).scrollHeight;

      if (currTop === lastTop && currHeight === lastHeight) {
        // попробуем «пнуть» контейнер малой прокруткой
        doScrollBy(1);
        await sleep(DWELL_MS);
        const t2 = isGlobalScroller ? (document.scrollingElement || document.documentElement).scrollTop : scroller.scrollTop;
        if (t2 === currTop) break;
      }

      lastTop = currTop;
      lastHeight = currHeight;

      if (Date.now() - startTs > MAX_MS) {
        showToast('Остановлено по таймауту.');
        break;
      }
    }

    showToast(`Готово. Отмечено: ${totalClicked}`);
    setTimeout(hideToast, 2000);
  }

  function injectButton() {
    const label = Array.from(document.querySelectorAll(SEL_LABEL))
      .find(el => /Выбрано/i.test(el.textContent));
    if (!label) return;
    if (document.getElementById(BTN_ID)) return;

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.textContent = 'Выделить всё';
    Object.assign(btn.style, {
      marginLeft: '12px',
      padding: '6px 12px',
      borderRadius: '6px',
      border: '1px solid rgba(0,0,0,0.2)',
      background: 'transparent',
      cursor: 'pointer',
      font: '500 12px/1 Roboto, Arial, sans-serif'
    });

    let running = false;
    btn.addEventListener('click', async () => {
      if (running) return;
      running = true;
      const prevText = btn.textContent;
      btn.disabled = true; btn.textContent = 'Выделяю…';
      try {
        await scrollAndSelectAll();
      } catch (e) {
        console.error('[GPhotos] Ошибка выделения', e);
        showToast('Ошибка во время выделения (см. консоль).');
        setTimeout(hideToast, 2500);
      } finally {
        btn.disabled = false; btn.textContent = prevText;
        running = false;
      }
    });

    label.insertAdjacentElement('afterend', btn);
  }

  // Держим кнопку живой при перерисовках SPA
  const mo = new MutationObserver(() => { try { injectButton(); } catch (e) { console.error(e); } });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  injectButton();
})();
