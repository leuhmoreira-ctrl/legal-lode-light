import { describe, it, expect } from 'vitest';
import { generateDeepLink, detectarSistema } from '../utils/tribunalLinks';

describe('detectarSistema', () => {
  it('should detect ESAJ for TJSP', () => {
    expect(detectarSistema('TJSP')).toBe('ESAJ');
    expect(detectarSistema('tjsp')).toBe('ESAJ');
  });

  it('should detect ESAJ for TJSC', () => {
    expect(detectarSistema('TJSC')).toBe('ESAJ');
  });

  it('should detect ESAJ for TJMS', () => {
    expect(detectarSistema('TJMS')).toBe('ESAJ');
  });

  it('should detect EPROC for TRF4', () => {
    expect(detectarSistema('TRF4')).toBe('EPROC');
  });

  it('should detect EPROC for TJRS', () => {
    expect(detectarSistema('TJRS')).toBe('EPROC');
  });

  it('should detect PROJUDI for TJPR', () => {
    expect(detectarSistema('TJPR')).toBe('PROJUDI');
  });

  it('should detect PJE for TJMG', () => {
    expect(detectarSistema('TJMG')).toBe('PJE');
  });

  it('should detect PJE for TJBA', () => {
    expect(detectarSistema('TJBA')).toBe('PJE');
  });

  it('should fallback to PJE for unknown tribunal', () => {
    expect(detectarSistema('UNKNOWN')).toBe('PJE');
  });
});

describe('generateDeepLink', () => {
  it('should generate correct URL for ESAJ (TJSP)', () => {
    const url = generateDeepLink('1234567-89.2023.8.26.0100', 'TJSP', 'ESAJ');
    expect(url).toBe('https://esaj.tjsp.jus.br/cpopg/show.do?processo.numero=1234567-89.2023.8.26.0100');
  });

  it('should generate correct URL for PJE (TJBA)', () => {
    const url = generateDeepLink('0801234-56.2023.8.05.0001', 'TJBA', 'PJE');
    expect(url).toBe('https://pje.tjba.jus.br/pje/ConsultaPublica/DetalheProcessoConsultaPublica/listView.seam?nd=08012345620238050001');
  });

  it('should generate correct URL for PROJUDI (TJPR)', () => {
    const url = generateDeepLink('0001234-56.2023.8.16.0001', 'TJPR', 'PROJUDI');
    expect(url).toBe('https://projudi.tjpr.jus.br/projudi/listagens/dadosProcesso?numeroProcesso=00012345620238160001');
  });

  it('should generate correct URL for EPROC (TRF4)', () => {
    const url = generateDeepLink('5001234-56.2023.4.04.7000', 'TRF4', 'EPROC');
    expect(url).toBe('https://eproc.trf4.jus.br/eproc2trf4/externo_controlador.php?acao=processo_consulta_publica&numero_processo=50012345620234047000');
  });

  it('should generate correct URL for EPROC (TJRS)', () => {
    const url = generateDeepLink('5001234-56.2023.8.21.0001', 'TJRS', 'EPROC');
    // Note: This expects the fixed URL, not the current buggy one.
    expect(url).toBe('https://eproc1g.tjrs.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica&numero_processo=50012345620238210001');
  });

  it('should fallback to CNJ for unknown system', () => {
    // @ts-expect-error - Testing invalid system type
    const url = generateDeepLink('12345', 'UNKNOWN', 'UNKNOWN_SYSTEM');
    expect(url).toBe('https://www.cnj.jus.br/consultas-judiciais/');
  });
});
