import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhatsApp Sender',
  description: 'Send WhatsApp messages programmatically',
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
      <body>{children}</body>
    </html>
  );
}
