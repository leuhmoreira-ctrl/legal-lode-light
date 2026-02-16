import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Cliente, ClienteRow } from "@/types/cliente";
import { toast } from "sonner";

export function useClientes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ["clientes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as unknown as ClienteRow[];
    },
    enabled: !!user,
  });

  const createCliente = useMutation({
    mutationFn: async (newCliente: Omit<Cliente, "id">) => {
      if (!user) throw new Error("User not authenticated");
      // @ts-expect-error - Supabase types might not be updated yet
      const { data, error } = await supabase
        .from("clientes")
        .insert([{ ...newCliente, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente criado com sucesso!");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao criar cliente.");
    },
  });

  const updateCliente = useMutation({
    mutationFn: async (cliente: Cliente) => {
      if (!cliente.id) throw new Error("Client ID required for update");
      // @ts-expect-error - Supabase types might not be updated yet
      const { data, error } = await supabase
        .from("clientes")
        .update({
            nome: cliente.nome,
            tipo: cliente.tipo,
            cpf_cnpj: cliente.cpf_cnpj,
            email: cliente.email,
            telefone: cliente.telefone,
            endereco: cliente.endereco
        })
        .eq("id", cliente.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente atualizado com sucesso!");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao atualizar cliente.");
    },
  });

  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      // @ts-expect-error - Supabase types might not be updated yet
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente excluído com sucesso!");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao excluir cliente.");
    },
  });

  const checkLinkedProcesses = async (clienteName: string) => {
      const { count, error } = await supabase
        .from("processos")
        .select("id", { count: "exact", head: true })
        .eq("cliente", clienteName);

      if (error) throw error;
      return count || 0;
  };

  return {
    clientes,
    isLoading,
    error,
    createCliente,
    updateCliente,
    deleteCliente,
    checkLinkedProcesses
  };
}
