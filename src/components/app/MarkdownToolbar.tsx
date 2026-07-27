'use client';

import type { RefObject } from 'react';
import { Bold, Italic, Strikethrough, Heading, List, ListOrdered } from 'lucide-react';

export interface TextSelection {
  start: number;
  end: number;
}

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  selection: TextSelection;
  onApply: (value: string, selection: TextSelection) => void;
}

interface ApplyResult {
  value: string;
  selection: TextSelection;
}

function wrapSelection(value: string, { start, end }: TextSelection, prefix: string, suffix: string): ApplyResult {
  const selected = value.slice(start, end);

  // Toggle off if the selection is already wrapped in this exact token
  const before = value.slice(Math.max(0, start - prefix.length), start);
  const after = value.slice(end, end + suffix.length);
  if (selected && before === prefix && after === suffix) {
    const newValue = value.slice(0, start - prefix.length) + selected + value.slice(end + suffix.length);
    return { value: newValue, selection: { start: start - prefix.length, end: end - prefix.length } };
  }

  const newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
  const newStart = start + prefix.length;
  return { value: newValue, selection: { start: newStart, end: newStart + selected.length } };
}

const HEADING_RE = /^#\s+/;
const BULLET_RE = /^[-*]\s+/;
const NUMBERED_RE = /^\d+\.\s+/;

function stripBlockPrefix(line: string): string {
  return line.replace(HEADING_RE, '').replace(BULLET_RE, '').replace(NUMBERED_RE, '');
}

function hasBlockPrefix(line: string, kind: 'heading' | 'bullet' | 'numbered'): boolean {
  if (kind === 'heading') return HEADING_RE.test(line);
  if (kind === 'bullet') return BULLET_RE.test(line);
  return NUMBERED_RE.test(line);
}

// Block-level formats (heading/bullet/numbered) are mutually exclusive per line —
// applying one always replaces any other the line already has, instead of stacking.
function toggleBlockFormat(value: string, { start, end }: TextSelection, kind: 'heading' | 'bullet' | 'numbered'): ApplyResult {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = value.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const contentLines = lines.filter(l => l !== '');
  const allAlready = contentLines.length > 0 && contentLines.every(l => hasBlockPrefix(l, kind));
  const prefix = kind === 'heading' ? '# ' : kind === 'bullet' ? '- ' : '1. ';

  const newLines = lines.map(l => {
    if (l === '') return l;
    const stripped = stripBlockPrefix(l);
    return allAlready ? stripped : prefix + stripped;
  });
  const newBlock = newLines.join('\n');
  const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  const newCursor = lineStart + newBlock.length;

  return { value: newValue, selection: { start: newCursor, end: newCursor } };
}

const BUTTONS: { icon: typeof Bold; label: string; run: (v: string, s: TextSelection) => ApplyResult }[] = [
  { icon: Bold, label: 'Bold', run: (v, s) => wrapSelection(v, s, '**', '**') },
  { icon: Italic, label: 'Italic', run: (v, s) => wrapSelection(v, s, '_', '_') },
  { icon: Strikethrough, label: 'Strikethrough', run: (v, s) => wrapSelection(v, s, '~~', '~~') },
  { icon: Heading, label: 'Heading', run: (v, s) => toggleBlockFormat(v, s, 'heading') },
  { icon: List, label: 'Bullet list', run: (v, s) => toggleBlockFormat(v, s, 'bullet') },
  { icon: ListOrdered, label: 'Numbered list', run: (v, s) => toggleBlockFormat(v, s, 'numbered') },
];

export function MarkdownToolbar({ textareaRef, value, selection, onApply }: MarkdownToolbarProps) {
  return (
    <div
      // Best-effort: avoids blurring the textarea on desktop mouse clicks. On touch
      // devices this can't be relied on, which is why selection is tracked in React
      // state (passed in as `selection`) instead of read live from the DOM here.
      onMouseDown={e => e.preventDefault()}
      className="flex items-center gap-1 px-2 py-2 bg-surface-2 border-t border-border overflow-x-auto"
    >
      {BUTTONS.map(({ icon: Icon, label, run }) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => {
            const result = run(value, selection);
            onApply(result.value, result.selection);
            requestAnimationFrame(() => {
              const textarea = textareaRef.current;
              if (!textarea) return;
              textarea.focus();
              textarea.setSelectionRange(result.selection.start, result.selection.end);
            });
          }}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors shrink-0"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
