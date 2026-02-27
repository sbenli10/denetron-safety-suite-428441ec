import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Brain,
  Settings,
  Shield,
  ShieldAlert,
  ShieldPlus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  BookOpen,
  Menu,
  TrendingUp,
  Building2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Profilim", url: "/profile", icon: User, badge: null },
  { title: "Panel", url: "/", icon: LayoutDashboard, badge: null },
  { title: "Denetimler", url: "/inspections", icon: ClipboardCheck, badge: null },
  { title: "AI Raporlar", url: "/reports", icon: Brain, badge: "Beta" },
  { title: "AI Kroki Okuyucu", url: "/blueprint-analyzer", icon: Building2, badge: "Pro" },
  { title: "DÖF Yönetimi", url: "/capa", icon: ShieldAlert, badge: null },
  { title: "Toplu DÖF", url: "/bulk-capa", icon: ShieldPlus, badge: "Yeni" },
  { title: "Risk Sihirbazı", url: "/risk-wizard", icon: TrendingUp, badge: "⭐" },
  { title: "İSG Kütüphanesi", url: "/safety-library", icon: BookOpen, badge: null },
];

const bottomItems = [
  { title: "Ayarlar", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border/50 bg-gradient-to-b from-sidebar-bg to-sidebar-bg/95"
    >
      {/* HEADER - LOGO & BRANDING */}
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3 group/brand">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md transition-transform duration-300 group-hover/brand:scale-105">
            <Shield className="h-[18px] w-[18px] text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-foreground">
                DENETRON
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 truncate">
                İSG Yönetim Sistemi
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* MAIN CONTENT */}
      <SidebarContent className="px-3 py-4">
        <SidebarGroup className="gap-2">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/60 px-1 font-semibold mb-1">
            {!collapsed ? "Ana Menü" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground overflow-hidden"
                      activeClassName="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-emerald-500 before:rounded-r-full shadow-sm"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
                      <span className="flex-1 truncate transition-transform group-hover:translate-x-0.5">
                        {item.title}
                      </span>
                      {item.badge && !collapsed && (
                        <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide border ${
                          item.badge === "⭐"
                            ? "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                            : item.badge === "Yeni"
                            ? "bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                            : "bg-purple-50 text-purple-700 border-purple-200/50 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SEPARATOR */}
        <div className="my-3 h-px bg-border/40 mx-2" />

        {/* TOOLS SECTION */}
        <SidebarGroup className="gap-2">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/60 px-1 font-semibold mb-1">
            {!collapsed ? "Araçlar" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
                      activeClassName="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-emerald-500 before:rounded-r-full shadow-sm"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
                      <span className="flex-1 transition-transform group-hover:translate-x-0.5">
                        {item.title}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER - USER & CONTROLS */}
      <SidebarFooter className="border-t border-border/50 p-3 space-y-3">
        {/* USER INFO PROFILE CARD */}
        {!collapsed && user && (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30 border border-border/40 transition-colors hover:bg-secondary/60 cursor-default">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-inner">
              {user.email ? user.email.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-foreground truncate">
                {user.email?.split("@")[0]}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {user.email}
              </span>
            </div>
          </div>
        )}

        {/* BOTTOM CONTROLS */}
        <div className="flex flex-col gap-1">
          <button
            onClick={toggleSidebar}
            className="group flex w-full items-center justify-center gap-3 rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
            title={collapsed ? "Menüyü Aç" : "Menüyü Kapat"}
          >
            {collapsed ? (
              <Menu className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />
            ) : (
              <ChevronLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
            )}
            {!collapsed && <span className="text-xs font-medium mr-auto">Menüyü Daralt</span>}
          </button>

          <button
            onClick={handleSignOut}
            className="group flex w-full items-center justify-center gap-3 rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
            title="Çıkış Yap"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
            {!collapsed && <span className="text-xs font-medium mr-auto">Çıkış Yap</span>}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}