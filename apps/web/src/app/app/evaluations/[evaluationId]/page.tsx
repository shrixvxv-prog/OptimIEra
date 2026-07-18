import { redirect } from 'next/navigation';

export default async function Evaluation({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  const { evaluationId } = await params;
  redirect(`/app/optimizations/${encodeURIComponent(evaluationId)}`);
}
