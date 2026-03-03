// ====================================================
// İSG BOT CHROME EXTENSION KURULUM REHBERİ
// ====================================================

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Chrome,
  Download,
  Settings,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function ISGBotSetup() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Panoya kopyalandı");
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Chrome className="h-8 w-8 text-primary" />
          İSG Bot Chrome Extension Kurulumu
        </h1>
        <p className="text-muted-foreground">
          İSG-KATİP ile entegrasyon için Chrome uzantısını kurun ve yapılandırın
        </p>
      </div>

      {/* Requirements */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Gereksinimler:</strong> Chrome veya Edge tarayıcısı, Developer
          mode aktif, İSG-KATİP hesabı
        </AlertDescription>
      </Alert>

      {/* Step 1: Download */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge>1</Badge>
                Extension'ı İndir
              </CardTitle>
              <CardDescription>Chrome extension dosyasını bilgisayarınıza indirin</CardDescription>
            </div>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              İndir (chrome-extension.zip)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-mono">📦 chrome-extension.zip</p>
            <p className="text-xs text-muted-foreground mt-1">
              Boyut: ~2.5 MB • Versiyon: 1.0.0
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">İndirdikten sonra:</p>
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              <li>ZIP dosyasını çıkarın (Extract)</li>
              <li>
                <code>chrome-extension</code> klasörünü masaüstüne taşıyın
              </li>
              <li>Klasörü taşımayın veya silmeyin (extension aktif kalmalı)</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Install */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge>2</Badge>
            Chrome'a Yükle
          </CardTitle>
          <CardDescription>
            Developer mode ile extension'ı Chrome'a ekleyin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Adım 2.1: Extensions Sayfası</p>
                <p className="text-sm text-muted-foreground">
                  Chrome'da <code className="bg-muted px-1 rounded">chrome://extensions/</code>{" "}
                  adresine gidin
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="px-0"
                  onClick={() => copyToClipboard("chrome://extensions/")}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Adresi Kopyala
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Adım 2.2: Developer Mode</p>
                <p className="text-sm text-muted-foreground">
                  Sağ üstteki <strong>"Developer mode"</strong> düğmesini aktif edin
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Adım 2.3: Load Unpacked</p>
                <p className="text-sm text-muted-foreground">
                  <strong>"Load unpacked"</strong> butonuna tıklayın ve{" "}
                  <code className="bg-muted px-1 rounded">chrome-extension</code>{" "}
                  klasörünü seçin
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Adım 2.4: Doğrulama</p>
                <p className="text-sm text-muted-foreground">
                  "Denetron İSG Bot" extension'ı listede görünmeli
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
                <strong>Not:</strong> Extension yüklenirken hata alırsanız, manifest.json
                dosyasının mevcut olduğundan emin olun.
            </AlertDescription>
            </Alert>
        </CardContent>
      </Card>

      {/* Step 3: Configure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge>3</Badge>
            Ayarları Yapın
          </CardTitle>
          <CardDescription>
            Supabase ve organizasyon bilgilerinizi girin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Extension'ı Açın</p>
                <p className="text-sm text-muted-foreground">
                  Chrome toolbar'da Denetron ikonuna tıklayın → Settings
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <Label className="text-xs font-semibold">Supabase URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                    https://your-project.supabase.co
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard("https://your-project.supabase.co")
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Supabase Anon Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate">
                    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  </code>
                  <Button size="sm" variant="ghost">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Organization ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                    Profil → Settings → Organization ID
                  </code>
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Güvenlik:</strong> Bu bilgiler sadece tarayıcınızda saklanır.
                Supabase Row Level Security (RLS) ile korunur.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge>4</Badge>
            Test Edin
          </CardTitle>
          <CardDescription>İSG-KATİP'te extension'ı deneyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold">İSG-KATİP'e Gidin</p>
                <p className="text-sm text-muted-foreground">
                  <a
                    href="https://isgkatip.csgb.gov.tr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    isgkatip.csgb.gov.tr
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  adresine gidin ve giriş yapın
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Extension'ı Açın</p>
                <p className="text-sm text-muted-foreground">
                  Denetron ikonuna tıklayın → İstatistikleri görmeli
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Senkronize Edin</p>
                <p className="text-sm text-muted-foreground">
                  "Hemen Senkronize Et" butonuna tıklayın → Veriler Denetron'a aktarılacak
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Dashboard'ı Kontrol Edin</p>
                <p className="text-sm text-muted-foreground">
                  Denetron → İSG Bot → Dashboard'da firmalar görünmeli
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button size="lg">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Kurulum Tamamlandı, Dashboard'a Git
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Sorun Giderme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <details className="border rounded-lg p-3">
            <summary className="font-semibold cursor-pointer">
              Extension yüklenmiyor
            </summary>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              <p>• manifest.json dosyasının klasörde olduğundan emin olun</p>
              <p>• Chrome'u yeniden başlatın</p>
              <p>• Developer mode'un aktif olduğunu kontrol edin</p>
            </div>
          </details>

          <details className="border rounded-lg p-3">
            <summary className="font-semibold cursor-pointer">
              Senkronizasyon çalışmıyor
            </summary>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              <p>• Supabase URL ve Anon Key'i kontrol edin</p>
              <p>• Organization ID'nin doğru olduğundan emin olun</p>
              <p>• Browser console'da hata mesajlarını kontrol edin (F12)</p>
            </div>
          </details>

          <details className="border rounded-lg p-3">
            <summary className="font-semibold cursor-pointer">
              Dashboard'da veri görünmüyor
            </summary>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              <p>• Edge Functions'ların deploy olduğunu kontrol edin</p>
              <p>• Database migration'ların çalıştığını kontrol edin</p>
              <p>• RLS policy'lerinin doğru olduğunu kontrol edin</p>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

// Label component (eğer yoksa)
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}