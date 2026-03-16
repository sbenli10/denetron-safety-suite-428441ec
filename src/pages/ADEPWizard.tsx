// src/pages/ADEPWizard.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import {
  Building2,
  BookOpen,
  Users,
  AlertTriangle,
  Phone,
  FileText,
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  Share2,
  Loader2,
  CheckCircle2,
  Shield,
  Package,
  Activity,
  ClipboardCheck,
  Network,
  Scale,
  MapPin,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// ✅ Existing DB-first tabs
import ADEPGeneralInfo from "@/components/adep/ADEPGeneralInfo";
import ADEPLegislationTab from "@/components/adep/ADEPLegislationTab";
import ADEPTeamsTab from "@/components/adep/ADEPTeamsTab";
import ADEPScenariosTab from "@/components/adep/ADEPScenariosTab";
import ADEPContactsTab from "@/components/adep/ADEPContactsTab";

import ADEPPreventiveMeasuresTab from "@/components/adep/ADEPPreventiveMeasuresTab";
import ADEPEquipmentTab from "@/components/adep/ADEPEquipmentTab";
import ADEPDrillsTab from "@/components/adep/ADEPDrillsTab";
import ADEPChecklistsTab from "@/components/adep/ADEPChecklistsTab";
import ADEPRACITab from "@/components/adep/ADEPRACITab";
import ADEPLegalReferencesTab from "@/components/adep/ADEPLegalReferencesTab";
import ADEPRiskSourcesTab from "@/components/adep/ADEPRiskSourcesTab";
import { SendReportModal } from "@/components/SendReportModal";


// ✅ PDF Generator
import { generateADEPPDF } from "@/components/adep/ADEPPDFGenerator";

// ------------------------------------
// Types
// ------------------------------------
type HazardClass = "Az Tehlikeli" | "Tehlikeli" | "Çok Tehlikeli";
type ADEPStatus = "draft" | "completed";

type ADEPPlanData = {
  mevzuat: {
    amac: string;
    kapsam: string;
    dayanak: string;
    tanimlar: string;
  };
  genel_bilgiler: {
    hazirlayanlar: Array<{ unvan: string; ad_soyad: string }>;
    hazirlanma_tarihi: string;
    gecerlilik_tarihi: string;
    revizyon_no: string;
    revizyon_tarihi: string;
  };
  isyeri_bilgileri: {
    adres: string;
    telefon: string;
    tehlike_sinifi: string;
    sgk_sicil_no: string;
  };
  toplanma_yeri: {
    aciklama: string;
    harita_url: string;
  };
  export_preferences?: {
    cover_style:
      | "classic"
      | "gold"
      | "blueprint"
      | "minimal"
      | "nature"
      | "official-red"
      | "shadow";
  };
};

type ADEPPlanRow = {
  id?: string;
  user_id: string;
  plan_name: string;
  company_name: string;
  sector?: string | null;
  hazard_class: HazardClass;
  employee_count: number;
  status: ADEPStatus;
  completion_percentage: number;
  plan_data: ADEPPlanData;
  next_review_date?: string | null;
  pdf_url?: string | null;
};

const DEFAULT_PLAN_DATA: ADEPPlanData = {
  mevzuat: {
    amac:
      "Bu Acil Durum Eylem Planı (ADEP), işyerinde meydana gelebilecek acil durumlara karşı hazırlıklı olmak, can kaybını ve yaralanmaları önlemek, olası zararları en aza indirmek amacıyla hazırlanmıştır.",
    kapsam:
      "Bu plan işyerinde bulunan tüm çalışanları, ziyaretçileri ve taşeron personeli kapsar. İşyerindeki tüm bina/eklentiler, çalışma alanları ve ortak alanlar bu plan kapsamındadır.",
    dayanak:
      "6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve Acil Durumlar Hakkında Yönetmelik başta olmak üzere ilgili mevzuat hükümlerine dayanılarak hazırlanmıştır.",
    tanimlar:
      "Acil Durum: Yangın, patlama, kimyasal yayılım, doğal afet vb. durumlar.\nTahliye: Kişilerin güvenli alana kontrollü çıkarılması.\nToplanma Alanı: Tahliye sonrası yoklama yapılan güvenli bölge.\nEkip Lideri: Müdahale ekiplerinin koordinasyonundan sorumlu kişi.",
  },
  genel_bilgiler: {
    hazirlayanlar: [{ unvan: "", ad_soyad: "" }],
    hazirlanma_tarihi: "",
    gecerlilik_tarihi: "",
    revizyon_no: "Rev. 0",
    revizyon_tarihi: "",
  },
  isyeri_bilgileri: {
    adres: "",
    telefon: "",
    tehlike_sinifi: "Tehlikeli",
    sgk_sicil_no: "",
  },
  toplanma_yeri: {
    aciklama: "",
    harita_url: "",
  },
  export_preferences: {
    cover_style: "shadow",
  },
};

