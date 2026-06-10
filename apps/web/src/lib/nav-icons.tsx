import {
  LayoutDashboard,
  PlayCircle,
  Activity,
  Smartphone,
  MessageSquare,
  Megaphone,
  Webhook,
  Package,
  BookOpen,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  'getting-started': PlayCircle,
  status: Activity,
  sessions: Smartphone,
  messages: MessageSquare,
  campaigns: Megaphone,
  webhooks: Webhook,
  packages: Package,
  docs: BookOpen,
  settings: Settings,
};
