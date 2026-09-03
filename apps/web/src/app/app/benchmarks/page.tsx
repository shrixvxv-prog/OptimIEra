import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { createBenchmarkSuiteAction } from './actions';

export default async function Benchmarks() {
  const session = await requireSession();
  const memberships = await db.member.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const suites = await db.evaluationSuite.findMany({
    where: { workspaceId: { in: memberships.map((m) => m.organizationId) } },
    include: { testCases: true },
    orderBy: { updatedAt: 'desc' },
  });
  const projects = await db.project.findMany({
    where: { workspaceId: { in: memberships.map((m) => m.organizationId) } },
    orderBy: { createdAt: 'asc' },
  });
  return (
    <main className="appmain wide">
      <div className="eyebrow">Benchmark Engine</div>
      <h1>Prompt performance benchmarks</h1>
      <p className="lede">
        Measure Original and optimized PromptVersions against reproducible datasets.
      </p>
      <section className="card">
        <h2>Create suite</h2>
        <form action={createBenchmarkSuiteAction} className="mini-form">
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Description
            <input name="description" />
          </label>
          <label>
            Project
            <select name="projectId" required>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cases (JSON)
            <textarea
              name="cases"
              required
              defaultValue={
                '[{"input":"example","evaluator":"EXACT_MATCH","expected":"example","weight":1}]'
              }
            />
          </label>
          <button className="button" type="submit">
            Create benchmark suite
          </button>
        </form>
      </section>
      <section className="grid">
        {suites.map((suite) => (
          <article className="card" key={suite.id}>
            <h2>
              <a href={`/app/benchmarks/${suite.id}`}>{suite.name}</a>
            </h2>
            <p className="muted">
              {suite.description ?? 'Benchmark Suite'} · {suite.testCases.length} cases
            </p>
          </article>
        ))}
        {suites.length === 0 && <p className="muted">No benchmark suites yet.</p>}
      </section>
    </main>
  );
}
