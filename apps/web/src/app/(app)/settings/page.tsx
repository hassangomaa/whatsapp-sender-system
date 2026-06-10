'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/Toast';

type Settings = {
  user: { name: string | null; email: string | null; phone: string | null };
  workspace: { name: string; defaultWebhookUrl: string | null };
};

type Session = { id: string; name: string; webhookUrl: string | null };

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Settings>('/api/v1/settings'),
      api<Session[]>('/api/v1/sessions'),
    ])
      .then(([s, sess]) => {
        setSettings(s);
        setSessions(sess);
        setName(s.user.name ?? '');
        setWorkspaceName(s.workspace.name);
        if (sess[0]) {
          setSessionId(sess[0].id);
          setWebhookUrl(sess[0].webhookUrl ?? '');
        }
      })
      .catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [toastError]);

  useEffect(() => {
    const s = sessions.find((x) => x.id === sessionId);
    if (s) setWebhookUrl(s.webhookUrl ?? '');
  }, [sessionId, sessions]);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api<Settings>('/api/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify({ name: name || undefined, workspaceName }),
      });
      setSettings(updated);
      success('Profile saved');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveWebhook(e: FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    setSavingWebhook(true);
    try {
      await api(`/api/v1/sessions/${sessionId}/scopes`, {
        method: 'PATCH',
        body: JSON.stringify({ webhook: true, webhookUrl: webhookUrl || null }),
      });
      success('Webhook saved');
      const sess = await api<Session[]>('/api/v1/sessions');
      setSessions(sess);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Webhook save failed');
    } finally {
      setSavingWebhook(false);
    }
  }

  if (loading) return <LoadingState label="Loading settings..." />;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" description="Configure session webhooks for incoming messages." />

      <form onSubmit={onSaveProfile} className="card p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Phone" value={settings?.user.phone ? `+${settings.user.phone}` : '—'} disabled />
        <Input label="Email" value={settings?.user.email ?? '—'} disabled />
        <Input label="Workspace name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} required />
        <Button type="submit" loading={saving}>Save profile</Button>
      </form>

      <form onSubmit={onSaveWebhook} className="card p-6 space-y-4">
        <h2 className="font-semibold">Session webhook</h2>
        <Select label="Session" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        {!webhookUrl && (
          <p className="text-sm text-[var(--muted)]">No webhook configured for this session yet.</p>
        )}
        <Input
          label="Webhook URL"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://myserver.com/whatsapp/incoming"
          hint="The same webhook URL cannot be added to another session from this page."
        />
        <div className="flex justify-end">
          <Button type="submit" loading={savingWebhook}>Save webhook</Button>
        </div>
      </form>
    </div>
  );
}
