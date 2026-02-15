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
  MessageSquare,
  Sun,
  Moon,
  Laptop,
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
import { useTheme } from "next-themes";
import { UserAvatar } from "@/components/UserAvatar";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Minhas Tarefas", url: "/minhas-tarefas", icon: ClipboardList },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare },
  { title: "Prazos", url: "/prazos", icon: CalendarClock },
  { title: "Utilitários", url: "/utilitarios", icon: Wrench },
];

const escritorioItems = [
  { title: "Processos", url: "/processos", icon: Scale },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Workflows", url: "/workflows", icon: ClipboardList },
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
  const { setTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem("escritorio_expanded", JSON.stringify(escritorioOpen));
  }, [escritorioOpen]);

  // Auto-expand if current route is inside Escritório
  useEffect(() => {
    const allEscritorioUrls = [
      ...escritorioItems.map((i) => i.url),
      "/equipe",
      "/auditoria",
      "/workflows",
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
    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200 border-l-4 border-transparent text-sidebar-foreground/70 hover:bg-white/5 hover:text-white",
    collapsed && "justify-center px-0"
  );

  const activeLinkClass = "bg-primary/10 border-l-4 border-primary text-white font-medium";

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-gradient-to-b from-sidebar-background to-sidebar-background/95 text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 z-40 shadow-xl",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-20 border-b border-sidebar-border/50">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/20 shrink-0">
          <Gavel className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in-scale flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight">
              JurisControl
            </h1>
            <p className="text-[11px] text-sidebar-foreground/60 font-medium">
              Gestão Jurídica
            </p>
          </div>
        )}
        {!collapsed && <div className="ml-auto"><NotificationBell /></div>}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-4 py-4">
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-sidebar-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar..."
              className="h-10 pl-9 text-sm bg-sidebar-muted/50 border-sidebar-border/50 text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:bg-sidebar-muted focus-visible:ring-primary/30"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {/* Main items */}
        {mainNavItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className={linkClass}
            activeClassName={activeLinkClass}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        {/* Escritório group */}
        <div className="pt-4 mt-2 border-t border-sidebar-border/30">
          {!collapsed && <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">Gestão</p>}
          <button
            onClick={() => setEscritorioOpen(!escritorioOpen)}
            className={cn(
              linkClass,
              "w-full",
              escritorioOpen && !collapsed && "text-white"
            )}
          >
            <Building2 className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Escritório</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-200 opacity-50",
                    escritorioOpen && "rotate-180 opacity-100"
                  )}
                />
              </>
            )}
          </button>

          {escritorioOpen && (
            <div className={cn("space-y-1 mt-1", !collapsed && "ml-4 pl-2 border-l border-sidebar-border/30")}>
              {escritorioItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={linkClass}
                  activeClassName={activeLinkClass}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              ))}

              {/* Admin-only: Equipe */}
              {isAdmin && (
                <NavLink
                  to="/equipe"
                  className={linkClass}
                  activeClassName={activeLinkClass}
                >
                  <Users className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>Equipe</span>}
                </NavLink>
              )}

              {/* Admin/Senior: Auditoria */}
              {isSenior && (
                <NavLink
                  to="/auditoria"
                  className={linkClass}
                  activeClassName={activeLinkClass}
                >
                  <Shield className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>Auditoria</span>}
                </NavLink>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* User menu */}
      <div className="border-t border-sidebar-border/50 p-4 bg-black/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/5 transition-all duration-200 group",
                collapsed && "justify-center p-0"
              )}
            >
              <UserAvatar
                name={profile?.full_name || user?.email || ""}
                avatarUrl={profile?.avatar_url}
                size="md"
                className="shrink-0 border-2 border-sidebar-border group-hover:border-primary transition-colors"
              />
              {!collapsed && (
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="truncate text-sm font-semibold text-white">
                    {profile?.full_name || user?.email}
                  </span>
                  {role && (
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 mt-0.5 h-4 border-sidebar-border text-sidebar-foreground/70 bg-sidebar-muted/30`}>
                      {roleLabels[role]}
                    </Badge>
                  )}
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-64 mb-2 p-2">
            <div className="flex items-center gap-3 p-2 mb-2 bg-muted/50 rounded-lg">
               <UserAvatar
                name={profile?.full_name || user?.email || ""}
                avatarUrl={profile?.avatar_url}
                size="md"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{profile?.full_name}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</span>
              </div>
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="py-2.5 cursor-pointer">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground uppercase tracking-wider px-2 py-1.5">Tema</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
              <Sun className="w-4 h-4 mr-2" />
              Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
              <Moon className="w-4 h-4 mr-2" />
              Escuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
              <Laptop className="w-4 h-4 mr-2" />
              Sistema
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive py-2.5 cursor-pointer focus:text-destructive focus:bg-destructive/10">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-9 flex items-center justify-center w-6 h-6 rounded-full bg-sidebar-border text-sidebar-foreground border border-sidebar-background hover:bg-primary hover:text-white transition-colors shadow-md z-50"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}
