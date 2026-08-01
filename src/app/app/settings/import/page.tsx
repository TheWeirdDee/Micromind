'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, FileArchive, FileText, Loader2, Upload } from 'lucide-react';
import type { ImportFormat, ImportParseResult, ImportWorkerResponse } from '@/lib/import/types';

const ACCEPT = '.zip,.txt,.md,.markdown,.json,.csv,.html,.htm';
const MAX_FILE_BYTES = 500 * 1024 * 1024;

function detectFormat(file: File): ImportFormat | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'zip') return 'zip';
  if (extension === 'md' || extension === 'markdown') return 'markdown';
  if (extension === 'htm' || extension === 'html') return 'html';
  if (extension === 'txt' || extension === 'json' || extension === 'csv') return extension;
  return null;
}

export default function ImportJournalPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportParseResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const chosen = useMemo(() => result?.entries.filter((entry) => selected.has(entry.sourceId)) ?? [], [result, selected]);

  const parse = (nextFile: File) => {
    const format = detectFormat(nextFile);
    setError(null); setSummary(null); setResult(null); setSelected(new Set()); setProgress(0);
    if (!format) { setError('Choose a ZIP, TXT, Markdown, JSON, CSV, or HTML file.'); return; }
    if (nextFile.size > MAX_FILE_BYTES) { setError('This file is over 500 MB. Split the archive before importing it.'); return; }
    if (format !== 'zip' && nextFile.size > 12 * 1024 * 1024) { setError('Text-based imports must be 12 MB or smaller. Split this file into smaller exports.'); return; }
    setFile(nextFile); setStatus('parsing');
    workerRef.current?.terminate();
    const worker = new Worker(new URL('../../../../workers/journalImport.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<ImportWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'progress') setProgress(message.total ? Math.min(99, Math.round(message.completed / message.total * 100)) : 0);
      if (message.type === 'parsed') {
        setResult(message.result);
        setSelected(new Set(message.result.entries.map((entry) => entry.sourceId)));
        setProgress(100); setStatus('ready'); worker.terminate(); workerRef.current = null;
      }
      if (message.type === 'error') { setError(message.message); setStatus('idle'); worker.terminate(); workerRef.current = null; }
    };
    worker.onerror = () => { setError('The file could not be parsed. It may be damaged or use an unsupported export layout.'); setStatus('idle'); worker.terminate(); workerRef.current = null; };
    worker.postMessage({ type: 'parse', file: nextFile, format });
  };

  const importSelected = async () => {
    if (!chosen.length) return;
    setStatus('importing'); setError(null);
    try {
      const { importJournalEntries } = await import('@/lib/journal');
      const imported = importJournalEntries(chosen.map((entry) => ({ sourceId: entry.sourceId, title: entry.title, content: entry.content, timestamp: entry.timestamp, folder: entry.folder, tags: entry.tags, mood: entry.mood })));
      setSummary(`${imported.imported.length} ${imported.imported.length === 1 ? 'entry' : 'entries'} imported locally${imported.skippedDuplicates ? `; ${imported.skippedDuplicates} duplicate${imported.skippedDuplicates === 1 ? '' : 's'} skipped` : ''}.`);
      setStatus('done');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The entries could not be imported.'); setStatus('ready');
    }
  };

  const toggle = (sourceId: string) => setSelected((current) => { const next = new Set(current); if (next.has(sourceId)) next.delete(sourceId); else next.add(sourceId); return next; });
  const reset = () => { setFile(null); setResult(null); setSelected(new Set()); setStatus('idle'); setError(null); setSummary(null); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <Link href="/app/settings" className="p-2 rounded-full hover:bg-surface-2 text-text-muted" aria-label="Back to settings"><ArrowLeft className="w-5 h-5" /></Link>
        <div><p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">Settings</p><h1 className="text-2xl font-serif">Import a journal</h1></div>
      </header>

      <section className="bg-surface border border-border rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="space-y-2">
          <h2 className="font-serif text-lg">Bring your previous writing with you</h2>
          <p className="text-xs font-mono text-text-muted leading-relaxed">Supports Apple Journal ZIP, generic ZIP, TXT, Markdown, JSON, CSV, and HTML. Parsing happens on this device in a background worker.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={status === 'parsing' || status === 'importing'} className="w-full min-h-36 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-accent/50 hover:bg-accent/5 transition disabled:opacity-50">
          {status === 'parsing' ? <Loader2 className="w-7 h-7 text-accent animate-spin" /> : file?.name.endsWith('.zip') ? <FileArchive className="w-7 h-7 text-accent" /> : <Upload className="w-7 h-7 text-accent" />}
          <div className="text-center"><p className="text-sm font-mono text-text-primary">{file?.name || 'Choose an export file'}</p><p className="text-[10px] font-mono text-text-muted mt-1">Maximum 500 MB</p></div>
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(event) => { const next = event.target.files?.[0]; if (next) parse(next); }} />
        {status === 'parsing' && <div className="space-y-2"><div className="h-1.5 bg-bg rounded-full overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div><p className="text-[10px] font-mono text-text-muted">Reading and interpreting entries… {progress}%</p></div>}
        {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-mono text-red-400">{error}</div>}
      </section>

      {result && status !== 'done' && (
        <section className="bg-surface border border-border rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between gap-4">
            <div><h2 className="font-serif text-lg">Preview</h2><p className="text-[10px] font-mono text-text-muted">{result.entries.length} entries found · {result.attachmentCount} linked images detected</p></div>
            <button onClick={() => setSelected(selected.size === result.entries.length ? new Set() : new Set(result.entries.map((entry) => entry.sourceId)))} className="text-[10px] font-mono text-accent">{selected.size === result.entries.length ? 'Clear all' : 'Select all'}</button>
          </div>
          {result.warnings.map((warning) => <p key={warning} className="mx-5 mt-4 text-[10px] font-mono text-accent-gold">{warning}</p>)}
          {result.attachmentCount > 0 && <p className="mx-5 mt-4 text-[10px] font-mono text-text-muted leading-relaxed">This first lightweight release imports text, dates, folders, tags, and moods. Linked media is detected but is not uploaded automatically, protecting private archives from silent cloud transfer.</p>}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
            {result.entries.slice(0, 1000).map((entry) => (
              <label key={entry.sourceId} className="flex gap-3 p-4 cursor-pointer hover:bg-surface-2/50" style={{ contentVisibility: 'auto', containIntrinsicSize: '78px' }}>
                <input type="checkbox" checked={selected.has(entry.sourceId)} onChange={() => toggle(entry.sourceId)} className="mt-1 accent-current" />
                <div className="min-w-0"><p className="text-sm font-medium truncate">{entry.title || entry.content.split('\n')[0] || 'Untitled entry'}</p><p className="text-[10px] font-mono text-text-muted mt-1">{new Date(entry.timestamp).toLocaleDateString()} {entry.folder ? `· ${entry.folder}` : ''}</p><p className="text-xs text-text-muted line-clamp-2 mt-1">{entry.content}</p></div>
              </label>
            ))}
          </div>
          <div className="p-5 border-t border-border space-y-3">
            <div className="flex items-start gap-2 text-[10px] font-mono text-text-muted"><Check className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" /><span>Imports are merged locally and duplicates are skipped. Choosing a file does not upload it.</span></div>
            <button onClick={importSelected} disabled={!chosen.length || status === 'importing'} className="w-full rounded-xl bg-accent text-bg py-3 text-xs font-mono font-bold disabled:opacity-40">{status === 'importing' ? 'Importing…' : `Import ${chosen.length} ${chosen.length === 1 ? 'entry' : 'entries'}`}</button>
          </div>
        </section>
      )}

      {status === 'done' && <section className="bg-surface border border-accent/30 rounded-3xl p-7 text-center space-y-4"><Check className="w-8 h-8 text-accent mx-auto" /><h2 className="font-serif text-xl">Import complete</h2><p className="text-xs font-mono text-text-muted">{summary}</p><div className="flex gap-3"><button onClick={reset} className="flex-1 border border-border rounded-xl py-3 text-xs font-mono">Import another</button><button onClick={() => router.push('/app/journal')} className="flex-1 bg-accent text-bg rounded-xl py-3 text-xs font-mono font-bold">Open journal</button></div></section>}

      <section className="rounded-2xl border border-border/60 p-4 flex gap-3"><FileText className="w-4 h-4 text-text-muted shrink-0 mt-0.5" /><div className="text-[10px] font-mono text-text-muted leading-relaxed"><p className="text-text-primary mb-1">Format notes</p><p>JSON accepts MicroMind backups and common entry arrays. CSV detects content, title, date, folder, and journal columns. ZIP scans supported text formats without unpacking unrelated files.</p></div></section>
    </div>
  );
}