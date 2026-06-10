'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/Toast';

type Settings = {
  user: { name: string | null; email: string };
  workspace: { name: string; defaultWebhookUrl: string | null };
};

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [defaultWebhookUrl, setDefaultWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Settings>('/api/v1/settings')
      .then((s) => {
        setSettings(s);
        setName(s.user.name ?? '');
        setWorkspaceName(s.workspace.name);
        setDefaultWebhookUrl(s.workspace.defaultWebhookUrl ?? '');
      })
      .catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [toastError]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api<Settings>('/api/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name || undefined,
          workspaceName,
          defaultWebhookUrl: defaultWebhookUrl || null,
        }),
      });
      setSettings(updated);
      success('Settings saved');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading settings..." />;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" description="Manage your profile and workspace defaults." />

      <form onSubmit={onSave} className="card p-6 space-y-5">
        <div>
          <h2 className="font-semibold mb-3">Profile</h2>
          <div className="space-y-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={settings?.user.email ?? ''} disabled />
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Workspace</h2>
          <Input label="Workspace name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} required />
        </div>

        <div>
          <h2 className="font-semibold mb-3">Webhooks</h2>
          <Input
            label="Default webhook URL"
            value={defaultWebhookUrl}
            onChange={(e) => setDefaultWebhookUrl(e.target.value)}
            placeholder="https://your-app.com/webhooks/whatsapp"
          />
          <p className="text-xs text-[var(--muted)] mt-1">Used for webhook tests when no session URL is set.</p>
        </div>

        <Button type="submit" loading={saving}>Save changes</Button>
      </form>
    </div>
  );
}
