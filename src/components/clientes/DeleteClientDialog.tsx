import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Cliente } from "@/types/cliente";
import { useClientes } from "@/hooks/useClientes";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
}

export function DeleteClientDialog({ open, onOpenChange, cliente }: DeleteClientDialogProps) {
  const { deleteCliente, checkLinkedProcesses } = useClientes();
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  useEffect(() => {
    if (open && cliente) {
        setLinkedCount(null); // loading
        checkLinkedProcesses(cliente.nome).then(count => {
            setLinkedCount(count);
        }).catch(err => {
            console.error("Error checking linked processes:", err);
            setLinkedCount(0); // assume 0 on error
        });
    }
  }, [open, cliente]);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (cliente && cliente.id) {
        deleteCliente.mutate(cliente.id, {
            onSuccess: () => onOpenChange(false)
        });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o cliente <strong>{cliente?.nome}</strong>?
            Essa ação não pode ser desfeita.
          </AlertDialogDescription>
          {linkedCount !== null && linkedCount > 0 && (
             <div className="mt-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm font-medium">
                 ⚠️ Este cliente possui {linkedCount} processo(s) vinculado(s).
             </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={deleteCliente.isPending}>
            {deleteCliente.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {deleteCliente.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
