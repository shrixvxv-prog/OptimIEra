'use client';

import { useState, type ReactNode } from 'react';

export function RedirectingActionForm({
  action,
  redirectTo,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<unknown>;
  redirectTo?: string;
  children: ReactNode;
  className?: string;
}) {
  const [error, setError] = useState('');

  async function submit(formData: FormData) {
    setError('');
    try {
      const result = await action(formData);
      const target = redirectTo ?? (typeof result === 'string' ? result : '');
      if (!target) throw new Error('REDIRECT_TARGET_MISSING');
      const separator = target.includes('?') ? '&' : '?';
      window.location.assign(`${target}${separator}updated=${Date.now()}`);
    } catch {
      setError('The operation could not be completed. Please try again.');
    }
  }

  return (
    <form action={submit} className={className}>
      {children}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
