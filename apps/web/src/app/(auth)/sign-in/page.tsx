'use client';
import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { WalletAuthButton } from '@/components/wallet-auth-button';

export default function SignIn() {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get('email')),
      password: String(data.get('password')),
      callbackURL: '/app',
    });
    if (result.error) setError('Sign-in failed. Check your details and try again.');
    else window.location.assign('/app');
  }
  return (
    <main className="hero">
      <div className="eyebrow">Account access</div>
      <h1>Sign in to Studio.</h1>
      <form className="card" onSubmit={submit}>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" type="submit">
          Sign in
        </button>
        <p className="muted">
          <a href="/sign-up">Create an account</a> · <a href="/forgot-password">Forgot password?</a>
        </p>
      </form>
      <div className="card">
        <WalletAuthButton mode="sign-in" />
      </div>
    </main>
  );
}
