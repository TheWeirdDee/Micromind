import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Send CELO | MicroMind',
  description: 'Transfer CELO to any address directly from MicroMind.',
};

export default function SendLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
