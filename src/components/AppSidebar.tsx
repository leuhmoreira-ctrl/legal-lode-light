import { useState } from "react";
import {
  LayoutDashboard,
  Scale,
  CalendarClock,
  ListTodo,
  Users,
  Wrench,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  Gavel,
  LogOut,
  User,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Processos", url: "/processos", icon: Scale },
  { title: "Prazos", url: "/prazos", icon: CalendarClock },
  { title: "Tarefas", url: "/tarefas", icon: ListTodo },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Utilitários", url: "/utilitarios", icon: Wrench },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

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
          <div className="animate-fade-up">
            <h1 className="text-sm font-bold text-sidebar-primary-foreground tracking-tight">
              JurisControl
            </h1>
            <p className="text-[10px] text-sidebar-foreground/60">
              Gestão Jurídica
            </p>
          </div>
        )}
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
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
              collapsed && "justify-center px-0"
            )}
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
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
                <span className="truncate text-xs">{user?.email}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="text-xs truncate">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
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
