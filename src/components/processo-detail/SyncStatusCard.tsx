import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type SyncStatus = "synced" | "pending" | "error" | "not_configured";

interface SyncStatusCardProps {
  siglaTribunal: string | null;
  sistemaTribunal: string | null;
  lastSync: string | null;
  onSync: () => Promise<void>;
  syncing: boolean;
  syncStatus: SyncStatus;
}

const STATUS_CONFIG: Record<SyncStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  synced: { label: "Sincronizado", icon: CheckCircle2, className: "bg-[hsl(152,60%,40%)]/10 text-[hsl(152,60%,40%)] border-[hsl(152,60%,40%)]/20" },
  pending: { label: "Aguardando sincronização", icon: Clock, className: "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/20" },
  error: { label: "Erro na conexão", icon: AlertCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  not_configured: { label: "Não configurado", icon: WifiOff, className: "bg-muted text-muted-foreground border-border" },
};

export function SyncStatusCard({ siglaTribunal, sistemaTribunal, lastSync, onSync, syncing, syncStatus }: SyncStatusCardProps) {
  const config = STATUS_CONFIG[syncStatus];
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            Sincronização com Tribunal
          </CardTitle>
          <Badge variant="outline" className={config.className}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Tribunal vinculado</p>
            <p className="font-medium mt-0.5">
              {siglaTribunal ? siglaTribunal.toUpperCase() : "Não identificado"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Sistema processual</p>
            <p className="font-medium mt-0.5">{sistemaTribunal || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">Última atualização</p>
            <p className="font-medium mt-0.5">
              {lastSync
                ? formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })
                : "Nunca sincronizado"}
            </p>
          </div>
        </div>

        <Button
          onClick={onSync}
          disabled={syncing || !siglaTribunal}
          variant="ghost"
          size="sm"
          className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </CardContent>
    </Card>
  );
}
