import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Banters & Cash',
  description: 'FPL group tracker for live leaders, weekly winners, payments, and manager profiles.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
