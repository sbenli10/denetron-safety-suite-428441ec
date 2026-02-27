import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Shield,
  CreditCard,
  Puzzle,
  Smartphone,
  Monitor,
  Laptop,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff,
  Bell,
  Lock,
  Check,
  AlertCircle,
  Loader2,
  Save,
  Trash2,
  Copy,
  Download,
  RefreshCw,
  Globe,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type TabType = "general" | "security" | "billing" | "integrations";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: string;
  organization_id: string | null;
  created_at: string;
  is_active: boolean;
}

interface OrganizationData {
  id: string;
  name: string;
  industry: string;
  country: string;
  city: string;
  phone: string;
  website: string;
}

interface SessionData {
  id: number;
  device: string;
  ip: string;
  lastActivity: string;
  current: boolean;
  platform: "windows" | "macos" | "android";
}

const integrations = [
  {
    id: 1,
    name: "Google Workspace",
    description: "Takvim ve e-posta senkronizasyonu",
    icon: "🔵",
    connected: false,
  },
  {
    id: 2,
    name: "Slack",
    description: "Bildirim kanalı entegrasyonu",
    icon: "⚫",
    connected: false,
  },
  {
    id: 3,
    name: "Microsoft Teams",
    description: "Ekip bildirimleri",
    icon: "🟣",
    connected: false,
  },
  {
    id: 4,
    name: "Jira",
    description: "Proje ve hata takibi",
    icon: "🔶",
    connected: false,
  },
];

