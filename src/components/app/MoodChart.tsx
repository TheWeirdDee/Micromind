'use client';

import { useEffect, useState } from 'react';
import { Smile, Laugh, Meh, Angry, Frown } from 'lucide-react';
import { getEntries } from '@/lib/journal';

const MOOD_CONFIG = [
  { mood: 'happy',   icon: Smile,  label: 'Happy',   color: 'bg-accent',       text: 'text-accent'       },
  { mood: 'excited', icon: Laugh,  label: 'Excited',  color: 'bg-accent-gold',  text: 'text-accent-gold'  },
  { mood: 'neutral', icon: Meh,    label: 'Neutral',  color: 'bg-text-muted',   text: 'text-text-muted'   },
  { mood: 'sad',     icon: Frown,  label: 'Sad',      color: 'bg-blue-400',     text: 'text-blue-400'     },
  { mood: 'angry',   icon: Angry,  label: 'Angry',    color: 'bg-red-400',      text: 'text-red-400'      },
];

const LAST_7_DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return d.toLocaleDateString('en-US', { weekday: 'short' });
});

export function MoodChart() {
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [total, setTotal]     = useState(0);
  const [trend, setTrend]     = useState<(string | null)[]>([]);
  const [topMood, setTopMood] = useState<string | null>(null);

  useEffect(() => {
    const entries = getEntries();
    if (!entries.length) return;

    // Mood distribution
    const c: Record<string, number> = {};
    for (const e of entries) {
      c[e.mood] = (c[e.mood] || 0) + 1;
    }
    setCounts(c);
    setTotal(entries.length);
    setTopMood(Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);

    // 7-day mood trend — last mood written each day
    const now = new Date();
    const trend7: (string | null)[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const dayEntries = entries.filter(e => e.date === dateStr);
      trend7.push(dayEntries.length > 0 ? dayEntries[0].mood : null);
    }
    setTrend(trend7);
  }, []);

  const topConfig = MOOD_CONFIG.find(m => m.mood === topMood);

  return (
    <div className="rounded-[2rem] border border-border bg-surface-2 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)] space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Mood Insights</p>
          <p className="text-lg font-serif mt-1">{total > 0 ? `Across ${total} entries` : 'No entries yet'}</p>
        </div>
        {topConfig && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border">
            <topConfig.icon className={`w-4 h-4 ${topConfig.text}`} />
            <span className="text-xs font-mono text-text-muted">Most common</span>
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="space-y-2.5">
          {MOOD_CONFIG.map(m => (
            <div key={m.mood} className="flex items-center gap-3">
              <m.icon className="w-3.5 h-3.5 shrink-0 text-border" />
              <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-border/30 w-0" />
              </div>
              <span className="text-[11px] font-mono text-border w-8 text-right">—</span>
            </div>
          ))}
          <p className="text-[10px] font-mono text-text-muted/50 text-center pt-1">Write entries to see mood trends</p>
        </div>
      ) : (
        <>
          {/* Mood distribution bars */}
          <div className="space-y-2.5">
            {MOOD_CONFIG.filter(m => counts[m.mood]).map(m => {
              const pct = Math.round((counts[m.mood] / total) * 100);
              return (
                <div key={m.mood} className="flex items-center gap-3">
                  <m.icon className={`w-3.5 h-3.5 shrink-0 ${m.text}`} />
                  <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.color} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-text-muted/70 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>

          {/* 7-day trend dots */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono mb-2">Last 7 days</p>
            <div className="flex items-end gap-1 justify-between">
              {trend.map((mood, i) => {
                const cfg = MOOD_CONFIG.find(m => m.mood === mood);
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`w-full rounded-full transition-all ${
                        mood && cfg ? `${cfg.color} h-5` : 'bg-border h-1.5'
                      }`}
                      title={mood ?? 'No entry'}
                    />
                    <span className="text-[9px] font-mono text-text-muted/40">{LAST_7_DAYS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
