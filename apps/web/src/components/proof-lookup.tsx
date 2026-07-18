'use client';

import { useState } from 'react';

export function ProofLookup() {
  const [value, setValue] = useState('');
  return (
    <form
      className="toolbar"
      onSubmit={(event) => {
        event.preventDefault();
        const slug = value.trim();
        if (slug) window.location.assign(`/verify/${encodeURIComponent(slug)}`);
      }}
    >
      <label>
        Certificate slug
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
          placeholder="cert_…"
        />
      </label>
      <button className="button primary" type="submit">
        Verify certificate
      </button>
    </form>
  );
}
