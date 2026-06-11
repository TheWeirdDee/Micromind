'use client';

import { useEffect, useState } from 'react';
import { getEntries } from '@/lib/journal';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'i', 'my', 'we', 'you',
  'he', 'she', 'it', 'they', 'was', 'is', 'for', 'on', 'that', 'this', 'with',
  'have', 'had', 'as', 'at', 'be', 'your', 'me', 'my', 'myself', 'are', 'am',
  'so', 'so', 'just', 'like', 'about', 'very', 'up', 'out', 'all', 'any', 'if'
]);

type WordFreq = {
  text: string;
  count: number;
  color: string;
};

export function WordCloud() {
  const [words, setWords] = useState<WordFreq[]>([]);
  const [hasEntries, setHasEntries] = useState(false);

  useEffect(() => {
    const entries = getEntries();
    if (!entries.length) {
      setHasEntries(false);
      return;
    }
    setHasEntries(true);

    const freq: Record<string, number> = {};
    for (const e of entries) {
      // Clean and split words
      const tokens = e.content
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
        .split(/\s+/);

      for (const t of tokens) {
        const word = t.trim();
        if (word && word.length > 2 && !STOP_WORDS.has(word)) {
          freq[word] = (freq[word] || 0) + 1;
        }
      }
    }

    // Colors to rotate through
    const colors = [
      'text-accent',
      'text-accent-gold',
      'text-blue-400',
      'text-red-400',
      'text-emerald-400',
      'text-purple-400',
    ];

    const topWords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([text, count], index) => ({
        text,
        count,
        color: colors[index % colors.length]
      }));

    setWords(topWords);
  }, []);

  if (!hasEntries) {
    return (
      <div className="rounded-[2rem] border border-border bg-surface-2 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono mb-2">Word cloud</p>
        <p className="text-xs text-text-muted/60 text-center font-mono py-4">
          Write entries to see your word cloud
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-border bg-surface-2 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)] space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Word Cloud</p>
        <h3 className="text-lg font-serif mt-1">Frequently used words</h3>
      </div>

      {words.length === 0 ? (
        <p className="text-xs text-text-muted/60 text-center font-mono py-4">
          Write more content to generate cloud
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-3 gap-y-2 items-center justify-center p-2 rounded-2xl bg-bg/40 border border-border/40 min-h-[100px]">
          {words.map((w, i) => {
            // Font sizes from text-xs to text-xl based on rank/count
            const sizes = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-medium', 'text-xs'];
            const sizeClass = sizes[Math.min(i, sizes.length - 1)];

            return (
              <span
                key={w.text}
                className={`${sizeClass} ${w.color} transition-all duration-300 hover:scale-110 hover:opacity-90 cursor-default select-none`}
                title={`${w.count} occurrences`}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
