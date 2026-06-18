'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, BookOpen } from 'lucide-react';

export default function SharedReflectionPage() {
  const params = useParams();
  const [content, setContent] = useState<string | null>(null);
  const [type, setType] = useState<'reflection' | 'pattern'>('reflection');
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const raw = decodeURIComponent(params.id as string);
      const decoded = JSON.parse(atob(raw));
      setContent(decoded.content);
      setType(decoded.type || 'reflection');
    } catch {
      setError(true);
    }
  }, [params.id]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-text-muted font-mono text-sm">This share link is invalid or expired.</p>
          <Link href="/app" className="text-accent text-sm underline">Open MicroMind</Link>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse font-mono text-accent text-xs uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary px-6 py-12 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-bg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">MicroMind</p>
            <h1 className="text-lg font-serif leading-tight">
              {type === 'pattern' ? 'Emotional Patterns' : 'Weekly Reflection'}
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-[2rem] border border-border bg-surface-2 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted mb-4">AI-generated insight</p>
          <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap font-mono">{content}</p>
        </div>

        {/* CTA */}
        <div className="rounded-[2rem] border border-accent/20 bg-accent/5 p-6 space-y-3">
          <p className="text-sm font-serif">Start your own private journal</p>
          <p className="text-xs font-mono text-text-muted leading-relaxed">
            MicroMind is a private journaling app on Celo. Write daily, track your moods, and get AI reflections — owned by you.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-accent text-bg text-xs font-mono uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Try MicroMind
          </Link>
        </div>

        <p className="text-[10px] font-mono text-text-muted/40 text-center">
          Private journaling · Built on Celo
        </p>
      </div>
    </div>
  );
}
