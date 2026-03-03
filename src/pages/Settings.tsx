import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Shield,
  CreditCard,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Trash2,
  Download,
  LogOut,
  Smartphone,
  Monitor,
  Laptop,
  AlertCircle,
  RefreshCw,
  Crown,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import { terminateSession, recordSession } from "@/utils/sessionManager";
import type { BillingHistory, UserSession } from "@/types/subscription";
import { TwoFactorSetupModal } from '@/components/TwoFactorSetupModal';
import { untrustDevice } from '@/utils/deviceFingerprint';

type TabType = "general" | "security" | "billing" | "notifications";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  role: string;
  organization_id: string | null;
  two_factor_enabled: boolean;
  two_factor_method: string | null;
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

export default function Settings() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { status, plan, daysLeftInTrial, isTrialExpired, features, refetch: refetchSubscription } = useSubscription();

  const [currentTab, setCurrentTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentFactorId, setCurrentFactorId] = useState<string | null>(null);
  const [trustedDevices, setTrustedDevices] = useState<any[]>([]);

  // ✅ State tanımlamaları (en üstte)
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<{
    qr_code: string;
    secret: string;
    uri: string;
  } | null>(null);
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

  // Sessions & Billing
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

useEffect(() => {
  if (user) {
    fetchSettingsData();
    
    // ✅ Session'ı sadece ilk render'da kaydet
    const sessionRecorded = sessionStorage.getItem('session_recorded');
    if (!sessionRecorded) {
      recordSession(user.id);
      sessionStorage.setItem('session_recorded', 'true');
    }
  }
}, [user]);
  

  const fetchSettingsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("📊 Fetching settings data...");

      // ✅ FETCH PROFILE
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const { data: trustedDevicesData } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (trustedDevicesData) {
        setTrustedDevices(trustedDevicesData);
      }

      setProfileData(profileData as ProfileData);
      setTwoFactorEnabled(profileData.two_factor_enabled || false);
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

        if (!orgError && orgData) {
          setOrganizationData(orgData as OrganizationData);
          setOrgFormData({
            name: orgData.name || "",
            industry: orgData.industry || "",
            city: orgData.city || "",
            phone: orgData.phone || "",
            website: orgData.website || "",
          });
        }
      }

      // ✅ FETCH SESSIONS (with type casting)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("last_activity", { ascending: false })
        .limit(10);

      if (!sessionsError && sessionsData) {
        // Type cast to UserSession[]
        const typedSessions: UserSession[] = sessionsData.map((session) => ({
          id: session.id,
          user_id: session.user_id,
          device_name: session.device_name,
          device_type: session.device_type as 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web',
          browser: session.browser,
          ip_address: session.ip_address,
          user_agent: session.user_agent,
          last_activity: session.last_activity,
          created_at: session.created_at,
          is_current: session.is_current,
        }));
        setSessions(typedSessions);
      }

      // ✅ FETCH BILLING HISTORY (with type casting)
      const { data: billingData, error: billingError } = await supabase
        .from("billing_history")
        .select("*")
        .eq("user_id", user.id)
        .order("billing_date", { ascending: false })
        .limit(10);

      if (!billingError && billingData) {
        // Type cast to BillingHistory[]
        const typedBilling: BillingHistory[] = billingData.map((bill) => ({
          id: bill.id,
          user_id: bill.user_id,
          plan_name: bill.plan_name,
          amount: bill.amount,
          currency: bill.currency,
          status: bill.status as 'paid' | 'pending' | 'failed' | 'refunded',
          invoice_url: bill.invoice_url,
          billing_date: bill.billing_date,
          period_start: bill.period_start,
          period_end: bill.period_end,
          payment_method: bill.payment_method,
        }));
        setBillingHistory(typedBilling);
      }

      // ✅ FETCH NOTIFICATION PREFERENCES (from localStorage)
      const savedNotifications = localStorage.getItem("userNotifications");
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }

      console.log("✅ Settings data loaded");
      toast.success("✅ Ayarlar yüklendi");
    } catch (err: any) {
      console.error("❌ Settings error:", err);
      toast.error("Ayarlar yüklenemedi", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ SAVE PROFILE
  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim() || null,
          position: formData.position.trim() || null,
          department: formData.department.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              full_name: formData.fullName,
              phone: formData.phone,
              position: formData.position,
              department: formData.department,
            }
          : null
      );

      toast.success("✅ Profil bilgileri kaydedildi", {
        description: "Değişiklikler başarıyla uygulandı",
      });
    } catch (err: any) {
      console.error("Profile save error:", err);
      toast.error("Kayıt başarısız", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // ✅ SAVE ORGANIZATION
  const handleSaveOrganization = async () => {
    if (!organizationData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: orgFormData.name.trim(),
          industry: orgFormData.industry.trim() || null,
          city: orgFormData.city.trim() || null,
          phone: orgFormData.phone.trim() || null,
          website: orgFormData.website.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationData.id);

      if (error) throw error;

      toast.success("✅ Şirket bilgileri kaydedildi", {
        description: "Organizasyon ayarları güncellendi",
      });
    } catch (err: any) {
      console.error("Organization save error:", err);
      toast.error("Kayıt başarısız", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // ✅ CHANGE PASSWORD
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("❌ Lütfen parolaları girin");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("❌ Parolalar eşleşmiyor");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("❌ Parola en az 6 karakter olmalıdır");
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
      toast.success("✅ Parola başarıyla güncellendi", {
        description: "Yeni parolanızla giriş yapabilirsiniz",
      });
    } catch (err: any) {
      console.error("Password change error:", err);
      toast.error("❌ Parola güncellenemedi", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

// ✅ TOGGLE 2FA - GERÇEK SUPABASE MFA (FINAL - WORKING VERSION)
const handleToggle2FA = async (enabled: boolean) => {
  if (!user) return;

  setSaving(true);
  try {
    if (enabled) {
      // ✅ 1. Tüm factor'leri kontrol et
      const { data: existingFactors, error: listError } = await supabase.auth.mfa.listFactors();
      
      if (listError) {
        console.error('❌ List factors error:', listError);
        throw listError;
      }

      console.log('📋 Existing factors:', existingFactors);
      console.log('📋 ALL factors:', existingFactors?.all);

      // ✅ 2. Verified TOTP factor varsa, kullanıcıya bilgi ver
      if (existingFactors && existingFactors.all && existingFactors.all.length > 0) {
        const verifiedTotpFactors = existingFactors.all.filter(
          (factor: any) => 
            factor.factor_type === 'totp' && 
            factor.status === 'verified'
        );

        if (verifiedTotpFactors.length > 0) {
          console.log('✅ Found verified TOTP factors:', verifiedTotpFactors.length);
          
          // Zaten aktif 2FA var
          await supabase
            .from('profiles')
            .update({
              two_factor_enabled: true,
              two_factor_method: 'totp',
            })
            .eq('id', user.id);

          setTwoFactorEnabled(true);
          
          toast.info('ℹ️ 2FA zaten aktif', {
            description: 'Yeniden kurmak için önce kapatın',
          });
          
          setSaving(false);
          return;
        }

        // ✅ 3. Unverified factor'leri temizle
        const unverifiedFactors = existingFactors.all.filter(
          (factor: any) => factor.status !== 'verified'
        );

        if (unverifiedFactors.length > 0) {
          console.log('🗑️ Cleaning unverified factors:', unverifiedFactors.length);
          
          for (const factor of unverifiedFactors) {
            try {
              console.log('🗑️ Removing unverified factor:', factor.id);
              await supabase.auth.mfa.unenroll({ factorId: factor.id });
              console.log('✅ Factor removed:', factor.id);
            } catch (unenrollErr: any) {
              console.error('⚠️ Failed to remove factor:', factor.id, unenrollErr);
            }
          }
          
          // Supabase'in sync olması için bekle
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // ✅ 4. Yeni TOTP factor oluştur
      console.log('➕ Creating new TOTP factor...');
      
      // Unique friendly name (timestamp + random)
      const uniqueFriendlyName = `DENETRON-${user.email?.split('@')[0] || 'User'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('📝 Friendly name:', uniqueFriendlyName);

      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: uniqueFriendlyName,
      });

      if (enrollError) {
        console.error('❌ Enroll error:', enrollError);
        throw enrollError;
      }

      if (enrollData && enrollData.totp) {
        console.log('✅ TOTP factor created:', enrollData);
        console.log('🔑 Factor ID:', enrollData.id); // ✅ ÖNEMLİ
        
        // ✅ Factor ID'yi kaydet
        setCurrentFactorId(enrollData.id);
        
        // QR Code verilerini sakla
        const qrData = {
          qr_code: enrollData.totp.qr_code,
          secret: enrollData.totp.secret,
          uri: enrollData.totp.uri,
        };
        
        console.log('💾 Setting QR data:', qrData);
        console.log('💾 Setting Factor ID:', enrollData.id);
        
        setQRCodeData(qrData);
        setShow2FASetupModal(true);

        toast.info('📱 2FA Kurulumu Başlatıldı', {
          description: 'Google Authenticator ile QR kodu tarayın',
          duration: 5000,
        });
      } else {
        throw new Error('TOTP data bulunamadı');
      }
    } else {
      // ✅ DISABLE 2FA - TÜM FACTOR'LERİ SİL
      console.log('🔴 Disabling 2FA...');
      
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      
      if (listError) {
        console.error('❌ List factors error:', listError);
        throw listError;
      }
      
      console.log('📋 Factors to remove:', factors?.all?.length || 0);

      // ALL array'inden tüm factor'leri sil
      if (factors && factors.all && factors.all.length > 0) {
        for (const factor of factors.all) {
          try {
            console.log('🗑️ Removing factor:', factor.id, factor.friendly_name);
            
            await supabase.auth.mfa.unenroll({
              factorId: factor.id,
            });
            
            console.log('✅ Factor removed:', factor.id);
          } catch (unenrollErr: any) {
            console.error('⚠️ Failed to remove factor:', factor.id, unenrollErr);
            // Devam et, diğer factor'leri de dene
          }
        }
      }

      // Update profile
      await supabase
        .from('profiles')
        .update({
          two_factor_enabled: false,
          two_factor_method: null,
        })
        .eq('id', user.id);

      setTwoFactorEnabled(false);
      
      toast.success('✅ İki faktörlü doğrulama kapatıldı', {
        description: 'Tüm 2FA ayarları temizlendi',
      });
    }
  } catch (err: any) {
    console.error('❌ 2FA toggle error:', err);
    
    let errorMessage = 'İşlem başarısız';
    let errorDescription = err.message || 'Bilinmeyen hata';

    // Specific error messages
    if (err.message?.includes('already exists')) {
      errorMessage = '2FA çakışması tespit edildi';
      errorDescription = 'Lütfen "2FA\'yı Sıfırla" butonunu kullanın veya sayfayı yenileyin';
    } else if (err.message?.includes('not found')) {
      errorMessage = 'Factor bulunamadı';
      errorDescription = 'Sayfayı yenileyip tekrar deneyin';
    } else if (err.message?.includes('TOTP data')) {
      errorMessage = 'QR kod oluşturulamadı';
      errorDescription = 'Lütfen sayfayı yenileyip tekrar deneyin';
    }

    toast.error(`❌ ${errorMessage}`, {
      description: errorDescription,
      duration: 5000,
    });
  } finally {
    setSaving(false);
  }
};

// ✅ Force Reset 2FA
const handleForceReset2FA = async () => {
  if (!user) return;
  
  if (!confirm('⚠️ Mevcut 2FA ayarlarınız silinecek. Devam edilsin mi?')) {
    return;
  }

  setSaving(true);
  try {
    console.log('🔄 Force resetting 2FA...');
    
    // Get all factors
    const { data: factors } = await supabase.auth.mfa.listFactors();
    
    // Remove ALL factors (even unverified)
    if (factors && factors.all) {
      for (const factor of factors.all) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
          console.log('✅ Removed factor:', factor.id);
        } catch (err) {
          console.error('Failed to remove factor:', factor.id, err);
        }
      }
    }

    // Reset profile
    await supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_method: null,
      })
      .eq('id', user.id);

    setTwoFactorEnabled(false);
    
    toast.success('✅ 2FA tamamen sıfırlandı', {
      description: 'Şimdi yeniden kurulum yapabilirsiniz',
    });
    
    // Refresh page
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err: any) {
    console.error('Force reset error:', err);
    toast.error('❌ Sıfırlama başarısız');
  } finally {
    setSaving(false);
  }
};
  // ✅ TERMINATE SESSION
  const handleTerminateSession = async (sessionId: string) => {
    const success = await terminateSession(sessionId);

    if (success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("✅ Oturum sonlandırıldı", {
        description: "Cihaz bağlantısı kesildi",
      });
    } else {
      toast.error("❌ Oturum sonlandırılamadı");
    }
  };

  // ✅ FORCE CLEAN - Tüm factor'leri temizle (Debug için)
const handleForceCleanFactors = async () => {
  if (!user) return;
  
  const confirmed = confirm(
    '⚠️ UYARI: Tüm 2FA ayarlarınız silinecek!\n\n' +
    'Bu işlem:\n' +
    '• Tüm factor\'leri siler\n' +
    '• 2FA\'yı tamamen devre dışı bırakır\n' +
    '• Sayfayı yeniler\n\n' +
    'Devam etmek istiyor musunuz?'
  );
  
  if (!confirmed) return;

  setSaving(true);
  try {
    console.log('🔥 FORCE CLEANING ALL FACTORS...');
    
    // List all factors
    const { data: factors } = await supabase.auth.mfa.listFactors();
    
    console.log('📋 Total factors found:', factors?.all?.length || 0);

    if (factors && factors.all) {
      console.log('🗑️ Deleting factors:', factors.all.map((f: any) => ({
        id: f.id,
        name: f.friendly_name,
        type: f.factor_type,
        status: f.status,
      })));

      // Delete each factor
      for (const factor of factors.all) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
          console.log('✅ Deleted:', factor.id);
        } catch (err) {
          console.error('❌ Failed to delete:', factor.id, err);
        }
      }
    }

    // Reset profile
    await supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_method: null,
      })
      .eq('id', user.id);

    toast.success('✅ Tüm 2FA ayarları temizlendi', {
      description: 'Sayfa yenileniyor...',
    });

    // Reload page
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err: any) {
    console.error('❌ Force clean error:', err);
    toast.error('❌ Temizleme başarısız', {
      description: err.message,
    });
  } finally {
    setSaving(false);
  }
};

  // ✅ SAVE NOTIFICATIONS
  const handleSaveNotifications = () => {
    localStorage.setItem("userNotifications", JSON.stringify(notifications));
    toast.success("✅ Bildirim tercihleri kaydedildi");
  };

  // ✅ LOGOUT
  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  // ✅ DOWNLOAD DATA
  const handleDownloadData = () => {
    const data = {
      profile: profileData,
      organization: organizationData,
      subscription: { status, plan, features },
      downloadedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `denetron-data-${new Date().toISOString().split("T")[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();

    toast.success("✅ Veriler indirildi", {
      description: "JSON dosyası bilgisayarınıza kaydedildi",
    });
  };

  // ✅ DELETE ACCOUNT
  const handleDeleteAccount = () => {
    if (
      confirm(
        "⚠️ Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz?\n\nBu işlem GERİ ALINAMAZ!"
      )
    ) {
      toast.error("🗑️ Hesap silme talebi alındı", {
        description: "Destek ekibimiz en kısa sürede sizinle iletişime geçecek",
        duration: 8000,
      });
    }
  };

  const tabs = [
    { id: "general" as const, label: "Genel", icon: <SettingsIcon className="h-4 w-4" /> },
    { id: "security" as const, label: "Güvenlik", icon: <Shield className="h-4 w-4" /> },
    { id: "billing" as const, label: "Faturalama", icon: <CreditCard className="h-4 w-4" /> },
    { id: "notifications" as const, label: "Bildirimler", icon: <Bell className="h-4 w-4" /> },
  ];

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "windows":
      case "linux":
        return <Monitor className="h-5 w-5 text-blue-400" />;
      case "macos":
        return <Laptop className="h-5 w-5 text-gray-400" />;
      case "android":
      case "ios":
        return <Smartphone className="h-5 w-5 text-green-400" />;
      default:
        return <Monitor className="h-5 w-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <div className="space-y-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Ayarlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 space-y-6">
        {/* ✅ HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-blue-500" />
              Ayarlar
            </h1>
            <p className="text-muted-foreground mt-1">
              Hesap, güvenlik ve tercihlerinizi yönetin
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/profile")}>
            Geri Dön
          </Button>
        </div>

        {/* ✅ SUBSCRIPTION STATUS BANNER */}
        {status === 'trial' && !isTrialExpired && (
          <Card className="border-l-4 border-l-yellow-500 bg-yellow-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-semibold text-foreground">
                    Deneme Sürümü Aktif
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {daysLeftInTrial} gün kaldı · Tüm premium özellikler açık
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Crown className="h-4 w-4 mr-2" />
                Yükselt
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'trial' && isTrialExpired && (
          <Card className="border-l-4 border-l-red-500 bg-red-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-semibold text-foreground">
                    Deneme Süresi Sona Erdi
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Devam etmek için bir paket seçin
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                Paketi Seç
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'premium' && (
          <Card className="border-l-4 border-l-green-500 bg-green-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-semibold text-foreground">
                    Premium Üyelik Aktif
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tüm özelliklere sınırsız erişim
                  </p>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600">
                <Crown className="h-3 w-3 mr-1" />
                Uzman
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* ✅ TABS */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2 border-b border-border pb-3 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    currentTab === tab.id
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ✅ TAB CONTENT */}
            <div className="mt-6">
              {/* GENERAL TAB */}
              {currentTab === "general" && (
                <div className="space-y-6">
                  {/* Profile Section */}
                  <div>
                    <h2 className="text-lg font-bold mb-4">👤 Profil Bilgileri</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ad Soyad *</Label>
                        <Input
                          value={formData.fullName}
                          onChange={(e) =>
                            setFormData({ ...formData, fullName: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>E-posta</Label>
                        <Input value={profileData?.email || ""} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefon</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          placeholder="+90 5XX XXX XX XX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pozisyon</Label>
                        <Input
                          value={formData.position}
                          onChange={(e) =>
                            setFormData({ ...formData, position: e.target.value })
                          }
                          placeholder="İSG Uzmanı"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Departman</Label>
                        <Input
                          value={formData.department}
                          onChange={(e) =>
                            setFormData({ ...formData, department: e.target.value })
                          }
                          placeholder="İSG Departmanı"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Profili Kaydet
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Organization Section */}
                  {organizationData && (
                    <>
                      <div className="h-px bg-border" />
                      <div>
                        <h2 className="text-lg font-bold mb-4">🏢 Şirket Bilgileri</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Şirket Adı</Label>
                            <Input
                              value={orgFormData.name}
                              onChange={(e) =>
                                setOrgFormData({ ...orgFormData, name: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sektör</Label>
                            <Input
                              value={orgFormData.industry}
                              onChange={(e) =>
                                setOrgFormData({ ...orgFormData, industry: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Şehir</Label>
                            <Input
                              value={orgFormData.city}
                              onChange={(e) =>
                                setOrgFormData({ ...orgFormData, city: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input
                              value={orgFormData.phone}
                              onChange={(e) =>
                                setOrgFormData({ ...orgFormData, phone: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Website</Label>
                            <Input
                              value={orgFormData.website}
                              onChange={(e) =>
                                setOrgFormData({ ...orgFormData, website: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleSaveOrganization}
                          disabled={saving}
                          className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Kaydediliyor...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Şirket Bilgilerini Kaydet
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* SECURITY TAB */}
              {currentTab === "security" && (
                <div className="space-y-6">
                  {/* Change Password */}
                  <div>
                    <h2 className="text-lg font-bold mb-4">🔐 Parola Değiştir</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Yeni Parola</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="En az 6 karakter"
                          />
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Parolayı Onayla</Label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Tekrar girin"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleChangePassword}
                      disabled={saving}
                      className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Güncelleniyor...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Parolayı Güncelle
                        </>
                      )}
                    </Button>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-4">💚 Güvenilir Cihazlar</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Bu cihazlardan giriş yaparken 2FA kodu sorulmaz
                    </p>

                    <div className="space-y-3">
                      {trustedDevices.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Henüz güvenilir cihaz yok
                        </p>
                      ) : (
                        trustedDevices.map((device) => (
                          <Card key={device.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getDeviceIcon(device.device_type)}
                                <div>
                                  <p className="font-semibold">{device.device_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {device.ip_address} · Son kullanım:{" "}
                                    {new Date(device.last_used_at).toLocaleString("tr-TR")}
                                  </p>
                                  <p className="text-xs text-green-500 mt-1">
                                    ✓ Güvenilir · Süresi:{" "}
                                    {new Date(device.expires_at).toLocaleDateString("tr-TR")}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm("Bu cihazı güvenilir listesinden çıkar?")) {
                                    const success = await untrustDevice(device.id);
                                    if (success) {
                                      setTrustedDevices((prev) => prev.filter((d) => d.id !== device.id));
                                      toast.success("✅ Cihaz kaldırıldı");
                                    }
                                  }
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* 2FA */}
                  <div>
                    <h2 className="text-lg font-bold mb-4">📱 İki Faktörlü Doğrulama</h2>
                    
                    <Card className="border-l-4 border-l-purple-500">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="h-5 w-5 text-purple-500" />
                              <p className="font-semibold text-foreground">
                                Google Authenticator ile 2FA
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              Hesabınızı ekstra bir güvenlik katmanı ile koruyun. 
                              Giriş yaparken Google Authenticator'dan alacağınız 6 haneli kodu girmeniz gerekecek.
                            </p>
                            
                            {/* Status Badge */}
                            {twoFactorEnabled ? (
                             <div className="mt-4 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast.info('Yedek kodlar özelliği yakında eklenecek');
                                }}
                                className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Yedek Kodları İndir
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleForceReset2FA}
                                disabled={saving}
                                className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                2FA'yı Sıfırla
                              </Button>
                            </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm font-semibold text-yellow-600">
                                    2FA Kapalı
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Hesabınız risk altında olabilir
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Switch */}
                          <div className="flex flex-col items-end gap-2">
                            <Switch
                              checked={twoFactorEnabled}
                              onCheckedChange={handleToggle2FA}
                              disabled={saving}
                              className="data-[state=checked]:bg-green-500"
                            />
                            <span className="text-xs text-muted-foreground">
                              {twoFactorEnabled ? 'Açık' : 'Kapalı'}
                            </span>
                          </div>
                        </div>

                        {/* Info Box */}
                        {!twoFactorEnabled && (
                          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <div className="flex gap-3">
                              <div className="shrink-0">
                                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <Shield className="h-4 w-4 text-blue-500" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground mb-1">
                                  Neden 2FA kullanmalısınız?
                                </p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  <li>• Hesabınız çalınsa bile güvende kalırsınız</li>
                                  <li>• Şifreniz ele geçse bile giriş yapılamaz</li>
                                  <li>• Google Authenticator tamamen ücretsizdir</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Already Enabled - Options */}
                        {twoFactorEnabled && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Show backup codes modal
                                toast.info('Yedek kodlar özelliği yakında eklenecek');
                              }}
                              className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Yedek Kodları İndir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Re-setup 2FA
                                handleToggle2FA(false);
                                setTimeout(() => handleToggle2FA(true), 500);
                              }}
                              disabled={saving}
                              className="text-purple-500 border-purple-500/30 hover:bg-purple-500/10"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Yeniden Kurulum
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* How to Use Guide */}
                    {!twoFactorEnabled && (
                      <Card className="mt-4 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
                        <CardContent className="p-4">
                          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <span>📱</span>
                            Google Authenticator Kurulumu
                          </p>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex gap-2">
                              <span className="font-bold text-purple-500">1.</span>
                              <p>
                                Google Authenticator uygulamasını telefonunuza indirin 
                                <a 
                                  href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline ml-1"
                                >
                                  (Android)
                                </a>
                                <a 
                                  href="https://apps.apple.com/app/google-authenticator/id388497605" 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline ml-1"
                                >
                                  (iOS)
                                </a>
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-bold text-purple-500">2.</span>
                              <p>Yukarıdaki switch'i açın ve QR kodu tarayın</p>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-bold text-purple-500">3.</span>
                              <p>Uygulamadan aldığınız 6 haneli kodu girin</p>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-bold text-purple-500">4.</span>
                              <p>Tamamlandı! Artık giriş yaparken kod istenecek</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="h-px bg-border" />
                  {/* Active Sessions */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">🔗 Aktif Oturumlar</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const nonCurrentSessions = sessions.filter((s) => !s.is_current);
                          
                          if (nonCurrentSessions.length === 0) {
                            toast.info('Kapatılacak başka oturum yok');
                            return;
                          }

                          const confirmed = confirm(
                            `${nonCurrentSessions.length} oturum kapatılacak. Devam edilsin mi?`
                          );

                          if (!confirmed) return;

                          setSaving(true);
                          let successCount = 0;

                          for (const session of nonCurrentSessions) {
                            const success = await terminateSession(session.id);
                            if (success) successCount++;
                          }

                          setSessions((prev) => prev.filter((s) => s.is_current));

                          toast.success(
                            `✅ ${successCount} oturum kapatıldı`,
                            {
                              description: `${nonCurrentSessions.length - successCount} oturum kapatılamadı`,
                            }
                          );

                          setSaving(false);
                          fetchSettingsData(); // Refresh
                        }}
                        disabled={saving || sessions.filter((s) => !s.is_current).length === 0}
                        className="text-destructive"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Diğerlerini Kapat ({sessions.filter((s) => !s.is_current).length})
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Aktif oturum bulunamadı
                        </p>
                      ) : (
                        sessions.map((session) => (
                          <Card key={session.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getDeviceIcon(session.device_type)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold">
                                      {session.device_name}
                                    </p>
                                    {session.is_current && (
                                      <Badge variant="secondary">Bu Cihaz</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {session.ip_address} ·{" "}
                                    {new Date(session.last_activity).toLocaleString("tr-TR")}
                                  </p>
                                </div>
                              </div>
                              {!session.is_current && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTerminateSession(session.id)}
                                  className="text-destructive"
                                >
                                  <LogOut className="h-4 w-4" />
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BILLING TAB */}
              {currentTab === "billing" && (
                <div className="space-y-6">
                  {/* Current Plan */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold">
                            {plan === 'expert' ? 'Uzman Paketi' : 'Ücretsiz Paket'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {status === 'trial'
                              ? `Deneme sürümü · ${daysLeftInTrial} gün kaldı`
                              : status === 'premium'
                              ? 'Premium üyelik aktif'
                              : 'Temel özellikler'}
                          </p>
                          {plan === 'expert' && (
                            <p className="text-2xl font-bold mt-2">₺499.99/ay</p>
                          )}
                        </div>
                        <Button
                          onClick={() => setShowUpgradeModal(true)}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          {plan === 'expert' ? 'Planı Yönet' : 'Yükselt'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Billing History */}
                  <div>
                    <h2 className="text-lg font-bold mb-4">📋 Fatura Geçmişi</h2>
                    <div className="space-y-3">
                      {billingHistory.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground">
                              Henüz fatura geçmişiniz yok
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        billingHistory.map((bill) => (
                          <Card key={bill.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{bill.plan_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(bill.billing_date).toLocaleDateString("tr-TR")} ·{" "}
                                  {bill.currency} {bill.amount}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    bill.status === "paid" ? "default" : "secondary"
                                  }
                                >
                                  {bill.status === "paid" ? "Ödendi" : "Bekliyor"}
                                </Badge>
                                {bill.invoice_url && (
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {currentTab === "notifications" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold mb-4">🔔 Bildirim Tercihleri</h2>
                  {Object.entries(notifications).map(([key, value]) => (
                    <Card key={key}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {key === "emailNotifications" && "📧 E-posta Bildirimleri"}
                            {key === "capaAlerts" && "⚠️ CAPA Uyarıları"}
                            {key === "riskAlerts" && "🔴 Risk Uyarıları"}
                            {key === "weeklyReport" && "📊 Haftalık Rapor"}
                            {key === "systemUpdates" && "🔄 Sistem Güncellemeleri"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {key === "emailNotifications" &&
                              "Yeni denetim raporları için"}
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
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    onClick={handleSaveNotifications}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Bildirimleri Kaydet
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ✅ DANGER ZONE */}
        <Card className="border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">⚠️ Tehlikeli İşlemler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleDownloadData}
                variant="outline"
                className="justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Verilerinizi İndir
              </Button>
              <Button
                onClick={handleDeleteAccount}
                variant="outline"
                className="justify-start text-destructive border-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hesabı Sil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/profile")}>
            Geri Dön
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>
      </div>

      {/* ✅ UPGRADE MODAL */}
        {/* ✅ UPGRADE MODAL */}
    <UpgradeModal
      open={showUpgradeModal}
      onOpenChange={setShowUpgradeModal}
      triggeredBy="manual"
    />
   {/* ✅ 2FA SETUP MODAL */}
    {qrCodeData && show2FASetupModal && currentFactorId && (
      <TwoFactorSetupModal
        open={show2FASetupModal}
        onOpenChange={setShow2FASetupModal}
        factorId={currentFactorId} // ✅ YENİ PROP
        qrCodeUri={qrCodeData.uri}
        secret={qrCodeData.secret}
        onSuccess={() => {
          console.log('✅ 2FA verification successful');
          setTwoFactorEnabled(true);
          setQRCodeData(null);
          setCurrentFactorId(null); // ✅ Temizle
          fetchSettingsData();
        }}
      />
    )}
    </>
  );
}