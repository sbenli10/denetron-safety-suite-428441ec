import { useState, useEffect, useCallback, useRef, useLayoutEffect,useMemo} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { debounce } from "lodash";
import { supabase } from "@/integrations/supabase/client";
import { generateRisksWithGemini } from "@/services/geminiService";
import type { GeminiRiskResult } from "@/services/geminiService";
import { addInterFontsToJsPDF } from "@/utils/fonts";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Download,
  Trash2,
  Loader2,
  Library,
  Search,
  X,
  Maximize2,
  Minimize2,
  FileText,
  Camera,
  CheckCircle2,
  Keyboard,
  BookOpen,
  MousePointer,
  Lightbulb,
  HelpCircle,
  Sparkles,
  Check,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  RiskAssessment,
  RiskItem,
  RiskLibraryItem,
  RiskPackage,
  RiskClass
} from "@/types/risk-assessment";
import {
  SECTORS,
  FINE_KINNEY_SCALES,
  calculateRiskScore,
  getRiskClass,
  getRiskClassColor,
  getRiskClassLabel,
  RISK_SECTORS
} from "@/types/risk-assessment";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SendReportModal } from "@/components/SendReportModal";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


let scrollLock = 0;

export default function RiskAssessmentEditor() {
  const { user } = useAuth();
  // E-posta modal için state'ler
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [currentReportUrl, setCurrentReportUrl] = useState("");
  const [currentReportFilename, setCurrentReportFilename] = useState("");
  // State Management
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
  const [library, setLibrary] = useState<RiskLibraryItem[]>([]);
  const [riskPackages, setRiskPackages] = useState<RiskPackage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollLeft = useRef(0); // Scroll pozisyonunu hafızada tutar, render tetiklemez
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    field: keyof RiskItem;
  } | null>(null);
  const [editValue, setEditValue] = useState<any>("");

  // ✅ YENİ: AI Risk Generator
  const [aiSector, setAiSector] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiRisks, setAiRisks] = useState<Array<{
    id: string;
    hazard: string;
    risk: string;
    category: string;
    probability: number;
    frequency: number;
    severity: number;
    score: number;
    riskClass: RiskClass;
    controls: string[];
    selected: boolean;
  }>>([]);
  const [showAiDialog, setShowAiDialog] = useState(false);


  interface AIRiskPanelProps {
    isAssessmentActive: boolean;
    aiGenerating: boolean;
    onGenerate: (sector: string) => void;
  }

// ✅ TAM BURAYA EKLE:
  useLayoutEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    if (scrollLock > 0) {
      container.scrollLeft = scrollLock;
    }
  }, [riskItems]);

// 2. Bileşen içine ekle
useLayoutEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScrollCapture = () => {
        if (container.scrollLeft !== 0) {
        scrollLock = container.scrollLeft;
        }
    };

    container.addEventListener('scroll', handleScrollCapture);
    
    // riskItems değiştiğinde (Render olduğunda) kilitlenen pozisyonu zorla uygula
    if (scrollLock > 0) {
        container.scrollLeft = scrollLock;
    }

    return () => container.removeEventListener('scroll', handleScrollCapture);
    }, [riskItems]);
 // 1. Şirket ve Kütüphane verilerini çek
 // 1. Şirket ve Kütüphane verilerini çek
