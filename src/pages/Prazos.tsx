import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { prazosMock } from "@/data/mockData";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  getDay,
  addMonths,
  subMonths,
  isPast,
  isToday as isDateToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Scale,
  Briefcase,
  UserRound,
  User,
  Building2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "personal" | "office";

type EventCategory = "processual" | "escritorio" | "pessoal";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  observacoes?: string | null;
  date: Date;
  category: EventCategory;
  processoNumero?: string;
  processoId?: string;
  responsavel?: string;
  urgency: "urgente" | "proximo" | "em_dia";
  source: "mock" | "db";
}

const CATEGORY_CONFIG: Record<
  EventCategory,
  { label: string; icon: React.ElementType; dotClass: string; badgeClass: string }
> = {
  processual: {
    label: "Prazos Processuais",
    icon: Scale,
    dotClass: "bg-orange-500",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  },
  escritorio: {
    label: "Tarefas do Escritório",
    icon: Briefcase,
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  pessoal: {
    label: "Pessoal",
    icon: UserRound,
    dotClass: "bg-violet-500",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
  },
};

const urgencyBg: Record<string, string> = {
  urgente: "urgency-high",
  proximo: "urgency-medium",
  em_dia: "urgency-low",
};

const urgencyLabel: Record<string, string> = {
  urgente: "Urgente",
  proximo: "Próximo",
  em_dia: "Em dia",
};

function classifyMockPrazo(tipo: string): EventCategory {
  if (tipo === "Processual" || tipo === "Audiência") return "processual";
  if (tipo === "Administrativo" || tipo === "Reunião") return "escritorio";
  return "escritorio";
}

function classifyDbTask(task: any): EventCategory {
  if (task.event_category === "pessoal") return "pessoal";
  if (task.event_category === "processual" || task.processo_id) return "processual";
  return "escritorio";
}

function loadFilterPrefs(): Record<EventCategory, boolean> {
  try {
    const saved = localStorage.getItem("prazos_filters");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { processual: true, escritorio: true, pessoal: false };
}

export default function Prazos() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("personal");
  const [dbTasks, setDbTasks] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<EventCategory, boolean>>(loadFilterPrefs);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { user } = useAuth();
  const { isAdmin, isSenior, teamMembers } = usePermissions();

  const canViewOffice = isAdmin || isSenior;

  // Persist filter prefs
  useEffect(() => {
    localStorage.setItem("prazos_filters", JSON.stringify(filters));
  }, [filters]);

  const toggleFilter = useCallback((cat: EventCategory) => {
    setFilters((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  // Load tasks with due_date from database
  useEffect(() => {
    const loadTasks = async () => {
      if (!user) return;
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Load non-personal tasks (visible based on viewMode)
      let nonPersonalQuery = supabase
        .from("kanban_tasks")
        .select("*")
        .not("due_date", "is", null)
        .neq("event_category", "pessoal")
        .gte("due_date", format(start, "yyyy-MM-dd"))
        .lte("due_date", format(end, "yyyy-MM-dd"))
        .order("due_date", { ascending: true });

      if (viewMode === "personal") {
        nonPersonalQuery = nonPersonalQuery.or(`assigned_to.eq.${user.id},user_id.eq.${user.id}`);
      }

      // Load personal tasks (always filtered to current user only)
      const personalQuery = supabase
        .from("kanban_tasks")
        .select("*")
        .not("due_date", "is", null)
        .eq("event_category", "pessoal")
        .eq("user_id", user.id)
        .gte("due_date", format(start, "yyyy-MM-dd"))
        .lte("due_date", format(end, "yyyy-MM-dd"))
        .order("due_date", { ascending: true });

      const [nonPersonalRes, personalRes] = await Promise.all([nonPersonalQuery, personalQuery]);
      setDbTasks([...(nonPersonalRes.data || []), ...(personalRes.data || [])]);
    };
    loadTasks();
  }, [user, viewMode, currentMonth]);

  // Build unified events list
  const events: CalendarEvent[] = useMemo(() => {
    const result: CalendarEvent[] = [];

    // From mock data
    prazosMock.forEach((p) => {
      result.push({
        id: `mock-${p.id}`,
        title: p.descricao,
        date: parseISO(p.dataVencimento),
        category: classifyMockPrazo(p.tipo),
        processoNumero: p.processoNumero,
        processoId: p.processoId,
        responsavel: p.responsavel,
        urgency: p.status,
        source: "mock",
      });
    });

    // From database
    dbTasks.forEach((t) => {
      const getMemberName = (id: string | null) =>
        teamMembers.find((m) => m.id === id)?.full_name || "—";
      result.push({
        id: `db-${t.id}`,
        title: t.title,
        description: t.description,
        observacoes: t.observacoes,
        date: new Date(t.due_date),
        category: classifyDbTask(t),
        responsavel: getMemberName(t.assigned_to),
        urgency:
          isPast(new Date(t.due_date)) && !isDateToday(new Date(t.due_date))
            ? "urgente"
            : isDateToday(new Date(t.due_date))
            ? "proximo"
            : "em_dia",
        source: "db",
      });
    });

    return result;
  }, [dbTasks, teamMembers]);

  // Apply category filters
  const filteredEvents = useMemo(
    () => events.filter((e) => filters[e.category]),
    [events, filters]
  );

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startDayOfWeek = getDay(start);

  const getEventsForDay = (day: Date) =>
    filteredEvents.filter((e) => isSameDay(e.date, day));

  // Stats
  const stats = useMemo(() => {
    const overdue = filteredEvents.filter((e) => e.urgency === "urgente").length;
    const todayCount = filteredEvents.filter((e) => isDateToday(e.date)).length;
    return {
      total: filteredEvents.length,
      overdue,
      today: todayCount,
      upcoming: filteredEvents.length - overdue - todayCount,
    };
  }, [filteredEvents]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header with segmented control */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="mobile-page-title font-bold text-foreground">Prazos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Calendário e controle de prazos processuais
            </p>
          </div>

          <div className="flex items-center rounded-lg bg-muted p-1 gap-1 w-full sm:w-auto">
            <button
              onClick={() => setViewMode("personal")}
              className={cn(
                "min-h-[44px] flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[14px] font-medium transition-all",
                viewMode === "personal"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="w-4 h-4" />
              Meus Prazos
            </button>
            {canViewOffice && (
              <button
                onClick={() => setViewMode("office")}
                className={cn(
                  "min-h-[44px] flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[14px] font-medium transition-all",
                  viewMode === "office"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Building2 className="w-4 h-4" />
                Escritório
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {(Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][]).map(
            ([key, cfg]) => {
              const Icon = cfg.icon;
              const count = events.filter((e) => e.category === key).length;
              return (
                <label
                  key={key}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 px-3 py-2 rounded-full border text-[14px] cursor-pointer transition-all select-none",
                    filters[key]
                      ? cfg.badgeClass
                      : "bg-muted/50 text-muted-foreground border-border opacity-60"
                  )}
                >
                  <Checkbox
                    checked={filters[key]}
                    onCheckedChange={() => toggleFilter(key)}
                    className="h-4 w-4"
                  />
                  <Icon className="w-3.5 h-3.5" />
                  <span className="font-medium">{cfg.label}</span>
                  <span className="text-[13px] opacity-70">({count})</span>
                </label>
              );
            }
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-[13px] text-muted-foreground">Total</p>
            <p className="text-[28px] font-bold text-foreground">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[13px] text-muted-foreground">Hoje</p>
            <p className="text-[28px] font-bold text-primary">{stats.today}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[13px] text-muted-foreground">Atrasados</p>
            <p className="text-[28px] font-bold text-destructive">{stats.overdue}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[13px] text-muted-foreground">Próximos</p>
            <p className="text-[28px] font-bold text-foreground">{stats.upcoming}</p>
          </Card>
        </div>

        <Tabs defaultValue="calendario">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="calendario" className="flex-1 sm:flex-none">Calendário</TabsTrigger>
            <TabsTrigger value="lista" className="flex-1 sm:flex-none">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="calendario" className="mt-4">
            <Card className="p-4 sm:p-5">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded hover:bg-muted"
                >
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h3>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded hover:bg-muted"
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-[13px] font-medium text-muted-foreground py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24" />
                ))}
                {days.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "h-24 min-w-0 overflow-hidden rounded-lg p-1.5 text-[13px] border transition-colors",
                        isToday
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "font-medium",
                          isToday ? "text-primary" : "text-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 2).map((ev) => {
                          const cfg = CATEGORY_CONFIG[ev.category];
                          return (
                            <div
                              key={ev.id}
                              className={cn(
                                "flex w-full min-w-0 min-h-[20px] items-center gap-1 px-1 py-0.5 rounded text-[11px] cursor-pointer hover:opacity-80 transition-opacity overflow-hidden",
                                cfg.badgeClass
                              )}
                              onClick={() => setSelectedEvent(ev)}
                            >
                              <div
                                className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotClass)}
                              />
                              <span className="min-w-0 flex-1 truncate">{ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{dayEvents.length - 2} mais
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                {(Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][]).map(
                  ([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <div key={key} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <div className={cn("w-2.5 h-2.5 rounded-full", cfg.dotClass)} />
                        <Icon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                      </div>
                    );
                  }
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="lista" className="mt-4">
            <div className="space-y-3">
              {filteredEvents.length === 0 && (
                <Card className="p-8">
                  <div className="text-center text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum evento encontrado com os filtros selecionados</p>
                  </div>
                </Card>
              )}
              {filteredEvents
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((ev) => {
                  const cfg = CATEGORY_CONFIG[ev.category];
                  const Icon = cfg.icon;
                  return (
                    <Card
                      key={ev.id}
                      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedEvent(ev)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 px-2 py-1 rounded text-[13px] font-semibold border w-fit",
                            urgencyBg[ev.urgency]
                          )}
                        >
                          {urgencyLabel[ev.urgency]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[15px] font-medium text-foreground">
                              {ev.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-[13px] gap-1", cfg.badgeClass)}
                            >
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-[13px] text-muted-foreground mt-1">
                            {ev.processoNumero && `Processo: ${ev.processoNumero} • `}
                            {ev.responsavel && `Responsável: ${ev.responsavel}`}
                          </p>
                          {ev.observacoes && (
                            <p className="text-[13px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                              💡 {ev.observacoes}
                            </p>
                          )}
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-[15px] font-semibold text-foreground">
                            {format(ev.date, "dd/MM/yyyy")}
                          </p>
                          <p className="text-[13px] text-muted-foreground">
                            {format(ev.date, "EEEE", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <EventDetailDialog
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}

// -- Event Detail Dialog --
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function EventDetailDialog({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const cfg = CATEGORY_CONFIG[event.category];
  const Icon = cfg.icon;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-[13px] gap-1", cfg.badgeClass)}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[13px]", urgencyBg[event.urgency])}
            >
              {urgencyLabel[event.urgency]}
            </Badge>
          </div>
          <DialogTitle className="text-lg">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {event.description && (
            <p className="text-muted-foreground">{event.description}</p>
          )}

          {event.observacoes && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">📝 Observações</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{event.observacoes}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
            <div>
              <span className="text-muted-foreground">Data:</span>{" "}
              <span className="font-medium text-foreground">
                {format(event.date, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
              </span>
            </div>
            {event.responsavel && (
              <div>
                <span className="text-muted-foreground">Responsável:</span>{" "}
                <span className="font-medium text-foreground">{event.responsavel}</span>
              </div>
            )}
            {event.processoNumero && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Processo:</span>{" "}
                <span className="font-mono font-medium text-primary">
                  {event.processoNumero}
                </span>
              </div>
            )}
          </div>

          {event.category === "pessoal" && (
            <Badge variant="secondary" className="text-[13px]">🔒 Privado</Badge>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
