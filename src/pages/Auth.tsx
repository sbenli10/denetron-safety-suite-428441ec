import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Building2,
  Mail,
  Lock,
  User,
  ArrowRight,
  RefreshCw,
  Clock,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuthMode = "login" | "register" | "verify" | "wait";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    passwordConfirm: "",
    fullName: "",
    orgName: "",
  });

  const [verifyEmail, setVerifyEmail] = useState("");

  // ✅ Check if user already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  // ✅ Email confirmation URL'den token çek
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const hash = window.location.hash;
      if (hash.includes("type=signup")) {
        setMode("verify");
        // Otomatik doğrula
        const { error } = await supabase.auth.verifyOtp({
          type: "signup",
          token: hash.split("token=")[1],
          email: formData.email,
        });

        if (!error) {
          toast.success("✅ E-posta doğrulandı! Giriş yapılıyor...");
          setTimeout(() => navigate("/"), 2000);
        }
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

  // ✅ Form input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Validation helpers
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  // ✅ Login Handler
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

    setIsSubmitting(true);

    try {
      // 1️⃣ Auth login
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("E-posta veya şifre yanlış");
        }
        if (authError.message.includes("Email not confirmed")) {
          setMode("wait");
          setVerifyEmail(formData.email);
          toast.info("📧 E-postanız henüz doğrulanmamış. Lütfen e-postanızdaki linke tıklayın.");
          return;
        }
        throw new Error(authError.message);
      }

      if (!authData?.user?.id) {
        throw new Error("Giriş başarısız");
      }

      // 2️⃣ Verify profile exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, organization_id, role")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("Kullanıcı profili bulunamadı. Lütfen kayıt olun.");
      }

      // 3️⃣ Update last login
      await supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", authData.user.id);

      toast.success("✅ Giriş başarılı!");
      navigate("/");
    } catch (error: any) {
      toast.error(`❌ ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName.trim()) {
      toast.error("❌ Ad-soyad gerekli");
      return;
    }
    if (!validateEmail(formData.email)) {
      toast.error("❌ Geçerli bir e-posta adresi girin");
      return;
    }
    if (!validatePassword(formData.password)) {
      toast.error("❌ Şifre en az 8 karakter olmalıdır");
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

    setIsSubmitting(true);
    let organizationId: string | null = null;
    let userId: string | null = null;

    try {
      // 1️⃣ Create organization
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
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (orgError) {
        throw new Error(`Organizasyon oluşturulamadı: ${orgError.message}`);
      }

      organizationId = orgData.id;
      toast.info("✓ Organizasyon oluşturuldu");

      // 2️⃣ Create auth user (EMAIL CONFIRMATION GÖNDERILECEK)
      const { data: authData, error: authError } = await supabase.auth.signUp(
        {
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName.trim(),
            },
            // Email confirmation otomatik gönderilir
          },
        }
      );

      if (authError) {
        // Cleanup: Delete organization
        await supabase
          .from("organizations")
          .delete()
          .eq("id", organizationId);

        throw new Error(`Auth hatası: ${authError.message}`);
      }

      if (!authData?.user?.id) {
        // Cleanup: Delete organization
        await supabase
          .from("organizations")
          .delete()
          .eq("id", organizationId);

        throw new Error("Kullanıcı ID alınamadı");
      }

      userId = authData.user.id;
      toast.info("✓ Hesap oluşturuldu");

      // 3️⃣ Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          organization_id: organizationId,
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (profileError) {
        // Cleanup: Delete organization
        await supabase
          .from("organizations")
          .delete()
          .eq("id", organizationId);

        throw new Error(`Profil kaydı başarısız: ${profileError.message}`);
      }

      // 4️⃣ Show verification screen
      setVerifyEmail(formData.email);
      setMode("wait");

      toast.success("✅ Kayıt başarılı! E-postanızı kontrol edin.");
    } catch (error: any) {
      toast.error(error.message || "❌ Kayıt başarısız");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Resend confirmation email
    const handleResendEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: verifyEmail,
      });

      if (error) throw error;

      setResendCountdown(60);
      toast.success("✅ Doğrulama e-postası yeniden gönderildi");
    } catch (error: any) {
      toast.error(`❌ ${error.message}`);
    }
  };

  const fillDemoCredentials = () => {
    setFormData((prev) => ({
      ...prev,
      email: "demo@denetron.com",
      password: "demo123456",
    }));
    setMode("login");
    toast.info("✓ Demo bilgileri dolduruldu");
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* 🎨 Header */}
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary mx-auto shadow-lg shadow-primary/20">
            <Shield className="h-8 w-8 text-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              DENETRON
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              🛡️ AI Destekli İSG Yönetim Sistemi
            </p>
          </div>
        </div>

        {/* 📋 Auth Card */}
        <div className="glass-card p-8 space-y-6 border border-primary/20 shadow-xl">
          {/* LOGIN MODU */}
          {mode === "login" && (
            <>
              {/* Tab Buttons */}
              <div className="flex gap-2 bg-secondary/50 p-1.5 rounded-lg">
                <button
                  onClick={() => {
                    setMode("login");
                    setFormData({
                      email: "",
                      password: "",
                      passwordConfirm: "",
                      fullName: "",
                      orgName: "",
                    });
                  }}
                  className="flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all bg-primary text-primary-foreground shadow-lg"
                >
                  🔑 Giriş Yap
                </button>
                <button
                  onClick={() => {
                    setMode("register");
                    setFormData({
                      email: "",
                      password: "",
                      passwordConfirm: "",
                      fullName: "",
                      orgName: "",
                    });
                  }}
                  className="flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all text-muted-foreground hover:text-foreground"
                >
                  📝 Kayıt Ol
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">
                    Hesabınıza Giriş Yapın
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    E-posta ve şifrenizle devam edin
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    E-posta Adresi
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="ornek@sirket.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="bg-secondary/50 border-border/50 h-11"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    Şifre
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="bg-secondary/50 border-border/50 h-11 pr-11"
                      disabled={isSubmitting}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-2">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-600 leading-relaxed">
                    E-postanız henüz doğrulanmamışsa, giriş yapamayacaksınız. Lütfen e-postanızda gelen doğrulama linkine tıklayın.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 gap-2 gradient-primary border-0 text-foreground font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Giriş yapılıyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Giriş Yap
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">veya</span>
                </div>
              </div>

              {/* Demo Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={fillDemoCredentials}
                disabled={isSubmitting}
              >
                👥 Demo Hesabı Kullan
              </Button>
            </>
          )}

          {/* REGISTER MODU */}
          {mode === "register" && (
            <>
              {/* Tab Buttons */}
              <div className="flex gap-2 bg-secondary/50 p-1.5 rounded-lg">
                <button
                  onClick={() => {
                    setMode("login");
                    setFormData({
                      email: "",
                      password: "",
                      passwordConfirm: "",
                      fullName: "",
                      orgName: "",
                    });
                  }}
                  className="flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all text-muted-foreground hover:text-foreground"
                >
                  🔑 Giriş Yap
                </button>
                <button
                  onClick={() => {
                    setMode("register");
                    setFormData({
                      email: "",
                      password: "",
                      passwordConfirm: "",
                      fullName: "",
                      orgName: "",
                    });
                  }}
                  className="flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all bg-primary text-primary-foreground shadow-lg"
                >
                  📝 Kayıt Ol
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleRegister} className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">
                    Yeni Hesap Oluşturun
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    İSG Yönetim Sisteminizi başlatın
                  </p>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Ad-Soyad
                  </Label>
                  <Input
                    type="text"
                    name="fullName"
                    placeholder="Ahmet Yılmaz"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="bg-secondary/50 border-border/50 h-10 text-sm"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    E-posta Adresi
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="ahmet@sirket.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="bg-secondary/50 border-border/50 h-10 text-sm"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {/* Organization */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Şirket/Organizasyon Adı
                  </Label>
                  <Input
                    type="text"
                    name="orgName"
                    placeholder="ABC İnşaat Ltd. Şti."
                    value={formData.orgName}
                    onChange={handleInputChange}
                    className="bg-secondary/50 border-border/50 h-10 text-sm"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    Şifre (min. 8 karakter)
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="bg-secondary/50 border-border/50 h-10 pr-10 text-sm"
                      disabled={isSubmitting}
                      required
                    />
                    <button
                      type="button"
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

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    Şifreyi Onayla
                  </Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="passwordConfirm"
                    placeholder="••••••••"
                    value={formData.passwordConfirm}
                    onChange={handleInputChange}
                    className="bg-secondary/50 border-border/50 h-10 text-sm"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 gap-2 gradient-primary border-0 text-foreground font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Hesap Oluştur
                    </>
                  )}
                </Button>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-2">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Kayıt olduktan sonra e-postanıza bir doğrulama linki gönderilecek. Hesabı aktifleştirmek için lütfen linke tıklayın.
                  </p>
                </div>
              </form>
            </>
          )}

          {/* E-POSTA DOĞRULAMA BEKLEME MODU */}
          {mode === "wait" && (
            <div className="space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
              </div>

              {/* Message */}
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  E-postanızı Kontrol Edin
                </h2>
                <p className="text-sm text-muted-foreground">
                  <strong>{verifyEmail}</strong> adresine bir doğrulama e-postası gönderdik.
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-3 bg-secondary/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      E-postanızı açın
                    </p>
                    <p className="text-xs text-muted-foreground">
                      DENETRON'dan gelen e-postayı bulun
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Doğrulama linkine tıklayın
                    </p>
                    <p className="text-xs text-muted-foreground">
                      "E-postanızı doğrulayın" butonuna tıklayın
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Giriş yapın
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Doğrulama tamamlandıktan sonra giriş yapabileceksiniz
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Box */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex gap-2">
                <Clock className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-600 leading-relaxed">
                  E-posta birkaç dakika içinde ulaşmalıdır. Spam klasörünü de kontrol edin.
                </p>
              </div>

              {/* Resend Button */}
              <Button
                onClick={handleResendEmail}
                disabled={resendCountdown > 0}
                variant="outline"
                className="w-full h-11 gap-2"
              >
                {resendCountdown > 0 ? (
                  <>
                    <Clock className="h-4 w-4" />
                    E-postayı yeniden gönder ({resendCountdown}s)
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    E-postayı Yeniden Gönder
                  </>
                )}
              </Button>

              {/* Back to Login */}
              <Button
                onClick={() => setMode("login")}
                variant="ghost"
                className="w-full h-11"
              >
                ← Giriş Sayfasına Dön
              </Button>
            </div>
          )}
        </div>

        {/* 📱 Footer */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            © 2026 Denetron. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <Shield className="h-3 w-3" />
            <span>Güvenli ve Şifreli Bağlantı</span>
          </div>
        </div>
      </div>
    </div>
  );
}