'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, User, Mail, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

interface OnboardingWizardProps {
  onComplete: () => void;
}

type LoginMethod = 'google' | 'apple' | 'email';
type AuthState = 'idle' | 'oauth-loading' | 'form';

const GOALS = [
  'Clear Mental Clutter',
  'Capture Moments of Gratitude',
  'Find Patterns in My Thoughts',
  'Understand My Emotions',
  'Build a Daily Reflection Habit',
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod | null>(null);
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [error, setError] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [gisReady, setGisReady] = useState(false);

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGisReady(true);
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  // Auto-advance step 3 → 4
  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => setStep(4), 2500);
    return () => clearTimeout(t);
  }, [step]);

  const handleGoogleLogin = () => {
    setError('');
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId || !gisReady || !window.google) {
      // No Google OAuth configured — collect name/email manually
      setLoginMethod('google');
      setAuthState('form');
      return;
    }

    setAuthState('oauth-loading');

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (response) => {
        if (!response.access_token || response.error) {
          setAuthState('idle');
          if (response.error !== 'popup_closed_by_user') {
            setError('Google sign-in failed. Please try email instead.');
          }
          return;
        }
        try {
          const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` },
          }).then((r) => r.json());

          setName(userInfo.name || userInfo.given_name || '');
          setEmail(userInfo.email || '');
          setLoginMethod('google');
          setAuthState('idle');
          setStep(2);
        } catch {
          setAuthState('idle');
          setError('Could not load Google profile. Please try email instead.');
        }
      },
    });

    tokenClient.requestAccessToken();
  };

  const handleAppleLogin = () => {
    // Apple Sign In requires Apple Developer account + registered domain.
    // Fall back to a profile form.
    setLoginMethod('apple');
    setAuthState('form');
    setError('');
  };

  const handleEmailLogin = () => {
    setLoginMethod('email');
    setAuthState('form');
    setError('');
  };

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (loginMethod === 'email' && (!email.trim() || !email.includes('@'))) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSelectGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleFinalize = () => {
    const profile = {
      name: name.trim() || 'Mindful Writer',
      email: email.trim(),
      goals,
      loginMethod: loginMethod || 'guest',
      onboardedAt: Date.now(),
    };
    localStorage.setItem('mm_user_profile', JSON.stringify(profile));
    localStorage.setItem('mm_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col items-center p-6 select-none overflow-hidden">
      <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-accent/5 filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full bg-accent-gold/5 filter blur-3xl pointer-events-none" />

      <div className="w-full max-w-[390px] flex flex-col flex-1 relative z-10 min-h-0">

        {step <= 2 && (
          <div className="flex gap-2 pt-4 pb-6 flex-shrink-0">
            <div className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-accent' : 'bg-border'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-accent' : 'bg-border'}`} />
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* STEP 1 — Auth */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col min-h-0 overflow-y-auto"
            >
              <div className="flex flex-col justify-center flex-1 space-y-8 py-4">
                <div className="text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-accent/5 border border-accent/10 mb-2">
                    <Sparkles className="w-6 h-6 text-accent" />
                  </div>
                  <h2 className="text-3xl font-serif tracking-tight leading-tight">
                    Your thoughts <br />deserve a private home.
                  </h2>
                  <p className="font-mono text-xs text-text-muted max-w-[280px] mx-auto leading-relaxed">
                    MicroMind is local-first. Your journal stays on your device.
                  </p>
                </div>

                {authState === 'idle' && (
                  <div className="space-y-3 px-2">
                    {error && (
                      <p className="text-[10px] font-mono text-accent-gold text-center pb-1">{error}</p>
                    )}

                    <button
                      onClick={handleGoogleLogin}
                      className="w-full py-4 rounded-full border border-border bg-surface/50 backdrop-blur-md hover:bg-surface text-xs font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-3 active:scale-[0.99]"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    <button
                      onClick={handleAppleLogin}
                      className="w-full py-4 rounded-full border border-border bg-surface/50 backdrop-blur-md hover:bg-surface text-xs font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-3 active:scale-[0.99]"
                    >
                      <svg className="w-4 h-4 fill-text-primary shrink-0" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.11.09 2.26-.57 2.95-1.39z" />
                      </svg>
                      <span>Continue with Apple</span>
                    </button>

                    <button
                      onClick={handleEmailLogin}
                      className="w-full py-4 rounded-full border border-border bg-surface/50 backdrop-blur-md hover:bg-surface text-xs font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-3 active:scale-[0.99]"
                    >
                      <Mail className="w-4 h-4 text-text-primary shrink-0" />
                      <span>Sign In with Email</span>
                    </button>

                    <div className="pt-2 text-center">
                      <button
                        onClick={() => {
                          setName('Mindful Writer');
                          setLoginMethod('email');
                          setStep(2);
                        }}
                        className="text-[10px] font-mono uppercase tracking-widest text-text-muted hover:text-accent transition-colors underline underline-offset-4"
                      >
                        Skip Setup (Instant Start)
                      </button>
                    </div>
                  </div>
                )}

                {authState === 'oauth-loading' && (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="font-mono text-xs text-text-muted uppercase tracking-widest animate-pulse">
                      Opening Google Sign-In...
                    </p>
                    <button
                      onClick={() => setAuthState('idle')}
                      className="text-[10px] font-mono text-text-muted hover:text-accent underline underline-offset-2 transition-colors mt-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {authState === 'form' && (
                  <form onSubmit={submitProfile} className="space-y-4 px-2">
                    <div className="flex items-center gap-2 mb-1">
                      {loginMethod === 'google' && (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      )}
                      {loginMethod === 'apple' && (
                        <svg className="w-4 h-4 fill-text-primary shrink-0" viewBox="0 0 24 24">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.11.09 2.26-.57 2.95-1.39z" />
                        </svg>
                      )}
                      {loginMethod === 'email' && <Mail className="w-4 h-4 text-text-primary shrink-0" />}
                      <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                        {loginMethod === 'google' ? 'Google Profile' : loginMethod === 'apple' ? 'Apple Profile' : 'Email Sign In'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted px-1">Your Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        <input
                          type="text"
                          value={name}
                          autoFocus
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex"
                          className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted px-1">
                        Email Address{loginMethod !== 'email' && <span className="text-[8px] opacity-50 ml-1">(optional)</span>}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alex@example.com"
                          className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-[10px] font-mono text-accent-gold text-center">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthState('idle');
                          setError('');
                          setName('');
                          setEmail('');
                        }}
                        className="pill-button pill-button-outline w-1/3 py-4 text-xs font-mono uppercase tracking-widest"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="pill-button pill-button-primary w-2/3 py-4 text-xs font-mono uppercase tracking-widest font-bold"
                      >
                        Continue
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Goals */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="text-center space-y-2 py-4 flex-shrink-0">
                <span className="font-mono text-[9px] uppercase tracking-widest text-accent-gold">Goals</span>
                <h2 className="text-3xl font-serif tracking-tight leading-tight">
                  What are your goals?
                </h2>
                <p className="font-mono text-xs text-text-muted max-w-[285px] mx-auto leading-relaxed">
                  Select the targets that matter to you.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2 min-h-0">
                {GOALS.map((goal) => {
                  const isSelected = goals.includes(goal);
                  return (
                    <button
                      key={goal}
                      onClick={() => handleSelectGoal(goal)}
                      className={`w-full py-4 px-5 rounded-2xl border text-left text-xs font-mono transition-all duration-200 flex items-center justify-between group active:scale-[0.99] ${
                        isSelected
                          ? 'border-accent bg-accent/5 text-text-primary'
                          : 'border-border bg-surface/40 hover:border-text-muted text-text-primary/70'
                      }`}
                    >
                      <span>{goal}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ml-3 ${
                        isSelected ? 'border-accent bg-accent text-bg' : 'border-border bg-transparent group-hover:border-text-muted'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-4 pb-2 flex-shrink-0">
                <button
                  onClick={() => setStep(1)}
                  className="pill-button pill-button-outline w-1/3 py-4 text-xs font-mono uppercase tracking-widest"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={goals.length === 0}
                  className="pill-button pill-button-primary w-2/3 py-4 text-xs font-mono uppercase tracking-widest font-bold disabled:opacity-40"
                >
                  Create Space
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Loading */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-1 flex flex-col items-center justify-center space-y-6"
            >
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
              <div className="text-center space-y-2">
                <h3 className="font-serif text-2xl text-text-primary">Designing Your Journal</h3>
                <p className="font-mono text-xs text-text-muted max-w-[200px] mx-auto animate-pulse">
                  Personalizing interface and writing prompts...
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 4 — Ready */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col justify-center space-y-8 overflow-y-auto py-4"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-accent-green/10 border border-accent-green/20 mb-2">
                  <ShieldCheck className="w-6 h-6 text-accent-green" />
                </div>
                <h2 className="text-3xl font-serif tracking-tight leading-tight">
                  Your space is ready!
                </h2>
                <p className="font-mono text-xs text-text-muted">
                  A private, offline-first journaling container.
                </p>
              </div>

              <div className="bg-surface/60 border border-border p-6 rounded-[2rem] space-y-5 relative overflow-hidden backdrop-blur-md">
                <div className="absolute inset-0 halftone-bg opacity-[0.03] pointer-events-none" />
                {[
                  { n: 1, title: 'Start Journaling', desc: 'Write daily thoughts, track moods. Stored locally — 100% private and free.' },
                  { n: 2, title: 'Unlock AI Insights', desc: 'Pay tiny amounts in cUSD only when requesting patterns or reflections.' },
                  { n: 3, title: 'Disconnect Anytime', desc: 'Swap wallets freely — your journal stays right here.' },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-4 items-start">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] text-accent font-bold shrink-0">{n}</div>
                    <div className="space-y-0.5">
                      <h4 className="font-serif text-sm font-bold text-text-primary">{title}</h4>
                      <p className="font-mono text-[10px] text-text-muted leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleFinalize}
                className="pill-button pill-button-primary w-full py-4 text-xs font-mono uppercase tracking-widest font-bold shadow-xl shadow-accent/5 flex items-center justify-center gap-2 group focus:outline-none"
              >
                <span>Start Your First Entry</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
