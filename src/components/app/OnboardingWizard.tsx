'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, User, Mail, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const GOALS = [
  'Clear Mental Clutter',
  'Capture Moments of Gratitude',
  'Find Patterns in My Thoughts',
  'Understand My Emotions',
  'Build a Daily Reflection Habit',
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const raw = localStorage.getItem('mm_user_profile');
      return raw && JSON.parse(raw).name ? 2 : 1;
    } catch { return 1; }
  });
  const [name, setName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('mm_user_profile');
      return raw ? (JSON.parse(raw).name ?? '') : '';
    } catch { return ''; }
  });
  const [email, setEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('mm_user_profile');
      return raw ? (JSON.parse(raw).email ?? '') : '';
    } catch { return ''; }
  });
  const [error, setError] = useState('');
  const [goals, setGoals] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('mm_user_profile');
      return raw ? (JSON.parse(raw).goals ?? []) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => setStep(4), 2500);
    return () => clearTimeout(t);
  }, [step]);

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (email.trim() && !email.includes('@')) {
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
      loginMethod: 'email',
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

          {/* STEP 1 — Name & Email */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col min-h-0"
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
                    MicroMind is local-first. Your journal stays on your device — nothing leaves without your permission.
                  </p>
                </div>

                <form onSubmit={submitProfile} className="space-y-4 px-2">
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
                      Email Address <span className="text-[8px] opacity-50">(optional)</span>
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

                  <button
                    type="submit"
                    className="pill-button pill-button-primary w-full py-4 text-xs font-mono uppercase tracking-widest font-bold mt-2"
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">Continue <ArrowRight className="w-3.5 h-3.5" /></span>
                  </button>

                </form>
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

              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 px-1 py-2 min-h-0">
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
