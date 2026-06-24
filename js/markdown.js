/**
 * NoteJ Markdown 渲染模块
 * 基于 marked.js v12 + highlight.js
 */

const Markdown = (() => {
    /** marked 实例 */
    let markedInstance = null;

    /**
     * HTML 转义（用于文本内容）
     */
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return String(text).replace(/[&<>"']/g, ch => map[ch]);
    }

    /**
     * 构建自定义渲染器扩展
     */
    function createRendererExtension() {
        return {
            renderer: {
                // 代码块 — highlight.js 高亮
                code(code) {
                    const text = code.text || '';
                    const lang = code.lang || '';
                    if (lang && typeof hljs !== 'undefined') {
                        try {
                            const validLang = hljs.getLanguage(lang) ? lang : 'plaintext';
                            const highlighted = hljs.highlight(text, { language: validLang }).value;
                            return `<pre><code class="hljs language-${escapeHtml(validLang)}">${highlighted}</code></pre>\n`;
                        } catch (e) {
                            // 高亮失败时回退
                        }
                    }
                    return `<pre><code>${escapeHtml(text)}</code></pre>\n`;
                },
                // 链接、图片、表格 — 使用 marked 默认渲染器，在 postProcess 中增强
            },
        };
    }

    /**
     * 后处理 HTML：为外部链接添加 target，为图片添加 lazy loading，包装表格
     */
    function postProcess(html) {
        // 包装表格
        html = html.replace(/<table>/g, '<div class="table-wrapper"><table>');
        html = html.replace(/<\/table>/g, '</table></div>');

        // 外部链接添加 target="_blank"
        html = html.replace(/<a href="(https?:\/\/[^"]*)"/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer"');

        // 图片添加 lazy loading
        html = html.replace(/<img src="/g, '<img loading="lazy" src="');

        return html;
    }

    /**
     * 配置并创建 marked 实例
     */
    function init() {
        if (markedInstance) return;
        if (typeof marked === 'undefined') {
            console.warn('marked.js 未加载，Markdown 渲染将不可用');
            return;
        }

        try {
            // marked v12: 使用 new marked.Marked() 创建实例
            if (typeof marked.Marked === 'function') {
                const ext = createRendererExtension();
                markedInstance = new marked.Marked({
                    gfm: true,
                    breaks: true,
                    pedantic: false,
                });
                markedInstance.use({ renderer: ext.renderer });
            } else {
                // 降级 — 旧版 marked
                marked.setOptions({
                    gfm: true,
                    breaks: true,
                });
                markedInstance = marked;
            }
        } catch (e) {
            console.warn('marked 初始化失败，使用基础模式:', e);
            markedInstance = marked;
        }
    }

    /**
     * 渲染 Markdown 为 HTML
     * @param {string} markdown - Markdown 源文本
     * @returns {string} HTML 字符串
     */
    function render(markdown) {
        if (!markedInstance) init();
        if (!markedInstance || typeof markedInstance.parse !== 'function') {
            return '<p class="preview-error">' + I18n.t('markdown.notLoaded') + '</p>';
        }
        if (!markdown || markdown.trim() === '') {
            return '<p class="preview-empty">' + I18n.t('markdown.emptyPreview') + '</p>';
        }
        try {
            let html = markedInstance.parse(markdown);
            html = typeof html === 'string' ? html : String(html);
            return postProcess(html);
        } catch (e) {
            console.error('Markdown 渲染错误:', e);
            return `<p class="preview-error">${I18n.t('markdown.renderError')}${escapeHtml(e.message || I18n.t('markdown.unknownError'))}</p>`;
        }
    }

    /**
     * 渲染纯文本（用于搜索高亮等）
     */
    function stripMarkdown(markdown) {
        if (!markdown) return '';
        return markdown
            .replace(/#{1,6}\s/g, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/~~([^~]+)~~/g, '$1')
            .replace(/`{1,3}[^`]*`{1,3}/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
            .replace(/^[>\s]*/gm, '')
            .replace(/[-*+]\s/g, '')
            .replace(/\|/g, ' ')
            .trim();
    }

    /**
     * 获取文本统计信息
     */
    function getStats(markdown) {
        const text = markdown || '';
        const chars = text.length;
        const charsNoSpace = text.replace(/\s/g, '').length;
        const lines = text.split('\n').length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        return { chars, charsNoSpace, lines, words };
    }

    // 公开 API
    return {
        init,
        render,
        stripMarkdown,
        getStats,
    };
})();
