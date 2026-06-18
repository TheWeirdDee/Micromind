import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | MicroMind',
  description: 'Learn about MicroMind — the AI journaling app built on Celo with onchain payments.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
