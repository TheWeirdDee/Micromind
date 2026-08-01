export type ImportFormat = 'txt' | 'markdown' | 'json' | 'csv' | 'html' | 'zip';

export interface ParsedImportEntry {
  sourceId: string;
  title?: string;
  content: string;
  timestamp: number;
  folder?: string;
  tags?: string[];
  mood?: string;
  attachmentPaths: string[];
}

export interface ImportParseResult {
  entries: ParsedImportEntry[];
  format: ImportFormat;
  sourceLabel: string;
  warnings: string[];
  attachmentCount: number;
}

export type ImportWorkerRequest =
  | { type: 'parse'; file: File; format: ImportFormat }
  | { type: 'extract'; file: File; paths: string[] };

export type ImportWorkerResponse =
  | { type: 'progress'; phase: 'reading' | 'parsing' | 'attachments'; completed: number; total?: number }
  | { type: 'parsed'; result: ImportParseResult }
  | { type: 'attachment'; path: string; blob: Blob }
  | { type: 'extracted'; missing: string[] }
  | { type: 'error'; message: string };