# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

NoteJ 是一个纯前端 Markdown 记事本应用，无需构建工具，浏览器直接打开 `index.html` 即可使用。

## 架构

5 个 JS 模块均采用 IIFE 模式挂载到全局命名空间，通过回调而非直接引用来解耦：

```
Storage → Tabs → Editor → App
              ↘ Markdown ↗
```

**加载顺序（严格依赖）**：`storage.js` → `markdown.js` → `tabs.js` → `editor.js` → `app.js`

### 模块职责

| 模块 | 全局名 | 职责 |
|------|--------|------|
| `storage.js` | `Storage` | localStorage 读写，笔记 CRUD，设置管理，导入导出 |
| `markdown.js` | `Markdown` | marked.js v12 封装，自定义代码高亮渲染器，HTML 后处理（链接/图片/表格增强） |
| `tabs.js` | `Tabs` | 标签页 DOM 渲染、切换、关闭、拖拽排序、重命名。通过 `init(onChange, onClose)` 回调与外部通信 |
| `editor.js` | `Editor` | Textarea 编辑、预览区管理、工具栏格式化、防抖保存、分割线拖拽 |
| `app.js` | `App` | 应用入口、全局快捷键、主题切换、全标签搜索、HTML 导出 |

### 关键数据流

1. **笔记加载**：`Tabs.switchTo()` → `onChange` 回调 → `Editor.loadNote(tabId, tab)`
2. **自动保存**：`Editor` 监听 `input` 事件 → 500ms 防抖 → `Storage.updateNote(id, { content })`（**不传 title**，标题由重命名单独管理）
3. **重命名**：`Tabs.startRename()` → `Storage.updateNote(id, { title })` → 用返回值 `Object.assign` 同步内存

### 撤销支持

所有文本修改必须通过 `Editor.replaceRange(text, start, end)` → `document.execCommand('insertText')`，直接赋值 `editorEl.value = ` 会清空浏览器撤销栈。`loadNote()` 和 `setContent()` 是仅有的例外（切换笔记天然需要重置撤销历史）。

## 外部依赖（CDN）

- **marked.js v12.0.2**：`new marked.Marked()` 实例模式，**不能**用废弃的 `marked.setOptions()`
- **highlight.js v11.9.0**：仅代码块渲染器中使用，默认渲染器处理链接/图片/表格，在 `postProcess()` 中正则增强
- **Material Symbols**：Google Fonts 图标字体

## 数据模型

```js
// localStorage key: 'notej_data'
{
  tabs: [{ id: 'note_xxx', title: '标题', content: 'Markdown 文本', createdAt, updatedAt }],
  activeTabId: 'note_xxx'
}
// localStorage key: 'notej_settings'
{ theme: 'auto'|'light'|'dark', fontSize, splitRatio, lastActiveTabId }
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建标签页 |
| `Ctrl+W` | 关闭当前标签页 |
| `Ctrl+S` | 手动保存 |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | 切换标签页 |
| `Ctrl+Shift+F` | 全局搜索 |
| `Ctrl+B/I/K/`\` | 粗体/斜体/链接/行内代码 |
| `Escape` | 关闭搜索面板 |
