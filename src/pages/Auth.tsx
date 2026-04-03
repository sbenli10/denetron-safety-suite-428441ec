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
import { fetchDashboardSnapshot, writeDashboardSnapshot } from "@/lib/dashboardCache";
import { startNamedFlow } from "@/lib/perfTiming";
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

type OrgSlugStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [orgSlugStatus, setOrgSlugStatus] = useState<OrgSlugStatus>("idle");
  const [orgSlugMessage, setOrgSlugMessage] = useState("Organizasyon adı yazıldığında sistem bir kurum kimliği oluşturur.");

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
        navigate("/auth/callback", { replace: true });
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

  const buildOrgSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const getFriendlyAuthError = (error: unknown, context: "login" | "register" | "bootstrap" | "resend" | "google") => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : "Beklenmeyen bir hata oluştu";
    const lower = message.toLowerCase();

    if (context === "login") {
      if (lower.includes("invalid login credentials")) return "Bu e-posta veya şifre hatalı.";
      if (lower.includes("email not confirmed")) return "E-posta adresiniz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.";
    }

    if (context === "register") {
      if (lower.includes("already registered") || lower.includes("already exists")) {
        return "Bu e-posta ile zaten hesap var, giriş yapın.";
      }
      if (lower.includes("password")) {
        return "Şifre kuralları sağlanmadı. En az 8 karakterli güçlü bir şifre girin.";
      }
    }

    if (context === "bootstrap") {
      if (lower.includes("profile is already linked to an organization")) {
        return "Bu kullanıcı zaten bir organizasyona bağlı. Yeni kayıt yerine giriş yapın.";
      }
      if (lower.includes("organization slug is required")) {
        return "Organizasyon adı geçersiz. Lütfen farklı bir şirket adı deneyin.";
      }
      if ((lower.includes("duplicate key") || lower.includes("unique")) && lower.includes("slug")) {
        return "Bu organizasyon adı zaten kullanılıyor. Lütfen farklı bir şirket adı yazın.";
      }
      if (lower.includes("auth user not found")) {
        return "Hesap oluşturuldu fakat organizasyon bağlanamadı. Lütfen tekrar deneyin.";
      }
    }

    if (context === "resend" && lower.includes("email rate limit")) {
      return "Çok sık deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.";
    }

    if (context === "google") {
      return "Google ile giriş başlatılamadı. Tarayıcı engeli veya oturum problemi olabilir.";
    }

    return message;
  };

  const registerPasswordChecks = [
    { label: "En az 8 karakter", ready: formData.password.length >= 8 },
    { label: "Şifre tekrarı eşleşmeli", ready: Boolean(formData.password && formData.password === formData.passwordConfirm) },
    { label: "Geçerli e-posta adresi", ready: validateEmail(formData.email) },
  ];

  const orgSlugPreview = buildOrgSlug(formData.orgName);

  useEffect(() => {
    const orgName = formData.orgName.trim();

    if (!orgName) {
      setOrgSlugStatus("idle");
      setOrgSlugMessage("Organizasyon adı yazıldığında sistem bir kurum kimliği oluşturur.");
      return;
    }

    if (!orgSlugPreview || orgSlugPreview.length < 3) {
      setOrgSlugStatus("invalid");
      setOrgSlugMessage("Organizasyon adı en az 3 karakterlik geçerli bir kurum bağlantısı üretmelidir.");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setOrgSlugStatus("checking");
      setOrgSlugMessage(`"${orgSlugPreview}" uygun mu kontrol ediliyor...`);

      const { data, error } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", orgSlugPreview)
        .limit(1);

      if (cancelled) return;

      if (error) {
        setOrgSlugStatus("error");
        setOrgSlugMessage("Organizasyon adı şu anda doğrulanamadı. Yine de kayıt sırasında tekrar kontrol edilecektir.");
        return;
      }

      if ((data?.length ?? 0) > 0) {
        setOrgSlugStatus("taken");
        setOrgSlugMessage(`"${orgSlugPreview}" zaten kullanılıyor. Lütfen farklı bir organizasyon adı deneyin.`);
        return;
      }

      setOrgSlugStatus("available");
      setOrgSlugMessage(`"${orgSlugPreview}" kullanılabilir görünüyor. Bu adla kurumsal alan açılacak.`);
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [formData.orgName, orgSlugPreview]);

  const prefetchInitialData = async (userId: string) => {
    try {
      const snapshot = await fetchDashboardSnapshot(userId);
      writeDashboardSnapshot(userId, snapshot);
    } catch (error) {
      console.warn("Initial dashboard prefetch skipped:", error);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isExtension = urlParams.get("ext") === "true";
      const redirectTo = isExtension
        ? `${window.location.origin}/auth/callback?ext=true`
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      toast.error("Google ile giriş başlatılamadı", {
        description: getFriendlyAuthError(error, "google"),
      });
      setLoading(false);
    }
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
    startNamedFlow("login", {
      method: "password",
      email: formData.email,
    });
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
      const loginMessage = getFriendlyAuthError(authError, "login");
      if (loginMessage.includes("doğrulanmamış")) {
        setMode("wait");
        setVerifyEmail(formData.email);
        toast.info("📧 E-postanızı doğrulayın");
        return;
      }
      throw new Error(loginMessage);
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

        await prefetchInitialData(authData.user.id);

        // ✅ Check extension redirect
        if (isExtension) {
          navigate('/auth/callback?ext=true');
        } else {
          navigate('/auth/callback');
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

      await prefetchInitialData(authData.user.id);

      toast.success("✅ Giriş başarılı!");
      
      // ✅ Check extension redirect
      if (isExtension) {
        navigate('/auth/callback?ext=true');
      } else {
        navigate('/auth/callback');
      }
    }
  } catch (error: any) {
    console.error("❌ Login error:", error);
    toast.error("Giriş başarısız", {
      description: getFriendlyAuthError(error, "login"),
    });
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

      await prefetchInitialData(data.user.id);
    }

    toast.success("✅ Giriş başarılı!");
    
    // ✅ Check extension redirect
    if (isExtension) {
      navigate('/auth/callback?ext=true');
    } else {
      navigate('/auth/callback');
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

  const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();

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

  if (!orgSlugPreview || orgSlugStatus === "invalid") {
    toast.error("❌ Organizasyon adı geçersiz", {
      description: "Lütfen en az 3 karakterlik, daha açık bir şirket adı yazın.",
    });
    return;
  }

  if (orgSlugStatus === "checking") {
    toast.info("Organizasyon adı kontrol ediliyor", {
      description: "Lütfen bir saniye bekleyin ve tekrar deneyin.",
    });
    return;
  }

  if (orgSlugStatus === "taken") {
    toast.error("❌ Bu organizasyon adı kullanılıyor", {
      description: "Farklı bir şirket adı yazarak tekrar deneyin.",
    });
    return;
  }

  setLoading(true);

  try {
    const orgSlug = buildOrgSlug(formData.orgName);

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
      throw new Error(getFriendlyAuthError(authError, "register"));
    }

    if (!authData?.user?.id) {
      throw new Error("Kullanıcı oluşturulamadı");
    }

    if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
      throw new Error("Bu e-posta ile zaten hesap var, giriş yapın.");
    }

    const { error: bootstrapError } = await supabase.rpc(
      "bootstrap_signup_organization",
      {
        p_user_id: authData.user.id,
        p_full_name: formData.fullName.trim(),
        p_email: formData.email.trim(),
        p_org_name: formData.orgName.trim(),
        p_org_slug: orgSlug,
        p_country: "Türkiye",
      },
    );

    if (bootstrapError) {
      throw new Error(getFriendlyAuthError(bootstrapError, "bootstrap"));
    }

    setVerifyEmail(formData.email);
    setMode("wait");

    toast.success("✅ Kayıt başarılı!", {
      description: "E-postanızı kontrol edin",
    });
  } catch (error: any) {
    console.error("❌ Register error:", error);
    toast.error("Kayıt tamamlanamadı", {
      description: getFriendlyAuthError(error, "register"),
    });
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
      toast.error("E-posta yeniden gönderilemedi", {
        description: getFriendlyAuthError(error, "resend"),
      });
  }
  };

  // ==================== RENDER ====================

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_32%),linear-gradient(160deg,#020617_0%,#0f172a_46%,#111827_100%)] p-4">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute left-[-10%] top-12 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-6%] top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-[-8%] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[1100px]">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/90 backdrop-blur">
                <Shield className="h-3.5 w-3.5 text-cyan-300" />
                Kurumsal İSG Operasyon Merkezi
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl font-black tracking-tight text-white">
                  İSGVİZYON
                </h1>
                <p className="max-w-lg text-base leading-8 text-slate-300">
                  Denetim, DÖF, rapor ve kurumsal takip süreçlerini tek merkezden yönetin.
                  Daha hızlı kayıt alın, daha profesyonel çıktılar üretin, ekip akışını kaybetmeyin.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Operasyon</p>
                  <p className="mt-2 text-lg font-semibold text-white">Denetim + DÖF</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Saha kaydından rapora giden çekirdek akış.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Çıktı</p>
                  <p className="mt-2 text-lg font-semibold text-white">Word Raporları</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Kurumsal görünümde arşivlenebilir ve paylaşılabilir belgeler.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Hafıza</p>
                  <p className="mt-2 text-lg font-semibold text-white">Geçmiş Kayıtlar</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Benzer kayıtları ve tekrar eden riskleri görünür hale getirir.</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-cyan-400/15 bg-cyan-400/8 p-5 backdrop-blur">
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Güvenli erişim katmanı</h2>
                <div className="mt-4 grid gap-3 text-sm text-slate-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Şüpheli cihazlarda ek doğrulama ve oturum kontrolü
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Organizasyon tabanlı çok kullanıcılı yapı
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Denetim ve rapor akışları için kurumsal kayıt merkezi
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md justify-self-center space-y-6">
            <div className="text-center space-y-3 lg:hidden">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-xl shadow-blue-950/60">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">İSGVİZYON</h1>
                <p className="mt-1 text-sm text-slate-400">AI Destekli İSG Yönetim Sistemi</p>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl">
                    {/* LOGIN */}
          {mode === "login" && (
            <>
              <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg mb-6">
                <button
                  onClick={() => setMode("login")}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-950/30"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => setMode("register")}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-400 transition hover:text-white"
                >
                  Kayıt Ol
                </button>
              </div>

              <div className="mb-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/12 to-cyan-500/12 p-4">
                <h3 className="text-white font-semibold text-base">Güvenli Giriş</h3>
                <p className="text-slate-300 text-sm mt-1">
                  Hesabınıza güvenli şekilde erişin. Şüpheli cihazlarda ek doğrulama otomatik devreye girer.
                </p>
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
                    placeholder="ornek@firma.com"
                    className="h-12 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
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
                      className="h-12 rounded-2xl border-white/10 bg-white/5 pr-10 text-white placeholder:text-slate-500"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
                  <span>2FA aktif hesaplarda ekstra doğrulama uygulanır.</span>
                  <Shield className="h-4 w-4 text-emerald-400" />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span className="bg-slate-900 px-3">veya</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void handleGoogleLogin()}
                  className="h-12 w-full rounded-2xl border-white/10 bg-slate-950/70 text-white hover:bg-slate-800 hover:text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Yönlendiriliyor...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-2 h-4 w-4"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fill="#4285F4"
                          d="M21.6 12.23c0-.68-.06-1.34-.18-1.97H12v3.73h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.98-4.34 2.98-7.28Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.23-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.08v2.58A9.98 9.98 0 0 0 12 22Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M6.41 13.9A5.98 5.98 0 0 1 6.1 12c0-.66.11-1.3.31-1.9V7.52H3.08A9.98 9.98 0 0 0 2 12c0 1.61.39 3.13 1.08 4.48l3.33-2.58Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.98c1.47 0 2.8.5 3.84 1.5l2.88-2.88C16.95 2.98 14.69 2 12 2 8.09 2 4.73 4.24 3.08 7.52l3.33 2.58C7.2 7.74 9.4 5.98 12 5.98Z"
                        />
                      </svg>
                      Google ile giriş yap
                    </>
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
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-400 transition hover:text-white"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => setMode("register")}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-950/30"
                >
                  Kayıt Ol
                </button>
              </div>

              <div className="mb-4 rounded-2xl border border-blue-500/25 bg-gradient-to-r from-blue-500/12 to-purple-500/12 p-4">
                <h3 className="text-white font-semibold text-base">Yeni Hesap Oluştur</h3>
                <p className="text-slate-300 text-sm mt-1">
                  Kurumsal hesabını oluştur, ekip üyelerini ekle ve tüm İSG süreçlerini tek panelden yönet.
                </p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
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
                    placeholder="Örn: Ahmet Yılmaz"
                    className="h-12 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    Şirket / Organizasyon
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      name="orgName"
                      value={formData.orgName}
                      onChange={handleInputChange}
                      placeholder="Örn: İSGVizyon OSGB"
                      className="h-12 rounded-2xl border-white/10 bg-white/5 pr-28 text-white placeholder:text-slate-500"
                      disabled={loading}
                      required
                    />
                    {formData.orgName.trim() ? (
                      <span
                        className={`pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          orgSlugStatus === "available"
                            ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                            : orgSlugStatus === "taken"
                            ? "border border-amber-500/30 bg-amber-500/15 text-amber-200"
                            : orgSlugStatus === "checking"
                            ? "border border-blue-500/30 bg-blue-500/15 text-blue-200"
                            : orgSlugStatus === "invalid"
                            ? "border border-amber-500/30 bg-amber-500/15 text-amber-200"
                            : orgSlugStatus === "error"
                            ? "border border-rose-500/30 bg-rose-500/15 text-rose-200"
                            : "border border-white/10 bg-white/10 text-slate-300"
                        }`}
                      >
                        {orgSlugStatus === "checking" ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Kontrol
                          </>
                        ) : orgSlugStatus === "available" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Uygun
                          </>
                        ) : orgSlugStatus === "taken" ? (
                          "Dolu"
                        ) : orgSlugStatus === "invalid" ? (
                          "Geçersiz"
                        ) : orgSlugStatus === "error" ? (
                          "Belirsiz"
                        ) : (
                          "Taslak"
                        )}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                      orgSlugStatus === "available"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : orgSlugStatus === "taken" || orgSlugStatus === "invalid"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        : orgSlugStatus === "error"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {orgSlugPreview
                          ? `Oluşacak organizasyon bağlantısı: ${orgSlugPreview}`
                          : "Organizasyon adı yazıldığında sistem bir kurum kimliği oluşturur."}
                      </span>
                      <span className="shrink-0">
                        {orgSlugStatus === "checking" ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : orgSlugStatus === "available" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Info className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] leading-relaxed">
                      {orgSlugMessage}
                    </div>
                  </div>
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
                    placeholder="ornek@firma.com"
                    className="h-12 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white flex items-center gap-2">
                      <Lock className="h-4 w-4 text-blue-400" />
                      Şifre (min. 8 karakter)
                    </Label>
                    <Input
                      type={showRegisterPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="h-12 rounded-2xl border-white/10 bg-white/5 text-white"
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
                      type={showRegisterPassword ? "text" : "password"}
                      name="passwordConfirm"
                      value={formData.passwordConfirm}
                      onChange={handleInputChange}
                      className="h-12 rounded-2xl border-white/10 bg-white/5 text-white"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-register-password"
                    checked={showRegisterPassword}
                    onCheckedChange={(checked) => setShowRegisterPassword(Boolean(checked))}
                  />
                  <Label htmlFor="show-register-password" className="text-sm text-slate-200 cursor-pointer">
                    Şifreyi göster
                  </Label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {registerPasswordChecks.map((check) => (
                      <span
                        key={check.label}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${check.ready ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}
                      >
                        {check.label}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kayıt ediliyor...
                    </>
                  ) : (
                    "Hesabı Oluştur"
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
          © 2026 İSGVizyon. Tüm hakları saklıdır.
        </p>
      </div>
        </div>
      </div>
    </div>
  );
}
