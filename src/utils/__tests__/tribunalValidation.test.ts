import { describe, it, expect } from 'vitest';

const ALLOWED_TRIBUNALS = [
  // Justiça Estadual
  'tjac', 'tjal', 'tjam', 'tjap', 'tjba', 'tjce', 'tjdf', 'tjes', 'tjgo', 'tjma', 'tjmg', 'tjms', 'tjmt',
  'tjpa', 'tjpb', 'tjpe', 'tjpi', 'tjpr', 'tjrj', 'tjrn', 'tjro', 'tjrr', 'tjrs', 'tjsc', 'tjse', 'tjsp', 'tjto',
  // Justiça Federal
  'trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6',
  // Justiça do Trabalho
  'trt1', 'trt2', 'trt3', 'trt4', 'trt5', 'trt6', 'trt7', 'trt8', 'trt9', 'trt10', 'trt11', 'trt12',
  'trt13', 'trt14', 'trt15', 'trt16', 'trt17', 'trt18', 'trt19', 'trt20', 'trt21', 'trt22', 'trt23', 'trt24',
  // Tribunais Superiores e Outros
  'stj', 'tst', 'tse', 'stm', 'cnj'
];

function validateTribunal(tribunal: string): boolean {
  return ALLOWED_TRIBUNALS.includes(tribunal.toLowerCase());
}

describe('Tribunal Validation Logic', () => {
  it('should allow valid tribunals in lowercase', () => {
    expect(validateTribunal('tjsp')).toBe(true);
    expect(validateTribunal('tjmg')).toBe(true);
    expect(validateTribunal('trf1')).toBe(true);
    expect(validateTribunal('trt2')).toBe(true);
    expect(validateTribunal('tjrr')).toBe(true);
    expect(validateTribunal('trt24')).toBe(true);
  });

  it('should allow valid tribunals in uppercase', () => {
    expect(validateTribunal('TJSP')).toBe(true);
    expect(validateTribunal('TJMG')).toBe(true);
    expect(validateTribunal('TRF4')).toBe(true);
  });

  it('should block invalid tribunals', () => {
    expect(validateTribunal('invalid')).toBe(false);
    expect(validateTribunal('tjzz')).toBe(false);
  });

  it('should block malicious inputs (SSRF/Path Traversal attempts)', () => {
    expect(validateTribunal('tjsp/../_search')).toBe(false);
    expect(validateTribunal('tjsp?params=1')).toBe(false);
    expect(validateTribunal('../../../etc/passwd')).toBe(false);
    expect(validateTribunal('http://malicious.com')).toBe(false);
  });
});
