'use server';
import { ogComputeBenchmarkProvider, runBenchmarkForOptimization } from '@/lib/benchmark-service';
import { redirect } from 'next/navigation';
import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
export async function createBenchmarkSuiteAction(formData: FormData) {
  const session = await requireSession();
  const membership = await db.member.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!membership) throw new Error('WORKSPACE_REQUIRED');
  const project = await db.project.findFirst({
    where: { workspaceId: membership.organizationId },
    orderBy: { createdAt: 'asc' },
  });
  if (!project) throw new Error('PROJECT_REQUIRED');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('VALIDATION_ERROR');
  const cases = JSON.parse(String(formData.get('cases') ?? '[]')) as Array<{
    input: string;
    evaluator?: string;
    expected?: string;
    weight?: number;
    config?: Record<string, unknown>;
  }>;
  const suite = await db.evaluationSuite.create({
    data: {
      workspaceId: membership.organizationId,
      projectId: String(formData.get('projectId') ?? project.id) || project.id,
      name,
      description: String(formData.get('description') ?? '').trim() || null,
      createdById: session.user.id,
      testCases: {
        create: cases.map((item, index) => ({
          input: item.input,
          expectedBehavior: item.expected ?? '',
          assertionConfig: JSON.stringify({
            ...(item.config ?? {}),
            evaluator: item.evaluator ?? 'EXACT_MATCH',
            expectedOutput: item.expected ?? item.config?.expectedOutput ?? '',
            weight: item.weight ?? 1,
          }),
        })),
      },
    },
  });
  redirect(`/app/benchmarks/${suite.id}`);
}
export async function executeBenchmarkAction(formData: FormData) {
  const provider =
    String(formData.get('provider') ?? 'local') === 'og-compute'
      ? ogComputeBenchmarkProvider()
      : undefined;
  await runBenchmarkForOptimization(
    String(formData.get('suiteId') ?? ''),
    String(formData.get('optimizationId') ?? ''),
    provider,
  );
  redirect(`/app/benchmarks/${String(formData.get('suiteId') ?? '')}`);
}
