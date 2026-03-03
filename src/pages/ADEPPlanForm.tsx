// src/pages/ADEPPlanForm.tsx

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Components
import ADEPGeneralInfo from "@/components/adep/ADEPGeneralInfo";
import ADEPLegislationTab from "@/components/adep/ADEPLegislationTab";
import ADEPTeamsTab from "@/components/adep/ADEPTeamsTab";
import ADEPContactsTab from "@/components/adep/ADEPContactsTab";
import ADEPScenariosTab from "@/components/adep/ADEPScenariosTab";
import { generateADEPPDF } from "@/components/adep/ADEPPDFGenerator";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ADEPPlanData {
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
}

interface ADEPFormData {
  // Genel Bilgiler
  plan_name: string;
  company_id: string;
  company_name: string;
  hazard_class: string;
  employee_count: number;
  sector: string;
  
  // plan_data içeriği
  plan_data: ADEPPlanData;
}

const DEFAULT_PLAN_DATA: ADEPPlanData = {
  mevzuat: {
    amac: `Bu Acil Durum Eylem Planı, işyerinde meydana gelebilecek acil durumlarda çalışanların ve işyerinin güvenliğini sağlamak, can ve mal kayıplarını en aza indirmek amacıyla hazırlanmıştır.`,
    kapsam: `Bu plan, işyerinde çalışan tüm personeli, ziyaretçileri ve işyeri tesislerini kapsar.`,
    dayanak: `6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve Acil Durumlar Hakkında Yönetmelik hükümlerine göre hazırlanmıştır.`,
    tanimlar: `Acil Durum: İşyerinde meydana gelen ve derhal müdahale edilmesi gereken olaylar.
Tahliye: Acil durumda çalışanların güvenli alana yönlendirilmesi.
Toplanma Yeri: Tahliye sonrası çalışanların güvenli bir şekilde bir araya geldiği alan.`,
  },
  genel_bilgiler: {
    hazirlayanlar: [
      { unvan: "İş Güvenliği Uzmanı", ad_soyad: "" }
    ],
    hazirlanma_tarihi: new Date().toISOString().split('T')[0],
    gecerlilik_tarihi: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    revizyon_no: "Rev. 0",
    revizyon_tarihi: new Date().toISOString().split('T')[0],
  },
  isyeri_bilgileri: {
    adres: "",
    telefon: "",
    tehlike_sinifi: "Çok Tehlikeli",
    sgk_sicil_no: "",
  },
  toplanma_yeri: {
    aciklama: "İşyerinin önündeki açık alan toplanma noktası olarak belirlenmiştir.",
    harita_url: "",
  },
};

export default function ADEPPlanForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  
  const [formData, setFormData] = useState<ADEPFormData>({
    plan_name: "",
    company_id: "",
    company_name: "",
    hazard_class: "Çok Tehlikeli",
    employee_count: 0,
    sector: "",
    plan_data: DEFAULT_PLAN_DATA,
  });

  useEffect(() => {
    if (id) {
      fetchPlan();
    }
  }, [id]);

  const fetchPlan = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("adep_plans")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // ✅ Type conversion for plan_data
      const planData = (typeof data.plan_data === 'object' && data.plan_data !== null)
        ? data.plan_data as unknown as ADEPPlanData
        : DEFAULT_PLAN_DATA;

      setFormData({
        plan_name: data.plan_name || "",
        company_id: "", // ✅ adep_plans tablosunda company_id yok, sadece company_name var
        company_name: data.company_name || "",
        hazard_class: data.hazard_class || "Çok Tehlikeli",
        employee_count: data.employee_count || 0,
        sector: data.sector || "",
        plan_data: planData,
      });
    } catch (error: any) {
      console.error("Plan fetch error:", error);
      toast.error("Plan yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updatePlanData = (section: string, data: any) => {
    setFormData((prev) => ({
      ...prev,
      plan_data: {
        ...prev.plan_data,
        [section]: data,
      },
    }));
  };

  const savePlan = async () => {
    if (!user) return;

    // Validation
    if (!formData.plan_name || !formData.company_name) {
      toast.error("Plan adı ve firma adı zorunludur");
      return;
    }

    setSaving(true);
    try {
      const planPayload = {
        user_id: user.id,
        plan_name: formData.plan_name,
        company_name: formData.company_name,
        sector: formData.sector,
        hazard_class: formData.hazard_class,
        employee_count: formData.employee_count,
        plan_data: formData.plan_data as any, // ✅ Supabase Json tipine dönüştür
        status: "draft",
        updated_at: new Date().toISOString(),
      };

      if (id) {
        // Update
        const { error } = await supabase
          .from("adep_plans")
          .update(planPayload)
          .eq("id", id);

        if (error) throw error;
        toast.success("Plan güncellendi");
      } else {
        // Create
        const { data, error } = await supabase
          .from("adep_plans")
          .insert([{
            ...planPayload,
            created_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) throw error;
        toast.success("Plan oluşturuldu");
        navigate(`/adep-plans/${data.id}/edit`);
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Kaydetme hatası: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!id) {
      toast.error("Önce planı kaydedin");
      return;
    }

    try {
      toast.info("PDF oluşturuluyor...");
      await generateADEPPDF(id);
      toast.success("PDF başarıyla oluşturuldu");
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast.error("PDF oluşturulamadı");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/adep-plans")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {id ? "ADEP Düzenle" : "Yeni ADEP Oluştur"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Acil Durum Eylem Planı
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={savePlan}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Kaydet
          </Button>

          {id && (
            <Button onClick={handleGeneratePDF} className="gap-2">
              <FileDown className="h-4 w-4" />
              PDF İndir
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
              <TabsTrigger value="legislation">Mevzuat</TabsTrigger>
              <TabsTrigger value="teams">Ekipler</TabsTrigger>
              <TabsTrigger value="contacts">İletişim</TabsTrigger>
              <TabsTrigger value="scenarios">Senaryolar</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-6">
              <ADEPGeneralInfo
                data={formData}
                planData={formData.plan_data}
                onChange={(field: string, value: any) => updateFormData(field, value)}
                onPlanDataChange={updatePlanData}
              />
            </TabsContent>

            <TabsContent value="legislation" className="space-y-6 mt-6">
              <ADEPLegislationTab
                data={formData.plan_data.mevzuat}
                onChange={(data) => updatePlanData("mevzuat", data)}
              />
            </TabsContent>

            <TabsContent value="teams" className="space-y-6 mt-6">
              <ADEPTeamsTab planId={id} />
            </TabsContent>

            <TabsContent value="contacts" className="space-y-6 mt-6">
              <ADEPContactsTab planId={id} />
            </TabsContent>

            <TabsContent value="scenarios" className="space-y-6 mt-6">
              <ADEPScenariosTab planId={id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}