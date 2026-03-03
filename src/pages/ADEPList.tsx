import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Trash2, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { ADEPStatus, SavedADEP } from "@/types/adep";

export default function ADEPList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SavedADEP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("adep_plans")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!error && data) {
        const formattedPlans = data.map((item: any) => ({
            ...item,
            // Eğer status gelmezse varsayılan olarak 'draft' ata
            status: (item.status || "draft") as ADEPStatus 
        }));
        
        setPlans(formattedPlans);
        }
        } catch (error: any) {
        toast.error("Planlar yüklenemedi", {
            description: error.message
        });
        } finally {
        setLoading(false);
        }
    };

  const deletePlan = async (id: string) => {
    if (!confirm("Bu planı silmek istediğinizden emin misiniz?")) return;

    try {
      const { error } = await supabase
        .from("adep_plans")
        .update({ is_deleted: true })
        .eq("id", id);

      if (error) throw error;

      toast.success("✅ Plan silindi");
      fetchPlans();
    } catch (error: any) {
      toast.error("Silme hatası", {
        description: error.message
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: "secondary", label: "📝 Taslak" },
      completed: { variant: "default", label: "✅ Tamamlandı" },
      approved: { variant: "default", label: "✔️ Onaylandı" },
      expired: { variant: "destructive", label: "⏰ Süresi Doldu" }
    };

    const config = variants[status] || variants.draft;

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ADEP Planlarım</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kayıtlı acil durum eylem planlarınız
          </p>
        </div>
        <Button onClick={() => navigate("/adep-wizard")} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni ADEP Oluştur
        </Button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="font-semibold text-lg mb-2">Henüz ADEP bulunmuyor</p>
            <p className="text-sm text-muted-foreground mb-4">
              İlk acil durum eylem planınızı oluşturun
            </p>
            <Button onClick={() => navigate("/adep-wizard")} className="gap-2">
              <Plus className="h-4 w-4" />
              ADEP Sihirbazı'nı Başlat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">
                    {plan.company_name}
                  </CardTitle>
                  {getStatusBadge(plan.status)}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{format(new Date(plan.created_at), 'dd MMM yyyy HH:mm')}</p>
                  {plan.sector && <p>Sektör: {plan.sector}</p>}
                  {plan.hazard_class && (
                    <Badge variant="outline" className="text-xs">
                      {plan.hazard_class}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tamamlanma</span>
                  <span className="text-sm font-bold">
                    {plan.completion_percentage}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/adep-wizard?id=${plan.id}`)}
                    className="gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Görüntüle
                  </Button>
                  {plan.pdf_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(plan.pdf_url, '_blank')}
                      className="gap-1"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletePlan(plan.id)}
                    className="text-destructive hover:bg-destructive/10 gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Sil
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