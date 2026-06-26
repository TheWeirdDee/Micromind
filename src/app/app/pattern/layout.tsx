import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pattern Analysis | MicroMind',
  description: 'Discover emotional patterns across your journal entries with AI. Pay per prompt with USDm on Celo.',
};

export default function PatternLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
