'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Sparkles, Send, CheckCircle2, ChevronRight, PenTool, Inbox, Reply } from 'lucide-react';

export function HeartfeltLetters() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isPolished, setIsPolished] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [openedEmail, setOpenedEmail] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasPlayedInViewport, setHasPlayedInViewport] = useState(false);

  const draftMessage = "Hey mom, just wanted to say thank you for always supporting me. Sorry I haven't called as much lately, I've been busy but I always think about you. You're the best.";
  const polishedMessage = "Dear Mom, I wanted to send a small note to let you know how much I appreciate you. Life has been moving fast lately, but your constant love and support are always on my mind. Thank you for being such an incredible presence in my life. With love, Alex.";

  // Scroll pinning observer
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      // Trigger when the section top is partially in view
      if (entry.isIntersecting && !hasPlayedInViewport) {
        setHasPlayedInViewport(true);
        setIsAutoPlaying(true);
        setIsLocked(true);
        
        // Smoothly scroll the card container into the center of the viewport
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, { threshold: 0.1 });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [hasPlayedInViewport]);

  // Handle body scroll lock via event prevention and overflow toggle
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    const keysToPrevent = ['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'End', 'Home'];
    const preventKeyScroll = (e: KeyboardEvent) => {
      if (keysToPrevent.includes(e.code)) {
        e.preventDefault();
      }
    };

    let overflowTimeout: NodeJS.Timeout;

    if (isLocked) {
      // 1. Immediately block user scroll inputs (wheel, touch, keys)
      // This allows the programmatic scrollIntoView to complete without interruption
      window.addEventListener('wheel', preventDefault, { passive: false });
      window.addEventListener('touchmove', preventDefault, { passive: false });
      window.addEventListener('keydown', preventKeyScroll, { passive: false });

      // 2. Set overflow hidden after a short delay so centering animation completes first
      overflowTimeout = setTimeout(() => {
        document.body.style.overflow = 'hidden';
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }, 600);
    } else {
      // Clean up locks
      window.removeEventListener('wheel', preventDefault);
      window.removeEventListener('touchmove', preventDefault);
      window.removeEventListener('keydown', preventKeyScroll);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      clearTimeout(overflowTimeout);
      window.removeEventListener('wheel', preventDefault);
      window.removeEventListener('touchmove', preventDefault);
      window.removeEventListener('keydown', preventKeyScroll);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isLocked]);

  const handlePolish = () => {
    setIsPolishing(true);
    const t = setTimeout(() => {
      setIsPolishing(false);
      setIsPolished(true);
      setStep(2);
    }, 500);
    return () => clearTimeout(t);
  };

  const handleSend = () => {
    setIsSending(true);
    const t = setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
      setStep(3);
    }, 500);
    return () => clearTimeout(t);
  };

  const handleReset = () => {
    setStep(1);
    setIsPolished(false);
    setIsPolishing(false);
    setIsSending(false);
    setIsSent(false);
    setOpenedEmail(false);
    setProgress(0);
  };

  const handleRestartDemo = () => {
    handleReset();
    setIsAutoPlaying(true);
    setIsLocked(true);
  };

  const handleManualAction = () => {
    setIsAutoPlaying(false);
    setIsLocked(false);
  };

  // Robust async flow to avoid useEffect timeout cleanups cancel-races
  useEffect(() => {
    if (!isAutoPlaying) {
      setIsLocked(false);
      return;
    }

    let active = true;

    const runAutoplay = async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Reset initially
      if (!active) return;
      handleReset();

      // Step 1: Draft shown. Progress goes 0 -> 35%
      setProgress(15);
      await delay(700);
      if (!active) return;

      setIsPolishing(true);
      setProgress(35);
      await delay(500);
      if (!active) return;

      setIsPolishing(false);
      setIsPolished(true);
      setStep(2);
      setProgress(55);
      await delay(700);
      if (!active) return;

      setIsSending(true);
      setProgress(75);
      await delay(500);
      if (!active) return;

      setIsSending(false);
      setIsSent(true);
      setStep(3);
      setProgress(90);
      await delay(500);
      if (!active) return;

      setOpenedEmail(true);
      setProgress(100);
      await delay(1200);
      if (!active) return;

      setIsAutoPlaying(false);
      setIsLocked(false);
    };

    runAutoplay();

    return () => {
      active = false;
    };
  }, [isAutoPlaying]);

  return (
    <div ref={sectionRef}>
      <section id="letters" className="py-24 md:py-32 px-6 bg-bg relative border-t border-border overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-accent/2 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent-gold/2 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10">
          
          {/* Section Header */}
          <div className="text-left max-w-3xl mb-16 space-y-4">
            <span className="font-mono text-[10px] tracking-widest uppercase text-accent-gold">Expressive Tools</span>
            <h2 className="text-3xl md:text-5xl font-serif leading-tight text-text-primary">
              Send Heartfelt Letters. <br />
              <span className="italic text-accent">Polished by AI, delivered to their inbox.</span>
            </h2>
            <p className="font-mono text-xs md:text-sm text-text-muted leading-relaxed max-w-2xl">
              Some thoughts are meant to be shared. Write a personal letter to a parent, friend, or loved one. Send it as a raw draft for free, or use our AI Companion to gently polish your words into an eloquent keepsake before delivery.
            </p>
          </div>

          {/* Interactive Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Workflow Navigation & Explanations */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Step Indicators */}
              <div className="space-y-4">
                
                {/* Step 1 */}
                <button 
                  onClick={() => { handleManualAction(); setStep(1); handleReset(); }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                    step === 1 
                      ? 'bg-surface border-accent/20 shadow-lg' 
                      : 'border-transparent hover:bg-surface/40'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                    step === 1 ? 'bg-accent/15 border-accent text-accent' : 'bg-surface-2 border-border text-text-muted'
                  }`}>
                    <PenTool className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] tracking-wider uppercase text-text-muted">Step 1</span>
                    <h4 className="font-serif text-base text-text-primary">Draft Your Letter</h4>
                    <p className="font-mono text-[11px] text-text-muted/80 leading-relaxed">
                      Write naturally about what is on your mind. No filters, no pressure.
                    </p>
                  </div>
                </button>

                {/* Step 2 */}
                <button 
                  onClick={() => { handleManualAction(); setStep(2); setIsSent(false); setOpenedEmail(false); }}
                  disabled={!isPolished}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                    !isPolished ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    step === 2 
                      ? 'bg-surface border-accent/20 shadow-lg' 
                      : 'border-transparent hover:bg-surface/40'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                    step === 2 ? 'bg-accent-gold/15 border-accent-gold text-accent-gold' : 'bg-surface-2 border-border text-text-muted'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] tracking-wider uppercase text-text-muted">Step 2</span>
                    <h4 className="font-serif text-base text-text-primary">Optional AI Polish</h4>
                    <p className="font-mono text-[11px] text-text-muted/80 leading-relaxed">
                      Choose to refine your tone. AI elevates your message while preserving your core sentiments.
                  </p>
                </div>
              </button>

              {/* Step 3 */}
              <button 
                onClick={() => { handleManualAction(); setStep(3); }}
                disabled={!isSent}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                  !isSent ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  step === 3 
                    ? 'bg-surface border-accent/20 shadow-lg' 
                    : 'border-transparent hover:bg-surface/40'
                }`}
              >
                <div className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                  step === 3 ? 'bg-accent-green/15 border-accent-green text-accent-green' : 'bg-surface-2 border-border text-text-muted'
                }`}>
                  <Mail className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[9px] tracking-wider uppercase text-text-muted">Step 3</span>
                  <h4 className="font-serif text-base text-text-primary">Recipient Receives Email</h4>
                  <p className="font-mono text-[11px] text-text-muted/80 leading-relaxed">
                    The letter lands directly in their email inbox as a beautiful, ad-free digital card.
                  </p>
                </div>
              </button>

            </div>

            {/* Restart Controls */}
            <div className="flex items-center gap-4 pl-5 pt-2">
              <button 
                onClick={handleRestartDemo}
                className="font-mono text-[10px] text-accent hover:underline uppercase tracking-wider flex items-center gap-1.5"
              >
                Replay Autoplay Demo
              </button>
            </div>

          </div>

          {/* Right Column: Live Interactive Demo Mockup */}
          <div className="lg:col-span-7">
            <div className="bg-surface-2 border border-border rounded-[2.5rem] p-6 md:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.4)] relative overflow-hidden min-h-[460px] flex flex-col justify-between">
              
              {/* Autoplay Progress Bar */}
              {isAutoPlaying && (
                <div className="absolute top-0 left-0 w-full h-[3px] bg-border/20 z-20">
                  <motion.div 
                    className="h-full bg-accent-gold"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              )}

              <div className="absolute inset-0 halftone-bg opacity-3 pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 flex-grow flex flex-col justify-between"
                  >
                    {/* Writing Form Preview */}
                    <div className="space-y-4">
                      {/* Meta Fields */}
                      <div className="grid grid-cols-2 gap-4 border-b border-border/60 pb-4 font-mono text-[11px]">
                        <div>
                          <span className="text-text-muted uppercase tracking-widest block text-[9px]">To:</span>
                          <span className="text-text-primary font-medium">mom@email.com</span>
                        </div>
                        <div>
                          <span className="text-text-muted uppercase tracking-widest block text-[9px]">From:</span>
                          <span className="text-text-primary font-medium">Alex</span>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-text-muted">Letter Content</span>
                        <div className="bg-bg/40 border border-border/40 rounded-2xl p-5 min-h-[140px] text-sm text-text-primary font-mono leading-relaxed relative">
                          {draftMessage}
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/60">
                      <button 
                        onClick={() => { handleManualAction(); handleSend(); }}
                        className="flex-1 pill-button border border-border text-text-primary bg-bg hover:bg-surface transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send Original (Free)
                      </button>
                      
                      <button 
                        onClick={() => { handleManualAction(); handlePolish(); }}
                        disabled={isPolishing}
                        className="flex-1 pill-button pill-button-primary bg-accent-gold hover:bg-white text-bg relative overflow-hidden disabled:opacity-80"
                      >
                        {isPolishing ? (
                          <div className="flex items-center gap-2">
                            <motion.span 
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="inline-block"
                            >
                              <Sparkles className="w-4 h-4 text-bg" />
                            </motion.span>
                            <span>Polishing text...</span>
                          </div>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Apply AI Polish (0.01 cUSD)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 flex-grow flex flex-col justify-between"
                  >
                    {/* Polish Comparison View */}
                    <div className="space-y-4">
                      {/* Compare Badges */}
                      <div className="flex justify-between items-center border-b border-border/60 pb-3 font-mono text-[10px]">
                        <span className="text-text-muted">Review Polished Output</span>
                        <span className="text-accent-gold bg-accent-gold/10 border border-accent-gold/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> AI Enhanced
                        </span>
                      </div>

                      {/* Side-by-side comparison */}
                      <div className="space-y-4 font-mono text-xs">
                        <div className="opacity-55 border-l-2 border-border pl-3.5 space-y-1">
                          <span className="text-[9px] uppercase tracking-widest text-text-muted">Original draft:</span>
                          <p className="line-clamp-2 leading-relaxed italic">"{draftMessage}"</p>
                        </div>
                        
                        <div className="space-y-1.5 bg-accent-gold/3 border border-accent-gold/15 p-4 rounded-2xl relative">
                          <span className="text-[9px] uppercase tracking-widest text-accent-gold font-bold">AI polished version:</span>
                          <p className="text-sm leading-relaxed text-text-primary">
                            {polishedMessage}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex gap-3 pt-4 border-t border-border/60">
                      <button 
                        onClick={() => { handleManualAction(); setStep(1); }}
                        className="pill-button pill-button-outline flex-1 py-3.5 text-xs"
                      >
                        Edit Draft
                      </button>
                      <button 
                        onClick={() => { handleManualAction(); handleSend(); }}
                        disabled={isSending}
                        className="pill-button pill-button-primary flex-1 py-3.5 text-xs bg-accent text-bg hover:opacity-90 relative overflow-hidden"
                      >
                        {isSending ? (
                          <div className="flex items-center gap-2">
                            <motion.span 
                              animate={{ scale: [1, 1.15, 1] }}
                              transition={{ repeat: Infinity, duration: 1 }}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </motion.span>
                            <span>Sending letter...</span>
                          </div>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Confirm & Send Letter</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6 flex-grow flex flex-col justify-between"
                  >
                    {/* Inbox View */}
                    <div className="space-y-5">
                      {/* Recipient Inbox Header */}
                      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                        <Inbox className="w-4 h-4 text-accent" />
                        <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
                          Mom's Email Inbox (via MicroMind)
                        </span>
                        <span className="ml-auto w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                      </div>

                      {/* Inbox List */}
                      <AnimatePresence mode="wait">
                        {!openedEmail ? (
                          <motion.div
                            key="inbox-list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { handleManualAction(); setOpenedEmail(true); }}
                            className="bg-bg border border-accent/20 p-4 rounded-2xl cursor-pointer hover:border-accent transition group relative"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-serif text-sm font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                Alex
                              </span>
                              <span className="font-mono text-[9px] text-text-muted/70">Just now</span>
                            </div>
                            <h5 className="font-mono text-xs text-accent-gold font-medium mb-1">
                              {isPolished ? 'A Small Note of Gratitude' : 'Just thinking of you'}
                            </h5>
                            <p className="font-mono text-[11px] text-text-muted line-clamp-1">
                              {isPolished ? polishedMessage : draftMessage}
                            </p>
                            <span className="absolute bottom-2 right-4 font-mono text-[8px] uppercase tracking-wider text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              Open Email <ChevronRight className="w-3 h-3" />
                            </span>
                          </motion.div>
                        ) : (
                          /* Opened Email Rendering */
                          <motion.div
                            key="opened-email"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-[#F5F5F0] text-[#1E1E1E] p-6 rounded-2xl space-y-4 shadow-xl border border-white/80"
                          >
                            <div className="border-b border-[#E1E1D9] pb-3 text-left">
                              <div className="flex justify-between text-[10px] text-[#7A7A72] font-mono mb-1">
                                <span>From: Alex (via MicroMind)</span>
                                <span>Just now</span>
                              </div>
                              <h4 className="font-serif text-base text-[#121210] font-bold">
                                {isPolished ? 'A Small Note of Gratitude' : 'Just thinking of you'}
                              </h4>
                            </div>

                            <p className="font-mono text-xs leading-relaxed text-[#3A3A35] whitespace-pre-wrap">
                              {isPolished ? polishedMessage : draftMessage}
                            </p>

                            <div className="pt-3 border-t border-[#E1E1D9] flex justify-between items-center">
                              <span className="font-serif text-[9px] tracking-wide text-[#7A7A72] italic">
                                Sent privately using MicroMind
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleManualAction(); alert('Replies can be sent directly back via their native email client!'); }}
                                className="px-3 py-1.5 bg-[#1E1E1E] text-[#F5F5F0] hover:bg-[#32322E] rounded-lg text-[9px] font-mono flex items-center gap-1 transition-colors"
                              >
                                <Reply className="w-3 h-3" /> Reply Privately
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Status Alert */}
                    <div className="flex items-center gap-2 p-3 bg-accent-green/10 border border-accent-green/20 rounded-xl text-accent-green font-mono text-[10px] justify-center mt-4">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Letter successfully delivered via MicroMind.</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>
    </section>
  </div>
  );
}
