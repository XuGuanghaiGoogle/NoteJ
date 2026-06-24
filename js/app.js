/**
 * NoteJ 主应用模块
 * 初始化各子系统、全局快捷键、主题管理
 */

const App = (() => {
    let settings = null;

    /**
     * 应用入口
     */
    function init() {
        settings = Storage.loadSettings();

        // 初始化国际化（必须在 settings 加载之后）
        I18n.init();

        // 更新已存在的欢迎笔记为当前语言版本
        updateWelcomeNotes();

        // 初始化 Markdown 渲染器
        Markdown.init();

        // 初始化编辑器
        Editor.init();
        Editor.initToolbar();

        // 初始化标签页系统
        Tabs.init(
            // onChange: 切换标签页时加载内容
            (tabId, tab) => {
                Editor.loadNote(tabId, tab);
                showToolbar(true);
            },
            // onClose: 关闭标签页前保存
            (tabId) => {
                const active = Tabs.getActive();
                if (active && active.id === tabId) {
                    Editor.saveNow();
                }
                // 检查是否还有标签页
                const all = Tabs.getAll();
                if (all.length <= 1) showToolbar(false);
            }
        );

        // 初始工具栏状态
        const allTabs = Tabs.getAll();
        showToolbar(allTabs.length > 0);

        // 绑定 UI 事件
        bindEvents();

        // 初始化搜索
        initSearch();

        // 应用主题
        applyTheme(settings.theme);

        // 监听系统主题变更
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', () => {
                if (settings.theme === 'auto') {
                    applyTheme('auto');
                }
            });
        }

        // 注册语言变更监听器（切换语言时更新动态 DOM）
        I18n.onLanguageChange(() => {
            syncLangSelect();

            // 更新匹配默认标题的欢迎笔记（标题为 "欢迎使用"/"Welcome"/"ようこそ"）
            const defaultTitles = ['欢迎使用', 'Welcome', 'ようこそ'];
            const tabs = Tabs.getAll();
            tabs.forEach(tab => {
                if (defaultTitles.includes(tab.title)) {
                    const defaultNote = I18n.getDefaultNote();
                    Storage.updateNote(tab.id, {
                        title: defaultNote.title,
                        content: defaultNote.content
                    });
                }
            });

            // 从 Storage 重新加载 Tabs 数据以同步标题
            const wasWelcomeActive = (() => {
                const a = Tabs.getActive();
                return a && defaultTitles.includes(a.title);
            })();
            Tabs.reload();

            // 如果欢迎笔记是当前活动标签，重新加载编辑器内容
            if (wasWelcomeActive) {
                const active = Tabs.getActive();
                if (active) Editor.loadNote(active.id, active);
            }

            Editor.updateStats();
            Editor.setPreviewMode(Editor.getPreviewMode());
            updateStorageInfo();
            applyTheme(settings.theme);

            // 如果搜索面板打开，刷新提示文字
            const panel = document.getElementById('searchPanel');
            if (panel && panel.style.display !== 'none') {
                const input = document.getElementById('searchInput');
                if (!input || !input.value.trim()) {
                    updateSearchResults();
                }
            }
        });

        // 同步语言下拉框初始值
        syncLangSelect();

        // 自动加载上次活动的笔记
        resetAutoSave();

        // 更新状态栏
        updateStorageInfo();

        // Toast 就绪
        showToast(I18n.t('toast.ready'), 'info');
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        // 新建标签页按钮
        document.getElementById('btnNewTab')?.addEventListener('click', () => {
            Tabs.create();
        });

        // 主题切换按钮
        document.getElementById('btnThemeToggle')?.addEventListener('click', toggleTheme);

        // 语言切换下拉框
        document.getElementById('btnLangToggle')?.addEventListener('change', (e) => {
            I18n.setLanguage(e.target.value);
            const langNames = { 'zh-CN': '中文', 'en': 'English', 'ja': '日本語' };
            showToast(langNames[e.target.value], 'info');
        });

        // 复制 HTML 按钮
        document.getElementById('btnCopyHtml')?.addEventListener('click', copyHtml);

        // 导出 HTML 按钮
        document.getElementById('btnExportHtml')?.addEventListener('click', exportHtml);

        // 搜索按钮
        document.getElementById('btnSearch')?.addEventListener('click', toggleSearch);
        document.getElementById('btnSearchClose')?.addEventListener('click', closeSearch);
        document.getElementById('btnSearchPrev')?.addEventListener('click', () => navigateResult(-1));
        document.getElementById('btnSearchNext')?.addEventListener('click', () => navigateResult(1));

        // 全局快捷键
        document.addEventListener('keydown', handleKeyboard);

        // 移动端视图切换
        document.querySelectorAll('.view-toggle__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                Editor.toggleMobileView(view);
            });
        });

        // 窗口关闭前保存
        window.addEventListener('beforeunload', () => {
            Editor.saveNow();
        });

        // 可见性变化时保存（标签页切换/最小化）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                Editor.saveNow();
            }
        });

        // 防止意外关闭
        window.addEventListener('beforeunload', (e) => {
            Editor.saveNow();
            // 不阻止关闭，但确保保存
        });
    }

    /**
     * 全局键盘快捷键
     * Ctrl+Alt: 全局操作（避免与浏览器快捷键冲突）
     * Ctrl: 文本格式化（在 textarea 中不冲突）
     */
    function handleKeyboard(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const alt = e.altKey;

        // --- Ctrl+Alt: 全局操作 ---

        // Ctrl+Alt+N: 新建标签页
        if (ctrl && alt && e.key === 'n') {
            e.preventDefault();
            Tabs.create();
            return;
        }

        // Ctrl+Alt+S: 手动保存
        if (ctrl && alt && e.key === 's') {
            e.preventDefault();
            Editor.saveNow();
            showToast(I18n.t('toast.saved'), 'success');
            return;
        }

        // Ctrl+Alt+ArrowRight: 下一个标签页
        if (ctrl && alt && e.key === 'ArrowRight') {
            e.preventDefault();
            Tabs.next();
            return;
        }

        // Ctrl+Alt+ArrowLeft: 上一个标签页
        if (ctrl && alt && e.key === 'ArrowLeft') {
            e.preventDefault();
            Tabs.prev();
            return;
        }

        // Ctrl+Alt+F: 全局搜索
        if (ctrl && alt && e.key === 'f') {
            e.preventDefault();
            toggleSearch();
            return;
        }

        // Ctrl+Alt+K: 插入链接
        if (ctrl && alt && e.key === 'k') {
            e.preventDefault();
            Editor.applyFormat('link');
            return;
        }

        // --- Ctrl: 文本格式化（在 textarea 中不冲突浏览器）---

        // Ctrl+B: 加粗
        if (ctrl && !alt && e.key === 'b') {
            e.preventDefault();
            Editor.applyFormat('bold');
            return;
        }

        // Ctrl+I: 斜体
        if (ctrl && !alt && e.key === 'i') {
            e.preventDefault();
            Editor.applyFormat('italic');
            return;
        }

        // Ctrl+`: 行内代码
        if (ctrl && !alt && e.key === '`') {
            e.preventDefault();
            Editor.applyFormat('code');
            return;
        }

        // Ctrl+Shift+H: 一级标题
        if (ctrl && !alt && e.shiftKey && e.key === 'H') {
            e.preventDefault();
            Editor.applyFormat('h1');
            return;
        }
    }

    /**
     * 应用主题
     * @param {'light'|'dark'|'auto'} theme
     */
    function applyTheme(theme) {
        const root = document.documentElement;
        const themeBtn = document.getElementById('btnThemeToggle');
        const icon = themeBtn?.querySelector('.material-symbols-rounded');

        let resolvedTheme = theme;
        if (theme === 'auto') {
            resolvedTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        root.setAttribute('data-theme', resolvedTheme);

        if (icon) {
            icon.textContent = resolvedTheme === 'dark' ? 'light_mode' : 'dark_mode';
        }
        if (themeBtn) {
            themeBtn.title = I18n.t(resolvedTheme === 'dark' ? 'theme.switchToLight' : 'theme.switchToDark');
        }

        settings.theme = theme;
    }

    /**
     * 切换主题
     */
    function toggleTheme() {
        const cycle = { light: 'dark', dark: 'auto', auto: 'light' };
        const nextTheme = cycle[settings.theme] || 'auto';
        applyTheme(nextTheme);
        Storage.saveSettings({ theme: nextTheme });

        showToast(I18n.t('toast.themeChanged', { theme: I18n.t('theme.' + nextTheme) }), 'info');
    }

    /**
     * 更新 localStorage 中匹配默认标题的欢迎笔记为当前语言版本
     */
    function updateWelcomeNotes() {
        const defaultTitles = ['欢迎使用', 'Welcome', 'ようこそ'];
        const data = Storage.loadAll();
        let changed = false;
        data.tabs.forEach(tab => {
            if (defaultTitles.includes(tab.title)) {
                const defaultNote = I18n.getDefaultNote();
                tab.title = defaultNote.title;
                tab.content = defaultNote.content;
                changed = true;
            }
        });
        if (changed) {
            Storage.saveAll(data);
        }
    }

    /**
     * 同步语言下拉框的选中值
     */
    function syncLangSelect() {
        const select = document.getElementById('btnLangToggle');
        if (select) select.value = I18n.getLang();
    }

    /**
     * 恢复自动保存
     */
    function resetAutoSave() {
        const settings = Storage.loadSettings();
        const activeTab = Tabs.getActive();
        if (activeTab) {
            Editor.loadNote(activeTab.id, activeTab);
        }
    }

    /**
     * 更新存储信息
     */
    function updateStorageInfo() {
        const usage = Storage.getStorageUsage();
        const statusStats = document.getElementById('statusStats');
        if (statusStats) {
            const tabCount = Tabs.getAll().length;
            statusStats.textContent = I18n.t('status.stats', { count: tabCount, usage: usage });
        }
    }

    // ============================================================
    //  全标签检索
    // ============================================================

    let searchResults = [];
    let searchActiveIdx = -1;

    function initSearch() {
        const input = document.getElementById('searchInput');
        if (!input) return;
        input.addEventListener('input', () => doSearch());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                navigateResult(e.shiftKey ? -1 : 1);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSearch();
            }
        });
    }

    function toggleSearch() {
        const panel = document.getElementById('searchPanel');
        if (!panel) return;
        if (panel.style.display === 'none') {
            openSearch();
        } else {
            closeSearch();
        }
    }

    function openSearch() {
        const panel = document.getElementById('searchPanel');
        const input = document.getElementById('searchInput');
        if (!panel || !input) return;
        panel.style.display = 'flex';
        input.value = '';
        input.focus();
        searchResults = [];
        searchActiveIdx = -1;
        updateSearchResults();
    }

    function closeSearch() {
        const panel = document.getElementById('searchPanel');
        if (!panel) return;
        panel.style.display = 'none';
        searchResults = [];
        searchActiveIdx = -1;
    }

    function doSearch() {
        const input = document.getElementById('searchInput');
        const query = input ? input.value.trim() : '';
        searchResults = [];
        searchActiveIdx = -1;

        if (!query || query.length < 1) {
            updateSearchResults();
            return;
        }

        const tabs = Tabs.getAll();
        const lowerQuery = query.toLowerCase();

        tabs.forEach(tab => {
            const content = tab.content || '';
            const lines = content.split('\n');
            lines.forEach((line, lineIdx) => {
                const lowerLine = line.toLowerCase();
                let colIdx = 0;
                while ((colIdx = lowerLine.indexOf(lowerQuery, colIdx)) !== -1) {
                    // 截取匹配处前后各40个字符作为摘要
                    const start = Math.max(0, colIdx - 40);
                    const end = Math.min(line.length, colIdx + query.length + 40);
                    let snippet = line.substring(start, end);
                    if (start > 0) snippet = '…' + snippet;
                    if (end < line.length) snippet = snippet + '…';

                    searchResults.push({
                        tabId: tab.id,
                        tabTitle: tab.title,
                        lineIdx: lineIdx,
                        matchStart: colIdx,
                        matchLen: query.length,
                        snippet: snippet,
                        snippetOffset: start > 0 ? colIdx - start + 1 : colIdx, // …占1字符
                    });
                    colIdx += query.length;
                }
            });
        });

        // 限制最多200条结果
        if (searchResults.length > 200) {
            searchResults = searchResults.slice(0, 200);
        }

        if (searchResults.length > 0) {
            searchActiveIdx = 0;
        }
        updateSearchResults();
    }

    function updateSearchResults() {
        const container = document.getElementById('searchResults');
        const countEl = document.getElementById('searchCount');
        if (!container) return;

        container.innerHTML = '';

        const query = document.getElementById('searchInput')?.value.trim() || '';

        if (!query) {
            if (countEl) countEl.textContent = '';
            container.innerHTML = '<div class="search-result-empty">' + I18n.t('search.emptyHint') + '</div>';
            return;
        }

        if (searchResults.length === 0) {
            if (countEl) countEl.textContent = '0';
            container.innerHTML = '<div class="search-result-empty">' + I18n.t('search.noResults') + '</div>';
            return;
        }

        if (countEl) countEl.textContent = `${searchActiveIdx + 1}/${searchResults.length}`;

        searchResults.forEach((result, idx) => {
            const item = document.createElement('div');
            item.className = 'search-result-item' + (idx === searchActiveIdx ? ' search-result-item--active' : '');

            // 高亮匹配关键词
            const escaped = result.snippet.replace(/[<>&]/g, ch => ({
                '<': '&lt;', '>': '&gt;', '&': '&amp;'
            })[ch]);
            const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const highlighted = escaped.replace(re, m => `<mark>${m}</mark>`);

            const lineNum = result.lineIdx + 1;
            item.innerHTML = `
                <span class="search-result-item__tab">${result.tabTitle}</span>
                <span class="search-result-item__line">L${lineNum}: ${highlighted}</span>
            `;

            item.addEventListener('click', () => jumpToResult(idx));
            container.appendChild(item);
        });

        // 滚动到激活项
        const activeEl = container.querySelector('.search-result-item--active');
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest' });
        }
    }

    function navigateResult(direction) {
        if (searchResults.length === 0) return;

        searchActiveIdx += direction;
        if (searchActiveIdx < 0) searchActiveIdx = searchResults.length - 1;
        if (searchActiveIdx >= searchResults.length) searchActiveIdx = 0;

        updateSearchResults();
        jumpToResult(searchActiveIdx);
    }

    function jumpToResult(idx) {
        if (idx < 0 || idx >= searchResults.length) return;
        const result = searchResults[idx];
        searchActiveIdx = idx;

        // 切换到目标标签页
        Tabs.switchTo(result.tabId);

        // 定位光标到匹配位置
        const editor = document.getElementById('editor');
        if (editor) {
            // 计算匹配处在全文中的位置：前面所有行长度之和 + 行内偏移
            const content = editor.value;
            const lines = content.split('\n');
            let charPos = 0;
            for (let i = 0; i < result.lineIdx; i++) {
                charPos += lines[i].length + 1; // +1 for newline
            }
            charPos += result.matchStart;

            editor.focus();
            editor.setSelectionRange(charPos, charPos + result.matchLen);
            // 滚动到可见位置
            const lineHeight = 25; // 估算行高
            editor.scrollTop = Math.max(0, result.lineIdx * lineHeight - 100);
        }

        updateSearchResults();
    }

    /**
     * 显示/隐藏工具栏
     */
    function showToolbar(visible) {
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
            toolbar.style.display = visible ? 'flex' : 'none';
        }
    }

    /**
     * 复制渲染后的 HTML 到剪贴板
     */
    async function copyHtml() {
        const html = Editor.getRenderedHtml();
        if (!html) {
            showToast(I18n.t('toast.noContentToCopy'), 'warning');
            return;
        }
        try {
            await navigator.clipboard.writeText(html);
            showToast(I18n.t('toast.htmlCopied'), 'success');
        } catch (e) {
            // 降级：使用 textarea 方式
            const ta = document.createElement('textarea');
            ta.value = html;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast(I18n.t('toast.htmlCopied'), 'success');
        }
    }

    /**
     * 导出 HTML 文件
     */
    function exportHtml() {
        const html = Editor.getRenderedHtml();
        if (!html) {
            showToast(I18n.t('toast.noContentToExport'), 'warning');
            return;
        }
        const tab = Tabs.getActive();
        const filename = (tab ? tab.title : 'notej') + '.html';
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(I18n.t('toast.htmlExported'), 'success');
    }

    /**
     * 导出笔记 (JSON)
     */
    function exportNotes() {
        const data = Storage.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'notej-backup-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast(I18n.t('toast.notesExported'), 'success');
    }

    /**
     * 导入笔记
     */
    function importNotes() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const data = Storage.importData(reader.result);
                if (data) {
                    // 重新初始化
                    Tabs.init(
                        (tabId, tab) => Editor.loadNote(tabId, tab),
                        (tabId) => {
                            const active = Tabs.getActive();
                            if (active && active.id === tabId) Editor.saveNow();
                        }
                    );
                    showToast(I18n.t('toast.imported', { count: data.tabs.length }), 'success');
                } else {
                    showToast(I18n.t('toast.importFailed'), 'error');
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    // 暴露到全局作用域（供 HTML onclick 调用）
    window.exportNotes = exportNotes;
    window.importNotes = importNotes;

    // 公开 API
    return {
        init,
        applyTheme,
        toggleTheme,
        showToolbar,
        copyHtml,
        exportHtml,
        exportNotes,
        importNotes,
        updateStorageInfo,
        openSearch,
        closeSearch,
        toggleSearch,
    };
})();

// --- Toast 工具函数 ---

/**
 * 显示 Toast 通知
 * @param {string} message - 消息内容
 * @param {'info'|'success'|'warning'|'error'} type - 消息类型
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // 清除之前的定时器
    if (toast._timeout) clearTimeout(toast._timeout);

    toast.textContent = message;
    toast.className = 'toast toast--' + type + ' toast--visible';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    toast._timeout = setTimeout(() => {
        toast.classList.remove('toast--visible');
    }, 2500);
}

// --- 启动应用 ---
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
