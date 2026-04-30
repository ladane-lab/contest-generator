import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DSA Contest Arena — Professional Coding Platform',
  description: 'Real-time DSA coding contest platform. Solve algorithmic challenges, compete live, and track your rank on the leaderboard.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
