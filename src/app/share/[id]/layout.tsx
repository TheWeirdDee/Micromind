import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shared Reflection | MicroMind',
  description: 'A shared AI-generated reflection or pattern insight from MicroMind, a private journaling app on Celo.',
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
