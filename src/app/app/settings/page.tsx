'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Mail, Check, Trash2, RotateCcw, Info, Shield, Download, Upload, Bell } from 'lucide-react';
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
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRemindersEnabled(localStorage.getItem('mm_daily_reminder') === 'true');
    }
  }, []);

  const toggleReminders = async () => {
    if (!remindersEnabled) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Notification permission denied. Please allow notifications in your browser settings to enable reminders.');
          return;
        }
      }
      localStorage.setItem('mm_daily_reminder', 'true');
      setRemindersEnabled(true);
    } else {
      localStorage.setItem('mm_daily_reminder', 'false');
      setRemindersEnabled(false);
    }
  };

  const exportJournal = () => {
    try {
      const entries = localStorage.getItem('mm_journal') || '[]';
      const folders = localStorage.getItem('mm_journal_folders') || '[]';
      const dataStr = JSON.stringify({ entries: JSON.parse(entries), folders: JSON.parse(folders) }, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `micromind_journal_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export journal backup.');
    }
  };

  const importJournal = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data || !Array.isArray(data.entries) || !Array.isArray(data.folders)) {
          alert('Invalid backup file format. Must contain entries and folders arrays.');
          return;
        }

        // Merge entries
        const currentEntries = JSON.parse(localStorage.getItem('mm_journal') || '[]');
        const entryIds = new Set(currentEntries.map((entry: any) => entry.id));
        const mergedEntries = [...currentEntries];

        data.entries.forEach((entry: any) => {
          if (!entryIds.has(entry.id)) {
            mergedEntries.push(entry);
          }
        });

        // Merge folders
        const currentFolders = JSON.parse(localStorage.getItem('mm_journal_folders') || '[]');
        const folderIds = new Set(currentFolders.map((f: any) => f.id));
        const mergedFolders = [...currentFolders];

        data.folders.forEach((f: any) => {
          if (!folderIds.has(f.id)) {
            mergedFolders.push(f);
          }
        });

        localStorage.setItem('mm_journal', JSON.stringify(mergedEntries));
        localStorage.setItem('mm_journal_folders', JSON.stringify(mergedFolders));

        // Trigger updates
        window.dispatchEvent(new Event('journal_updated'));
        window.dispatchEvent(new Event('streak_updated'));

        alert('Backup successfully imported and merged!');
      } catch (err) {
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  };

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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <div>
            <h2 className="text-2xl font-serif">Settings</h2>
            <p className="text-sm text-text-muted">Organize your profile, goals, and privacy preferences.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
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
                {saved ? <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Saved</span> : 'Save Changes'}
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
              {saved ? <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Goals Saved</span> : 'Save Goals'}
            </button>
          </section>
        </div>

        <div className="space-y-8">
          {/* Utilities & Reminders */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Bell className="w-3 h-3 text-text-muted" />
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Utilities & Reminders</h3>
            </div>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {/* Daily Reminder Toggle */}
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-mono text-xs text-text-primary">Daily Writing Reminders</p>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">Receive browser notifications to write daily</p>
                </div>
                <button
                  onClick={toggleReminders}
                  className={`w-12 h-6 rounded-full p-1 transition-colors relative duration-200 focus:outline-none ${
                    remindersEnabled ? 'bg-accent' : 'bg-surface-2 border border-border'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-bg shadow-sm transition-transform duration-200 ${
                      remindersEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Export Backup */}
              <button
                onClick={exportJournal}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group"
              >
                <div>
                  <p className="font-mono text-xs text-text-primary">Export Journal Backup</p>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">Download your entries and folders as JSON</p>
                </div>
                <Download className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors shrink-0 ml-4" />
              </button>

              {/* Import Backup */}
              <label className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group cursor-pointer">
                <div>
                  <p className="font-mono text-xs text-text-primary">Import Journal Backup</p>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">Restore entries and folders from JSON file</p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importJournal}
                    className="hidden"
                  />
                </div>
                <Upload className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors shrink-0 ml-4" />
              </label>
            </div>
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
        </div>
      </div>
    </motion.div>
  );
}
