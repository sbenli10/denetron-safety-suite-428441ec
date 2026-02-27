import { useState, useEffect, FormEvent } from "react";
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
  Plus,
  FolderArchive,
  UploadCloud,
  FileText,
  Download,
  Trash2,
  Filter,
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
  category_id?: string;
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

interface ArchiveFile {
  name: string;
  url: string;
  created_at: string;
  size: number;
}

const defaultCategories: Category[] = [
  {
    id: "construction",
    label: "İnşaat",
    icon: HardHat,
    color: "from-yellow-500 to-orange-500",
    hazards: [
      {
        id: "fall-height",
        category_id: "construction",
        name: "Yüksekten Düşme",
        riskLevel: "high" as RiskLevel,
        prevention: "Korkuluk kur, emniyet kemeri kullan, yapı iskelesi günlük denetle.",
        regulation: "İSG Kanunu Md. 13-14 - Yüksekte Çalışma",
        details: "Yüksekten düşme, inşaat sektöründe en sık karşılaşılan ölümcül kazalardan biridir. Minimum 1.1m yükseklikte korkuluk veya emniyet ağı kullanılmalıdır.",
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
        category_id: "office",
        name: "Ergonomik Strain",
        riskLevel: "medium" as RiskLevel,
        prevention: "Ayarlanabilir sandalye sağla, monitör göz hizasında olsun, her saatte ara ver.",
        regulation: "6331 Sayılı Kanun - Ekran Başında Çalışma",
        details: "Uzun süreli ofis çalışması boyun, sırt ve bel ağrılarına neden olabilir. Ergonomik değerlendirme yapılmalıdır.",
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
        category_id: "factory",
        name: "Makine Dolanması",
        riskLevel: "critical" as RiskLevel,
        prevention: "Hareketli parçalara koruma koy, lock-out/tag-out uygula, operatör eğitimi ver.",
        regulation: "İSG Kanunu Md. 29 - Makine Güvenliği",
        details: "Döner makine parçalarına kimse yaklaşmamalıdır. Bakım sırasında kesinlikle lock-out/tag-out uygulanmalıdır.",
      },
    ],
  },
];

