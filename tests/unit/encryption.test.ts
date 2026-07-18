import { describe, expect, it } from 'vitest';
import {
  contentHash,
  decryptPrompt,
  encryptPrompt,
  parseEnvelope,
  serializeEnvelope,
} from '../../packages/encryption/src';

const key = Buffer.alloc(32, 9);
describe('AES-256-GCM prompt encryption', () => {
  it('round trips and uses a random nonce', () => {
    const a = encryptPrompt('private prompt', { key });
    const b = encryptPrompt('private prompt', { key });
    expect(decryptPrompt(a, { key })).toBe('private prompt');
    expect(serializeEnvelope(a)).not.toBe(serializeEnvelope(b));
  });
  it('keeps hashes deterministic while ciphertext varies', () => {
    expect(contentHash('same')).toBe(contentHash('same'));
    expect(contentHash('same')).not.toBe(contentHash('different'));
  });
  it('fails with a wrong key or modified ciphertext/tag', () => {
    const envelope = encryptPrompt('private', { key });
    expect(() => decryptPrompt(envelope, { key: Buffer.alloc(32, 8) })).toThrow();
    const tampered = { ...envelope, ciphertext: Buffer.from('tampered').toString('base64') };
    expect(() => decryptPrompt(tampered, { key })).toThrow();
    const tag = { ...envelope, authTag: Buffer.alloc(16).toString('base64') };
    expect(() => decryptPrompt(tag, { key })).toThrow();
  });
  it('rejects malformed and unsupported envelopes', () => {
    expect(() => parseEnvelope('{}')).toThrow('ENCRYPTION_ENVELOPE_INVALID');
    expect(() =>
      decryptPrompt({ ...encryptPrompt('x', { key }), version: 2 } as never, { key }),
    ).toThrow('ENCRYPTION_ENVELOPE_UNSUPPORTED');
  });
  it('does not serialize plaintext', () => {
    expect(serializeEnvelope(encryptPrompt('secret text', { key }))).not.toContain('secret text');
  });
});
