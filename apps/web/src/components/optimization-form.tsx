'use client';

import { useState, type ReactNode } from 'react';
import { createOptimization } from '@/app/app/optimize/actions';

export function OptimizationForm({ children }: { children: ReactNode }) {
  const [error, setError] = useState('');

  async function submit(formData: FormData) {
    setError('');
    try {
      const optimizationId = await createOptimization(formData);
      window.location.assign(`/app/optimizations/${optimizationId}`);
    } catch {
      setError('Optimization could not be completed. Review the form and try again.');
    }
  }

  return (
    <form className="stack" action={submit}>
      {children}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
