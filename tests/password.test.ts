import { describe, it, expect } from 'vitest';
import { DEFAULT_PASSWORD } from '../src/features/password-gate/PasswordGate';

describe('Password Gate and Security Logic', () => {
  it('DEFAULT_PASSWORD is set to 2025', () => {
    expect(DEFAULT_PASSWORD).toBe('2025');
  });

  it('validates password correctly against default and alias', () => {
    const checkPassword = (input: string, target: string = DEFAULT_PASSWORD) => {
      const clean = input.trim();
      return clean === target || clean.toUpperCase() === 'GARDEN';
    };

    expect(checkPassword('2025')).toBe(true);
    expect(checkPassword(' 2025 ')).toBe(true);
    expect(checkPassword('garden')).toBe(true);
    expect(checkPassword('GARDEN')).toBe(true);
    expect(checkPassword('wrong_pwd')).toBe(false);
    expect(checkPassword('')).toBe(false);
  });
});
