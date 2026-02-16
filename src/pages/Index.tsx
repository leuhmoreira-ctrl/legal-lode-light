import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
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
import { CountUp } from "@/components/ui/count-up";
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines";

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
      <div className="space-y-8 animate-fade-up pb-8">
        {/* Header */}
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.7px] text-[#1D1D1F] dark:text-white">Dashboard</h1>
          <p className="text-[15px] font-normal tracking-[-0.2px] text-[#6E6E73] dark:text-white/60 mt-1 flex items-center gap-2">
            Visão geral do escritório <span className="text-[#86868B]">•</span> {format(hoje, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Meu Foco Hoje */}
        {loadingToday ? (
          <div className="p-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </div>
        ) : todayTasks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-[#FF9500] text-[#FF9500]" />
              <h3 className="text-[20px] font-semibold tracking-[-0.3px] text-[#1D1D1F] dark:text-white">Meu Foco Hoje</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-3 p-4 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.05] border border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.08] hover:border-blue-500/20 transition-all duration-200 hover:translate-x-1 cursor-pointer"
                >
                  <Star className="w-4 h-4 text-[#FF9500]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-medium tracking-[-0.4px] text-[#1D1D1F] dark:text-white truncate">{task.title}</p>
                    <p className="text-[13px] text-[#6E6E73] font-normal tracking-[-0.1px] mt-0.5">
                      {getMemberName(task.assigned_to)} <span className="text-[#86868B] mx-1">•</span> {task.due_date && format(new Date(task.due_date), "dd/MM")}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide transition-colors ${
                    task.priority === 'high'
                      ? 'bg-[#FF3B30]/12 text-[#FF3B30] group-hover:bg-[#FF3B30]/20'
                      : task.priority === 'medium'
                        ? 'bg-[#FF9500]/12 text-[#FF9500] group-hover:bg-[#FF9500]/20'
                        : 'bg-[#34C759]/12 text-[#34C759] group-hover:bg-[#34C759]/20'
                  }`}>
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Prazos Urgentes */}
          <div className="apple-card p-6 group cursor-pointer">
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6E6E73]">
                  Prazos Urgentes
                </span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-urgent shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-[40px] md:text-[52px] font-bold tracking-[-1.2px] text-[#1D1D1F] dark:text-white leading-none animate-count-up">
                  <CountUp end={prazosUrgentes.length} />
                </div>
                <div className="text-[14px] text-[#6E6E73] font-normal tracking-[-0.1px] mt-2 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[#86868B]" />
                  Próximos 7 dias
                </div>
              </div>
            </div>
          </div>

          {/* Processos Ativos */}
          <div className="apple-card p-6 group cursor-pointer">
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6E6E73]">
                  Processos Ativos
                </span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-active shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Scale className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-[40px] md:text-[52px] font-bold tracking-[-1.2px] text-[#1D1D1F] dark:text-white leading-none animate-count-up">
                  <CountUp end={processosMock.length} />
                </div>
                <div className="text-[14px] text-[#6E6E73] font-normal tracking-[-0.1px] mt-2 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#34C759]" />
                  <span className="text-[#34C759]">2 novos</span> este mês
                </div>
              </div>
            </div>
          </div>

          {/* Tarefas Pendentes */}
          <div className="apple-card p-6 group cursor-pointer">
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6E6E73]">
                  Tarefas Pendentes
                </span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-pending shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <ListChecks className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-[40px] md:text-[52px] font-bold tracking-[-1.2px] text-[#1D1D1F] dark:text-white leading-none animate-count-up">
                  <CountUp end={tarefasPendentes.length} />
                </div>
                <div className="text-[14px] text-[#6E6E73] font-normal tracking-[-0.1px] mt-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FF9500]" />
                  <span className="text-[#FF9500]">3 de alta</span> prioridade
                </div>
              </div>
            </div>
          </div>

          {/* Audiências */}
          <div className="apple-card p-6 group cursor-pointer">
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#6E6E73]">
                  Audiências
                </span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-audience shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <CalendarDays className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <div className="text-[40px] md:text-[52px] font-bold tracking-[-1.2px] text-[#1D1D1F] dark:text-white leading-none animate-count-up">
                  <CountUp end={2} />
                </div>
                <div className="text-[14px] text-[#6E6E73] font-normal tracking-[-0.1px] mt-2 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[#86868B]" />
                  Próxima em 3 dias
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="apple-card p-6 lg:col-span-2">
            <h3 className="text-[20px] font-semibold text-[#1D1D1F] dark:text-white mb-6 tracking-[-0.4px]">
              Produtividade Mensal
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={produtividadeData} barGap={16}>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.06)" strokeDasharray="0" />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: '#6E6E73', fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#86868B', fontWeight: 500 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="tarefas" radius={[6, 6, 0, 0]} barSize={32}>
                  {produtividadeData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={["#5AC8FA", "#007AFF", "#0A84FF", "#34C759", "#30D158", "#00C7BE"][index % 6]}
                      className="transition-all duration-200 hover:brightness-110 hover:-translate-y-1"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="apple-card p-6 flex flex-col">
            <h3 className="text-[20px] font-semibold text-[#1D1D1F] dark:text-white mb-6 tracking-[-0.4px]">
              Processos por Fase
            </h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={faseData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="100%"
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {faseData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={["#1D1D1F", "#007AFF", "#FF9500"][i % 3]}
                        strokeWidth={0}
                        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-6 justify-center">
              {faseData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ["#1D1D1F", "#007AFF", "#FF9500"][i % 3] }}
                  />
                  <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-white tracking-[-0.1px]">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prazos + Movimentações side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <UpcomingDeadlines />

          {/* Movimentações Recentes */}
          <div className="apple-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-semibold text-[#1D1D1F] dark:text-white tracking-[-0.4px]">
                Movimentações Recentes
              </h3>
              <span className="bg-[#E5E5EA] dark:bg-[#38383A] text-[#1D1D1F] dark:text-white px-2.5 py-1 rounded-full text-[12px] font-medium">
                Últimas 3
              </span>
            </div>
            <div className="space-y-3">
              {movimentacoesRecentes.map((proc) => (
                <div
                  key={proc.id}
                  className="flex items-start gap-3 p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.05] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors duration-200"
                >
                  <div className="p-2 rounded-full bg-[#007AFF]/10">
                    <FileText className="w-3.5 h-3.5 text-[#007AFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1D1D1F] dark:text-white truncate tracking-[-0.1px]">
                      {proc.descricaoMovimentacao}
                    </p>
                    <p className="text-[12px] text-[#6E6E73] mt-0.5">
                      {proc.numero} <span className="mx-1">•</span> {proc.cliente}
                    </p>
                  </div>
                  <span className="text-[12px] font-medium text-[#6E6E73] whitespace-nowrap bg-white dark:bg-[#2C2C2E] px-2 py-1 rounded-md shadow-sm border border-black/5">
                    {format(parseISO(proc.ultimaMovimentacao), "dd/MM")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
