
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { ScheduleProvider } from '@/context/ScheduleContext';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'ITU Schedule Archive',
  description: 'Modern, searchable archive of ITU course schedules.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} antialiased min-h-screen flex flex-col pt-16`}>
        <ScheduleProvider>
          <Navbar />
          {children}
        </ScheduleProvider>
      </body>
    </html>
  );
}
