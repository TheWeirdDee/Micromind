import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Journal | MicroMind',
  description: 'Your private onchain journal. Write entries and unlock AI-powered reflections on Celo.',
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
