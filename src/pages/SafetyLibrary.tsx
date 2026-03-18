import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CircleHelp,
  Download,
  Factory,
  FileText,
  Filter,
  FolderArchive,
  HardHat,
  Info,
  Loader2,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type RiskLevel = "low" | "medium" | "high" | "critical";
type LibraryTab = "library" | "archive";

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
  displayName: string;
  url: string;
  created_at: string;
  size: number;
}

interface SearchHazard extends Hazard {
  categoryLabel: string;
}

const defaultCategories: Category[] = [
  {
    id: "construction",
    label: "İnşaat",
    icon: HardHat,
    color: "from-amber-500/20 via-orange-500/20 to-red-500/20",
    hazards: [
      {
        id: "fall-height",
        category_id: "construction",
        name: "Yüksekten düşme",
        riskLevel: "high",
        prevention:
          "Korkuluk sistemi kurun, emniyet kemeri kullanın ve iskeleleri günlük olarak kontrol edin.",
        regulation:
          "Yüksekte Çalışma Yönetmelikleri ve 6331 sayılı Kanun ilgili hükümleri",
        details:
          "Yüksekten düşme, inşaat sektöründeki en kritik ölümcül kaza nedenlerinden biridir. Çalışma alanında toplu koruma önlemleri önceliklendirilmelidir.",
      },
    ],
  },
  {
    id: "office",
    label: "Ofis",
    icon: Building2,
    color: "from-sky-500/20 via-blue-500/20 to-cyan-500/20",
    hazards: [
      {
        id: "ergonomic-strain",
        category_id: "office",
        name: "Ergonomik zorlanma",
        riskLevel: "medium",
        prevention:
          "Ayarlanabilir sandalye sağlayın, ekranı göz hizasında konumlandırın ve düzenli mola planı uygulayın.",
        regulation:
          "Ekranlı Araçlarla Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik",
        details:
          "Uzun süre masa başında çalışma; boyun, sırt ve bel ağrısı ile tekrarlayan zorlanma rahatsızlıklarına neden olabilir.",
      },
    ],
  },
  {
    id: "factory",
    label: "Üretim Tesisi",
    icon: Factory,
    color: "from-rose-500/20 via-red-500/20 to-fuchsia-500/20",
    hazards: [
      {
        id: "machine-entanglement",
        category_id: "factory",
        name: "Makineye kaptırma",
        riskLevel: "critical",
        prevention:
          "Hareketli parçalarda koruyucu ekipman kullanın, lock-out/tag-out prosedürünü uygulayın ve operatör eğitimlerini güncel tutun.",
        regulation:
          "Makine Emniyeti Yönetmeliği ve 6331 sayılı Kanun ilgili hükümleri",
        details:
          "Döner parçalar, kayış-kasnak sistemleri ve açık transmisyon elemanları ciddi ezilme ve amputasyon riski oluşturur.",
      },
    ],
  },
];

const emptyHazardForm = {
  name: "",
  categoryId: "construction",
  categoryLabel: "İnşaat",
  riskLevel: "medium" as RiskLevel,
  prevention: "",
  regulation: "",
  details: "",
};

const getArchiveDisplayName = (storedName: string) => {
  if (storedName.includes("__")) {
    const parts = storedName.split("__");
    return parts.slice(1).join("__") || storedName;
  }

  return storedName;
};

