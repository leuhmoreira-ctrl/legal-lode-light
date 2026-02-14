import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, User, Mail, Phone, DollarSign } from "lucide-react";
import { clientesMock } from "@/data/mockData";
import { useState } from "react";

const paymentStatus: Record<string, { label: string; class: string }> = {
  em_dia: { label: "Em dia", class: "urgency-low" },
  pendente: { label: "Pendente", class: "urgency-medium" },
  atrasado: { label: "Atrasado", class: "urgency-high" },
};

export default function Clientes() {
  const [search, setSearch] = useState("");

  const filtered = clientesMock.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cpfCnpj.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {clientesMock.length} clientes cadastrados
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((cliente) => {
            const ps = paymentStatus[cliente.statusPagamento];
            return (
              <Card
                key={cliente.id}
                className="p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {cliente.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground">{cliente.cpfCnpj}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${ps.class}`}>
                    {ps.label}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    {cliente.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    {cliente.telefone}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Processos: </span>
                    <span className="font-semibold text-foreground">
                      {cliente.processosAtivos}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <DollarSign className="w-3.5 h-3.5 text-success" />
                    <span className="font-semibold text-foreground">
                      R$ {cliente.totalHonorarios.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
