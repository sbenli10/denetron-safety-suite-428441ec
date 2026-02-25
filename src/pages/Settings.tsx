import { useState } from "react";
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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const activeSessions = [
  {
    id: 1,
    device: "Chrome / Windows",
    icon: Monitor,
    ip: "192.168.1.42",
    lastActivity: "Şu anda aktif",
    current: true,
  },
  {
    id: 2,
    device: "Safari / macOS",
    icon: Laptop,
    ip: "10.0.0.15",
    lastActivity: "2 saat önce",
    current: false,
  },
  {
    id: 3,
    device: "Chrome / Android",
    icon: Smartphone,
    ip: "172.16.0.8",
    lastActivity: "1 gün önce",
    current: false,
  },
];

const trustedDevices = [
  { id: 1, name: "Windows PC - Chrome", status: "güvenilir", addedAt: "15 Şub 2026" },
  { id: 2, name: "MacBook Pro - Safari", status: "güvenilir", addedAt: "10 Şub 2026" },
  { id: 3, name: "Android Telefon", status: "beklemede", addedAt: "24 Şub 2026" },
];

export default function Settings() {
  const [phoneVerification, setPhoneVerification] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hesap ve uygulama tercihlerinizi yönetin
        </p>
      </div>

      <div className="glass-card p-1">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none px-4 gap-1">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-secondary data-[state=active]:text-foreground rounded-md"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Genel
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-secondary data-[state=active]:text-foreground rounded-md"
            >
              <Shield className="h-4 w-4 mr-2" />
              Güvenlik
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="data-[state=active]:bg-secondary data-[state=active]:text-foreground rounded-md"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Faturalama
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="data-[state=active]:bg-secondary data-[state=active]:text-foreground rounded-md"
            >
              <Puzzle className="h-4 w-4 mr-2" />
              Entegrasyonlar
            </TabsTrigger>
          </TabsList>

          {/* Genel */}
          <TabsContent value="general" className="p-6 space-y-6">
            <Card className="bg-secondary/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Profil Bilgileri</CardTitle>
                <CardDescription>Hesap bilgilerinizi güncelleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ad Soyad</Label>
                    <Input placeholder="Adınızı girin" className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-posta</Label>
                    <Input placeholder="ornek@sirket.com" className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Şirket</Label>
                    <Input placeholder="Şirket adı" className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input placeholder="+90 5XX XXX XX XX" className="bg-background/50" />
                  </div>
                </div>
                <Button className="mt-2">Kaydet</Button>
              </CardContent>
            </Card>

            <Card className="bg-secondary/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Bildirim Tercihleri</CardTitle>
                <CardDescription>Hangi bildirimleri almak istediğinizi seçin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">E-posta Bildirimleri</p>
                    <p className="text-xs text-muted-foreground">Yeni denetim raporları için</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">CAPA Uyarıları</p>
                    <p className="text-xs text-muted-foreground">Yüksek riskli bulgular için</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Güvenlik */}
          <TabsContent value="security" className="p-6 space-y-6">
            {/* Phone verification card */}
            <Card className="bg-secondary/50 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
                      <Smartphone className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Giriş Güvenliği (Telefonla Onay)</CardTitle>
                      <CardDescription>
                        Her girişte telefonunuza doğrulama kodu gönderilir
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant={phoneVerification ? "outline" : "default"}
                    className={
                      phoneVerification
                        ? "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }
                    onClick={() => setPhoneVerification(!phoneVerification)}
                  >
                    {phoneVerification ? "Devre Dışı Bırak" : "Etkinleştir"}
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Active sessions */}
            <Card className="bg-secondary/50 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Aktif Oturumlar</CardTitle>
                    <CardDescription>
                      Hesabınıza bağlı olan tüm oturumlar
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    Diğerlerini Kapat
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <session.icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {session.device}
                          {session.current && (
                            <Badge variant="outline" className="ml-2 text-[10px] border-primary/40 text-primary">
                              Bu cihaz
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.ip} · {session.lastActivity}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                        <LogOut className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Trusted devices */}
            <Card className="bg-secondary/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Cihazlar</CardTitle>
                <CardDescription>Güvenilir olarak işaretlenen cihazlarınız</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {trustedDevices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{device.name}</p>
                        <p className="text-xs text-muted-foreground">Eklendi: {device.addedAt}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        device.status === "güvenilir"
                          ? "border-success/40 text-success"
                          : "border-warning/40 text-warning"
                      }
                    >
                      {device.status === "güvenilir" ? "Güvenilir" : "Beklemede"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Faturalama */}
          <TabsContent value="billing" className="p-6 space-y-6">
            <Card className="bg-secondary/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Mevcut Plan</CardTitle>
                <CardDescription>Abonelik bilgileriniz</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pro Plan</p>
                    <p className="text-xs text-muted-foreground">Aylık · Sonraki fatura: 1 Mar 2026</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Planı Değiştir
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entegrasyonlar */}
          <TabsContent value="integrations" className="p-6 space-y-6">
            <Card className="bg-secondary/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Bağlı Servisler</CardTitle>
                <CardDescription>Üçüncü parti entegrasyonları yönetin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Google Workspace</p>
                    <p className="text-xs text-muted-foreground">Takvim ve e-posta senkronizasyonu</p>
                  </div>
                  <Button variant="outline" size="sm">Bağla</Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Slack</p>
                    <p className="text-xs text-muted-foreground">Bildirim kanalı entegrasyonu</p>
                  </div>
                  <Button variant="outline" size="sm">Bağla</Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Microsoft Teams</p>
                    <p className="text-xs text-muted-foreground">Ekip bildirimleri</p>
                  </div>
                  <Button variant="outline" size="sm">Bağla</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
