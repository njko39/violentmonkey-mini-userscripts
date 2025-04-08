// ==UserScript==
// @name         x.com — fixupx.com share links
// @namespace    https://x.com/
// @version      1.0
// @description  Make share button on x.com copy fixupx.com link
// @author       Ты
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

  const observer = new MutationObserver(() => {
    const shareMenus = document.querySelectorAll('[role="menuitem"]');

    shareMenus.forEach(menuItem => {
      const label = menuItem.innerText?.toLowerCase();
      if (label?.includes('копировать ссылку') || label?.includes('copy link to post')) {
        if (!menuItem.dataset.fixupHandled) {
          menuItem.dataset.fixupHandled = 'true';

          menuItem.addEventListener('click', async (e) => {
            // подождём, пока X сам скопирует оригинальную ссылку
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
              const text = await navigator.clipboard.readText();
              if (text.startsWith('https://x.com/')) {
                const modified = text.replace('https://x.com/', 'https://fixupx.com/');
                await navigator.clipboard.writeText(modified);
                console.log('Скопирована ссылка:', modified);
              }
            } catch (err) {
              console.error('Ошибка при копировании ссылки:', err);
            }
          });
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
