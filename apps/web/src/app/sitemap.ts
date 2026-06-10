import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://whatsapp.arheb.net';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/login', '/register', '/dashboard', '/sessions', '/messages', '/campaigns', '/packages', '/status', '/docs'];
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'daily',
    priority: path === '' ? 1 : 0.7,
  }));
}
