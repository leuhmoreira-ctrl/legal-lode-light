import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Calculator, FileText, DollarSign, Repeat, Receipt } from "lucide-react";

const tools = [
  {
    icon: Calculator,
    title: "Calculadora de Prazos",
    description: "Calcule prazos processuais considerando feriados e suspensões",
  },
  {
    icon: FileText,
    title: "Gerador de Petições",
    description: "Templates personalizáveis para petições iniciais, recursos e mais",
  },
  {
    icon: DollarSign,
    title: "Calculadora de Honorários",
    description: "Tabela OAB atualizada com cálculo automático de honorários",
  },
  {
    icon: Repeat,
    title: "Conversor de Unidades",
    description: "Salários mínimos, UFIR, UFESP e índices de correção",
  },
  {
    icon: Receipt,
    title: "Tabela de Custas",
    description: "Custas judiciais atualizadas por tribunal e instância",
  },
];

export default function Utilitarios() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilitários Jurídicos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ferramentas para o dia a dia do escritório
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <Card
              key={tool.title}
              className="p-6 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="p-3 rounded-lg bg-primary/5 w-fit mb-4 group-hover:bg-primary/10 transition-colors">
                <tool.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {tool.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tool.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
