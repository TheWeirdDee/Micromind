'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type PageState = 'verifying' | 'ready' | 'saving' | 'done' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // The recovery link puts tokens in the URL hash; supabase-js consumes them
    // and establishes a session. An expired link arrives as #error=... instead.
    if (typeof window !== 'undefined' && window.location.hash.includes('error=')) {
      setState('invalid');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setState((s) => (s === 'verifying' ? 'ready' : s));
      }
    });

    // Also handle the case where the session was already established before mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState((s) => (s === 'verifying' ? 'ready' : s));
      } else {
        // Give the URL-hash handler a moment before declaring the link dead
        setTimeout(() => {
          setState((s) => (s === 'verifying' ? 'invalid' : s));
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setState('saving');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setState('ready');
      return;
    }
    setState('done');
    setTimeout(() => router.push('/app'), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-sm mx-auto pt-12 pb-32"
    >
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h1 className="font-serif text-xl">Reset Password</h1>
            <p className="font-mono text-[10px] text-text-muted mt-0.5">Choose a new password for your account</p>
          </div>
        </div>

        {state === 'verifying' && (
          <p className="font-mono text-xs text-text-muted animate-pulse">Verifying your reset link…</p>
        )}

        {state === 'invalid' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/50 rounded-xl p-4">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-red-300/90 leading-relaxed">
                This reset link is invalid or has expired. Request a new one from the login screen.
              </p>
            </div>
            <Link href="/app" className="pill-button pill-button-outline w-full py-3 text-xs font-mono uppercase tracking-widest">
              Back to App
            </Link>
          </div>
        )}

        {(state === 'ready' || state === 'saving') && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoFocus
                  className="w-full bg-surface-2 border border-border rounded-xl px-9 py-2.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Repeat password"
                  className="w-full bg-surface-2 border border-border rounded-xl px-9 py-2.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                />
              </div>
            </div>

            {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={state === 'saving'}
              className="pill-button pill-button-primary w-full py-3 text-xs font-mono uppercase tracking-widest disabled:opacity-50"
            >
              {state === 'saving' ? 'Saving…' : 'Set New Password'}
            </button>
          </div>
        )}

        {state === 'done' && (
          <div className="flex items-start gap-2 bg-accent-green/10 border border-accent-green/30 rounded-xl p-4">
            <Check className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
            <p className="font-mono text-xs text-text-primary leading-relaxed">
              Password updated! Taking you back to the app…
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
