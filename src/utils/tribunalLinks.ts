export type SistemaTribunal = 'ESAJ' | 'EPROC' | 'PJE' | 'PROJUDI'

export const TRIBUNAIS = [
  { sigla: 'tjsp', nome: 'TJSP - São Paulo', sistema: 'ESAJ' as SistemaTribunal },
  { sigla: 'tjsc', nome: 'TJSC - Santa Catarina', sistema: 'ESAJ' as SistemaTribunal },
  { sigla: 'tjms', nome: 'TJMS - Mato Grosso do Sul', sistema: 'ESAJ' as SistemaTribunal },
  { sigla: 'tjmg', nome: 'TJMG - Minas Gerais', sistema: 'PJE' as SistemaTribunal },
  { sigla: 'tjgo', nome: 'TJGO - Goiás', sistema: 'PJE' as SistemaTribunal },
  { sigla: 'tjba', nome: 'TJBA - Bahia', sistema: 'PJE' as SistemaTribunal },
  { sigla: 'tjrj', nome: 'TJRJ - Rio de Janeiro', sistema: 'PJE' as SistemaTribunal },
  { sigla: 'tjrs', nome: 'TJRS - Rio Grande do Sul', sistema: 'EPROC' as SistemaTribunal },
  { sigla: 'tjpr', nome: 'TJPR - Paraná', sistema: 'PROJUDI' as SistemaTribunal },
  { sigla: 'tjce', nome: 'TJCE - Ceará', sistema: 'PJE' as SistemaTribunal },
  { sigla: 'tjpe', nome: 'TJPE - Pernambuco', sistema: 'PJE' as SistemaTribunal },
  { sigla: 'tjdf', nome: 'TJDF - Distrito Federal', sistema: 'PJE' as SistemaTribunal },
  { sigla: 'trf4', nome: 'TRF4 - 4ª Região', sistema: 'EPROC' as SistemaTribunal },
  { sigla: 'trt2', nome: 'TRT2 - São Paulo', sistema: 'PJE' as SistemaTribunal },
  { sigla: 'trt15', nome: 'TRT15 - Campinas', sistema: 'PJE' as SistemaTribunal },
]

export const generateDeepLink = (
  numeroProcesso: string,
  tribunal: string,
  sistema: SistemaTribunal
): string => {
  const nupLimpo = numeroProcesso.replace(/\D/g, '')
  const tribunalLower = tribunal.toLowerCase()

  switch (sistema) {
    case 'ESAJ':
      return `https://esaj.${tribunalLower}.jus.br/cpopg/show.do?processo.numero=${numeroProcesso}`
    case 'EPROC':
      if (tribunalLower === 'tjrs') {
        return `https://eproc1g.tjrs.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica&numero_processo=${nupLimpo}`
      }
      return `https://eproc.${tribunalLower}.jus.br/eproc2trf4/externo_controlador.php?acao=processo_consulta_publica&numero_processo=${nupLimpo}`
    case 'PJE':
      return `https://pje.${tribunalLower}.jus.br/pje/ConsultaPublica/DetalheProcessoConsultaPublica/listView.seam?nd=${nupLimpo}`
    case 'PROJUDI':
      return `https://projudi.${tribunalLower}.jus.br/projudi/listagens/dadosProcesso?numeroProcesso=${nupLimpo}`
    default:
      return `https://www.cnj.jus.br/consultas-judiciais/`
  }
}

export const detectarSistema = (sigla: string): SistemaTribunal => {
  const found = TRIBUNAIS.find(t => t.sigla === sigla.toLowerCase())
  if (found) return found.sistema

  sigla = sigla.toLowerCase()
  if (['tjsp', 'tjsc', 'tjms'].includes(sigla)) return 'ESAJ'
  if (['trf4', 'jfsc', 'tjrs'].includes(sigla)) return 'EPROC'
  if (['tjpr', 'tjrr'].includes(sigla)) return 'PROJUDI'
  return 'PJE'
}