const ADEP_COVER_STYLES = [
  {
    value: "classic",
    title: "Klasik",
    description: "Sade ve resmi çerçeve düzeni",
    accent: "border-slate-400",
  },
  {
    value: "gold",
    title: "Altın",
    description: "Kurumsal ve prestijli altın çerçeve",
    accent: "border-amber-400",
  },
  {
    value: "blueprint",
    title: "Mavi Zarif",
    description: "Kurumsal mavi çizgiler ve net başlık hiyerarşisi",
    accent: "border-blue-400",
  },
  {
    value: "minimal",
    title: "Minimalist",
    description: "Düşük mürekkep ve temiz baskı görünümü",
    accent: "border-slate-300",
  },
  {
    value: "nature",
    title: "Yeşil Doğa",
    description: "Çevre ve saha operasyonlarına uyumlu görünüm",
    accent: "border-emerald-400",
  },
  {
    value: "official-red",
    title: "Kırmızı Resmi",
    description: "Mevzuat ve acil durum vurgusu yüksek kapak",
    accent: "border-red-400",
  },
  {
    value: "shadow",
    title: "Gölgeli",
    description: "3D gölge etkili güçlü kapak görünümü",
    accent: "border-orange-400",
  },
] as const;

// ✅ UPDATED: 13 Steps (6 basic + 7 AI modules)
const STEPS = [
  // === Core ADEP ===
  { id: 1, label: "İşyeri", icon: Building2, category: "core" },
  { id: 2, label: "Mevzuat", icon: BookOpen, category: "core" },
  { id: 3, label: "Ekipler", icon: Users, category: "core" },
  { id: 4, label: "Senaryolar", icon: AlertTriangle, category: "core" },
  { id: 5, label: "İletişim", icon: Phone, category: "core" },

  // === AI Modules ===
  { id: 6, label: "Önleyici Tedbir", icon: Shield, category: "ai" },
  { id: 7, label: "Ekipman", icon: Package, category: "ai" },
  { id: 8, label: "Tatbikatlar", icon: Activity, category: "ai" },
  { id: 9, label: "Checklist", icon: ClipboardCheck, category: "ai" },
  { id: 10, label: "RACI", icon: Network, category: "ai" },
  { id: 11, label: "Mevzuat Ref.", icon: Scale, category: "ai" },
  { id: 12, label: "Risk Kaynakları", icon: MapPin, category: "ai" },

  // === Final ===
  { id: 13, label: "PDF", icon: FileText, category: "final" },
] as const;

