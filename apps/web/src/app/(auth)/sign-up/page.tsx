'use client';
import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { WalletAuthButton } from '@/components/wallet-auth-button';

export default function SignUp() {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password'));
    if (password.length < 12) {
      setError('Use at least 12 characters.');
      return;
    }
    const result = await authClient.signUp.email({
      name: String(data.get('name')),
      email: String(data.get('email')),
      password,
      callbackURL: '/onboarding',
    });
    if (result.error) setError('Registration failed. Check your details and try again.');
    else window.location.assign('/onboarding');
  }
  return (
    <main className="hero">
      <div className="eyebrow">New account</div>
      <h1>Start your registry.</h1>
      <form className="card" onSubmit={submit}>
        <label>
          Name
          <input name="name" required autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" type="submit">
          Create account
        </button>
        <p className="muted">
          <a href="/sign-in">Already have an account?</a>
        </p>
      </form>
      <div className="card">
        <WalletAuthButton mode="sign-up" />
      </div>
    </main>
  );
}
