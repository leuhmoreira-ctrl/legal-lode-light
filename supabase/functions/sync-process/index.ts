import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, timeoutMs = 15000): Promise<Response> {
  let lastError: Error | null = null
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url, options, timeoutMs)
    } catch (err) {
      lastError = err as Error
      if (i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
      }
    }
  }
  throw lastError
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { numeroProcesso, tribunal } = await req.json()

    if (!numeroProcesso || !tribunal) {
      return new Response(
        JSON.stringify({ error: 'Número do processo e tribunal são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const nupLimpo = numeroProcesso.replace(/\D/g, '')
    const cnjApiKey = Deno.env.get("CNJ_API_KEY") || "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=="

    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal.toLowerCase()}/_search`

    const payload = {
      query: {
        match: {
          numeroProcesso: nupLimpo
        }
      }
    }

    let response: Response
    try {
      response = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": cnjApiKey
        },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error('CNJ API connection error:', err)
      return new Response(
        JSON.stringify({ 
          error: `API do DataJud indisponível no momento (${tribunal.toUpperCase()}). Tente novamente mais tarde.`,
          retryable: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('CNJ API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: `Erro na API do CNJ: ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      )
    }

    const data = await response.json()

    if (!data.hits || data.hits.total.value === 0) {
      return new Response(
        JSON.stringify({ error: 'Processo não encontrado ou tramita em segredo de justiça' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const processo = data.hits.hits[0]._source

    const resultado = {
      numero: processo.numeroProcesso,
      classe: processo.classe?.nome || 'Não informado',
      assunto: processo.assuntos?.[0]?.nome || 'Não informado',
      dataAjuizamento: processo.dataAjuizamento,
      grau: processo.grau,
      valorCausa: processo.valorCausa || 0,
      comarca: processo.orgaoJulgador?.municipio?.nome || processo.orgaoJulgador?.municipio || '',
      orgaoJulgador: processo.orgaoJulgador?.nome || '',
      movimentacoes: (processo.movimentos || []).map((mov: any) => ({
        data: mov.dataHora,
        descricao: mov.nome,
        complemento: mov.complementosTabelados?.[0]?.nome || ''
      })).sort((a: any, b: any) =>
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )
    }

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