export default function ADEPWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [progressLoading, setProgressLoading] = useState<boolean>(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [currentReportUrl, setCurrentReportUrl] = useState("");
  const [currentReportFilename, setCurrentReportFilename] = useState("");

  const [planId, setPlanId] = useState<string | null>(null);
  const [planRow, setPlanRow] = useState<ADEPPlanRow | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const canUseWizard = !!user;

  // ------------------------------------
  // Helpers
  // ------------------------------------
  const ensureAuth = () => {
    if (!user) {
      toast.error("Oturum bulunamadı. Lütfen giriş yapın.");
      navigate("/auth");
      return false;
    }
    return true;
  };

  const safeMergePlanData = (incoming: any): ADEPPlanData => {
    const d = incoming || {};
    return {
      mevzuat: { ...DEFAULT_PLAN_DATA.mevzuat, ...(d.mevzuat || {}) },
      genel_bilgiler: {
        ...DEFAULT_PLAN_DATA.genel_bilgiler,
        ...(d.genel_bilgiler || {}),
        hazirlayanlar:
          Array.isArray(d?.genel_bilgiler?.hazirlayanlar) &&
          d.genel_bilgiler.hazirlayanlar.length > 0
            ? d.genel_bilgiler.hazirlayanlar
            : DEFAULT_PLAN_DATA.genel_bilgiler.hazirlayanlar,
      },
      isyeri_bilgileri: {
        ...DEFAULT_PLAN_DATA.isyeri_bilgileri,
        ...(d.isyeri_bilgileri || {}),
      },
      toplanma_yeri: {
        ...DEFAULT_PLAN_DATA.toplanma_yeri,
        ...(d.toplanma_yeri || {}),
      },
      export_preferences: {
        ...DEFAULT_PLAN_DATA.export_preferences!,
        ...(d.export_preferences || {}),
      },
    };
  };

  // ------------------------------------
  // Load existing plan
  // ------------------------------------
  useEffect(() => {
    if (!ensureAuth()) return;

    const id = searchParams.get("id");
    if (id) {
      void loadPlan(id);
    } else {
      const draft: ADEPPlanRow = {
        user_id: user!.id,
        plan_name: "",
        company_name: "",
        sector: null,
        hazard_class: "Tehlikeli",
        employee_count: 0,
        status: "draft",
        completion_percentage: 0,
        plan_data: DEFAULT_PLAN_DATA,
        next_review_date: null,
        pdf_url: null,
      };
      setPlanRow(draft);
      setPlanId(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPlan = async (id: string) => {
    if (!ensureAuth()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("adep_plans")
        .select("*")
        .eq("id", id)
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Plan bulunamadı");

      const merged: ADEPPlanRow = {
        ...(data as any),
        plan_data: safeMergePlanData((data as any).plan_data),
      };

      setPlanRow(merged);
      setPlanId((data as any).id);
      toast.success("Plan yüklendi");
    } catch (e: any) {
      console.error(e);
      toast.error("Plan yüklenemedi", {
        description: e.message || "Bilinmeyen hata",
      });
      navigate("/adep-plans");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------
  // Save plan
  // ------------------------------------
  const savePlan = async (opts?: {
    markCompleted?: boolean;
    silent?: boolean;
  }) => {
    if (!ensureAuth()) return null;
    if (!planRow) return null;

    const silent = !!opts?.silent;
    const markCompleted = !!opts?.markCompleted;

    if (!planRow.plan_name?.trim() || !planRow.company_name?.trim()) {
      if (!silent) toast.error("Plan adı ve firma adı zorunludur.");
      return null;
    }

    setSaving(true);
    if (!silent)
      toast.info(markCompleted ? "ADEP tamamlanıyor..." : "Kaydediliyor...");

    try {
      const payload: any = {
        user_id: user!.id,
        plan_name: planRow.plan_name,
        company_name: planRow.company_name,
        sector: planRow.sector ?? null,
        hazard_class: planRow.hazard_class,
        employee_count: planRow.employee_count,
        status: markCompleted ? "completed" : "draft",
        completion_percentage: planRow.completion_percentage ?? 0,
        plan_data: planRow.plan_data as any,
        next_review_date: planRow.next_review_date ?? null,
      };

      let saved: any;

      if (planId) {
        const { data, error } = await supabase
          .from("adep_plans")
          .update(payload)
          .eq("id", planId)
          .select()
          .single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase
          .from("adep_plans")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        saved = data;

        setPlanId(saved.id);
        setSearchParams({ id: saved.id }, { replace: true });
      }

      const merged: ADEPPlanRow = {
        ...(saved as any),
        plan_data: safeMergePlanData(saved.plan_data),
      };
      setPlanRow(merged);

      if (!silent) toast.success("Kaydedildi");
      return saved as ADEPPlanRow;
    } catch (e: any) {
      console.error(e);
      if (!silent)
        toast.error("Kaydetme hatası", {
          description: e.message || "Bilinmeyen hata",
        });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------
  // Progress calculation
  // ------------------------------------
  const refreshProgress = async (id: string, row: ADEPPlanRow) => {
    setProgressLoading(true);
    try {
      const baseMetaScore = (() => {
        let p = 0;
        if (row.plan_name?.trim()) p += 5;
        if (row.company_name?.trim()) p += 5;
        if (row.employee_count > 0) p += 3;
        if (row.hazard_class) p += 2;

        const pd = row.plan_data;
        if (pd?.isyeri_bilgileri?.adres?.trim()) p += 5;
        if (pd?.genel_bilgiler?.hazirlayanlar?.[0]?.ad_soyad?.trim()) p += 3;
        if (pd?.toplanma_yeri?.aciklama?.trim()) p += 2;

        const mevzuatFilled =
          !!pd?.mevzuat?.amac?.trim() &&
          !!pd?.mevzuat?.kapsam?.trim() &&
          !!pd?.mevzuat?.dayanak?.trim() &&
          !!pd?.mevzuat?.tanimlar?.trim();
        if (mevzuatFilled) p += 5;

        return Math.min(p, 30);
      })();

      // DB counts
      const [
        teamsRes,
        contactsRes,
        scenariosRes,
        preventiveRes,
        equipmentRes,
        drillsRes,
        checklistsRes,
        raciRes,
        legalRes,
        riskRes,
      ] = await Promise.all([
        supabase
          .from("adep_teams")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
        supabase
          .from("adep_emergency_contacts")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
        supabase
          .from("adep_scenarios")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
        supabase
          .from("adep_preventive_measures")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
        supabase
          .from("adep_equipment_inventory")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
        supabase
          .from("adep_drills")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
        supabase
          .from("adep_checklists")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
        supabase
          .from("adep_raci_matrix")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
        supabase
          .from("adep_legal_references")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
        supabase
          .from("adep_risk_sources")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", id),
      ]);

      let p = baseMetaScore;

      // Core modules (40%)
      if ((teamsRes.count || 0) > 0) p += 10;
      if ((scenariosRes.count || 0) > 0) p += 15;
      if ((contactsRes.count || 0) > 0) p += 15;

      // AI modules (30%)
      if ((preventiveRes.count || 0) > 0) p += 5;
      if ((equipmentRes.count || 0) > 0) p += 5;
      if ((drillsRes.count || 0) > 0) p += 5;
      if ((checklistsRes.count || 0) > 0) p += 5;
      if ((raciRes.count || 0) > 0) p += 5;
      if ((legalRes.count || 0) > 0) p += 3;
      if ((riskRes.count || 0) > 0) p += 2;

      p = Math.max(0, Math.min(100, p));
      setProgress(p);

      if (row.id || id) {
        const targetId = (row.id as string) || id;
        await supabase
          .from("adep_plans")
          .update({ completion_percentage: p })
          .eq("id", targetId);
      }
    } catch (e) {
      console.error("refreshProgress error:", e);
    } finally {
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    if (!planId || !planRow) {
      setProgress(0);
      return;
    }
    void refreshProgress(planId, planRow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, currentStep]);

  // ------------------------------------
  // Navigation
  // ------------------------------------
  const goToStep = async (next: number) => {
    if (next < 1 || next > 13) return;
    if (!ensureAuth()) return;
    if (!planRow) return;

    if (next > currentStep) {
      const needsInitialSave = !planId;
      const missingCritical =
        !planRow.plan_name?.trim() || !planRow.company_name?.trim();

      if (needsInitialSave && missingCritical) {
        toast.error(
          "Devam etmek için Plan Adı ve Firma bilgilerini girip kaydedin."
        );
        return;
      }

      if (needsInitialSave) {
        const saved = await savePlan({ silent: false });
        if (!saved?.id) return;
      } else {
        await savePlan({ silent: true });
      }
    }

    setCurrentStep(next);
  };

  const stepMeta = useMemo(() => {
    const item = STEPS.find((s) => s.id === currentStep);
    return item ?? STEPS[0];
  }, [currentStep]);
  const generateADEPReportAndOpenEmail = async () => {
    if (!planId || !planRow || !user?.id) {
      toast.error("Rapor oluşturmak için plan kaydedilmiş olmalı.");
      return;
    }

    setSaving(true);
    try {
      await savePlan({
        silent: true,
        markCompleted: progress >= 100,
      });

      toast.info("PDF hazırlanıyor...");
      const pdfDoc = await generateADEPPDF(planId);
      const pdfBlob = pdfDoc.output("blob");

      const safeCompanyName = (planRow.company_name || "Firma").replace(
        /[^a-z0-9]/gi,
        "_"
      );
      const fileName = `ADEP_${safeCompanyName}_${new Date()
        .toISOString()
        .split("T")[0]}.pdf`;
      const storagePath = `adep-reports/${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("reports")
        .upload(storagePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("reports")
        .getPublicUrl(uploadData.path);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Rapor bağlantısı oluşturulamadı.");
      }

      setCurrentReportUrl(publicUrlData.publicUrl);
      setCurrentReportFilename(fileName);
      setSendModalOpen(true);
      toast.success("Rapor e-posta gönderimi için hazır.");
    } catch (e: any) {
      console.error("ADEP report prepare error:", e);
      toast.error("Rapor e-posta için hazırlanamadı", {
        description: e.message || "Bilinmeyen hata",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportPreferences =
    planRow?.plan_data.export_preferences ||
    DEFAULT_PLAN_DATA.export_preferences!;

  const updateExportPreferences = (
    patch: Partial<NonNullable<ADEPPlanData["export_preferences"]>>
  ) => {
    setPlanRow((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plan_data: {
          ...prev.plan_data,
          export_preferences: {
            ...DEFAULT_PLAN_DATA.export_preferences!,
            ...(prev.plan_data.export_preferences || {}),
            ...patch,
          },
        },
      };
    });
  };

  // ------------------------------------
  // Render step content
  // ------------------------------------
  const renderStep = () => {
    if (!planRow) return null;

    switch (currentStep) {
      case 1:
        return (
          <ADEPGeneralInfo
            data={{
              plan_name: planRow.plan_name,
              company_name: planRow.company_name,
              hazard_class: planRow.hazard_class,
              employee_count: planRow.employee_count,
              sector: planRow.sector || "",
            }}
            planData={planRow.plan_data}
            onChange={(field: string, value: any) => {
              setPlanRow((prev) => {
                if (!prev) return prev;
                const next = { ...prev } as ADEPPlanRow;
                (next as any)[field] = value;
                return next;
              });
            }}
            onPlanDataChange={(section: string, data: any) => {
              setPlanRow((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  plan_data: {
                    ...prev.plan_data,
                    [section]: data,
                  },
                };
              });
            }}
          />
        );

      case 2:
        return (
          <ADEPLegislationTab
            data={planRow.plan_data.mevzuat}
            onChange={(newMevzuat) => {
              setPlanRow((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  plan_data: {
                    ...prev.plan_data,
                    mevzuat: newMevzuat,
                  },
                };
              });
            }}
          />
        );

      case 3:
        return <ADEPTeamsTab planId={planId || undefined} />;

      case 4:
        return <ADEPScenariosTab planId={planId || undefined} />;

      case 5:
        return <ADEPContactsTab planId={planId || undefined} />;

      // ✅ AI Modules
      case 6:
        return <ADEPPreventiveMeasuresTab planId={planId || undefined} />;

      case 7:
        return <ADEPEquipmentTab planId={planId || undefined} />;

      case 8:
        return <ADEPDrillsTab planId={planId || undefined} />;

      case 9:
        return <ADEPChecklistsTab planId={planId || undefined} />;

      case 10:
        return <ADEPRACITab planId={planId || undefined} />;

      case 11:
        return <ADEPLegalReferencesTab planId={planId || undefined} />;

      case 12:
        return <ADEPRiskSourcesTab planId={planId || undefined} />;

      // ✅ PDF Step
      case 13:
        return (
          <div className="space-y-6">
            {/* AI Banner */}
            <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      AI Destekli Kurumsal ADEP
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      7 AI modülü ile zenginleştirilmiş, ISO 45001 uyumlu, denetim
                      hazır Acil Durum Eylem Planı. Tüm veriler veritabanında
                      tutulur ve PDF her zaman güncel veriden üretilir.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Plan Durumu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Plan Adı</div>
                    <div className="font-semibold">
                      {planRow.plan_name || "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Firma</div>
                    <div className="font-semibold">
                      {planRow.company_name || "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Tamamlanma
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-2 flex-1" />
                      <Badge
                        variant={progress >= 100 ? "default" : "secondary"}
                      >
                        {progressLoading ? "..." : `%${progress}`}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Core Modules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>AI Modules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>DB-First</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>ISO 45001</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  Kapak Çerçevesi
                </CardTitle>
                <CardDescription>
                  Kurumsal PDF kapağında kullanılacak çerçeve stilini seçin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {ADEP_COVER_STYLES.map((style) => {
                    const active = exportPreferences.cover_style === style.value;
                    return (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => updateExportPreferences({ cover_style: style.value })}
                        className={[
                          "rounded-2xl border p-4 text-left transition-all",
                          active
                            ? `bg-orange-500/5 shadow-lg shadow-orange-500/10 ${style.accent}`
                            : "border-border hover:border-orange-300/40 hover:bg-muted/40",
                        ].join(" ")}
                      >
                        <div className="mb-4 flex h-28 items-center justify-center rounded-xl bg-gradient-to-b from-background to-muted/50">
                          <div
                            className={[
                              "h-20 w-14 rounded-md border bg-white shadow-sm",
                              style.accent,
                            ].join(" ")}
                          />
                        </div>
                        <div className="text-sm font-semibold">{style.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {style.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  Seçilen stil:{" "}
                  <span className="font-medium text-foreground">
                    {ADEP_COVER_STYLES.find(
                      (style) => style.value === exportPreferences.cover_style
                    )?.title || "Gölgeli"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  PDF Oluşturma
                </CardTitle>
                <CardDescription>
                  Tüm modüller veritabanından çekilir. PDF her zaman güncel
                  veriden üretilir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!planId && (
                  <div className="p-4 border border-destructive/50 bg-destructive/5 rounded-lg text-sm text-destructive">
                    PDF için önce planın kaydedilmesi gerekir.
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    disabled={
                      saving ||
                      !planRow.plan_name?.trim() ||
                      !planRow.company_name?.trim()
                    }
                    onClick={async () => {
                      const saved = await savePlan({
                        silent: false,
                        markCompleted: progress >= 100,
                      });
                      if (saved?.id) {
                        await refreshProgress(saved.id, {
                          ...planRow,
                          id: saved.id,
                        });
                      }
                    }}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {progress >= 100 ? "Tamamla ve Kaydet" : "Kaydet"}
                  </Button>

                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={saving || !planId}
                    onClick={async () => {
                      if (!planId) return;
                      await savePlan({
                        silent: true,
                        markCompleted: progress >= 100,
                      });

                      toast.info("PDF hazırlanıyor...");
                      try {
                        await generateADEPPDF(planId);
                        toast.success("PDF indirildi");
                      } catch (e: any) {
                        console.error(e);
                        toast.error("PDF oluşturma hatası", {
                          description: e.message || "Bilinmeyen hata",
                        });
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    PDF İndir
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2"
                    disabled={saving || !planId}
                    onClick={generateADEPReportAndOpenEmail}
                  >
                    <Share2 className="h-4 w-4" />
                    PDF Oluştur ve Gönder
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    ✓ 13 modül • DB-first architecture • Türkçe Inter font
                  </div>
                  <div>
                    ✓ Ekipler, senaryolar, iletişim, AI modülleri ilgili
                    tablolardan çekilir
                  </div>
                  <div>✓ PDF her zaman güncel veritabanı verisiyle üretilir</div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  // ------------------------------------
  // Main Render
  // ------------------------------------
  if (!canUseWizard) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Devam etmek için giriş yapmalısınız.
        </CardContent>
      </Card>
    );
  }

  if (loading || !planRow) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Yükleniyor...
        </CardContent>
      </Card>
    );
  }

  const StepIcon = stepMeta.icon;
  const coreSteps = STEPS.filter((s) => s.category === "core");
  const aiSteps = STEPS.filter((s) => s.category === "ai");
  const finalSteps = STEPS.filter((s) => s.category === "final");

  return (
    <div className="space-y-6">
      {/* ✅ Premium Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="absolute top-0 right-0 h-32 w-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 bg-purple-500/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl border bg-background flex items-center justify-center shadow-sm">
                <StepIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight">
                  Acil Durum Eylem Planı
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI Destekli Kurumsal ADEP Sihirbazı •{" "}
                  <span className="font-medium text-foreground">
                    {planRow.plan_name?.trim() ? planRow.plan_name : "Yeni Plan"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <Building2 className="h-3 w-3" />
                {planRow.company_name || "Firma Adı"}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {planRow.hazard_class}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Users className="h-3 w-3" />
                {planRow.employee_count} Çalışan
              </Badge>
              {planId && (
                <Badge variant="secondary" className="gap-1.5">
                  <FileText className="h-3 w-3" />
                  {planId.slice(0, 8)}...
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="min-w-[260px]">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span className="font-medium">Tamamlanma Durumu</span>
                <span className="font-semibold">
                  {progressLoading ? "Hesaplanıyor..." : `%${progress}`}
                </span>
              </div>
              <Progress value={progress} className="h-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={progress >= 100 ? "default" : "secondary"}
                className="gap-1.5"
              >
                {progress >= 100 ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {progress >= 100 ? "Tamamlandı" : "Devam Ediyor"}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                AI Destekli
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Modern Stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Core Steps */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Temel Modüller
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {coreSteps.map((s) => {
                  const Icon = s.icon;
                  const active = s.id === currentStep;
                  const done = s.id < currentStep;

                  return (
                    <button
                      key={s.id}
                      onClick={() => void goToStep(s.id)}
                      className={[
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : done
                          ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400 hover:border-green-500"
                          : "border-border hover:border-primary/50 hover:bg-primary/5",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-6 w-6 rounded-md flex items-center justify-center",
                          active ? "bg-primary-foreground/20" : "",
                        ].join(" ")}
                      >
                        {done ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </span>
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* AI Steps */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  AI Modülleri
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiSteps.map((s) => {
                  const Icon = s.icon;
                  const active = s.id === currentStep;
                  const done = s.id < currentStep;

                  return (
                    <button
                      key={s.id}
                      onClick={() => void goToStep(s.id)}
                      className={[
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                        active
                          ? "border-purple-500 bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/20"
                          : done
                          ? "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:border-purple-500"
                          : "border-border hover:border-purple-500/50 hover:bg-purple-500/5",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-5 w-5 rounded flex items-center justify-center",
                          active ? "bg-white/20" : "",
                        ].join(" ")}
                      >
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Final Step */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tamamlama
                </span>
              </div>
              <div className="flex gap-2">
                {finalSteps.map((s) => {
                  const Icon = s.icon;
                  const active = s.id === currentStep;

                  return (
                    <button
                      key={s.id}
                      onClick={() => void goToStep(s.id)}
                      className={[
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                        active
                          ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : "border-border hover:border-blue-500/50 hover:bg-blue-500/5",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">
                Adım {currentStep}/13: {stepMeta.label}
              </CardTitle>
              <CardDescription className="mt-1.5">
                {currentStep === 1 && "Plan meta ve işyeri bilgileri"}
                {currentStep === 2 &&
                  "Standart mevzuat metinleri (düzenlenebilir)"}
                {currentStep === 3 && "Acil durum ekipleri"}
                {currentStep === 4 &&
                  "Senaryolar ve talimatlar"}
                {currentStep === 5 &&
                  "İletişim rehberi "}
                {currentStep === 6 &&
                  "Önleyici tedbir matrisi"}
                {currentStep === 7 &&
                  "Ekipman envanteri (AI: adep_equipment_inventory)"}
                {currentStep === 8 && "Tatbikat kayıtları"}
                {currentStep === 9 &&
                  "Periyodik kontrol listeleri"}
                {currentStep === 10 &&
                  "Sorumluluk matrisi"}
                {currentStep === 11 &&
                  "Mevzuat referansları"}
                {currentStep === 12 &&
                  "Risk kaynakları haritası"}
                {currentStep === 13 && "Kaydet ve PDF oluştur"}
              </CardDescription>
            </div>

            <Button
              variant="outline"
              className="gap-2"
              disabled={
                saving ||
                !planRow.plan_name?.trim() ||
                !planRow.company_name?.trim()
              }
              onClick={async () => {
                const saved = await savePlan({ silent: false });
                if (saved?.id)
                  await refreshProgress(saved.id, { ...planRow, id: saved.id });
              }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Kaydet
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>

      {/* ✅ Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={() => void goToStep(currentStep - 1)}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-5 w-5" />
          Geri
        </Button>

        {currentStep < 13 ? (
          <Button
            size="lg"
            className="gap-2"
            onClick={() => void goToStep(currentStep + 1)}
          >
            İleri
            <ChevronRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="gap-2"
            disabled={!planId}
            onClick={() => navigate("/adep-plans")}
          >
            <CheckCircle2 className="h-5 w-5" />
            Listeye Dön
          </Button>
        )}
      </div>

      <SendReportModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        reportType="adep"
        reportUrl={currentReportUrl}
        reportFilename={currentReportFilename}
        companyName={planRow.company_name || "Firma"}
      />
    </div>
  );
}



