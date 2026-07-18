import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'OptimIEra', template: '%s | OptimIEra' },
  description: 'Privacy-first AI prompt optimization and verifiable 0G testnet evidence.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
