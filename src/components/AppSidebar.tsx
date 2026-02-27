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
  User, // ✅ EKLE
  BookOpen,
  Menu,
  TrendingUp,
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
      {/* ✅ HEADER - LOGO & BRANDING */}
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg group-hover:shadow-emerald-500/50 transition-shadow">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-foreground">
                DENETRON
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                İSG Yönetim Sistemi
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* ✅ MAIN CONTENT */}
      <SidebarContent className="px-2 py-4">
        <SidebarGroup className="gap-3">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/70 px-2 font-semibold">
            {!collapsed ? "Ana Menü" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground relative"
                      activeClassName="bg-emerald-500/20 text-emerald-600 font-medium border-l-2 border-emerald-500"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && !collapsed && (
                        <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                          item.badge === "⭐"
                            ? "bg-yellow-500/20 text-yellow-700"
                            : item.badge === "Yeni"
                            ? "bg-blue-500/20 text-blue-700"
                            : "bg-emerald-500/20 text-emerald-700"
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

        {/* ✅ SEPARATOR */}
        <div className="my-2 h-px bg-border/50" />

        {/* ✅ TOOLS SECTION */}
        <SidebarGroup className="gap-3">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/70 px-2 font-semibold">
            {!collapsed ? "Araçlar" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                      activeClassName="bg-emerald-500/20 text-emerald-600 font-medium border-l-2 border-emerald-500"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ✅ FOOTER - USER & CONTROLS */}
      <SidebarFooter className="border-t border-border/50 px-2 py-3 space-y-2">
        {/* ✅ USER INFO */}
        {!collapsed && user && (
          <div className="px-2 py-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
              👤 Kullanıcı
            </p>
            <p className="text-xs font-semibold text-foreground truncate">
              {user.email}
            </p>
          </div>
        )}

        {/* ✅ TOGGLE SIDEBAR BUTTON */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full rounded-lg p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 group"
          title={collapsed ? "Menüyü Aç" : "Menüyü Kapat"}
        >
          {collapsed ? (
            <Menu className="h-4 w-4 group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft className="h-4 w-4 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* ✅ SIGN OUT BUTTON */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 font-medium group"
          title="Çıkış Yap"
        >
          <LogOut className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}