'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, User, Mail, Check, Trash2, RotateCcw, Info, Shield, Download, Upload, Bell, Lock, AlertTriangle, X, LogOut, KeyRound, AtSign, UserX } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

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

type DestructiveAction = 'clearHistory' | 'clearJournal' | 'resetAll' | 'deleteAccount';

const ACTION_META: Record<DestructiveAction, { title: string; description: string; consequences: string[] }> = {
  clearHistory: {
    title: 'Clear AI Prompt History',
    description: 'This will permanently remove all your AI chat responses and chat memory.',
    consequences: ['All AI responses will be deleted', 'Chat session memory will be wiped', 'This cannot be undone'],
  },
  clearJournal: {
    title: 'Clear Journal Entries',
    description: 'This will permanently delete every journal entry you have written, on this device and in the cloud.',
    consequences: ['All journal entries will be deleted from this device', 'All synced entries will be deleted from the cloud', 'Folder structure will be preserved', 'This cannot be undone'],
  },
  resetAll: {
    title: 'Reset Everything',
    description: 'This wipes all your data — on this device and in the cloud — and restarts the app from the beginning.',
    consequences: [
      'All journal entries will be deleted (device + cloud)',
      'Quest progress, vocabulary, and scheduled letters will be deleted',
      'AI history and chat memory will be deleted',
      'Your profile and goals will be cleared',
      'Your account itself is kept — use Delete Account to remove it',
      'This cannot be undone',
    ],
  },
  deleteAccount: {
    title: 'Delete Account',
    description: 'This permanently deletes your account and every piece of data associated with it.',
    consequences: [
      'Your login and profile will be permanently deleted',
      'All journal entries, quest progress, and letters will be erased from the cloud',
      'All local data on this device will be wiped',
      'This cannot be undone',
    ],
  },
};