useEffect(() => {
  if (user) {
    fetchCompanies();
    fetchLibrary();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Burayı boş dizi yap, user değişimini AuthContext hallediyor zaten

  // Bileşen gövdesine ekle
useEffect(() => {
  console.log("🔄 RiskAssessmentEditor Render Oldu!");
});

useLayoutEffect(() => {
  const container = tableContainerRef.current;
  if (!container) return;

  const handleScrollLog = () => {
    // Sadece scroll 0 olduğunda log bas ki konsol dolmasın
    if (container.scrollLeft === 0) {
      console.warn("⚠️ Scroll SIFIRLANDI! (Kim tetikledi?)", {
        activeElement: document.activeElement?.tagName, // O an hangi input/buton seçili?
        activeElementClass: document.activeElement?.className,
        reason: "Büyük ihtimalle bir Focus veya Render olayı"
      });
    }
  };

  container.addEventListener('scroll', handleScrollLog);
  return () => container.removeEventListener('scroll', handleScrollLog);
}, []);

  // 2. Kaydırma olayını yöneten fonksiyon (useCallback ile stabilize edildi)
  const handleScroll = useCallback(() => {
    if (tableContainerRef.current) {
      lastScrollLeft.current = tableContainerRef.current.scrollLeft;
    }
  }, []);

  // 3. Olay dinleyicisini bağla ve temizle
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    // 'passive: true' performansı artırır ve tarayıcıyı yormaz
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // 4. Tablo verisi (riskItems) güncellendiğinde pozisyonu koru
  // LayoutEffect kullanımı, tarayıcı çizim yapmadan hemen önce scroll'u sabitleyerek 'sıçrama' etkisini önler
  useEffect(() => {
    if (tableContainerRef.current && riskItems.length > 0) {
      // Mikro-gecikme (requestAnimationFrame) bazen DOM render hızı için gereklidir
      requestAnimationFrame(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollLeft = lastScrollLeft.current;
        }
      });
    }
  }, [riskItems]);

  // Auto-save
  const autoSave = useCallback(async () => {
    if (!assessment || saving) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("risk_assessments")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", assessment.id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Auto-save error:", error);
    } finally {
      setSaving(false);
    }
  }, [assessment, saving]);

  const debouncedAutoSave = useMemo(
    () => debounce(() => autoSave(), 2000),
    [autoSave] // autoSave useCallback ile sarmalanmış olmalı
  );

  // ========================
  // FETCH FUNCTIONS
  // ========================

  const fetchCompanies = async () => {
    try {
      console.log("📊 Fetching companies...");
      
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user?.id)
        .order("name");

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} companies`);
      setCompanies(data || []);
    } catch (error: any) {
      console.error("❌ Fetch companies error:", error);
      toast.error("Firmalar yüklenemedi", {
        description: error.message
      });
    }
  };

  const fetchLibrary = async () => {
    try {
      console.log("📚 Fetching risk library...");
      
      const { data, error } = await supabase
        .from("risk_library")
        .select("*")
        .eq("is_active", true)
        .order("sector, category, hazard");

      if (error) throw error;

      console.log(`✅ Fetched ${data?.length || 0} library items`);
      setLibrary(data || []);
      
      // ✅ Risk Paketlerini Oluştur (Sektörlere Göre Grupla)
      const packages = SECTORS.map(sector => {
        const items = (data || []).filter(item => 
          item.sector.toLowerCase().includes(sector.toLowerCase())
        );
        
        return {
          id: sector,
          name: sector,
          sector: sector,
          item_count: items.length,
          items: items as RiskLibraryItem[]
        };
      }).filter(pkg => pkg.item_count > 0);

      setRiskPackages(packages);
      
    } catch (error: any) {
      console.error("❌ Fetch library error:", error);
      toast.error("Risk kütüphanesi yüklenemedi", {
        description: error.message
      });
    }
  };

  const fetchRiskItems = async (assessmentId: string) => {
    try {
      console.log("📋 Fetching risk items for assessment:", assessmentId);
      
      const { data, error } = await supabase
        .from("risk_items")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("sort_order");

      if (error) throw error;

      // Gelen veriyi RiskItem tipine uygun hale getiriyoruz
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        // Eğer veritabanında bu sütunlar henüz yoksa varsayılan değer atıyoruz
        probability_1: item.probability_1 ?? item.probability ?? 3,
        frequency_1: item.frequency_1 ?? item.frequency ?? 3,
        severity_1: item.severity_1 ?? item.severity ?? 3,
        score_1: item.score_1 ?? item.score ?? 27,
        risk_class_1: item.risk_class_1 ?? item.risk_class ?? "Kabul Edilebilir"
      })) as RiskItem[];

      console.log(`✅ Fetched ${mappedData.length} risk items`);
      setRiskItems(mappedData);
      
    } catch (error: any) {
      console.error("❌ Fetch risk items error:", error);
      toast.error("Risk maddeleri yüklenemedi");
    }
  };


    // ========================
  // AI RISK GENERATOR
  // ========================

    const generateAIRisks = async (sector: string) => {
    // ✅ Artık parametre olarak geliyor
    if (!sector || sector.trim().length < 2) {
      toast.error("❌ Lütfen geçerli bir sektör girin");
      return;
    }

    if (!assessment) {
      toast.error("❌ Önce bir değerlendirme oluşturun");
      return;
    }

    setAiGenerating(true);
    setAiSector(sector); // State'e kaydet
    
    toast.info("🤖 Google Gemini ile risk analizi başlatılıyor...", {
      description: `${sector} sektörü analiz ediliyor`,
      duration: 3000
    });

    try {
      const company = companies.find(c => c.id === assessment.company_id);

      // ✅ Gerçek Gemini API çağrısı
      const geminiRisks = await generateRisksWithGemini(
        sector,
        company?.name
      );

      // Map to internal format
      const mappedRisks = geminiRisks.map((r: GeminiRiskResult, idx: number) => {
        const score = r.probability * r.frequency * r.severity;
        const riskClass = getRiskClass(score);

        return {
          id: `ai-${Date.now()}-${idx}`,
          hazard: r.hazard,
          risk: r.risk,
          category: r.category,
          probability: r.probability,
          frequency: r.frequency,
          severity: r.severity,
          score: score,
          riskClass: riskClass,
          controls: r.controls,
          selected: true
        };
      });

      setAiRisks(mappedRisks);
      setShowAiDialog(true);

      toast.success(`✅ ${mappedRisks.length} risk maddesi oluşturuldu`, {
        description: `Google Gemini ${import.meta.env.VITE_GOOGLE_MODEL} ile analiz edildi`,
        duration: 5000
      });
    } catch (error: any) {
      console.error("❌ Gemini generation error:", error);
      
      let errorMessage = "Yapay zeka analizi başarısız";
      let errorDescription = error.message || "Bilinmeyen hata";

      if (error.message?.includes("API key")) {
        errorMessage = "API Anahtarı Hatası";
        errorDescription = "Google API key kontrol edin (.env dosyası)";
      } else if (error.message?.includes("quota")) {
        errorMessage = "Kota Aşıldı";
        errorDescription = "Günlük istek limitine ulaşıldı";
      } else if (error.message?.includes("safety")) {
        errorMessage = "Güvenlik Filtresi";
        errorDescription = "Farklı bir sektör ifadesi deneyin";
      }

      toast.error(errorMessage, {
        description: errorDescription,
        duration: 8000
      });
    } finally {
      setAiGenerating(false);
    }
  };
  // Mock risk generator (gerçekte OpenAI kullanacağız)
  const generateMockRisksForSector = (sector: string): typeof aiRisks => {
    const sectorLower = sector.toLowerCase();
    
    // Sektöre özel risk templates
    const templates: Record<string, Array<{
      hazard: string;
      risk: string;
      category: string;
      o: number;
      f: number;
      s: number;
      controls: string[];
    }>> = {
      'otomotiv': [
        {
          hazard: "Forklift ve Yaya Etkileşimi",
          risk: "Forkliftin fabrika içinde hızlı kullanılması, kör noktalar ve yaya yollarının belirsizliği.",
          category: "Araç Güvenliği",
          o: 6, f: 6, s: 7,
          controls: ["Çarpışma, ezilme, uzuv kayıpları, ölüm", "Kalıcı işitme kaybı, stres, iletişim kazaları"]
        },
        {
          hazard: "Manuel Taşıma",
          risk: "Üretim hattında sürekli olarak 25kg üzeri malzemelerin elle taşınması.",
          category: "Ergonomi",
          o: 10, f: 10, s: 3,
          controls: ["Bel fıtığı, kas-iskelet sistemi hastalıkları", "Transpalet, vinç veya miknatıslı kaldırıcılar kullanılmalı"]
        },
        {
          hazard: "Üretim Makineleri",
          risk: "Presler, kompresörler ve motorların 85 dB(A) üzerinde gürültü yapması.",
          category: "Fiziksel Etkenler",
          o: 10, f: 10, s: 7,
          controls: ["Kalıcı işitme kaybı, stres, iletişim kazaları", "Kulaklık veya kulak tıkacı zorunlu, gürültü seviyesi ölçümleri"]
        },
        {
          hazard: "Yağ ve Su Sızıntıları",
          risk: "Makinelerden sızan yağların zemini kayganlaştırması.",
          category: "İş Sağlığı",
          o: 6, f: 6, s: 15,
          controls: ["Kayma, düşme, kırık, ezilme", "Düzenli temizlik, absorbent matlar, kaymaz ayakkabı"]
        },
        {
          hazard: "KKD Kullanımı",
          risk: "Çalışanların iş ayakkabısı, gözlük veya baret kullanmaması.",
          category: "Kişisel Koruyucu Donanım",
          o: 6, f: 10, s: 15,
          controls: ["Ayak ezilmesi, göz kayıtı, kafa travması", "KKE kullanımı zorunlu, eğitim ve denetim"]
        },
        {
          hazard: "Arizali Alet Kullanımı",
          risk: "Çekiç saplarının gevşek, anahtar ağızlarının bozuk olması.",
          category: "El Aletleri",
          o: 3, f: 6, s: 7,
          controls: ["El ve parmak yaralanmaları", "Aylık kontrol, arızalı aletlerin imhası"]
        },
        {
          hazard: "Elektrik Panoları",
          risk: "Açık elektrik panolarına yetkisiz erişim.",
          category: "Elektrik",
          o: 1, f: 0.5, s: 100,
          controls: ["Elektrik çarpması, yanık, ölüm", "Panoların kilitli tutulması, yetkilendirme sistemi"]
        },
        {
          hazard: "Kaynak İşleri",
          risk: "Kapalı alanlarda kaynak dumanı solunması, UV ışınlarına maruziyet.",
          category: "Kimyasal/Fiziksel",
          o: 6, f: 6, s: 15,
          controls: ["Solunum yolu hastalıkları, cilt kanseri, göz yanıkları", "Havalandırma, FFP3 maske, kaynak gözlüğü/baretli"]
        },
        {
          hazard: "Yangın",
          risk: "Boya kabininde veya yağ deposunda yangın çıkma riski.",
          category: "Yangın",
          o: 1, f: 0.5, s: 40,
          controls: ["Maddi hasar, yaralanma, ölüm", "Yangın algılama sistemi, sprinkler, personel eğitimi"]
        },
        {
          hazard: "Kimyasal Maruziyeti",
          risk: "Solvent, tiner, boya gibi kimyasalların güvenlik bilgi formu olmadan kullanılması.",
          category: "Kimyasal",
          o: 6, f: 10, s: 7,
          controls: ["Zehirlenme, solunum problemleri, cilt tahrişi", "GBF sağlanmalı, havalandırma, eldiven ve maske"]
        }
      ],
      'inşaat': [
        {
          hazard: "Yüksekten Düşme",
          risk: "İskelelerde ve çatı kenarlarında korkuluk olmaması.",
          category: "Düşme",
          o: 6, f: 6, s: 100,
          controls: ["Ölüm, ağır yaralanma, felç", "Korkuluk, güvenlik ağı, emniyet kemeri kullanımı"]
        },
        {
          hazard: "Vinç Operasyonu",
          risk: "Vinç operatörünün yetkisiz veya eğitimsiz olması.",
          category: "Makine",
          o: 3, f: 6, s: 40,
          controls: ["Malzeme düşmesi, ezilme, ölüm", "Operatör sertifikası, periyodik bakım"]
        },
        {
          hazard: "Elektrik Hattı",
          risk: "Şantiyede açık elektrik kablolarının bulunması.",
          category: "Elektrik",
          o: 3, f: 3, s: 100,
          controls: ["Elektrik çarpması, ölüm", "Kabloların yalıtımı, RCD kullanımı"]
        },
        {
          hazard: "Göçük",
          risk: "Kazı çalışmalarında şev açısının yanlış hesaplanması.",
          category: "Yapısal",
          o: 1, f: 0.5, s: 100,
          controls: ["Gömülme, ölüm", "Şev hesabı, destek sistemi, kontrollü kazı"]
        },
        {
          hazard: "Toz Maruziyeti",
          risk: "Kesme ve delme işlerinde silika tozu solunması.",
          category: "Sağlık",
          o: 10, f: 10, s: 15,
          controls: ["Silikoz, akciğer hastalıkları", "Sulama, FFP3 maske, havalandırma"]
        }
      ],
      'gıda': [
        {
          hazard: "Kaygan Zemin",
          risk: "Üretim alanında su, yağ ve gıda artıklarının birikmesi.",
          category: "Kayma/Düşme",
          o: 10, f: 10, s: 7,
          controls: ["Düşme, kırık, bel yaralanması", "Sürekli temizlik, kaymaz zemin, iş ayakkabısı"]
        },
        {
          hazard: "Kesici Aletler",
          risk: "Et işleme bıçaklarının korumasız kullanılması.",
          category: "Kesme",
          o: 6, f: 10, s: 7,
          controls: ["Kesik, uzuv kaybı", "Cut Level 5 eldiven, koruyucu çelik mesh önlük"]
        },
        {
          hazard: "Sıcak Yüzeyler",
          risk: "Fırın, kazanlar ve buhar hatlarına temas.",
          category: "Yanık",
          o: 6, f: 6, s: 15,
          controls: ["Yanık, haşlanma", "Isıya dayanıklı eldiven, yalıtım, uyarı levhaları"]
        },
        {
          hazard: "Soğuk Hava Deposu",
          risk: "-25°C soğuk hava deposunda uzun süre çalışma.",
          category: "Termal",
          o: 6, f: 6, s: 7,
          controls: ["Hipotermi, donma", "Termal giysi, çalışma süre kısıtlaması, ısınma molası"]
        },
        {
          hazard: "Mikrobiyolojik",
          risk: "Hijyen kurallarına uyulmaması, çapraz kontaminasyon.",
          category: "Biyolojik",
          o: 6, f: 10, s: 3,
          controls: ["Gıda zehirlenmesi, hastalık yayılması", "El yıkama, sterilizasyon, HACCP uygulaması"]
        }
      ]
    };

    // Sektörü bul veya genel riskler kullan
    const risks = templates[sectorLower] || templates['otomotiv'];

    return risks.map((r, idx) => {
      const score = r.o * r.f * r.s;
      const riskClass = getRiskClass(score);

      return {
        id: `ai-${Date.now()}-${idx}`,
        hazard: r.hazard,
        risk: r.risk,
        category: r.category,
        probability: r.o,
        frequency: r.f,
        severity: r.s,
        score: score,
        riskClass: riskClass,
        controls: r.controls,
        selected: true // Default: tümü seçili
      };
    });
  };

  const addSelectedAIRisks = async () => {
    if (!assessment) {
        toast.error("❌ Önce bir değerlendirme oluşturun");
        return;
    }

    const selectedRisks = aiRisks.filter(r => r.selected);

    if (selectedRisks.length === 0) {
        toast.error("❌ Lütfen en az bir risk seçin");
        return;
    }

    setLoading(true);
    toast.info(`📤 ${selectedRisks.length} risk tabloya ekleniyor...`);

    try {
        const newItems: Partial<RiskItem>[] = selectedRisks.map((r, idx) => ({
        assessment_id: assessment.id,
        item_number: riskItems.length + idx + 1,
        department: r.category,
        hazard: r.hazard,
        risk: r.risk,
        affected_people: "",
        probability_1: r.probability,
        frequency_1: r.frequency,
        severity_1: r.severity,
        score_1: r.score,
        risk_class_1: r.riskClass,
        proposed_controls: r.controls.join('; '),
        probability_2: 1,
        frequency_2: 1,
        severity_2: 1,
        score_2: 1,
        risk_class_2: "Kabul Edilebilir",
        is_from_library: false,
        status: 'open',
        sort_order: riskItems.length + idx
        }));

        const { data, error } = await supabase
        .from("risk_items")
        .insert(newItems as any) // ✅ as any to bypass partial type check
        .select();

        if (error) throw error;

        if (data && data.length > 0) {
        // ✅ Map Supabase response to RiskItem type
        const mappedItems: RiskItem[] = data.map((item: any) => ({
            ...item,
            // Ensure all required fields exist
            probability_1: item.probability_1 || item.probability || 3,
            frequency_1: item.frequency_1 || item.frequency || 3,
            severity_1: item.severity_1 || item.severity || 3,
            score_1: item.score_1 || item.score || 27,
            risk_class_1: item.risk_class_1 || item.risk_class || "Olası",
            probability_2: item.probability_2 || 1,
            frequency_2: item.frequency_2 || 1,
            severity_2: item.severity_2 || 1,
            score_2: item.score_2 || 1,
            risk_class_2: item.risk_class_2 || "Kabul Edilebilir"
        }));

        setRiskItems(prev => [...prev, ...mappedItems]);
        setShowAiDialog(false);
        setAiRisks([]);
        setAiSector("");

        toast.success(`✅ ${mappedItems.length} risk başarıyla eklendi`, {
            description: "AI tarafından oluşturulan riskler tabloda",
            duration: 5000
        });
        }
    } catch (error: any) {
        console.error("❌ Add AI risks error:", error);
        toast.error("Ekleme hatası", {
        description: error.message
        });
    } finally {
        setLoading(false);
    }
    };

  const toggleAIRiskSelection = (id: string) => {
    setAiRisks(prev => prev.map(r => 
      r.id === id ? { ...r, selected: !r.selected } : r
    ));
  };

  const selectAllAIRisks = () => {
    setAiRisks(prev => prev.map(r => ({ ...r, selected: true })));
  };

  const deselectAllAIRisks = () => {
    setAiRisks(prev => prev.map(r => ({ ...r, selected: false })));
  };

    // ========================
  // FULL SCREEN TOGGLE
  // ========================

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
        toast.success("🖥️ Tam ekran modu aktif", {
          description: "F11 veya ESC ile çıkabilirsiniz"
        });
      }).catch((err) => {
        console.error("Fullscreen error:", err);
        toast.error("Tam ekran açılamadı");
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullScreen(false);
          toast.info("🖥️ Tam ekran kapatıldı");
        });
      }
    }
  };

  // Listen for fullscreen changes (ESC key)
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // ========================
  // ASSESSMENT FUNCTIONS
  // ========================

  const createAssessment = async () => {
    if (!selectedCompany) {
      toast.error("❌ Lütfen firma seçin");
      return;
    }

    setLoading(true);
    toast.info("📝 Yeni değerlendirme oluşturuluyor...");

    try {
      const company = companies.find(c => c.id === selectedCompany);
      
      const { data, error } = await supabase
        .from("risk_assessments")
        .insert({
          user_id: user?.id,
          company_id: selectedCompany,
          assessment_name: `Risk Değerlendirmesi - ${company?.name || "Firma"} - ${format(new Date(), 'dd.MM.yyyy', { locale: tr })}`,
          assessment_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          assessor_name: user?.email || "",
          next_review_date: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        console.log("✅ Assessment created:", data.id);
        setAssessment(data as RiskAssessment);
        setRiskItems([]);
        
        toast.success("✅ Yeni değerlendirme oluşturuldu", {
          description: `Form No: ${data.id.substring(0, 8).toUpperCase()}`,
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error("❌ Create assessment error:", error);
      toast.error("Oluşturma hatası", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // RISK ITEM FUNCTIONS
  // ========================

  const addFromPackage = async (packageId: string) => {
    if (!assessment) {
      toast.error("❌ Önce bir değerlendirme oluşturun");
      return;
    }

    const pkg = riskPackages.find(p => p.id === packageId);
    if (!pkg) return;

    setLoading(true);
    toast.info(`📦 ${pkg.name} paketi ekleniyor... (${pkg.item_count} madde)`);

    try {
      const newItems: Partial<RiskItem>[] = pkg.items.map((item, idx) => ({
        assessment_id: assessment.id,
        item_number: riskItems.length + idx + 1,
        department: pkg.name,
        hazard: item.hazard,
        risk: item.risk,
        affected_people: "",
        probability_1: item.typical_probability,
        frequency_1: item.typical_frequency,
        severity_1: item.typical_severity,
        score_1: calculateRiskScore(item.typical_probability, item.typical_frequency, item.typical_severity),
        risk_class_1: getRiskClass(calculateRiskScore(item.typical_probability, item.typical_frequency, item.typical_severity)),
        proposed_controls: item.suggested_controls.join('; '),
        probability_2: 0.5,
        frequency_2: 1,
        severity_2: 1,
        score_2: 0.5,
        risk_class_2: "Kabul Edilebilir",
        is_from_library: true,
        library_category: item.category || item.sector,
        status: 'open',
        sort_order: riskItems.length + idx
      }));

      const { data, error } = await supabase
        .from("risk_items")
        .insert(newItems as any)
        .select();

      if (error) throw error;

     if (data) {
        // Toplu eklemede gelen verileri RiskItem tipine dönüştür
        const newItems = (data as any[]).map(item => ({
        ...item,
        probability_1: item.probability_1 ?? 3,
        frequency_1: item.frequency_1 ?? 3,
        severity_1: item.severity_1 ?? 3,
        score_1: item.score_1 ?? 27,
        risk_class_1: item.risk_class_1 ?? "Kabul Edilebilir"
        })) as RiskItem[];

        setRiskItems(prev => [...prev, ...newItems]);
        
        toast.success(`✅ ${pkg.name} paketi eklendi`, {
        description: `${data.length} risk maddesi tabloya eklendi`,
        duration: 5000
        });
    }
    } catch (error: any) {
      console.error("❌ Add package error:", error);
      toast.error("Paket ekleme hatası", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const addEmptyRisk = async () => {
    if (!assessment) {
      toast.error("❌ Önce bir değerlendirme oluşturun");
      return;
    }

    try {
      const newItem: Partial<RiskItem> = {
        assessment_id: assessment.id,
        item_number: riskItems.length + 1,
        hazard: "Yeni tehlike",
        risk: "Risk tanımı",
        affected_people: "",
        probability_1: 3,
        frequency_1: 3,
        severity_1: 3,
        score_1: 27,
        risk_class_1: "Olası",
        probability_2: 1,
        frequency_2: 1,
        severity_2: 1,
        score_2: 1,
        risk_class_2: "Kabul Edilebilir",
        status: 'open',
        is_from_library: false,
        sort_order: riskItems.length
      };

      const { data, error } = await supabase
        .from("risk_items")
        .insert(newItem as any)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Tekil veriyi önce unknown sonra RiskItem yaparak 'overlap' hatasını geçiyoruz
        const newItem = {
        ...(data as any),
        probability_1: (data as any).probability_1 ?? 3,
        frequency_1: (data as any).frequency_1 ?? 3,
        severity_1: (data as any).severity_1 ?? 3,
        score_1: (data as any).score_1 ?? 27,
        risk_class_1: (data as any).risk_class_1 ?? "Kabul Edilebilir"
        } as RiskItem;

        setRiskItems(prev => [...prev, newItem]);
        toast.success("✅ Boş risk eklendi");
    }
    } catch (error: any) {
      console.error("❌ Add risk error:", error);
      toast.error("Ekleme hatası", {
        description: error.message
      });
    }
  };

  const updateRiskItem = async (
    itemId: string,
    field: keyof RiskItem,
    value: any,
    stage?: 1 | 2 // ✅ Hangi aşama güncellenecek
  ) => {
    try {
      const item = riskItems.find(i => i.id === itemId);
      if (!item) return;

      let updateData: any = { [field]: value };

      // ✅ 1. AŞAMA Fine-Kinney güncellemesi
      if (stage === 1 && (field === 'probability_1' || field === 'frequency_1' || field === 'severity_1')) {
        const newProb = field === 'probability_1' ? value : item.probability_1;
        const newFreq = field === 'frequency_1' ? value : item.frequency_1;
        const newSev = field === 'severity_1' ? value : item.severity_1;
        
        const newScore = calculateRiskScore(newProb, newFreq, newSev);
        const newClass = getRiskClass(newScore);
        
        updateData = {
          ...updateData,
          score_1: newScore,
          risk_class_1: newClass
        };
      }

      // ✅ 2. AŞAMA Fine-Kinney güncellemesi
      if (stage === 2 && (field === 'probability_2' || field === 'frequency_2' || field === 'severity_2')) {
        const newProb = field === 'probability_2' ? value : (item.probability_2 || 1);
        const newFreq = field === 'frequency_2' ? value : (item.frequency_2 || 1);
        const newSev = field === 'severity_2' ? value : (item.severity_2 || 1);
        
        const newScore = calculateRiskScore(newProb, newFreq, newSev);
        const newClass = getRiskClass(newScore);
        
        updateData = {
          ...updateData,
          score_2: newScore,
          risk_class_2: newClass
        };
      }

      const { error } = await supabase
        .from("risk_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      // Update local state
      setRiskItems(prev =>
        prev.map(i => i.id === itemId ? { ...i, ...updateData } : i)
      );

    } catch (error: any) {
      console.error("❌ Update error:", error);
      toast.error("Güncelleme hatası", {
        description: error.message
      });
    }
  };

  const deleteRiskItem = async (itemId: string) => {
    if (!confirm("Bu riski silmek istediğinizden emin misiniz?")) return;

    try {
      const { error } = await supabase
        .from("risk_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setRiskItems(prev => prev.filter(item => item.id !== itemId));
      toast.success("✅ Risk silindi");
    } catch (error: any) {
      console.error("❌ Delete error:", error);
      toast.error("Silme hatası", {
        description: error.message
      });
    }
  };

  // ========================
  // EDIT FUNCTIONS
  // ========================

  const startEdit = (itemId: string, field: keyof RiskItem, currentValue: any) => {
    setEditingCell({ itemId, field });
    setEditValue(currentValue || "");
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    await updateRiskItem(editingCell.itemId, editingCell.field, editValue);
    setEditingCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

    // ========================
  // HELP DIALOG COMPONENT
  // ========================

  const HelpDialog = () => {
    return (
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-indigo-400" />
              Risk Analiz Tablosu - Kullanım Kılavuzu
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              2 Aşamalı Fine-Kinney metoduyla profesyonel risk değerlendirmesi
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basics" className="mt-4">
            <TabsList className="grid grid-cols-4 w-full bg-slate-800">
              <TabsTrigger value="basics" className="data-[state=active]:bg-indigo-600">
                📋 Temel Bilgiler
              </TabsTrigger>
              <TabsTrigger value="scoring" className="data-[state=active]:bg-indigo-600">
                🎯 Skorlama
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="data-[state=active]:bg-indigo-600">
                ⌨️ Kısayollar
              </TabsTrigger>
              <TabsTrigger value="tips" className="data-[state=active]:bg-indigo-600">
                💡 İpuçları
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: TEMEL BİLGİLER */}
            <TabsContent value="basics" className="space-y-4 mt-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <MousePointer className="h-5 w-5 text-indigo-400" />
                    1. Başlangıç
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <Badge className="bg-indigo-600 shrink-0">1</Badge>
                      <span>Üst menüden <strong>firma seçin</strong> ve "Yeni Değerlendirme Başlat" butonuna tıklayın</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge className="bg-indigo-600 shrink-0">2</Badge>
                      <span><strong>Sol panel</strong>den sektörünüze uygun risk paketini seçin (örn: Metal, İnşaat)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge className="bg-indigo-600 shrink-0">3</Badge>
                      <span>Risk paketi yanındaki <strong>+ butonuna</strong> tıklayarak tüm riskleri tabloya ekleyin</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge className="bg-indigo-600 shrink-0">4</Badge>
                      <span>Veya <strong>"Manuel Risk Ekle"</strong> butonu ile boş satır ekleyip kendiniz doldurun</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">📝 Tabloda Düzenleme</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400">→</span>
                      <span><strong>Tehlike, Risk, Önlemler</strong> alanlarına <strong>direkt tıklayarak</strong> düzenleyebilirsiniz</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400">→</span>
                      <span><strong>Enter</strong> ile kaydedin, <strong>ESC</strong> ile iptal edin</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400">→</span>
                      <span><strong>O, F, Ş</strong> dropdown menülerinden değer seçin (skor otomatik hesaplanır)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">📤 Dışa Aktarma</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <Download className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span><strong>PDF İndir:</strong> Profesyonel rapor formatında (landscape, A4)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Download className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Excel:</strong> Microsoft Excel'de düzenlenebilir format</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: SKORLAMA */}
            <TabsContent value="scoring" className="space-y-4 mt-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-100">🎯 Fine-Kinney Formülü</h3>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <p className="text-center text-xl font-mono text-indigo-300 mb-2">
                      R = O × F × Ş
                    </p>
                    <p className="text-center text-sm text-slate-400">
                      Risk Skoru = Olasılık × Frekans × Şiddet
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    {/* 1. AŞAMA */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-red-300 flex items-center gap-2">
                        🔴 1. AŞAMA (Mevcut Durum)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Hiçbir önlem alınmadan, şu anki durumda riskin büyüklüğü
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between p-2 bg-slate-900 rounded">
                          <span>O (Olasılık):</span>
                          <span className="text-slate-300">0.2 - 10</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded">
                          <span>F (Frekans):</span>
                          <span className="text-slate-300">0.5 - 10</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded">
                          <span>Ş (Şiddet):</span>
                          <span className="text-slate-300">1 - 100</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. AŞAMA */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-300 flex items-center gap-2">
                        🟢 2. AŞAMA (Kalıntı Risk)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Önlemler alındıktan sonra kalan risk (hedef: Kabul Edilebilir)
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between p-2 bg-slate-900 rounded">
                          <span>Hedef:</span>
                          <span className="text-green-300">R &lt; 20</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-900 rounded">
                          <span>İdeal:</span>
                          <span className="text-green-300">R &lt; 10</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Sınıfları */}
                  <div className="mt-4">
                    <h4 className="font-semibold text-slate-100 mb-2">📊 Risk Sınıfları</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded bg-red-600/20 border border-red-600">
                        <span className="text-sm font-semibold text-red-300">Çok Yüksek (Esaslı)</span>
                        <Badge className="bg-red-600 text-white">R &gt; 400</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-orange-600/20 border border-orange-600">
                        <span className="text-sm font-semibold text-orange-300">Yüksek (Tolerans)</span>
                        <Badge className="bg-orange-600 text-white">200 ≤ R ≤ 400</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-yellow-600/20 border border-yellow-600">
                        <span className="text-sm font-semibold text-yellow-300">Önemli (Olası)</span>
                        <Badge className="bg-yellow-600 text-black">70 ≤ R &lt; 200</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-blue-600/20 border border-blue-600">
                        <span className="text-sm font-semibold text-blue-300">Olası</span>
                        <Badge className="bg-blue-600 text-white">20 ≤ R &lt; 70</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-green-600/20 border border-green-600">
                        <span className="text-sm font-semibold text-green-300">Kabul Edilebilir</span>
                        <Badge className="bg-green-600 text-white">R &lt; 20</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: KISAYOLLAR */}
            <TabsContent value="shortcuts" className="space-y-4 mt-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-4">
                    <Keyboard className="h-5 w-5 text-indigo-400" />
                    Klavye Kısayolları
                  </h3>
                  <div className="space-y-2">
                    {[
                      { keys: "Enter", desc: "Düzenlemeyi kaydet" },
                      { keys: "Escape", desc: "Düzenlemeyi iptal et / Tam ekrandan çık" },
                      { keys: "F11", desc: "Tam ekran modu (tarayıcı)" },
                      { keys: "Tab", desc: "Sonraki alana geç" },
                      { keys: "Shift + Tab", desc: "Önceki alana geç" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 rounded">
                        <kbd className="px-3 py-1 bg-slate-700 rounded border border-slate-600 text-sm font-mono">
                          {item.keys}
                        </kbd>
                        <span className="text-sm text-slate-300">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">🖱️ Fare İşlemleri</h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    <li>Hücreye <strong>tek tıklama</strong> → Düzenleme modu</li>
                    <li>Risk paketine <strong>tıklama</strong> → Detayları göster</li>
                    <li><strong>+ butonu</strong> → Paketi tabloya ekle</li>
                    <li><strong>Çöp kutusu</strong> → Riski sil</li>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: İPUÇLARI */}
            <TabsContent value="tips" className="space-y-4 mt-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-400" />
                    Profesyonel İpuçları
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-900/30 border border-indigo-700 rounded-lg">
                      <p className="text-sm font-semibold text-indigo-300 mb-1">💾 Otomatik Kaydetme</p>
                      <p className="text-xs text-slate-400">
                        Her değişiklik 2 saniye sonra otomatik kaydedilir. "Kaydediliyor..." yazısını göreceksiniz.
                      </p>
                    </div>

                    <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
                      <p className="text-sm font-semibold text-green-300 mb-1">✅ Etkili Önlemler Yazın</p>
                      <p className="text-xs text-slate-400">
                        Önlemler spesifik ve uygulanabilir olmalı. Örnek: "KKE kullanılmalı" yerine "Cut Level 5 eldiven ve koruyucu gözlük kullanılmalı"
                      </p>
                    </div>

                    <div className="p-3 bg-orange-900/30 border border-orange-700 rounded-lg">
                      <p className="text-sm font-semibold text-orange-300 mb-1">🎯 Hedef: Kalıntı Risk &lt; 20</p>
                      <p className="text-xs text-slate-400">
                        2. Aşama'da (yeşil sütunlar) risk skorunu 20'nin altına indirmeyi hedefleyin. Bu "Kabul Edilebilir" seviyedir.
                      </p>
                    </div>

                    <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                      <p className="text-sm font-semibold text-blue-300 mb-1">📸 Fotoğraf Ekleyin</p>
                      <p className="text-xs text-slate-400">
                        Foto sütunundaki kamera ikonuna tıklayarak tehlike bölgesinin fotoğrafını ekleyebilirsiniz.
                      </p>
                    </div>

                    <div className="p-3 bg-purple-900/30 border border-purple-700 rounded-lg">
                      <p className="text-sm font-semibold text-purple-300 mb-1">📋 Sorumlu ve Termin Belirleyin</p>
                      <p className="text-xs text-slate-400">
                        Her önlem için sorumlu kişi ve termin tarihi mutlaka girilmelidir. Bu takip için kritiktir.
                      </p>
                    </div>

                    <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                      <p className="text-sm font-semibold text-red-300 mb-1">⚠️ Kritik Riskler Öncelikli</p>
                      <p className="text-xs text-slate-400">
                        Kırmızı ve turuncu riskler (R &gt; 200) acil eylem gerektir. Bunları öncelikli olarak ele alın.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowHelp(false)} className="bg-indigo-600 hover:bg-indigo-700">
              Anladım, Başlayalım!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

    // ========================
  // AI RESULTS DIALOG
  // ========================

  const AIResultsDialog = () => {
    const selectedCount = aiRisks.filter(r => r.selected).length;

    return (
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] bg-slate-900 border-purple-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-slate-100">AI Bulduğu Riskler - "{aiSector}"</span>
                <p className="text-sm text-slate-400 font-normal">
                  {aiRisks.length} risk maddesi • {selectedCount} seçili
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Selection Buttons */}
          <div className="flex items-center justify-between py-2 border-y border-slate-700">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={selectAllAIRisks}
                className="gap-2 border-slate-600"
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Tümünü Seç
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={deselectAllAIRisks}
                className="gap-2 border-slate-600"
              >
                <X className="h-4 w-4 text-red-500" />
                Tümünü Kaldır
              </Button>
            </div>

            <Badge className="bg-purple-600 text-white">
              {selectedCount} / {aiRisks.length} seçildi
            </Badge>
          </div>

          

          {/* Risks List */}
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-2 pr-4">
              {aiRisks.map((risk) => (
                <div
                  key={risk.id}
                  onClick={() => toggleAIRiskSelection(risk.id)}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${risk.selected 
                      ? 'bg-purple-900/30 border-purple-600' 
                      : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="mt-1">
                      <div className={`
                        h-5 w-5 rounded border-2 flex items-center justify-center
                        ${risk.selected 
                          ? 'bg-purple-600 border-purple-600' 
                          : 'border-slate-600'
                        }
                      `}>
                        {risk.selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="mb-2 border-purple-600 text-purple-300 text-xs">
                            {risk.category}
                          </Badge>
                          <h4 className="font-semibold text-slate-100 text-sm">
                            {risk.hazard}
                          </h4>
                        </div>
                        <Badge className={`${getRiskClassColor(risk.riskClass)} shrink-0`}>
                          {risk.score}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-400">
                        {risk.risk}
                      </p>

                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          O: {risk.probability}
                        </Badge>
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          F: {risk.frequency}
                        </Badge>
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          Ş: {risk.severity}
                        </Badge>
                      </div>

                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs text-slate-500 mb-1">Önerilen Önlemler:</p>
                        <ul className="space-y-1">
                          {risk.controls.map((control, idx) => (
                            <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                              <span className="text-purple-400">→</span>
                              {control}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => setShowAiDialog(false)}
              className="border-slate-600"
            >
              İptal
            </Button>

            <Button
              onClick={addSelectedAIRisks}
              disabled={selectedCount === 0}
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4" />
              {selectedCount} Maddeyi Tabloya Ekle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

    // ========================
  // AI RISK GENERATOR PANEL
  // ========================

  interface AIRiskPanelProps {
    isAssessmentActive: boolean;
    aiGenerating: boolean;
    onGenerate: (sector: string) => void;
  }

  const AIRiskPanel: React.FC<AIRiskPanelProps> = ({
    isAssessmentActive,
    aiGenerating,
    onGenerate
  }) => {
    const modelName = import.meta.env.VITE_GOOGLE_MODEL || "gemini-2.0-flash-exp";
    
    // ✅ Local state for autocomplete
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSector, setSelectedSector] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    
    // ✅ Filter sectors based on search
    const filteredSectors = RISK_SECTORS.filter(sector => 
      sector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sector.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 10); // Maksimum 10 öneri

    // ✅ Handle sector selection
    const handleSelectSector = (sectorName: string) => {
      setSelectedSector(sectorName);
      setSearchQuery(sectorName);
      setShowSuggestions(false);
      inputRef.current?.blur();
    };

    const handleGenerate = () => {
      const sector = selectedSector || searchQuery.trim();
      
      if (sector.length < 2) {
        toast.error("❌ Lütfen bir sektör seçin veya yazın", {
          description: "Örnek: Otomotiv, İnşaat, Gıda"
        });
        return;
      }

      if (!isAssessmentActive) {
        toast.error("❌ Önce bir değerlendirme oluşturun");
        return;
      }

      onGenerate(sector);
    };

    // ✅ Close suggestions on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          suggestionsRef.current && 
          !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(e.target as Node)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-300">YAPAY ZEKA RİSK ANALİZ</h3>
              <p className="text-xs text-purple-400/70">
                Google Gemini • BETA
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* ✅ Autocomplete Input */}
            <div className="relative">
              <Label className="text-xs text-slate-300 mb-1 block">Sektör Seçin</Label>
              <Input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setSelectedSector(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Otomotiv, İnşaat, Gıda..."
                className="h-9 bg-slate-800 border-purple-700/50 text-slate-100 placeholder:text-slate-500"
                disabled={aiGenerating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !aiGenerating) {
                    e.preventDefault();
                    if (filteredSectors.length === 1) {
                      handleSelectSector(filteredSectors[0].name);
                    }
                    handleGenerate();
                  }
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
              />

              {/* ✅ Suggestions Dropdown */}
              {showSuggestions && searchQuery.length > 0 && filteredSectors.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-slate-800 border border-purple-700/50 rounded-lg shadow-xl max-h-64 overflow-y-auto"
                >
                  <div className="p-2">
                    <p className="text-xs text-slate-400 mb-2 px-2">
                      ÖNERİLER ({filteredSectors.length})
                    </p>
                    <div className="space-y-1">
                      {filteredSectors.map((sector, idx) => (
                        <button
                          key={sector.id}
                          onClick={() => handleSelectSector(sector.name)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-purple-700/30 transition-colors text-left"
                        >
                          <div className="flex items-center justify-center w-8 h-8 bg-slate-700 rounded text-lg">
                            {sector.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-purple-600 text-purple-300 text-xs">
                                #{idx + 1}
                              </Badge>
                              <span className="text-sm font-semibold text-slate-100">
                                {sector.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {sector.keywords.slice(0, 3).join(", ")}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* No results */}
              {showSuggestions && searchQuery.length > 0 && filteredSectors.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-purple-700/50 rounded-lg shadow-xl p-4 text-center">
                  <p className="text-sm text-slate-400">
                    Sonuç bulunamadı. Yine de devam edebilirsiniz.
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!isAssessmentActive || aiGenerating}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              size="sm"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gemini Analiz Ediyor...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI ile Risk Oluştur
                </>
              )}
            </Button>

            <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-purple-700/30">
              <p>• Google Gemini 2.5 Flash</p>
              <p>• Türkiye İSG mevzuatına uygun</p>
              <p>• Fine-Kinney skoru otomatik</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ========================
  // LEFT PANEL COMPONENT
  // ========================

  const RiskLibraryPanel = () => {
    const filteredPackages = riskPackages.filter(pkg => 
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="h-full flex flex-col bg-slate-900/50 border-r border-slate-700">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Library className="h-5 w-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100">RİSK KÜTÜPHANESİ</h2>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Risk ara..."
              className="pl-8 h-9 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* ✅ AI Panel - Düzeltilmiş Props */}
        <div className="p-4 border-b border-slate-700">
          <AIRiskPanel
            isAssessmentActive={!!assessment}
            aiGenerating={aiGenerating}
            onGenerate={generateAIRisks}
          />
        </div>

        {/* Packages List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredPackages.length === 0 ? (
              <div className="text-center py-8">
                <Library className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                <p className="text-sm text-slate-500">
                  {searchQuery ? "Sonuç bulunamadı" : "Risk paketi yok"}
                </p>
              </div>
            ) : (
              filteredPackages.map((pkg, index) => (
                <Collapsible key={pkg.id}>
                  <CollapsibleTrigger asChild>
                    <div
                      className={`
                        flex items-center justify-between p-3 rounded-lg
                        hover:bg-slate-800/50 transition-all cursor-pointer w-full
                        ${selectedPackage === pkg.id ? 'bg-slate-800 border border-indigo-500' : 'bg-slate-800/30'}
                      `}
                      onClick={() => setSelectedPackage(pkg.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded bg-slate-700 text-slate-300 text-xs font-bold">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-100">
                            {pkg.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {pkg.item_count} Risk Maddesi
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-indigo-400 hover:bg-indigo-500/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          addFromPackage(pkg.id);
                        }}
                        disabled={!assessment}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-1">
                    <div className="pl-12 pr-2 space-y-1">
                      {pkg.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="p-2 rounded bg-slate-900/50 border border-slate-700/50"
                        >
                          <p className="text-xs text-slate-300 line-clamp-2">
                            {item.hazard}
                          </p>
                        </div>
                      ))}
                      {pkg.items.length > 3 && (
                        <p className="text-xs text-slate-500 text-center py-1">
                          +{pkg.items.length - 3} madde daha
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-700 bg-slate-900/80">
          <div className="text-xs text-slate-400 space-y-1">
            <p>• Seçilen sektöre uygun riskler</p>
            <p>• İSG mevzuatına uyumlu</p>
          </div>
        </div>
      </div>
    );
  };
  const RiskAnalysisTable = () => {
    if (riskItems.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileText className="h-20 w-20 mx-auto mb-4 text-slate-600" />
            <p className="text-lg font-semibold text-slate-300 mb-2">
              Henüz risk eklenmedi
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Sol panelden risk paketi seçin veya manuel risk ekleyin
            </p>
            <Button
              onClick={addEmptyRisk}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Manuel Risk Ekle
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: '2000px' }}>
          {/* TABLE HEADER */}
          <thead className="sticky top-0 z-10">
            {/* Ana Başlık Satırı */}
            <tr className="bg-gradient-to-r from-slate-800 to-slate-900">
              <th rowSpan={2} className="sticky left-0 z-20 bg-slate-800 border border-slate-600 p-2 w-16">
                <div className="text-slate-300 font-bold text-xs">NO</div>
              </th>
              <th rowSpan={2} className="border border-slate-600 p-2 min-w-[120px]">
                <div className="text-slate-300 font-bold text-xs">BÖLÜM/ORTAM</div>
              </th>
              <th rowSpan={2} className="border border-slate-600 p-2 min-w-[100px]">
                <div className="text-slate-300 font-bold text-xs">FOTO</div>
              </th>
              <th rowSpan={2} className="border border-slate-600 p-2 min-w-[200px]">
                <div className="text-slate-300 font-bold text-xs">TEHLİKE</div>
              </th>
              <th rowSpan={2} className="border border-slate-600 p-2 min-w-[200px]">
                <div className="text-slate-300 font-bold text-xs">RİSK</div>
              </th>
              <th rowSpan={2} className="border border-slate-600 p-2 min-w-[120px]">
                <div className="text-slate-300 font-bold text-xs">ETKİLENEN</div>
              </th>
              
              {/* 1. AŞAMA Header */}
              <th colSpan={5} className="border border-slate-600 p-2 bg-red-900/30">
                <div className="text-red-300 font-bold text-sm">1. AŞAMA (Mevcut Durum)</div>
              </th>

              {/* ÖNLEMLER Header */}
              <th rowSpan={2} className="border border-slate-600 p-2 min-w-[250px] bg-blue-900/30">
                <div className="text-blue-300 font-bold text-xs">ÖNLEMLER</div>
              </th>

              {/* 2. AŞAMA Header */}
              <th colSpan={5} className="border border-slate-600 p-2 bg-green-900/30">
                <div className="text-green-300 font-bold text-sm">2. AŞAMA (Kalıntı Risk)</div>
              </th>

              {/* Diğer */}
              <th rowSpan={2} className="border border-slate-600 p-2 min-w-[120px]">
                <div className="text-slate-300 font-bold text-xs">SORUMLU</div>
              </th>
              <th rowSpan={2} className="border border-slate-600 p-2 min-w-[100px]">
                <div className="text-slate-300 font-bold text-xs">TERMİN</div>
              </th>
              <th rowSpan={2} className="border border-slate-600 p-2 w-20">
                <div className="text-slate-300 font-bold text-xs">İŞLEM</div>
              </th>
            </tr>

            {/* Alt Başlık Satırı (O, F, Ş kolonları) */}
            <tr className="bg-slate-800/80">
              {/* 1. AŞAMA Alt Başlıklar */}
              <th className="border border-slate-600 p-1 bg-red-900/20 w-16">
                <div className="text-red-300 font-semibold text-xs">O</div>
              </th>
              <th className="border border-slate-600 p-1 bg-red-900/20 w-16">
                <div className="text-red-300 font-semibold text-xs">F</div>
              </th>
              <th className="border border-slate-600 p-1 bg-red-900/20 w-16">
                <div className="text-red-300 font-semibold text-xs">Ş</div>
              </th>
              <th className="border border-slate-600 p-1 bg-red-900/20 w-20">
                <div className="text-red-300 font-semibold text-xs">Skor</div>
              </th>
              <th className="border border-slate-600 p-1 bg-red-900/20 min-w-[100px]">
                <div className="text-red-300 font-semibold text-xs">Sınıf</div>
              </th>

              {/* 2. AŞAMA Alt Başlıklar */}
              <th className="border border-slate-600 p-1 bg-green-900/20 w-16">
                <div className="text-green-300 font-semibold text-xs">O</div>
              </th>
              <th className="border border-slate-600 p-1 bg-green-900/20 w-16">
                <div className="text-green-300 font-semibold text-xs">F</div>
              </th>
              <th className="border border-slate-600 p-1 bg-green-900/20 w-16">
                <div className="text-green-300 font-semibold text-xs">Ş</div>
              </th>
              <th className="border border-slate-600 p-1 bg-green-900/20 w-20">
                <div className="text-green-300 font-semibold text-xs">Skor</div>
              </th>
              <th className="border border-slate-600 p-1 bg-green-900/20 min-w-[100px]">
                <div className="text-green-300 font-semibold text-xs">Sınıf</div>
              </th>
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody>
            {riskItems.map((item, idx) => (
              <tr
                key={item.id}
                className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors"
              >
                {/* NO */}
                <td className="sticky left-0 z-10 bg-slate-900 border border-slate-700 p-2 text-center">
                  <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600 font-mono">
                    {String(idx + 1).padStart(2, '0')}
                  </Badge>
                </td>

                {/* BÖLÜM/ORTAM */}
                <td className="border border-slate-700 p-2">
                  {editingCell?.itemId === item.id && editingCell.field === 'department' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-xs bg-slate-800 border-slate-600"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(item.id, 'department', item.department)}
                      className="cursor-pointer hover:bg-slate-800 p-2 rounded min-h-[32px]"
                    >
                      <p className="text-xs text-slate-300">
                        {item.department || "—"}
                      </p>
                    </div>
                  )}
                </td>

                {/* FOTO */}
                <td className="border border-slate-700 p-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-16 w-16 border-dashed border-slate-600 hover:border-indigo-500"
                  >
                    <Camera className="h-5 w-5 text-slate-500" />
                  </Button>
                </td>

                {/* TEHLİKE */}
                <td className="border border-slate-700 p-2">
                  {editingCell?.itemId === item.id && editingCell.field === 'hazard' ? (
                    <div className="flex items-start gap-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs bg-slate-800 border-slate-600 resize-none"
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                          <X className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(item.id, 'hazard', item.hazard)}
                      className="cursor-pointer hover:bg-slate-800 p-2 rounded min-h-[32px]"
                    >
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">
                        {item.hazard}
                      </p>
                    </div>
                  )}
                </td>

                {/* RİSK */}
                <td className="border border-slate-700 p-2">
                  {editingCell?.itemId === item.id && editingCell.field === 'risk' ? (
                    <div className="flex items-start gap-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs bg-slate-800 border-slate-600 resize-none"
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                          <X className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(item.id, 'risk', item.risk)}
                      className="cursor-pointer hover:bg-slate-800 p-2 rounded min-h-[32px]"
                    >
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">
                        {item.risk}
                      </p>
                    </div>
                  )}
                </td>

                {/* ETKİLENEN */}
                <td className="border border-slate-700 p-2">
                  {editingCell?.itemId === item.id && editingCell.field === 'affected_people' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-xs bg-slate-800 border-slate-600"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(item.id, 'affected_people', item.affected_people)}
                      className="cursor-pointer hover:bg-slate-800 p-2 rounded min-h-[32px]"
                    >
                      <p className="text-xs text-slate-300">
                        {item.affected_people || "—"}
                      </p>
                    </div>
                  )}
                </td>

                {/* 1. AŞAMA - O */}
                <td className="border border-slate-700 p-1 bg-red-900/10 text-center">
                  <Select
                    value={item.probability_1.toString()}
                    onValueChange={(value) => updateRiskItem(item.id, 'probability_1', parseFloat(value), 1)}
                  >
                    <SelectTrigger className="h-8 w-14 bg-slate-800 border-slate-600 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                        position="popper" 
                        onCloseAutoFocus={(e) => e.preventDefault()} // 👈 Burası hayati!
                    >
                      {FINE_KINNEY_SCALES.probability.map(scale => (
                        <SelectItem key={scale.value} value={scale.value.toString()}>
                          {scale.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* 1. AŞAMA - F */}
                <td className="border border-slate-700 p-1 bg-red-900/10 text-center">
                  <Select
                    value={item.frequency_1.toString()}
                    onValueChange={(value) => updateRiskItem(item.id, 'frequency_1', parseFloat(value), 1)}
                  >
                    <SelectTrigger className="h-8 w-14 bg-slate-800 border-slate-600 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                        position="popper" 
                        onCloseAutoFocus={(e) => e.preventDefault()} // 👈 Burası hayati!
                    >                        
                      {FINE_KINNEY_SCALES.frequency.map(scale => (
                        <SelectItem key={scale.value} value={scale.value.toString()}>
                          {scale.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* 1. AŞAMA - Ş */}
                <td className="border border-slate-700 p-1 bg-red-900/10 text-center">
                  <Select
                    value={item.severity_1.toString()}
                    onValueChange={(value) => updateRiskItem(item.id, 'severity_1', parseFloat(value), 1)}
                  >
                    <SelectTrigger className="h-8 w-14 bg-slate-800 border-slate-600 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                    position="popper" 
                    onCloseAutoFocus={(e) => e.preventDefault()} // 👈 Burası hayati!
                    >
                      {FINE_KINNEY_SCALES.severity.map(scale => (
                        <SelectItem key={scale.value} value={scale.value.toString()}>
                          {scale.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* 1. AŞAMA - Skor */}
                <td className="border border-slate-700 p-1 bg-red-900/10 text-center">
                  <Badge className="bg-red-600 text-white font-mono font-bold text-xs">
                    {item.score_1}
                  </Badge>
                </td>

                {/* 1. AŞAMA - Sınıf */}
                <td className="border border-slate-700 p-1 bg-red-900/10 text-center">
                  <Badge className={`${getRiskClassColor(item.risk_class_1)} font-semibold text-xs`}>
                    {getRiskClassLabel(item.risk_class_1)}
                  </Badge>
                </td>

                {/* ÖNLEMLER */}
                <td className="border border-slate-700 p-2 bg-blue-900/10">
                  {editingCell?.itemId === item.id && editingCell.field === 'proposed_controls' ? (
                    <div className="flex items-start gap-1">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px] text-xs bg-slate-800 border-slate-600 resize-none"
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                          <X className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(item.id, 'proposed_controls', item.proposed_controls)}
                      className="cursor-pointer hover:bg-slate-800 p-2 rounded min-h-[32px]"
                    >
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">
                        {item.proposed_controls || "—"}
                      </p>
                    </div>
                  )}
                </td>

                {/* 2. AŞAMA - O */}
                <td className="border border-slate-700 p-1 bg-green-900/10 text-center">
                  <Select
                    value={(item.probability_2 || 1).toString()}
                    onValueChange={(value) => updateRiskItem(item.id, 'probability_2', parseFloat(value), 2)}
                  >
                    <SelectTrigger className="h-8 w-14 bg-slate-800 border-slate-600 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                        position="popper" 
                        onCloseAutoFocus={(e) => e.preventDefault()} // 👈 Burası hayati!
                        >
                      {FINE_KINNEY_SCALES.probability.map(scale => (
                        <SelectItem key={scale.value} value={scale.value.toString()}>
                          {scale.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* 2. AŞAMA - F */}
                <td className="border border-slate-700 p-1 bg-green-900/10 text-center">
                  <Select
                    value={(item.frequency_2 || 1).toString()}
                    onValueChange={(value) => updateRiskItem(item.id, 'frequency_2', parseFloat(value), 2)}
                  >
                    <SelectTrigger className="h-8 w-14 bg-slate-800 border-slate-600 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                    position="popper" 
                    onCloseAutoFocus={(e) => e.preventDefault()} // 👈 Burası hayati!
                    >
                      {FINE_KINNEY_SCALES.frequency.map(scale => (
                        <SelectItem key={scale.value} value={scale.value.toString()}>
                          {scale.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* 2. AŞAMA - Ş */}
                <td className="border border-slate-700 p-1 bg-green-900/10 text-center">
                  <Select
                    value={(item.severity_2 || 1).toString()}
                    onValueChange={(value) => updateRiskItem(item.id, 'severity_2', parseFloat(value), 2)}
                  >
                    <SelectTrigger className="h-8 w-14 bg-slate-800 border-slate-600 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                    position="popper" 
                    onCloseAutoFocus={(e) => e.preventDefault()} // 👈 Burası hayati!
                    >
                      {FINE_KINNEY_SCALES.severity.map(scale => (
                        <SelectItem key={scale.value} value={scale.value.toString()}>
                          {scale.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* 2. AŞAMA - Skor */}
                <td className="border border-slate-700 p-1 bg-green-900/10 text-center">
                  <Badge className="bg-green-600 text-white font-mono font-bold text-xs">
                    {item.score_2 || 0}
                  </Badge>
                </td>

                {/* 2. AŞAMA - Sınıf */}
                <td className="border border-slate-700 p-1 bg-green-900/10 text-center">
                  <Badge className={`${getRiskClassColor(item.risk_class_2 || "Kabul Edilebilir")} font-semibold text-xs`}>
                    {getRiskClassLabel(item.risk_class_2 || "Kabul Edilebilir")}
                  </Badge>
                </td>

                {/* SORUMLU */}
                <td className="border border-slate-700 p-2">
                  {editingCell?.itemId === item.id && editingCell.field === 'responsible_person' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-xs bg-slate-800 border-slate-600"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(item.id, 'responsible_person', item.responsible_person)}
                      className="cursor-pointer hover:bg-slate-800 p-2 rounded min-h-[32px]"
                    >
                      <p className="text-xs text-slate-300">
                        {item.responsible_person || "—"}
                      </p>
                    </div>
                  )}
                </td>

                {/* TERMİN */}
                <td className="border border-slate-700 p-2">
                  <Input
                    type="date"
                    value={item.deadline || ""}
                    onChange={(e) => updateRiskItem(item.id, 'deadline', e.target.value)}
                    className="h-8 text-xs bg-slate-800 border-slate-600"
                  />
                </td>

                {/* İŞLEM */}
                <td className="border border-slate-700 p-1 text-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteRiskItem(item.id)}
                    className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

   const exportToPDF = async () => {
  if (!assessment || riskItems.length === 0) {
    toast.error("❌ PDF oluşturmak için veri yok");
    return;
  }

  toast.info("📄 Profesyonel PDF oluşturuluyor...");

  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // ✅ TÜRKÇE FONTU KAYDET VE AKTİF ET
    addInterFontsToJsPDF(doc);
    doc.setFont("Inter"); // Varsayılan fontu Inter yap

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ========================
    // HEADER
    // ========================
    doc.setFontSize(16);
    doc.setFont("Inter", "bold"); // ✅ helvetica yerine Inter
    doc.text("RİSK DEĞERLENDİRME FORMU (2 AŞAMALI FİNE-KİNNEY)", pageWidth / 2, 15, { align: 'center' });

    // ========================
    // COMPANY INFO BOX
    // ========================
    const company = companies.find(c => c.id === assessment.company_id);
    doc.setFontSize(9);
    doc.setFont("Inter", "normal"); // ✅ helvetica yerine Inter
    
    doc.text(`Firma: ${company?.name || "—"}`, 15, 25);
    doc.text(`Değerlendiren: ${assessment.assessor_name || "—"}`, 15, 30);
    doc.text(`Bölüm: ${assessment.department || "Tüm Bölümler"}`, 15, 35);
    
    doc.text(`Tarih: ${format(new Date(assessment.assessment_date), 'dd.MM.yyyy', { locale: tr })}`, pageWidth - 70, 25);
    doc.text(`Form No: ${assessment.id.substring(0, 8).toUpperCase()}`, pageWidth - 70, 30);
    doc.text(`Yöntem: Fine-Kinney (2 Aşama)`, pageWidth - 70, 35);

    // ========================
    // STATISTICS
    // ========================
    doc.setFontSize(8);
    doc.setFont("Inter", "bold"); // ✅ helvetica yerine Inter
    doc.text("İSTATİSTİKLER:", 15, 42);
    doc.setFont("Inter", "normal");
    const stats = {
      total: riskItems.length,
      critical: riskItems.filter(i => i.risk_class_1 === "Çok Yüksek").length,
      residual_safe: riskItems.filter(i => (i.risk_class_2 === "Kabul Edilebilir" || i.risk_class_2 === "Olası")).length
    };
    doc.text(`Toplam: ${stats.total} | Kritik: ${stats.critical} | Kalıntı Risk Güvenli: ${stats.residual_safe}`, 50, 42);

    // ========================
    // MAIN TABLE DATA
    // ========================
    const tableData = riskItems.map((item, idx) => [
      String(idx + 1).padStart(2, '0'),
      item.department || "—",
      item.hazard || "—",
      item.risk || "—",
      item.affected_people || "—",
      item.probability_1.toString(),
      item.frequency_1.toString(),
      item.severity_1.toString(),
      item.score_1.toString(),
      getRiskClassLabel(item.risk_class_1),
      item.proposed_controls || "—",
      (item.probability_2 || 0).toString(),
      (item.frequency_2 || 0).toString(),
      (item.severity_2 || 0).toString(),
      (item.score_2 || 0).toString(),
      getRiskClassLabel(item.risk_class_2 || "Kabul Edilebilir"),
      item.responsible_person || "—",
      item.deadline ? format(new Date(item.deadline), 'dd.MM.yy', { locale: tr }) : "—"
    ]);

    autoTable(doc, {
      startY: 47,
      head: [['No', 'Bölüm', 'Tehlike', 'Risk', 'Etkilenen', 'O', 'F', 'Ş', 'Skor', 'Sınıf', 'Önlemler', 'O', 'F', 'Ş', 'Skor', 'Sınıf', 'Sorumlu', 'Termin']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 6,
        cellPadding: 1.5,
        font: "Inter", // ✅ KRİTİK: Tablo fontunu Inter yap
        lineColor: [100, 100, 100],
        lineWidth: 0.1,
        textColor: [50, 50, 50]
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        font: "Inter", // ✅ Başlık fontu Inter
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        fontSize: 7
      },
      columnStyles: {
        // ... Mevcut columnStyles ayarların aynı kalsın
      },
      didParseCell: (data) => {
        // ... Mevcut renklendirme mantığın aynı kalsın
      },
      margin: { left: 8, right: 8 },
      tableWidth: 'auto'
    });

    // FOOTER
    doc.setPage(doc.internal.pages.length - 1);
    doc.setFontSize(7);
    doc.setFont("Inter", "italic"); 
    doc.text(`Bu rapor Denetron İSG Yazılımı ile oluşturulmuştur.`, pageWidth / 2, pageHeight - 8, { align: 'center' });

    doc.save(`Risk-Analiz-${assessment.id.substring(0, 8)}.pdf`);
    toast.success("✅ PDF rapor indirildi");

  } catch (error: any) {
    console.error("💥 PDF error:", error);
    toast.error("PDF oluşturma hatası");
  }
};

// PDF export fonksiyonundan sonra:
// ✅ PDF Export ve Share Fonksiyonu
const exportToPDFAndShare = async () => {
  if (riskItems.length === 0) {
    toast.error("Rapor oluşturmak için en az bir risk kaydı gerekli");
    return;
  }

  try {
    setSaving(true);
    toast.info("📄 PDF raporu oluşturuluyor...");

    // ✅ 1. PDF BLOB OLUŞTUR (Mevcut exportToPDF fonksiyonundan al)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    addInterFontsToJsPDF(doc);
    doc.setFont("Inter", "normal");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pageWidth, 25, "F");

    doc.setFont("Inter", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("RİSK ANALİZ TABLOSU", pageWidth / 2, 12, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("Inter", "normal");
    doc.text(
      `Firma: ${companies.find((c) => c.id === assessment?.company_id)?.name || "—"}`,
      14,
      20
    );
    doc.text(
      `Tarih: ${format(new Date(), "dd MMMM yyyy", { locale: tr })}`,
      pageWidth - 14,
      20,
      { align: "right" }
    );

    // Stats
    const stats = {
      total: riskItems.length,
      critical: riskItems.filter(
        (i) => i.risk_class_1 === "Yüksek" || i.risk_class_1 === "Çok Yüksek"
      ).length,
      residual_safe: riskItems.filter(
        (i) => i.risk_class_2 === "Kabul Edilebilir" || i.risk_class_2 === "Olası"
      ).length,
    };

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(
      `Toplam: ${stats.total} | Kritik: ${stats.critical} | Kalıntı Risk Güvenli: ${stats.residual_safe}`,
      50,
      42
    );

    // Table
    const tableData = riskItems.map((item, idx) => [
      String(idx + 1).padStart(2, "0"),
      item.department || "—",
      item.hazard || "—",
      item.risk || "—",
      item.affected_people || "—",
      item.probability_1.toString(),
      item.frequency_1.toString(),
      item.severity_1.toString(),
      item.score_1.toString(),
      getRiskClassLabel(item.risk_class_1),
      item.proposed_controls || "—",
      item.probability_2.toString(),
      item.frequency_2.toString(),
      item.severity_2.toString(),
      item.score_2.toString(),
      getRiskClassLabel(item.risk_class_2),
    ]);

    (doc as any).autoTable({
      head: [
        [
          "No",
          "Birim",
          "Tehlike",
          "Risk",
          "Etkilenen",
          "O1",
          "F1",
          "Ş1",
          "Skor",
          "Risk Sınıfı",
          "Önlemler",
          "O2",
          "F2",
          "Ş2",
          "Skor",
          "Kalıntı Risk",
        ],
      ],
      body: tableData,
      startY: 50,
      styles: { fontSize: 7, cellPadding: 1.5, font: "Inter" },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 18 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 15 },
        5: { cellWidth: 8 },
        6: { cellWidth: 8 },
        7: { cellWidth: 8 },
        8: { cellWidth: 10 },
        9: { cellWidth: 15 },
        10: { cellWidth: 35 },
        11: { cellWidth: 8 },
        12: { cellWidth: 8 },
        13: { cellWidth: 8 },
        14: { cellWidth: 10 },
        15: { cellWidth: 15 },
      },
      margin: { left: 8, right: 8 },
      tableWidth: "auto",
    });

    // Footer
    doc.setPage(doc.internal.pages.length - 1);
    doc.setFontSize(7);
    doc.setFont("Inter", "italic");
    doc.text(
      `Bu rapor Denetron İSG Yazılımı ile oluşturulmuştur.`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );

    const pdfBlob = doc.output("blob");

    // ✅ 2. SUPABASE STORAGE'A YÜKLE
    const fileName = `risk-assessment-${assessment.id}.pdf`;
    const storagePath = `risk-reports/${user?.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("reports")
      .upload(storagePath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Storage upload error:", uploadError);
      toast.error("Dosya yüklenemedi");
      return;
    }

    // ✅ 3. PUBLIC URL AL
    const { data: publicUrlData } = supabase.storage
      .from("reports")
      .getPublicUrl(uploadData.path);

    const reportUrl = publicUrlData.publicUrl;

    // ✅ 4. LOCAL İNDİR
    doc.save(fileName);
    toast.success("✅ PDF indirildi");

    // ✅ 5. E-POSTA MODAL AÇ
    setCurrentReportUrl(reportUrl);
    setCurrentReportFilename(fileName);
    setSendModalOpen(true);
  } catch (error: any) {
    console.error("❌ PDF export error:", error);
    toast.error(`PDF oluşturulamadı: ${error.message}`);
  } finally {
    setSaving(false);
  }
};
// Buton ekle:
<Button onClick={exportToPDFAndShare} className="gap-2">
  <Share2 className="h-4 w-4" />
  PDF Oluştur ve Gönder
