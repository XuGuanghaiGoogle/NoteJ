/**
 * NoteJ 编辑器模块
 * 管理编辑区 textarea、预览区、分割线拖拽、防抖保存
 */

const Editor = (() => {
    /** 当前笔记 ID */
    let currentNoteId = null;
    /** 防抖定时器 */
    let saveTimer = null;
    /** 分割线拖拽状态 */
    let isDragging = false;
    /** 防抖延迟 (ms) */
    const SAVE_DELAY = 500;
    /** 预览区元素引用 */
    let previewEl = null;
    /** 源码视图元素引用 */
    let previewSourceEl = null;
    let previewSourceCodeEl = null;
    /** 编辑器元素引用 */
    let editorEl = null;
    /** 预览模式: 'html' | 'source' */
    let previewMode = 'html';

    /**
     * 初始化编辑器
     */
    function init() {
        editorEl = document.getElementById('editor');
        previewEl = document.getElementById('preview');
        previewSourceEl = document.getElementById('previewSource');
        previewSourceCodeEl = document.getElementById('previewSourceCode');
        const splitter = document.getElementById('splitter');
        const editorContainer = document.getElementById('editorContainer');

        if (!editorEl || !previewEl) return;

        // 预览模式切换按钮
        document.querySelectorAll('.preview-pane__tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.previewMode;
                if (mode) setPreviewMode(mode);
            });
        });

        // 监听内容变更
        editorEl.addEventListener('input', () => {
            updatePreview();
            scheduleSave();
        });

        // Tab 键插入/减少缩进（保留撤销历史）
        editorEl.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = editorEl.selectionStart;
                const end = editorEl.selectionEnd;
                const val = editorEl.value;

                if (e.shiftKey) {
                    // Shift+Tab: 减少缩进（支持多行，保留撤销历史）
                    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
                    let lineEnd = val.indexOf('\n', end);
                    if (lineEnd === -1) lineEnd = val.length;

                    const lines = val.substring(lineStart, lineEnd).split('\n');
                    let removedBeforeCursor = 0;
                    let charPos = 0;
                    const cursorOffset = start - lineStart;

                    const newLines = lines.map(line => {
                        const lineLen = line.length;
                        let newLine = line;
                        if (line.startsWith('    ')) {
                            if (charPos + 4 <= cursorOffset) {
                                removedBeforeCursor += 4;
                            } else if (charPos < cursorOffset) {
                                removedBeforeCursor += cursorOffset - charPos;
                            }
                            newLine = line.substring(4);
                        } else if (line.startsWith('\t')) {
                            if (charPos + 1 <= cursorOffset) {
                                removedBeforeCursor += 1;
                            } else if (charPos < cursorOffset) {
                                removedBeforeCursor += cursorOffset - charPos;
                            }
                            newLine = line.substring(1);
                        }
                        charPos += lineLen + 1;
                        return newLine;
                    });

                    const replacement = newLines.join('\n');
                    replaceRange(replacement, lineStart, lineEnd);
                    editorEl.selectionStart = editorEl.selectionEnd = Math.max(lineStart, start - removedBeforeCursor);
                } else {
                    // Tab: 插入缩进（保留撤销历史）
                    replaceRange('    ', start, end);
                    editorEl.selectionStart = editorEl.selectionEnd = start + 4;
                }
                editorEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        // 分割线拖拽
        if (splitter) {
            splitter.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDragging = true;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
            });
        }

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !editorContainer) return;
            const rect = editorContainer.getBoundingClientRect();
            const ratio = ((e.clientX - rect.left) / rect.width) * 100;
            const clampedRatio = Math.max(20, Math.min(80, ratio));
            editorContainer.style.setProperty('--split-ratio', clampedRatio + '%');
            Storage.saveSettings({ splitRatio: Math.round(clampedRatio) });
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });

        // 恢复分隔比例
        const settings = Storage.loadSettings();
        if (editorContainer && settings.splitRatio) {
            editorContainer.style.setProperty('--split-ratio', settings.splitRatio + '%');
        }
    }

    /**
     * 加载笔记内容到编辑器
     * @param {string} noteId
     * @param {object} note - 笔记对象 { id, title, content }
     */
    function loadNote(noteId, note) {
        if (!editorEl) return;

        // 保存当前笔记
        if (currentNoteId && currentNoteId !== noteId) {
            saveNow();
        }

        currentNoteId = noteId;

        // 更新编辑器内容
        editorEl.value = note?.content || '';
        editorEl.focus();
        editorEl.setSelectionRange(0, 0);

        updatePreview();
        updateStats();
    }

    /**
     * 更新预览区
     */
    function updatePreview() {
        if (!editorEl) return;
        const content = editorEl.value;

        if (previewMode === 'source') {
            // 源码模式：显示原始 Markdown
            if (previewSourceCodeEl) {
                previewSourceCodeEl.textContent = content;
            }
        } else {
            // 渲染模式：显示 HTML
            if (previewEl) {
                previewEl.innerHTML = Markdown.render(content);
            }
        }
    }

    /**
     * 设置预览模式
     * @param {'html'|'source'} mode
     */
    function setPreviewMode(mode) {
        previewMode = mode;

        // 更新按钮状态
        document.querySelectorAll('.preview-pane__tab').forEach(btn => {
            btn.classList.toggle('preview-pane__tab--active', btn.dataset.previewMode === mode);
        });

        // 切换显示
        if (previewEl) previewEl.style.display = mode === 'html' ? '' : 'none';
        if (previewSourceEl) previewSourceEl.style.display = mode === 'source' ? '' : 'none';

        // 更新标签
        const label = document.querySelector('.preview-pane__label');
        if (label) label.textContent = I18n.t(mode === 'html' ? 'editor.previewLabel' : 'editor.sourceTab');

        updatePreview();
    }

    /**
     * 获取当前预览模式
     */
    function getPreviewMode() {
        return previewMode;
    }

    /**
     * 调度自动保存（防抖）
     */
    function scheduleSave() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveNow();
            updateStats();
        }, SAVE_DELAY);
    }

    /**
     * 立即保存
     */
    function saveNow() {
        if (!currentNoteId || !editorEl) return;

        const content = editorEl.value;
        // 只保存内容，不更新标题（标题由 Tabs.startRename 单独管理）
        Storage.updateNote(currentNoteId, { content });
        updateStatusBar(I18n.t('status.saved', { time: new Date().toLocaleTimeString(I18n.getLocale()) }));
    }

    /**
     * 获取当前编辑内容
     */
    function getContent() {
        return editorEl ? editorEl.value : '';
    }

    /**
     * 设置编辑器内容
     */
    function setContent(content) {
        if (editorEl) {
            editorEl.value = content;
            updatePreview();
            scheduleSave();
        }
    }

    /**
     * 插入文本到光标位置
     */
    function insertAtCursor(text) {
        if (!editorEl) return;
        const start = editorEl.selectionStart;
        const end = editorEl.selectionEnd;
        replaceRange(text, start, end);
        editorEl.selectionStart = editorEl.selectionEnd = start + text.length;
        editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * 更新统计信息
     */
    function updateStats() {
        if (!editorEl) return;
        const stats = Markdown.getStats(editorEl.value);
        const statsEl = document.getElementById('statusStats');
        if (statsEl) {
            statsEl.textContent = I18n.t('status.charsWordsLines', { chars: stats.chars, words: stats.words, lines: stats.lines });
        }
    }

    /**
     * 更新状态栏
     */
    function updateStatusBar(msg) {
        const el = document.getElementById('statusText');
        if (el) {
            el.textContent = msg;
            setTimeout(() => {
                if (el.textContent === msg) {
                    el.textContent = I18n.t('status.ready');
                }
            }, 3000);
        }
    }

    /**
     * 切换移动端视图（编辑/预览）
     */
    function toggleMobileView(view) {
        const editorPane = document.getElementById('editorPane');
        const previewPane = document.getElementById('previewPane');
        if (!editorPane || !previewPane) return;

        const btns = document.querySelectorAll('.view-toggle__btn');
        btns.forEach(b => b.classList.remove('view-toggle__btn--active'));

        if (view === 'edit') {
            editorPane.style.display = 'block';
            previewPane.style.display = 'none';
            btns[0]?.classList.add('view-toggle__btn--active');
            editorEl?.focus();
        } else {
            editorPane.style.display = 'none';
            previewPane.style.display = 'block';
            btns[1]?.classList.add('view-toggle__btn--active');
            updatePreview();
        }
    }

    // ============================================================
    //  格式化工具栏
    // ============================================================

    /**
     * 初始化工具栏
     */
    function initToolbar() {
        const toolbar = document.getElementById('toolbar');
        if (!toolbar) return;

        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.toolbar__btn');
            if (!btn) return;
            const action = btn.dataset.action;
            if (action) applyFormat(action);
        });
    }

    /**
     * 获取选中文本及其范围信息
     */
    function getSelection() {
        if (!editorEl) return null;
        const start = editorEl.selectionStart;
        const end = editorEl.selectionEnd;
        const text = editorEl.value.substring(start, end);
        const before = editorEl.value.substring(0, start);
        const after = editorEl.value.substring(end);

        // 获取选中文本的起始行
        const lineStart = before.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = after.indexOf('\n');
        const line = editorEl.value.substring(
            lineStart,
            lineEnd === -1 ? editorEl.value.length : end + lineEnd
        );

        return { start, end, text, before, after, lineStart, line };
    }

    /**
     * 替换选中文本（保留撤销历史）
     * 使用 execCommand('insertText') 确保所有浏览器 Ctrl+Z 可用
     * @param {string} replacement - 替换文本
     * @param {number} rangeStart - 替换起始位置
     * @param {number} rangeEnd - 替换结束位置
     */
    function replaceRange(replacement, rangeStart, rangeEnd) {
        if (!editorEl) return;
        editorEl.focus();
        // 选中待替换区域
        editorEl.setSelectionRange(rangeStart, rangeEnd);
        // execCommand('insertText') 会在所有浏览器中创建撤销点
        const ok = document.execCommand('insertText', false, replacement);
        if (!ok) {
            // 降级方案
            editorEl.setRangeText(replacement, rangeStart, rangeEnd, 'end');
        }
    }

    /**
     * 应用格式到编辑器
     * @param {string} replacement - 替换文本
     * @param {number} cursorOffset - 替换后光标相对于替换文本开头的偏移
     */
    function applyReplacement(replacement, cursorOffset) {
        if (!editorEl) return;
        const sel = getSelection();
        if (!sel) return;
        replaceRange(replacement, sel.start, sel.end);
        const newCursor = sel.start + cursorOffset;
        editorEl.selectionStart = editorEl.selectionEnd = newCursor;
        editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * 包裹选中文本
     * @param {string} before - 左包裹符
     * @param {string} after - 右包裹符
     * @param {string} placeholder - 无选中时的占位文字
     */
    function wrapSelection(before, after, placeholder) {
        const sel = getSelection();
        if (!sel) return;
        const content = sel.text || placeholder;
        const replacement = before + content + after;
        applyReplacement(replacement, before.length + content.length + after.length);
    }

    /**
     * 对每行添加前缀（保留撤销历史）
     * @param {string} prefix - 行前缀
     */
    function prefixLines(prefix) {
        if (!editorEl) return;
        const start = editorEl.selectionStart;
        const end = editorEl.selectionEnd;
        const val = editorEl.value;

        // 扩展选区到完整行边界
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;
        if (val.charAt(lineEnd - 1) === '\n' && start !== end) lineEnd--;

        const selectedLines = val.substring(lineStart, lineEnd);

        let replacement;
        if (!selectedLines) {
            const lf = val.indexOf('\n', lineStart);
            const lineLen = lf === -1 ? val.length - lineStart : lf - lineStart;
            replacement = prefix + val.substring(lineStart, lineStart + lineLen);
        } else {
            const lines = selectedLines.split('\n');
            replacement = lines.map(l => prefix + l).join('\n');
        }

        replaceRange(replacement, lineStart, lineEnd);
        editorEl.selectionStart = lineStart;
        editorEl.selectionEnd = lineStart + replacement.length;
        editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * 对每行添加序号前缀（自动递增，保留撤销历史）
     * @param {number} startNum - 起始编号
     */
    function orderedPrefixLines(startNum = 1) {
        if (!editorEl) return;
        const start = editorEl.selectionStart;
        const end = editorEl.selectionEnd;
        const val = editorEl.value;

        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;
        if (val.charAt(lineEnd - 1) === '\n' && start !== end) lineEnd--;

        const selectedLines = val.substring(lineStart, lineEnd);

        let replacement;
        if (!selectedLines) {
            const lf = val.indexOf('\n', lineStart);
            const lineLen = lf === -1 ? val.length - lineStart : lf - lineStart;
            replacement = startNum + '. ' + val.substring(lineStart, lineStart + lineLen);
        } else {
            const lines = selectedLines.split('\n');
            replacement = lines.map((l, i) => (startNum + i) + '. ' + l).join('\n');
        }

        replaceRange(replacement, lineStart, lineEnd);
        editorEl.selectionStart = lineStart;
        editorEl.selectionEnd = lineStart + replacement.length;
        editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * 格式化动作分发
     */
    function applyFormat(action) {
        if (!editorEl) return;

        switch (action) {
            // 粗体
            case 'bold':
                wrapSelection('**', '**', I18n.t('editor.formatBold'));
                break;

            // 斜体
            case 'italic':
                wrapSelection('*', '*', I18n.t('editor.formatItalic'));
                break;

            // 删除线
            case 'strikethrough':
                wrapSelection('~~', '~~', I18n.t('editor.formatStrikethrough'));
                break;

            // 行内代码
            case 'code':
                wrapSelection('`', '`', I18n.t('editor.formatCode'));
                break;

            // 标题
            case 'h1':
                prefixLines('# ');
                break;
            case 'h2':
                prefixLines('## ');
                break;
            case 'h3':
                prefixLines('### ');
                break;

            // 无序列表
            case 'ul':
                prefixLines('- ');
                break;

            // 有序列表（自动递增编号）
            case 'ol':
                orderedPrefixLines(1);
                break;

            // 任务列表
            case 'task':
                prefixLines('- [ ] ');
                break;

            // 引用
            case 'quote':
                prefixLines('> ');
                break;

            // 水平线
            case 'hr':
                insertAtCursor('\n---\n');
                break;

            // 链接
            case 'link':
                wrapSelection('[', '](url)', I18n.t('editor.formatLinkText'));
                break;

            // 图片
            case 'image':
                wrapSelection('![', '](url)', I18n.t('editor.formatImageDesc'));
                break;

            // 表格模板
            case 'table':
                insertAtCursor(I18n.t('editor.tableTemplate'));
                break;

            // 插入日期
            case 'date':
                insertAtCursor(new Date().toLocaleDateString(I18n.getLocale()));
                break;

            // 插入日期时间
            case 'datetime':
                insertAtCursor(new Date().toLocaleString(I18n.getLocale()));
                break;
        }
    }

    /**
     * 获取渲染后的 HTML（用于复制/导出）
     */
    function getRenderedHtml() {
        if (!editorEl) return '';
        const content = editorEl.value;
        const tab = Tabs.getActive();
        const title = tab ? tab.title : 'NoteJ';
        return `<!DOCTYPE html>
<html lang="${I18n.getLocale()}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body { font-family: -apple-system, 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; line-height: 1.7; color: #1d1b20; background: #fff; }
h1, h2 { border-bottom: 1px solid #e0e0e0; padding-bottom: .3em; }
h1 { font-size: 1.8em; } h2 { font-size: 1.5em; } h3 { font-size: 1.25em; }
pre { background: #f5f5f5; border-radius: 8px; padding: 16px; overflow-x: auto; }
code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace; font-size: 0.9em; }
pre code { padding: 0; background: none; }
blockquote { border-left: 4px solid #6750A4; padding: 8px 16px; background: #f7f2fa; margin: 1em 0; border-radius: 0 8px 8px 0; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; }
th { background: #f5f5f5; }
img { max-width: 100%; }
a { color: #6750A4; }
</style>
</head>
<body>
${Markdown.render(content)}
</body>
</html>`;
    }

    // 公开 API
    return {
        init,
        initToolbar,
        loadNote,
        saveNow,
        getContent,
        setContent,
        insertAtCursor,
        applyFormat,
        getRenderedHtml,
        setPreviewMode,
        getPreviewMode,
        updatePreview,
        updateStats,
        toggleMobileView,
    };
})();
