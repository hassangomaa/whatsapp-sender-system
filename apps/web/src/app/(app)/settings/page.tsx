'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ user: { name: string | null; email: string }; workspace: { name: string } } | null>(null);

  useEffect(() => {
    authApi.me().then(setProfile).catch(console.error);
  }, []);

  if (!profile) return <div>Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold">Profile</h2>
        <p><span className="text-[var(--muted)]">Name:</span> {profile.user.name ?? '—'}</p>
        <p><span className="text-[var(--muted)]">Email:</span> {profile.user.email}</p>
      </div>
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold">Workspace</h2>
        <p><span className="text-[var(--muted)]">Name:</span> {profile.workspace.name}</p>
        <p className="text-sm text-[var(--muted)]">Configure per-session webhooks on the Sessions detail page.</p>
      </div>
    </div>
  );
}
