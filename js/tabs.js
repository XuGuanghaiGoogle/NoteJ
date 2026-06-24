/**
 * NoteJ 标签页管理模块
 * 负责标签页的创建、切换、关闭、重命名等操作
 */

const Tabs = (() => {
    /** 当前数据 */
    let data = null;
    /** 变更回调 */
    let onChangeCallback = null;
    /** 关闭回调 */
    let onCloseCallback = null;

    /**
     * 初始化标签页系统
     * @param {Function} onChange - 标签页切换回调
     * @param {Function} onClose - 标签页关闭前回调（返回 false 可阻止关闭）
     */
    function init(onChange, onClose) {
        onChangeCallback = onChange;
        onCloseCallback = onClose;

        data = Storage.loadAll();
        render();
        switchTo(data.activeTabId, false);
    }

    /**
     * 渲染全部标签页
     */
    function render() {
        const tabList = document.getElementById('tabList');
        if (!tabList) return;

        tabList.innerHTML = '';

        data.tabs.forEach((tab, index) => {
            const tabEl = createTabElement(tab, tab.id === data.activeTabId);
            tabList.appendChild(tabEl);
        });

        // 添加 "+" 按钮
        const addBtn = document.createElement('button');
        addBtn.className = 'tab-bar__add-btn';
        addBtn.title = I18n.t('tabs.newTab');
        addBtn.innerHTML = '<span class="material-symbols-rounded">add</span>';
        addBtn.addEventListener('click', () => create());
        tabList.appendChild(addBtn);

        updateEmptyState();
    }

    /**
     * 创建单个标签页 DOM 元素
     */
    function createTabElement(tab, isActive) {
        const el = document.createElement('div');
        el.className = 'tab-item' + (isActive ? ' tab-item--active' : '');
        el.dataset.tabId = tab.id;
        el.draggable = true;

        // 标题
        const title = document.createElement('span');
        title.className = 'tab-item__title';
        title.textContent = tab.title;
        title.title = I18n.t('tabs.dblclickRename');
        el.appendChild(title);

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-item__close';
        closeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
        closeBtn.title = I18n.t('tabs.closeTab');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            close(tab.id);
        });
        el.appendChild(closeBtn);

        // 点击切换
        el.addEventListener('click', () => switchTo(tab.id));

        // 双击重命名
        el.addEventListener('dblclick', (e) => {
            e.preventDefault();
            startRename(tab.id, title);
        });

        // 拖拽排序
        el.addEventListener('dragstart', (e) => handleDragStart(e, tab.id));
        el.addEventListener('dragover', (e) => handleDragOver(e));
        el.addEventListener('dragend', (e) => handleDragEnd(e));
        el.addEventListener('drop', (e) => handleDrop(e, tab.id));

        // 中键关闭
        el.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                close(tab.id);
            }
        });

        return el;
    }

    /**
     * 开始重命名
     */
    function startRename(tabId, titleEl) {
        const tab = data.tabs.find(t => t.id === tabId);
        if (!tab) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tab-item__rename-input';
        input.value = tab.title;
        input.style.width = Math.max(titleEl.offsetWidth, 60) + 'px';

        titleEl.replaceWith(input);
        input.focus();
        input.select();

        const finishRename = () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== tab.title) {
                tab.title = newTitle;
                const updated = Storage.updateNote(tabId, { title: newTitle });
                // 同步 Tabs 内部 data（updateNote 从 localStorage 读回，确保一致性）
                const updatedTab = updated.tabs.find(t => t.id === tabId);
                if (updatedTab) {
                    Object.assign(tab, updatedTab);
                }
                render();
                if (onChangeCallback) onChangeCallback(tabId, tab);
            } else {
                input.replaceWith(titleEl);
            }
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                input.value = tab.title;
                input.blur();
            }
        });
    }

    /**
     * 创建新标签页
     */
    function create(title, content) {
        const result = Storage.addNote({ title, content });
        data = result.data;
        render();
        switchTo(result.note.id);
        showToast(I18n.t('toast.noteCreated'), 'success');
        return result.note;
    }

    /**
     * 切换到指定标签页
     * @param {string} tabId
     * @param {boolean} saveSettings - 是否保存活动标签页设置
     */
    function switchTo(tabId, saveSettingsFlag = true) {
        if (!tabId) {
            // 没有标签页，显示空状态
            updateEmptyState();
            return;
        }

        const tab = data.tabs.find(t => t.id === tabId);
        if (!tab) {
            // 标签页已被删除，尝试切换到第一个
            if (data.tabs.length > 0) {
                switchTo(data.tabs[0].id, saveSettingsFlag);
            }
            return;
        }

        data.activeTabId = tabId;

        // 更新标签栏高亮
        document.querySelectorAll('.tab-item').forEach(el => {
            el.classList.toggle('tab-item--active', el.dataset.tabId === tabId);
        });

        // 滚动到可见
        const activeTab = document.querySelector(`.tab-item[data-tab-id="${tabId}"]`);
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // 保存设置
        if (saveSettingsFlag) {
            Storage.saveSettings({ lastActiveTabId: tabId });
        }

        updateEmptyState();

        // 触发回调
        if (onChangeCallback) onChangeCallback(tabId, tab);
    }

    /**
     * 关闭标签页
     * @param {string} tabId
     * @returns {boolean} 是否成功关闭
     */
    function close(tabId) {
        if (data.tabs.length <= 1) {
            showToast(I18n.t('toast.minOneTab'), 'warning');
            return false;
        }

        // 关闭前回调
        if (onCloseCallback) {
            const canClose = onCloseCallback(tabId);
            if (canClose === false) return false;
        }

        data = Storage.deleteNote(tabId);
        render();

        if (data.activeTabId) {
            switchTo(data.activeTabId, true);
        } else {
            updateEmptyState();
        }

        return true;
    }

    /**
     * 切换到下一个标签页
     */
    function next() {
        if (data.tabs.length < 2) return;
        const idx = data.tabs.findIndex(t => t.id === data.activeTabId);
        const nextIdx = (idx + 1) % data.tabs.length;
        switchTo(data.tabs[nextIdx].id);
    }

    /**
     * 切换到上一个标签页
     */
    function prev() {
        if (data.tabs.length < 2) return;
        const idx = data.tabs.findIndex(t => t.id === data.activeTabId);
        const prevIdx = (idx - 1 + data.tabs.length) % data.tabs.length;
        switchTo(data.tabs[prevIdx].id);
    }

    /**
     * 获取当前活动标签页
     */
    function getActive() {
        if (!data || !data.activeTabId) return null;
        return data.tabs.find(t => t.id === data.activeTabId) || null;
    }

    /**
     * 获取全部标签页
     */
    function getAll() {
        return data ? [...data.tabs] : [];
    }

    /**
     * 更新空状态显示
     */
    function updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const editorContainer = document.getElementById('editorContainer');
        if (data.tabs.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (editorContainer) editorContainer.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (editorContainer) editorContainer.style.display = 'flex';
        }
    }

    // --- 拖拽排序 ---

    let draggedTabId = null;

    function handleDragStart(e, tabId) {
        draggedTabId = tabId;
        e.target.classList.add('tab-item--dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tabId);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnd(e) {
        e.target.classList.remove('tab-item--dragging');
        draggedTabId = null;
    }

    function handleDrop(e, targetTabId) {
        e.preventDefault();
        if (!draggedTabId || draggedTabId === targetTabId) return;

        const fromIdx = data.tabs.findIndex(t => t.id === draggedTabId);
        const toIdx = data.tabs.findIndex(t => t.id === targetTabId);
        if (fromIdx === -1 || toIdx === -1) return;

        // 移动标签页
        const [moved] = data.tabs.splice(fromIdx, 1);
        data.tabs.splice(toIdx, 0, moved);

        Storage.saveAll(data);
        render();
    }

    /**
     * 从 Storage 重新加载数据并刷新
     */
    function reload() {
        const activeId = data ? data.activeTabId : null;
        data = Storage.loadAll();
        // 尝试恢复之前的活动标签页
        if (activeId && data.tabs.find(t => t.id === activeId)) {
            data.activeTabId = activeId;
        }
        render();
    }

    // 公开 API
    return {
        init,
        create,
        switchTo,
        close,
        next,
        prev,
        getActive,
        getAll,
        render,
        reload,
    };
})();
