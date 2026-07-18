'use client';

import { useFormStatus } from 'react-dom';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? 'Working…' : children}
    </button>
  );
}

export function ConfirmButton({
  message,
  name,
  value,
  children,
}: {
  message: string;
  name?: string;
  value?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className="button"
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? 'Working…' : children}
    </button>
  );
}

export function ConfirmForm({
  action,
  message,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <SubmitButton>{children}</SubmitButton>
    </form>
  );
}
