import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, Gavel, Calendar, Bell, ChevronDown, ChevronUp,
  AlertTriangle, Filter
} from "lucide-react";
import { format, parseISO } from "date-fns";

export interface Movimentacao {
  id: string;
  data_movimento: string;
  descricao: string;
  complemento: string | null;
  created_at: string | null;
}

type MovFilter = "all" | "despachos" | "decisoes" | "audiencias" | "intimacoes";

const FILTER_OPTIONS: { value: MovFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "despachos", label: "Despachos" },
  { value: "decisoes", label: "Decisões" },
  { value: "audiencias", label: "Audiências" },
  { value: "intimacoes", label: "Intimações" },
];

const CRITICAL_KEYWORDS = ["sentença", "liminar", "tutela", "intimação", "citação", "penhora", "arresto"];
const PAGE_SIZE = 50;

function classifyMov(descricao: string): { icon: typeof Gavel; isCritical: boolean } {
  const lower = descricao.toLowerCase();
  const isCritical = CRITICAL_KEYWORDS.some((k) => lower.includes(k));

  if (lower.includes("audiência")) return { icon: Calendar, isCritical };
  if (lower.includes("sentença") || lower.includes("decisão") || lower.includes("liminar"))
    return { icon: Gavel, isCritical: true };
  if (lower.includes("intimação") || lower.includes("citação"))
    return { icon: Bell, isCritical: true };
  return { icon: FileText, isCritical };
}

function matchesFilter(descricao: string, filter: MovFilter): boolean {
  if (filter === "all") return true;
  const lower = descricao.toLowerCase();
  switch (filter) {
    case "despachos": return lower.includes("despacho");
    case "decisoes": return lower.includes("decisão") || lower.includes("sentença") || lower.includes("liminar");
    case "audiencias": return lower.includes("audiência");
    case "intimacoes": return lower.includes("intimação") || lower.includes("citação");
    default: return true;
  }
}

interface Props {
  movimentacoes: Movimentacao[];
  loading: boolean;
}

export function MovimentacoesTimeline({ movimentacoes, loading }: Props) {
  const [filter, setFilter] = useState<MovFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () => movimentacoes.filter((m) => matchesFilter(m.descricao, filter)),
    [movimentacoes, filter]
  );

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Movimentações ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-1 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={filter === opt.value ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => { setFilter(opt.value); setVisibleCount(PAGE_SIZE); }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Exibindo {Math.min(visibleCount, filtered.length)} de {filtered.length} movimentações
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            Carregando movimentações...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma movimentação encontrada.</p>
          </div>
        ) : (
          <div>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

              <div className="space-y-0">
                {visible.map((mov) => {
                  const { icon: MovIcon, isCritical } = classifyMov(mov.descricao);
                  const expanded = expandedIds.has(mov.id);
                  const hasLongText = (mov.complemento?.length || 0) > 100;

                  return (
                    <div key={mov.id} className="relative flex gap-3 pb-4 group">
                      {/* Timeline dot */}
                      <div
                        className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-colors ${
                          isCritical
                            ? "bg-destructive/10 border-destructive/30"
                            : "bg-card border-border group-hover:border-primary/40"
                        }`}
                      >
                        <MovIcon className={`w-3.5 h-3.5 ${isCritical ? "text-destructive" : "text-muted-foreground"}`} />
                      </div>

                      {/* Content */}
                      <div className={`flex-1 min-w-0 p-3 rounded-lg border transition-colors ${
                        isCritical
                          ? "bg-destructive/5 border-destructive/15"
                          : "bg-muted/30 border-border/50 group-hover:bg-muted/50"
                      }`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(mov.data_movimento), "dd/MM/yyyy HH:mm")}
                          </p>
                          {isCritical && (
                            <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                              Crítico
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm font-medium mt-1 ${isCritical ? "text-destructive" : "text-foreground"}`}>
                          {mov.descricao}
                        </p>
                        {mov.complemento && (
                          <p className={`text-xs text-muted-foreground mt-1 ${!expanded && hasLongText ? "line-clamp-2" : ""}`}>
                            {mov.complemento}
                          </p>
                        )}
                        {hasLongText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs mt-1 px-2 text-primary"
                            onClick={() => toggleExpand(mov.id)}
                          >
                            {expanded ? (
                              <><ChevronUp className="w-3 h-3 mr-1" /> Recolher</>
                            ) : (
                              <><ChevronDown className="w-3 h-3 mr-1" /> Ver completo</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  className="text-xs"
                >
                  <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                  Carregar mais antigas ({filtered.length - visibleCount} restantes)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
