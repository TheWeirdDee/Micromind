'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, ChevronRight, User, Mail, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  
  // Step 1: Profile info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState<'google' | 'apple' | 'email' | null>(null);
  const [showInputForm, setShowInputForm] = useState(false);
  const [error, setError] = useState('');

  // Step 2: Goals
  const [goals, setGoals] = useState<string[]>([]);

  const availableGoals = [
    'Clear Mental Clutter',
    'Capture Moments of Gratitude',
    'Find Patterns in My Thoughts',
    'Understand My Emotions',
    'Build a Daily Reflection Habit'
  ];

  const handleSelectGoal = (goal: string) => {
    setGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const handleSelectLogin = (method: 'google' | 'apple' | 'email') => {
    setLoginMethod(method);
    if (method === 'google' || method === 'apple') {
      // Auto fill mock profile info to speed up signup
      setName(method === 'google' ? 'Google Explorer' : 'Apple Explorer');
      setEmail(method === 'google' ? 'explorer@gmail.com' : 'explorer@icloud.com');
      setShowInputForm(true);
    } else {
      setName('');
      setEmail('');
      setShowInputForm(true);
    }
  };

  const submitStep1 = (e: React.FormEvent) => {
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

  const skipStep1 = () => {
    setName('Mindful Writer');
    setEmail('private@micromind.local');
    setLoginMethod('email');
    setError('');
    setStep(2);
  };

  // Step 3: Designing simulated loader effect
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        setStep(4);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleFinalize = () => {
    const profile = {
      name: name.trim(),
      email: email.trim(),
      goals: goals,
      loginMethod: loginMethod || 'guest',
      onboardedAt: Date.now()
    };
    localStorage.setItem('mm_user_profile', JSON.stringify(profile));
    localStorage.setItem('mm_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex items-center justify-center p-6 select-none">
      {/* Absolute halftone background */}
      <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none" />

      {/* Decorative radial gradients matching main colors */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-accent/5 filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full bg-accent-gold/5 filter blur-3xl pointer-events-none" />

      <div className="w-full max-w-[390px] min-h-[500px] flex flex-col justify-between relative z-10">
        
        {/* Step Indicator Progress Bar */}
        {step <= 2 && (
          <div className="flex gap-2 mb-8 px-4">
            <div className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-accent' : 'bg-border'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-accent' : 'bg-border'}`} />
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* STEP 1: Log In & Profile Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col justify-center space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex p-3 rounded-full bg-accent/5 border border-accent/10 mb-2">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-3xl font-serif tracking-tight leading-tight">
                  Your thoughts <br />deserve a private home.
                </h2>
                <p className="font-mono text-xs text-text-muted max-w-[280px] mx-auto leading-relaxed">
                  MicroMind is a local-first space. Your journal and settings stay fully on your device.
                </p>
              </div>

              {!showInputForm ? (
                <div className="space-y-3 px-2">
                  <button
                    onClick={() => handleSelectLogin('google')}
                    className="w-full py-4 rounded-full border border-border bg-surface/50 backdrop-blur-md hover:bg-surface text-xs font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-3 active:scale-[0.99]"
                  >
                    {/* Google SVG */}
                    <svg className="w-4 h-4 fill-text-primary" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.76 5.76 0 018.15 12.76a5.76 5.76 0 015.84-5.76c1.614 0 3.09.618 4.205 1.625l3.057-3.057C19.347 3.783 16.59 2.5 13.99 2.5A9.75 9.75 0 004.24 12.25a9.75 9.75 0 009.75 9.75c5.38 0 9.75-3.9 9.75-9.75 0-.649-.077-1.299-.234-1.965H12.24z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <button
                    onClick={() => handleSelectLogin('apple')}
                    className="w-full py-4 rounded-full border border-border bg-surface/50 backdrop-blur-md hover:bg-surface text-xs font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-3 active:scale-[0.99]"
                  >
                    {/* Apple SVG */}
                    <svg className="w-4 h-4 fill-text-primary" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.11.09 2.26-.57 2.95-1.39z" />
                    </svg>
                    <span>Continue with Apple</span>
                  </button>

                  <button
                    onClick={() => handleSelectLogin('email')}
                    className="w-full py-4 rounded-full border border-border bg-surface/50 backdrop-blur-md hover:bg-surface text-xs font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-3 active:scale-[0.99]"
                  >
                    <Mail className="w-4 h-4 text-text-primary" />
                    <span>Sign In with Email</span>
                  </button>

                  <div className="pt-4 text-center">
                    <button
                      onClick={skipStep1}
                      className="text-[10px] font-mono uppercase tracking-widest text-text-muted hover:text-accent transition-colors underline underline-offset-4"
                    >
                      Skip Setup (Instant Start)
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitStep1} className="space-y-4 px-2">
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted px-1">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex"
                        className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {loginMethod === 'email' && (
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted px-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alex@example.com"
                          className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="text-[10px] font-mono text-accent-gold text-center">{error}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowInputForm(false)}
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
            </motion.div>
          )}

          {/* STEP 2: Selecting Goals */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col justify-center space-y-8"
            >
              <div className="text-center space-y-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-accent-gold">Goals</span>
                <h2 className="text-3xl font-serif tracking-tight leading-tight">
                  What are your goals?
                </h2>
                <p className="font-mono text-xs text-text-muted max-w-[285px] mx-auto leading-relaxed">
                  Select the targets that matter to you. This helps tailor your mental reflections.
                </p>
              </div>

              <div className="space-y-3 px-1">
                {availableGoals.map((goal) => {
                  const isSelected = goals.includes(goal);
                  return (
                    <button
                      key={goal}
                      onClick={() => handleSelectGoal(goal)}
                      className={`w-full py-4 px-5 rounded-2xl border text-left text-xs font-mono transition-all duration-300 flex items-center justify-between group active:scale-[0.99] ${
                        isSelected
                          ? 'border-accent bg-accent/5 text-text-primary'
                          : 'border-border bg-surface/40 hover:border-text-muted text-text-primary/70'
                      }`}
                    >
                      <span>{goal}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-accent bg-accent text-bg'
                          : 'border-border bg-transparent group-hover:border-text-muted'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
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

          {/* STEP 3: Designing simulated personalization loading state */}
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
                  Personalizing interface, options, and writing prompts...
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Ready/Unlocking Checklist */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col justify-center space-y-8"
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

              {/* Checklist details card */}
              <div className="bg-surface/60 border border-border p-6 rounded-[2rem] space-y-5 relative overflow-hidden backdrop-blur-md">
                <div className="absolute inset-0 halftone-bg opacity-[0.03] pointer-events-none" />

                <div className="flex gap-4 items-start">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] text-accent font-bold shrink-0">1</div>
                  <div className="space-y-0.5">
                    <h4 className="font-serif text-sm font-bold text-text-primary">Start Journaling</h4>
                    <p className="font-mono text-[10px] text-text-muted leading-relaxed">Write daily thoughts, track your moods. Kept 100% locally and free.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] text-accent font-bold shrink-0">2</div>
                  <div className="space-y-0.5">
                    <h4 className="font-serif text-sm font-bold text-text-primary">Unlock AI Insights</h4>
                    <p className="font-mono text-[10px] text-text-muted leading-relaxed">Pay tiny amounts in cUSD only when requesting weekly patterns or summaries.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] text-accent font-bold shrink-0">3</div>
                  <div className="space-y-0.5">
                    <h4 className="font-serif text-sm font-bold text-text-primary">Disconnect Anytime</h4>
                    <p className="font-mono text-[10px] text-text-muted leading-relaxed">Swap between different wallets as you pay; your journal remains right here.</p>
                  </div>
                </div>
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
