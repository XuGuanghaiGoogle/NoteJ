/**
 * NoteJ 国际化模块
 * 支持中文 (zh-CN)、英语 (en)、日语 (ja)
 * 加载顺序：必须在 storage.js 之前加载
 */

const I18n = (() => {
    /** 当前语言 */
    let _lang = 'zh-CN';

    /** 语言变更监听器 */
    let _listeners = [];

    /** 翻译表 */
    const _translations = {
        'zh-CN': {
            // 应用
            'app.title': 'NoteJ - 轻量记事本',
            'app.emptyTitle': '欢迎使用 NoteJ ✨',
            'app.emptyDesc': '点击 <strong>+</strong> 新建笔记，或按 <kbd>Ctrl+Alt+N</kbd> 开始写作',

            // Toast
            'toast.ready': 'NoteJ 已就绪',
            'toast.saved': '笔记已保存',
            'toast.noteCreated': '新笔记已创建',
            'toast.minOneTab': '至少保留一个标签页',
            'toast.noContentToCopy': '没有可复制的内容',
            'toast.htmlCopied': 'HTML 已复制到剪贴板',
            'toast.noContentToExport': '没有可导出的内容',
            'toast.htmlExported': 'HTML 文件已导出',
            'toast.notesExported': '笔记已导出',
            'toast.imported': '笔记已导入 ({count} 篇)',
            'toast.importFailed': '导入失败：文件格式无效',
            'toast.themeChanged': '已切换为 {theme}',
            'toast.storageFull': '存储空间不足，请清理旧笔记',

            // 工具栏
            'toolbar.newTab': '新建标签页 (Ctrl+Alt+N)',
            'toolbar.search': '搜索全部标签 (Ctrl+Alt+F)',
            'toolbar.copyHtml': '复制为 HTML',
            'toolbar.exportHtml': '导出 HTML 文件',
            'toolbar.lang': '切换语言',
            'toolbar.langLabel': '语言',
            'toolbar.bold': '粗体 (Ctrl+B)',
            'toolbar.italic': '斜体 (Ctrl+I)',
            'toolbar.strikethrough': '删除线',
            'toolbar.code': '行内代码 (Ctrl+`)',
            'toolbar.h1': '一级标题',
            'toolbar.h2': '二级标题',
            'toolbar.h3': '三级标题',
            'toolbar.ul': '无序列表',
            'toolbar.ol': '有序列表',
            'toolbar.task': '任务列表',
            'toolbar.quote': '引用',
            'toolbar.link': '链接 (Ctrl+Alt+K)',
            'toolbar.image': '图片',
            'toolbar.table': '表格',
            'toolbar.hr': '水平线',
            'toolbar.date': '插入日期',
            'toolbar.datetime': '插入日期时间',

            // 搜索
            'search.inputPlaceholder': '搜索全部标签页...',
            'search.prevResult': '上一个 (Shift+Enter)',
            'search.nextResult': '下一个 (Enter)',
            'search.close': '关闭 (Escape)',
            'search.emptyHint': '输入关键词搜索全部标签页',
            'search.noResults': '未找到匹配结果',

            // 编辑器
            'editor.placeholder': '在此输入 Markdown 内容...',
            'editor.splitterTitle': '拖拽调整宽度',
            'editor.previewLabel': '预览',
            'editor.renderTab': '渲染',
            'editor.sourceTab': '源码',
            'editor.viewEdit': '编辑',
            'editor.viewPreview': '预览',
            'editor.formatBold': '粗体文字',
            'editor.formatItalic': '斜体文字',
            'editor.formatStrikethrough': '删除线文字',
            'editor.formatCode': '代码',
            'editor.formatLinkText': '链接文字',
            'editor.formatImageDesc': '图片描述',
            'editor.tableTemplate': '\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |\n',

            // 标签页
            'tabs.newTab': '新建标签页 (Ctrl+Alt+N)',
            'tabs.untitled': '未命名笔记',
            'tabs.dblclickRename': '双击重命名',
            'tabs.closeTab': '关闭标签页',

            // 状态栏
            'status.ready': '就绪',
            'status.saved': '已保存 {time}',
            'status.stats': '{count} 个标签页 | 存储 {usage} KB',
            'status.charsWordsLines': '{chars} 字符 | {words} 词 | {lines} 行',

            // 主题
            'theme.light': '亮色主题',
            'theme.dark': '暗色主题',
            'theme.auto': '自动主题',
            'theme.switchToLight': '切换到亮色主题',
            'theme.switchToDark': '切换到暗色主题',

            // 搜索按钮 aria-label
            'search.ariaSearch': '搜索',

            // Markdown 渲染
            'markdown.notLoaded': 'Markdown 渲染库未加载，请检查网络连接。',
            'markdown.emptyPreview': '预览区域 — 在左侧输入 Markdown 内容',
            'markdown.unknownError': '未知错误',
            'markdown.renderError': '渲染出错: ',

            // 默认笔记
            'defaultNote.title': '欢迎使用',
            'defaultNote.content': `# 欢迎使用 NoteJ 🎉

NoteJ 是一个轻量级 Markdown 记事本，所有数据保存在浏览器本地，无需注册、无需联网。

---

## ⌨️ 常用快捷键

| 快捷键 | 功能 |
|--------|------|
| **Ctrl+Alt+N** | 新建标签页 |
| **Ctrl+Alt+S** | 手动保存 |
| **Ctrl+Alt+→** | 切换到下一个标签页 |
| **Ctrl+Alt+←** | 切换到上一个标签页 |
| **Ctrl+Alt+F** | 全局搜索 |
| **Ctrl+B** | **粗体** |
| **Ctrl+I** | *斜体* |
| **Ctrl+Alt+K** | [链接](url) |
| **Ctrl+\\\`** | \`行内代码\` |
| **Esc** | 关闭搜索面板 |

---

## ✨ 功能亮点

- **多标签页** — 同时编辑多篇笔记
- **Markdown 实时预览** — 所见即所得
- **自动保存** — 内容自动保存到本地
- **代码高亮** — 支持多种编程语言
- **全局搜索** — 搜索所有标签页中的关键词
- **主题切换** — 亮色 / 暗色 / 自动
- **语言切换** — 中文 / English / 日本語
- **导入导出** — JSON 备份还原，导出 HTML
- **移动端适配** — 响应式布局，手机也能轻松使用

---

## 📝 Markdown 快速参考

### 文本格式

**粗体** \`**文字**\`
*斜体* \`*文字*\`
~~删除线~~ \`~~文字~~\`
\`行内代码\` \`\\\`代码\\\`\`

### 标题

\`# 一级标题\`
\`## 二级标题\`
\`### 三级标题\`

### 列表

\`- 无序列表\`
\`1. 有序列表\`
\`- [ ] 任务列表\`

### 代码块

\\\`\\\`\\\`javascript
console.log('Hello, NoteJ!');
\\\`\\\`\\\`

### 链接与图片

\`[链接文字](https://example.com)\`
\`![图片描述](image-url.png)\`

### 表格

\`| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |\`

### 引用

\`> 这是一段引用文字\`

### 分割线

\`---\`

---

> 💡 **提示**：选中文字后点击工具栏按钮，或使用快捷键即可快速应用格式。

尽情写作吧！✍️
`,
        },

        'en': {
            // App
            'app.title': 'NoteJ - Lightweight Notepad',
            'app.emptyTitle': 'Welcome to NoteJ ✨',
            'app.emptyDesc': 'Click <strong>+</strong> or press <kbd>Ctrl+Alt+N</kbd> to start writing',

            // Toast
            'toast.ready': 'NoteJ is ready',
            'toast.saved': 'Note saved',
            'toast.noteCreated': 'New note created',
            'toast.minOneTab': 'Keep at least one tab',
            'toast.noContentToCopy': 'No content to copy',
            'toast.htmlCopied': 'HTML copied to clipboard',
            'toast.noContentToExport': 'No content to export',
            'toast.htmlExported': 'HTML file exported',
            'toast.notesExported': 'Notes exported',
            'toast.imported': 'Imported {count} note(s)',
            'toast.importFailed': 'Import failed: invalid file format',
            'toast.themeChanged': 'Switched to {theme}',
            'toast.storageFull': 'Storage full, please clean up old notes',

            // Toolbar
            'toolbar.newTab': 'New Tab (Ctrl+Alt+N)',
            'toolbar.search': 'Search All Tabs (Ctrl+Alt+F)',
            'toolbar.copyHtml': 'Copy as HTML',
            'toolbar.exportHtml': 'Export HTML File',
            'toolbar.lang': 'Switch Language',
            'toolbar.langLabel': 'Language',
            'toolbar.bold': 'Bold (Ctrl+B)',
            'toolbar.italic': 'Italic (Ctrl+I)',
            'toolbar.strikethrough': 'Strikethrough',
            'toolbar.code': 'Inline Code (Ctrl+`)',
            'toolbar.h1': 'Heading 1',
            'toolbar.h2': 'Heading 2',
            'toolbar.h3': 'Heading 3',
            'toolbar.ul': 'Unordered List',
            'toolbar.ol': 'Ordered List',
            'toolbar.task': 'Task List',
            'toolbar.quote': 'Blockquote',
            'toolbar.link': 'Link (Ctrl+Alt+K)',
            'toolbar.image': 'Image',
            'toolbar.table': 'Table',
            'toolbar.hr': 'Horizontal Rule',
            'toolbar.date': 'Insert Date',
            'toolbar.datetime': 'Insert Date & Time',

            // Search
            'search.inputPlaceholder': 'Search all tabs...',
            'search.prevResult': 'Previous (Shift+Enter)',
            'search.nextResult': 'Next (Enter)',
            'search.close': 'Close (Escape)',
            'search.emptyHint': 'Enter keywords to search all tabs',
            'search.noResults': 'No results found',

            // Editor
            'editor.placeholder': 'Enter Markdown content here...',
            'editor.splitterTitle': 'Drag to resize',
            'editor.previewLabel': 'Preview',
            'editor.renderTab': 'Rendered',
            'editor.sourceTab': 'Source',
            'editor.viewEdit': 'Edit',
            'editor.viewPreview': 'Preview',
            'editor.formatBold': 'bold text',
            'editor.formatItalic': 'italic text',
            'editor.formatStrikethrough': 'strikethrough text',
            'editor.formatCode': 'code',
            'editor.formatLinkText': 'link text',
            'editor.formatImageDesc': 'image description',
            'editor.tableTemplate': '\n| Col1 | Col2 | Col3 |\n|------|------|------|\n| Content | Content | Content |\n',

            // Tabs
            'tabs.newTab': 'New Tab (Ctrl+Alt+N)',
            'tabs.untitled': 'Untitled Note',
            'tabs.dblclickRename': 'Double-click to rename',
            'tabs.closeTab': 'Close Tab',

            // Status bar
            'status.ready': 'Ready',
            'status.saved': 'Saved {time}',
            'status.stats': '{count} tab(s) | Storage {usage} KB',
            'status.charsWordsLines': '{chars} chars | {words} words | {lines} lines',

            // Theme
            'theme.light': 'Light',
            'theme.dark': 'Dark',
            'theme.auto': 'Auto',
            'theme.switchToLight': 'Switch to Light Theme',
            'theme.switchToDark': 'Switch to Dark Theme',

            // Search aria-label
            'search.ariaSearch': 'Search',

            // Markdown renderer
            'markdown.notLoaded': 'Markdown renderer not loaded. Please check your network connection.',
            'markdown.emptyPreview': 'Preview area — Enter Markdown content on the left',
            'markdown.unknownError': 'Unknown error',
            'markdown.renderError': 'Render error: ',

            // Default note
            'defaultNote.title': 'Welcome',
            'defaultNote.content': `# Welcome to NoteJ 🎉

NoteJ is a lightweight Markdown notepad. All data is stored locally in your browser — no registration, no internet required.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+Alt+N** | New tab |
| **Ctrl+Alt+S** | Save manually |
| **Ctrl+Alt+→** | Switch to next tab |
| **Ctrl+Alt+←** | Switch to previous tab |
| **Ctrl+Alt+F** | Global search |
| **Ctrl+B** | **Bold** |
| **Ctrl+I** | *Italic* |
| **Ctrl+Alt+K** | [Link](url) |
| **Ctrl+\\\`** | \`Inline Code\` |
| **Esc** | Close search panel |

---

## ✨ Highlights

- **Multi-tab** — Edit multiple notes simultaneously
- **Live Preview** — What you see is what you get
- **Auto-save** — Content saved automatically to local storage
- **Code Highlighting** — Supports multiple programming languages
- **Global Search** — Search across all tabs
- **Theme Toggle** — Light / Dark / Auto
- **Language Switch** — UI: 中文 / English / 日本語
- **Import / Export** — JSON backup & restore, export HTML
- **Mobile Friendly** — Responsive layout works great on phones

---

## 📝 Markdown Quick Reference

### Text Formatting

**Bold** \`**text**\`
*Italic* \`*text*\`
~~Strikethrough~~ \`~~text~~\`
\`Inline Code\` \`\\\`code\\\`\`

### Headings

\`# Heading 1\`
\`## Heading 2\`
\`### Heading 3\`

### Lists

\`- Unordered list\`
\`1. Ordered list\`
\`- [ ] Task list\`

### Code Blocks

\\\`\\\`\\\`javascript
console.log('Hello, NoteJ!');
\\\`\\\`\\\`

### Links & Images

\`[Link text](https://example.com)\`
\`![Image alt](image-url.png)\`

### Tables

\`| Col1 | Col2 | Col3 |
|------|------|------|
| A    | B    | C    |\`

### Blockquotes

\`> This is a blockquote\`

### Horizontal Rule

\`---\`

---

> 💡 **Tip**: Select text and click a toolbar button, or use a keyboard shortcut to apply formatting instantly.

Happy writing! ✍️
`,
        },

        'ja': {
            // アプリ
            'app.title': 'NoteJ - 軽量メモ帳',
            'app.emptyTitle': 'NoteJ へようこそ ✨',
            'app.emptyDesc': '<strong>+</strong> をクリック、または <kbd>Ctrl+Alt+N</kbd> で書き始めましょう',

            // トースト
            'toast.ready': 'NoteJ の準備ができました',
            'toast.saved': 'メモを保存しました',
            'toast.noteCreated': '新しいメモを作成しました',
            'toast.minOneTab': '少なくとも1つのタブを残してください',
            'toast.noContentToCopy': 'コピーする内容がありません',
            'toast.htmlCopied': 'HTML をクリップボードにコピーしました',
            'toast.noContentToExport': 'エクスポートする内容がありません',
            'toast.htmlExported': 'HTML ファイルをエクスポートしました',
            'toast.notesExported': 'メモをエクスポートしました',
            'toast.imported': '{count} 件のメモをインポートしました',
            'toast.importFailed': 'インポート失敗：ファイル形式が無効です',
            'toast.themeChanged': '{theme} に切り替えました',
            'toast.storageFull': '容量不足です。古いメモを整理してください',

            // ツールバー
            'toolbar.newTab': '新しいタブ (Ctrl+Alt+N)',
            'toolbar.search': 'すべてのタブを検索 (Ctrl+Alt+F)',
            'toolbar.copyHtml': 'HTML としてコピー',
            'toolbar.exportHtml': 'HTML ファイルをエクスポート',
            'toolbar.lang': '言語を切り替え',
            'toolbar.langLabel': '言語',
            'toolbar.bold': '太字 (Ctrl+B)',
            'toolbar.italic': '斜体 (Ctrl+I)',
            'toolbar.strikethrough': '取り消し線',
            'toolbar.code': 'インラインコード (Ctrl+`)',
            'toolbar.h1': '見出し 1',
            'toolbar.h2': '見出し 2',
            'toolbar.h3': '見出し 3',
            'toolbar.ul': '箇条書き',
            'toolbar.ol': '番号付きリスト',
            'toolbar.task': 'タスクリスト',
            'toolbar.quote': '引用',
            'toolbar.link': 'リンク (Ctrl+Alt+K)',
            'toolbar.image': '画像',
            'toolbar.table': 'テーブル',
            'toolbar.hr': '水平線',
            'toolbar.date': '日付を挿入',
            'toolbar.datetime': '日時を挿入',

            // 検索
            'search.inputPlaceholder': 'すべてのタブを検索...',
            'search.prevResult': '前へ (Shift+Enter)',
            'search.nextResult': '次へ (Enter)',
            'search.close': '閉じる (Escape)',
            'search.emptyHint': 'キーワードを入力してすべてのタブを検索',
            'search.noResults': '一致する結果がありません',

            // エディタ
            'editor.placeholder': 'Markdown コンテンツを入力...',
            'editor.splitterTitle': 'ドラッグして幅を調整',
            'editor.previewLabel': 'プレビュー',
            'editor.renderTab': '表示',
            'editor.sourceTab': 'ソース',
            'editor.viewEdit': '編集',
            'editor.viewPreview': 'プレビュー',
            'editor.formatBold': '太字テキスト',
            'editor.formatItalic': '斜体テキスト',
            'editor.formatStrikethrough': '取り消し線テキスト',
            'editor.formatCode': 'コード',
            'editor.formatLinkText': 'リンクテキスト',
            'editor.formatImageDesc': '画像の説明',
            'editor.tableTemplate': '\n| 列1 | 列2 | 列3 |\n|------|------|------|\n| 内容 | 内容 | 内容 |\n',

            // タブ
            'tabs.newTab': '新しいタブ (Ctrl+Alt+N)',
            'tabs.untitled': '無題のメモ',
            'tabs.dblclickRename': 'ダブルクリックで名前を変更',
            'tabs.closeTab': 'タブを閉じる',

            // ステータスバー
            'status.ready': '準備完了',
            'status.saved': '保存しました {time}',
            'status.stats': '{count} タブ | ストレージ {usage} KB',
            'status.charsWordsLines': '{chars} 文字 | {words} 語 | {lines} 行',

            // テーマ
            'theme.light': 'ライト',
            'theme.dark': 'ダーク',
            'theme.auto': '自動',
            'theme.switchToLight': 'ライトテーマに切り替え',
            'theme.switchToDark': 'ダークテーマに切り替え',

            // 検索 aria-label
            'search.ariaSearch': '検索',

            // Markdown レンダラー
            'markdown.notLoaded': 'Markdown レンダラーが読み込まれていません。ネットワーク接続を確認してください。',
            'markdown.emptyPreview': 'プレビューエリア — 左側に Markdown コンテンツを入力してください',
            'markdown.unknownError': '不明なエラー',
            'markdown.renderError': 'レンダリングエラー: ',

            // デフォルトメモ
            'defaultNote.title': 'ようこそ',
            'defaultNote.content': `# NoteJ へようこそ 🎉

NoteJ は軽量の Markdown メモ帳です。すべてのデータはブラウザのローカルストレージに保存され、登録もネット接続も不要です。

---

## ⌨️ ショートカット

| ショートカット | 機能 |
|----------------|------|
| **Ctrl+Alt+N** | 新しいタブを作成 |
| **Ctrl+Alt+S** | 手動保存 |
| **Ctrl+Alt+→** | 次のタブに切り替え |
| **Ctrl+Alt+←** | 前のタブに切り替え |
| **Ctrl+Alt+F** | グローバル検索 |
| **Ctrl+B** | **太字** |
| **Ctrl+I** | *斜体* |
| **Ctrl+Alt+K** | [リンク](url) |
| **Ctrl+\\\`** | \`インラインコード\` |
| **Esc** | 検索パネルを閉じる |

---

## ✨ 主な機能

- **マルチタブ** — 複数のメモを同時に編集
- **ライブプレビュー** — WYSIWYG
- **自動保存** — コンテンツをローカルに自動保存
- **コードハイライト** — 複数のプログラミング言語に対応
- **グローバル検索** — すべてのタブをキーワード検索
- **テーマ切替** — ライト / ダーク / 自動
- **言語切替** — 中文 / English / 日本語 UI
- **インポート / エクスポート** — JSONバックアップ・復元、HTML出力
- **モバイル対応** — レスポンシブレイアウトでスマホでも快適

---

## 📝 Markdown クイックリファレンス

### テキスト整形

**太字** \`**テキスト**\`
*斜体* \`*テキスト*\`
~~取り消し線~~ \`~~テキスト~~\`
\`インラインコード\` \`\\\`コード\\\`\`

### 見出し

\`# 見出し 1\`
\`## 見出し 2\`
\`### 見出し 3\`

### リスト

\`- 箇条書き\`
\`1. 番号付きリスト\`
\`- [ ] タスクリスト\`

### コードブロック

\\\`\\\`\\\`javascript
console.log('Hello, NoteJ!');
\\\`\\\`\\\`

### リンクと画像

\`[リンクテキスト](https://example.com)\`
\`![画像の説明](image-url.png)\`

### テーブル

\`| 列1 | 列2 | 列3 |
|------|------|------|
| A    | B    | C    |\`

### 引用

\`> これは引用文です\`

### 水平線

\`---\`

---

> 💡 **ヒント**：テキストを選択してツールバーのボタンをクリック、またはショートカットで素早く書式を適用できます。

楽しく書きましょう！✍️
`,
        },
    };

    /**
     * 获取翻译字符串
     * @param {string} key - 翻译 key
     * @param {Object} [params] - 插值参数 {key: value}
     * @returns {string}
     */
    function t(key, params) {
        const map = _translations[_lang];
        let str = (map && map[key]) ? map[key] : (_translations['zh-CN'][key] || key);
        if (params) {
            Object.keys(params).forEach(k => {
                str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
            });
        }
        return str;
    }

    /**
     * 获取当前 locale 代码（用于日期/时间格式化）
     * @returns {string}
     */
    function getLocale() {
        return _lang;
    }

    /**
     * 获取当前语言代码
     * @returns {string}
     */
    function getLang() {
        return _lang;
    }

    /**
     * 切换语言
     * @param {string} lang - 语言代码
     */
    function setLanguage(lang) {
        if (!_translations[lang]) return;
        _lang = lang;

        // 更新 HTML lang 属性
        document.documentElement.lang = _lang;

        // 更新页面标题
        document.title = t('app.title');

        // 更新所有静态 DOM 文本
        applyStaticTranslations();

        // 持久化到 localStorage
        if (typeof Storage !== 'undefined') {
            Storage.saveSettings({ lang: _lang });
        }

        // 通知所有监听器
        _listeners.forEach(fn => fn(_lang));
    }

    /**
     * 注册语言变更监听器
     * @param {Function} fn - 回调函数，接收新语言代码
     */
    function onLanguageChange(fn) {
        _listeners.push(fn);
    }

    /**
     * 更新所有带有 data-i18n-* 属性的 DOM 元素
     */
    function applyStaticTranslations() {
        // data-i18n: textContent
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.dataset.i18n);
        });

        // data-i18n-html: innerHTML（用于包含 HTML 标签的文本）
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            el.innerHTML = t(el.dataset.i18nHtml);
        });

        // data-i18n-title: title 属性
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = t(el.dataset.i18nTitle);
        });

        // data-i18n-aria: aria-label 属性
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            el.setAttribute('aria-label', t(el.dataset.i18nAria));
        });

        // data-i18n-placeholder: placeholder 属性
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.dataset.i18nPlaceholder);
        });
    }

    /**
     * 获取当前语言的默认笔记模板
     * @returns {{ title: string, content: string }}
     */
    function getDefaultNote() {
        return {
            title: t('defaultNote.title'),
            content: t('defaultNote.content'),
        };
    }

    /**
     * 初始化语言设置
     * 从已保存的设置读取语言偏好，无保存时默认中文
     * 必须在 Storage.loadSettings() 可用后调用
     */
    function init() {
        try {
            if (typeof Storage !== 'undefined') {
                const settings = Storage.loadSettings();
                if (settings.lang && _translations[settings.lang]) {
                    _lang = settings.lang;
                }
                // 无保存偏好时，保持默认中文（_lang 已初始化为 'zh-CN'）
            }
        } catch (e) {
            // 保持默认 zh-CN
        }

        // 初始化 DOM
        document.documentElement.lang = _lang;
        document.title = t('app.title');
        applyStaticTranslations();
    }

    // 公开 API
    return {
        t,
        getLocale,
        getLang,
        setLanguage,
        onLanguageChange,
        applyStaticTranslations,
        getDefaultNote,
        init,
    };
})();
