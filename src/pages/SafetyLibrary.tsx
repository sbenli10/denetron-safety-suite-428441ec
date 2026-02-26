import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HardHat,
  Building2,
  Factory,
  ArrowLeft,
  ArrowRight,
  Search,
  Loader2,
  AlertTriangle,
  BookOpen,
  Shield,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type RiskLevel = "low" | "medium" | "high" | "critical";

interface Hazard {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  prevention: string;
  regulation: string;
  details: string;
}

interface Category {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hazards: Hazard[];
}

// ✅ Varsayılan kategoriler (type-safe)
const defaultCategories: Category[] = [
  {
    id: "construction",
    label: "İnşaat",
    icon: HardHat,
    color: "from-yellow-500 to-orange-500",
    hazards: [
      {
        id: "fall-height",
        name: "Yüksekten Düşme",
        riskLevel: "high" as RiskLevel,
        prevention:
          "Korkuluk kur, emniyet kemeri kullan, yapı iskelesi günlük denetle.",
        regulation: "İSG Kanunu Md. 13-14 - Yüksekte Çalışma",
        details:
          "Yüksekten düşme, inşaat sektöründe en sık karşılaşılan ölümcül kazalardan biridir. Minimum 1.1m yükseklikte korkuluk veya emniyet ağı kullanılmalıdır.",
      },
      {
        id: "struck-falling",
        name: "Düşen Nesneler",
        riskLevel: "high" as RiskLevel,
        prevention:
          "Emniyet şapkası giy, yüksekte aletleri sabitle, tehlike bölgeleri işaretle.",
        regulation: "İSG Kanunu Md. 29 - İş Ekipmanı",
        details:
          "Yüksekte çalışan personelin başına düşen aletlerden korunması zorunludur. Tüm el aletleri güvenlik tasması ile bağlanmalıdır.",
      },
      {
        id: "trench-collapse",
        name: "Hendek Çökmesi",
        riskLevel: "critical" as RiskLevel,
        prevention:
          "Kazıları şorit/yamaç yap, günlük denetle, ağır yükleri kenardan uzak tut.",
        regulation: "İSG Kanunu Md. 28 - İnşaat İşlerinde Güvenlik",
        details:
          "1.5m'den derin kazılar mutlaka şorit yapılmalı veya kaynakla kesme için izolasyon sağlanmalıdır.",
      },
    ],
  },
  {
    id: "office",
    label: "Ofis",
    icon: Building2,
    color: "from-blue-500 to-cyan-500",
    hazards: [
      {
        id: "ergonomic-strain",
        name: "Ergonomik Strain",
        riskLevel: "medium" as RiskLevel,
        prevention:
          "Ayarlanabilir sandalye sağla, monitör göz hizasında olsun, her saatte ara ver.",
        regulation: "6331 Sayılı Kanun - Ekran Başında Çalışma",
        details:
          "Uzun süreli ofis çalışması boyun, sırt ve bel ağrılarına neden olabilir. Ergonomik değerlendirme yapılmalıdır.",
      },
      {
        id: "slip-trip-fall",
        name: "Kaymak/Tökezle/Düşme",
        riskLevel: "medium" as RiskLevel,
        prevention:
          "Yollarda engel bırakma, ıslak zeminlere uyarı, kaymaz mat koy.",
        regulation: "İSG Tüzüğü Md. 11 - Çalışma Ortamı",
        details:
          "Ofis ortamında slip and fall kazaları sık görülür. Kablolar düzenli tutulmalı, zemin temiz olmalıdır.",
      },
      {
        id: "fire-hazard",
        name: "Yangın Tehlikesi",
        riskLevel: "high" as RiskLevel,
        prevention:
          "Söndürücü tut, alarmları aylık test et, tahliye planı afiş.",
        regulation: "İSG Kanunu Md. 30 - Yangın Güvenliği",
        details:
          "Tüm ofisler yangın söndürücü, acil çıkış ve tahliye planı ile donatılmalıdır.",
      },
    ],
  },
  {
    id: "factory",
    label: "Fabrika",
    icon: Factory,
    color: "from-red-500 to-pink-500",
    hazards: [
      {
        id: "machine-entanglement",
        name: "Makine Dolanması",
        riskLevel: "critical" as RiskLevel,
        prevention:
          "Hareketli parçalara koruma koy, lock-out/tag-out uygula, operatör eğitimi ver.",
        regulation: "İSG Kanunu Md. 29 - Makine Güvenliği",
        details:
          "Döner makine parçalarına kimse yaklaşmamalıdır. Bakım sırasında kesinlikle lock-out/tag-out uygulanmalıdır.",
      },
      {
        id: "chemical-exposure",
        name: "Kimyasal Maruz Kalma",
        riskLevel: "high" as RiskLevel,
        prevention:
          "GDS erişim sağla, fume hood kullan, PPE zorunlu (eldiven, gözlük, solunum).",
        regulation: "Kimyasalların Sınıflandırılması ve Etiketlenmesi Yönetmeliği",
        details:
          "Tüm kimyasallar için Güvenlik Veri Sayfası (GDS/SDS) işyerinde bulunmalıdır.",
      },
      {
        id: "noise-exposure",
        name: "Gürültü Maruz Kalması",
        riskLevel: "medium" as RiskLevel,
        prevention:
          "İşitme koruyucu kullan, gürültü seviyesini ölç, rotasyon yap.",
        regulation: "İSG Kanunu Md. 27 - Fiziksel Faktörler",
        details:
          "85dB üstünde gürültüye maruz kalanlar işitme koruyucu kullanmalıdır.",
      },
    ],
  },
];

