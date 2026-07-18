import { config as loadEnv } from 'dotenv';
import { buildPreflight } from './og-live-check';
import { activationGate } from './og-live-utils';

loadEnv({ quiet: true });

const confirmed = process.argv.includes('--confirm-testnet');
const preflight = buildPreflight();
const gate = activationGate(confirmed, preflight.overall === 'READY');

console.log(
  JSON.stringify(
    {
      schemaVersion: 'OGLiveActivationV1',
      confirmation: confirmed,
      ...gate,
      liveCallsMade: false,
      preflight,
      message: gate.allowed
        ? 'Activation is gated and requires a separately reviewed live execution implementation.'
        : confirmed
          ? 'Activation refused; preflight is not READY. No live calls were made.'
          : 'Preflight only. Pass --confirm-testnet to request activation; no live calls were made.',
    },
    null,
    2,
  ),
);

if (confirmed && !gate.allowed && preflight.overall !== 'UNCONFIGURED') process.exitCode = 2;
