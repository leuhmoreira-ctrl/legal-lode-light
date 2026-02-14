import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "admin" | "senior" | "junior" | "intern" | "secretary";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface PermissionsContextType {
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  isSenior: boolean;
  canEditProcess: (advogadoId?: string | null) => boolean;
  canDeleteProcess: () => boolean;
  canManageTeam: () => boolean;
  canViewAllProcesses: () => boolean;
  teamMembers: Profile[];
  refreshProfile: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);

  const loadProfile = async () => {
    if (!user) {
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }
    try {
      const [{ data: profileData }, { data: roleData }, { data: team }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1).single(),
        supabase.from("profiles").select("*"),
      ]);

      if (profileData) setProfile(profileData as Profile);
      if (roleData) setRole(roleData.role as UserRole);
      if (team) setTeamMembers(team as Profile[]);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = role === "admin";
  const isSenior = role === "admin" || role === "senior";

  const canEditProcess = (advogadoId?: string | null) => {
    if (!user) return false;
    if (isSenior) return true;
    return advogadoId === user.id;
  };

  const canDeleteProcess = () => isSenior;
  const canManageTeam = () => isAdmin;
  const canViewAllProcesses = () => isSenior;

  return (
    <PermissionsContext.Provider
      value={{
        profile,
        role,
        loading,
        isAdmin,
        isSenior,
        canEditProcess,
        canDeleteProcess,
        canManageTeam,
        canViewAllProcesses,
        teamMembers,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return context;
}
