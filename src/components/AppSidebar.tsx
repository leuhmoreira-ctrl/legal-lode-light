import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Scale,
  CalendarClock,
  ClipboardList,
  Users,
  Wrench,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gavel,
  LogOut,
  User,
  Shield,
  Settings,
  Building2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, type UserRole } from "@/contexts/PermissionsContext";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Minhas Tarefas", url: "/minhas-tarefas", icon: ClipboardList },
  { title: "Prazos", url: "/prazos", icon: CalendarClock },
  { title: "Utilitários", url: "/utilitarios", icon: Wrench },
];

const escritorioItems = [
  { title: "Processos", url: "/processos", icon: Scale },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Kanban", url: "/kanban", icon: LayoutDashboard },
];

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  senior: "Sênior",
  junior: "Júnior",
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

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [escritorioOpen, setEscritorioOpen] = useState(() => {
    const saved = localStorage.getItem("escritorio_expanded");
    return saved ? JSON.parse(saved) : false;
  });
  const { user, signOut } = useAuth();
  const { profile, role, isAdmin, isSenior } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("escritorio_expanded", JSON.stringify(escritorioOpen));
  }, [escritorioOpen]);

  // Auto-expand if current route is inside Escritório
  useEffect(() => {
    const allEscritorioUrls = [
      ...escritorioItems.map((i) => i.url),
      "/equipe",
      "/auditoria",
    ];
    if (allEscritorioUrls.some((u) => location.pathname === u)) {
      setEscritorioOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const linkClass = cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
    collapsed && "justify-center px-0"
  );

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-accent">
          <Gavel className="w-4 h-4 text-sidebar-accent-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-up flex-1 min-w-0">
            <h1 className="text-sm font-bold text-sidebar-primary-foreground tracking-tight">
              JurisControl
            </h1>
            <p className="text-[10px] text-sidebar-foreground/60">
              Gestão Jurídica
            </p>
          </div>
        )}
        {!collapsed && <NotificationBell />}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-sidebar-foreground/40" />
            <Input
              placeholder="Buscar..."
              className="h-8 pl-8 text-xs bg-sidebar-muted border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {/* Main items */}
        {mainNavItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className={linkClass}
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        {/* Escritório group */}
        <div className="pt-1">
          <button
            onClick={() => setEscritorioOpen(!escritorioOpen)}
            className={cn(
              linkClass,
              "w-full",
              escritorioOpen && "text-sidebar-accent-foreground"
            )}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Escritório</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    escritorioOpen && "rotate-180"
                  )}
                />
              </>
            )}
          </button>

          {escritorioOpen && (
            <div className={cn("space-y-0.5", !collapsed && "ml-3 pl-3 border-l border-sidebar-border/50")}>
              {escritorioItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={linkClass}
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              ))}

              {/* Admin-only: Equipe */}
              {isAdmin && (
                <NavLink
                  to="/equipe"
                  className={linkClass}
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <Users className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>Equipe</span>}
                </NavLink>
              )}

              {/* Admin/Senior: Auditoria */}
              {isSenior && (
                <NavLink
                  to="/auditoria"
                  className={linkClass}
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>Auditoria</span>}
                </NavLink>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* User menu */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                collapsed && "justify-center px-0"
              )}
            >
              <User className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="truncate text-xs font-medium">
                    {profile?.full_name || user?.email}
                  </span>
                  {role && (
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 mt-0.5 ${roleColors[role]}`}>
                      {roleLabels[role]}
                    </Badge>
                  )}
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">
              <div>{profile?.full_name || "Usuário"}</div>
              <div className="text-muted-foreground font-normal truncate">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
