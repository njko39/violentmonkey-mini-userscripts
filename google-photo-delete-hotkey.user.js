// ==UserScript==
// @name         Google Photos: Delete on Delete
// @namespace    gp-tools
// @match        https://photos.google.com/*
// @run-at       document-idle
// @grant        none
// @updateURL   https://github.com/njko39/violentmonkey-mini-userscripts/raw/refs/heads/main/google-photo-delete-hotkey.user.js
// ==/UserScript==

(() => {
  'use strict';

  const isEditable = (el) => {
    while (el) {
      if (el.isContentEditable) return true;
      const t = el.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || el.getAttribute?.('role') === 'textbox') return true;
      el = el.parentElement;
    }
    return false;
  };

  const visible = (el) => !!(el && (el.offsetParent !== null || el.getClientRects().length));

  // Нажать кнопку "В корзину" (если есть)
  function clickTrash() {
    const candidates = Array.from(document.querySelectorAll(
      'button[aria-label="В корзину"], button[aria-label*="корзин"], ' +  // RU
      'button[aria-label="Move to bin"], button[aria-label="Delete"]'     // EN
    ));
    const btn = candidates.find(visible);
    if (btn) { btn.click(); return true; }
    return false;
  }

  // Переназначаем Delete
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && !isEditable(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      if (!clickTrash()) {
        // запасной план: сымитировать "#"
        const target = document.activeElement || document.body;
        target.dispatchEvent(new KeyboardEvent('keydown', {
          key: '#', code: 'Digit3', shiftKey: true, bubbles: true, cancelable: true
        }));
      }
    }
  }, true);
})();
