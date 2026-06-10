import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'WhatsApp Sender — Multi-tenant WhatsApp API',
    template: '%s | WhatsApp Sender',
  },
  description: 'Send WhatsApp messages programmatically. Sessions, QR pairing, bulk campaigns, and API keys.',
  openGraph: {
    title: 'WhatsApp Sender',
    description: 'Multi-tenant WhatsApp messaging SaaS',
    siteName: 'WhatsApp Sender',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'WhatsApp Sender' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const stored = localStorage.getItem('theme');
                const dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (dark) document.documentElement.classList.add('dark');
              } catch {}
            })();`,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
