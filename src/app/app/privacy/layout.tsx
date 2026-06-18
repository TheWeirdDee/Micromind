import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | MicroMind',
  description: 'MicroMind privacy policy. Your journal stays on your device — we never store your data.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
