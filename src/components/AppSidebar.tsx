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
  Shield,
  Settings,
  Building2,
  MessageSquare,
  Sun,
  Moon,
  Laptop,
  Mail,
  Bell,
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Minhas Tarefas", url: "/minhas-tarefas", icon: ClipboardList },
  { title: "Email", url: "/email", icon: Mail },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare },
  { title: "Notificações", url: "/notifications", icon: Bell },
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

// Keeping this although currently unused in the snippet provided, potentially useful
const roleColors: Record<UserRole, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  senior: "bg-primary/10 text-primary border-primary/20",
  junior: "bg-accent/10 text-accent-foreground border-accent/20",
  intern: "bg-muted text-muted-foreground border-border",
  secretary: "bg-secondary text-secondary-foreground border-secondary",
};

interface SidebarContentProps {
  collapsed: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

function SidebarContent({ collapsed, setCollapsed, isMobile = false, onCloseMobile }: SidebarContentProps) {
  const [escritorioOpen, setEscritorioOpen] = useState(() => {
    const saved = localStorage.getItem("escritorio_expanded");
    try {
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [myProcessCount, setMyProcessCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user, signOut } = useAuth();
  const { profile, role, isAdmin, isSenior } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const { setTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem("escritorio_expanded", JSON.stringify(escritorioOpen));
  }, [escritorioOpen]);

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("processos")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${user.id},advogado_id.eq.${user.id}`);
      setMyProcessCount(count || 0);
    };

    const fetchNotifications = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .eq("archived", false);
      setUnreadNotifications(count || 0);
    };

    fetchCount();
    fetchNotifications();

    // Subscribe to notifications
    const channel = supabase
      .channel("sidebar-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

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

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const linkClass = cn(
    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200 border-l-4 border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    collapsed && "justify-center px-0"
  );

  const activeLinkClass = "bg-sidebar-accent border-l-4 border-primary text-sidebar-accent-foreground font-medium";

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-20 border-b border-sidebar-border/50 relative">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/20 shrink-0">
          <Gavel className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in-scale flex-1 min-w-0">
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">
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
            onClick={handleLinkClick}
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
              escritorioOpen && !collapsed && "text-sidebar-foreground"
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
                  onClick={handleLinkClick}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span>{item.title}</span>
                      {item.title === "Processos" && myProcessCount > 0 && (
                        <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {myProcessCount}
                        </span>
                      )}
                      {item.title === "Notificações" && unreadNotifications > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadNotifications}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              ))}

              {/* Admin-only: Equipe */}
              {isAdmin && (
                <NavLink
                  to="/equipe"
                  className={linkClass}
                  activeClassName={activeLinkClass}
                  onClick={handleLinkClick}
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
                  onClick={handleLinkClick}
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
      <div className="border-t border-sidebar-border/50 p-4 bg-sidebar-muted/20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-3 w-full p-2 rounded-xl hover:bg-sidebar-accent transition-all duration-200 group",
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
                  <span className="truncate text-sm font-semibold text-sidebar-foreground">
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
          <DropdownMenuContent side={isMobile ? "top" : "right"} align={isMobile ? "start" : "end"} className="w-64 mb-2 p-2">
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
            <DropdownMenuItem onClick={() => { navigate("/configuracoes"); handleLinkClick(); }} className="py-2.5 cursor-pointer">
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

      {/* Collapse toggle (Desktop only) */}
      {!isMobile && setCollapsed && (
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
      )}
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Trigger and Sheet */}
      <div className="md:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          {/* We need a trigger that is positioned appropriately, usually in a header.
              If the layout doesn't have a header, we float it. */}
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 bg-sidebar-background/80 backdrop-blur-sm text-sidebar-foreground shadow-md hover:bg-sidebar-background border border-sidebar-border"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground">
            <SidebarContent
              collapsed={false}
              isMobile={true}
              onCloseMobile={() => setIsMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex h-screen sticky top-0 flex-col border-r border-sidebar-border transition-all duration-300 z-40 shadow-xl",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </aside>
    </>
  );
}