interface ConfirmDialogProps {
  action: DestructiveAction;
  userEmail: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ action, userEmail, onConfirm, onCancel }: ConfirmDialogProps) {
  const meta = ACTION_META[action];
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isReset = action === 'resetAll' || action === 'deleteAccount';
  const needsPassword = !!userEmail;

  const handleConfirm = async () => {
    setError('');
    if (needsPassword) {
      if (!password) { setError('Please enter your password.'); return; }
      setLoading(true);
      try {
        const { error: authErr } = await supabase.auth.signInWithPassword({ email: userEmail!, password });
        if (authErr) { setError('Incorrect password. Please try again.'); setLoading(false); return; }
      } catch {
        setError('Could not verify password. Please try again.');
        setLoading(false);
        return;
      }
      setLoading(false);
    } else {
      if (isReset && confirmText !== 'DELETE') { setError('Type DELETE to confirm.'); return; }
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-950/50 border border-red-900/60 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="font-mono text-sm font-bold text-text-primary">{meta.title}</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="font-mono text-xs text-text-muted leading-relaxed">{meta.description}</p>
          <ul className="space-y-1.5">
            {meta.consequences.map((c) => (
              <li key={c} className="flex items-start gap-2 font-mono text-[10px] text-red-300/80">
                <span className="mt-0.5 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                {c}
              </li>
            ))}
          </ul>

          {needsPassword ? (
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">
                Enter your password to confirm
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full bg-surface-2 border border-border rounded-xl px-9 py-2.5 text-sm font-mono focus:border-red-500 outline-none transition-colors"
                />
              </div>
            </div>
          ) : isReset ? (
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">
                Type <span className="text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                placeholder="DELETE"
                autoFocus
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm font-mono focus:border-red-500 outline-none transition-colors"
              />
            </div>
          ) : null}

          {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border font-mono text-xs text-text-muted hover:bg-surface-2 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-mono text-xs text-white font-bold transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : isReset ? meta.title : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, session, logout, logoutEverywhere, updatePassword, updateEmail } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('mm_user_profile');
    if (!raw) return null;
    try { return JSON.parse(raw) as UserProfile; } catch { return null; }
  });
  const [displayName, setDisplayName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const raw = localStorage.getItem('mm_user_profile');
    if (!raw) return '';
    try { const p = JSON.parse(raw); return p.name || ''; } catch { return ''; }
  });
  const [goals, setGoals] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem('mm_user_profile');
    if (!raw) return [];
    try { const p = JSON.parse(raw); return p.goals || []; } catch { return []; }
  });
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem('mm_daily_reminder') === 'true'
  );
  const [pendingAction, setPendingAction] = useState<DestructiveAction | null>(null);

  // Fetch the immutable username from Supabase profiles
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) {
          setUsername(data.username);
          setDisplayName((d) => d || data.username);
        }
      });
  }, [user]);

  const [nameSaved, setNameSaved] = useState(false);
  const saveDisplayName = () => {
    const updated: UserProfile = {
      name: displayName.trim(),
      email: user?.email || profile?.email || '',
      goals,
      loginMethod: profile?.loginMethod || 'credentials',
      onboardedAt: profile?.onboardedAt || Date.now(),
    };
    localStorage.setItem('mm_user_profile', JSON.stringify(updated));
    setProfile(updated);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  // ── Account & Security state ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);

  const handleChangePassword = async () => {
    setPasswordStatus(null);
    if (newPassword.length < 6) {
      setPasswordStatus({ ok: false, msg: 'New password must be at least 6 characters.' });
      return;
    }
    if (!user?.email) {
      setPasswordStatus({ ok: false, msg: 'You must be logged in to change your password.' });
      return;
    }
    setPasswordBusy(true);
    try {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyErr) {
        setPasswordStatus({ ok: false, msg: 'Current password is incorrect.' });
        return;
      }
      await updatePassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordStatus({ ok: true, msg: 'Password updated successfully.' });
    } catch (e) {
      setPasswordStatus({ ok: false, msg: e instanceof Error ? e.message : 'Failed to update password.' });
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleChangeEmail = async () => {
    setEmailStatus(null);
    const clean = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setEmailStatus({ ok: false, msg: 'Enter a valid email address.' });
      return;
    }
    setEmailBusy(true);
    try {
      await updateEmail(clean);
      setNewEmail('');
      setEmailStatus({ ok: true, msg: `Confirmation link sent to ${clean}. Your email changes after you confirm.` });
    } catch (e) {
      setEmailStatus({ ok: false, msg: e instanceof Error ? e.message : 'Failed to update email.' });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleSignOut = async (everywhere: boolean) => {
    setSignOutBusy(true);
    try {
      if (everywhere) await logoutEverywhere(); else await logout();
    } finally {
      window.location.href = '/app';
    }
  };

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
    } catch {
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
          alert('Invalid backup file format.');
          return;
        }
        const currentEntries = JSON.parse(localStorage.getItem('mm_journal') || '[]');
        const entryIds = new Set(currentEntries.map((entry: { id: string }) => entry.id));
        const mergedEntries = [...currentEntries];
        data.entries.forEach((entry: { id: string }) => { if (!entryIds.has(entry.id)) mergedEntries.push(entry); });

        const currentFolders = JSON.parse(localStorage.getItem('mm_journal_folders') || '[]');
        const folderIds = new Set(currentFolders.map((f: { id: string }) => f.id));
        const mergedFolders = [...currentFolders];
        data.folders.forEach((f: { id: string }) => { if (!folderIds.has(f.id)) mergedFolders.push(f); });

        localStorage.setItem('mm_journal', JSON.stringify(mergedEntries));
        localStorage.setItem('mm_journal_folders', JSON.stringify(mergedFolders));
        window.dispatchEvent(new Event('journal_updated'));
        window.dispatchEvent(new Event('streak_updated'));
        alert('Backup successfully imported and merged!');
      } catch {
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  const toggleGoal = (goal: string) => {
    setGoals((prev) => prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]);
  };

  const saveGoals = () => {
    const updated: UserProfile = {
      name: displayName,
      email: user?.email || profile?.email || '',
      goals,
      loginMethod: profile?.loginMethod || 'credentials',
      onboardedAt: profile?.onboardedAt || Date.now(),
    };
    localStorage.setItem('mm_user_profile', JSON.stringify(updated));
    setProfile(updated);
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 2000);
  };

  const executeAction = async (action: DestructiveAction) => {
    setPendingAction(null);

    if (action === 'clearHistory') {
      localStorage.removeItem('micromind_history');
      localStorage.removeItem('micromind_chat_memory');
      alert('AI history cleared.');
      return;
    }

    if (action === 'clearJournal') {
      if (user) {
        const { error } = await supabase.from('journal_entries').delete().eq('user_id', user.id);
        if (error) {
          alert('Could not delete cloud entries: ' + error.message + '\nLocal entries were not touched — please try again.');
          return;
        }
      }
      localStorage.removeItem('mm_journal');
      window.dispatchEvent(new Event('journal_updated'));
      window.dispatchEvent(new Event('streak_updated'));
      alert('Journal cleared on this device and in the cloud.');
      return;
    }

    if (action === 'resetAll') {
      if (user) {
        await Promise.all([
          supabase.from('journal_entries').delete().eq('user_id', user.id),
          supabase.from('quest_progress').delete().eq('user_id', user.id),
          supabase.from('quest_vocabulary').delete().eq('user_id', user.id),
          supabase.from('scheduled_letters').delete().eq('user_id', user.id),
        ]);
        await logout();
      }
      localStorage.clear();
      window.location.href = '/app';
      return;
    }

    if (action === 'deleteAccount') {
      if (!session?.access_token) {
        alert('You must be logged in to delete your account.');
        return;
      }
      try {
        const res = await fetch('/api/account/delete', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          alert('Account deletion failed: ' + (data.error || res.statusText));
          return;
        }
        await logout().catch(() => {});
        localStorage.clear();
        window.location.href = '/app';
      } catch (e) {
        alert('Account deletion failed: ' + (e instanceof Error ? e.message : 'network error'));
      }
    }
  };

  const userEmail = user?.email || profile?.email || '';

  return (
    <>
      <AnimatePresence>
        {pendingAction && (
          <ConfirmDialog
            action={pendingAction}
            userEmail={userEmail || null}
            onConfirm={() => executeAction(pendingAction)}
            onCancel={() => setPendingAction(null)}
          />
        )}
      </AnimatePresence>

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
            {/* Profile — read-only */}
            <section className="space-y-3">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted px-1">Profile</h3>
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                <div className="space-y-2">
                  <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
                      placeholder="How should we greet you?"
                      className="w-full bg-surface-2 border border-border rounded-xl pl-11 pr-20 py-3 text-sm font-mono text-text-primary focus:border-accent outline-none transition-colors"
                    />
                    <button
                      onClick={saveDisplayName}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent font-mono text-[10px] font-bold hover:bg-accent/20 transition-colors"
                    >
                      {nameSaved ? <Check className="w-3 h-3" /> : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <div className="w-full bg-surface-2 border border-border rounded-xl px-11 py-3 text-sm font-mono text-text-primary">
                      {username || <span className="text-text-muted">—</span>}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <div className="w-full bg-surface-2 border border-border rounded-xl px-11 py-3 text-sm font-mono text-text-primary">
                      {userEmail || <span className="text-text-muted">—</span>}
                    </div>
                  </div>
                </div>
                <p className="font-mono text-[9px] text-text-muted px-1">Username cannot be changed. Email can be changed under Account & Security.</p>
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
                onClick={saveGoals}
                className="pill-button pill-button-outline w-full py-3 text-xs font-mono uppercase tracking-widest"
              >
                {goalsSaved ? <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Goals Saved</span> : 'Save Goals'}
              </button>
            </section>

            {/* Account & Security */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <KeyRound className="w-3 h-3 text-text-muted" />
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Account & Security</h3>
              </div>
              <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
                {/* Change Password */}
                <div className="px-5 py-4 space-y-3">
                  <p className="font-mono text-xs text-text-primary">Change Password</p>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full bg-surface-2 border border-border rounded-xl px-9 py-2.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                      placeholder="New password (min. 6 characters)"
                      className="w-full bg-surface-2 border border-border rounded-xl px-9 py-2.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                    />
                  </div>
                  {passwordStatus && (
                    <p className={`font-mono text-[10px] ${passwordStatus.ok ? 'text-accent-green' : 'text-red-400'}`}>{passwordStatus.msg}</p>
                  )}
                  <button
                    onClick={handleChangePassword}
                    disabled={passwordBusy || !currentPassword || !newPassword}
                    className="pill-button pill-button-outline w-full py-2.5 text-[10px] font-mono uppercase tracking-widest disabled:opacity-40"
                  >
                    {passwordBusy ? 'Updating…' : 'Update Password'}
                  </button>
                </div>

                {/* Change Email */}
                <div className="px-5 py-4 space-y-3">
                  <p className="font-mono text-xs text-text-primary">Change Email</p>
                  <p className="font-mono text-[10px] text-text-muted -mt-1.5">We&apos;ll send a confirmation link to the new address</p>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChangeEmail()}
                      placeholder="new@email.com"
                      className="w-full bg-surface-2 border border-border rounded-xl px-9 py-2.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                    />
                  </div>
                  {emailStatus && (
                    <p className={`font-mono text-[10px] ${emailStatus.ok ? 'text-accent-green' : 'text-red-400'}`}>{emailStatus.msg}</p>
                  )}
                  <button
                    onClick={handleChangeEmail}
                    disabled={emailBusy || !newEmail}
                    className="pill-button pill-button-outline w-full py-2.5 text-[10px] font-mono uppercase tracking-widest disabled:opacity-40"
                  >
                    {emailBusy ? 'Sending…' : 'Send Confirmation Link'}
                  </button>
                </div>

                {/* Sign out */}
                <button
                  onClick={() => handleSignOut(false)}
                  disabled={signOutBusy}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group disabled:opacity-50"
                >
                  <div>
                    <p className="font-mono text-xs text-text-primary">Sign Out</p>
                    <p className="font-mono text-[10px] text-text-muted mt-0.5">End your session on this device</p>
                  </div>
                  <LogOut className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors shrink-0 ml-4" />
                </button>

                <button
                  onClick={() => handleSignOut(true)}
                  disabled={signOutBusy}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group disabled:opacity-50"
                >
                  <div>
                    <p className="font-mono text-xs text-text-primary">Sign Out Everywhere</p>
                    <p className="font-mono text-[10px] text-text-muted mt-0.5">End your session on all devices</p>
                  </div>
                  <LogOut className="w-4 h-4 text-text-muted group-hover:text-accent-gold transition-colors shrink-0 ml-4" />
                </button>
              </div>
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
                    <div className={`w-4 h-4 rounded-full bg-bg shadow-sm transition-transform duration-200 ${remindersEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <button onClick={exportJournal} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group">
                  <div>
                    <p className="font-mono text-xs text-text-primary">Export Journal Backup</p>
                    <p className="font-mono text-[10px] text-text-muted mt-0.5">Download your entries and folders as JSON</p>
                  </div>
                  <Download className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors shrink-0 ml-4" />
                </button>

                <label className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group cursor-pointer">
                  <div>
                    <p className="font-mono text-xs text-text-primary">Import Journal Backup</p>
                    <p className="font-mono text-[10px] text-text-muted mt-0.5">Restore entries and folders from JSON file</p>
                    <input type="file" accept=".json" onChange={importJournal} className="hidden" />
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
                <button onClick={() => setPendingAction('clearHistory')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group">
                  <div>
                    <p className="font-mono text-xs text-text-primary">Clear AI Prompt History</p>
                    <p className="font-mono text-[10px] text-text-muted mt-0.5">Removes all AI responses and chat memory</p>
                  </div>
                  <Trash2 className="w-4 h-4 text-text-muted group-hover:text-accent-gold transition-colors shrink-0 ml-4" />
                </button>
                <button onClick={() => setPendingAction('clearJournal')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group">
                  <div>
                    <p className="font-mono text-xs text-text-primary">Clear Journal Entries</p>
                    <p className="font-mono text-[10px] text-text-muted mt-0.5">Permanently deletes all your journal entries</p>
                  </div>
                  <Trash2 className="w-4 h-4 text-text-muted group-hover:text-accent-gold transition-colors shrink-0 ml-4" />
                </button>
                <button onClick={() => setPendingAction('resetAll')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group">
                  <div>
                    <p className="font-mono text-xs text-red-400">Reset Everything</p>
                    <p className="font-mono text-[10px] text-text-muted mt-0.5">Wipes all data (device + cloud) and restarts onboarding</p>
                  </div>
                  <RotateCcw className="w-4 h-4 text-red-400/40 group-hover:text-red-400 transition-colors shrink-0 ml-4" />
                </button>
                <button onClick={() => setPendingAction('deleteAccount')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left group">
                  <div>
                    <p className="font-mono text-xs text-red-400">Delete Account</p>
                    <p className="font-mono text-[10px] text-text-muted mt-0.5">Permanently erase your account and all data</p>
                  </div>
                  <UserX className="w-4 h-4 text-red-400/40 group-hover:text-red-400 transition-colors shrink-0 ml-4" />
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
    </>
  );
}
