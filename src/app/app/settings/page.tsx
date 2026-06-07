'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Mail, Check, Trash2, RotateCcw, Info, Shield } from 'lucide-react';
import Link from 'next/link';

const GOALS = [
  'Clear Mental Clutter',
  'Capture Moments of Gratitude',
  'Find Patterns in My Thoughts',
  'Understand My Emotions',
  'Build a Daily Reflection Habit',
];

interface UserProfile {
  name: string;
  email: string;
  goals: string[];
  loginMethod: string;
  onboardedAt: number;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('mm_user_profile');
    if (raw) {
      try {
        const p: UserProfile = JSON.parse(raw);
        setProfile(p);
        setName(p.name || '');
        setEmail(p.email || '');
        setGoals(p.goals || []);
      } catch {}
    }
  }, []);

  const saveProfile = () => {
    const updated: UserProfile = {
      name: name.trim() || 'Mindful Writer',
      email: email.trim(),
      goals,
      loginMethod: profile?.loginMethod || 'email',
      onboardedAt: profile?.onboardedAt || Date.now(),
    };
    localStorage.setItem('mm_user_profile', JSON.stringify(updated));
    setProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const clearHistory = () => {
    if (!confirm('Clear all AI prompt history? This cannot be undone.')) return;
    localStorage.removeItem('micromind_history');
    localStorage.removeItem('micromind_chat_memory');
    alert('AI history cleared.');
  };

  const clearJournal = () => {
    if (!confirm('Delete all journal entries? This cannot be undone.')) return;
    localStorage.removeItem('mm_journal');
    alert('Journal cleared.');
  };

  const resetApp = () => {
    if (!confirm('Reset everything? All your journal entries, profile, and AI history will be permanently deleted. The app will restart from the beginning.')) return;
    localStorage.clear();
    window.location.href = '/app';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-32"
    >
      <header className="flex items-center gap-4">
        <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-serif">Settings</h2>
      </header>

      {/* Profile */}
      <section className="space-y-3">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted px-1">Profile</h3>
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Display Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-11 py-3 text-sm font-mono focus:border-accent outline-none transition-colors"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">
              Email <span className="opacity-50">(optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full bg-surface-2 border border-border rounded-xl px-11 py-3 text-sm font-mono focus:border-accent outline-none transition-colors"
              />
            </div>
          </div>
          <button
            onClick={saveProfile}
            className="pill-button pill-button-primary w-full py-3 text-xs font-mono uppercase tracking-widest font-bold"
          >
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </section>

      {/* Goals */}
      <section className="space-y-3">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted px-1">Your Goals</h3>
        <div className="space-y-2">
          {GOALS.map((goal) => {
            const isSelected = goals.includes(goal);
            return (
              <button
                key={goal}
                onClick={() => toggleGoal(goal)}
                className={`w-full py-3.5 px-5 rounded-xl border text-left text-xs font-mono transition-all flex items-center justify-between group active:scale-[0.99] ${
                  isSelected
                    ? 'border-accent bg-accent/5 text-text-primary'
                    : 'border-border bg-surface/40 hover:border-text-muted text-text-primary/70'
                }`}
              >
                <span>{goal}</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-3 transition-all ${
                  isSelected ? 'border-accent bg-accent text-bg' : 'border-border group-hover:border-text-muted'
                }`}>
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={saveProfile}
          className="pill-button pill-button-outline w-full py-3 text-xs font-mono uppercase tracking-widest"
        >
          {saved ? '✓ Goals Saved' : 'Save Goals'}
        </button>
      </section>

      {/* Data & Privacy */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Shield className="w-3 h-3 text-text-muted" />
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Data & Privacy</h3>
        </div>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <button
            onClick={clearHistory}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group"
          >
            <div>
              <p className="font-mono text-xs text-text-primary">Clear AI Prompt History</p>
              <p className="font-mono text-[10px] text-text-muted mt-0.5">Removes all AI responses and chat memory</p>
            </div>
            <Trash2 className="w-4 h-4 text-text-muted group-hover:text-accent-gold transition-colors shrink-0 ml-4" />
          </button>
          <button
            onClick={clearJournal}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group"
          >
            <div>
              <p className="font-mono text-xs text-text-primary">Clear Journal Entries</p>
              <p className="font-mono text-[10px] text-text-muted mt-0.5">Permanently deletes all your journal entries</p>
            </div>
            <Trash2 className="w-4 h-4 text-text-muted group-hover:text-accent-gold transition-colors shrink-0 ml-4" />
          </button>
          <button
            onClick={resetApp}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group"
          >
            <div>
              <p className="font-mono text-xs text-red-400">Reset Everything</p>
              <p className="font-mono text-[10px] text-text-muted mt-0.5">Wipes all data and restarts onboarding</p>
            </div>
            <RotateCcw className="w-4 h-4 text-red-400/40 group-hover:text-red-400 transition-colors shrink-0 ml-4" />
          </button>
        </div>
      </section>

      {/* About */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Info className="w-3 h-3 text-text-muted" />
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted">About</h3>
        </div>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {[
            { label: 'Version', value: '0.1.0' },
            { label: 'Network', value: 'Celo Mainnet' },
            { label: 'Contract', value: '0xDdf2...214c' },
            { label: 'Storage', value: 'Local device only' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">{label}</span>
              <span className="font-mono text-xs text-text-primary">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
