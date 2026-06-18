import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'History | MicroMind',
  description: 'View your full onchain prompt history and transaction records on Celo.',
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
