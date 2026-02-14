import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeleteProcessDialogProps {
  processo: { id: string; numero: string; cliente: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteProcessDialog({
  processo,
  open,
  onOpenChange,
  onDeleted,
}: DeleteProcessDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Digite sua senha para confirmar");
      return;
    }

    setDeleting(true);
    setError("");

    try {
      // Validate password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email!,
        password,
      });
      if (signInError) throw new Error("Senha incorreta");

      // Delete process (CASCADE deletes related data)
      const { error: deleteError } = await supabase
        .from("processos")
        .delete()
        .eq("id", processo.id);
      if (deleteError) throw deleteError;

      toast({
        title: "Processo deletado",
        description: `${processo.numero} foi removido permanentemente`,
      });

      onOpenChange(false);
      onDeleted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
      setPassword("");
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Deletar Processo
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Esta ação é irreversível e deletará permanentemente:</p>
              <ul className="text-sm space-y-1 list-disc ml-4">
                <li>Processo: <strong>{processo.numero}</strong></li>
                <li>Cliente: <strong>{processo.cliente}</strong></li>
                <li>Todos os documentos anexados</li>
                <li>Todas as tarefas relacionadas</li>
                <li>Todo o histórico de movimentações</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleDelete} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="delete-password">Digite sua senha para confirmar:</Label>
            <Input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              disabled={deleting}
              autoFocus
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>

          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={deleting}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={deleting || !password}>
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deletar Permanentemente
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
