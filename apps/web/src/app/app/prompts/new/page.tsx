import { requireSession } from '@/lib/authorization';
import { createPrompt } from './actions';

export default async function NewPrompt({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; project?: string }>;
}) {
  await requireSession();
  const query = await searchParams;
  return (
    <main className="appmain">
      <div className="eyebrow">Prompt Registry / New</div>
      <h1>Create a prompt.</h1>
      <form className="card" action={createPrompt}>
        <input type="hidden" name="workspaceSlug" value={query.workspace ?? ''} />
        <input type="hidden" name="projectId" value={query.project ?? ''} />
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Content
          <textarea name="content" required />
        </label>
        <button className="button primary" type="submit">
          Create encrypted prompt
        </button>
      </form>
    </main>
  );
}
