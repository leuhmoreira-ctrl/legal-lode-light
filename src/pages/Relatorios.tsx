import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
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
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/layout/PageHeader";

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

const COLORS = ["hsl(207,90%,54%)", "hsl(38,92%,50%)", "hsl(152,60%,40%)", "hsl(340,75%,55%)"];

export default function Relatorios() {
  const isMobile = useIsMobile();
  const [mobileChart, setMobileChart] = useState<"advogados" | "tipos" | "prazos">("advogados");

  const productivityByLawyerCard = (
    <Card className="stat-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Produtividade por Advogado
      </h3>
      <ResponsiveContainer width="100%" height={isMobile ? 210 : 250}>
        <BarChart data={advogadoData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,90%)" />
          <XAxis dataKey="nome" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
          <Tooltip />
          <Bar dataKey="processos" fill="hsl(207,90%,54%)" name="Processos" radius={[4,4,0,0]} />
          <Bar dataKey="tarefas" fill="hsl(38,92%,50%)" name="Tarefas" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );

  const processTypeCard = (
    <Card className="stat-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Processos por Tipo de Ação
      </h3>
      <ResponsiveContainer width="100%" height={isMobile ? 210 : 250}>
        <PieChart>
          <Pie data={tipoData} cx="50%" cy="50%" outerRadius={isMobile ? 72 : 90} paddingAngle={3} dataKey="value" label={!isMobile ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}>
            {tipoData.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );

  const deadlineComplianceCard = (
    <Card className="stat-card lg:col-span-2">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Cumprimento de Prazos (mensal)
      </h3>
      <ResponsiveContainer width="100%" height={isMobile ? 210 : 250}>
        <LineChart data={prazosData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,90%)" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
          <Tooltip />
          <Line type="monotone" dataKey="total" stroke="hsl(207,90%,54%)" strokeWidth={2} name="Total" dot={{ r: 4 }} />
          <Line type="monotone" dataKey="cumpridos" stroke="hsl(152,60%,40%)" strokeWidth={2} name="Cumpridos" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );

  return (
    <AppLayout>
      <div className="page-shell">
        <PageHeader
          eyebrow="Business intelligence"
          title="Relatórios"
          subtitle="Análise de produtividade, distribuição e cumprimento de prazos."
          actions={
            <>
              <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
                <FileDown className="w-4 h-4" /> Exportar PDF
              </Button>
              <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
                <Printer className="w-4 h-4" /> Imprimir
              </Button>
            </>
          }
        />

        {isMobile ? (
          <div className="space-y-2.5">
            <div className="inline-segmented">
              <button data-active={mobileChart === "advogados"} onClick={() => setMobileChart("advogados")}>Produtividade</button>
              <button data-active={mobileChart === "tipos"} onClick={() => setMobileChart("tipos")}>Tipos</button>
              <button data-active={mobileChart === "prazos"} onClick={() => setMobileChart("prazos")}>Prazos</button>
            </div>
            {mobileChart === "advogados" && productivityByLawyerCard}
            {mobileChart === "tipos" && processTypeCard}
            {mobileChart === "prazos" && deadlineComplianceCard}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {productivityByLawyerCard}
            {processTypeCard}
            {deadlineComplianceCard}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
