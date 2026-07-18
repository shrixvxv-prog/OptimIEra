import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { contentHash, encryptPrompt, serializeEnvelope } from '@optimiera/encryption';

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_LOCAL_REENCRYPT !== 'true') {
  throw new Error(
    'Local re-encryption requires NODE_ENV=development/test and ALLOW_LOCAL_REENCRYPT=true',
  );
}
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});
try {
  const versions = await db.promptVersion.findMany({
    where: { encryptionStatus: 'PLAINTEXT_LOCAL_ONLY' },
  });
  for (const version of versions) {
    const envelope = encryptPrompt(version.encryptedContent);
    await db.promptVersion.update({
      where: { id: version.id },
      data: {
        encryptedContent: serializeEnvelope(envelope),
        contentHash: contentHash(version.encryptedContent),
        encryptionStatus: 'AES-256-GCM',
      },
    });
  }
  console.log(`Re-encrypted ${versions.length} local prompt version(s).`);
} finally {
  await db.$disconnect();
}
