/**
 * NoteJ 存储层
 * 笔记使用 IndexedDB 独立存储，设置继续使用 localStorage。
 */

const Storage = (() => {
    const DB_NAME = 'notej_db';
    const DB_VERSION = 1;
    const NOTES_STORE = 'notes';
    const META_STORE = 'meta';
    const META_KEY = 'workspace';
    const LEGACY_KEY = 'notej_data';
    const LEGACY_BACKUP_KEY = 'notej_data_migrated_backup';
    const SETTINGS_KEY = 'notej_settings';
    const FORMAT_VERSION = 2;

    const DEFAULT_SETTINGS = {
        theme: 'auto',
        fontSize: 16,
        splitRatio: 50,
        lastActiveTabId: null,
        lang: 'zh-CN',
    };

    let db = null;
    let cache = { tabs: [], activeTabId: null };
    let writeQueue = Promise.resolve();
    let lastWritePromise = Promise.resolve(true);

    function requestToPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function transactionDone(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
        });
    }

    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(NOTES_STORE)) {
                    database.createObjectStore(NOTES_STORE, { keyPath: 'id' });
                }
                if (!database.objectStoreNames.contains(META_STORE)) {
                    database.createObjectStore(META_STORE, { keyPath: 'key' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function init() {
        db = await openDatabase();
        const transaction = db.transaction([NOTES_STORE, META_STORE], 'readonly');
        const notesRequest = transaction.objectStore(NOTES_STORE).getAll();
        const metaRequest = transaction.objectStore(META_STORE).get(META_KEY);
        const [notes, meta] = await Promise.all([
            requestToPromise(notesRequest),
            requestToPromise(metaRequest),
            transactionDone(transaction),
        ]);

        if (notes.length > 0 || meta) {
            const noteMap = new Map(notes.map(note => [note.id, normalizeNote(note)]));
            const order = Array.isArray(meta?.tabOrder) ? meta.tabOrder : [];
            const ordered = order.map(id => noteMap.get(id)).filter(Boolean);
            notes.forEach(note => {
                if (!order.includes(note.id)) ordered.push(normalizeNote(note));
            });
            cache = {
                tabs: ordered,
                activeTabId: ordered.some(note => note.id === meta?.activeTabId)
                    ? meta.activeTabId
                    : (ordered[0]?.id || null),
            };
            return;
        }

        await migrateLegacyData();
    }

    async function migrateLegacyData() {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (!raw) return;

        try {
            const legacy = validateWorkspace(JSON.parse(raw));
            cache = legacy;
            await persistWorkspace(legacy);
            localStorage.setItem(LEGACY_BACKUP_KEY, raw);
            localStorage.removeItem(LEGACY_KEY);
        } catch (error) {
            console.error('旧版数据迁移失败，已保留原始数据:', error);
        }
    }

    function cloneWorkspace(data = cache) {
        return {
            tabs: data.tabs.map(note => ({ ...note })),
            activeTabId: data.activeTabId,
        };
    }

    function generateId() {
        return 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    }

    function createNote(title, content) {
        const now = new Date().toISOString();
        return {
            id: generateId(),
            title: title || I18n.t('tabs.untitled'),
            content: content !== undefined ? String(content) : '',
            createdAt: now,
            updatedAt: now,
        };
    }

    function normalizeNote(note, fallbackTitle) {
        if (!note || typeof note !== 'object') throw new Error('Invalid note');
        const now = new Date().toISOString();
        return {
            id: typeof note.id === 'string' && note.id ? note.id : generateId(),
            title: typeof note.title === 'string' && note.title.trim()
                ? note.title.trim()
                : (fallbackTitle || I18n.t('tabs.untitled')),
            content: typeof note.content === 'string' ? note.content : String(note.content ?? ''),
            createdAt: typeof note.createdAt === 'string' ? note.createdAt : now,
            updatedAt: typeof note.updatedAt === 'string' ? note.updatedAt : now,
        };
    }

    function validateWorkspace(input) {
        const source = input?.data && typeof input.data === 'object' ? input.data : input;
        if (!source || !Array.isArray(source.tabs)) {
            throw new Error('Invalid workspace format');
        }

        const seen = new Set();
        const tabs = source.tabs.map(note => {
            const normalized = normalizeNote(note);
            if (seen.has(normalized.id)) normalized.id = generateId();
            seen.add(normalized.id);
            return normalized;
        });

        const activeTabId = tabs.some(note => note.id === source.activeTabId)
            ? source.activeTabId
            : (tabs[0]?.id || null);
        return { tabs, activeTabId };
    }

    function loadAll() {
        if (cache.tabs.length === 0) {
            const defaultTemplate = I18n.getDefaultNote();
            const defaultNote = createNote(defaultTemplate.title, defaultTemplate.content);
            cache = { tabs: [defaultNote], activeTabId: defaultNote.id };
            queueWrite(() => persistWorkspace(cache));
        }
        return cloneWorkspace();
    }

    function queueWrite(task) {
        lastWritePromise = writeQueue = writeQueue.then(task, task).catch(error => {
            console.error('保存失败:', error);
            if (typeof showToast === 'function') {
                showToast(I18n.t('toast.saveFailed'), 'error');
            }
            return false;
        });
        return lastWritePromise;
    }

    function whenIdle() {
        return lastWritePromise;
    }

    async function persistWorkspace(data) {
        const snapshot = cloneWorkspace(data);
        const transaction = db.transaction([NOTES_STORE, META_STORE], 'readwrite');
        const notesStore = transaction.objectStore(NOTES_STORE);
        notesStore.clear();
        snapshot.tabs.forEach(note => notesStore.put(note));
        transaction.objectStore(META_STORE).put({
            key: META_KEY,
            activeTabId: snapshot.activeTabId,
            tabOrder: snapshot.tabs.map(note => note.id),
            updatedAt: new Date().toISOString(),
        });
        await transactionDone(transaction);
        return true;
    }

    function saveAll(data) {
        cache = validateWorkspace(data);
        queueWrite(() => persistWorkspace(cache));
        return cloneWorkspace();
    }

    function updateNote(noteId, updates) {
        const index = cache.tabs.findIndex(note => note.id === noteId);
        if (index === -1) return cloneWorkspace();

        const updated = normalizeNote({
            ...cache.tabs[index],
            ...updates,
            id: noteId,
            updatedAt: new Date().toISOString(),
        });
        cache.tabs[index] = updated;

        queueWrite(async () => {
            const transaction = db.transaction(NOTES_STORE, 'readwrite');
            transaction.objectStore(NOTES_STORE).put(updated);
            await transactionDone(transaction);
            return true;
        });
        return cloneWorkspace();
    }

    function deleteNote(noteId) {
        cache.tabs = cache.tabs.filter(note => note.id !== noteId);
        if (cache.activeTabId === noteId) {
            cache.activeTabId = cache.tabs.at(-1)?.id || null;
        }
        queueWrite(() => persistWorkspace(cache));
        return cloneWorkspace();
    }

    function addNote(noteData) {
        const note = createNote(noteData?.title, noteData?.content);
        cache.tabs.push(note);
        cache.activeTabId = note.id;
        queueWrite(() => persistWorkspace(cache));
        return { data: cloneWorkspace(), note: { ...note } };
    }

    function setActiveTab(noteId) {
        if (!cache.tabs.some(note => note.id === noteId)) return;
        cache.activeTabId = noteId;
        const meta = {
            key: META_KEY,
            activeTabId: noteId,
            tabOrder: cache.tabs.map(note => note.id),
            updatedAt: new Date().toISOString(),
        };
        queueWrite(async () => {
            const transaction = db.transaction(META_STORE, 'readwrite');
            transaction.objectStore(META_STORE).put(meta);
            await transactionDone(transaction);
            return true;
        });
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
        } catch (error) {
            console.error('加载设置失败:', error);
            return { ...DEFAULT_SETTINGS };
        }
    }

    function saveSettings(settings) {
        try {
            const current = loadSettings();
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    }

    function getStorageUsage() {
        const json = JSON.stringify(cache);
        return (new Blob([json]).size / 1024).toFixed(1);
    }

    function createBackup() {
        return JSON.stringify({
            format: 'notej-backup',
            formatVersion: FORMAT_VERSION,
            exportedAt: new Date().toISOString(),
            data: cloneWorkspace(),
        }, null, 2);
    }

    function parseBackup(jsonString) {
        const parsed = JSON.parse(jsonString);
        if (parsed?.format && parsed.format !== 'notej-backup') {
            throw new Error('Unsupported backup format');
        }
        if (parsed?.formatVersion && parsed.formatVersion > FORMAT_VERSION) {
            throw new Error('Backup version is newer than this app');
        }
        return validateWorkspace(parsed);
    }

    function mergeWorkspace(incoming) {
        const merged = cloneWorkspace();
        const ids = new Set(merged.tabs.map(note => note.id));
        incoming.tabs.forEach(note => {
            const copy = { ...note };
            if (ids.has(copy.id)) copy.id = generateId();
            ids.add(copy.id);
            merged.tabs.push(copy);
        });
        if (!merged.activeTabId) merged.activeTabId = incoming.activeTabId;
        return saveAll(merged);
    }

    function importWorkspace(workspace, mode = 'merge') {
        const validated = validateWorkspace(workspace);
        return mode === 'replace' ? saveAll(validated) : mergeWorkspace(validated);
    }

    return {
        init,
        loadAll,
        saveAll,
        updateNote,
        deleteNote,
        addNote,
        setActiveTab,
        loadSettings,
        saveSettings,
        getStorageUsage,
        createBackup,
        parseBackup,
        importWorkspace,
        whenIdle,
        generateId,
        createNote,
    };
})();