export default function SafetyLibrary() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  // ✅ Fetch categories (safety_library tablosu varsa)
  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Şu an safety_library tablosu types.ts'te tanımlanmadığı için
      // sadece varsayılanları kullanıyoruz
      console.log("İSG kategorileri yüklendi (varsayılanlar)");
      toast.info("İSG Kütüphanesi hazır");
    } catch (err: any) {
      console.error("Fetch hatası:", err);
      toast.info("Offline mod: Varsayılan kategoriler kullanılıyor");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return "bg-success/15 text-success border-success/30";
      case "medium":
        return "bg-warning/15 text-warning border-warning/30";
      case "high":
        return "bg-orange-500/15 text-orange-500 border-orange-500/30";
      case "critical":
        return "bg-destructive/15 text-destructive border-destructive/30";
      default:
        return "bg-secondary/15 text-foreground";
    }
  };

  const getRiskLabel = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return "Düşük";
      case "medium":
        return "Orta";
      case "high":
        return "Yüksek";
      case "critical":
        return "Kritik";
      default:
        return "Bilinmiyor";
    }
  };

  // 🔍 Arama filtrelemesi
  const filteredCategories = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  const allHazards = filteredCategories.flatMap((cat) =>
    cat.hazards.map((h) => ({ ...h, categoryLabel: cat.label }))
  );

  const searchResults = search.trim()
    ? allHazards.filter(
        (h) =>
          h.name.toLowerCase().includes(search.toLowerCase()) ||
          h.prevention.toLowerCase().includes(search.toLowerCase())
      )
    : allHazards;

  const handleStartInspection = (hazard: Hazard) => {
    // ✅ Denetim notlarına tehlikeyi ve önleme yöntemini otomatik ekle
    const prefilledNotes = `Tehlike: ${hazard.name}\nÖnleme Yöntemi: ${hazard.prevention}`;

    // State ile geçiş yap
    navigate("/inspections", {
      state: { prefilledNotes, hazardName: hazard.name },
    });
  };

  const category = categories.find((c) => c.id === activeCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            İSG Kütüphanesi yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">İSG Kütüphanesi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kategoriler tarafından tehlikeleri inceleyin ve denetim başlatın
        </p>
      </div>

      {/* 🔍 Arama Çubuğu */}
      {!activeCategory ? (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tehlike ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveCategory(null);
              setSearch("");
            }}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Tüm Kategoriler
          </Button>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Bu kategoride tehlike ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
        </div>
      )}

      {/* Kategoriler Grid */}
      {!activeCategory ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="glass-card p-8 flex flex-col items-center gap-4 hover:border-primary/40 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/20 transform hover:scale-105"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} group-hover:shadow-lg transition-all duration-300 group-hover:scale-110 text-white`}
                >
                  <IconComponent className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {cat.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cat.hazards.length} tehlike
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Kategori Başlığı */}
          <div className="glass-card p-4 bg-gradient-to-r from-secondary/50 to-secondary/30 border border-border/50">
            <div className="flex items-center gap-3">
              {category && (
                <>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${category.color} text-white`}
                  >
                    <category.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {category.label}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {category.hazards.length} toplam tehlike
                      {search && ` (${searchResults.length} sonuç)`}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tehlike Kartları */}
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((hazard) => (
                <div
                  key={hazard.id}
                  className="glass-card p-5 space-y-3 border border-border/50 hover:border-primary/30 transition-all cursor-pointer group hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {hazard.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`mt-2 inline-flex ${getRiskColor(
                          hazard.riskLevel
                        )}`}
                      >
                        {getRiskLabel(hazard.riskLevel)} Risk
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        setSelectedHazard(hazard);
                        setDialogOpen(true);
                      }}
                    >
                      <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {hazard.prevention}
                  </p>

                  <Button
                    size="sm"
                    className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 border-0 text-white"
                    onClick={() => handleStartInspection(hazard)}
                  >
                    Denetim Başlat
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : search ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                "{search}" için tehlike bulunamadı
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* 📋 Detay Modalı */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {selectedHazard?.name}
            </DialogTitle>
            <DialogDescription>
              Tehlike detayları ve mevzuat bilgileri
            </DialogDescription>
          </DialogHeader>

          {selectedHazard && (
            <div className="space-y-4 pt-4">
              {/* Risk Seviyesi */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Risk Seviyesi
                </h4>
                <Badge
                  className={`inline-flex ${getRiskColor(
                    selectedHazard.riskLevel
                  )}`}
                >
                  {getRiskLabel(selectedHazard.riskLevel)} Risk
                </Badge>
              </div>

              {/* Detaylı Açıklama */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  Tehlike Açıklaması
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedHazard.details}
                </p>
              </div>

              {/* Önleme Yöntemi */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Önleme Yöntemi
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/50 p-3 rounded-lg">
                  {selectedHazard.prevention}
                </p>
              </div>

              {/* Mevzuat */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> İlgili
                  Mevzuat
                </h4>
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-warning">
                    {selectedHazard.regulation}
                  </p>
                </div>
              </div>

              {/* Denetim Başlat */}
              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 border-0 text-white"
                onClick={() => {
                  handleStartInspection(selectedHazard);
                  setDialogOpen(false);
                }}
              >
                Denetim Başlat
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}