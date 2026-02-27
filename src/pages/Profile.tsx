import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Users,
  AlertTriangle,
  FileText,
  Clipboard,
  MessageSquare,
  HelpCircle,
  Settings,
  LogOut,
  RefreshCw,
  AlertCircle,
  Loader2,
  Camera,
  Mail,
  Shield,
  Phone,
  Briefcase,
  MapPin,
  Edit2,
  Save,
  X,
  Check,
  Award,
  Calendar,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  organization_id: string | null;
  is_active: boolean;
  role: string;
  created_at: string;
}

interface StatsData {
  companies: number;
  employees: number;
  risks: number;
  notes: number;
  reports: number;
}

type TabType = "overview" | "companies" | "employees" | "risks" | "reports";

const tabs: Array<{ id: TabType; label: string; icon: string }> = [
  { id: "overview", label: "Genel Bakış", icon: "📊" },
  { id: "companies", label: "Firmalar", icon: "🏢" },
  { id: "employees", label: "Çalışanlar", icon: "👥" },
  { id: "risks", label: "Risklerim", icon: "⚠️" },
  { id: "reports", label: "Raporlar", icon: "📋" },
];

const statItems = [
  {
    key: "companies",
    label: "Firmalarım",
    icon: Building2,
    color: "from-blue-500/20 to-blue-600/20",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/30",
  },
  {
    key: "employees",
    label: "Çalışanlarım",
    icon: Users,
    color: "from-emerald-500/20 to-emerald-600/20",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
  },
  {
    key: "risks",
    label: "Risklerim",
    icon: AlertTriangle,
    color: "from-orange-500/20 to-orange-600/20",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/30",
  },
  {
    key: "notes",
    label: "Notlarım",
    icon: FileText,
    color: "from-purple-500/20 to-purple-600/20",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/30",
  },
  {
    key: "reports",
    label: "Raporlarım",
    icon: Clipboard,
    color: "from-pink-500/20 to-pink-600/20",
    textColor: "text-pink-400",
    borderColor: "border-pink-500/30",
  },
];

const avatarLetters = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z",
];

const avatarColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-pink-500 to-pink-600",
  "from-red-500 to-red-600",
  "from-orange-500 to-orange-600",
  "from-yellow-500 to-yellow-600",
  "from-green-500 to-green-600",
  "from-teal-500 to-teal-600",
  "from-cyan-500 to-cyan-600",
  "from-indigo-500 to-indigo-600",
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTab, setCurrentTab] = useState<TabType>("overview");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData>({
    companies: 0,
    employees: 0,
    risks: 0,
    notes: 0,
    reports: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    position: "",
    department: "",
  });

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        id: profileData.id,
        full_name: profileData.full_name || "Kullanıcı",
        email: profileData.email || user.email || "",
        avatar_url: profileData.avatar_url,
        phone: profileData.phone,
        position: profileData.position,
        department: profileData.department,
        organization_id: profileData.organization_id,
        is_active: profileData.is_active,
        role: profileData.role,
        created_at: profileData.created_at,
      });

      setFormData({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
        position: profileData.position || "",
        department: profileData.department || "",
      });

      // ✅ FETCH STATS
      const { count: companyCount } = await supabase
        .from("organizations")
        .select("id", { count: "exact" })
        .eq("id", profileData.organization_id || "");

      const { count: inspCount } = await supabase
        .from("inspections")
        .select("id", { count: "exact" })
        .eq("user_id", user.id);

      const { data: inspectionIds } = await supabase
        .from("inspections")
        .select("id")
        .eq("user_id", user.id);

      let riskCount = 0;
      if (inspectionIds && inspectionIds.length > 0) {
        const ids = inspectionIds.map((i) => i.id);
        const { count } = await supabase
          .from("findings")
          .select("id", { count: "exact" })
          .in("inspection_id", ids);
        riskCount = count || 0;
      }

      const { count: reportCount } = await supabase
        .from("reports")
        .select("id", { count: "exact" })
        .eq("user_id", user.id);

      setStats({
        companies: companyCount || 0,
        employees: 0,
        risks: riskCount,
        notes: inspCount || 0,
        reports: reportCount || 0,
      });
    } catch (err: any) {
      console.error("Profile error:", err);
      setError(err.message || "Profil yüklenirken bir sorun oluştu");
      toast.error("Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar boyutu 5MB'ı aşamaz");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) =>
        prev ? { ...prev, avatar_url: data.publicUrl } : null
      );
      toast.success("✅ Avatar güncellendi");
    } catch (err: any) {
      toast.error("Avatar yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          position: formData.position,
          department: formData.department,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: formData.full_name,
              phone: formData.phone,
              position: formData.position,
              department: formData.department,
            }
          : null
      );

      setEditing(false);
      toast.success("✅ Profil güncellendi");
    } catch (err: any) {
      toast.error("Profil güncellenemedi");
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string): string => {
    const index = (name.charCodeAt(0) + name.charCodeAt(1 || 0)) % avatarColors.length;
    return avatarColors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-muted-foreground">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 space-y-8 p-6">
      {/* ✅ HEADER SECTION */}
      <div className="space-y-6">
        {/* ✅ TOP BAR */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Profilim</h1>
            <p className="text-muted-foreground mt-1">
              Kişisel bilgilerinizi yönetin ve görüntüleyin
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-4 w-4" />
              Ayarlar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </Button>
          </div>
        </div>

        {/* ✅ PROFILE CARD */}
        <div className="glass-card border border-border/50 rounded-2xl p-8">
          <div className="flex items-start justify-between gap-8">
            {/* ✅ LEFT - AVATAR */}
            <div className="flex items-start gap-6">
              <div className="relative group">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-32 w-32 rounded-2xl object-cover border-2 border-blue-500/30 shadow-lg"
                    />
                  ) : (
                    <div
                      className={`h-32 w-32 rounded-2xl bg-gradient-to-br ${getAvatarColor(
                        profile?.full_name || "K"
                      )} flex items-center justify-center text-5xl font-bold text-white border-2 border-blue-500/30 shadow-lg`}
                    >
                      {profile ? getInitials(profile.full_name) : "K"}
                    </div>
                  )}

                  {/* ✅ UPLOAD BUTTON */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 p-3 rounded-lg transition-all shadow-lg"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />

                  {/* ✅ ACTIVE BADGE */}
                  {profile?.is_active && (
                    <div className="absolute top-2 right-2 h-6 w-6 bg-emerald-500 rounded-full border-3 border-slate-900 animate-pulse shadow-lg shadow-emerald-500/50" />
                  )}
                </div>
              </div>

              {/* ✅ INFO */}
              <div className="space-y-4 flex-1">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">
                    {profile?.full_name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    <Badge variant={profile?.is_active ? "default" : "secondary"}>
                      {profile?.is_active ? "✓ Aktif" : "Pasif"}
                    </Badge>
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{profile?.email}</span>
                  </p>
                  <p className="flex items-center gap-3 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span className="capitalize">{profile?.role || "Kullanıcı"}</span>
                  </p>
                  {profile?.phone && (
                    <p className="flex items-center gap-3 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{profile.phone}</span>
                    </p>
                  )}
                  {profile?.position && (
                    <p className="flex items-center gap-3 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span>{profile.position}</span>
                    </p>
                  )}
                  {profile?.department && (
                    <p className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.department}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ RIGHT - QUICK INFO */}
            <div className="space-y-3 text-right">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">ÜYELIK DURUMU</p>
                <p className="text-2xl font-bold text-blue-400">✓ Aktif</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">ÜYE OLUNMA TARİHİ</p>
                <p className="text-sm font-semibold text-purple-400">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("tr-TR")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          const value = stats[item.key as keyof StatsData];

          return (
            <div
              key={item.key}
              className={`glass-card border ${item.borderColor} rounded-xl p-5 space-y-3 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer bg-gradient-to-br ${item.color}`}
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-black/20">
                  <Icon className={`h-5 w-5 ${item.textColor}`} />
                </div>
                <span className="text-xs font-bold text-muted-foreground">↑ 12%</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
              <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${item.color}`}
                  style={{ width: `${Math.min((value / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ TABS */}
      <div className="glass-card border border-border/50 rounded-xl p-3 overflow-x-auto">
        <div className="flex items-center gap-2 w-full min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                currentTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ✅ CONTENT AREA */}
      <div className="glass-card border border-border/50 rounded-xl p-8 min-h-[400px]">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-full p-4">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-foreground">⚠️ Hata Oluştu</h3>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
            <Button
              onClick={fetchProfileData}
              className="gap-2 gradient-primary border-0 text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              Tekrar Dene
            </Button>
          </div>
        ) : currentTab === "overview" ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Profil Bilgileri</h2>
              <Button
                onClick={() => (editing ? handleUpdateProfile() : setEditing(true))}
                className={`gap-2 ${
                  editing
                    ? "gradient-primary border-0 text-foreground"
                    : "border-blue-500/30 hover:bg-blue-500/10"
                }`}
                variant={editing ? "default" : "outline"}
              >
                {editing ? (
                  <>
                    <Save className="h-4 w-4" />
                    Kaydet
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4" />
                    Düzenle
                  </>
                )}
              </Button>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Ad Soyad</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          full_name: e.target.value,
                        }))
                      }
                      className="bg-secondary/50 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Telefon</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="bg-secondary/50 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Pozisyon</Label>
                    <Input
                      value={formData.position}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          position: e.target.value,
                        }))
                      }
                      className="bg-secondary/50 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Departman</Label>
                    <Input
                      value={formData.department}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          department: e.target.value,
                        }))
                      }
                      className="bg-secondary/50 h-11"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setEditing(false)}
                    variant="outline"
                  >
                    <X className="h-4 w-4 mr-2" />
                    İptal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">AD SOYAD</p>
                    <p className="text-lg font-bold text-foreground">
                      {profile?.full_name || "-"}
                    </p>
                  </div>

                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">TELEFON</p>
                    <p className="text-lg font-bold text-foreground">
                      {profile?.phone || "-"}
                    </p>
                  </div>

                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">POZİSYON</p>
                    <p className="text-lg font-bold text-foreground">
                      {profile?.position || "-"}
                    </p>
                  </div>

                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">DEPARTMAN</p>
                    <p className="text-lg font-bold text-foreground">
                      {profile?.department || "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">ROL</p>
                    <p className="text-lg font-bold text-blue-400 capitalize">
                      {profile?.role || "staff"}
                    </p>
                  </div>

                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">DURUM</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {profile?.is_active ? "✓ Aktif" : "✗ Pasif"}
                    </p>
                  </div>

                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">E-POSTA</p>
                    <p className="text-sm font-bold text-purple-400 truncate">
                      {profile?.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-semibold mb-2">
              {tabs.find((t) => t.id === currentTab)?.label}
            </p>
            <p>Bu sekme henüz geliştirilme aşamasındadır.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ✅ Badge Component
function Badge({
  variant = "default",
  children,
}: {
  variant?: "default" | "secondary";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        variant === "default"
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
      }`}
    >
      {children}
    </span>
  );
}