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

  // âœ… State tanÄ±mlamalarÄ± (en Ã¼stte)
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
    
    // âœ… Session'Ä± sadece ilk render'da kaydet
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
      console.log("ðŸ“Š Fetching settings data...");

      // âœ… FETCH PROFILE
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

      // âœ… FETCH ORGANIZATION
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

      // âœ… FETCH SESSIONS (with type casting)
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

      // âœ… FETCH BILLING HISTORY (with type casting)
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

      // âœ… FETCH NOTIFICATION PREFERENCES (from localStorage)
      const savedNotifications = localStorage.getItem("userNotifications");
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }

      console.log("âœ… Settings data loaded");
      toast.success("âœ… Ayarlar yÃ¼klendi");
    } catch (err: any) {
      console.error("âŒ Settings error:", err);
      toast.error("Ayarlar yÃ¼klenemedi", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // âœ… SAVE PROFILE
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

      toast.success("âœ… Profil bilgileri kaydedildi", {
        description: "DeÄŸiÅŸiklikler baÅŸarÄ±yla uygulandÄ±",
      });
    } catch (err: any) {
      console.error("Profile save error:", err);
      toast.error("KayÄ±t baÅŸarÄ±sÄ±z", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // âœ… SAVE ORGANIZATION
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

      toast.success("âœ… Åžirket bilgileri kaydedildi", {
        description: "Organizasyon ayarlarÄ± gÃ¼ncellendi",
      });
    } catch (err: any) {
      console.error("Organization save error:", err);
      toast.error("KayÄ±t baÅŸarÄ±sÄ±z", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // âœ… CHANGE PASSWORD
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("âŒ LÃ¼tfen parolalarÄ± girin");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("âŒ Parolalar eÅŸleÅŸmiyor");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("âŒ Parola en az 6 karakter olmalÄ±dÄ±r");
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
      toast.success("âœ… Parola baÅŸarÄ±yla gÃ¼ncellendi", {
        description: "Yeni parolanÄ±zla giriÅŸ yapabilirsiniz",
      });
    } catch (err: any) {
      console.error("Password change error:", err);
      toast.error("âŒ Parola gÃ¼ncellenemedi", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

// âœ… TOGGLE 2FA - GERÃ‡EK SUPABASE MFA (FINAL - WORKING VERSION)
const handleToggle2FA = async (enabled: boolean) => {
  if (!user) return;

  setSaving(true);
  try {
    if (enabled) {
      // âœ… 1. TÃ¼m factor'leri kontrol et
      const { data: existingFactors, error: listError } = await supabase.auth.mfa.listFactors();
      
      if (listError) {
        console.error('âŒ List factors error:', listError);
        throw listError;
      }

      console.log('ðŸ“‹ Existing factors:', existingFactors);
      console.log('ðŸ“‹ ALL factors:', existingFactors?.all);

      // âœ… 2. Verified TOTP factor varsa, kullanÄ±cÄ±ya bilgi ver
      if (existingFactors && existingFactors.all && existingFactors.all.length > 0) {
        const verifiedTotpFactors = existingFactors.all.filter(
          (factor: any) => 
            factor.factor_type === 'totp' && 
            factor.status === 'verified'
        );

        if (verifiedTotpFactors.length > 0) {
          console.log('âœ… Found verified TOTP factors:', verifiedTotpFactors.length);
          
          // Zaten aktif 2FA var
          await supabase
            .from('profiles')
            .update({
              two_factor_enabled: true,
              two_factor_method: 'totp',
            })
            .eq('id', user.id);

          setTwoFactorEnabled(true);
          
          toast.info('â„¹ï¸ 2FA zaten aktif', {
            description: 'Yeniden kurmak iÃ§in Ã¶nce kapatÄ±n',
          });
          
          setSaving(false);
          return;
        }

        // âœ… 3. Unverified factor'leri temizle
        const unverifiedFactors = existingFactors.all.filter(
          (factor: any) => factor.status !== 'verified'
        );

        if (unverifiedFactors.length > 0) {
          console.log('ðŸ—‘ï¸ Cleaning unverified factors:', unverifiedFactors.length);
          
          for (const factor of unverifiedFactors) {
            try {
              console.log('ðŸ—‘ï¸ Removing unverified factor:', factor.id);
              await supabase.auth.mfa.unenroll({ factorId: factor.id });
              console.log('âœ… Factor removed:', factor.id);
            } catch (unenrollErr: any) {
              console.error('âš ï¸ Failed to remove factor:', factor.id, unenrollErr);
            }
          }
          
          // Supabase'in sync olmasÄ± iÃ§in bekle
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // âœ… 4. Yeni TOTP factor oluÅŸtur
      console.log('âž• Creating new TOTP factor...');
      
      // Unique friendly name (timestamp + random)
      const uniqueFriendlyName = `DENETRON-${user.email?.split('@')[0] || 'User'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('ðŸ“ Friendly name:', uniqueFriendlyName);

      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: uniqueFriendlyName,
      });

      if (enrollError) {
        console.error('âŒ Enroll error:', enrollError);
        throw enrollError;
      }

      if (enrollData && enrollData.totp) {
        console.log('âœ… TOTP factor created:', enrollData);
        console.log('ðŸ”‘ Factor ID:', enrollData.id); // âœ… Ã–NEMLÄ°
        
        // âœ… Factor ID'yi kaydet
        setCurrentFactorId(enrollData.id);
        
        // QR Code verilerini sakla
        const qrData = {
          qr_code: enrollData.totp.qr_code,
          secret: enrollData.totp.secret,
          uri: enrollData.totp.uri,
        };
        
        console.log('ðŸ’¾ Setting QR data:', qrData);
        console.log('ðŸ’¾ Setting Factor ID:', enrollData.id);
        
        setQRCodeData(qrData);
        setShow2FASetupModal(true);

        toast.info('ðŸ“± 2FA Kurulumu BaÅŸlatÄ±ldÄ±', {
          description: 'Google Authenticator ile QR kodu tarayÄ±n',
          duration: 5000,
        });
      } else {
        throw new Error('TOTP data bulunamadÄ±');
      }
    } else {
      // âœ… DISABLE 2FA - TÃœM FACTOR'LERÄ° SÄ°L
      console.log('ðŸ”´ Disabling 2FA...');
      
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      
      if (listError) {
        console.error('âŒ List factors error:', listError);
        throw listError;
      }
      
      console.log('ðŸ“‹ Factors to remove:', factors?.all?.length || 0);

      // ALL array'inden tÃ¼m factor'leri sil
      if (factors && factors.all && factors.all.length > 0) {
        for (const factor of factors.all) {
          try {
            console.log('ðŸ—‘ï¸ Removing factor:', factor.id, factor.friendly_name);
            
            await supabase.auth.mfa.unenroll({
              factorId: factor.id,
            });
            
            console.log('âœ… Factor removed:', factor.id);
          } catch (unenrollErr: any) {
            console.error('âš ï¸ Failed to remove factor:', factor.id, unenrollErr);
            // Devam et, diÄŸer factor'leri de dene
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
      
      toast.success('âœ… Ä°ki faktÃ¶rlÃ¼ doÄŸrulama kapatÄ±ldÄ±', {
        description: 'TÃ¼m 2FA ayarlarÄ± temizlendi',
      });
    }
  } catch (err: any) {
    console.error('âŒ 2FA toggle error:', err);
    
    let errorMessage = 'Ä°ÅŸlem baÅŸarÄ±sÄ±z';
    let errorDescription = err.message || 'Bilinmeyen hata';

    // Specific error messages
    if (err.message?.includes('already exists')) {
      errorMessage = '2FA Ã§akÄ±ÅŸmasÄ± tespit edildi';
      errorDescription = 'LÃ¼tfen "2FA\'yÄ± SÄ±fÄ±rla" butonunu kullanÄ±n veya sayfayÄ± yenileyin';
    } else if (err.message?.includes('not found')) {
      errorMessage = 'Factor bulunamadÄ±';
      errorDescription = 'SayfayÄ± yenileyip tekrar deneyin';
    } else if (err.message?.includes('TOTP data')) {
      errorMessage = 'QR kod oluÅŸturulamadÄ±';
      errorDescription = 'LÃ¼tfen sayfayÄ± yenileyip tekrar deneyin';
    }

    toast.error(`âŒ ${errorMessage}`, {
      description: errorDescription,
      duration: 5000,
    });
  } finally {
    setSaving(false);
  }
};

// âœ… Force Reset 2FA
const handleForceReset2FA = async () => {
  if (!user) return;
  
  if (!confirm('âš ï¸ Mevcut 2FA ayarlarÄ±nÄ±z silinecek. Devam edilsin mi?')) {
    return;
  }

  setSaving(true);
  try {
    console.log('ðŸ”„ Force resetting 2FA...');
    
    // Get all factors
    const { data: factors } = await supabase.auth.mfa.listFactors();
    
    // Remove ALL factors (even unverified)
    if (factors && factors.all) {
      for (const factor of factors.all) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
          console.log('âœ… Removed factor:', factor.id);
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
    
    toast.success('âœ… 2FA tamamen sÄ±fÄ±rlandÄ±', {
      description: 'Åžimdi yeniden kurulum yapabilirsiniz',
    });
    
    // Refresh page
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err: any) {
    console.error('Force reset error:', err);
    toast.error('âŒ SÄ±fÄ±rlama baÅŸarÄ±sÄ±z');
  } finally {
    setSaving(false);
  }
};
  // âœ… TERMINATE SESSION
  const handleTerminateSession = async (sessionId: string) => {
    const success = await terminateSession(sessionId);

    if (success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("âœ… Oturum sonlandÄ±rÄ±ldÄ±", {
        description: "Cihaz baÄŸlantÄ±sÄ± kesildi",
      });
    } else {
      toast.error("âŒ Oturum sonlandÄ±rÄ±lamadÄ±");
    }
  };

  // âœ… FORCE CLEAN - TÃ¼m factor'leri temizle (Debug iÃ§in)
const handleForceCleanFactors = async () => {
  if (!user) return;
  
  const confirmed = confirm(
    'âš ï¸ UYARI: TÃ¼m 2FA ayarlarÄ±nÄ±z silinecek!\n\n' +
    'Bu iÅŸlem:\n' +
    'â€¢ TÃ¼m factor\'leri siler\n' +
    'â€¢ 2FA\'yÄ± tamamen devre dÄ±ÅŸÄ± bÄ±rakÄ±r\n' +
    'â€¢ SayfayÄ± yeniler\n\n' +
    'Devam etmek istiyor musunuz?'
  );
  
  if (!confirmed) return;

  setSaving(true);
  try {
    console.log('ðŸ”¥ FORCE CLEANING ALL FACTORS...');
    
    // List all factors
    const { data: factors } = await supabase.auth.mfa.listFactors();
    
    console.log('ðŸ“‹ Total factors found:', factors?.all?.length || 0);

    if (factors && factors.all) {
      console.log('ðŸ—‘ï¸ Deleting factors:', factors.all.map((f: any) => ({
        id: f.id,
        name: f.friendly_name,
        type: f.factor_type,
        status: f.status,
      })));

      // Delete each factor
      for (const factor of factors.all) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
          console.log('âœ… Deleted:', factor.id);
        } catch (err) {
          console.error('âŒ Failed to delete:', factor.id, err);
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

    toast.success('âœ… TÃ¼m 2FA ayarlarÄ± temizlendi', {
      description: 'Sayfa yenileniyor...',
    });

    // Reload page
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err: any) {
    console.error('âŒ Force clean error:', err);
    toast.error('âŒ Temizleme baÅŸarÄ±sÄ±z', {
      description: err.message,
    });
  } finally {
    setSaving(false);
  }
};

  // âœ… SAVE NOTIFICATIONS
  const handleSaveNotifications = () => {
    localStorage.setItem("userNotifications", JSON.stringify(notifications));
    toast.success("âœ… Bildirim tercihleri kaydedildi");
  };

  // âœ… LOGOUT
  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  // âœ… DOWNLOAD DATA
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

    toast.success("âœ… Veriler indirildi", {
      description: "JSON dosyasÄ± bilgisayarÄ±nÄ±za kaydedildi",
    });
  };

  // âœ… DELETE ACCOUNT
  const handleDeleteAccount = () => {
    if (
      confirm(
        "âš ï¸ HesabÄ±nÄ±zÄ± kalÄ±cÄ± olarak silmek istediÄŸinizden emin misiniz?\n\nBu iÅŸlem GERÄ° ALINAMAZ!"
      )
    ) {
      toast.error("ðŸ—‘ï¸ Hesap silme talebi alÄ±ndÄ±", {
        description: "Destek ekibimiz en kÄ±sa sÃ¼rede sizinle iletiÅŸime geÃ§ecek",
        duration: 8000,
      });
    }
  };

  const tabs = [
    { id: "general" as const, label: "Genel", icon: <SettingsIcon className="h-4 w-4" /> },
    { id: "security" as const, label: "GÃ¼venlik", icon: <Shield className="h-4 w-4" /> },
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-80 animate-pulse rounded bg-slate-900" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-900" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="h-64 animate-pulse rounded-xl border border-slate-800 bg-slate-900/70" />
            <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-900/70" />
          </div>
          <div className="space-y-6">
            <div className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900/70" />
            <div className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900/70" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 space-y-6">
        {/* âœ… HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-blue-500" />
              Ayarlar
            </h1>
            <p className="text-muted-foreground mt-1">
              Hesap, gÃ¼venlik ve tercihlerinizi yÃ¶netin
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/profile")}>
            Geri DÃ¶n
          </Button>
        </div>

        {/* âœ… SUBSCRIPTION STATUS BANNER */}
        {status === 'trial' && !isTrialExpired && (
          <Card className="border-l-4 border-l-yellow-500 bg-yellow-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-semibold text-foreground">
                    Deneme SÃ¼rÃ¼mÃ¼ Aktif
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {daysLeftInTrial} gÃ¼n kaldÄ± Â· TÃ¼m premium Ã¶zellikler aÃ§Ä±k
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Crown className="h-4 w-4 mr-2" />
                YÃ¼kselt
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
                    Deneme SÃ¼resi Sona Erdi
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Devam etmek iÃ§in bir paket seÃ§in
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                Paketi SeÃ§
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
                    Premium Ãœyelik Aktif
                  </p>
                  <p className="text-sm text-muted-foreground">
                    TÃ¼m Ã¶zelliklere sÄ±nÄ±rsÄ±z eriÅŸim
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

        {/* âœ… TABS */}
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

            {/* âœ… TAB CONTENT */}
            <div className="mt-6">
              {/* GENERAL TAB */}
              {currentTab === "general" && (
                <div className="space-y-6">
                  {/* Profile Section */}
                  <div>
                    <h2 className="text-lg font-bold mb-4">ðŸ‘¤ Profil Bilgileri</h2>
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
                          placeholder="Ä°SG UzmanÄ±"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Departman</Label>
                        <Input
                          value={formData.department}
                          onChange={(e) =>
                            setFormData({ ...formData, department: e.target.value })
                          }
                          placeholder="Ä°SG DepartmanÄ±"
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
                        <h2 className="text-lg font-bold mb-4">ðŸ¢ Åžirket Bilgileri</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Åžirket AdÄ±</Label>
                            <Input
                              value={orgFormData.name}
                              onChange={(e) =>
                                setOrgFormData({ ...orgFormData, name: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>SektÃ¶r</Label>
                            <Input
                              value={orgFormData.industry}
                              onChange={(e) =>
                                setOrgFormData({ ...orgFormData, industry: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Åžehir</Label>
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
                              Åžirket Bilgilerini Kaydet
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
                    <h2 className="text-lg font-bold mb-4">ðŸ” Parola DeÄŸiÅŸtir</h2>
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
                        <Label>ParolayÄ± Onayla</Label>
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
                          GÃ¼ncelleniyor...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          ParolayÄ± GÃ¼ncelle
                        </>
                      )}
                    </Button>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-4">ðŸ’š GÃ¼venilir Cihazlar</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Bu cihazlardan giriÅŸ yaparken 2FA kodu sorulmaz
                    </p>

                    <div className="space-y-3">
                      {trustedDevices.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          HenÃ¼z gÃ¼venilir cihaz yok
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
                                    {device.ip_address} Â· Son kullanÄ±m:{" "}
                                    {new Date(device.last_used_at).toLocaleString("tr-TR")}
                                  </p>
                                  <p className="text-xs text-green-500 mt-1">
                                    âœ“ GÃ¼venilir Â· SÃ¼resi:{" "}
                                    {new Date(device.expires_at).toLocaleDateString("tr-TR")}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm("Bu cihazÄ± gÃ¼venilir listesinden Ã§Ä±kar?")) {
                                    const success = await untrustDevice(device.id);
                                    if (success) {
                                      setTrustedDevices((prev) => prev.filter((d) => d.id !== device.id));
                                      toast.success("âœ… Cihaz kaldÄ±rÄ±ldÄ±");
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
                    <h2 className="text-lg font-bold mb-4">ðŸ“± Ä°ki FaktÃ¶rlÃ¼ DoÄŸrulama</h2>
                    
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
                              HesabÄ±nÄ±zÄ± ekstra bir gÃ¼venlik katmanÄ± ile koruyun. 
                              GiriÅŸ yaparken Google Authenticator'dan alacaÄŸÄ±nÄ±z 6 haneli kodu girmeniz gerekecek.
                            </p>
                            
                            {/* Status Badge */}
                            {twoFactorEnabled ? (
                             <div className="mt-4 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast.info('Yedek kodlar Ã¶zelliÄŸi yakÄ±nda eklenecek');
                                }}
                                className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Yedek KodlarÄ± Ä°ndir
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleForceReset2FA}
                                disabled={saving}
                                className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                2FA'yÄ± SÄ±fÄ±rla
                              </Button>
                            </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm font-semibold text-yellow-600">
                                    2FA KapalÄ±
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  HesabÄ±nÄ±z risk altÄ±nda olabilir
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
                              {twoFactorEnabled ? 'AÃ§Ä±k' : 'KapalÄ±'}
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
                                  Neden 2FA kullanmalÄ±sÄ±nÄ±z?
                                </p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  <li>â€¢ HesabÄ±nÄ±z Ã§alÄ±nsa bile gÃ¼vende kalÄ±rsÄ±nÄ±z</li>
                                  <li>â€¢ Åžifreniz ele geÃ§se bile giriÅŸ yapÄ±lamaz</li>
                                  <li>â€¢ Google Authenticator tamamen Ã¼cretsizdir</li>
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
                                toast.info('Yedek kodlar Ã¶zelliÄŸi yakÄ±nda eklenecek');
                              }}
                              className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Yedek KodlarÄ± Ä°ndir
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
                            <span>ðŸ“±</span>
                            Google Authenticator Kurulumu
                          </p>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex gap-2">
                              <span className="font-bold text-purple-500">1.</span>
                              <p>
                                Google Authenticator uygulamasÄ±nÄ± telefonunuza indirin 
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
                              <p>YukarÄ±daki switch'i aÃ§Ä±n ve QR kodu tarayÄ±n</p>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-bold text-purple-500">3.</span>
                              <p>Uygulamadan aldÄ±ÄŸÄ±nÄ±z 6 haneli kodu girin</p>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-bold text-purple-500">4.</span>
                              <p>TamamlandÄ±! ArtÄ±k giriÅŸ yaparken kod istenecek</p>
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
                      <h2 className="text-lg font-bold">ðŸ”— Aktif Oturumlar</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const nonCurrentSessions = sessions.filter((s) => !s.is_current);
                          
                          if (nonCurrentSessions.length === 0) {
                            toast.info('KapatÄ±lacak baÅŸka oturum yok');
                            return;
                          }

                          const confirmed = confirm(
                            `${nonCurrentSessions.length} oturum kapatÄ±lacak. Devam edilsin mi?`
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
                            `âœ… ${successCount} oturum kapatÄ±ldÄ±`,
                            {
                              description: `${nonCurrentSessions.length - successCount} oturum kapatÄ±lamadÄ±`,
                            }
                          );

                          setSaving(false);
                          fetchSettingsData(); // Refresh
                        }}
                        disabled={saving || sessions.filter((s) => !s.is_current).length === 0}
                        className="text-destructive"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        DiÄŸerlerini Kapat ({sessions.filter((s) => !s.is_current).length})
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Aktif oturum bulunamadÄ±
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
                                    {session.ip_address} Â·{" "}
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
                            {plan === 'expert' ? 'Uzman Paketi' : 'Ãœcretsiz Paket'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {status === 'trial'
                              ? `Deneme sÃ¼rÃ¼mÃ¼ Â· ${daysLeftInTrial} gÃ¼n kaldÄ±`
                              : status === 'premium'
                              ? 'Premium Ã¼yelik aktif'
                              : 'Temel Ã¶zellikler'}
                          </p>
                          {plan === 'expert' && (
                            <p className="text-2xl font-bold mt-2">â‚º499.99/ay</p>
                          )}
                        </div>
                        <Button
                          onClick={() => setShowUpgradeModal(true)}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          {plan === 'expert' ? 'PlanÄ± YÃ¶net' : 'YÃ¼kselt'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Billing History */}
                  <div>
                    <h2 className="text-lg font-bold mb-4">ðŸ“‹ Fatura GeÃ§miÅŸi</h2>
                    <div className="space-y-3">
                      {billingHistory.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground">
                              HenÃ¼z fatura geÃ§miÅŸiniz yok
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
                                  {new Date(bill.billing_date).toLocaleDateString("tr-TR")} Â·{" "}
                                  {bill.currency} {bill.amount}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    bill.status === "paid" ? "default" : "secondary"
                                  }
                                >
                                  {bill.status === "paid" ? "Ã–dendi" : "Bekliyor"}
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
                  <h2 className="text-lg font-bold mb-4">ðŸ”” Bildirim Tercihleri</h2>
                  {Object.entries(notifications).map(([key, value]) => (
                    <Card key={key}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {key === "emailNotifications" && "ðŸ“§ E-posta Bildirimleri"}
                            {key === "capaAlerts" && "âš ï¸ CAPA UyarÄ±larÄ±"}
                            {key === "riskAlerts" && "ðŸ”´ Risk UyarÄ±larÄ±"}
                            {key === "weeklyReport" && "ðŸ“Š HaftalÄ±k Rapor"}
                            {key === "systemUpdates" && "ðŸ”„ Sistem GÃ¼ncellemeleri"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {key === "emailNotifications" &&
                              "Yeni denetim raporlarÄ± iÃ§in"}
                            {key === "capaAlerts" && "YÃ¼ksek riskli bulgular iÃ§in"}
                            {key === "riskAlerts" && "Kritik risk tespitleri iÃ§in"}
                            {key === "weeklyReport" && "HaftalÄ±k Ã¶zet raporu"}
                            {key === "systemUpdates" && "Uygulama gÃ¼ncellemeleri"}
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

        {/* âœ… DANGER ZONE */}
        <Card className="border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">âš ï¸ Tehlikeli Ä°ÅŸlemler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleDownloadData}
                variant="outline"
                className="justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Verilerinizi Ä°ndir
              </Button>
              <Button
                onClick={handleDeleteAccount}
                variant="outline"
                className="justify-start text-destructive border-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                HesabÄ± Sil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/profile")}>
            Geri DÃ¶n
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Ã‡Ä±kÄ±ÅŸ Yap
          </Button>
        </div>
      </div>

      {/* âœ… UPGRADE MODAL */}
        {/* âœ… UPGRADE MODAL */}
    <UpgradeModal
      open={showUpgradeModal}
      onOpenChange={setShowUpgradeModal}
      triggeredBy="manual"
    />
   {/* âœ… 2FA SETUP MODAL */}
    {qrCodeData && show2FASetupModal && currentFactorId && (
      <TwoFactorSetupModal
        open={show2FASetupModal}
        onOpenChange={setShow2FASetupModal}
        factorId={currentFactorId} // âœ… YENÄ° PROP
        qrCodeUri={qrCodeData.uri}
        secret={qrCodeData.secret}
        onSuccess={() => {
          console.log('âœ… 2FA verification successful');
          setTwoFactorEnabled(true);
          setQRCodeData(null);
          setCurrentFactorId(null); // âœ… Temizle
          fetchSettingsData();
        }}
      />
    )}
    </>
  );
}
