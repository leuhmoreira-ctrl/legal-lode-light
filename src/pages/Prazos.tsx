import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prazosMock } from "@/data/mockData";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, AlertTriangle, Users } from "lucide-react";

const tipoIcon: Record<string, React.ReactNode> = {
  Processual: <Clock className="w-3.5 h-3.5" />,
  Administrativo: <CalendarDays className="w-3.5 h-3.5" />,
  Audiência: <AlertTriangle className="w-3.5 h-3.5" />,
  Reunião: <Users className="w-3.5 h-3.5" />,
};

const statusBg: Record<string, string> = {
  urgente: "urgency-high",
  proximo: "urgency-medium",
  em_dia: "urgency-low",
};

const statusLabel: Record<string, string> = {
  urgente: "Urgente",
  proximo: "Próximo",
  em_dia: "Em dia",
};

export default function Prazos() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startDayOfWeek = getDay(start);

  const getPrazosForDay = (day: Date) =>
    prazosMock.filter((p) => isSameDay(parseISO(p.dataVencimento), day));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prazos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calendário e controle de prazos processuais
          </p>
        </div>

        <Tabs defaultValue="calendario">
          <TabsList>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="calendario" className="mt-4">
            <Card className="p-5">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded hover:bg-muted">
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <h3 className="text-sm font-semibold text-foreground capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h3>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded hover:bg-muted">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-20" />
                ))}
                {days.map((day) => {
                  const dayPrazos = getPrazosForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-20 rounded-lg p-1.5 text-xs border ${
                        isToday ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <span className={`font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayPrazos.slice(0, 2).map((p) => (
                          <div
                            key={p.id}
                            className={`px-1 py-0.5 rounded text-[9px] truncate border ${statusBg[p.status]}`}
                          >
                            {p.descricao}
                          </div>
                        ))}
                        {dayPrazos.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">
                            +{dayPrazos.length - 2} mais
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="lista" className="mt-4">
            <div className="space-y-3">
              {prazosMock
                .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
                .map((prazo) => (
                  <Card key={prazo.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 px-2 py-1 rounded text-[10px] font-semibold border ${statusBg[prazo.status]}`}>
                        {statusLabel[prazo.status]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {tipoIcon[prazo.tipo]}
                          <span className="text-sm font-medium text-foreground">
                            {prazo.descricao}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {prazo.tipo}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Processo: {prazo.processoNumero} • Responsável: {prazo.responsavel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {format(parseISO(prazo.dataVencimento), "dd/MM/yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(prazo.dataVencimento), "EEEE", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
