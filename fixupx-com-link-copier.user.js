// ==UserScript==
// @name         x.com — fixupx.com share links
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

  const copyToClipboardFallback = (text) => {
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(text, 'text');
      console.log('✅ [GM_setClipboard] Скопировано:', text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const success = document.execCommand('copy');
      if (success) {
        console.log('✅ [execCommand] Скопировано:', text);
      } else {
        console.error('❌ Не удалось скопировать текст через execCommand.');
      }
    } catch (err) {
      console.error('❌ Ошибка копирования:', err);
    }
    document.body.removeChild(textarea);
  };

  const findClosestTweetUrl = (element) => {
    let current = element;
    while (current && current !== document.body) {
      const links = current.querySelectorAll('a[href*="/status/"]');
      for (const link of links) {
        if (link.href.includes('/status/')) {
          return link.href;
        }
      }
      current = current.parentElement;
    }
    return null;
  };

  const handleMenuItem = (item) => {
    if (item.dataset.fixupHandled) return;
    item.dataset.fixupHandled = 'true';

    item.addEventListener('click', async () => {
      setTimeout(async () => {
        // 1. Пробуем прочитать из clipboard
        try {
          const text = await navigator.clipboard.readText();
          if (text && (text.includes('x.com') || text.includes('twitter.com'))) {
            const fixed = text.replace(/^https:\/\/(x|twitter)\.com\//, 'https://fixupx.com/');
            copyToClipboardFallback(fixed);
            return;
          }
        } catch (e) {
          console.warn('⚠️ Не удалось прочитать clipboard:', e);
        }

        // 2. Ищем ссылку в DOM
        const url = findClosestTweetUrl(item);
        if (url) {
          const fixed = url.replace(/^https:\/\/(x|twitter)\.com\//, 'https://fixupx.com/');
          copyToClipboardFallback(fixed);
          return;
        }

        console.error('❌ Не удалось найти ссылку для замены.');
      }, 300);
    });
  };

  const observer = new MutationObserver(() => {
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    for (const item of menuItems) {
      const text = item.innerText?.toLowerCase().trim();
      if (
        text === 'copy link to post' ||
        text === 'копировать ссылку' ||
        text === 'копировать ссылку на пост' ||
        text === 'copy link' ||
        text === 'share'
      ) {
        handleMenuItem(item);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log('✅ FixupX Link Copier (universal) initialized');
})();