</Button>

{/* Modal ekle */}
  <SendReportModal
    open={sendModalOpen}
    onOpenChange={setSendModalOpen}
    reportType="risk_assessment"
    reportUrl={currentReportUrl}
    reportFilename={`Risk_Raporu_${companies.find((c) => c.id === assessment?.company_id)?.name || "Firma"}.pdf`}
    companyName={companies.find((c) => c.id === assessment?.company_id)?.name || "Firma"}
  />


  // ========================
  // EXCEL EXPORT
  // ========================

  const exportToExcel = () => {
    if (riskItems.length === 0) {
      toast.error("Dışa aktarılacak risk yok");
      return;
    }

    try {
      const exportData = riskItems.map((item, idx) => ({
        'No': idx + 1,
        'Bölüm': item.department || "",
        'Tehlike': item.hazard,
        'Risk': item.risk,
        'Etkilenen': item.affected_people || "",
        // 1. AŞAMA
        'O1': item.probability_1,
        'F1': item.frequency_1,
        'Ş1': item.severity_1,
        'Skor1': item.score_1,
        'Sınıf1': item.risk_class_1,
        // ÖNLEMLER
        'Önlemler': item.proposed_controls || "",
        // 2. AŞAMA
        'O2': item.probability_2 || 0,
        'F2': item.frequency_2 || 0,
        'Ş2': item.severity_2 || 0,
        'Skor2': item.score_2 || 0,
        'Sınıf2': item.risk_class_2 || "Kabul Edilebilir",
        // DİĞER
        'Sorumlu': item.responsible_person || "",
        'Termin': item.deadline || ""
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Risk Analizi");

      const fileName = `Risk-Analiz-2Asama-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("✅ Excel dosyası indirildi", {
        description: fileName
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Dışa aktarma hatası");
    }
  };

    // ========================
  // MAIN RENDER
  // ========================

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* TOP BAR */}
<div className="h-16 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between px-6">
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
        <FileText className="h-6 w-6 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-slate-100">
          Risk Analiz Tablosu
        </h1>
      </div>
    </div>

    {saving && (
      <Badge variant="outline" className="gap-2 animate-pulse border-indigo-500 text-indigo-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Kaydediliyor...
      </Badge>
    )}
  </div>

  <div className="flex items-center gap-2">
    {/* ✅ YENİ: Nasıl Kullanılır Butonu */}
    <Button
      variant="outline"
      size="sm"
      className="gap-2 border-slate-600 hover:bg-slate-800 text-slate-300"
      onClick={() => setShowHelp(true)}
    >
      <HelpCircle className="h-4 w-4" />
      Nasıl Kullanılır?
    </Button>

    {/* ✅ YENİ: Tam Ekran Butonu */}
    <Button
      variant="outline"
      size="sm"
      className="gap-2 border-slate-600 hover:bg-slate-800 text-slate-300"
      onClick={toggleFullScreen}
    >
      {isFullScreen ? (
        <>
          <Minimize2 className="h-4 w-4" />
          Küçült
        </>
      ) : (
        <>
          <Maximize2 className="h-4 w-4" />
          Tam Ekran
        </>
      )}
    </Button>

    {assessment && (
      <>
        <Separator orientation="vertical" className="h-6 bg-slate-600" />
        
        <Badge variant="outline" className="gap-2 border-slate-600 text-slate-300">
          <Building2 className="h-3 w-3" />
          {companies.find(c => c.id === assessment.company_id)?.name || "Firma"}
        </Badge>
        <Badge variant="outline" className="gap-2 border-slate-600 text-slate-300">
          <FileText className="h-3 w-3" />
          {assessment.id.substring(0, 8).toUpperCase()}
        </Badge>
      </>
    )}

    <Separator orientation="vertical" className="h-6 bg-slate-600" />

    <Button
      variant="outline"
      size="sm"
      className="gap-2 border-slate-600 hover:bg-slate-800"
      onClick={exportToExcel}
      disabled={!assessment || riskItems.length === 0}
    >
      <Download className="h-4 w-4" />
      Excel
    </Button>

    <Button
      size="sm"
      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
      onClick={exportToPDF}
      disabled={!assessment || riskItems.length === 0}
    >
      <Download className="h-4 w-4" />
      PDF İndir
    </Button>
  </div>
</div>
      {/* MAIN CONTENT */}
      {!assessment ? (
        // ========================
        // STEP 1: COMPANY SELECTION
        // ========================
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl bg-slate-900/50 border-slate-700">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-indigo-400" />
                <h2 className="text-2xl font-bold text-slate-100 mb-2">
                  1. Firma & Rapor Bilgileri
                </h2>
                <p className="text-sm text-slate-400">
                  Kayıtlı firmalarınızdan birini seçin ve rapor tarihini girin
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300 mb-2 block">Firma Seçin</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Firma seçiniz..." />
                    </SelectTrigger>
                    <SelectContent 
                    position="popper" 
                    onCloseAutoFocus={(e) => e.preventDefault()} // 👈 Burası hayati!
                    >
                      {companies.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Kayıtlı firma yok
                        </SelectItem>
                      ) : (
                        companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={createAssessment}
                  disabled={!selectedCompany || loading}
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Yeni Değerlendirme Başlat
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // ========================
        // STEP 2: RISK ANALYSIS TABLE
        // ========================
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: Risk Library */}
          <div className="w-80 shrink-0">
            <RiskLibraryPanel />
          </div>

        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Table Toolbar */}
            <div className="h-14 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-2 border-slate-600 text-slate-300">
                    <FileText className="h-3 w-3" />
                    {riskItems.length} Risk Maddesi
                </Badge>

                {riskItems.length > 0 && (
                    <>
                    <Separator orientation="vertical" className="h-4 bg-slate-600" />
                    <Badge className="bg-red-600/20 text-red-300 border-red-600">
                        {riskItems.filter(i => i.risk_class_1 === "Çok Yüksek").length} Kritik
                    </Badge>
                    <Badge className="bg-orange-600/20 text-orange-300 border-orange-600">
                        {riskItems.filter(i => i.risk_class_1 === "Yüksek").length} Yüksek
                    </Badge>
                    <Badge className="bg-green-600/20 text-green-300 border-green-600">
                        {riskItems.filter(i => (i.risk_class_2 === "Kabul Edilebilir" || i.risk_class_2 === "Olası")).length} Güvenli
                    </Badge>
                    </>
                )}
                </div>

                <Button
                onClick={addEmptyRisk}
                size="sm"
                variant="outline"
                className="gap-2 border-slate-600 hover:bg-slate-800"
                disabled={!assessment}
                >
                <Plus className="h-4 w-4" />
                Manuel Risk Ekle
                </Button>
            </div>
            <div className="flex-1 relative overflow-hidden"> {/* overflow-hidden ekledik */}
            <div 
                ref={tableContainerRef} 
                className="absolute inset-0 overflow-auto scroll-smooth" // absolute inset-0 ve smooth scroll
                onScroll={handleScroll} // Callback'i tekrar buraya bağlayalım
            >
                <RiskAnalysisTable />
            </div>
            </div>
         </div>
       </div>
      )}
        {/* ✅ YENİ: AI Results Dialog */}
        <AIResultsDialog />

         <HelpDialog />
    </div>
  );
}