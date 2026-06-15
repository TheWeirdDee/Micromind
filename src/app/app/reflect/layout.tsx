import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reflect | MicroMind',
  description: 'Get AI-powered reflection insights from your journal entries. Pay per prompt with cUSD on Celo.',
};

export default function ReflectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
