import type { CapabilityStatus } from '@optimiera/schemas';
export type SdkStatus = { status: CapabilityStatus; reason: string };
export const sdkStatus: SdkStatus = {
  status: 'PLANNED',
  reason: 'Developer platform work is scheduled for Wave 3.',
};
