import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { encryptPrompt, contentHash, serializeEnvelope } from '@optimiera/encryption';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});
async function main() {
  if (process.env.SEED_DEVELOPMENT_DATA !== 'true' || process.env.NODE_ENV === 'production') return;
  const user = await db.user.upsert({
    where: { email: 'developer@optimiera.local' },
    update: {},
    create: {
      id: 'development-user',
      name: 'Development User',
      email: 'developer@optimiera.local',
    },
  });
  const workspace = await db.organization.upsert({
    where: { slug: 'development-workspace' },
    update: {},
    create: {
      id: 'development-workspace',
      name: 'Development Workspace',
      slug: 'development-workspace',
    },
  });
  await db.member.upsert({
    where: { organizationId_userId: { organizationId: workspace.id, userId: user.id } },
    update: {},
    create: {
      id: 'development-member',
      organizationId: workspace.id,
      userId: user.id,
      role: 'owner',
    },
  });
  const project = await db.project.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'development-project' } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Development Project',
      slug: 'development-project',
      createdById: user.id,
    },
  });
  const prompt = await db.prompt.create({
    data: {
      workspaceId: workspace.id,
      projectId: project.id,
      title: 'Development Prompt',
      createdById: user.id,
    },
  });
  await db.promptVersion.create({
    data: {
      promptId: prompt.id,
      workspaceId: workspace.id,
      versionNumber: 1,
      encryptedContent: serializeEnvelope(encryptPrompt('development-only prompt content')),
      contentHash: contentHash('development-only prompt content'),
      encryptionStatus: 'AES-256-GCM',
      createdById: user.id,
    },
  });
}
main().finally(() => db.$disconnect());
