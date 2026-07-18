import { requireSession } from '@/lib/authorization';
import { createProject } from '../actions';

export default async function NewProject({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  await requireSession();
  const { workspaceSlug } = await params;
  return (
    <main className="appmain">
      <div className="eyebrow">Workspace / {workspaceSlug} / Projects</div>
      <h1>Create a project.</h1>
      <form className="card" action={createProject}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Slug
          <input name="slug" pattern="[a-z0-9-]+" required />
        </label>
        <label>
          Description
          <textarea name="description" />
        </label>
        <button className="button primary" type="submit">
          Create project
        </button>
      </form>
    </main>
  );
}
