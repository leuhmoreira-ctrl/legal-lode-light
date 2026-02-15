import { describe, it, expect } from 'vitest';
import { formatarNumeroCNJ } from '../utils/detectTribunal';

describe('formatarNumeroCNJ', () => {
  it('should format a valid 20-digit string correctly', () => {
    const input = '12345678920238260100';
    const expected = '1234567-89.2023.8.26.0100';
    expect(formatarNumeroCNJ(input)).toBe(expected);
  });

  it('should format a string with non-digits correctly if it contains 20 digits', () => {
    const input = '1234567-89.2023.8.26.0100'; // Already formatted
    const expected = '1234567-89.2023.8.26.0100';
    expect(formatarNumeroCNJ(input)).toBe(expected);

    const dirtyInput = '1234567.892023/8.26-0100';
    expect(formatarNumeroCNJ(dirtyInput)).toBe(expected);
  });

  it('should return the original string if length is not 20 digits', () => {
    const shortInput = '123456789';
    expect(formatarNumeroCNJ(shortInput)).toBe(shortInput);

    const longInput = '123456789012345678901';
    expect(formatarNumeroCNJ(longInput)).toBe(longInput);
  });

  it('should handle empty string', () => {
    expect(formatarNumeroCNJ('')).toBe('');
  });
});
