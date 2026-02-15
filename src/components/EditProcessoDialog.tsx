import { useState, useEffect } from 'react'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface Processo {
  id: string
  numero: string
  cliente: string
  parte_contraria: string | null
  advogado: string
  tipo_acao: string | null
  comarca: string
  vara: string
  valor_causa: number | null
  fase: string | null
}

interface EditProcessoDialogProps {
  processo: Processo
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onDelete?: () => void
  canDelete?: boolean
}

export function EditProcessoDialog({ processo, open, onOpenChange, onSuccess, onDelete, canDelete }: EditProcessoDialogProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const [cliente, setCliente] = useState('')
  const [parteContraria, setParteContraria] = useState('')
  const [advogado, setAdvogado] = useState('')
  const [classe, setClasse] = useState('')
  const [comarca, setComarca] = useState('')
  const [vara, setVara] = useState('')
  const [valorCausa, setValorCausa] = useState('')
  const [fase, setFase] = useState('Conhecimento')

  useEffect(() => {
    if (open) {
      setCliente(processo.cliente)
      setParteContraria(processo.parte_contraria || '')
      setAdvogado(processo.advogado)
      setClasse(processo.tipo_acao || '')
      setComarca(processo.comarca)
      setVara(processo.vara)
      setValorCausa(processo.valor_causa ? String(processo.valor_causa) : '')
      setFase(processo.fase || 'Conhecimento')
    }
  }, [open, processo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cliente.trim() || !advogado.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha cliente e advogado.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('processos')
        .update({
          cliente: cliente.trim(),
          parte_contraria: parteContraria.trim() || null,
          advogado: advogado.trim(),
          tipo_acao: classe.trim() || null,
          comarca: comarca.trim() || 'Não informado',
          vara: vara.trim() || 'Não informado',
          valor_causa: valorCausa ? parseFloat(valorCausa) : 0,
          fase,
        })
        .eq('id', processo.id)

      if (error) throw error

      toast({ title: 'Processo atualizado!' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Processo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Número (read-only) */}
          <div className="space-y-1.5">
            <Label>Número do Processo (CNJ)</Label>
            <Input value={processo.numero} disabled className="font-mono" />
          </div>

          {/* Polo Ativo + Passivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Polo Ativo (Cliente) *</Label>
              <Input placeholder="Nome do autor/reclamante" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Polo Passivo (Parte Contrária)</Label>
              <Input placeholder="Nome do réu/reclamado" value={parteContraria} onChange={(e) => setParteContraria(e.target.value)} />
            </div>
          </div>

          {/* Advogado */}
          <div className="space-y-1.5">
            <Label>Advogado Responsável *</Label>
            <Input placeholder="Nome do advogado" value={advogado} onChange={(e) => setAdvogado(e.target.value)} />
          </div>

          {/* Classe */}
          <div className="space-y-1.5">
            <Label>Classe / Tipo de Ação</Label>
            <Input placeholder="Ex: Ação Trabalhista" value={classe} onChange={(e) => setClasse(e.target.value)} />
          </div>

          {/* Comarca + Vara */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Comarca</Label>
              <Input value={comarca} onChange={(e) => setComarca(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vara</Label>
              <Input value={vara} onChange={(e) => setVara(e.target.value)} />
            </div>
          </div>

          {/* Fase */}
          <div className="space-y-1.5">
            <Label>Fase Processual</Label>
            <Select value={fase} onValueChange={setFase}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Conhecimento">Conhecimento</SelectItem>
                <SelectItem value="Recursal">Recursal</SelectItem>
                <SelectItem value="Execução">Execução</SelectItem>
                <SelectItem value="Encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : 'Salvar Alterações'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
          {canDelete && onDelete && (
            <div className="pt-2 border-t">
              <Button type="button" variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
                Deletar Processo
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
