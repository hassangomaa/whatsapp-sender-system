'use client';

import { ReactNode } from 'react';
import { Button } from './ui/Button';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading,
  onConfirm,
  onCancel,
  children,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div className="relative card p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-[var(--muted)] mt-2">{description}</p>}
        {children}
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
