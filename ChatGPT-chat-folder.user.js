// ==UserScript==
// @name         ChatGPT — Папки чатов
// @namespace    http://tampermonkey.net/
// @version      1.8.1
// @description  Добавлены визуальные границы между чатами внутри папки 📎
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        none
// @author      njko39
// @copyright   2025, njko39 (https://github.com/njko39/)
// @homepageURL https://github.com/njko39/ChatGPT-folders-script/
// @updateURL   https://github.com/njko39/ChatGPT-folders-script/raw/refs/heads/main/ChatGPT-chat-folder.user.js
// @license     MIT
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'chat_folders_v1_3';
  const BLOCK_ID = 'chatgpt-folder-ui';

  const getSavedFolders = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      return Array.isArray(data) ? data : Object.entries(data);
    } catch {
      return [];
    }
  };

  const saveFolders = (folderEntries) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folderEntries));
  };

  const makeChatDraggable = (el) => {
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', (e) => {
      const href = el.getAttribute('href');
      const title = el.textContent.trim();
      if (href) {
        e.dataTransfer.setData('application/x-chat-info', JSON.stringify({ href, title }));
      }
    });
  };

  const createUI = () => {
    if (document.getElementById(BLOCK_ID)) return;

    const container = document.createElement('div');
    container.id = BLOCK_ID;
    container.style.margin = '8px';
    container.style.color = '#a47148';

    let folders = getSavedFolders();
    const collapsedState = JSON.parse(localStorage.getItem('chat_folder_collapsed')) || {};

    const saveCollapseState = () => {
      localStorage.setItem('chat_folder_collapsed', JSON.stringify(collapsedState));
    };

    const render = () => {
      container.innerHTML = '<div style="font-weight:bold;margin-bottom:6px">📁 Мои папки</div>';

      folders.forEach(([name, chats], folderIndex) => {
        const folder = document.createElement('div');
        folder.className = 'folder';
        folder.style.marginBottom = '6px';
        folder.setAttribute('draggable', 'true');
        folder.dataset.folderIndex = folderIndex;

        folder.ondragstart = (e) => {
          e.dataTransfer.setData('text/folder-index', folderIndex);
        };

        folder.ondragover = (e) => e.preventDefault();
        folder.ondrop = (e) => {
          const from = parseInt(e.dataTransfer.getData('text/folder-index'));
          const chatData = e.dataTransfer.getData('application/x-chat-info');

          if (!isNaN(from) && from !== folderIndex && !chatData) {
            const moved = folders.splice(from, 1)[0];
            folders.splice(folderIndex, 0, moved);
            saveFolders(folders);
            render();
          } else if (chatData) {
            try {
              const { href, title } = JSON.parse(chatData);
              if (!chats.some(c => c.href === href)) {
                chats.push({ href, title });
                saveFolders(folders);
                render();
              }
            } catch {}
          }
        };

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.background = 'rgba(255,255,255,0.05)';
        header.style.borderRadius = '4px';
        header.style.padding = '4px';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.cursor = 'pointer';

        const toggle = document.createElement('span');
        toggle.textContent = collapsedState[name] ? '▶️' : '🔽';
        toggle.style.marginRight = '6px';

        const label = document.createElement('span');
        label.textContent = name;
        label.style.fontWeight = '500';

        left.onclick = () => {
          collapsedState[name] = !collapsedState[name];
          saveCollapseState();
          render();
        };

        left.append(toggle, label);

        const menuBtn = document.createElement('button');
        menuBtn.textContent = '⋮';
        menuBtn.title = 'Меню';
        menuBtn.style.border = 'none';
        menuBtn.style.background = 'none';
        menuBtn.style.color = '#a47148';
        menuBtn.style.cursor = 'pointer';

        const menu = document.createElement('div');
        menu.style.position = 'absolute';
        menu.style.background = 'rgba(255, 255, 255, 0.9)';
        menu.style.border = '1px solid rgba(0,0,0,0.1)';
        menu.style.borderRadius = '4px';
        menu.style.padding = '4px';
        menu.style.fontSize = '13px';
        menu.style.display = 'none';
        menu.style.flexDirection = 'column';
        menu.style.zIndex = '9999';

        const rename = document.createElement('button');
        rename.textContent = 'Переименовать';
        rename.onclick = () => {
          const newName = prompt('Новое имя папки:', name);
          if (newName && !folders.some(([n]) => n === newName)) {
            folders[folderIndex][0] = newName;
            collapsedState[newName] = collapsedState[name];
            delete collapsedState[name];
            saveFolders(folders);
            saveCollapseState();
            render();
          }
        };

        const remove = document.createElement('button');
        remove.textContent = 'Удалить папку';
        remove.onclick = () => {
          if (confirm(`Удалить папку "${name}"?`)) {
            folders.splice(folderIndex, 1);
            delete collapsedState[name];
            saveFolders(folders);
            saveCollapseState();
            render();
          }
        };

        [rename, remove].forEach(btn => {
          btn.style.border = 'none';
          btn.style.background = 'none';
          btn.style.color = '#a47148';
          btn.style.cursor = 'pointer';
          btn.style.textAlign = 'left';
        });

        menu.append(rename, remove);
        document.body.appendChild(menu);

        menuBtn.onclick = (e) => {
          e.stopPropagation();
          menu.style.display = 'flex';
          const rect = menuBtn.getBoundingClientRect();
          menu.style.top = `${rect.bottom + window.scrollY}px`;
          menu.style.left = `${rect.left + window.scrollX}px`;
        };

        document.addEventListener('click', () => (menu.style.display = 'none'));

        const controls = document.createElement('div');
        controls.append(menuBtn);

        header.append(left, controls);
        folder.appendChild(header);

        const list = document.createElement('div');
        list.style.marginLeft = '10px';
        list.style.marginTop = '4px';
        list.style.display = collapsedState[name] ? 'none' : 'block';

        chats.forEach((chat, chatIndex) => {
          const item = document.createElement('div');
          item.style.display = 'flex';
          item.style.justifyContent = 'space-between';
          item.style.alignItems = 'center';
          item.style.padding = '6px 4px';
          item.style.cursor = 'grab';
          item.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
          item.setAttribute('draggable', 'true');

          item.ondragstart = (e) => {
            e.dataTransfer.setData('text/chat-index', chatIndex);
            e.dataTransfer.setData('text/folder-index', folderIndex);
          };

          item.ondragover = (e) => e.preventDefault();
          item.ondrop = (e) => {
            const from = parseInt(e.dataTransfer.getData('text/chat-index'));
            const fIndex = parseInt(e.dataTransfer.getData('text/folder-index'));
            if (!isNaN(from)) {
              const moved = folders[fIndex][1].splice(from, 1)[0];
              if (!folders[folderIndex][1].some(c => c.href === moved.href)) {
                folders[folderIndex][1].splice(chatIndex, 0, moved);
                saveFolders(folders);
                render();
              }
            }
          };

          const link = document.createElement('a');
          link.href = chat.href;
          link.textContent = chat.title;
          link.title = chat.title;
          link.style.color = '#a47148';
          link.style.textDecoration = 'none';
          link.style.flex = '1';

          const renameChat = document.createElement('button');
          renameChat.textContent = '✏️';
          renameChat.title = 'Переименовать чат';
          renameChat.onclick = () => {
            const newTitle = prompt('Новое имя чата:', chat.title);
            if (newTitle) {
              chat.title = newTitle;
              saveFolders(folders);
              render();
            }
          };

          const deleteChat = document.createElement('button');
          deleteChat.textContent = '❌';
          deleteChat.title = 'Удалить чат из папки';
          deleteChat.onclick = () => {
            if (confirm('Удалить чат из папки?')) {
              folders[folderIndex][1].splice(chatIndex, 1);
              saveFolders(folders);
              render();
            }
          };

          [renameChat, deleteChat].forEach(btn => {
            btn.style.border = 'none';
            btn.style.background = 'none';
            btn.style.color = '#a47148';
            btn.style.cursor = 'pointer';
          });

          item.append(link, renameChat, deleteChat);
          list.appendChild(item);
        });

        folder.appendChild(list);
        container.appendChild(folder);
      });

      const buttons = document.createElement('div');
      buttons.style.display = 'flex';
      buttons.style.gap = '4px';
      buttons.style.marginTop = '8px';

      const makeBtn = (label, action) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.fontSize = '12px';
        btn.style.color = '#a47148';
        btn.style.background = 'none';
        btn.style.border = '1px solid rgba(0,0,0,0.1)';
        btn.style.borderRadius = '4px';
        btn.style.padding = '4px 8px';
        btn.style.cursor = 'pointer';
        btn.onclick = action;
        return btn;
      };

      buttons.append(
        makeBtn('+ Папка', () => {
          const name = prompt('Название новой папки:');
          if (name && !folders.some(([n]) => n === name)) {
            folders.push([name, []]);
            saveFolders(folders);
            render();
          }
        }),
        makeBtn('⬇️ Экспорт', () => {
          const blob = new Blob([JSON.stringify(folders, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'chat_folders.json';
          a.click();
        }),
        makeBtn('⬆️ Импорт', () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json';
          input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
              try {
                folders = JSON.parse(reader.result);
                saveFolders(folders);
                render();
              } catch {
                alert('Неверный формат файла');
              }
            };
            reader.readAsText(file);
          };
          input.click();
        })
      );

      container.appendChild(buttons);
    };

    render();
    return container;
  };

  const tryInsertUI = () => {
    const host = document.querySelector('nav div.flex.flex-col');
    if (!host) return;
    if (!document.getElementById(BLOCK_ID)) {
      const block = createUI();
      if (block) host.prepend(block);
    }
  };

  const observeChats = () => {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const observer = new MutationObserver(() => {
      const links = nav.querySelectorAll('a[href]');
      links.forEach(makeChatDraggable);
      tryInsertUI();
    });
    observer.observe(nav, { childList: true, subtree: true });
  };

  const init = () => {
    const interval = setInterval(() => {
      const container = document.querySelector('nav div.flex.flex-col');
      if (container) {
        clearInterval(interval);
        tryInsertUI();
        observeChats();
      }
    }, 500);
  };

  init();
})();
