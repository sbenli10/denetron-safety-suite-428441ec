import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Users,
  AlertTriangle,
  FileText,
  Clipboard,
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
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  inspections: number;
  assessments: number;
}

type TabType = "overview" | "activity" | "security";

const tabs: Array<{ id: TabType; label: string; icon: string }> = [
  { id: "overview", label: "Genel Bakış", icon: "📊" },
  { id: "activity", label: "Aktiviteler", icon: "📈" },
  { id: "security", label: "Güvenlik", icon: "🔒" },
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
    label: "Çalışanlar",
    icon: Users,
    color: "from-emerald-500/20 to-emerald-600/20",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
  },
  {
    key: "risks",
    label: "Risk Maddeleri",
    icon: AlertTriangle,
    color: "from-orange-500/20 to-orange-600/20",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/30",
  },
  {
    key: "inspections",
    label: "Denetimlerim",
    icon: FileText,
    color: "from-purple-500/20 to-purple-600/20",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/30",
  },
  {
    key: "assessments",
    label: "Değerlendirmeler",
    icon: Clipboard,
    color: "from-pink-500/20 to-pink-600/20",
    textColor: "text-pink-400",
    borderColor: "border-pink-500/30",
  },
];

const avatarColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-pink-500 to-pink-600",
  "from-red-500 to-red-600",
  "from-orange-500 to-orange-600",
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
    inspections: 0,
    assessments: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    position: "",
    department: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      console.log("📊 Fetching profile for user:", user.id);

      // ✅ 1. PROFILE DATA
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("❌ Profile error:", profileError);
        throw new Error("Profil verisi yüklenemedi");
      }

      console.log("✅ Profile data:", profileData);

      setProfile({
        id: profileData.id,
        full_name: profileData.full_name || "Kullanıcı",
        email: profileData.email || user.email || "",
        avatar_url: profileData.avatar_url,
        phone: profileData.phone,
        position: profileData.position,
        department: profileData.department,
        organization_id: profileData.organization_id,
        is_active: profileData.is_active ?? true,
        role: profileData.role || "staff",
        created_at: profileData.created_at,
      });

      setFormData({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
        position: profileData.position || "",
        department: profileData.department || "",
      });

      // ✅ 2. COMPANIES - Kullanıcının organization'ı veya ilişkili companies
      let companyCount = 0;
      
      // Option A: User'ın organization'ı varsa o organization'ı say
      if (profileData.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("id")
          .eq("id", profileData.organization_id)
          .single();
        
        if (orgData) companyCount = 1;
      }
      
      // Option B: Companies tablosunda user_id ile eşleşenleri say
      const { count: userCompanies } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);
      
      companyCount = Math.max(companyCount, userCompanies || 0);

      console.log("✅ Companies:", companyCount);

      // ✅ 3. EMPLOYEES - Aynı organization veya user'ın companies'indeki çalışanlar
      let employeeCount = 0;
      
      if (profileData.organization_id) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profileData.organization_id)
          .eq("is_active", true)
          .neq("id", user.id);
        employeeCount = count || 0;
      }
      
      // Alternatif: User'ın companies'indeki employees
      const { data: userCompaniesData } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id);
      
      if (userCompaniesData && userCompaniesData.length > 0) {
        const companyIds = userCompaniesData.map(c => c.id);
        const { count: employeesInCompanies } = await supabase
          .from("employees")
          .select("*", { count: "exact", head: true })
          .in("company_id", companyIds)
          .eq("is_active", true);
        
        employeeCount = Math.max(employeeCount, employeesInCompanies || 0);
      }

      console.log("✅ Employees:", employeeCount);

      // ✅ 4. RISK ITEMS - risk_assessments üzerinden
      const { data: assessmentIds } = await supabase
        .from("risk_assessments")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_deleted", false);

      let riskCount = 0;
      if (assessmentIds && assessmentIds.length > 0) {
        const ids = assessmentIds.map(a => a.id);
        const { count } = await supabase
          .from("risk_items")
          .select("*", { count: "exact", head: true })
          .in("assessment_id", ids);
        riskCount = count || 0;
      }

      console.log("✅ Risk items:", riskCount);

      // ✅ 5. INSPECTIONS
      const { count: inspectionCount } = await supabase
        .from("inspections")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      console.log("✅ Inspections:", inspectionCount);

      // ✅ 6. RISK ASSESSMENTS
      const { count: assessmentCount } = await supabase
        .from("risk_assessments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_deleted", false);

      console.log("✅ Assessments:", assessmentCount);

      // ✅ 7. SET STATS
      setStats({
        companies: companyCount,
        employees: employeeCount,
        risks: riskCount,
        inspections: inspectionCount || 0,
        assessments: assessmentCount || 0,
      });

      console.log("✅ All data fetched successfully");
    } catch (err: any) {
      console.error("❌ Profile fetch error:", err);
      setError(err.message || "Profil yüklenirken bir sorun oluştu");
      toast.error("Veri yüklenemedi", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("❌ Avatar boyutu 5MB'ı aşamaz");
      return;
    }

    setUploading(true);
    toast.info("📤 Avatar yükleniyor...");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log("📤 Uploading avatar:", filePath);

      // ✅ Upload file
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { 
          cacheControl: "3600", 
          upsert: true 
        });

      if (uploadError) throw uploadError;

      // ✅ Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      console.log("✅ Avatar URL:", urlData.publicUrl);

      // ✅ Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) =>
        prev ? { ...prev, avatar_url: urlData.publicUrl } : null
      );

      toast.success("✅ Avatar güncellendi");
    } catch (err: any) {
      console.error("❌ Avatar upload error:", err);
      toast.error("Avatar yüklenemedi", {
        description: err.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setSaving(true);
    toast.info("💾 Profil kaydediliyor...");

    try {
      console.log("💾 Updating profile:", formData);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          position: formData.position.trim() || null,
          department: formData.department.trim() || null,
          updated_at: new Date().toISOString(),
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
      console.log("✅ Profile updated successfully");
    } catch (err: any) {
      console.error("❌ Profile update error:", err);
      toast.error("Profil güncellenemedi", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth");
      toast.success("Çıkış yapıldı");
    } catch (err) {
      toast.error("Çıkış yapılamadı");
    }
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
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 space-y-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Hata Oluştu</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={fetchProfileData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* ✅ HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profilim</h1>
          <p className="text-muted-foreground mt-1">
            Kişisel bilgilerinizi yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Ayarlar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış
          </Button>
        </div>
      </div>

      {/* ✅ PROFILE CARD */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="h-24 w-24 rounded-xl object-cover border-2 border-border"
                />
              ) : (
                <div
                  className={`h-24 w-24 rounded-xl bg-gradient-to-br ${getAvatarColor(
                    profile?.full_name || "K"
                  )} flex items-center justify-center text-3xl font-bold text-white border-2 border-border`}
                >
                  {profile ? getInitials(profile.full_name) : "K"}
                </div>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 bg-primary hover:bg-primary/90 disabled:opacity-50 p-2 rounded-lg transition-all shadow-lg"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 text-primary-foreground" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />

              {profile?.is_active && (
                <div className="absolute top-1 right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={profile?.is_active ? "default" : "secondary"}>
                    {profile?.is_active ? "✓ Aktif" : "Pasif"}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {profile?.role || "user"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{profile?.email}</span>
                </div>
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile?.position && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{profile.position}</span>
                  </div>
                )}
                {profile?.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.department}</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Üyelik: {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          const value = stats[item.key as keyof StatsData];

          return (
            <Card key={item.key} className={`border-l-4 ${item.borderColor}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${item.textColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ✅ TABS */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ✅ TAB CONTENT */}
      <Card>
        <CardContent className="p-6">
          {currentTab === "overview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Profil Bilgileri</h3>
                {!editing && (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Düzenle
                  </Button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ad Soyad *</Label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Telefon</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="+90 5XX XXX XX XX"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Pozisyon</Label>
                      <Input
                        value={formData.position}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            position: e.target.value,
                          }))
                        }
                        placeholder="İSG Uzmanı"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Departman</Label>
                      <Input
                        value={formData.department}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            department: e.target.value,
                          }))
                        }
                        placeholder="İSG Departmanı"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={saving || !formData.full_name.trim()}
                      className="gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Kaydet
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          full_name: profile?.full_name || "",
                          phone: profile?.phone || "",
                          position: profile?.position || "",
                          department: profile?.department || "",
                        });
                      }}
                      variant="outline"
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">AD SOYAD</p>
                    <p className="font-medium">{profile?.full_name || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">TELEFON</p>
                    <p className="font-medium">{profile?.phone || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">POZİSYON</p>
                    <p className="font-medium">{profile?.position || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">DEPARTMAN</p>
                    <p className="font-medium">{profile?.department || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">E-POSTA</p>
                    <p className="font-medium truncate">{profile?.email}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ROL</p>
                    <p className="font-medium capitalize">
                      {profile?.role || "user"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentTab === "activity" && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aktivite geçmişi yakında eklenecek</p>
            </div>
          )}

          {currentTab === "security" && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Güvenlik ayarları yakında eklenecek</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}