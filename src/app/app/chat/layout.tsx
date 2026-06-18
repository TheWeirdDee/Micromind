import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Chat | MicroMind',
  description: 'Chat with AI powered by Llama-3.3. Pay per prompt with cUSD on Celo.',
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
