import { requireSession } from '@/lib/authorization';
import { safeRouteError } from '@/lib/route-errors';
import { db, listOptimizationsForPrompt } from '@optimiera/database';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ promptId: string }> },
) {
  try {
    const session = await requireSession();
    const { promptId } = await params;
    const prompt = await db.prompt.findFirst({
      where: { id: promptId, workspace: { members: { some: { userId: session.user.id } } } },
    });
    if (!prompt) throw new Error('NOT_FOUND');
    const jobs = await listOptimizationsForPrompt(prompt.workspaceId, prompt.id);
    return Response.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        status: job.status,
        mode: job.mode,
        providerName: job.providerName,
        originalScore: job.originalScore,
        recommendedScore: job.recommendedScore,
        createdAt: job.createdAt,
        savedPromptVersionId: job.savedPromptVersionId,
      })),
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
