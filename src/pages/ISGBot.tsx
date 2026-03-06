// ====================================================
// İSG BOT ANA SAYFA - TAB YÖNETİMİ
// ====================================================

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ISGBotDashboard from "@/components/isg-bot/ISGBotDashboard";
import AuditReadiness from "@/components/isg-bot/AuditReadiness";
import ComplianceReport from "@/components/isg-bot/ComplianceReport";
import RiskAnalyzer from "@/components/isg-bot/RiskAnalyzer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  BarChart3,
  FileCheck,
  TrendingUp,
  Bot,
  Zap,
  Chrome,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ISGBot() {
  const handleDownloadExtension = () => {
    // Chrome extension download link
    window.open("/chrome-extension.zip", "_blank");
  };

  const handleOpenExtensionGuide = () => {
    // Extension setup guide
    window.open("/docs/isg-bot-setup", "_blank");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Akıllı İSG Operasyon Botu
          </h1>
          <p className="text-muted-foreground">
            İSG-KATİP entegrasyonu, compliance kontrolü ve risk analizi
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleOpenExtensionGuide} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Kurulum Rehberi
          </Button>
          <Button onClick={handleDownloadExtension}>
            <Chrome className="h-4 w-4 mr-2" />
            Chrome Extension İndir
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Chrome Extension kurulumu gerekli:</strong> İSG-KATİP ile
              entegrasyon için Chrome uzantısını yükleyin ve ayarları yapın.
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={handleOpenExtensionGuide}
            >
              Nasıl Kurulur? →
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <BarChart3 className="h-8 w-8 text-primary opacity-20" />
              <Badge>Canlı</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold">Dashboard</h3>
            <p className="text-sm text-muted-foreground">
              Firma durumları ve istatistikler
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Shield className="h-8 w-8 text-green-500 opacity-20" />
              <Badge variant="outline">AI</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold">Denetime Hazır mıyım?</h3>
            <p className="text-sm text-muted-foreground">
              Otomatik denetim hazırlık kontrolü
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <FileCheck className="h-8 w-8 text-blue-500 opacity-20" />
              <Badge variant="secondary">Detaylı</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold">Compliance Raporu</h3>
            <p className="text-sm text-muted-foreground">
              Flag yönetimi ve çözüm takibi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 text-orange-500 opacity-20" />
              <Badge variant="destructive">Predictive</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold">Risk Analizi</h3>
            <p className="text-sm text-muted-foreground">
              Tahminleme ve kapasite planlama
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>

          <TabsTrigger value="audit" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Denetime Hazır mıyım?</span>
          </TabsTrigger>

          <TabsTrigger value="compliance" className="gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>

          <TabsTrigger value="risk" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Risk Analizi</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ISGBotDashboard />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <AuditReadiness />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceReport />
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <RiskAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}