import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  LineChart,
  Line,
} from "recharts";
import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const advogadoData = [
  { nome: "Dr. Carlos", processos: 12, tarefas: 34, prazos: 8 },
  { nome: "Dra. Ana", processos: 9, tarefas: 28, prazos: 6 },
  { nome: "Dr. Paulo", processos: 7, tarefas: 22, prazos: 5 },
];

const prazosData = [
  { mes: "Set", cumpridos: 18, total: 20 },
  { mes: "Out", cumpridos: 22, total: 24 },
  { mes: "Nov", cumpridos: 19, total: 21 },
  { mes: "Dez", cumpridos: 25, total: 28 },
  { mes: "Jan", cumpridos: 30, total: 32 },
  { mes: "Fev", cumpridos: 24, total: 26 },
];

const tipoData = [
  { name: "Cível", value: 8 },
  { name: "Trabalhista", value: 4 },
  { name: "Família", value: 3 },
  { name: "Empresarial", value: 2 },
];

const COLORS = ["hsl(220,60%,22%)", "hsl(220,45%,40%)", "hsl(38,92%,50%)", "hsl(152,60%,40%)"];

export default function Relatorios() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Análise de produtividade e desempenho
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <FileDown className="w-4 h-4" /> Exportar PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Produtividade por advogado */}
          <Card className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Produtividade por Advogado
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={advogadoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,90%)" />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
                <Tooltip />
                <Bar dataKey="processos" fill="hsl(220,60%,22%)" name="Processos" radius={[4,4,0,0]} />
                <Bar dataKey="tarefas" fill="hsl(220,45%,40%)" name="Tarefas" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Processos por tipo */}
          <Card className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Processos por Tipo de Ação
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={tipoData} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {tipoData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Cumprimento de prazos */}
          <Card className="stat-card lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Cumprimento de Prazos (mensal)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={prazosData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,90%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="hsl(220,45%,40%)" strokeWidth={2} name="Total" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="cumpridos" stroke="hsl(152,60%,40%)" strokeWidth={2} name="Cumpridos" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
