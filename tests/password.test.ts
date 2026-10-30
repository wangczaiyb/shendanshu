import { describe, it, expect } from 'vitest';
import { DEFAULT_PASSWORD, isPasswordValid } from '../src/features/password-gate/PasswordGate';

describe('Password Gate and Security Logic', () => {
  it('uses the configured 2026 default password', () => {
    expect(DEFAULT_PASSWORD).toBe('HKX2026');
  });

  it('accepts the exact password with surrounding whitespace', () => {
    expect(isPasswordValid('HKX2026')).toBe(true);
    expect(isPasswordValid(' HKX2026 ')).toBe(true);
  });

  it('rejects legacy aliases, incorrect casing, and empty input', () => {
    for (const input of ['2025', 'GARDEN', 'garden', 'hkx2026', 'wrong_pwd', '', '   ']) {
      expect(isPasswordValid(input)).toBe(false);
    }
  });

  it('validates against an explicitly configured password without a default bypass', () => {
    expect(isPasswordValid('custom-password', 'custom-password')).toBe(true);
    expect(isPasswordValid('HKX2026', 'custom-password')).toBe(false);
    expect(isPasswordValid('GARDEN', 'custom-password')).toBe(false);
    expect(isPasswordValid('', '')).toBe(false);
  });
});