export default function Settings() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const [currentTab, setCurrentTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneVerification, setPhoneVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Profile data
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    position: "",
    department: "",
  });

  const [orgFormData, setOrgFormData] = useState({
    name: "",
    industry: "",
    city: "",
    phone: "",
    website: "",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    capaAlerts: true,
    riskAlerts: true,
    weeklyReport: true,
    systemUpdates: false,
  });

  // Sessions data
  const [sessions, setSessions] = useState<SessionData[]>([
    {
      id: 1,
      device: "Chrome / Windows",
      ip: "192.168.1.42",
      lastActivity: "Şu anda aktif",
      current: true,
      platform: "windows",
    },
    {
      id: 2,
      device: "Safari / macOS",
      ip: "10.0.0.15",
      lastActivity: "2 saat önce",
      current: false,
      platform: "macos",
    },
    {
      id: 3,
      device: "Chrome / Android",
      ip: "172.16.0.8",
      lastActivity: "1 gün önce",
      current: false,
      platform: "android",
    },
  ]);

  // Billing data
  const [billingData, setBillingData] = useState({
    plan: "Pro Plan",
    price: 99.99,
    currency: "₺",
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: "active",
  });

  useEffect(() => {
    fetchSettingsData();
  }, [user]);

  const fetchSettingsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // ✅ FETCH PROFILE
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfileData(profileData);
      setFormData({
        fullName: profileData.full_name || "",
        phone: profileData.phone || "",
        position: profileData.position || "",
        department: profileData.department || "",
      });

      // ✅ FETCH ORGANIZATION
      if (profileData.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profileData.organization_id)
          .single();

        if (orgError) throw orgError;

        setOrganizationData(orgData);
        setOrgFormData({
          name: orgData.name || "",
          industry: orgData.industry || "",
          city: orgData.city || "",
          phone: orgData.phone || "",
          website: orgData.website || "",
        });
      }

      toast.success("✅ Veriler yüklendi");
    } catch (err: any) {
      console.error("Error:", err);
      toast.error("Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          position: formData.position,
          department: formData.department,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("✅ Profil bilgileri kaydedildi");
    } catch (err: any) {
      toast.error("Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!organizationData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: orgFormData.name,
          industry: orgFormData.industry,
          city: orgFormData.city,
          phone: orgFormData.phone,
          website: orgFormData.website,
        })
        .eq("id", organizationData.id);

      if (error) throw error;
      toast.success("✅ Şirket bilgileri kaydedildi");
    } catch (err: any) {
      toast.error("Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Lütfen parolaları girin");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Parolalar eşleşmiyor");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Parola en az 6 karakter olmalıdır");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("✅ Parola başarıyla güncellendi");
    } catch (err: any) {
      toast.error(err.message || "Parola güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("userNotifications", JSON.stringify(notifications));
    toast.success("✅ Bildirim tercihleri kaydedildi");
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleDownloadData = () => {
    const data = {
      profile: profileData,
      organization: organizationData,
      downloadedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `profile-data-${new Date().toISOString()}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();

    toast.success("✅ Veriler indirildi");
  };

  const handleDeleteAccount = () => {
    if (
      confirm(
        "Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      )
    ) {
      toast.error(
        "Hesap silme talebi gönderildi. Destek ekibi sizi kontrol edecektir."
      );
    }
  };

  const tabs = [
    { id: "general" as const, label: "Genel", icon: <SettingsIcon className="h-4 w-4" /> },
    { id: "security" as const, label: "Güvenlik", icon: <Shield className="h-4 w-4" /> },
    { id: "billing" as const, label: "Faturalama", icon: <CreditCard className="h-4 w-4" /> },
    {
      id: "integrations" as const,
      label: "Entegrasyonlar",
      icon: <Puzzle className="h-4 w-4" />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-muted-foreground">Ayarlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 space-y-8 p-6">
      {/* ✅ HEADER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-blue-500" />
              Ayarlar
            </h1>
            <p className="text-muted-foreground mt-2">
              Hesap, güvenlik ve uygulama tercihlerinizi yönetin
            </p>
          </div>
          <Button
            variant="ghost"
            className="gap-2 text-destructive hover:bg-destructive/10"
            onClick={() => navigate("/profile")}
          >
            Geri Dön
          </Button>
        </div>
      </div>

      {/* ✅ TABS */}
      <div className="glass-card border border-border/50 rounded-xl p-6">
        <div className="flex items-center gap-2 border-b border-border/50 pb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                currentTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {tab.icon}
              <span className="font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ✅ GENERAL */}
        {currentTab === "general" && (
          <div className="pt-6 space-y-6 animate-fade-in">
            {/* Profile Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">👤 Profil Bilgileri</h2>
                <p className="text-sm text-muted-foreground">Kişisel bilgilerinizi güncelleyin</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Ad Soyad</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="bg-secondary/50 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">E-posta</Label>
                  <Input
                    value={profileData?.email || ""}
                    disabled
                    className="bg-secondary/50 h-11 opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Telefon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="bg-secondary/50 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Pozisyon</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className="bg-secondary/50 h-11"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-semibold">Departman</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="bg-secondary/50 h-11"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="gap-2 gradient-primary border-0 text-foreground"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Profili Kaydet
                  </>
                )}
              </Button>
            </div>

            <div className="h-px bg-border/50" />

            {/* Organization Section */}
            {organizationData && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">🏢 Şirket Bilgileri</h2>
                  <p className="text-sm text-muted-foreground">Kuruluş bilgilerinizi güncelleyin</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Şirket Adı</Label>
                    <Input
                      value={orgFormData.name}
                      onChange={(e) =>
                        setOrgFormData({ ...orgFormData, name: e.target.value })
                      }
                      className="bg-secondary/50 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Sektör</Label>
                    <Input
                      value={orgFormData.industry}
                      onChange={(e) =>
                        setOrgFormData({ ...orgFormData, industry: e.target.value })
                      }
                      className="bg-secondary/50 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Şehir</Label>
                    <Input
                      value={orgFormData.city}
                      onChange={(e) =>
                        setOrgFormData({ ...orgFormData, city: e.target.value })
                      }
                      className="bg-secondary/50 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Telefon</Label>
                    <Input
                      value={orgFormData.phone}
                      onChange={(e) =>
                        setOrgFormData({ ...orgFormData, phone: e.target.value })
                      }
                      className="bg-secondary/50 h-11"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-semibold">Website</Label>
                    <Input
                      value={orgFormData.website}
                      onChange={(e) =>
                        setOrgFormData({ ...orgFormData, website: e.target.value })
                      }
                      className="bg-secondary/50 h-11"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveOrganization}
                  disabled={saving}
                  className="gap-2 gradient-primary border-0 text-foreground"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Şirket Bilgilerini Kaydet
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="h-px bg-border/50" />

            {/* Notifications */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">🔔 Bildirim Tercihleri</h2>
                <p className="text-sm text-muted-foreground">
                  Hangi bildirimleri almak istediğinizi seçin
                </p>
              </div>

              <div className="space-y-3">
                {Object.entries(notifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 bg-secondary/30 border border-border/50 rounded-lg hover:bg-secondary/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {key === "emailNotifications" && "📧 E-posta Bildirimleri"}
                        {key === "capaAlerts" && "⚠️ CAPA Uyarıları"}
                        {key === "riskAlerts" && "🔴 Risk Uyarıları"}
                        {key === "weeklyReport" && "📊 Haftalık Rapor"}
                        {key === "systemUpdates" && "🔄 Sistem Güncellemeleri"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {key === "emailNotifications" && "Yeni denetim raporları için"}
                        {key === "capaAlerts" && "Yüksek riskli bulgular için"}
                        {key === "riskAlerts" && "Kritik risk tespitleri için"}
                        {key === "weeklyReport" && "Haftalık özet raporu"}
                        {key === "systemUpdates" && "Uygulama güncellemeleri"}
                      </p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) =>
                        setNotifications({
                          ...notifications,
                          [key]: checked,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSaveNotifications}
                className="gap-2 gradient-primary border-0 text-foreground"
              >
                <Save className="h-4 w-4" />
                Bildirimleri Kaydet
              </Button>
            </div>
          </div>
        )}

        {/* ✅ SECURITY */}
        {currentTab === "security" && (
          <div className="pt-6 space-y-6 animate-fade-in">
            {/* Change Password */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">🔐 Parola Değiştir</h2>
                <p className="text-sm text-muted-foreground">
                  Hesap parolanızı güvenli bir şekilde güncelleyin
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-semibold mb-1">Güvenlik İpuçları:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Parolanızı düzenli olarak değiştirin</li>
                    <li>• Güçlü ve benzersiz bir parola kullanın</li>
                    <li>• Parolanızı başkasıyla paylaşmayın</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Yeni Parola</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-secondary/50 h-11 pr-10"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Parolayı Onayla</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-secondary/50 h-11"
                  />
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={saving}
                className="gap-2 gradient-primary border-0 text-foreground"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Parolayı Güncelle
                  </>
                )}
              </Button>
            </div>

            <div className="h-px bg-border/50" />

            {/* Two Factor */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">📱 İki Faktörlü Kimlik Doğrulama</h2>
                <p className="text-sm text-muted-foreground">
                  Hesabınızın güvenliğini arttırın
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Telefonla Onay</p>
                    <p className="text-xs text-muted-foreground">
                      {phoneVerification ? "Etkin" : "Devre Dışı"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={phoneVerification}
                  onCheckedChange={setPhoneVerification}
                />
              </div>
            </div>

            <div className="h-px bg-border/50" />

            {/* Sessions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">🔗 Aktif Oturumlar</h2>
                  <p className="text-sm text-muted-foreground">
                    Hesabınıza bağlı olan tüm oturumlar
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Diğerlerini Kapat
                </Button>
              </div>

              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-secondary/30 border border-border/50 rounded-lg hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-black/20">
                        {session.platform === "windows" && (
                          <Monitor className="h-5 w-5 text-blue-400" />
                        )}
                        {session.platform === "macos" && (
                          <Laptop className="h-5 w-5 text-gray-400" />
                        )}
                        {session.platform === "android" && (
                          <Smartphone className="h-5 w-5 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {session.device}
                          </p>
                          {session.current && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
                              <Check className="h-3 w-3" />
                              Bu Cihaz
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.ip} · {session.lastActivity}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ✅ BILLING */}
        {currentTab === "billing" && (
          <div className="pt-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl">
              <div>
                <p className="text-lg font-bold text-foreground">{billingData.plan}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aylık · Sonraki fatura: {billingData.nextBillingDate.toLocaleDateString("tr-TR")}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-2xl font-bold text-foreground">
                    {billingData.currency}{billingData.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/ay</span>
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                Planı Değiştir
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-px bg-border/50" />

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">📋 Faturalama Geçmişi</h3>

              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-secondary/30 border border-border/50 rounded-lg hover:bg-secondary/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {billingData.plan} - {new Date(billingData.nextBillingDate.getTime() - (i + 1) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {billingData.currency}{billingData.price}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ✅ INTEGRATIONS */}
        {currentTab === "integrations" && (
          <div className="pt-6 space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">🔗 Bağlı Servisler</h2>
              <p className="text-sm text-muted-foreground">
                Üçüncü parti entegrasyonları yönetin
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="p-5 bg-secondary/30 border border-border/50 rounded-xl hover:bg-secondary/40 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {integration.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        integration.connected
                          ? "bg-success/10 text-success border-success/30"
                          : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                      }`}
                    >
                      {integration.connected ? "✓ Bağlı" : "❌ Bağlı Değil"}
                    </span>
                  </div>

                  <Button
                    variant={integration.connected ? "outline" : "default"}
                    className={`w-full gap-2 ${
                      integration.connected
                        ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                        : "gradient-primary border-0 text-foreground"
                    }`}
                    size="sm"
                  >
                    {integration.connected ? (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Bağlantıyı Kes
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4" />
                        Bağla
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ✅ DANGER ZONE */}
      <div className="glass-card border border-red-500/30 bg-red-500/5 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-red-600 mb-1">⚠️ Tehlikeli İşlemler</h2>
          <p className="text-sm text-red-700">Bu işlemler geri alınamaz</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={handleDownloadData}
            variant="outline"
            className="gap-2 border-blue-500/30 hover:bg-blue-500/10"
          >
            <Download className="h-4 w-4" />
            Verilerinizi İndir
          </Button>
          <Button
            onClick={handleDeleteAccount}
            variant="outline"
            className="gap-2 border-red-500/30 text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Hesabı Sil
          </Button>
        </div>
      </div>

      {/* ✅ FOOTER */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => navigate("/profile")}
        >
          Geri Dön
        </Button>
        <Button
          variant="ghost"
          className="gap-2 text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );
}