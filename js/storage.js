/**
 * NoteJ 存储层
 * 使用 localStorage 持久化笔记数据
 */

const Storage = (() => {
    const STORAGE_KEY = 'notej_data';
    const SETTINGS_KEY = 'notej_settings';

    /** 默认设置 */
    const DEFAULT_SETTINGS = {
        theme: 'auto',        // 'light' | 'dark' | 'auto'
        fontSize: 16,
        splitRatio: 50,       // 编辑区宽度百分比
        lastActiveTabId: null,
        lang: 'zh-CN',
    };

    /**
     * 生成唯一 ID
     */
    function generateId() {
        return 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    }

    /**
     * 创建新笔记对象
     */
    function createNote(title, content) {
        const now = new Date().toISOString();
        return {
            id: generateId(),
            title: title || I18n.t('tabs.untitled'),
            content: content !== undefined ? content : '',
            createdAt: now,
            updatedAt: now,
        };
    }

    /**
     * 读取全部数据
     * @returns {{ tabs: Array, activeTabId: string|null }}
     */
    function loadAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                // 确保数据结构完整
                if (!Array.isArray(data.tabs)) data.tabs = [];
                if (data.tabs.length === 0) {
                    // 首次使用，创建默认笔记
                    const defaultTmpl = I18n.getDefaultNote();
                    const defaultNote = createNote(defaultTmpl.title, defaultTmpl.content);
                    data.tabs = [defaultNote];
                    data.activeTabId = defaultNote.id;
                }
                return data;
            }
        } catch (e) {
            console.error('加载数据失败:', e);
        }
        // 无数据或读取失败，返回初始数据
        const defaultTmpl = I18n.getDefaultNote();
        const defaultNote = createNote(defaultTmpl.title, defaultTmpl.content);
        return {
            tabs: [defaultNote],
            activeTabId: defaultNote.id,
        };
    }

    /**
     * 保存全部数据
     */
    function saveAll(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                showToast(I18n.t('toast.storageFull'), 'error');
            } else {
                console.error('保存失败:', e);
            }
        }
    }

    /**
     * 更新单条笔记
     */
    function updateNote(noteId, updates) {
        const data = loadAll();
        const idx = data.tabs.findIndex(t => t.id === noteId);
        if (idx !== -1) {
            data.tabs[idx] = { ...data.tabs[idx], ...updates, updatedAt: new Date().toISOString() };
            saveAll(data);
        }
        return data;
    }

    /**
     * 删除笔记
     */
    function deleteNote(noteId) {
        const data = loadAll();
        data.tabs = data.tabs.filter(t => t.id !== noteId);
        if (data.activeTabId === noteId) {
            data.activeTabId = data.tabs.length > 0 ? data.tabs[data.tabs.length - 1].id : null;
        }
        saveAll(data);
        return data;
    }

    /**
     * 添加新笔记
     */
    function addNote(noteData) {
        const data = loadAll();
        const note = createNote(noteData?.title, noteData?.content);
        data.tabs.push(note);
        data.activeTabId = note.id;
        saveAll(data);
        return { data, note };
    }

    /**
     * 获取设置
     */
    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
            }
        } catch (e) {
            console.error('加载设置失败:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * 保存设置
     */
    function saveSettings(settings) {
        try {
            const current = loadSettings();
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
        } catch (e) {
            console.error('保存设置失败:', e);
        }
    }

    /**
     * 获取存储使用量（估算，单位 KB）
     */
    function getStorageUsage() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            total += localStorage.getItem(key).length + key.length;
        }
        return (total / 1024).toFixed(1);
    }

    /**
     * 导出全部数据为 JSON
     */
    function exportData() {
        const data = loadAll();
        return JSON.stringify(data, null, 2);
    }

    /**
     * 从 JSON 导入数据
     */
    function importData(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            if (!data.tabs || !Array.isArray(data.tabs)) {
                throw new Error('无效的数据格式');
            }
            saveAll(data);
            return data;
        } catch (e) {
            console.error('导入失败:', e);
            return null;
        }
    }

    // 公开 API
    return {
        loadAll,
        saveAll,
        updateNote,
        deleteNote,
        addNote,
        loadSettings,
        saveSettings,
        getStorageUsage,
        exportData,
        importData,
        generateId,
        createNote,
    };
})();
