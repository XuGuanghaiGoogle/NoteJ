/**
 * NoteJ ZIP / Markdown 交换格式。
 * ZIP 使用无压缩条目生成；导入同时支持无压缩和 deflate 压缩。
 */
const Archive = (() => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8');

    function crc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit++) {
                crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
            }
        }
        return (crc ^ 0xffffffff) >>> 0;
    }

    function dosDateTime(date = new Date()) {
        const year = Math.max(1980, date.getFullYear());
        return {
            time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
            date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
        };
    }

    function concat(parts) {
        const length = parts.reduce((sum, part) => sum + part.length, 0);
        const result = new Uint8Array(length);
        let offset = 0;
        parts.forEach(part => {
            result.set(part, offset);
            offset += part.length;
        });
        return result;
    }

    function writeHeader(size) {
        const bytes = new Uint8Array(size);
        return { bytes, view: new DataView(bytes.buffer) };
    }

    function createZip(files) {
        const localParts = [];
        const centralParts = [];
        let offset = 0;
        const stamp = dosDateTime();

        files.forEach(file => {
            const name = encoder.encode(file.name.replace(/\\/g, '/'));
            const content = file.data instanceof Uint8Array ? file.data : encoder.encode(file.data);
            const checksum = crc32(content);

            const local = writeHeader(30);
            local.view.setUint32(0, 0x04034b50, true);
            local.view.setUint16(4, 20, true);
            local.view.setUint16(6, 0x0800, true);
            local.view.setUint16(8, 0, true);
            local.view.setUint16(10, stamp.time, true);
            local.view.setUint16(12, stamp.date, true);
            local.view.setUint32(14, checksum, true);
            local.view.setUint32(18, content.length, true);
            local.view.setUint32(22, content.length, true);
            local.view.setUint16(26, name.length, true);
            local.view.setUint16(28, 0, true);
            localParts.push(local.bytes, name, content);

            const central = writeHeader(46);
            central.view.setUint32(0, 0x02014b50, true);
            central.view.setUint16(4, 20, true);
            central.view.setUint16(6, 20, true);
            central.view.setUint16(8, 0x0800, true);
            central.view.setUint16(10, 0, true);
            central.view.setUint16(12, stamp.time, true);
            central.view.setUint16(14, stamp.date, true);
            central.view.setUint32(16, checksum, true);
            central.view.setUint32(20, content.length, true);
            central.view.setUint32(24, content.length, true);
            central.view.setUint16(28, name.length, true);
            central.view.setUint16(30, 0, true);
            central.view.setUint16(32, 0, true);
            central.view.setUint16(34, 0, true);
            central.view.setUint16(36, 0, true);
            central.view.setUint32(38, 0, true);
            central.view.setUint32(42, offset, true);
            centralParts.push(central.bytes, name);

            offset += local.bytes.length + name.length + content.length;
        });

        const centralDirectory = concat(centralParts);
        const end = writeHeader(22);
        end.view.setUint32(0, 0x06054b50, true);
        end.view.setUint16(8, files.length, true);
        end.view.setUint16(10, files.length, true);
        end.view.setUint32(12, centralDirectory.length, true);
        end.view.setUint32(16, offset, true);
        return new Blob([...localParts, centralDirectory, end.bytes], { type: 'application/zip' });
    }

    function sanitizeFilename(title) {
        const cleaned = String(title || 'Untitled')
            .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
            .replace(/[. ]+$/g, '')
            .trim();
        return (cleaned || 'Untitled').slice(0, 120);
    }

    function createMarkdownZip(workspace) {
        const used = new Map();
        const manifest = {
            format: 'notej-markdown',
            formatVersion: 1,
            exportedAt: new Date().toISOString(),
            activeTabId: workspace.activeTabId,
            notes: [],
        };
        const files = [];

        workspace.tabs.forEach((note, index) => {
            const base = sanitizeFilename(note.title);
            const count = (used.get(base) || 0) + 1;
            used.set(base, count);
            const filename = `${base}${count > 1 ? `-${count}` : ''}.md`;
            const path = `notes/${filename}`;
            manifest.notes.push({
                id: note.id,
                title: note.title,
                file: path,
                order: index,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
            });
            files.push({ name: path, data: note.content });
        });

        files.unshift({ name: 'manifest.json', data: JSON.stringify(manifest, null, 2) });
        return createZip(files);
    }

    async function inflateRaw(bytes) {
        if (typeof DecompressionStream === 'undefined') {
            throw new Error('This browser cannot import compressed ZIP files');
        }
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function readZip(arrayBuffer) {
        const bytes = new Uint8Array(arrayBuffer);
        const view = new DataView(arrayBuffer);
        let endOffset = -1;
        for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
            if (view.getUint32(i, true) === 0x06054b50) {
                endOffset = i;
                break;
            }
        }
        if (endOffset < 0) throw new Error('Invalid ZIP file');

        const count = view.getUint16(endOffset + 10, true);
        let offset = view.getUint32(endOffset + 16, true);
        const files = new Map();

        for (let index = 0; index < count; index++) {
            if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid ZIP directory');
            const method = view.getUint16(offset + 10, true);
            const compressedSize = view.getUint32(offset + 20, true);
            const nameLength = view.getUint16(offset + 28, true);
            const extraLength = view.getUint16(offset + 30, true);
            const commentLength = view.getUint16(offset + 32, true);
            const localOffset = view.getUint32(offset + 42, true);
            const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));

            if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('Invalid ZIP entry');
            const localNameLength = view.getUint16(localOffset + 26, true);
            const localExtraLength = view.getUint16(localOffset + 28, true);
            const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
            const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
            const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
            if (!content) throw new Error(`Unsupported ZIP compression method: ${method}`);
            if (!name.endsWith('/')) files.set(name, content);

            offset += 46 + nameLength + extraLength + commentLength;
        }
        return files;
    }

    async function parseMarkdownZip(arrayBuffer) {
        const files = await readZip(arrayBuffer);
        const manifestBytes = files.get('manifest.json');
        if (!manifestBytes) throw new Error('manifest.json is missing');
        const manifest = JSON.parse(decoder.decode(manifestBytes));
        if (manifest.format !== 'notej-markdown' || !Array.isArray(manifest.notes)) {
            throw new Error('Unsupported NoteJ ZIP format');
        }

        const tabs = manifest.notes
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(item => {
                const content = files.get(item.file);
                if (!content) throw new Error(`Missing note file: ${item.file}`);
                return {
                    id: item.id,
                    title: item.title,
                    content: decoder.decode(content),
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                };
            });
        return { tabs, activeTabId: manifest.activeTabId };
    }

    function markdownFilesToWorkspace(files) {
        const tabs = files.map(file => ({
            id: Storage.generateId(),
            title: file.name.replace(/\.(md|markdown)$/i, ''),
            content: file.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));
        return { tabs, activeTabId: tabs[0]?.id || null };
    }

    return {
        createMarkdownZip,
        parseMarkdownZip,
        markdownFilesToWorkspace,
    };
})();
