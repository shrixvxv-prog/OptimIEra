'use client';
import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email'));
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    setSent(true);
  }
  return (
    <main className="hero">
      <div className="eyebrow">Account security</div>
      <h1>Reset access.</h1>
      {sent ? (
        <p className="lede">
          If an account matches, local development will show a redacted reset notification in the
          server log.
        </p>
      ) : (
        <form className="card" onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <button className="button primary">Request reset</button>
        </form>
      )}
    </main>
  );
}
