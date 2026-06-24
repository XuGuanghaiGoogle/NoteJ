# NoteJ — 轻量 Markdown 记事本

纯前端 Markdown 记事本应用，无需构建工具，浏览器直接打开即用。

---

## 中文

### 功能特性

- **多标签页** — 同时编辑多篇笔记
- **Markdown 实时预览** — 所见即所得
- **自动保存** — 内容自动保存到本地
- **代码高亮** — 支持多种编程语言
- **全局搜索** — 搜索所有标签页中的关键词
- **主题切换** — 亮色 / 暗色 / 自动
- **语言切换** — 中文 / English / 日本語
- **导入导出** — JSON 备份还原，导出 HTML

### 快速开始

1. 下载项目文件
2. 用浏览器打开 `index.html`
3. 开始写作！

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Alt+N` | 新建标签页 |
| `Ctrl+Alt+S` | 手动保存 |
| `Ctrl+Alt+→` | 下一个标签页 |
| `Ctrl+Alt+←` | 上一个标签页 |
| `Ctrl+Alt+F` | 全局搜索 |
| `Ctrl+Alt+K` | 插入链接 |
| `Ctrl+B` | 粗体 |
| `Ctrl+I` | 斜体 |
| `` Ctrl+` `` | 行内代码 |
| `Ctrl+Shift+H` | 一级标题 |
| `Esc` | 关闭搜索面板 |

### 项目结构

```
NoteJ/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式
├── js/
│   ├── i18n.js         # 国际化模块（中/英/日）
│   ├── storage.js      # localStorage 数据持久化
│   ├── markdown.js     # Markdown 渲染（marked.js + highlight.js）
│   ├── tabs.js         # 标签页管理
│   ├── editor.js       # 编辑器与工具栏
│   └── app.js          # 应用入口、主题、搜索
└── lib/                # 预留本地库目录
```

### 技术栈

- 原生 JavaScript（IIFE 模块模式）
- [marked.js v12](https://github.com/markedjs/marked) — Markdown 解析
- [highlight.js v11](https://highlightjs.org/) — 代码语法高亮
- [Material Symbols](https://fonts.google.com/icons) — 图标字体

---

## English

### Features

- **Multi-tab** — Edit multiple notes simultaneously
- **Live Preview** — What you see is what you get
- **Auto-save** — Content saved automatically to local storage
- **Code Highlighting** — Supports multiple programming languages
- **Global Search** — Search across all tabs
- **Theme Toggle** — Light / Dark / Auto
- **Language Switch** — UI: 中文 / English / 日本語
- **Import / Export** — JSON backup & restore, export HTML

### Quick Start

1. Download the project files
2. Open `index.html` in your browser
3. Start writing!

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+N` | New tab |
| `Ctrl+Alt+S` | Save manually |
| `Ctrl+Alt+→` | Next tab |
| `Ctrl+Alt+←` | Previous tab |
| `Ctrl+Alt+F` | Global search |
| `Ctrl+Alt+K` | Insert link |
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `` Ctrl+` `` | Inline code |
| `Ctrl+Shift+H` | Heading 1 |
| `Esc` | Close search panel |

### Project Structure

```
NoteJ/
├── index.html          # Main page
├── css/
│   └── style.css       # Stylesheet
├── js/
│   ├── i18n.js         # Internationalization (zh/en/ja)
│   ├── storage.js      # localStorage persistence
│   ├── markdown.js     # Markdown rendering (marked.js + highlight.js)
│   ├── tabs.js         # Tab management
│   ├── editor.js       # Editor & toolbar
│   └── app.js          # App entry, theme, search
└── lib/                # Reserved for local libraries
```

### Tech Stack

- Vanilla JavaScript (IIFE module pattern)
- [marked.js v12](https://github.com/markedjs/marked) — Markdown parser
- [highlight.js v11](https://highlightjs.org/) — Code syntax highlighting
- [Material Symbols](https://fonts.google.com/icons) — Icon font

---

## 日本語

### 機能

- **マルチタブ** — 複数のメモを同時に編集
- **ライブプレビュー** — WYSIWYG
- **自動保存** — コンテンツをローカルに自動保存
- **コードハイライト** — 複数のプログラミング言語に対応
- **グローバル検索** — すべてのタブをキーワード検索
- **テーマ切替** — ライト / ダーク / 自動
- **言語切替** — 中文 / English / 日本語 UI
- **インポート / エクスポート** — JSONバックアップ・復元、HTML出力

### クイックスタート

1. プロジェクトファイルをダウンロード
2. ブラウザで `index.html` を開く
3. 書き始めましょう！

### ショートカット

| ショートカット | 機能 |
|----------------|------|
| `Ctrl+Alt+N` | 新しいタブ |
| `Ctrl+Alt+S` | 手動保存 |
| `Ctrl+Alt+→` | 次のタブ |
| `Ctrl+Alt+←` | 前のタブ |
| `Ctrl+Alt+F` | グローバル検索 |
| `Ctrl+Alt+K` | リンクを挿入 |
| `Ctrl+B` | 太字 |
| `Ctrl+I` | 斜体 |
| `` Ctrl+` `` | インラインコード |
| `Ctrl+Shift+H` | 見出し 1 |
| `Esc` | 検索パネルを閉じる |

### プロジェクト構成

```
NoteJ/
├── index.html          # メインページ
├── css/
│   └── style.css       # スタイルシート
├── js/
│   ├── i18n.js         # 国際化モジュール（中/英/日）
│   ├── storage.js      # localStorage 永続化
│   ├── markdown.js     # Markdown レンダリング（marked.js + highlight.js）
│   ├── tabs.js         # タブ管理
│   ├── editor.js       # エディタとツールバー
│   └── app.js          # アプリエントリ、テーマ、検索
└── lib/                # ローカルライブラリ用
```

### 技術スタック

- バニラ JavaScript（IIFE モジュールパターン）
- [marked.js v12](https://github.com/markedjs/marked) — Markdown パーサー
- [highlight.js v11](https://highlightjs.org/) — コードシンタックスハイライト
- [Material Symbols](https://fonts.google.com/icons) — アイコンフォント
