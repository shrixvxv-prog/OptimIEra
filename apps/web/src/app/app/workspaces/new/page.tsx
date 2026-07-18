'use client';
import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
export default function NewWorkspace() {
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const result = await authClient.organization.create({
      name: String(d.get('name')),
      slug: String(d.get('slug')),
    });
    if (result.error) setError('Workspace could not be created.');
    else window.location.assign('/app/workspaces');
  }
  return (
    <main className="appmain">
      <div className="eyebrow">New workspace</div>
      <h1>Create a workspace.</h1>
      <form className="card" onSubmit={submit}>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Slug
          <input name="slug" pattern="[a-z0-9-]+" required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button primary">Create workspace</button>
      </form>
    </main>
  );
}
