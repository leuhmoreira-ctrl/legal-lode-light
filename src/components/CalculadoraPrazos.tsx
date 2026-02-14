import { useState } from "react";
import { format, addDays, isWeekend, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Calculator, Clock, AlertTriangle, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Feriado {
  data: string;
  nome: string;
}

interface DiaPulado {
  data: Date;
  motivo: string;
}

interface ResultadoCalculo {
  dataFinal: Date;
  diasPulados: DiaPulado[];
  prazoCalculado: number;
  prazoOriginal: number;
  dataInicial: Date;
  tipoPrazo: string;
}

interface CalculoSalvo {
  id: string;
  dataInicial: string;
  dataFinal: string;
  prazo: number;
  tipo: string;
  estado: string;
  timestamp: string;
}

const feriadosNacionais: Feriado[] = [
  { data: "2025-01-01", nome: "Ano Novo" },
  { data: "2025-03-03", nome: "Carnaval" },
  { data: "2025-03-04", nome: "Carnaval" },
  { data: "2025-04-18", nome: "Sexta-feira Santa" },
  { data: "2025-04-21", nome: "Tiradentes" },
  { data: "2025-05-01", nome: "Dia do Trabalho" },
  { data: "2025-06-19", nome: "Corpus Christi" },
  { data: "2025-09-07", nome: "Independência" },
  { data: "2025-10-12", nome: "Nossa Sra. Aparecida" },
  { data: "2025-11-02", nome: "Finados" },
  { data: "2025-11-15", nome: "Proclamação da República" },
  { data: "2025-12-25", nome: "Natal" },
  { data: "2026-01-01", nome: "Ano Novo" },
  { data: "2026-02-16", nome: "Carnaval" },
  { data: "2026-02-17", nome: "Carnaval" },
  { data: "2026-04-03", nome: "Sexta-feira Santa" },
  { data: "2026-04-21", nome: "Tiradentes" },
  { data: "2026-05-01", nome: "Dia do Trabalho" },
  { data: "2026-06-04", nome: "Corpus Christi" },
  { data: "2026-09-07", nome: "Independência" },
  { data: "2026-10-12", nome: "Nossa Sra. Aparecida" },
  { data: "2026-11-02", nome: "Finados" },
  { data: "2026-11-15", nome: "Proclamação da República" },
  { data: "2026-12-25", nome: "Natal" },
];

const feriadosEstaduais: Record<string, Feriado[]> = {
  GO: [
    { data: "2025-07-26", nome: "Fundação de Goiânia" },
    { data: "2025-10-24", nome: "Dia do Servidor Público" },
    { data: "2026-07-26", nome: "Fundação de Goiânia" },
    { data: "2026-10-24", nome: "Dia do Servidor Público" },
  ],
  SP: [
    { data: "2025-07-09", nome: "Revolução Constitucionalista" },
    { data: "2026-07-09", nome: "Revolução Constitucionalista" },
  ],
  RJ: [
    { data: "2025-04-23", nome: "Dia de São Jorge" },
    { data: "2026-04-23", nome: "Dia de São Jorge" },
  ],
  MG: [
    { data: "2025-04-21", nome: "Data Magna de MG" },
    { data: "2026-04-21", nome: "Data Magna de MG" },
  ],
  DF: [
    { data: "2025-04-21", nome: "Fundação de Brasília" },
    { data: "2026-04-21", nome: "Fundação de Brasília" },
  ],
  RS: [
    { data: "2025-09-20", nome: "Revolução Farroupilha" },
    { data: "2026-09-20", nome: "Revolução Farroupilha" },
  ],
  PR: [
    { data: "2025-12-19", nome: "Emancipação do Paraná" },
    { data: "2026-12-19", nome: "Emancipação do Paraná" },
  ],
  BA: [
    { data: "2025-07-02", nome: "Independência da Bahia" },
    { data: "2026-07-02", nome: "Independência da Bahia" },
  ],
  CE: [
    { data: "2025-03-25", nome: "Data Magna do Ceará" },
    { data: "2026-03-25", nome: "Data Magna do Ceará" },
  ],
  PE: [
    { data: "2025-03-06", nome: "Revolução Pernambucana" },
    { data: "2026-03-06", nome: "Revolução Pernambucana" },
  ],
};

const estados = [
  { value: "GO", label: "Goiás" },
  { value: "SP", label: "São Paulo" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "MG", label: "Minas Gerais" },
  { value: "DF", label: "Distrito Federal" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "PR", label: "Paraná" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "PE", label: "Pernambuco" },
];

function verificarFeriado(
  data: Date,
  estado: string,
  considerarNacionais: boolean,
  considerarEstaduais: boolean
): string | null {
  const dataStr = format(data, "yyyy-MM-dd");

  if (considerarNacionais) {
    const nacional = feriadosNacionais.find((f) => f.data === dataStr);
    if (nacional) return nacional.nome;
  }

  if (considerarEstaduais && feriadosEstaduais[estado]) {
    const estadual = feriadosEstaduais[estado].find((f) => f.data === dataStr);
    if (estadual) return estadual.nome;
  }

  return null;
}

function calcularPrazo(params: {
  dataInicial: Date;
  quantidadeDias: number;
  tipoPrazo: "corridos" | "uteis";
  estado: string;
  considerarFeriadosNacionais: boolean;
  considerarFeriadosEstaduais: boolean;
  prazoDobro: boolean;
  intimacaoAdvogado: boolean;
}): ResultadoCalculo {
  let prazoFinal = params.quantidadeDias;

  if (params.prazoDobro) prazoFinal *= 2;
  if (params.intimacaoAdvogado) prazoFinal += 1;

  const dataFinal = new Date(params.dataInicial);
  let diasContados = 0;
  const diasPulados: DiaPulado[] = [];

  while (diasContados < prazoFinal) {
    dataFinal.setDate(dataFinal.getDate() + 1);

    const ehFds = isWeekend(dataFinal);
    const feriado = verificarFeriado(
      dataFinal,
      params.estado,
      params.considerarFeriadosNacionais,
      params.considerarFeriadosEstaduais
    );

    if (params.tipoPrazo === "corridos") {
      diasContados++;
    } else {
      if (!ehFds && !feriado) {
        diasContados++;
      } else {
        diasPulados.push({
          data: new Date(dataFinal),
          motivo: feriado ? `Feriado: ${feriado}` : "Fim de semana",
        });
      }
    }
  }

  // If final date falls on weekend/holiday for "uteis", push forward
  if (params.tipoPrazo === "uteis") {
    let feriadoFinal = verificarFeriado(
      dataFinal,
      params.estado,
      params.considerarFeriadosNacionais,
      params.considerarFeriadosEstaduais
    );
    while (isWeekend(dataFinal) || feriadoFinal) {
      dataFinal.setDate(dataFinal.getDate() + 1);
      feriadoFinal = verificarFeriado(
        dataFinal,
        params.estado,
        params.considerarFeriadosNacionais,
        params.considerarFeriadosEstaduais
      );
    }
  }

  return {
    dataFinal: new Date(dataFinal),
    diasPulados,
    prazoCalculado: prazoFinal,
    prazoOriginal: params.quantidadeDias,
    dataInicial: params.dataInicial,
    tipoPrazo: params.tipoPrazo === "uteis" ? "dias úteis" : "dias corridos",
  };
}

function getSavedCalculations(): CalculoSalvo[] {
  try {
    return JSON.parse(localStorage.getItem("calculosPrazos") || "[]");
  } catch {
    return [];
  }
}

function saveCalculation(calc: CalculoSalvo) {
  const saved = getSavedCalculations();
  saved.unshift(calc);
  localStorage.setItem("calculosPrazos", JSON.stringify(saved.slice(0, 10)));
}

export function CalculadoraPrazos() {
  const [dataInicial, setDataInicial] = useState<Date>();
  const [quantidadeDias, setQuantidadeDias] = useState("");
  const [tipoPrazo, setTipoPrazo] = useState<"corridos" | "uteis">("uteis");
  const [estado, setEstado] = useState("GO");
  const [considerarNacionais, setConsiderarNacionais] = useState(true);
  const [considerarEstaduais, setConsiderarEstaduais] = useState(true);
  const [prazoDobro, setPrazoDobro] = useState(false);
  const [intimacaoAdvogado, setIntimacaoAdvogado] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historico, setHistorico] = useState<CalculoSalvo[]>(getSavedCalculations);

  const handleCalcular = () => {
    if (!dataInicial || !quantidadeDias) return;

    const res = calcularPrazo({
      dataInicial,
      quantidadeDias: parseInt(quantidadeDias),
      tipoPrazo,
      estado,
      considerarFeriadosNacionais: considerarNacionais,
      considerarFeriadosEstaduais: considerarEstaduais,
      prazoDobro,
      intimacaoAdvogado,
    });

    setResultado(res);
  };

  const handleSalvar = () => {
    if (!resultado) return;
    const calc: CalculoSalvo = {
      id: Date.now().toString(),
      dataInicial: resultado.dataInicial.toISOString(),
      dataFinal: resultado.dataFinal.toISOString(),
      prazo: resultado.prazoCalculado,
      tipo: resultado.tipoPrazo,
      estado,
      timestamp: new Date().toISOString(),
    };
    saveCalculation(calc);
    setHistorico(getSavedCalculations());
  };

  const handleLimpar = () => {
    setDataInicial(undefined);
    setQuantidadeDias("");
    setTipoPrazo("uteis");
    setEstado("GO");
    setConsiderarNacionais(true);
    setConsiderarEstaduais(true);
    setPrazoDobro(false);
    setIntimacaoAdvogado(false);
    setResultado(null);
  };

  const diasAteVencimento = resultado
    ? differenceInCalendarDays(resultado.dataFinal, new Date())
    : null;

  const urgenciaColor =
    diasAteVencimento !== null
      ? diasAteVencimento <= 3
        ? "text-urgent"
        : diasAteVencimento <= 7
        ? "text-warning"
        : "text-success"
      : "";

  const urgenciaBg =
    diasAteVencimento !== null
      ? diasAteVencimento <= 3
        ? "bg-urgent/10 border-urgent/30"
        : diasAteVencimento <= 7
        ? "bg-warning/10 border-warning/30"
        : "bg-success/10 border-success/30"
      : "";

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Card className="p-6 hover:shadow-md transition-all cursor-pointer group">
          <div className="p-3 rounded-lg bg-primary/5 w-fit mb-4 group-hover:bg-primary/10 transition-colors">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Calculadora de Prazos
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Calcule prazos processuais considerando feriados e suspensões
          </p>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Calculadora de Prazos Processuais
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Data Inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Publicação/Ciência</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataInicial && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicial
                      ? format(dataInicial, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicial}
                    onSelect={setDataInicial}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Quantidade de Dias */}
            <div className="space-y-2">
              <Label>Prazo (em dias)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                placeholder="Ex: 15"
                value={quantidadeDias}
                onChange={(e) => setQuantidadeDias(e.target.value)}
              />
            </div>
          </div>

          {/* Tipo de Prazo + Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Prazo</Label>
              <Select
                value={tipoPrazo}
                onValueChange={(v) => setTipoPrazo(v as "corridos" | "uteis")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uteis">Dias Úteis</SelectItem>
                  <SelectItem value="corridos">Dias Corridos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Comarca/Estado</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {estados.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label} ({e.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Considerações */}
          <div className="space-y-3">
            <Label>Considerações</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={considerarNacionais}
                  onCheckedChange={(v) => setConsiderarNacionais(!!v)}
                />
                Feriados nacionais
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={considerarEstaduais}
                  onCheckedChange={(v) => setConsiderarEstaduais(!!v)}
                />
                Feriados estaduais
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={prazoDobro}
                  onCheckedChange={(v) => setPrazoDobro(!!v)}
                />
                Prazo em dobro (Fazenda Pública)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={intimacaoAdvogado}
                  onCheckedChange={(v) => setIntimacaoAdvogado(!!v)}
                />
                Intimação por advogado (+1 dia)
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <Button onClick={handleCalcular} disabled={!dataInicial || !quantidadeDias} className="flex-1">
              <Calculator className="w-4 h-4 mr-1" />
              Calcular Prazo
            </Button>
            <Button variant="outline" onClick={handleLimpar}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Resultado */}
          {resultado && (
            <>
              <Separator />
              <Card className={cn("border p-4", urgenciaBg)}>
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-full", urgenciaBg)}>
                    <Clock className={cn("w-5 h-5", urgenciaColor)} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Prazo Final
                      </p>
                      <p className={cn("text-xl font-bold", urgenciaColor)}>
                        {format(resultado.dataFinal, "dd/MM/yyyy (EEEE)", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Data inicial:</span>{" "}
                        <span className="font-medium">
                          {format(resultado.dataInicial, "dd/MM/yyyy")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prazo:</span>{" "}
                        <span className="font-medium">
                          {resultado.prazoCalculado} {resultado.tipoPrazo}
                          {resultado.prazoOriginal !== resultado.prazoCalculado && (
                            <span className="text-muted-foreground">
                              {" "}(original: {resultado.prazoOriginal})
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dias pulados:</span>{" "}
                        <span className="font-medium">
                          {resultado.diasPulados.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Feriados:</span>{" "}
                        <span className="font-medium">
                          {resultado.diasPulados.filter((d) =>
                            d.motivo.startsWith("Feriado")
                          ).length || "Nenhum"}
                        </span>
                      </div>
                    </div>

                    {diasAteVencimento !== null && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn("w-4 h-4", urgenciaColor)} />
                        <span className={cn("text-sm font-medium", urgenciaColor)}>
                          {diasAteVencimento <= 0
                            ? "Prazo vencido!"
                            : `Prazo vence em ${diasAteVencimento} dia${diasAteVencimento !== 1 ? "s" : ""}!`}
                        </span>
                      </div>
                    )}

                    {/* Timeline visual */}
                    {resultado.diasPulados.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">
                          Dias pulados:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {resultado.diasPulados.slice(0, 20).map((d, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
                              {format(d.data, "dd/MM")} — {d.motivo}
                            </Badge>
                          ))}
                          {resultado.diasPulados.length > 20 && (
                            <Badge variant="outline" className="text-xs">
                              +{resultado.diasPulados.length - 20} mais
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={handleSalvar}>
                        <Plus className="w-3 h-3 mr-1" />
                        Salvar Cálculo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDataInicial(resultado.dataFinal);
                          setResultado(null);
                        }}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Calcular a partir do resultado
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Histórico */}
          {historico.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cálculos recentes</Label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {historico.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50"
                    >
                      <span>
                        {format(new Date(h.dataInicial), "dd/MM/yy")} →{" "}
                        {format(new Date(h.dataFinal), "dd/MM/yy")}
                      </span>
                      <span className="text-muted-foreground">
                        {h.prazo} {h.tipo} • {h.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
