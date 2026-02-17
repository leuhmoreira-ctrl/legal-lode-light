import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ChevronLeft,
  ChevronRight,
  Scale,
  Briefcase,
  UserRound,
  User,
  Building2,
  Calendar,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/layout/PageHeader";

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

const DEFAULT_FILTERS: Record<EventCategory, boolean> = {
  processual: true,
  escritorio: true,
  pessoal: false,
};

const ALL_FILTERS: Record<EventCategory, boolean> = {
  processual: true,
  escritorio: true,
  pessoal: true,
};

const CATEGORY_SHORT_LABEL: Record<EventCategory, string> = {
  processual: "Prazos",
  escritorio: "Tarefas",
  pessoal: "Pessoal",
};

function loadFilterPrefs(): Record<EventCategory, boolean> {
  try {
    const saved = localStorage.getItem("prazos_filters");
    if (saved) return { ...DEFAULT_FILTERS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_FILTERS };
}

export default function Prazos() {
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("personal");
  const [calendarTab, setCalendarTab] = useState<"month" | "agenda">("month");
  const [dbTasks, setDbTasks] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<EventCategory, boolean>>(loadFilterPrefs);
  const [mobileFilterDraft, setMobileFilterDraft] = useState<Record<EventCategory, boolean>>(loadFilterPrefs);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { user } = useAuth();
  const { isAdmin, isSenior, teamMembers } = usePermissions();

  const canViewOffice = isAdmin || isSenior;

  useEffect(() => {
    localStorage.setItem("prazos_filters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    setMobileFilterDraft(filters);
  }, [filters]);

  useEffect(() => {
    if (!isMobile) {
      setMobileFiltersOpen(false);
      setMobileSummaryOpen(false);
    }
  }, [isMobile]);

  const toggleFilter = useCallback((cat: EventCategory) => {
    setFilters((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const toggleMobileDraftFilter = useCallback((cat: EventCategory) => {
    setMobileFilterDraft((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      if (!user) return;
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

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

  const events: CalendarEvent[] = useMemo(() => {
    const result: CalendarEvent[] = [];

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

  const filteredEvents = useMemo(
    () => events.filter((e) => filters[e.category]),
    [events, filters]
  );

  const sortedEvents = useMemo(
    () => [...filteredEvents].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [filteredEvents]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<EventCategory, number> = {
      processual: 0,
      escritorio: 0,
      pessoal: 0,
    };

    events.forEach((ev) => {
      counts[ev.category] += 1;
    });

    return counts;
  }, [events]);

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startDayOfWeek = getDay(start);

  const getEventsForDay = useCallback(
    (day: Date) => filteredEvents.filter((e) => isSameDay(e.date, day)),
    [filteredEvents]
  );

  const selectedDayEvents = useMemo(
    () => getEventsForDay(selectedDate).sort((a, b) => a.date.getTime() - b.date.getTime()),
    [getEventsForDay, selectedDate]
  );

  useEffect(() => {
    setSelectedDate((prev) => {
      if (prev.getMonth() === currentMonth.getMonth() && prev.getFullYear() === currentMonth.getFullYear()) {
        return prev;
      }

      const nextDay = Math.min(prev.getDate(), endOfMonth(currentMonth).getDate());
      return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), nextDay);
    });
  }, [currentMonth]);

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

  const activeFilterSummary = useMemo(() => {
    const activeCategories = (Object.keys(filters) as EventCategory[]).filter((cat) => filters[cat]);
    if (activeCategories.length === 0) return "Nenhum filtro ativo";

    return activeCategories
      .map((cat) => `${CATEGORY_SHORT_LABEL[cat]} (${categoryCounts[cat]})`)
      .join(", ");
  }, [filters, categoryCounts]);

  const applyMobileFilters = useCallback(() => {
    setFilters(mobileFilterDraft);
    setMobileFiltersOpen(false);
  }, [mobileFilterDraft]);

  return (
    <AppLayout>
      <div className="page-shell">
        <PageHeader
          eyebrow={isMobile ? undefined : "Agenda jurídica"}
          title="Prazos"
          subtitle={isMobile ? "Controle de prazos e tarefas" : "Calendário e controle de prazos processuais"}
          actions={
            <div className="inline-segmented w-full sm:w-auto">
              <button
                data-active={viewMode === "personal"}
                onClick={() => setViewMode("personal")}
                className={cn(
                  "min-h-[36px] flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-all whitespace-nowrap",
                  viewMode === "personal" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <User className="w-3.5 h-3.5" />
                Meus Prazos
              </button>
              {canViewOffice && (
                <button
                  data-active={viewMode === "office"}
                  onClick={() => setViewMode("office")}
                  className={cn(
                    "min-h-[36px] flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-all whitespace-nowrap",
                    viewMode === "office" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Escritório
                </button>
              )}
            </div>
          }
        />

        {isMobile ? (
          <div className="page-surface space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="inline-segmented flex-1">
                <button
                  data-active={calendarTab === "month"}
                  onClick={() => setCalendarTab("month")}
                  className={cn(
                    "h-8 rounded-md text-[12px] font-semibold transition-colors",
                    calendarTab === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Mês
                </button>
                <button
                  data-active={calendarTab === "agenda"}
                  onClick={() => setCalendarTab("agenda")}
                  className={cn(
                    "h-8 rounded-md text-[12px] font-semibold transition-colors",
                    calendarTab === "agenda" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Agenda
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[12px] shrink-0"
                onClick={() => {
                  setMobileFilterDraft(filters);
                  setMobileFiltersOpen(true);
                }}
              >
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                Filtros
              </Button>
            </div>

            <p className="text-[12px] text-muted-foreground">
              {activeFilterSummary}
            </p>
          </div>
        ) : (
          <div className="page-surface space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {(Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][]).map(
                ([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <label
                      key={key}
                      className={cn(
                        "flex min-h-[38px] items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[12px] cursor-pointer transition-all select-none whitespace-nowrap",
                        filters[key]
                          ? cfg.badgeClass
                          : "bg-muted/50 text-muted-foreground border-border opacity-60"
                      )}
                    >
                      <Checkbox
                        checked={filters[key]}
                        onCheckedChange={() => toggleFilter(key)}
                        className="h-3.5 w-3.5"
                      />
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-medium">{cfg.label}</span>
                      <span className="text-[11px] opacity-70">({categoryCounts[key]})</span>
                    </label>
                  );
                }
              )}
            </div>

            <div className="inline-segmented w-full max-w-[260px]">
              <button
                data-active={calendarTab === "month"}
                onClick={() => setCalendarTab("month")}
                className={cn(
                  "h-8 rounded-md text-[12px] font-semibold transition-colors",
                  calendarTab === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                Mês
              </button>
              <button
                data-active={calendarTab === "agenda"}
                onClick={() => setCalendarTab("agenda")}
                className={cn(
                  "h-8 rounded-md text-[12px] font-semibold transition-colors",
                  calendarTab === "agenda" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                Agenda
              </button>
            </div>
          </div>
        )}

        {isMobile ? (
          <Card className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] text-muted-foreground">
                <span className="text-destructive font-semibold">Atrasados: {stats.overdue}</span>
                <span className="mx-1.5">•</span>
                <span className="font-semibold text-foreground">Próximos: {stats.upcoming}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[12px]"
                onClick={() => setMobileSummaryOpen(true)}
              >
                Ver resumo
              </Button>
            </div>
          </Card>
        ) : (
          <div className="page-grid-4">
            <Card className="p-3 sm:p-4">
              <p className="text-[12px] text-muted-foreground">Total</p>
              <p className="text-[24px] sm:text-[28px] font-bold text-foreground">{stats.total}</p>
            </Card>
            <Card className="p-3 sm:p-4">
              <p className="text-[12px] text-muted-foreground">Hoje</p>
              <p className="text-[24px] sm:text-[28px] font-bold text-primary">{stats.today}</p>
            </Card>
            <Card className="p-3 sm:p-4">
              <p className="text-[12px] text-muted-foreground">Atrasados</p>
              <p className="text-[24px] sm:text-[28px] font-bold text-destructive">{stats.overdue}</p>
            </Card>
            <Card className="p-3 sm:p-4">
              <p className="text-[12px] text-muted-foreground">Próximos</p>
              <p className="text-[24px] sm:text-[28px] font-bold text-foreground">{stats.upcoming}</p>
            </Card>
          </div>
        )}

        {calendarTab === "month" ? (
          <div className="space-y-3">
            <Card className={cn(isMobile ? "p-3" : "p-4 sm:p-5")}>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded hover:bg-muted"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                </button>
                <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h3>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded hover:bg-muted"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {(isMobile ? ["D", "S", "T", "Q", "Q", "S", "S"] : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]).map(
                  (d) => (
                    <div
                      key={d}
                      className={cn(
                        "text-center font-medium text-muted-foreground py-1",
                        isMobile ? "text-[11px]" : "text-[13px]"
                      )}
                    >
                      {d}
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className={cn(isMobile ? "h-[54px]" : "h-24")} />
                ))}

                {days.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const markerCategories: EventCategory[] = Array.from(new Set(dayEvents.map((ev) => ev.category)));
                  const isToday = isSameDay(day, new Date());
                  const isSelectedDay = isSameDay(day, selectedDate);

                  if (isMobile) {
                    return (
                      <button
                        type="button"
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "h-[54px] rounded-md border px-1.5 py-1 text-left transition-colors",
                          isSelectedDay
                            ? "border-primary bg-primary/10"
                            : isToday
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/70 hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              isSelectedDay || isToday ? "text-primary" : "text-foreground"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{dayEvents.length}</span>
                          )}
                        </div>

                        {dayEvents.length > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            {markerCategories.slice(0, 3).map((cat) => (
                              <span
                                key={`${day.toISOString()}-${cat}`}
                                className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_CONFIG[cat].dotClass)}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  }

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
                      <span className={cn("font-medium", isToday ? "text-primary" : "text-foreground")}>
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
                              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotClass)} />
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

              <div className={cn("items-center gap-4 mt-4 pt-3 border-t border-border", isMobile ? "hidden" : "flex")}>
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

            {isMobile && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-foreground">
                    Agenda de {format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
                  </h3>
                  <Badge variant="outline" className="h-6 px-2 text-[11px]">
                    {selectedDayEvents.length}
                  </Badge>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <Card className="p-4">
                    <div className="text-center text-muted-foreground">
                      <Calendar className="w-5 h-5 mx-auto mb-1.5 opacity-50" />
                      <p className="text-[12px]">Sem itens para o dia selecionado</p>
                    </div>
                  </Card>
                ) : (
                  selectedDayEvents.map((ev) => {
                    const cfg = CATEGORY_CONFIG[ev.category];
                    const Icon = cfg.icon;

                    return (
                      <Card
                        key={ev.id}
                        className="p-3 cursor-pointer active:scale-[0.99] transition-transform"
                        onClick={() => setSelectedEvent(ev)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">{ev.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                              {ev.processoNumero
                                ? `Processo ${ev.processoNumero}`
                                : ev.responsavel
                                ? `Responsável: ${ev.responsavel}`
                                : "Sem responsável"}
                            </p>
                          </div>

                          <span
                            className={cn(
                              "shrink-0 px-2 py-0.5 rounded border text-[10px] font-semibold",
                              urgencyBg[ev.urgency]
                            )}
                          >
                            {urgencyLabel[ev.urgency]}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Badge variant="outline" className={cn("h-6 px-2 text-[10px] gap-1", cfg.badgeClass)}>
                            <Icon className="w-3 h-3" />
                            {CATEGORY_SHORT_LABEL[ev.category]}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">{format(ev.date, "dd/MM")}</span>
                        </div>
                      </Card>
                    );
                  })
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedEvents.length === 0 && (
              <Card className="p-6 sm:p-8">
                <div className="text-center text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum evento encontrado com os filtros selecionados</p>
                </div>
              </Card>
            )}

            {sortedEvents.map((ev) => {
              const cfg = CATEGORY_CONFIG[ev.category];
              const Icon = cfg.icon;

              return (
                <Card
                  key={ev.id}
                  className={cn(
                    "cursor-pointer transition-shadow",
                    isMobile ? "p-3" : "p-4 hover:shadow-md"
                  )}
                  onClick={() => setSelectedEvent(ev)}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "shrink-0 px-2 py-0.5 rounded border font-semibold",
                        isMobile ? "text-[10px]" : "text-[12px]",
                        urgencyBg[ev.urgency]
                      )}
                    >
                      {urgencyLabel[ev.urgency]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-medium text-foreground", isMobile ? "text-[13px]" : "text-[15px]")}>
                          {ev.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            isMobile ? "h-5 px-1.5 text-[10px] gap-1" : "text-[12px] gap-1",
                            cfg.badgeClass
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {isMobile ? CATEGORY_SHORT_LABEL[ev.category] : cfg.label}
                        </Badge>
                      </div>

                      <p className={cn("text-muted-foreground mt-1", isMobile ? "text-[11px]" : "text-[13px]")}>
                        {ev.processoNumero && `Processo: ${ev.processoNumero} • `}
                        {ev.responsavel && `Responsável: ${ev.responsavel}`}
                      </p>

                      {ev.observacoes && (
                        <p className={cn("text-amber-600 dark:text-amber-400 mt-1", isMobile ? "text-[11px]" : "text-[12px]")}>
                          Observação: {ev.observacoes}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={cn("font-semibold text-foreground", isMobile ? "text-[12px]" : "text-[15px]")}>
                        {format(ev.date, "dd/MM")}
                      </p>
                      <p className={cn("text-muted-foreground capitalize", isMobile ? "text-[11px]" : "text-[12px]")}>
                        {format(ev.date, "EEE", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {isMobile && (
          <>
            <Drawer open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Filtros de calendário</DrawerTitle>
                  <DrawerDescription>
                    Escolha as categorias que devem aparecer no mês e na agenda.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="px-4 pb-2 space-y-2">
                  {(Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][]).map(
                    ([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <label
                          key={key}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 cursor-pointer",
                            mobileFilterDraft[key]
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-background"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              checked={mobileFilterDraft[key]}
                              onCheckedChange={() => toggleMobileDraftFilter(key)}
                              className="h-4 w-4"
                            />
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-[13px] font-medium truncate">{cfg.label}</span>
                          </div>
                          <span className="text-[12px] text-muted-foreground shrink-0">({categoryCounts[key]})</span>
                        </label>
                      );
                    }
                  )}
                </div>

                <DrawerFooter>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={() => setMobileFilterDraft({ ...ALL_FILTERS })}
                    >
                      Limpar
                    </Button>
                    <Button onClick={applyMobileFilters}>Aplicar</Button>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost">Cancelar</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <Drawer open={mobileSummaryOpen} onOpenChange={setMobileSummaryOpen}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Resumo de prazos</DrawerTitle>
                  <DrawerDescription>
                    Visão rápida de totais para priorização do dia.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="px-4 pb-2 grid grid-cols-2 gap-2.5">
                  <Card className="p-3">
                    <p className="text-[11px] text-muted-foreground">Total</p>
                    <p className="text-[24px] font-bold text-foreground">{stats.total}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-[11px] text-muted-foreground">Hoje</p>
                    <p className="text-[24px] font-bold text-primary">{stats.today}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-[11px] text-muted-foreground">Atrasados</p>
                    <p className="text-[24px] font-bold text-destructive">{stats.overdue}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-[11px] text-muted-foreground">Próximos</p>
                    <p className="text-[24px] font-bold text-foreground">{stats.upcoming}</p>
                  </Card>
                </div>

                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="outline">Fechar</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </>
        )}

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
