'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Session = { id: string; name: string; status: string };
type Message = {
  id: string;
  phoneNumber: string;
  content: string | null;
  status: string;
  createdAt: string;
  session: { name: string };
};

export default function MessagesPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [content, setContent] = useState('');

  const load = async () => {
    const [s, m] = await Promise.all([
      api<Session[]>('/api/v1/sessions'),
      api<Message[]>('/api/v1/messages'),
    ]);
    setSessions(s.filter((x) => x.status === 'connected'));
    setMessages(m);
    if (!sessionId && s[0]) setSessionId(s[0].id);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    await api('/api/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ sessionId, phoneNumber, content }),
    });
    setContent('');
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>

      <form onSubmit={onSend} className="card p-5 space-y-3">
        <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="w-full rounded-xl border border-[var(--border)] px-3 py-2 bg-transparent" required>
          <option value="">Select connected session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone number" className="w-full rounded-xl border border-[var(--border)] px-3 py-2 bg-transparent" required />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Message content" className="w-full rounded-xl border border-[var(--border)] px-3 py-2 bg-transparent min-h-[100px]" required />
        <button type="submit" className="btn-primary">Send message</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              <th className="text-left p-3">To</th>
              <th className="text-left p-3">Content</th>
              <th className="text-left p-3">Session</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className="border-t border-[var(--border)]">
                <td className="p-3">{m.phoneNumber}</td>
                <td className="p-3 max-w-md truncate">{m.content}</td>
                <td className="p-3">{m.session.name}</td>
                <td className="p-3"><span className={m.status === 'SENT' ? 'badge-green' : 'badge-gray'}>{m.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
