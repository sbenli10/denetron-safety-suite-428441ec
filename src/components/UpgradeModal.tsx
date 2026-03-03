import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggeredBy?: 'trial_expired' | 'feature_locked' | 'manual';
}

const plans = [
  {
    id: 'free',
    name: 'Ücretsiz',
    price: 0,
    period: 'Süresiz',
    icon: <Sparkles className="h-6 w-6" />,
    color: 'from-slate-600 to-slate-700',
    features: [
      { text: '1 Firma', included: true },
      { text: '50 Çalışan', included: true },
      { text: 'Temel Risk Analizi', included: true },
      { text: 'Sınırlı Risk Kütüphanesi', included: true },
      { text: 'AI Risk Analizi', included: false },
      { text: 'PDF/Excel Export', included: false },
      { text: 'Öncelikli Destek', included: false },
    ],
  },
  {
    id: 'expert',
    name: 'Uzman',
    price: 499.99,
    period: 'Aylık',
    icon: <Crown className="h-6 w-6" />,
    color: 'from-purple-600 to-blue-600',
    popular: true,
    features: [
      { text: 'Sınırsız Firma', included: true },
      { text: 'Sınırsız Çalışan', included: true },
      { text: 'Gelişmiş Risk Analizi', included: true },
      { text: 'Tam Risk Kütüphanesi', included: true },
      { text: 'AI Risk Analizi', included: true },
      { text: 'PDF/Excel Export', included: true },
      { text: 'Öncelikli Destek', included: true },
    ],
  },
];

export function UpgradeModal({ open, onOpenChange, triggeredBy }: UpgradeModalProps) {
  const { user } = useAuth();
  const { status, daysLeftInTrial, refetch } = useSubscription();
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async (planId: string) => {
    if (!user) return;

    setUpgrading(true);
    try {
      // ✅ Update subscription
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: planId,
          subscription_status: planId === 'free' ? 'free' : 'premium',
          subscription_started_at: new Date().toISOString(),
          subscription_expires_at: planId === 'expert' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
            : null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // ✅ Create billing record
      if (planId === 'expert') {
        await supabase
          .from('billing_history')
          .insert({
            user_id: user.id,
            plan_name: 'Uzman Paketi',
            amount: 499.99,
            currency: 'TRY',
            status: 'paid',
            period_start: new Date().toISOString().split('T')[0],
            period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            payment_method: 'Kredi Kartı',
          });
      }

      await refetch();
      onOpenChange(false);

      toast.success(
        planId === 'expert' ? '🎉 Uzman paketine yükseltildiniz!' : '✅ Ücretsiz plana geçildi',
        {
          description: planId === 'expert' 
            ? 'Tüm premium özelliklere erişiminiz açıldı' 
            : 'Plan değişikliği tamamlandı',
        }
      );
    } catch (err: any) {
      console.error('Upgrade error:', err);
      toast.error('Plan değiştirilemedi', {
        description: err.message,
      });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 border border-blue-500/30">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-foreground">Paketi Yükselt</span>
                {status === 'trial' && daysLeftInTrial > 0 && (
                  <p className="text-sm text-muted-foreground font-normal mt-1">
                    Deneme süreniz {daysLeftInTrial} gün sonra sona eriyor
                  </p>
                )}
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Warning Banner */}
        {triggeredBy === 'trial_expired' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-600 font-semibold">
              ⚠️ Deneme süreniz sona erdi. Devam etmek için bir paket seçin.
            </p>
          </div>
        )}

        {triggeredBy === 'feature_locked' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-400 font-semibold">
              🔒 Bu özellik Uzman paketinde mevcut. Yükseltmek ister misiniz?
            </p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? 'border-blue-500 bg-gradient-to-br from-blue-500/10 to-purple-500/10'
                  : 'border-border/50 bg-card/50'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1">
                    ⭐ Popüler
                  </Badge>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br ${plan.color} mb-4`}>
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price === 0 ? 'Ücretsiz' : `₺${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    {feature.included ? (
                      <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-400" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="h-3 w-3 text-red-400" />
                      </div>
                    )}
                    <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={upgrading}
                className={`w-full gap-2 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {upgrading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    İşleniyor...
                  </>
                ) : plan.id === 'expert' ? (
                  <>
                    <Crown className="h-4 w-4" />
                    Uzman'a Yükselt
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Ücretsiz Devam Et
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-muted-foreground mt-4 border-t border-border/50 pt-4">
          <p>💳 Güvenli ödeme ile dilediğiniz zaman iptal edebilirsiniz</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}