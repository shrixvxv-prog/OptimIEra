import { requireSession } from '@/lib/authorization';
import { createVersion } from './actions';

export default async function NewVersion({ params }: { params: Promise<{ promptId: string }> }) {
  await requireSession();
  const { promptId } = await params;
  return (
    <main className="appmain">
      <div className="eyebrow">Prompt Registry / New version</div>
      <h1>Create an immutable version.</h1>
      <form className="card" action={createVersion}>
        <input type="hidden" name="promptId" value={promptId} />
        <label>
          Content
          <textarea name="content" required />
        </label>
        <label>
          Change summary
          <input name="changeSummary" required />
        </label>
        <button className="button primary" type="submit">
          Create version
        </button>
      </form>
    </main>
  );
}
