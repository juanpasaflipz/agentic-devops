import { describe, it, expect } from 'vitest';
import { redactText } from './redact';

describe('redactText', () => {
  it('redacts AWS access key ids', () => {
    const input = 'Key: AKIAABCDEFGHIJKLMNOP';
    const out = redactText(input);
    expect(out).toBe('Key: ***REDACTED***');
  });

  it('redacts GitHub tokens', () => {
    const token = 'ghp_' + 'a'.repeat(36);
    const input = `Token ${token}`;
    const out = redactText(input);
    expect(out).toBe('Token ***REDACTED***');
  });

  it('leaves normal text untouched', () => {
    const input = 'hello world';
    const out = redactText(input);
    expect(out).toBe('hello world');
  });
});
