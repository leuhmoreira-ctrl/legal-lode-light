import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clienteSchema, Cliente } from "@/types/cliente";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientes } from "@/hooks/useClientes";
import { formatCPF, formatCNPJ, formatPhone } from "@/utils/validation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteToEdit?: Cliente | null;
}

export function ClientFormModal({ open, onOpenChange, clienteToEdit }: ClientFormModalProps) {
  const { createCliente, updateCliente } = useClientes();
  const [activeTab, setActiveTab] = useState<"pf" | "pj">("pf");
  const [cepLoading, setCepLoading] = useState(false);

  const form = useForm<Cliente>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      tipo: "pf",
      nome: "",
      cpf_cnpj: "",
      email: "",
      telefone: "",
      endereco: "",
    },
  });

  useEffect(() => {
    if (clienteToEdit) {
      form.reset(clienteToEdit);
      setActiveTab(clienteToEdit.tipo);
    } else {
      form.reset({
        tipo: "pf",
        nome: "",
        cpf_cnpj: "",
        email: "",
        telefone: "",
        endereco: "",
      });
      setActiveTab("pf");
    }
  }, [clienteToEdit, form, open]);

  const handleTabChange = (value: string) => {
    const newTipo = value as "pf" | "pj";
    setActiveTab(newTipo);
    form.setValue("tipo", newTipo);
    form.setValue("cpf_cnpj", "");
  };

  const onSubmit = (data: Cliente) => {
    if (clienteToEdit?.id) {
      updateCliente.mutate({ ...data, id: clienteToEdit.id }, {
        onSuccess: () => onOpenChange(false)
      });
    } else {
      createCliente.mutate(data, {
        onSuccess: () => onOpenChange(false)
      });
    }
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
      const cep = e.target.value.replace(/\D/g, "");
      if (cep.length === 8) {
          setCepLoading(true);
          try {
              const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
              const data = await res.json();
              if (!data.erro) {
                  const address = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                  const currentAddress = form.getValues("endereco");
                  if (!currentAddress) {
                      form.setValue("endereco", address);
                  } else {
                       form.setValue("endereco", address);
                  }
              }
          } catch (error) {
              console.error("CEP error", error);
          } finally {
              setCepLoading(false);
          }
      }
  };

  const isLoading = createCliente.isPending || updateCliente.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b">
          <DialogHeader className="p-0">
            <DialogTitle>{clienteToEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente abaixo.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col h-full">
            <div className="px-6 pt-6 pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pf">Pessoa Física</TabsTrigger>
                <TabsTrigger value="pj">Pessoa Jurídica</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <Form {...form}>
                <form id="client-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{activeTab === "pf" ? "Nome Completo" : "Razão Social"}</FormLabel>
                        <FormControl>
                          <Input placeholder={activeTab === "pf" ? "Ex: João Silva" : "Ex: Empresa LTDA"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cpf_cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{activeTab === "pf" ? "CPF" : "CNPJ"}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={activeTab === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value;
                                const formatted = activeTab === "pf" ? formatCPF(val) : formatCNPJ(val);
                                field.onChange(formatted);
                              }}
                              maxLength={activeTab === "pf" ? 14 : 18}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value;
                                const formatted = formatPhone(val);
                                field.onChange(formatted);
                              }}
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Endereço</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder="CEP"
                        className="w-24"
                        maxLength={9}
                        onChange={(e) => {
                          e.target.value = e.target.value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2");
                        }}
                        onBlur={handleCepBlur}
                      />
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name="endereco"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Endereço completo" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    {cepLoading && <p className="text-xs text-muted-foreground">Buscando CEP...</p>}
                  </div>
                </form>
              </Form>
            </div>
          </Tabs>
        </div>

        <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="client-form" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {clienteToEdit ? "Salvar Alterações" : "Cadastrar Cliente"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
