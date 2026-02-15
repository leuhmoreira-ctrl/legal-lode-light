import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, User, Users, Landmark, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  processo: {
    tipo_acao: string | null;
    advogado: string;
    cliente: string;
    parte_contraria: string | null;
    vara: string;
    comarca: string;
    data_distribuicao: string | null;
    
  };
}

export function ProcessoInfoGrid({ processo }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          Dados do Processo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <InfoItem icon={Scale} label="Tipo de Ação" value={processo.tipo_acao || "Não informado"} />
          <InfoItem icon={User} label="Advogado Responsável" value={processo.advogado} />
          <InfoItem icon={Users} label="Cliente" value={processo.cliente} />
          <InfoItem icon={Users} label="Parte Contrária" value={processo.parte_contraria || "Não informada"} />
          <InfoItem icon={Landmark} label="Vara / Comarca" value={`${processo.vara} — ${processo.comarca}`} />
          <InfoItem
            icon={Calendar}
            label="Data de Distribuição"
            value={processo.data_distribuicao ? format(parseISO(processo.data_distribuicao), "dd/MM/yyyy") : "Não informada"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof Scale; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
