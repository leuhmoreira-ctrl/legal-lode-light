import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { detectarTribunalPeloNumero, type TribunalInfo } from '@/utils/detectTribunal'

export interface ProcessoAutofillData {
  numero: string
  classe: string
  assunto: string
  dataAjuizamento: string
  valorCausa: number
  comarca: string
  vara: string
  grau: string
  poloAtivo: string
  poloPassivo: string
  tribunal: TribunalInfo
  movimentacoes: Array<{
    data: string
    descricao: string
    complemento: string
  }>
}

export const useProcessoAutofill = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProcessoAutofillData | null>(null)

  const buscarDados = useCallback(async (numeroProcesso: string) => {
    const limpo = numeroProcesso.replace(/\D/g, '')
    if (limpo.length !== 20) {
      setError('Número de processo deve ter 20 dígitos no padrão CNJ.')
      return null
    }

    setLoading(true)
    setError(null)
    setData(null)

    try {
      const tribunalInfo = detectarTribunalPeloNumero(numeroProcesso)

      if (!tribunalInfo) {
        throw new Error('Tribunal não identificado. Verifique o número do processo.')
      }

      const { data: apiData, error: apiError } = await supabase.functions.invoke('sync-process', {
        body: {
          numeroProcesso,
          tribunal: tribunalInfo.sigla
        }
      })

      if (apiError) throw apiError
      if (apiData?.error) throw new Error(apiData.error)

      const resultado: ProcessoAutofillData = {
        numero: apiData.numero,
        classe: apiData.classe || '',
        assunto: apiData.assunto || '',
        dataAjuizamento: apiData.dataAjuizamento || '',
        valorCausa: apiData.valorCausa || 0,
        comarca: apiData.comarca || '',
        vara: apiData.orgaoJulgador || '',
        grau: apiData.grau || '',
        poloAtivo: apiData.poloAtivo || '',
        poloPassivo: apiData.poloPassivo || '',
        tribunal: tribunalInfo,
        movimentacoes: apiData.movimentacoes || []
      }

      setData(resultado)
      return resultado
    } catch (err: any) {
      const msg = err.message || 'Erro ao buscar dados do processo'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const limpar = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { buscarDados, limpar, loading, error, data }
}
