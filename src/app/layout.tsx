import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getTopTags } from '@/app/actions';
import AppLayout from '@/components/Layout';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '🧠 Brain — Bruno\'s Second Brain',
  description: 'Personal knowledge base for Bruno and AI agents',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let tags: Awaited<ReturnType<typeof getTopTags>> = [];
  try {
    tags = await getTopTags(20);
  } catch {
    // DB not configured yet
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppLayout tags={tags}>{children}</AppLayout>
      </body>
    </html>
  );
}
