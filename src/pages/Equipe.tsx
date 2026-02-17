import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, type UserRole } from "@/contexts/PermissionsContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Users, User, Mail, Crown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: UserRole | null;
}

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  senior: "Advogado Sênior",
  junior: "Advogado Júnior",
  intern: "Estagiário",
  secretary: "Secretário",
};

const roleColors: Record<UserRole, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  senior: "bg-primary/10 text-primary border-primary/20",
  junior: "bg-accent/10 text-accent-foreground border-accent/20",
  intern: "bg-muted text-muted-foreground border-border",
  secretary: "bg-secondary text-secondary-foreground border-secondary",
};

export default function Equipe() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles) {
      const team: TeamMember[] = profiles.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: (roles as any[])?.find((r) => r.user_id === p.id)?.role || null,
      }));
      setMembers(team);
    }
    setLoading(false);
  };

  const changeRole = async (memberId: string, newRole: UserRole) => {
    if (!isAdmin) return;
    setSaving(memberId);
    try {
      // Upsert: delete old roles, insert new
      await supabase.from("user_roles").delete().eq("user_id", memberId);
      const { error } = await supabase.from("user_roles").insert({ user_id: memberId, role: newRole });
      if (error) throw error;
      toast({ title: "Cargo atualizado!", description: `Alterado para ${roleLabels[newRole]}` });
      loadTeam();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Shield className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Acesso Restrito</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Apenas administradores podem gerenciar a equipe.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-shell">
        <PageHeader
          eyebrow="Pessoas e acesso"
          title="Equipe"
          subtitle={`${members.length} membro${members.length !== 1 ? "s" : ""} • Gerencie cargos e permissões`}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="page-grid-3">
            {members.map((member) => (
              <Card key={member.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {member.role === "admin" ? (
                      <Crown className="w-5 h-5 text-primary" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {member.full_name}
                      {member.id === user?.id && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">(você)</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Cargo atual:</span>
                    {member.role && (
                      <Badge variant="outline" className={`text-[10px] ${roleColors[member.role]}`}>
                        {roleLabels[member.role]}
                      </Badge>
                    )}
                  </div>

                  {member.id !== user?.id && (
                    <Select
                      value={member.role || "junior"}
                      onValueChange={(v) => changeRole(member.id, v as UserRole)}
                      disabled={saving === member.id}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Alterar cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="senior">Advogado Sênior</SelectItem>
                        <SelectItem value="junior">Advogado Júnior</SelectItem>
                        <SelectItem value="intern">Estagiário</SelectItem>
                        <SelectItem value="secretary">Secretário</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
