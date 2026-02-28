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
  Flame,
  Calendar,
  Users,
  Target,
  AlertTriangle,
  ChevronDown,
  Zap,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
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

// ✅ Hiyerarşik Gruplandırma
const menuGroups = [
  {
    label: "GENEL",
    icon: LayoutDashboard,
    items: [
      { title: "Panel", url: "/", icon: LayoutDashboard, badge: null },
      { title: "Profilim", url: "/profile", icon: User, badge: null },
    ]
  },
  {
    label: "FİRMA YÖNETİMİ",
    icon: Building2,
    items: [
      { title: "Firmalar", url: "/companies", icon: Building2, badge: null },
      { title: "Denetimler", url: "/inspections", icon: ClipboardCheck, badge: null },
    ]
  },
  {
    label: "RİSK & GÜVENLİK",
    icon: ShieldAlert,
    items: [
      { title: "Risk Sihirbazı", url: "/risk-wizard", icon: TrendingUp, badge: "AI" },
      { title: "DÖF Yönetimi", url: "/capa", icon: ShieldAlert, badge: null },
      { title: "DÖF Oluştur", url: "/bulk-capa", icon: ShieldPlus, badge: null },
      { title: "Acil Durum Planı", url: "/adep-wizard", icon: Flame, badge: null },
    ]
  },
  {
    label: "YAPAY ZEKA ARAÇLARI",
    icon: Brain,
    items: [
      { title: "AI Raporlar", url: "/reports", icon: Brain, badge: "Beta" },
      { title: "AI Kroki Okuyucu", url: "/blueprint-analyzer", icon: Target, badge: "Pro" },
    ]
  },
  {
    label: "PLANLAMA & RAPORLAMA",
    icon: Calendar,
    items: [
      { title: "Yıllık Planlar", url: "/annual-plans", icon: Calendar, badge: null },
      { title: "İSG Kütüphanesi", url: "/safety-library", icon: BookOpen, badge: null },
    ]
  }
];

const bottomItems = [
  { title: "Ayarlar", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const toggleGroup = (label: string) => {
    if (collapsed) return; // Sidebar daraltılmışsa grup açma
    setCollapsedGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-slate-800 bg-slate-950"
    >
      {/* HEADER - LOGO & BRANDING */}
      <SidebarHeader className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-3 group/brand cursor-pointer">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-lg shadow-blue-500/30 transition-all duration-300 group-hover/brand:scale-105 group-hover/brand:shadow-blue-500/50">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-black tracking-tight text-white bg-clip-text">
                DENETRON
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 truncate">
                İSG Yönetim Sistemi
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* MAIN CONTENT */}
      <SidebarContent className="px-2 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {menuGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label} className="mb-1">
            {/* GROUP HEADER */}
            <button
              onClick={() => toggleGroup(group.label)}
              className={`flex items-center justify-between w-full px-3 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-400 transition-all rounded-lg ${
                !collapsed ? 'hover:bg-slate-900/50' : ''
              }`}
              disabled={collapsed}
            >
              {!collapsed ? (
                <>
                  <div className="flex items-center gap-2">
                    <group.icon className="h-3 w-3" />
                    <span>{group.label}</span>
                  </div>
                  <ChevronDown 
                    className={`h-3 w-3 transition-transform duration-200 ${
                      collapsedGroups.includes(group.label) ? '-rotate-90' : ''
                    }`} 
                  />
                </>
              ) : (
                <div className="w-full h-px bg-slate-800" />
              )}
            </button>

            {/* GROUP ITEMS */}
            {(!collapsedGroups.includes(group.label) || collapsed) && (
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 mt-1">
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-slate-900 hover:text-white overflow-hidden"
                          activeClassName="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-600/30 border border-blue-500/20"
                        >
                          {/* Active Indicator */}
                          <div className="absolute inset-y-0 left-0 w-1 bg-white rounded-r-full opacity-0 group-[.active]:opacity-100 transition-opacity" />
                          
                          <item.icon className="h-[17px] w-[17px] shrink-0 transition-transform group-hover:scale-110" />
                          
                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate transition-transform group-hover:translate-x-0.5">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                  item.badge === "AI"
                                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-sm shadow-purple-500/20"
                                    : item.badge === "Pro"
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-sm shadow-amber-500/20"
                                    : item.badge === "Beta"
                                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-sm shadow-blue-500/20"
                                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/20"
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}

        {/* SEPARATOR */}
        <div className="my-3 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent mx-2" />

        {/* TOOLS SECTION */}
        <SidebarGroup className="gap-2">
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.15em] text-slate-500 px-3 font-black mb-2">
            {!collapsed ? "SİSTEM" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-slate-900 hover:text-white"
                      activeClassName="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-600/30 border border-blue-500/20"
                    >
                      <item.icon className="h-[17px] w-[17px] shrink-0 transition-transform group-hover:scale-110" />
                      {!collapsed && (
                        <span className="flex-1 transition-transform group-hover:translate-x-0.5">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER - USER & CONTROLS */}
      <SidebarFooter className="border-t border-slate-800 p-3 space-y-3">
        {/* USER INFO PROFILE CARD */}
        {!collapsed && user && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 transition-all hover:border-slate-600 cursor-pointer group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
              {user.email ? user.email.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-bold text-white truncate">
                {user.email?.split("@")[0]}
              </span>
              <span className="text-[9px] text-slate-500 truncate font-medium">
                {user.email}
              </span>
            </div>
            <div className="shrink-0">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            </div>
          </div>
        )}

        {/* BOTTOM CONTROLS */}
        <div className="flex gap-2">
          <button
            onClick={toggleSidebar}
            className="group flex flex-1 items-center justify-center gap-2 rounded-lg p-2.5 text-slate-400 transition-all duration-200 hover:bg-slate-900 hover:text-white border border-transparent hover:border-slate-700"
            title={collapsed ? "Menüyü Aç" : "Menüyü Kapat"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Daralt</span>
              </>
            )}
          </button>

          <button
            onClick={handleSignOut}
            className="group flex items-center justify-center rounded-lg p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20"
            title="Çıkış Yap"
          >
            <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}