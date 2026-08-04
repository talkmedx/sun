import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-cabinet' });

export const metadata: Metadata = {
  title: "Komal's Makeovers Management Tool",
  description: 'Enterprise makeup academy management — students, fees, inventory & more',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
