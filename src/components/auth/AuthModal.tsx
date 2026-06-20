'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'signup' | 'forgot';

function UsernameStatus({ status }: { status: 'idle' | 'checking' | 'available' | 'taken' }) {
  if (status === 'idle') return null;
  if (status === 'checking') return <Loader2 className="w-3.5 h-3.5 text-text-muted animate-spin" />;
  if (status === 'available') return <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />;
  return <XCircle className="w-3.5 h-3.5 text-accent-gold" />;
}

export function AuthModal() {
  const { signUp, login, checkUsername, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  // login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // signup fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // shared state
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Debounced username availability check
  useEffect(() => {
    if (mode !== 'signup') return;
    const trimmed = username.trim();
    if (trimmed.length < 3) { setUsernameStatus('idle'); return; }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const result = await checkUsername(trimmed);
      setUsernameStatus(result === 'available' ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(timer);
  }, [username, mode, checkUsername]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (!loginEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(loginEmail, loginPassword, rememberMe);
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loginEmail, loginPassword, rememberMe, login]);

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('That username is already taken.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(username, email, password, rememberMe);
    } catch (err: any) {
      setError(err.message ?? 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [username, email, password, rememberMe, usernameStatus, signUp]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(forgotEmail);
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [forgotEmail, resetPassword]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setForgotSent(false);
    setUsernameStatus('idle');
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col items-center justify-start sm:justify-center p-6 pt-12 sm:pt-6 select-none overflow-y-auto">
      <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-accent/5 filter blur-3xl pointer-events-none" />

      <div className="w-full max-w-[390px] relative z-10">
        {/* Logo / wordmark */}
        <div className="text-center mb-8">
          <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-text-muted mb-1">Welcome to</p>
          <h1 className="text-4xl font-serif tracking-tight">MicroMind</h1>
        </div>

        {/* Mode tabs — only shown for login/signup */}
        {mode !== 'forgot' && (
          <div className="flex bg-surface border border-border rounded-2xl p-1 mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest transition-all duration-200 ${
                  mode === m
                    ? 'bg-accent text-bg font-bold shadow'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              {/* Email */}
              <div className="space-y-1.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted px-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="email"
                    value={loginEmail}
                    autoFocus
                    autoComplete="email"
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Password</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="font-mono text-[9px] text-accent hover:text-accent/80 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    autoComplete="current-password"
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 px-1 cursor-pointer select-none">
                <div
                  onClick={() => setRememberMe(p => !p)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-accent border-accent' : 'border-border bg-surface'}`}
                >
                  {rememberMe && <svg className="w-2.5 h-2.5 text-bg stroke-[3]" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="font-mono text-[10px] text-text-muted">Remember me</span>
              </label>

              {error && <p className="text-[10px] font-mono text-accent-gold text-center px-1">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="pill-button pill-button-primary w-full py-4 text-xs font-mono uppercase tracking-widest font-bold mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  : <span className="inline-flex items-center justify-center gap-1.5">Log In <ArrowRight className="w-3.5 h-3.5" /></span>
                }
              </button>
            </motion.form>
          )}

          {/* ── SIGNUP ── */}
          {mode === 'signup' && (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSignup}
              className="space-y-4"
            >
              {/* Username */}
              <div className="space-y-1.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted px-1">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    autoFocus
                    autoComplete="username"
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="choose_a_username"
                    className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <UsernameStatus status={usernameStatus} />
                  </div>
                </div>
                {usernameStatus === 'taken' && (
                  <p className="font-mono text-[9px] text-accent-gold px-1">Username is already taken.</p>
                )}
                {usernameStatus === 'available' && (
                  <p className="font-mono text-[9px] text-accent-green px-1">Username is available.</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted px-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted px-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="min. 6 characters"
                    className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 px-1 cursor-pointer select-none">
                <div
                  onClick={() => setRememberMe(p => !p)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-accent border-accent' : 'border-border bg-surface'}`}
                >
                  {rememberMe && <svg className="w-2.5 h-2.5 text-bg stroke-[3]" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="font-mono text-[10px] text-text-muted">Remember me on this device</span>
              </label>

              {error && <p className="text-[10px] font-mono text-accent-gold text-center px-1">{error}</p>}

              <button
                type="submit"
                disabled={loading || usernameStatus === 'taken'}
                className="pill-button pill-button-primary w-full py-4 text-xs font-mono uppercase tracking-widest font-bold mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  : <span className="inline-flex items-center justify-center gap-1.5">Create Account <ArrowRight className="w-3.5 h-3.5" /></span>
                }
              </button>
            </motion.form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted hover:text-text-primary transition-colors mb-2"
              >
                <ArrowLeft className="w-3 h-3" /> Back to Log In
              </button>

              <div className="text-center space-y-1 pb-2">
                <h2 className="font-serif text-xl">Reset Password</h2>
                <p className="font-mono text-[10px] text-text-muted">
                  Enter the email you signed up with and we will send you a reset link.
                </p>
              </div>

              {forgotSent ? (
                <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 text-center space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-accent mx-auto" />
                  <p className="font-mono text-xs text-text-primary">Reset link sent!</p>
                  <p className="font-mono text-[10px] text-text-muted">Check your email inbox and follow the link to reset your password.</p>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="mt-2 font-mono text-[10px] text-accent hover:text-accent/80 transition-colors"
                  >
                    Back to Log In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] uppercase tracking-widest text-text-muted px-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                      <input
                        type="email"
                        value={forgotEmail}
                        autoFocus
                        autoComplete="email"
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-surface border border-border rounded-2xl px-12 py-3.5 text-sm font-mono focus:border-accent outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {error && <p className="text-[10px] font-mono text-accent-gold text-center px-1">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="pill-button pill-button-primary w-full py-4 text-xs font-mono uppercase tracking-widest font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      : <span className="inline-flex items-center justify-center gap-1.5">Send Reset Link <ArrowRight className="w-3.5 h-3.5" /></span>
                    }
                  </button>
                </form>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        <p className="text-center font-mono text-[9px] text-text-muted mt-6 leading-relaxed">
          Your journal is encrypted and synced across all your devices.
        </p>
      </div>
    </div>
  );
}
