import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, type UserRole } from "@/contexts/PermissionsContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText, ListTodo, Shield, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  senior: "Advogado Sênior",
  junior: "Advogado Júnior",
  intern: "Estagiário",
  secretary: "Secretário",
};

interface AdvProfile {
  id: string;
  full_name: string;
  email: string;
}

export default function AdvogadoDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { canViewAllProcesses } = usePermissions();
  const [advogado, setAdvogado] = useState<AdvProfile | null>(null);
  const [advRole, setAdvRole] = useState<UserRole | null>(null);
  const [stats, setStats] = useState({ processos: 0, tarefas: 0 });
  const [processos, setProcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const targetId = id || user?.id;

  useEffect(() => {
    if (!targetId) return;
    if (targetId !== user?.id && !canViewAllProcesses()) {
      setDenied(true);
      setLoading(false);
      return;
    }
    loadDashboard();
  }, [targetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboard = async () => {
    const [{ data: profile }, { data: role }, { data: procs }, { data: tasks }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetId!).single(),
      supabase.from("user_roles").select("role").eq("user_id", targetId!).limit(1).single(),
      supabase.from("processos").select("id, numero, cliente, fase").or(`user_id.eq.${targetId},advogado_id.eq.${targetId}`),
      supabase.from("kanban_tasks").select("id").eq("assigned_to", targetId!).neq("status", "done"),
    ]);

    if (profile) setAdvogado(profile as AdvProfile);
    if (role) setAdvRole(role.role as UserRole);
    setProcessos(procs || []);
    setStats({ processos: procs?.length || 0, tarefas: tasks?.length || 0 });
    setLoading(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (denied || !advogado) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Shield className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Acesso Negado</h3>
          <p className="text-sm text-muted-foreground mt-1">Você não tem permissão para ver este dashboard.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Profile header */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                {advogado.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-foreground">{advogado.full_name}</h1>
              <p className="text-sm text-muted-foreground">{advogado.email}</p>
              {advRole && (
                <Badge variant="outline" className="mt-1 text-xs">{roleLabels[advRole]}</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Processos</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.processos}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tarefas Pendentes</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.tarefas}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-warning/10">
                <ListTodo className="w-5 h-5 text-warning" />
              </div>
            </div>
          </Card>
        </div>

        {/* Processos list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processos do Advogado</CardTitle>
          </CardHeader>
          <CardContent>
            {processos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum processo atribuído.</p>
            ) : (
              <div className="space-y-2">
                {processos.map((p) => (
                  <Link key={p.id} to="/processos" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-mono font-medium text-foreground truncate">{p.numero}</p>
                      <p className="text-xs text-muted-foreground">{p.cliente}</p>
                    </div>
                    {p.fase && (
                      <Badge variant="outline" className="text-[10px]">{p.fase}</Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
