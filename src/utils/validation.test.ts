import { describe, it, expect } from 'vitest';
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ, formatPhone } from './validation';

describe('Validation Utils', () => {
  describe('validateCPF', () => {
    it('should validate valid CPF', () => {
      // 12345678909 passes the mathematical check, so let's use a definitely invalid one
      expect(validateCPF('12345678912')).toBe(false); // Checksum fail
      expect(validateCPF('52998224725')).toBe(true); // Generated valid CPF
      expect(validateCPF('11111111111')).toBe(false); // All same digits
    });

    it('should handle formatted CPF', () => {
      expect(validateCPF('529.982.247-25')).toBe(true);
    });
  });

  describe('validateCNPJ', () => {
    it('should validate valid CNPJ', () => {
      expect(validateCNPJ('12345678000199')).toBe(false); // Invalid
      expect(validateCNPJ('33.000.167/0001-01')).toBe(true); // Petrobras CNPJ
      expect(validateCNPJ('11111111111111')).toBe(false);
    });
  });

  describe('Formatting', () => {
    it('should format CPF', () => {
      expect(formatCPF('52998224725')).toBe('529.982.247-25');
      expect(formatCPF('529982')).toBe('529.982');
    });

    it('should format CNPJ', () => {
      expect(formatCNPJ('33000167000101')).toBe('33.000.167/0001-01');
    });

    it('should format Phone', () => {
      expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
      expect(formatPhone('1187654321')).toBe('(11) 8765-4321');
    });
  });
});
