// src/pages/ADEPPlans.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ADEPPlan {
  id: string;
  plan_name: string;
  company_name: string;
  hazard_class: string;
  employee_count: number;
  status: string;
  pdf_url: string | null;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function ADEPPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<ADEPPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("adep_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error("Plan fetch error:", error);
      toast.error("Planlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { label: "Taslak", color: "bg-gray-500" },
      active: { label: "Aktif", color: "bg-green-500" },
      review: { label: "Gözden Geçirme", color: "bg-yellow-500" },
    };

    const variant = variants[status] || variants.draft;

    return (
      <Badge className={`${variant.color} text-white`}>
        {variant.label}
      </Badge>
    );
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Bu planı silmek istediğinizden emin misiniz?")) return;

    try {
      const { error } = await supabase
        .from("adep_plans")
        .update({ is_deleted: true })
        .eq("id", id);

      if (error) throw error;

      toast.success("Plan silindi");
      fetchPlans();
    } catch (error: any) {
      toast.error("Plan silinemedi: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-72 animate-pulse rounded bg-slate-900" />
          </div>
          <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-900" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/70" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold">Acil Durum Eylem Planları</h1>
            <p className="text-sm text-muted-foreground">
              İSG mevzuatına uygun ADEP yönetimi
            </p>
          </div>
        </div>

        <Button onClick={() => navigate("/adep-plans/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni ADEP Oluştur
        </Button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg mb-2">Henüz ADEP oluşturulmadı</p>
              <p className="text-sm mb-6">
                İlk Acil Durum Eylem Planınızı oluşturun
              </p>
              <Button onClick={() => navigate("/adep-wizard")} className="gap-2">
                <Plus className="h-4 w-4" />
                İlk Planı Oluştur
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg line-clamp-1">
                      {plan.plan_name}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {plan.company_name}
                    </CardDescription>
                  </div>
                  {getStatusBadge(plan.status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Plan Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tehlike Sınıfı:</span>
                    <span className="font-medium">{plan.hazard_class}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Çalışan Sayısı:</span>
                    <span className="font-medium">{plan.employee_count}</span>
                  </div>
                  {plan.next_review_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gözden Geçirme:</span>
                      <span className="font-medium">
                        {format(new Date(plan.next_review_date), "dd MMM yyyy", { locale: tr })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/adep-plans/${plan.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Görüntüle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/adep-plans/${plan.id}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Düzenle
                  </Button>
                  {plan.pdf_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(plan.pdf_url!, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePlan(plan.id)}
                    className="text-red-600 hover:text-red-700"
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
  );
}
