import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": cnjApiKey
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('CNJ API error:', response.status, errorText)
      throw new Error(`Erro na API do CNJ: ${response.status}`)
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
