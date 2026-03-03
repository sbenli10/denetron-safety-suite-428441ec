//src\pages\Auth.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Shield,
  Building2,
  Mail,
  Lock,
  User,
  Info,
  Clock,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isDeviceTrusted, trustCurrentDevice } from "@/utils/deviceFingerprint";

type AuthMode = "login" | "register" | "wait" | "mfa";

interface FormData {
  email: string;
  password: string;
  passwordConfirm: string;
  fullName: string;
  orgName: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    passwordConfirm: "",
    fullName: "",
    orgName: "",
  });

  const [verifyEmail, setVerifyEmail] = useState("");

  // ✅ 2FA States
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [trustDevice, setTrustDevice] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // ✅ Check if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  // ✅ Email confirmation handler
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const hash = window.location.hash;
      if (hash.includes("type=signup")) {
        toast.info("📧 E-posta doğrulanıyor...");
        // Supabase otomatik handle eder, sadece yönlendir
        setTimeout(() => {
          toast.success("✅ E-posta doğrulandı! Giriş yapabilirsiniz.");
          setMode("login");
          window.location.hash = ""; // Clear hash
        }, 2000);
      }
    };
    handleEmailConfirmation();
  }, []);

  // ✅ Resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // ✅ Form handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Validation
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

 // ✅ LOGIN HANDLER
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateEmail(formData.email)) {
    toast.error("❌ Geçerli bir e-posta adresi girin");
    return;
  }

  if (!formData.password) {
    toast.error("❌ Şifre gerekli");
    return;
  }

  setLoading(true);

  try {
    console.log("🔐 Signing in...");

    // Check if this is extension callback
    const urlParams = new URLSearchParams(window.location.search);
    const isExtension = urlParams.get('ext') === 'true';

    // 1. Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        throw new Error("E-posta veya şifre hatalı");
      }
      if (authError.message.includes("Email not confirmed")) {
        setMode("wait");
        setVerifyEmail(formData.email);
        toast.info("📧 E-postanızı doğrulayın");
        return;
      }
      throw new Error(authError.message);
    }

    if (!authData?.user?.id) {
      throw new Error("Giriş başarısız");
    }

    console.log("✅ Auth successful, checking 2FA...");

    // 2. Check if user has 2FA enabled
    const { data: factors } = await supabase.auth.mfa.listFactors();

    if (factors && factors.totp && factors.totp.length > 0) {
      const totpFactor = factors.totp[0];

      // 3. Check if device is trusted
      const deviceTrusted = await isDeviceTrusted(authData.user.id);

      if (deviceTrusted) {
        console.log("💚 Device trusted, skipping 2FA");
        toast.success("✅ Giriş başarılı!", {
          description: "Güvenilir cihaz",
        });

        // Update last login
        await supabase
          .from("profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", authData.user.id);

        // ✅ Check extension redirect
        if (isExtension) {
          navigate('/auth/callback?ext=true');
        } else {
          navigate('/');
        }
        return;
      }

      // 4. Device not trusted, require 2FA
      console.log("🔐 Device not trusted, creating challenge...");

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) throw challengeError;

      console.log("✅ Challenge created");

      setFactorId(totpFactor.id);
      setChallengeId(challengeData.id);
      setPendingUserId(authData.user.id);
      setMode("mfa");

      toast.info("🔐 2FA Kodu Gerekli", {
        description: "Yeni cihaz tespit edildi",
      });
    } else {
      // No 2FA, direct login
      console.log("✅ No 2FA, redirecting...");

      await supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", authData.user.id);

      toast.success("✅ Giriş başarılı!");
      
      // ✅ Check extension redirect
      if (isExtension) {
        navigate('/auth/callback?ext=true');
      } else {
        navigate('/');
      }
    }
  } catch (error: any) {
    console.error("❌ Login error:", error);
    toast.error(`❌ ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  // ✅ VERIFY 2FA
  // ✅ VERIFY 2FA
const handleVerify2FA = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!mfaCode || mfaCode.length !== 6) {
    toast.error("❌ 6 haneli kod girin");
    return;
  }

  if (!factorId || !challengeId) {
    toast.error("❌ 2FA verisi eksik");
    return;
  }

  setLoading(true);

  try {
    console.log("🔐 Verifying 2FA...");

    // Check if this is extension callback
    const urlParams = new URLSearchParams(window.location.search);
    const isExtension = urlParams.get('ext') === 'true';

    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: mfaCode,
    });

    if (error) throw error;

    console.log("✅ 2FA verified");

    // Trust device if checked
    if (trustDevice && pendingUserId) {
      console.log("💚 Trusting device...");
      await trustCurrentDevice(pendingUserId);
      toast.success("✅ Cihaz güvenilir olarak işaretlendi");
    }

    // Update last login
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }

    toast.success("✅ Giriş başarılı!");
    
    // ✅ Check extension redirect
    if (isExtension) {
      navigate('/auth/callback?ext=true');
    } else {
      navigate('/');
    }
  } catch (error: any) {
    console.error("❌ 2FA error:", error);

    let errorMessage = "Doğrulama başarısız";
    if (error.message?.includes("Invalid code")) {
      errorMessage = "Geçersiz kod";
    } else if (error.message?.includes("expired")) {
      errorMessage = "Kod süresi doldu";
    }

    toast.error(`❌ ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};

  // ✅ REGISTER HANDLER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName.trim()) {
      toast.error("❌ Ad-soyad gerekli");
      return;
    }
    if (!validateEmail(formData.email)) {
      toast.error("❌ Geçerli e-posta girin");
      return;
    }
    if (!validatePassword(formData.password)) {
      toast.error("❌ Şifre en az 8 karakter olmalı");
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      toast.error("❌ Şifreler eşleşmiyor");
      return;
    }
    if (!formData.orgName.trim()) {
      toast.error("❌ Organizasyon adı gerekli");
      return;
    }

    setLoading(true);
    let organizationId: string | null = null;

    try {
      // 1. Create organization
      const orgSlug = formData.orgName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: formData.orgName.trim(),
          slug: orgSlug,
          country: "Türkiye",
        })
        .select("id")
        .single();

      if (orgError) throw new Error(`Organizasyon oluşturulamadı: ${orgError.message}`);

      organizationId = orgData.id;
      console.log("✅ Organization created:", organizationId);

      // 2. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
          },
        },
      });

      if (authError) {
        // Cleanup
        await supabase.from("organizations").delete().eq("id", organizationId);
        throw new Error(`Hesap oluşturulamadı: ${authError.message}`);
      }

      if (!authData?.user?.id) {
        await supabase.from("organizations").delete().eq("id", organizationId);
        throw new Error("Kullanıcı oluşturulamadı");
      }

      console.log("✅ User created:", authData.user.id);

      // 3. Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        organization_id: organizationId,
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        role: "admin",
        is_active: true,
      });

      if (profileError) {
        await supabase.from("organizations").delete().eq("id", organizationId);
        throw new Error(`Profil oluşturulamadı: ${profileError.message}`);
      }

      console.log("✅ Profile created");

      // 4. Show verification screen
      setVerifyEmail(formData.email);
      setMode("wait");

      toast.success("✅ Kayıt başarılı!", {
        description: "E-postanızı kontrol edin",
      });
    } catch (error: any) {
      console.error("❌ Register error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend email
  const handleResendEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: verifyEmail,
      });

      if (error) throw error;

      setResendCountdown(60);
      toast.success("✅ E-posta yeniden gönderildi");
    } catch (error: any) {
      toast.error(`❌ ${error.message}`);
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 mx-auto shadow-xl">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">DENETRON</h1>
            <p className="text-sm text-slate-400 mt-1">AI Destekli İSG Yönetim Sistemi</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6 shadow-2xl">
          {/* LOGIN */}
          {mode === "login" && (
            <>
              <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg mb-6">
                <button
                  onClick={() => setMode("login")}
                  className="flex-1 py-2 rounded-md font-medium text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => setMode("register")}
                  className="flex-1 py-2 rounded-md font-medium text-sm text-slate-400 hover:text-white"
                >
                  Kayıt Ol
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-400" />
                    E-posta
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="ornek@email.com"
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-400" />
                    Şifre
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="bg-slate-800 border-slate-700 text-white pr-10"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Giriş yapılıyor...
                    </>
                  ) : (
                    "Giriş Yap"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* REGISTER */}
          {mode === "register" && (
            <>
              <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg mb-6">
                <button
                  onClick={() => setMode("login")}
                  className="flex-1 py-2 rounded-md font-medium text-sm text-slate-400 hover:text-white"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => setMode("register")}
                  className="flex-1 py-2 rounded-md font-medium text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                >
                  Kayıt Ol
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400" />
                    Ad Soyad
                  </Label>
                  <Input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-400" />
                    E-posta
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    Şirket/Organizasyon
                  </Label>
                  <Input
                    type="text"
                    name="orgName"
                    value={formData.orgName}
                    onChange={handleInputChange}
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-400" />
                    Şifre (min. 8 karakter)
                  </Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-400" />
                    Şifre Tekrar
                  </Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="passwordConfirm"
                    value={formData.passwordConfirm}
                    onChange={handleInputChange}
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={loading}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kayıt ediliyor...
                    </>
                  ) : (
                    "Hesap Oluştur"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* MFA */}
          {mode === "mfa" && (
            <form onSubmit={handleVerify2FA} className="space-y-6">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">2FA Doğrulama</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Google Authenticator'dan kodu girin
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Doğrulama Kodu</Label>
                <Input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="text-center text-2xl tracking-widest font-mono bg-slate-800 border-slate-700 text-white"
                  maxLength={6}
                  autoFocus
                  disabled={loading}
                />
                <p className="text-xs text-slate-400 text-center">{mfaCode.length}/6</p>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-slate-800/50 rounded-lg">
                <Checkbox
                  id="trust"
                  checked={trustDevice}
                  onCheckedChange={(checked) => setTrustDevice(checked as boolean)}
                />
                <label htmlFor="trust" className="text-sm text-white cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Bu cihazı 30 gün güvenilir olarak işaretle
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Doğrulanıyor...
                    </>
                  ) : (
                    "Doğrula ve Giriş Yap"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setMode("login");
                    setMfaCode("");
                    setTrustDevice(false);
                  }}
                  className="w-full text-slate-400"
                >
                  Geri Dön
                </Button>
              </div>
            </form>
          )}

          {/* WAIT */}
          {mode === "wait" && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white">E-postanızı Kontrol Edin</h2>
                <p className="text-sm text-slate-400 mt-2">{verifyEmail}</p>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex gap-2">
                <Clock className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-400">
                  E-posta birkaç dakika içinde ulaşmalı. Spam klasörünü kontrol edin.
                </p>
              </div>

              <Button
                onClick={handleResendEmail}
                disabled={resendCountdown > 0}
                variant="outline"
                className="w-full"
              >
                {resendCountdown > 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    E-postayı yeniden gönder ({resendCountdown}s)
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    E-postayı Yeniden Gönder
                  </>
                )}
              </Button>

              <Button
                onClick={() => setMode("login")}
                variant="ghost"
                className="w-full text-slate-400"
              >
                ← Giriş Sayfasına Dön
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          © 2026 Denetron. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}