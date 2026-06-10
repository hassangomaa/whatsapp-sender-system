'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/Toast';

type Options<T> = {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: T) => void;
};

export function useMutation<T>(
  fn: () => Promise<T>,
  options: Options<T> = {},
) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fn();
      if (options.successMessage) success(options.successMessage);
      options.onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : options.errorMessage ?? 'Something went wrong';
      setError(msg);
      toastError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fn, options, success, toastError]);

  return { run, loading, error };
}
