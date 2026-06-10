'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/80 dark:border-green-800 dark:text-green-200'
                : t.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/80 dark:border-red-800 dark:text-red-200'
                  : 'bg-[var(--card)] border-[var(--border)]'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
