import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://whatsapp.arheb.net';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/', '/login', '/register'], disallow: ['/dashboard', '/sessions', '/api'] },
    sitemap: `${base}/sitemap.xml`,
  };
}
