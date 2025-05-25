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
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Ensure it's not visible
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const success = document.execCommand('copy');
      if (success) {
        console.log('✅ [Fallback] Скопировано: ', text);
        // Можно добавить какое-то уведомление для пользователя
        // alert('Ссылка FixupX скопирована!');
      } else {
        console.error('❌ [Fallback] Не удалось скопировать execCommand: ', text);
        // alert('Не удалось скопировать ссылку FixupX.');
      }
    } catch (err) {
      console.error('❌ [Fallback] Ошибка копирования execCommand:', err);
      // alert('Ошибка при копировании ссылки FixupX.');
    }
    document.body.removeChild(textarea);
  };

  const observer = new MutationObserver(() => {
    const menuItems = document.querySelectorAll('[role="menuitem"]');

    menuItems.forEach(item => {
      const label = item.innerText?.toLowerCase().trim();
      // Более точные проверки текста, чтобы избежать ложных срабатываний
      if ((label === 'копировать ссылку' || label === 'copy link to post' || label === 'копировать ссылку на пост') && !item.dataset.fixupHandled) {
        item.dataset.fixupHandled = 'true';
        console.log('Found menu item:', item.innerText);

        item.addEventListener('click', (event) => {
          console.log('Menu item clicked. Original event:', event);
          // Даем немного времени на то, чтобы оригинальный обработчик (если он есть и мы его не отменили)
          // потенциально успел скопировать оригинальную ссылку в буфер.
          setTimeout(async () => {
            console.log('Timeout initiated. Attempting to read clipboard.');
            try {
              // Попытка прочитать то, что могло быть скопировано оригинальным действием
              const originalClipboardText = await navigator.clipboard.readText();
              console.log('Clipboard API read success. Original text:', originalClipboardText);

              if (originalClipboardText && (originalClipboardText.startsWith('https://x.com/') || originalClipboardText.startsWith('https://twitter.com/'))) {
                const newText = originalClipboardText.replace(/^https:\/\/(x|twitter)\.com\//, 'https://fixupx.com/');
                console.log('Attempting to copy modified text:', newText);
                copyToClipboardFallback(newText);
              } else {
                console.warn('❗ Clipboard text does not match expected X/Twitter URL:', originalClipboardText, 'Или буфер пуст.');
                // Здесь можно было бы попытаться найти URL другим способом, если бы он был доступен
                // Например, если бы URL был в data-атрибуте самого `item` или его родителя.
                // В крайнем случае, если ничего не можем сделать, можно просто сообщить пользователю.
              }
            } catch (e) {
              console.error('❗ Не удалось прочитать clipboard через navigator.clipboard.readText():', e);
              // Fallback: если чтение не удалось, мы не знаем оригинальную ссылку.
              // На этом этапе мы не можем надежно сформировать fixupx ссылку,
              // так как не знаем, какую ссылку пользователь хотел скопировать.
              // Можно было бы попытаться найти ссылку в текущем URL страницы, если это релевантно,
              // но ссылка на конкретный пост может быть другой.
              // alert('Не удалось автоматически изменить ссылку на FixupX. Оригинальная ссылка (если есть) скопирована.');
            }
          }, 300); // Немного увеличил таймаут для теста
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log('FixupX Link Copier (iPad Debug) initialized.');
})();
