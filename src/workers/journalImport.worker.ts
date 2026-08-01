/// <reference lib="webworker" />
import type { ImportFormat, ImportParseResult, ImportWorkerRequest, ImportWorkerResponse, ParsedImportEntry } from '@/lib/import/types';

const MAX_TEXT_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_TEXT_BYTES = 25 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'html', 'htm']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);
const decoder = new TextDecoder();

function send(message: ImportWorkerResponse) { self.postMessage(message); }
function extension(name: string) { return name.split('.').pop()?.toLowerCase() || ''; }
function basename(path: string) { return path.replace(/\\/g, '/').split('/').pop() || path; }
function safeTimestamp(value: unknown, fallback = Date.now()): number {
  if (typeof value === 'number') return value > 1e12 ? value : value > 1e9 ? value * 1000 : fallback;
  if (typeof value === 'string') { const parsed = Date.parse(value); if (Number.isFinite(parsed)) return parsed; }
  return fallback;
}
function cleanText(value: unknown): string {
  if (typeof value === 'string') return value.replace(/\r\n/g, '\n').trim();
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return cleanText(object.text ?? object.content ?? object.body ?? object.value ?? '');
  }
  return '';
}
function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6]|article|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
}
function imageReferences(html: string): string[] {
  return [...html.matchAll(/<(?:img|source)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => decodeURIComponent(match[1].split(/[?#]/)[0]).replace(/^\.\//, ''))
    .filter((path) => IMAGE_EXTENSIONS.has(extension(path)));
}
function titleFromContent(content: string, fallback = ''): string {
  const first = content.split('\n').find((line) => line.trim())?.replace(/^#{1,6}\s*/, '').trim() || fallback;
  return first.slice(0, 120);
}
function entryFromObject(raw: Record<string, unknown>, index: number, source: string): ParsedImportEntry | null {
  const content = cleanText(raw.content ?? raw.text ?? raw.body ?? raw.note ?? raw.entryText ?? raw.richText ?? raw.plainText);
  if (!content) return null;
  const title = cleanText(raw.title ?? raw.heading ?? raw.subject) || titleFromContent(content);
  const timestamp = safeTimestamp(raw.timestamp ?? raw.creationDate ?? raw.createdAt ?? raw.created_at ?? raw.date ?? raw.modifiedDate, Date.now() - index);
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 20) : undefined;
  const attachments = [raw.image, raw.image_url, raw.photo, raw.attachment]
    .filter((item): item is string => typeof item === 'string' && IMAGE_EXTENSIONS.has(extension(item)));
  return { sourceId: `${source}:${String(raw.id ?? raw.uuid ?? index)}`, title, content, timestamp, folder: cleanText(raw.folder ?? raw.journalName) || undefined, tags, mood: cleanText(raw.mood) || undefined, attachmentPaths: attachments };
}
function parseJson(text: string, source: string): ParsedImportEntry[] {
  const value = JSON.parse(text) as unknown;
  let rows: unknown[] = []; const folderNames = new Map<string, string>();
  if (Array.isArray(value)) rows = value;
  else if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const candidate = object.entries ?? object.journalEntries ?? object.items ?? object.notes;
    rows = Array.isArray(candidate) ? candidate : [object];
    if (Array.isArray(object.folders)) for (const folder of object.folders) {
      if (folder && typeof folder === 'object') { const item = folder as Record<string, unknown>; if (typeof item.id === 'string' && typeof item.name === 'string') folderNames.set(item.id, item.name); }
    }
  }
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object') return null;
    const object = row as Record<string, unknown>; const entry = entryFromObject(object, index, source);
    if (entry && !entry.folder && typeof object.folderId === 'string') entry.folder = folderNames.get(object.folderId);
    return entry;
  }).filter((entry): entry is ParsedImportEntry => Boolean(entry));
}
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[index + 1] === '\n') index++; row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  row.push(cell); if (row.some(Boolean)) rows.push(row); return rows;
}function parseCsv(text: string, source: string): ParsedImportEntry[] {
  const rows = parseCsvRows(text); if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const find = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const contentIndex = find('content', 'text', 'body', 'note', 'entry');
  const titleIndex = find('title', 'heading', 'subject'); const dateIndex = find('date', 'created_at', 'createdat', 'timestamp'); const folderIndex = find('folder', 'journal');
  const entries: ParsedImportEntry[] = [];
  rows.slice(1).forEach((row, index) => {
    const content = (row[contentIndex >= 0 ? contentIndex : 0] || '').trim(); if (!content) return;
    entries.push({ sourceId: `${source}-${index}`, title: (titleIndex >= 0 ? row[titleIndex] : '') || titleFromContent(content), content, timestamp: safeTimestamp(dateIndex >= 0 ? row[dateIndex] : undefined, Date.now() - index), folder: folderIndex >= 0 ? row[folderIndex]?.trim() || undefined : undefined, attachmentPaths: [] });
  });
  return entries;
}
function parseHtml(text: string, source: string): ParsedImportEntry[] {
  const articles = [...text.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map((match) => match[1]);
  const blocks = articles.length ? articles : [text];
  const entries: ParsedImportEntry[] = [];
  blocks.forEach((block, index) => {
    const content = stripHtml(block); if (!content) return;
    const time = block.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1];
    const heading = block.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1];
    entries.push({ sourceId: `${source}-${index}`, title: heading ? stripHtml(heading) : titleFromContent(content, basename(source)), content, timestamp: safeTimestamp(time, safeTimestamp(source.match(/\d{4}-\d{2}-\d{2}/)?.[0])), attachmentPaths: imageReferences(block) });
  });
  return entries;
}
function parseTextFile(text: string, format: ImportFormat, source: string): ParsedImportEntry[] {
  if (format === 'json') return parseJson(text, source);
  if (format === 'csv') return parseCsv(text, source);
  if (format === 'html') return parseHtml(text, source);
  const content = text.trim(); if (!content) return [];
  return [{ sourceId: source, title: titleFromContent(content, basename(source).replace(/\.[^.]+$/, '')), content, timestamp: safeTimestamp(source.match(/\d{4}-\d{2}-\d{2}/)?.[0]), attachmentPaths: [] }];
}
function formatForName(name: string): ImportFormat | null {
  const ext = extension(name); if (ext === 'md' || ext === 'markdown') return 'markdown'; if (ext === 'htm' || ext === 'html') return 'html';
  return TEXT_EXTENSIONS.has(ext) ? ext as ImportFormat : null;
}
async function streamZip(file: File, onFile: (name: string, bytes: Uint8Array) => void | Promise<void>, wanted?: Set<string>) {
  const { Unzip, UnzipInflate } = await import('fflate');
  let active = 0; let ended = false; let resolveDone!: () => void; let rejectDone!: (error: Error) => void;
  const done = new Promise<void>((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  const finish = () => { if (ended && active === 0) resolveDone(); };
  const unzip = new Unzip((entry) => {
    const normalized = entry.name.replace(/\\/g, '/');
    const shouldRead = wanted ? wanted.has(normalized) || wanted.has(basename(normalized)) : Boolean(formatForName(normalized));
    if (!shouldRead || (entry.size ?? 0) > MAX_TEXT_FILE_BYTES && !wanted) return;
    active++; const chunks: Uint8Array[] = []; let length = 0;
    entry.ondata = (error, chunk, final) => {
      if (error) { rejectDone(error); return; }
      chunks.push(chunk); length += chunk.length;
      if (final) {
        const bytes = new Uint8Array(length); let offset = 0; for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
        Promise.resolve(onFile(normalized, bytes)).then(() => { active--; finish(); }, rejectDone);
      }
    };
    entry.start();
  });
  unzip.register(UnzipInflate);
  const reader = file.stream().getReader(); let completed = 0;
  while (true) { const { value, done: streamEnded } = await reader.read(); if (streamEnded) break; completed += value.byteLength; unzip.push(value, false); send({ type: 'progress', phase: wanted ? 'attachments' : 'reading', completed, total: file.size }); }
  unzip.push(new Uint8Array(), true); ended = true; finish(); await done;
}
async function parseFile(file: File, format: ImportFormat) {
  if (format !== 'zip') {
    const text = await file.text();
    return { entries: parseTextFile(text, format, file.name), warnings: [], attachmentCount: 0 };
  }
  const entries: ParsedImportEntry[] = []; const warnings: string[] = []; const media = new Set<string>(); let textFiles = 0; let textBytes = 0;
  await streamZip(file, (name, bytes) => {
    const nestedFormat = formatForName(name); if (!nestedFormat || /^index\.html?$/i.test(basename(name))) return;
    if (textBytes + bytes.byteLength > MAX_TOTAL_TEXT_BYTES) { if (!warnings.includes('The archive contains more than 25 MB of text. Extra files were skipped.')) warnings.push('The archive contains more than 25 MB of text. Extra files were skipped.'); return; }
    textBytes += bytes.byteLength; textFiles++;
    try { const parsed = parseTextFile(decoder.decode(bytes), nestedFormat, name); for (const entry of parsed) { entry.attachmentPaths.forEach((path) => media.add(path)); entries.push(entry); } }
    catch { warnings.push(`Skipped unreadable file: ${name}`); }
  });
  if (!textFiles) warnings.push('No supported text, JSON, CSV, or HTML entries were found in this ZIP.');
  return { entries, warnings, attachmentCount: media.size };
}
self.onmessage = async (event: MessageEvent<ImportWorkerRequest>) => {
  try {
    if (event.data.type === 'parse') {
      const parsed = await parseFile(event.data.file, event.data.format);
      const result: ImportParseResult = { ...parsed, format: event.data.format, sourceLabel: event.data.file.name };
      send({ type: 'parsed', result });
    } else {
      const wanted = new Set(event.data.paths.map((path) => path.replace(/\\/g, '/'))); const found = new Set<string>();
      await streamZip(event.data.file, (path, bytes) => { found.add(path); send({ type: 'attachment', path, blob: new Blob([bytes.slice().buffer as ArrayBuffer], { type: `image/${extension(path) === 'jpg' ? 'jpeg' : extension(path)}` }) }); }, wanted);
      send({ type: 'extracted', missing: [...wanted].filter((path) => !found.has(path) && ![...found].some((item) => basename(item) === basename(path))) });
    }
  } catch (error) { send({ type: 'error', message: error instanceof Error ? error.message : 'Import failed.' }); }
};

export {};