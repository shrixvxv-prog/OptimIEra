'use client';

import { useEffect } from 'react';

const messages: Record<string, string> = {
  UNAUTHENTICATED: 'Please sign in to continue.',
  FORBIDDEN: 'You do not have permission to perform that action.',
  NOT_FOUND: 'That resource is not available in this workspace.',
  CONFLICT: 'The resource changed. Refresh and try again.',
  INVITATION_ALREADY_USED: 'This invitation is no longer reusable.',
  INVITATION_EXPIRED: 'This invitation has expired.',
  LAST_OWNER_PROTECTED: 'The final workspace owner cannot be removed or demoted.',
  ILLEGAL_STATE_TRANSITION: 'That workflow transition is not allowed.',
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const message = messages[error.message] ?? 'Something went wrong. Please retry.';
  return (
    <main className="appmain">
      <div role="alert" className="card">
        <h1>Action unavailable</h1>
        <p>{message}</p>
        <button className="button primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
