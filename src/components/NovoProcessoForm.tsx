import { useState, useEffect, useRef } from 'react'
import { useProcessoAutofill } from '@/hooks/useProcessoAutofill'
import { formatarNumeroCNJ } from '@/utils/detectTribunal'
import { Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface NovoProcessoFormProps {
  onSuccess?: (processoId?: string) => void
  onCancel?: () => void
}

export function NovoProcessoForm({ onSuccess, onCancel }: NovoProcessoFormProps) {
  const { buscarDados, loading: loadingAutofill, error: errorAutofill, data: autofillData, limpar } = useProcessoAutofill()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const lastSearched = useRef('')

  // Form fields
  const [numero, setNumero] = useState('')
  const [cliente, setCliente] = useState('')
  const [advogado, setAdvogado] = useState('')
  const [classe, setClasse] = useState('')
  const [assunto, setAssunto] = useState('')
  const [comarca, setComarca] = useState('')
  const [vara, setVara] = useState('')
  const [valorCausa, setValorCausa] = useState('')
  const [fase, setFase] = useState('Conhecimento')
  const [parteContraria, setParteContraria] = useState('')

  // Auto-fetch when 20 digits entered
  const numeroLimpo = numero.replace(/\D/g, '')
  useEffect(() => {
    if (numeroLimpo.length === 20 && lastSearched.current !== numeroLimpo) {
      lastSearched.current = numeroLimpo
      buscarDados(numero).then((dados) => {
        if (dados) {
          setClasse(dados.classe)
          setAssunto(dados.assunto)
          setComarca(dados.comarca)
          setVara(dados.vara)
          if (dados.valorCausa) setValorCausa(String(dados.valorCausa))
          if (dados.poloAtivo && !cliente) setCliente(dados.poloAtivo)
          if (dados.poloPassivo && !parteContraria) setParteContraria(dados.poloPassivo)
          toast({
            title: '✅ Dados encontrados!',
            description: `Processo do ${dados.tribunal.nome} carregado automaticamente`,
          })
        }
      })
    }
    if (numeroLimpo.length < 20) {
      lastSearched.current = ''
      limpar()
    }
  }, [numeroLimpo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (numeroLimpo.length !== 20) {
      toast({ title: 'Número inválido', description: 'O número do processo deve ter 20 dígitos.', variant: 'destructive' })
      return
    }
    if (!cliente.trim() || !advogado.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha cliente e advogado.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuário não autenticado. Faça login primeiro.')

      const numeroFormatado = formatarNumeroCNJ(numero)

      const { data: inserted, error } = await supabase.from('processos').insert({
        user_id: userData.user.id,
        numero: numeroFormatado,
        cliente: cliente.trim(),
        advogado: advogado.trim(),
        comarca: comarca.trim() || 'Não informado',
        vara: vara.trim() || 'Não informado',
        tipo_acao: classe.trim() || null,
        valor_causa: valorCausa ? parseFloat(valorCausa) : 0,
        fase,
        parte_contraria: parteContraria.trim() || null,
        sigla_tribunal: autofillData?.tribunal.sigla || null,
        sistema_tribunal: autofillData?.tribunal.sistema || null,
        data_ultima_sincronizacao: autofillData ? new Date().toISOString() : null,
        descricao_movimentacao: assunto.trim() || null,
      }).select('id').single()

      if (error) throw error

      toast({ title: 'Processo cadastrado!', description: 'Dados salvos com sucesso.' })
      onSuccess?.(inserted?.id)
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Número do Processo */}
      <div className="space-y-1.5">
        <Label>Número do Processo (CNJ) *</Label>
        <div className="relative">
          <Input
            placeholder="0000000-00.0000.0.00.0000"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="pr-10"
          />
          <div className="absolute right-3 top-2.5">
            {loadingAutofill && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            {autofillData && <CheckCircle className="w-4 h-4 text-primary" />}
          </div>
        </div>
        {autofillData && (
          <Badge variant="secondary" className="text-xs">
            {autofillData.tribunal.nome} — {autofillData.tribunal.sistema}
          </Badge>
        )}
        {errorAutofill && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {errorAutofill} — Preencha os campos manualmente.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Cliente + Advogado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Cliente *</Label>
          <Input placeholder="Nome do cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Advogado Responsável *</Label>
          <Input placeholder="Nome do advogado" value={advogado} onChange={(e) => setAdvogado(e.target.value)} />
        </div>
      </div>

      {/* Classe + Assunto (auto-preenchidos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Classe / Tipo de Ação</Label>
          <Input placeholder="Preenchido automaticamente" value={classe} onChange={(e) => setClasse(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Assunto</Label>
          <Input placeholder="Preenchido automaticamente" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
        </div>
      </div>

      {/* Comarca + Vara (auto-preenchidos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Comarca</Label>
          <Input placeholder="Preenchido automaticamente" value={comarca} onChange={(e) => setComarca(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Vara</Label>
          <Input placeholder="Preenchido automaticamente" value={vara} onChange={(e) => setVara(e.target.value)} />
        </div>
      </div>

      {/* Valor + Fase + Parte Contrária */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Valor da Causa (R$)</Label>
          <Input
            type="number"
            placeholder="0,00"
            value={valorCausa}
            onChange={(e) => setValorCausa(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fase Processual</Label>
          <Select value={fase} onValueChange={setFase}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Conhecimento">Conhecimento</SelectItem>
              <SelectItem value="Recursal">Recursal</SelectItem>
              <SelectItem value="Execução">Execução</SelectItem>
              <SelectItem value="Encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Parte Contrária</Label>
          <Input placeholder="Nome da parte contrária" value={parteContraria} onChange={(e) => setParteContraria(e.target.value)} />
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : 'Cadastrar Processo'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
