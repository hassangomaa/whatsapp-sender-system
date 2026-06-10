export type NavItem = {
  href: string;
  label: string;
  icon: string;
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
      { href: '/dashboard', label: 'Dashboard', icon: '◉', description: 'Stats & activation funnel' },
      { href: '/getting-started', label: 'Getting started', icon: '▶', description: 'Login → QR → API in 5 min' },
      { href: '/status', label: 'Status center', icon: '◈', description: 'Session & quota health' },
    ],
  },
  {
    title: 'WhatsApp',
    items: [
      { href: '/sessions', label: 'Sessions', icon: '◎', description: 'Devices & API keys' },
      { href: '/messages', label: 'Messages', icon: '✉', description: 'Send & history' },
      { href: '/campaigns', label: 'Campaigns', icon: '▤', description: 'Bulk sends' },
      { href: '/webhooks', label: 'Webhooks', icon: '⇄', description: 'Delivery log & retry' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/packages', label: 'Packages', icon: '◆', description: 'Plans & quotas' },
      { href: '/docs', label: 'API docs', icon: '⌘', description: 'Public API reference' },
      { href: '/settings', label: 'Settings', icon: '⚙', description: 'Profile & workspace' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