export default function SafetyLibrary() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<LibraryTab>("library");
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selectedHazard, setSelectedHazard] = useState<SearchHazard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [newHazard, setNewHazard] = useState(emptyHazardForm);

  useEffect(() => {
    void fetchHazards();
  }, []);

  useEffect(() => {
    if (activeTab === "archive") {
      void fetchFiles();
    }
  }, [activeTab]);

  const fetchHazards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("safety_library").select("*");
      if (error) throw error;

      const mergedCategories = defaultCategories.map((category) => ({
        ...category,
        hazards: [...category.hazards],
      }));

      (data || []).forEach((item) => {
        const hazard: Hazard = {
          id: item.id,
          category_id: item.category_id,
          name: item.hazard_name,
          riskLevel: item.risk_level as RiskLevel,
          prevention: item.prevention_text,
          regulation: item.regulation || "Belirtilmemiş",
          details: item.details || "Detay girilmemiş.",
        };

        const categoryIndex = mergedCategories.findIndex(
          (category) => category.id === item.category_id,
        );

        if (categoryIndex >= 0) {
          if (
            !mergedCategories[categoryIndex].hazards.some(
              (existingHazard) => existingHazard.id === hazard.id,
            )
          ) {
            mergedCategories[categoryIndex].hazards.push(hazard);
          }
          return;
        }

        mergedCategories.push({
          id: item.category_id,
          label: item.category_label || item.category_id,
          icon: BookOpen,
          color: "from-slate-500/20 via-slate-400/10 to-zinc-500/20",
          hazards: [hazard],
        });
      });

      setCategories(mergedCategories);
    } catch (error) {
      console.error("Safety library fetch failed:", error);
      toast.error(
        "Kütüphane verileri yüklenemedi. Varsayılan içerik gösteriliyor.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    setArchiveLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("safety_documents")
        .list();
      if (error) throw error;

      const fileList = (data || [])
        .filter((file) => file.name !== ".emptyFolderPlaceholder")
        .map((file) => {
          const { data: urlData } = supabase.storage
            .from("safety_documents")
            .getPublicUrl(file.name);
          return {
            name: file.name,
            displayName: getArchiveDisplayName(file.name),
            url: urlData.publicUrl,
            created_at: file.created_at,
            size: file.metadata?.size || 0,
          };
        })
        .sort(
          (left, right) =>
            new Date(right.created_at).getTime() -
            new Date(left.created_at).getTime(),
        );

      setFiles(fileList);
    } catch (error) {
      console.error("Safety documents fetch failed:", error);
      toast.error("Dosya arşivi şu anda yüklenemedi.");
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleAddHazard = async (event: FormEvent) => {
    event.preventDefault();

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

      toast.success("Yeni tehlike kütüphaneye eklendi.");
      setAddModalOpen(false);
      setNewHazard(emptyHazardForm);
      await fetchHazards();
    } catch (error: any) {
      toast.error(
        error?.message
          ? `Tehlike eklenemedi: ${error.message}`
          : "Tehlike eklenemedi.",
      );
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const safeOriginalName = file.name
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, " ")
        .trim();
      const fileName = `${Date.now()}__${safeOriginalName}`;
      const { error } = await supabase.storage
        .from("safety_documents")
        .upload(fileName, file);
      if (error) throw error;

      toast.success("Dosya başarıyla yüklendi.");
      await fetchFiles();
    } catch (error) {
      console.error("Safety document upload failed:", error);
      toast.error(
        "Dosya yüklenemedi. 'safety_documents' bucket ayarlarını kontrol edin.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from("safety_documents")
        .remove([fileName]);
      if (error) throw error;

      toast.success("Dosya arşivden kaldırıldı.");
      await fetchFiles();
    } catch (error) {
      console.error("Safety document delete failed:", error);
      toast.error("Dosya silinemedi.");
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "medium":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "high":
        return "bg-orange-500/15 text-orange-300 border-orange-500/30";
      case "critical":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      default:
        return "bg-slate-500/15 text-slate-300 border-slate-500/30";
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

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (value?: string) => {
    if (!value) return "Tarih yok";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Tarih yok";
    return parsed.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const allHazards = useMemo<SearchHazard[]>(() => {
    const categoryPool = activeCategory
      ? categories.filter((category) => category.id === activeCategory)
      : categories;

    return categoryPool.flatMap((category) =>
      category.hazards.map((hazard) => ({
        ...hazard,
        categoryLabel: category.label,
      })),
    );
  }, [activeCategory, categories]);

  const searchResults = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allHazards.filter((hazard) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        hazard.name.toLowerCase().includes(normalizedSearch) ||
        hazard.details.toLowerCase().includes(normalizedSearch) ||
        hazard.regulation.toLowerCase().includes(normalizedSearch) ||
        hazard.prevention.toLowerCase().includes(normalizedSearch);

      const matchesRisk =
        riskFilter === "all" || hazard.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [allHazards, riskFilter, search]);

  const selectedCategory =
    categories.find((category) => category.id === activeCategory) || null;
  const totalHazards = categories.reduce(
    (total, category) => total + category.hazards.length,
    0,
  );

  const handleStartInspection = (hazard: Hazard) => {
    if (!hazard?.name) {
      toast.error("Tehlike verisi eksik. Denetim başlatılamadı.");
      return;
    }

    const prefilledNotes = `Tehlike: ${hazard.name}\nÖnleme yöntemi: ${hazard.prevention}`;
    navigate("/inspections", {
      state: {
        prefilledNotes,
        hazardName: hazard.name,
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8">
          <div className="h-8 w-64 animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-4 w-[28rem] animate-pulse rounded bg-slate-900" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70"
            />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="h-[420px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(17,24,39,0.96))] p-8 shadow-2xl shadow-slate-950/40">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.10),_transparent_70%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge className="border-blue-500/30 bg-blue-500/15 text-blue-200">
              Kurumsal Bilgi Merkezi
            </Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                İSG Kütüphanesi
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Riskleri, önleyici aksiyonları ve ilgili mevzuatı tek merkezden
                yönetin. Sahaya çıkmadan önce doğru riski seçin, denetimi
                doğrudan ilgili kayıtla başlatın ve kurum dokümanlarını arşivde
                yönetin.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px] xl:max-w-[480px]">
            <Card className="border-slate-800 bg-slate-900/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Kategori
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {categories.length}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Tanımlı sektör ve çalışma alanı
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-slate-900/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Tehlike
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {totalHazards}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Kütüphanedeki aktif risk kaydı
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-slate-900/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Arşiv
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {files.length}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Yüklenmiş doküman ve form
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-2xl border border-slate-800 bg-slate-950/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === "library"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Kütüphane
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archive")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === "archive"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Doküman Arşivi
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => navigate("/safety-library/guide")}
            className="gap-2 border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900 hover:text-white"
          >
            <CircleHelp className="h-4 w-4" />
            Nasıl kullanılır?
          </Button>

          {activeTab === "library" ? (
            <Button
              onClick={() => setAddModalOpen(true)}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Yeni tehlike ekle
            </Button>
          ) : (
            <label htmlFor="safety-doc-upload">
              <Button
                asChild
                className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
                disabled={uploading}
              >
                <span>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  Doküman yükle
                </span>
              </Button>
            </label>
          )}
        </div>
      </div>

      {activeTab === "library" ? (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="border-slate-800 bg-slate-950/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-white">
                Sektör ve kategori seçimi
              </CardTitle>
              <CardDescription>
                Tehlike havuzunu kategori bazında daraltın veya tüm
                kütüphanede arama yapın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  activeCategory === null
                    ? "border-blue-500/40 bg-blue-500/10 text-white"
                    : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Tüm kategoriler</p>
                    <p className="text-xs text-slate-400">
                      Merkezi arama ve filtre görünümü
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-slate-700 text-slate-300"
                  >
                    {totalHazards}
                  </Badge>
                </div>
              </button>

              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-blue-500/40 bg-blue-500/10 text-white shadow-lg shadow-blue-900/20"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${category.color}`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {category.label}
                        </p>
                        <p className="text-xs text-slate-400">
                          {category.hazards.length} kayıt
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-slate-800 bg-slate-950/70">
              <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tehlike adı, detay, mevzuat veya önlem metni ara"
                    className="border-slate-800 bg-slate-900 pl-9 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={riskFilter}
                    onChange={(event) => setRiskFilter(event.target.value)}
                    className="bg-transparent text-sm text-white outline-none"
                  >
                    <option value="all">Tüm risk seviyeleri</option>
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="critical">Kritik</option>
                  </select>
                </div>

                {activeCategory && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveCategory(null);
                      setSearch("");
                    }}
                    className="gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" /> Filtreyi temizle
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">
                  {selectedCategory
                    ? `${selectedCategory.label} tehlike listesi`
                    : "Kurumsal tehlike kütüphanesi"}
                </CardTitle>
                <CardDescription>
                  {searchResults.length} sonuç bulundu. Her kayıt için detay,
                  mevzuat ve doğrudan denetim başlatma aksiyonu hazır.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {searchResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 px-6 py-12 text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-slate-500" />
                    <p className="mt-3 text-sm font-medium text-slate-200">
                      Kriterlere uygun tehlike bulunamadı.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Arama ifadesini veya risk filtresini değiştirin.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {searchResults.map((hazard) => (
                      <Card
                        key={hazard.id}
                        className="border-slate-800 bg-slate-900/70 transition hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-950/20"
                      >
                        <CardContent className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-slate-700 text-slate-300"
                                >
                                  {hazard.categoryLabel}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={getRiskColor(hazard.riskLevel)}
                                >
                                  {getRiskLabel(hazard.riskLevel)} risk
                                </Badge>
                              </div>
                              <h3 className="mt-3 text-base font-semibold text-white">
                                {hazard.name}
                              </h3>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-400 hover:bg-slate-800 hover:text-white"
                              onClick={() => {
                                setSelectedHazard(hazard);
                                setDialogOpen(true);
                              }}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>

                          <p className="line-clamp-3 text-sm leading-6 text-slate-300">
                            {hazard.prevention}
                          </p>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              İlgili mevzuat
                            </p>
                            <p className="mt-1 text-xs text-slate-300">
                              {hazard.regulation}
                            </p>
                          </div>

                          <Button
                            className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => handleStartInspection(hazard)}
                          >
                            Denetim başlat
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="file"
            id="safety-doc-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />

          <Card className="border-slate-800 bg-slate-950/70">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Doküman arşivi
              </CardTitle>
              <CardDescription>
                Prosedürler, talimatlar, formlar ve kurum içi İSG dokümanlarını
                merkezi arşivde yönetin.
              </CardDescription>
            </CardHeader>
          </Card>

          {archiveLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70"
                />
              ))}
            </div>
          ) : files.length === 0 ? (
            <Card className="border-dashed border-slate-800 bg-slate-950/70">
              <CardContent className="px-6 py-14 text-center">
                <FolderArchive className="mx-auto h-10 w-10 text-slate-500" />
                <p className="mt-4 text-sm font-medium text-slate-200">
                  Henüz yüklenmiş doküman yok.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  İlk form, prosedür veya rehber dokümanınızı yükleyerek arşivi
                  başlatın.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {files.map((file) => (
                <Card
                  key={file.name}
                  className="border-slate-800 bg-slate-950/70 transition hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-950/20"
                >
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-semibold text-white"
                          title={file.displayName}
                        >
                          {file.displayName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatFileSize(file.size)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-slate-300 hover:bg-slate-800 hover:text-white"
                        onClick={() =>
                          window.open(file.url, "_blank", "noopener,noreferrer")
                        }
                      >
                        <Download className="h-4 w-4" /> İndir
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                        onClick={() => handleDeleteFile(file.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertCircle className="h-5 w-5 text-rose-400" />
              {selectedHazard?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Tehlike detayı, önlem yaklaşımı ve mevzuat dayanağı tek ekranda.
            </DialogDescription>
          </DialogHeader>

          {selectedHazard && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-slate-700 text-slate-300"
                >
                  {selectedHazard.categoryLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={getRiskColor(selectedHazard.riskLevel)}
                >
                  {getRiskLabel(selectedHazard.riskLevel)}
                </Badge>
              </div>

              <div className="grid gap-4">
                <Card className="border-slate-800 bg-slate-900/60">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-white">
                      Tehlike açıklaması
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selectedHazard.details}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/60">
                  <CardContent className="p-4">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                      <BookOpen className="h-4 w-4 text-blue-300" /> Önleme
                      yöntemi
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selectedHazard.prevention}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-amber-500/20 bg-amber-500/10">
                  <CardContent className="p-4">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                      <AlertTriangle className="h-4 w-4" /> İlgili mevzuat
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-amber-100/90">
                      {selectedHazard.regulation}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Button
                className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  handleStartInspection(selectedHazard);
                  setDialogOpen(false);
                }}
              >
                Bu kayıtla denetim başlat
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-2xl border-slate-800 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Yeni tehlike ekle
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Kütüphaneye yeni risk tanımı, önlem yöntemi ve mevzuat dayanağı
              ekleyin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddHazard} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Tehlike adı
              </label>
              <Input
                required
                placeholder="Örn: Açık elektrik panosu"
                value={newHazard.name}
                onChange={(event) =>
                  setNewHazard((prev) => ({ ...prev, name: event.target.value }))
                }
                className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Kategori
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                  value={newHazard.categoryId}
                  onChange={(event) => {
                    const selected = categories.find(
                      (category) => category.id === event.target.value,
                    );
                    setNewHazard((prev) => ({
                      ...prev,
                      categoryId: event.target.value,
                      categoryLabel: selected?.label || event.target.value,
                    }));
                  }}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Risk seviyesi
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                  value={newHazard.riskLevel}
                  onChange={(event) =>
                    setNewHazard((prev) => ({
                      ...prev,
                      riskLevel: event.target.value as RiskLevel,
                    }))
                  }
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                  <option value="critical">Kritik</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Önleme yöntemi
              </label>
              <Textarea
                required
                placeholder="Alınacak tedbirler ve uygulanacak kontroller"
                value={newHazard.prevention}
                onChange={(event) =>
                  setNewHazard((prev) => ({
                    ...prev,
                    prevention: event.target.value,
                  }))
                }
                className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                İlgili mevzuat
              </label>
              <Input
                required
                placeholder="Örn: 6331 sayılı Kanun, ilgili yönetmelik veya iç prosedür"
                value={newHazard.regulation}
                onChange={(event) =>
                  setNewHazard((prev) => ({
                    ...prev,
                    regulation: event.target.value,
                  }))
                }
                className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Detaylı açıklama
              </label>
              <Textarea
                placeholder="Tehlikenin oluşma şekli, etkisi ve sahadaki tipik örnekler"
                value={newHazard.details}
                onChange={(event) =>
                  setNewHazard((prev) => ({
                    ...prev,
                    details: event.target.value,
                  }))
                }
                className="min-h-[120px] border-slate-800 bg-slate-900 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Kaydet
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
