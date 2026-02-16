import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  ListChecks,
  ArrowUpRight,
  Clock,
  Scale,
  Star,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { prazosMock, processosMock, tarefasMock } from "@/data/mockData";
import { format, parseISO, isAfter, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

const faseData = [
  { name: "Conhecimento", value: 3 },
  { name: "Recursal", value: 1 },
  { name: "Execução", value: 1 },
];

const getProductivityColor = (value: number) => {
  if (value >= 30) return "hsl(152, 40%, 35%)";   // verde escuro — alta
  if (value >= 25) return "hsl(152, 30%, 45%)";   // verde médio
  if (value >= 20) return "hsl(200, 25%, 50%)";   // azul acinzentado — médio
  if (value >= 15) return "hsl(220, 20%, 55%)";   // cinza azulado — baixo
  return "hsl(220, 15%, 65%)";                     // cinza — muito baixo
};

const produtividadeData = [
  { mes: "Set", tarefas: 18 },
  { mes: "Out", tarefas: 24 },
  { mes: "Nov", tarefas: 21 },
  { mes: "Dez", tarefas: 28 },
  { mes: "Jan", tarefas: 32 },
  { mes: "Fev", tarefas: 26 },
];

const PIE_COLORS = [
  "hsl(220, 60%, 22%)",
  "hsl(220, 45%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 40%)",
];

const statusLabel: Record<string, string> = {
  urgente: "Urgente",
  proximo: "Próximo",
  em_dia: "Em dia",
};

const statusClass: Record<string, string> = {
  urgente: "urgency-high",
  proximo: "urgency-medium",
  em_dia: "urgency-low",
};

export default function Dashboard() {
  const hoje = new Date();
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);

  useEffect(() => {
    const loadTodayTasks = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("kanban_tasks")
        .select("*")
        .eq("marked_for_today", true)
        .neq("status", "done")
        .or(`assigned_to.eq.${user.id},user_id.eq.${user.id}`)
        .order("marked_for_today_at", { ascending: true });
      setTodayTasks(data || []);
      setLoadingToday(false);
    };
    loadTodayTasks();
  }, [user]);

  const getMemberName = (id: string | null) =>
    teamMembers.find((m) => m.id === id)?.full_name || "—";

  const prazosUrgentes = prazosMock.filter(
    (p) => p.status === "urgente" || p.status === "proximo"
  );
  const tarefasPendentes = tarefasMock.filter((t) => t.status !== "done");
  const movimentacoesRecentes = processosMock
    .sort((a, b) => b.ultimaMovimentacao.localeCompare(a.ultimaMovimentacao))
    .slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do escritório •{" "}
            {format(hoje, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Meu Foco Hoje */}
        {loadingToday ? (
          <Card className="p-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </Card>
        ) : todayTasks.length > 0 && (
          <Card className="p-5 border-yellow-400/30 bg-yellow-50/20 dark:bg-yellow-900/10">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <h3 className="text-sm font-semibold text-foreground">Meu Foco Hoje ({todayTasks.length} tarefas)</h3>
            </div>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/80 border border-yellow-200/30">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {getMemberName(task.assigned_to)}
                      {task.due_date && ` • ${format(new Date(task.due_date), "dd/MM")}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${task.priority === 'high' ? 'urgency-high' : task.priority === 'medium' ? 'urgency-medium' : 'urgency-low'}`}>
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Prazos Urgentes
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {prazosUrgentes.length}
                </p>
                <p className="text-xs text-urgent mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Próximos 7 dias
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-urgent/10">
                <AlertTriangle className="w-5 h-5 text-urgent" />
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Processos Ativos
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {processosMock.length}
                </p>
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />2 novos este mês
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Scale className="w-5 h-5 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tarefas Pendentes
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {tarefasPendentes.length}
                </p>
                <p className="text-xs text-warning mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />3 de alta prioridade
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-warning/10">
                <ListChecks className="w-5 h-5 text-warning" />
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Audiências Semana
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">2</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Próxima em 3 dias
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-accent/10">
                <CalendarDays className="w-5 h-5 text-accent" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="stat-card lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Produtividade Mensal
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={produtividadeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,90%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
                <Tooltip />
                <Bar dataKey="tarefas" radius={[4, 4, 0, 0]}>
                  {produtividadeData.map((entry, index) => (
                    <Cell key={index} fill={getProductivityColor(entry.tarefas)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Processos por Fase
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={faseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {faseData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {faseData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i] }}
                  />
                  {item.name}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Prazos */}
          <Card className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Próximos Prazos
              </h3>
              <Badge variant="secondary" className="text-xs">
                {prazosUrgentes.length} pendentes
              </Badge>
            </div>
            <div className="space-y-3">
              {prazosMock.slice(0, 5).map((prazo) => (
                <div
                  key={prazo.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div
                    className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${statusClass[prazo.status]}`}
                  >
                    {statusLabel[prazo.status]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {prazo.descricao}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {prazo.processoNumero} • {prazo.responsavel}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(parseISO(prazo.dataVencimento), "dd/MM")}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Movimentações */}
          <Card className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Movimentações Recentes
              </h3>
              <Badge variant="secondary" className="text-xs">
                Últimas 3
              </Badge>
            </div>
            <div className="space-y-3">
              {movimentacoesRecentes.map((proc) => (
                <div
                  key={proc.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="p-1.5 rounded bg-primary/10">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {proc.descricaoMovimentacao}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {proc.numero} • {proc.cliente}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(parseISO(proc.ultimaMovimentacao), "dd/MM")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
