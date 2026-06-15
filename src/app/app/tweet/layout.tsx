import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Tweet Writer | MicroMind',
  description: 'Generate viral tweets with AI. Pay per prompt with cUSD on Celo.',
};

export default function TweetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
