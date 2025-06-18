// ==UserScript==
// @name         x.com links into fixup.x links
// @namespace    https://x.com/
// @version      1.0
// @description  Make share button on x.com copy fixupx.com link
// @match        https://x.com/*
// @grant        GM_setClipboard
// @run-at       document-start
// @author      njko39
// @copyright   2025, njko39 (https://github.com/njko39/)
// @homepageURL https://github.com/njko39/violentmonkey-mini-userscripts/
// @updateURL   https://github.com/njko39/violentmonkey-mini-userscripts/raw/refs/heads/main/fixupx-com-link-copier.user.js
// @license     MIT
// ==/UserScript==

(function () {
  'use strict';

  const fixTweetUrl = (text) => {
    return text.replace(/https:\/\/(?:x|twitter)\.com\/([^\/]+\/status\/\d+)/g, 'https://fixupx.com/$1');
  };

  const fixSingleLink = (a) => {
    if (!a.href || !a.href.includes('/status/')) return;
    const fixed = fixTweetUrl(a.href);
    if (fixed !== a.href) {
      a.href = fixed;
      a.dataset.fixupHrefReplaced = 'true';
    }
  };

  const fixAllLinksInDOM = () => {
    const links = document.querySelectorAll('a[href*="/status/"]:not([data-fixupHrefReplaced])');
    for (const a of links) {
      fixSingleLink(a);
    }
  };

  // 1️⃣ Подмена при копировании выделенного текста
  document.addEventListener('copy', (e) => {
    try {
      const selection = window.getSelection().toString();
      const fixed = fixTweetUrl(selection);
      if (fixed !== selection) {
        e.preventDefault();
        e.clipboardData.setData('text/plain', fixed);
        console.log('🔗 [copy] Заменена ссылка:', fixed);
      }
    } catch (err) {
      console.warn('⚠️ Ошибка в обработчике copy:', err);
    }
  });

  // 2️⃣ Обработка кнопок "копировать ссылку"/"поделиться"
  const setupMenuButtonHandler = (item) => {
    if (item.dataset.fixupHandled) return;
    item.dataset.fixupHandled = 'true';
    item.addEventListener('click', () => {
      setTimeout(async () => {
        try {
          const clip = await navigator.clipboard.readText();
          if (clip.includes('/status/')) {
            const fixed = fixTweetUrl(clip);
            if (fixed !== clip) {
              if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(fixed);
              } else {
                await navigator.clipboard.writeText(fixed);
              }
              console.log('📋 [button] Заменена ссылка:', fixed);
            }
          }
        } catch (e) {
          console.warn('⚠️ Не удалось прочитать clipboard:', e);
        }
      }, 300);
    });
  };

  const observer = new MutationObserver(() => {
    fixAllLinksInDOM();

    const items = document.querySelectorAll('[role="menuitem"], [role="button"], a, div');
    for (const item of items) {
      const text = item.innerText?.toLowerCase() || '';
      if (
        text.includes('копировать') ||
        text.includes('ссылка') ||
        text.includes('share') ||
        text.includes('copy')
      ) {
        setupMenuButtonHandler(item);
      }
    }
  });

  // 3️⃣ Стартуем наблюдение за DOM
  observer.observe(document.body, { childList: true, subtree: true });

  // 4️⃣ Инициализация начальной подмены в href
  window.addEventListener('load', () => {
    fixAllLinksInDOM();
    console.log('✅ FixupX инициализирован (все уровни защиты включены)');
  });
})();
