export type NavItem = {
  href: string;
  label: string;
  iconKey: string;
  description?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', iconKey: 'dashboard', description: 'Stats & activation funnel' },
      { href: '/getting-started', label: 'Getting started', iconKey: 'getting-started', description: 'Login → QR → API in 5 min' },
      { href: '/status', label: 'Status center', iconKey: 'status', description: 'Session & quota health' },
    ],
  },
  {
    title: 'WhatsApp',
    items: [
      { href: '/sessions', label: 'Sessions', iconKey: 'sessions', description: 'Devices & API keys' },
      { href: '/messages', label: 'Messages', iconKey: 'messages', description: 'Send & history' },
      { href: '/campaigns', label: 'Bulk campaigns', iconKey: 'campaigns', description: 'Bulk sends' },
      { href: '/webhooks', label: 'Webhooks', iconKey: 'webhooks', description: 'Delivery log & retry' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/packages', label: 'Packages', iconKey: 'packages', description: 'Plans & quotas' },
      { href: '/docs', label: 'API docs', iconKey: 'docs', description: 'Public API reference' },
      { href: '/settings', label: 'Settings', iconKey: 'settings', description: 'Profile & workspace' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