export default function SafetyLibrary() {
  const navigate = useNavigate();
  // View State
  const [activeTab, setActiveTab] = useState<"library" | "archive">("library");

  // Hazards State
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  
  // Modal States
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Files State
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [newHazard, setNewHazard] = useState({
    name: "",
    categoryId: "construction",
    categoryLabel: "İnşaat",
    riskLevel: "medium",
    prevention: "",
    regulation: "",
    details: "",
  });

  useEffect(() => {
    fetchHazards();
    if (activeTab === "archive") {
      fetchFiles();
    }
  }, [activeTab]);

  // ==========================================
  // 1. VERİTABANI: TEHLİKELERİ ÇEKME
  // ==========================================
  const fetchHazards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("safety_library").select("*");
      
      if (error) throw error;

      let mergedCategories = [...defaultCategories];

      if (data && data.length > 0) {
        data.forEach((item) => {
          const hazard: Hazard = {
            id: item.id,
            category_id: item.category_id,
            name: item.hazard_name,
            riskLevel: item.risk_level as RiskLevel,
            prevention: item.prevention_text,
            regulation: item.regulation || "Belirtilmemiş",
            details: item.details || "Detay yok.",
          };

          const catIndex = mergedCategories.findIndex(c => c.id === item.category_id);
          
          if (catIndex > -1) {
            // Eğer kategori varsa ve bu tehlike eklenmemişse ekle
            if (!mergedCategories[catIndex].hazards.find(h => h.id === hazard.id)) {
              mergedCategories[catIndex].hazards.push(hazard);
            }
          } else {
            // Yeni dinamik kategori oluştur
            mergedCategories.push({
              id: item.category_id,
              label: item.category_label || item.category_id,
              icon: BookOpen, // Varsayılan ikon
              color: "from-slate-500 to-gray-500",
              hazards: [hazard]
            });
          }
        });
      }
      setCategories(mergedCategories);
    } catch (err: any) {
      console.error("Fetch hatası:", err);
      toast.error("Veriler çekilirken hata oluştu, varsayılanlar gösteriliyor.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. VERİTABANI: YENİ TEHLİKE EKLEME
  // ==========================================
  const handleAddHazard = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("safety_library").insert({
        category_id: newHazard.categoryId,
        category_label: newHazard.categoryLabel,
        hazard_name: newHazard.name,
        prevention_text: newHazard.prevention,
        risk_level: newHazard.riskLevel,
        regulation: newHazard.regulation,
        details: newHazard.details,
      });

      if (error) throw error;

      toast.success("Yeni tehlike başarıyla eklendi!");
      setAddModalOpen(false);
      fetchHazards(); // Listeyi güncelle
      
      // Formu sıfırla
      setNewHazard({ name: "", categoryId: "construction", categoryLabel: "İnşaat", riskLevel: "medium", prevention: "", regulation: "", details: "" });
    } catch (err: any) {
      toast.error("Tehlike eklenemedi: " + err.message);
    }
  };

  // ==========================================
  // 3. DOSYA ARŞİVİ: STORAGE İŞLEMLERİ
  // ==========================================
  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase.storage.from("safety_documents").list();
      if (error) throw error;

      if (data) {
        const fileList = data.map(file => {
          const { data: urlData } = supabase.storage.from("safety_documents").getPublicUrl(file.name);
          return {
            name: file.name,
            url: urlData.publicUrl,
            created_at: file.created_at,
            size: file.metadata?.size || 0
          };
        }).filter(f => f.name !== ".emptyFolderPlaceholder");
        
        setFiles(fileList);
      }
    } catch (err: any) {
      console.error("Dosyalar çekilemedi:", err);
      // Bucket yoksa hata vermemesi için sessizce geç veya bilgi ver
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage.from("safety_documents").upload(fileName, file);
      if (error) throw error;

      toast.success("Dosya başarıyla yüklendi");
      fetchFiles();
    } catch (err: any) {
      toast.error("Dosya yüklenemedi. 'safety_documents' bucket'ı kontrol edin.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    try {
      const { error } = await supabase.storage.from("safety_documents").remove([fileName]);
      if (error) throw error;
      toast.success("Dosya silindi");
      fetchFiles();
    } catch (err: any) {
      toast.error("Dosya silinemedi.");
    }
  };

  // ==========================================
  // YARDIMCI FONKSİYONLAR
  // ==========================================
  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case "low": return "bg-success/15 text-success border-success/30";
      case "medium": return "bg-warning/15 text-warning border-warning/30";
      case "high": return "bg-orange-500/15 text-orange-500 border-orange-500/30";
      case "critical": return "bg-destructive/15 text-destructive border-destructive/30";
      default: return "bg-secondary/15 text-foreground";
    }
  };

  const getRiskLabel = (level: RiskLevel) => {
    switch (level) {
      case "low": return "Düşük";
      case "medium": return "Orta";
      case "high": return "Yüksek";
      case "critical": return "Kritik";
      default: return "Bilinmiyor";
    }
  };

  // 🔍 Gelişmiş Arama ve Filtreleme
  const filteredCategories = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  const allHazards = filteredCategories.flatMap((cat) =>
    cat.hazards.map((h) => ({ ...h, categoryLabel: cat.label }))
  );

  const searchResults = allHazards.filter(h => {
    const term = search.toLowerCase();
    const matchesSearch = 
      h.name.toLowerCase().includes(term) || 
      h.details.toLowerCase().includes(term) || 
      h.regulation.toLowerCase().includes(term);
    
    const matchesRisk = riskFilter === "all" || h.riskLevel === riskFilter;

    return matchesSearch && matchesRisk;
  });

  const handleStartInspection = (hazard: Hazard) => {
    // Güvenlik (Guard Clause)
    if (!hazard || !hazard.name) {
      toast.error("Tehlike verisi eksik. Denetim başlatılamadı.");
      return;
    }

    const prefilledNotes = `Tehlike: ${hazard.name}\nÖnleme Yöntemi: ${hazard.prevention}`;
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
          <p className="text-sm text-muted-foreground">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER & TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">İSG Kütüphanesi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tehlikeleri inceleyin, denetim başlatın ve belgelerinizi arşivleyin
          </p>
        </div>
        
        <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
          <button
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "library" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" /> Kütüphane
          </button>
          <button
            onClick={() => setActiveTab("archive")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "archive" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderArchive className="h-4 w-4" /> Dosya Arşivi
          </button>
        </div>
      </div>

      {activeTab === "library" && (
        <>
          {/* SEARCH, FILTER & ADD ACTIONS */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 items-center gap-2 w-full max-w-2xl">
              {activeCategory && (
                <Button variant="outline" size="icon" onClick={() => { setActiveCategory(null); setSearch(""); }}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="İsim, detay veya mevzuat ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-card border-border"
                />
              </div>

              {/* Risk Filtresi */}
              <div className="hidden sm:flex items-center bg-card border border-border rounded-md px-2 h-10">
                <Filter className="h-4 w-4 text-muted-foreground mr-2" />
                <select 
                  value={riskFilter} 
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none"
                >
                  <option value="all">Tüm Riskler</option>
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                  <option value="critical">Kritik</option>
                </select>
              </div>
            </div>

            <Button onClick={() => setAddModalOpen(true)} className="w-full md:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" /> Yeni Tehlike Ekle
            </Button>
          </div>

          {/* KATEGORİLER GRID */}
          {!activeCategory ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="glass-card p-8 flex flex-col items-center gap-4 hover:border-primary/40 transition-all duration-300 group hover:shadow-lg hover:-translate-y-1"
                  >
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} group-hover:scale-110 transition-transform text-white`}>
                      <IconComponent className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.hazards.length} tehlike</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* TEHLİKE LİSTESİ */
            <div className="space-y-4">
              <div className="glass-card p-4 bg-secondary/30 border border-border/50">
                <div className="flex items-center gap-3">
                  {category && (
                    <>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${category.color} text-white`}>
                        <category.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">{category.label}</h2>
                        <p className="text-xs text-muted-foreground">Bu kategoride {searchResults.length} sonuç bulundu.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((hazard) => (
                    <div key={hazard.id} className="glass-card p-5 space-y-3 border border-border/50 hover:border-primary/30 transition-all group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">{hazard.name}</h3>
                          <Badge variant="outline" className={`mt-2 inline-flex ${getRiskColor(hazard.riskLevel)}`}>
                            {getRiskLabel(hazard.riskLevel)} Risk
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSelectedHazard(hazard); setDialogOpen(true); }}>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{hazard.prevention}</p>
                      <Button size="sm" className="w-full gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border/50" onClick={() => handleStartInspection(hazard)}>
                        Denetim Başlat <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 glass-card">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Kriterlere uygun tehlike bulunamadı.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===================================== */}
      {/* DOSYA ARŞİVİ SEKME İÇERİĞİ           */}
      {/* ===================================== */}
      {activeTab === "archive" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
            <div>
              <h3 className="font-semibold text-foreground">Sistem Belgeleri</h3>
              <p className="text-xs text-muted-foreground">ISG prosedürleri, formlar ve kılavuzlar.</p>
            </div>
            <div>
              <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              <label htmlFor="file-upload">
                <Button asChild variant="default" className="gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white" disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    Dosya Yükle
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.length === 0 && !uploading ? (
              <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl border-border/50">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Henüz dosya yüklenmemiş.</p>
              </div>
            ) : (
              files.map((file, idx) => (
                <div key={idx} className="flex flex-col p-4 bg-card border border-border/50 rounded-xl hover:shadow-md transition-shadow group relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate" title={file.name}>{file.name.split('_')[0]}</p>
                      <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-3">
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => window.open(file.url, "_blank")}>
                      <Download className="h-3.5 w-3.5" /> İndir
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteFile(file.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================== */}
      {/* MODALLAR                             */}
      {/* ===================================== */}

      {/* 📋 Detay Modalı */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {selectedHazard?.name}
            </DialogTitle>
            <DialogDescription>Tehlike detayları ve mevzuat bilgileri</DialogDescription>
          </DialogHeader>
          {selectedHazard && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Risk Seviyesi</h4>
                <Badge className={`inline-flex ${getRiskColor(selectedHazard.riskLevel)}`}>{getRiskLabel(selectedHazard.riskLevel)}</Badge>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Tehlike Açıklaması</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedHazard.details}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Önleme Yöntemi</h4>
                <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">{selectedHazard.prevention}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> İlgili Mevzuat</h4>
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-warning">{selectedHazard.regulation}</p>
                </div>
              </div>
              <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { handleStartInspection(selectedHazard); setDialogOpen(false); }}>
                Bu Tehlikeyle Denetim Başlat <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ➕ Yeni Tehlike Ekle Modalı */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Tehlike Ekle</DialogTitle>
            <DialogDescription>Kütüphaneye yeni bir risk tanımı ve önleme yöntemi ekleyin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddHazard} className="space-y-4 mt-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Tehlike Adı</label>
              <Input required placeholder="Örn: Açık Elektrik Panosu" value={newHazard.name} onChange={(e) => setNewHazard({...newHazard, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Kategori</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newHazard.categoryId}
                  onChange={(e) => {
                    const selCat = categories.find(c => c.id === e.target.value);
                    setNewHazard({...newHazard, categoryId: e.target.value, categoryLabel: selCat?.label || e.target.value});
                  }}
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Risk Seviyesi</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newHazard.riskLevel}
                  onChange={(e) => setNewHazard({...newHazard, riskLevel: e.target.value as RiskLevel})}
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                  <option value="critical">Kritik</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Önleme Yöntemi</label>
              <Input required placeholder="Alınacak tedbirler..." value={newHazard.prevention} onChange={(e) => setNewHazard({...newHazard, prevention: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">İlgili Mevzuat</label>
              <Input required placeholder="Örn: İSG Kanunu Md. X..." value={newHazard.regulation} onChange={(e) => setNewHazard({...newHazard, regulation: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Detaylı Açıklama</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Tehlikenin oluşma şekli, potansiyel etkiler vb."
                value={newHazard.details}
                onChange={(e) => setNewHazard({...newHazard, details: e.target.value})}
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>İptal</Button>
              <Button type="submit">Kaydet</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}