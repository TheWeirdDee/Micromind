'use client';

import type { RefObject } from 'react';
import { Bold, Italic, Strikethrough, Heading, List, ListOrdered } from 'lucide-react';

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  prefix: string,
  suffix: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    const newStart = start + prefix.length;
    textarea.setSelectionRange(newStart, newStart + selected.length);
  });
}

function toggleLinePrefix(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  linePrefix: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = value.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const alreadyPrefixed = lines.every(l => l.startsWith(linePrefix));
  const newLines = alreadyPrefixed
    ? lines.map(l => l.slice(linePrefix.length))
    : lines.map(l => linePrefix + l);
  const newBlock = newLines.join('\n');

  const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  onChange(newValue);

  const delta = newBlock.length - block.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(Math.max(lineStart, start + (alreadyPrefixed ? -linePrefix.length : linePrefix.length)), end + delta);
  });
}

const BUTTONS: { icon: typeof Bold; label: string; apply: (t: HTMLTextAreaElement, v: string, c: (v: string) => void) => void }[] = [
  { icon: Bold, label: 'Bold', apply: (t, v, c) => wrapSelection(t, v, c, '**', '**') },
  { icon: Italic, label: 'Italic', apply: (t, v, c) => wrapSelection(t, v, c, '_', '_') },
  { icon: Strikethrough, label: 'Strikethrough', apply: (t, v, c) => wrapSelection(t, v, c, '~~', '~~') },
  { icon: Heading, label: 'Heading', apply: (t, v, c) => toggleLinePrefix(t, v, c, '# ') },
  { icon: List, label: 'Bullet list', apply: (t, v, c) => toggleLinePrefix(t, v, c, '- ') },
  { icon: ListOrdered, label: 'Numbered list', apply: (t, v, c) => toggleLinePrefix(t, v, c, '1. ') },
];

export function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  return (
    <div
      // Prevent the textarea from losing focus (and this bar from unmounting) on tap
      onMouseDown={e => e.preventDefault()}
      className="flex items-center gap-1 px-2 py-2 bg-surface-2 border-t border-border overflow-x-auto"
    >
      {BUTTONS.map(({ icon: Icon, label, apply }) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            apply(textarea, value, onChange);
          }}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors shrink-0"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
