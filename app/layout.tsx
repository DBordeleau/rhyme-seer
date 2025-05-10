import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';

// Load the Inter font
const inter = Inter({
  subsets: ['latin'],
  display: 'optional', // Changed from 'swap' to 'optional'
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Rhyme Seer | Visualize Rhyme Patterns',
  description: 'Detect and visualize rhyme schemes in lyrics, poetry, and rap. Highlight matching rhyme patterns automatically.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" />
      </head>
      <body className="bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
        <div className="min-h-screen flex flex-col">

          <main className="flex-grow px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}