'use client';

import { useState } from 'react';
import { Button } from './ui/Button';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" onClick={copy} className="text-xs">
      {copied ? 'Copied!' : label}
    </Button>
  );
}
