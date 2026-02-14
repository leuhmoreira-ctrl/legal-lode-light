export interface TribunalInfo {
  sigla: string;
  nome: string;
  sistema: 'ESAJ' | 'EPROC' | 'PJE' | 'PROJUDI';
  segmento: string;
}

const TRIBUNAIS_MAP: Record<string, TribunalInfo> = {
  // JUSTIÇA ESTADUAL (8.XX)
  '8.26': { sigla: 'tjsp', nome: 'TJSP - Tribunal de Justiça de São Paulo', sistema: 'ESAJ', segmento: 'Estadual' },
  '8.13': { sigla: 'tjmg', nome: 'TJMG - Tribunal de Justiça de Minas Gerais', sistema: 'PJE', segmento: 'Estadual' },
  '8.19': { sigla: 'tjrj', nome: 'TJRJ - Tribunal de Justiça do Rio de Janeiro', sistema: 'ESAJ', segmento: 'Estadual' },
  '8.09': { sigla: 'tjgo', nome: 'TJGO - Tribunal de Justiça de Goiás', sistema: 'PJE', segmento: 'Estadual' },
  '8.16': { sigla: 'tjpr', nome: 'TJPR - Tribunal de Justiça do Paraná', sistema: 'PROJUDI', segmento: 'Estadual' },
  '8.24': { sigla: 'tjsc', nome: 'TJSC - Tribunal de Justiça de Santa Catarina', sistema: 'EPROC', segmento: 'Estadual' },
  '8.21': { sigla: 'tjrs', nome: 'TJRS - Tribunal de Justiça do Rio Grande do Sul', sistema: 'EPROC', segmento: 'Estadual' },
  '8.27': { sigla: 'tjms', nome: 'TJMS - Tribunal de Justiça de Mato Grosso do Sul', sistema: 'ESAJ', segmento: 'Estadual' },
  '8.11': { sigla: 'tjmt', nome: 'TJMT - Tribunal de Justiça de Mato Grosso', sistema: 'PJE', segmento: 'Estadual' },
  '8.07': { sigla: 'tjdf', nome: 'TJDFT - Tribunal de Justiça do Distrito Federal', sistema: 'PJE', segmento: 'Estadual' },
  '8.08': { sigla: 'tjes', nome: 'TJES - Tribunal de Justiça do Espírito Santo', sistema: 'PJE', segmento: 'Estadual' },
  '8.05': { sigla: 'tjba', nome: 'TJBA - Tribunal de Justiça da Bahia', sistema: 'PJE', segmento: 'Estadual' },
  '8.06': { sigla: 'tjce', nome: 'TJCE - Tribunal de Justiça do Ceará', sistema: 'PJE', segmento: 'Estadual' },
  '8.17': { sigla: 'tjpe', nome: 'TJPE - Tribunal de Justiça de Pernambuco', sistema: 'PJE', segmento: 'Estadual' },

  // JUSTIÇA DO TRABALHO (5.XX)
  '5.02': { sigla: 'trt2', nome: 'TRT 2ª Região (SP)', sistema: 'PJE', segmento: 'Trabalho' },
  '5.03': { sigla: 'trt3', nome: 'TRT 3ª Região (MG)', sistema: 'PJE', segmento: 'Trabalho' },
  '5.04': { sigla: 'trt4', nome: 'TRT 4ª Região (RS)', sistema: 'PJE', segmento: 'Trabalho' },
  '5.09': { sigla: 'trt9', nome: 'TRT 9ª Região (PR)', sistema: 'PJE', segmento: 'Trabalho' },
  '5.15': { sigla: 'trt15', nome: 'TRT 15ª Região (Campinas/SP)', sistema: 'PJE', segmento: 'Trabalho' },
  '5.18': { sigla: 'trt18', nome: 'TRT 18ª Região (GO)', sistema: 'PJE', segmento: 'Trabalho' },

  // JUSTIÇA FEDERAL (4.XX)
  '4.01': { sigla: 'trf1', nome: 'TRF 1ª Região', sistema: 'EPROC', segmento: 'Federal' },
  '4.02': { sigla: 'trf2', nome: 'TRF 2ª Região', sistema: 'EPROC', segmento: 'Federal' },
  '4.03': { sigla: 'trf3', nome: 'TRF 3ª Região', sistema: 'EPROC', segmento: 'Federal' },
  '4.04': { sigla: 'trf4', nome: 'TRF 4ª Região', sistema: 'EPROC', segmento: 'Federal' },
  '4.05': { sigla: 'trf5', nome: 'TRF 5ª Região', sistema: 'EPROC', segmento: 'Federal' },
  '4.06': { sigla: 'trf6', nome: 'TRF 6ª Região', sistema: 'EPROC', segmento: 'Federal' },
}

export const detectarTribunalPeloNumero = (numeroProcesso: string): TribunalInfo | null => {
  const limpo = numeroProcesso.replace(/\D/g, '')

  if (limpo.length !== 20) return null

  // NNNNNNN-DD.AAAA.J.TR.OOOO => positions in clean string:
  // 0-6: sequencial, 7-8: dígito, 9-12: ano, 13: segmento(J), 14-15: tribunal(TR), 16-19: origem
  const segmento = limpo[13]
  const codigoTribunal = limpo.substring(14, 16)

  const chave = `${segmento}.${codigoTribunal}`

  return TRIBUNAIS_MAP[chave] || null
}

export const formatarNumeroCNJ = (numero: string): string => {
  const limpo = numero.replace(/\D/g, '')

  if (limpo.length !== 20) return numero

  return `${limpo.substring(0, 7)}-${limpo.substring(7, 9)}.${limpo.substring(9, 13)}.${limpo[13]}.${limpo.substring(14, 16)}.${limpo.substring(16, 20)}`
}
