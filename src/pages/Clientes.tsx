import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, User, Mail, Phone, Pencil, Trash2, Building2 } from "lucide-react";
import { useState } from "react";
import { useClientes } from "@/hooks/useClientes";
import { ClientFormModal } from "@/components/clientes/ClientFormModal";
import { DeleteClientDialog } from "@/components/clientes/DeleteClientDialog";
import { Cliente, ClienteRow } from "@/types/cliente";
import { Skeleton } from "@/components/ui/skeleton";

export default function Clientes() {
  const [search, setSearch] = useState("");
  const { clientes, isLoading } = useClientes();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const filtered = clientes?.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf_cnpj.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const handleEdit = (cliente: ClienteRow) => {
      setSelectedCliente(cliente as unknown as Cliente);
      setIsFormOpen(true);
  };

  const handleDelete = (cliente: ClienteRow) => {
      setSelectedCliente(cliente as unknown as Cliente);
      setIsDeleteOpen(true);
  };

  const handleCreate = () => {
      setSelectedCliente(null);
      setIsFormOpen(true);
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {clientes?.length || 0} clientes cadastrados
            </p>
          </div>
          <Button className="gap-2" onClick={handleCreate}>
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

        {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                 {[1,2,3].map(i => (
                     <Skeleton key={i} className="h-40 w-full" />
                 ))}
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((cliente) => {
                return (
                <Card
                    key={cliente.id}
                    className="apple-card p-5 relative group"
                >
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(cliente)}>
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(cliente)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex items-start gap-3 mb-4 pr-16">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {cliente.tipo === 'pj' ? <Building2 className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                        {cliente.nome}
                        </h3>
                        <p className="text-xs text-muted-foreground">{cliente.cpf_cnpj}</p>
                    </div>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" />
                        {cliente.email || "-"}
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        {cliente.telefone || "-"}
                    </div>
                    </div>
                </Card>
                );
            })}
            </div>
        )}

        <ClientFormModal
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            clienteToEdit={selectedCliente}
        />

        <DeleteClientDialog
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            cliente={selectedCliente}
        />

      </div>
    </AppLayout>
  );
}
