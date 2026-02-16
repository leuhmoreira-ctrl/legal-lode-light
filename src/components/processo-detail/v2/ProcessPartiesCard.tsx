import { Users, User, Shield, Briefcase, Building2, Folder, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessPartiesCardProps {
  cliente: string;
  parteContraria: string | null;
  advogado: string;
  vara: string;
  comarca: string;
  tipoAcao: string | null;
  dataDistribuicao: string | null;
}

export function ProcessPartiesCard({
  cliente,
  parteContraria,
  advogado,
  vara,
  comarca,
  tipoAcao,
  dataDistribuicao,
}: ProcessPartiesCardProps) {
  return (
    <Card className="shadow-none border border-border/40 bg-card rounded-xl h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          Partes do Processo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6">
          {/* Cliente */}
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">CLIENTE</p>
              <p className="text-base font-semibold text-foreground">{cliente}</p>
            </div>
          </div>

          {/* Parte Contrária */}
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">PARTE CONTRÁRIA</p>
              <p className="text-base font-semibold text-foreground">{parteContraria || "Não informada"}</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-border/50 w-full" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
          {/* Advogado */}
          <div className="flex gap-3 items-start">
            <Briefcase className="w-4 h-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">ADVOGADO</p>
              <p className="text-sm font-medium text-foreground">{advogado}</p>
            </div>
          </div>

          {/* Vara / Comarca */}
          <div className="flex gap-3 items-start">
            <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">VARA / COMARCA</p>
              <p className="text-sm font-medium text-foreground">{vara} — {comarca}</p>
            </div>
          </div>

          {/* Tipo de Ação */}
          <div className="flex gap-3 items-start">
            <Folder className="w-4 h-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">TIPO DE AÇÃO</p>
              <p className="text-sm font-medium text-foreground">{tipoAcao || "Não informado"}</p>
            </div>
          </div>

          {/* Data de Distribuição */}
          <div className="flex gap-3 items-start">
            <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">DATA DE DISTRIBUIÇÃO</p>
              <p className="text-sm font-medium text-muted-foreground">
                {dataDistribuicao
                  ? format(parseISO(dataDistribuicao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : "Não informada"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
