import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, FileText, Filter } from "lucide-react";
import { processosMock } from "@/data/mockData";
import { format, parseISO } from "date-fns";
import { useState } from "react";

const faseColor: Record<string, string> = {
  Conhecimento: "bg-primary/10 text-primary border-primary/20",
  Recursal: "bg-warning/10 text-warning border-warning/20",
  Execução: "bg-accent/10 text-accent border-accent/20",
  Encerrado: "bg-muted text-muted-foreground border-border",
};

export default function Processos() {
  const [search, setSearch] = useState("");
  const [faseFilter, setFaseFilter] = useState("all");

  const filtered = processosMock.filter((p) => {
    const matchSearch =
      p.numero.includes(search) ||
      p.cliente.toLowerCase().includes(search.toLowerCase()) ||
      p.advogado.toLowerCase().includes(search.toLowerCase());
    const matchFase = faseFilter === "all" || p.fase === faseFilter;
    return matchSearch && matchFase;
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Processos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {processosMock.length} processos cadastrados
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Novo Processo
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou advogado..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={faseFilter} onValueChange={setFaseFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              <SelectItem value="Conhecimento">Conhecimento</SelectItem>
              <SelectItem value="Recursal">Recursal</SelectItem>
              <SelectItem value="Execução">Execução</SelectItem>
              <SelectItem value="Encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Process List */}
        <div className="space-y-3">
          {filtered.map((proc) => (
            <Card
              key={proc.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/5">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground font-mono">
                      {proc.numero}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {proc.vara} - {proc.comarca}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Cliente: </span>
                    <span className="font-medium text-foreground">
                      {proc.cliente}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Resp: </span>
                    <span className="font-medium text-foreground">
                      {proc.advogado}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${faseColor[proc.fase]}`}
                  >
                    {proc.fase}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    R$ {proc.valorCausa.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 mt-3 ml-12">
                {proc.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Última mov: {format(parseISO(proc.ultimaMovimentacao), "dd/MM/yyyy")} —{" "}
                  {proc.descricaoMovimentacao}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
