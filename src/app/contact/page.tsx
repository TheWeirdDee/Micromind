'use client';

import { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Mail, MessageSquare, Send, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

export default function ContactPage() {
  const [formType, setFormType] = useState<"bug" | "feedback" | "general">("bug");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("micromind16@gmail.com");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenMail = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoSubject = encodeURIComponent(`[${formType.toUpperCase()}] ${subject || 'MicroMind Inquiry'}`);
    const mailtoBody = encodeURIComponent(
      `Type: ${formType}\n\nDescription:\n${description}\n\n---\nSent via MicroMind App Support`
    );
    window.location.href = `mailto:micromind16@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-bg py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-80 h-80 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="container mx-auto max-w-5xl relative z-10 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Left Column — Info */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-xl text-accent font-mono text-[10px] uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Support Channels</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-serif text-text-primary tracking-tight leading-tight">
                Report an Issue
              </h1>
              
              <p className="font-mono text-xs text-text-muted leading-relaxed">
                Have you spotted a bug, encountered a translation mismatch during the Clarity Quest, or have suggestions for our journaling features? Get in touch with us through our direct support channels.
              </p>

              <div className="space-y-4 pt-4">
                {/* Email Card */}
                <div className="bg-surface border border-border p-5 rounded-2xl space-y-2.5 relative group">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Direct Email</span>
                    <button
                      onClick={handleCopyEmail}
                      className="text-[9px] font-mono text-accent-gold hover:underline"
                    >
                      {isCopied ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="font-serif text-xl text-text-primary">micromind16@gmail.com</p>
                  <a
                    href="mailto:micromind16@gmail.com"
                    className="inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:underline pt-1.5"
                  >
                    <span>Launch mail app</span>
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </div>

                {/* X Card */}
                <div className="bg-surface border border-border p-5 rounded-2xl space-y-2.5 relative group">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted block">Follow Us / DM</span>
                  <p className="font-serif text-xl text-text-primary">@micromindapp</p>
                  <a
                    href="https://x.com/micromindapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:underline pt-1.5"
                  >
                    <span>Visit on X (Twitter)</span>
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column — Email Template Builder Form */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-[2.5rem] p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-serif text-2xl text-text-primary">Draft a Report</h3>
                <p className="font-mono text-[10px] text-text-muted mt-1">
                  Format your report below to automatically construct a mail template.
                </p>
              </div>

              <form onSubmit={handleOpenMail} className="space-y-4 font-mono text-xs">
                {/* Form Type */}
                <div className="space-y-1.5">
                  <label className="text-text-muted uppercase text-[9px] tracking-wider font-bold">Issue Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['bug', 'feedback', 'general'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormType(type)}
                        className={`py-2 px-3 border rounded-xl font-bold transition-all text-center capitalize ${
                          formType === type
                            ? 'bg-accent/15 border-accent text-accent'
                            : 'bg-surface-2 border-border text-text-muted hover:border-text-muted'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-text-muted uppercase text-[9px] tracking-wider font-bold block">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stage 3 hint formatting error"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-text-muted uppercase text-[9px] tracking-wider font-bold block">Description Details</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Provide details about the issue or feedback..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent transition-colors resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full pill-button pill-button-primary py-3.5 flex items-center justify-center gap-2 hover:bg-white text-bg font-bold transition-all mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Report via Email</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
