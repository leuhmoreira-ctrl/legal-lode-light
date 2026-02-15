import { describe, it, expect } from 'vitest';
import { detectarSistema } from '../utils/tribunalLinks';

describe('detectarSistema', () => {
  it('should detect ESAJ system for known tribunals', () => {
    expect(detectarSistema('tjsp')).toBe('ESAJ');
    expect(detectarSistema('tjsc')).toBe('ESAJ');
    expect(detectarSistema('tjms')).toBe('ESAJ');
  });

  it('should detect PJE system for known tribunals', () => {
    expect(detectarSistema('tjmg')).toBe('PJE');
    expect(detectarSistema('tjgo')).toBe('PJE');
    expect(detectarSistema('tjba')).toBe('PJE');
    expect(detectarSistema('tjrj')).toBe('PJE');
    expect(detectarSistema('tjce')).toBe('PJE');
    expect(detectarSistema('tjpe')).toBe('PJE');
    expect(detectarSistema('tjdf')).toBe('PJE');
    expect(detectarSistema('trt2')).toBe('PJE');
    expect(detectarSistema('trt15')).toBe('PJE');
  });

  it('should detect EPROC system for known tribunals', () => {
    expect(detectarSistema('tjrs')).toBe('EPROC');
    expect(detectarSistema('trf4')).toBe('EPROC');
  });

  it('should detect PROJUDI system for known tribunals', () => {
    expect(detectarSistema('tjpr')).toBe('PROJUDI');
  });

  it('should detect systems for hardcoded exceptions not in TRIBUNAIS list', () => {
    expect(detectarSistema('jfsc')).toBe('EPROC');
    expect(detectarSistema('tjrr')).toBe('PROJUDI');
  });

  it('should be case-insensitive', () => {
    expect(detectarSistema('TJSP')).toBe('ESAJ');
    expect(detectarSistema('TjMg')).toBe('PJE');
    expect(detectarSistema('JFSC')).toBe('EPROC');
  });

  it('should return PJE for unknown acronyms', () => {
    expect(detectarSistema('unknown')).toBe('PJE');
    expect(detectarSistema('xyz')).toBe('PJE');
  });

  it('should return PJE for empty strings', () => {
    expect(detectarSistema('')).toBe('PJE');
  });
});
