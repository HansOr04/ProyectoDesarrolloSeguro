import { describe, it, expect } from 'vitest';
import { validateEmail, validateName, validatePassword, validatePasswordMatch } from './validators';

describe('validateEmail', () => {
  it('returns error for empty string', () => {
    expect(validateEmail('')).toBeTruthy();
  });

  it('returns error for whitespace-only string', () => {
    expect(validateEmail('   ')).toBeTruthy();
  });

  it('returns error for invalid format without @', () => {
    expect(validateEmail('noatsign.com')).toBeTruthy();
  });

  it('returns error for invalid format without domain', () => {
    expect(validateEmail('user@')).toBeTruthy();
  });

  it('returns empty string for valid email', () => {
    expect(validateEmail('user@example.com')).toBe('');
  });

  it('returns empty string for email with subdomains', () => {
    expect(validateEmail('user@mail.example.com')).toBe('');
  });
});

describe('validateName', () => {
  it('returns error for empty string', () => {
    expect(validateName('')).toBeTruthy();
  });

  it('returns error for single character', () => {
    expect(validateName('A')).toBeTruthy();
  });

  it('returns error for name with numbers', () => {
    expect(validateName('Juan123')).toBeTruthy();
  });

  it('returns error for name with special characters', () => {
    expect(validateName('Juan@')).toBeTruthy();
  });

  it('returns empty string for valid name', () => {
    expect(validateName('Juan')).toBe('');
  });

  it('returns empty string for name with spaces', () => {
    expect(validateName('Juan Carlos')).toBe('');
  });

  it('returns empty string for name with accents', () => {
    expect(validateName('María José')).toBe('');
  });

  it('returns empty string for name with ñ', () => {
    expect(validateName('Muñoz')).toBe('');
  });
});

describe('validatePassword', () => {
  it('returns error for empty string', () => {
    expect(validatePassword('')).toBeTruthy();
  });

  it('returns error for password shorter than 8 characters', () => {
    expect(validatePassword('abc123')).toBeTruthy();
  });

  it('returns error for exactly 7 characters', () => {
    expect(validatePassword('abcdefg')).toBeTruthy();
  });

  it('returns empty string for exactly 8 characters', () => {
    expect(validatePassword('abcdefgh')).toBe('');
  });

  it('returns empty string for password longer than 8 characters', () => {
    expect(validatePassword('MySecurePassword123!')).toBe('');
  });
});

describe('validatePasswordMatch', () => {
  it('returns error when passwords do not match', () => {
    expect(validatePasswordMatch('password1', 'password2')).toBeTruthy();
  });

  it('returns empty string when passwords match', () => {
    expect(validatePasswordMatch('MyPass123', 'MyPass123')).toBe('');
  });

  it('returns empty string when both are empty strings', () => {
    expect(validatePasswordMatch('', '')).toBe('');
  });

  it('returns error when one is empty and the other is not', () => {
    expect(validatePasswordMatch('password', '')).toBeTruthy();
  });
});
