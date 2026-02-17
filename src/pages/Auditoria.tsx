import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/contexts/PermissionsContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface AuditLog {
  id: number;
  record_id: string;
  table_name: string;
  op: string;
  ts: string;
  user_id: string;
  old_record: Record<string, unknown> | null;
  record: Record<string, unknown> | null;
}

const opColor: Record<string, string> = {
  INSERT: "bg-success/10 text-success border-success/20",
  UPDATE: "bg-warning/10 text-warning border-warning/20",
  DELETE: "bg-destructive/10 text-destructive border-destructive/20",
};

const opLabel: Record<string, string> = {
  INSERT: "Criação",
  UPDATE: "Edição",
  DELETE: "Exclusão",
};

export default function Auditoria() {
  const { isSenior, teamMembers } = usePermissions();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_audit_logs");
      if (error) throw error;
      if (data) setLogs(data as unknown as AuditLog[]);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSenior) loadLogs();
  }, [isSenior, loadLogs]);

  const getUserName = (userId: string | null) => {
    if (!userId) return "Sistema";
    return teamMembers.find((m) => m.id === userId)?.full_name || "Usuário";
  };

  if (!isSenior) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Shield className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Acesso Restrito</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Apenas administradores e seniores podem acessar logs de auditoria.
          </p>
        </div>
      </AppLayout>
    );
  }

  const logsFiltrados = logs.filter(
    (log) =>
      log.table_name?.toLowerCase().includes(filtro.toLowerCase()) ||
      getUserName(log.user_id).toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="page-shell">
        <PageHeader
          eyebrow="Rastreabilidade"
          title="Auditoria"
          subtitle="Histórico de alterações no sistema"
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por tabela ou usuário..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9 touch-target"
          />
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : logsFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum log encontrado.</p>
          ) : (
            logsFiltrados.map((log) => (
              <Card key={log.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${opColor[log.op] || ""}`}>
                    {opLabel[log.op] || log.op}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{log.table_name}</span>
                      <span className="text-xs text-muted-foreground">por {getUserName(log.user_id)}</span>
                    </div>
                    {log.op === "UPDATE" && log.old_record && log.record && (
                      <div className="mt-2 space-y-1">
                        {Object.keys(log.record).map((key) => {
                          if (JSON.stringify(log.old_record?.[key]) !== JSON.stringify(log.record?.[key])) {
                            return (
                              <p key={key} className="text-xs text-muted-foreground">
                                <span className="font-medium">{key}:</span>{" "}
                                <span className="line-through">{JSON.stringify(log.old_record?.[key])}</span>
                                {" → "}
                                <span className="text-foreground">{JSON.stringify(log.record?.[key])}</span>
                              </p>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(log.ts).toLocaleString("pt-BR")}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
