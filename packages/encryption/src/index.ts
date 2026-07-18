import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type EncryptionEnvelope = {
  version: 1;
  algorithm: 'AES-256-GCM';
  keyVersion: string;
  iv: string;
  ciphertext: string;
  authTag: string;
};
function keyFrom(input?: Buffer | string) {
  const raw = input ?? process.env.OPTIMIERA_ENCRYPTION_MASTER_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY_MISSING');
  const key = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY_INVALID');
  return key;
}
export function contentHash(plaintext: string) {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}
export function encryptPrompt(
  plaintext: string,
  options: { key?: Buffer | string; keyVersion?: string } = {},
): EncryptionEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(options.key), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    version: 1,
    algorithm: 'AES-256-GCM',
    keyVersion: options.keyVersion ?? 'local-v1',
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}
export function decryptPrompt(
  envelope: EncryptionEnvelope,
  options: { key?: Buffer | string } = {},
) {
  if (envelope.version !== 1 || envelope.algorithm !== 'AES-256-GCM')
    throw new Error('ENCRYPTION_ENVELOPE_UNSUPPORTED');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFrom(options.key),
    Buffer.from(envelope.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
export function serializeEnvelope(envelope: EncryptionEnvelope) {
  return JSON.stringify(envelope);
}
export function parseEnvelope(serialized: string): EncryptionEnvelope {
  const parsed = JSON.parse(serialized) as EncryptionEnvelope;
  if (
    parsed.version !== 1 ||
    parsed.algorithm !== 'AES-256-GCM' ||
    !parsed.iv ||
    !parsed.ciphertext ||
    !parsed.authTag
  )
    throw new Error('ENCRYPTION_ENVELOPE_INVALID');
  return parsed;
}
