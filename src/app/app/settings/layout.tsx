import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | MicroMind',
  description: 'Manage your MicroMind account, export your journal, and configure your preferences.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
