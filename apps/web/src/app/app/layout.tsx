import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { AppShell } from '@/components/app-shell';
import { ogNetworkLabel, readOGChainConfig } from '@optimiera/config';
import { readWave2RuntimeConfig } from '@/lib/runtime-config';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession().catch(() => null);
  if (!session) redirect('/sign-in?next=/app');
  const memberships = await db.member.findMany({
    where: { userId: session.user.id },
    include: { organization: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const chainConfig = readOGChainConfig();
  const runtimeConfig = readWave2RuntimeConfig();
  return (
    <AppShell
      userName={session.user.name || session.user.email.split('@')[0]}
      workspaces={memberships.map(({ organization }) => organization)}
      networkName={ogNetworkLabel(chainConfig.network)}
      chainId={chainConfig.chainId}
      liveWritesEnabled={runtimeConfig.liveWritesEnabled}
    >
      {children}
    </AppShell>
  );
}
