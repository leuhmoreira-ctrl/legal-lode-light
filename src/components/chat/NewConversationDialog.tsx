import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NewConversationDialogProps {
  onCreateDirect: (userId: string) => Promise<string | null>;
}

export function NewConversationDialog({ onCreateDirect }: NewConversationDialogProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const otherMembers = teamMembers.filter((m) => m.id !== user?.id);

  const handleSelect = async (memberId: string) => {
    setCreating(memberId);
    const convId = await onCreateDirect(memberId);
    setCreating(null);
    if (convId) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8">
          <Plus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Nova Conversa</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {otherMembers.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum membro encontrado</p>
            )}
            {otherMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelect(member.id)}
                disabled={creating === member.id}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {member.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                {creating === member.id && <Loader2 className="w-4 h-4 animate-spin" />}
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
