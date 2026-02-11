import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useCompany } from "@/hooks/useCompany";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserRound,
  Scissors,
  DollarSign,
  Settings,
  Building2,
  ChevronDown,
  LogOut,
  Megaphone,
  BarChart3,
  Headphones,
  Shield,
  Gift,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnits } from "@/hooks/useUnits";
import { useCurrentUnit } from "@/contexts/UnitContext";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Clientes", url: "/clientes", icon: UserRound },
  { title: "Profissionais", url: "/profissionais", icon: Users },
  { title: "Serviços", url: "/servicos", icon: Scissors },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Indique e Ganhe", url: "/indicacoes", icon: Gift },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

interface AppSidebarProps {
  onOpenChat: () => void;
  isChatOpen: boolean;
}

export function AppSidebar({ onOpenChat, isChatOpen }: AppSidebarProps) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { toast } = useToast();
  const { units } = useUnits();
  const { currentUnitId, setCurrentUnitId } = useCurrentUnit();
  const { settings: businessSettings } = useBusinessSettings();
  const { isSuperAdmin } = useSuperAdmin();
  const { planType, isTrialing, isSuperAdmin: isSuperAdminSubscription } = useSubscriptionContext();
  const { company } = useCompany();
  const [user, setUser] = useState<User | null>(null);

  const selectedUnit = units.find((u) => u.id === currentUnitId) || units[0];

  const getPlanLabel = () => {
    if (isSuperAdminSubscription) return "Vitalício";
    if (isTrialing) return "Trial";
    if (!planType) return null;
    const labels: Record<string, string> = {
      inicial: "Inicial",
      profissional: "Profissional",
      franquias: "Franquias",
    };
    return labels[planType] || planType;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getUserInitials = () => {
    if (!user) return "??";
    const fullName = user.user_metadata?.full_name;
    if (fullName) {
      return fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return user.email?.slice(0, 2).toUpperCase() || "??";
  };

  const getBusinessInitials = () => {
    const name = businessSettings?.business_name || company?.name;
    if (name) {
      return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return getUserInitials();
  };

  const getDisplayName = () => {
    // Priority: business_settings > company name > user metadata > fallback
    return businessSettings?.business_name || company?.name || user?.user_metadata?.business_name || user?.user_metadata?.full_name || "Usuário";
  };

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Scissors className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gold">BarberSoft</span>
              <span className="text-xs text-muted-foreground">Gestão de Barbearias</span>
            </div>
          )}
        </div>

        {/* Unit Selector */}
        {!collapsed && units.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="mt-4 w-full justify-between border border-border bg-secondary/50 hover:bg-secondary"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="truncate text-sm">{selectedUnit?.name || "Selecionar"}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover">
              {units.map((unit) => (
                <DropdownMenuItem
                  key={unit.id}
                  onClick={() => setCurrentUnitId(unit.id)}
                  className={`cursor-pointer ${currentUnitId === unit.id ? "bg-primary/10" : ""}`}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {unit.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                    className={`transition-all duration-200 ${
                      isActive(item.url)
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Link to={item.url}>
                      <item.icon className={`h-5 w-5 ${isActive(item.url) ? "text-primary" : ""}`} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {/* Support Chat Item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenChat}
                  isActive={isChatOpen}
                  tooltip={collapsed ? "Suporte 24h" : undefined}
                  className={`transition-all duration-200 ${
                    isChatOpen
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Headphones className={`h-5 w-5 ${isChatOpen ? "text-primary" : ""}`} />
                  <span>Suporte 24h</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        {/* Super Admin Link - Discreet */}
        {isSuperAdmin && (
          <Link
            to="/admin"
            className={`mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-all ${
              location.pathname.startsWith("/admin")
                ? "bg-slate-700 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Shield className="h-4 w-4" />
            {!collapsed && <span>Super Admin</span>}
          </Link>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-primary/30">
            {businessSettings?.logo_url && (
              <AvatarImage src={businessSettings.logo_url} alt="Logo" />
            )}
            <AvatarFallback className="bg-primary/10 text-primary">{getBusinessInitials()}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{getDisplayName()}</span>
                {getPlanLabel() && (
                  <Badge 
                    variant="outline" 
                    className="shrink-0 text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary/80"
                  >
                    {getPlanLabel()}
                  </Badge>
                )}
              </div>
              <span className="truncate text-xs text-muted-foreground">{user?.email || ""}</span>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
