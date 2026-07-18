'use server';

import { redirect } from 'next/navigation';
import { issueOptimizationCertificate, revokeOptimizationCertificate } from '@/lib/certificate';

export async function issueCertificate(formData: FormData) {
  const result = await issueOptimizationCertificate(String(formData.get('optimizationId') ?? ''));
  redirect(`/app/certificates/${result.certificate.id}`);
}

export async function revokeCertificate(formData: FormData) {
  const id = String(formData.get('certificateId') ?? '');
  await revokeOptimizationCertificate(id, String(formData.get('reason') ?? 'Certificate revoked'));
  redirect(`/app/certificates/${id}`);
}
