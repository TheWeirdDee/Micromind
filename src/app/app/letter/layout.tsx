import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Letter Writer | MicroMind',
  description: 'Write heartfelt letters with AI assistance. Pay per prompt with cUSD on Celo.',
};

export default function LetterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
