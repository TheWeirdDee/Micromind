'use client';

import { AlertTriangle } from 'lucide-react';

export function AgentWarning() {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;

  if (agentUrl) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl mb-8 flex gap-4 animate-fade-up">
      <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
      <div className="space-y-2">
        <p className="font-mono text-xs text-red-500 font-bold uppercase tracking-widest">
          ⚠ Agent URL not configured
        </p>
        <p className="font-mono text-[10px] text-text-muted leading-relaxed">
          Add <code className="bg-red-500/20 px-1 rounded text-red-500">NEXT_PUBLIC_AGENT_API_URL=http://localhost:3001</code> to your <code className="bg-red-500/20 px-1 rounded text-red-500">.env.local</code> to enable AI features.
        </p>
      </div>
    </div>
  );
}
