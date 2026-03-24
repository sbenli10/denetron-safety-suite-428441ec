import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SubscriptionStatus, SubscriptionPlan, SubscriptionFeatures } from '@/types/subscription';

export function useSubscription() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus>('trial');
  const [plan, setPlan] = useState<SubscriptionPlan>('free');
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [features, setFeatures] = useState<SubscriptionFeatures>({
    maxCompanies: 1,
    maxEmployees: 50,
    aiRiskAnalysis: false,
    pdfExport: false,
    excelExport: false,
    prioritySupport: false,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (profile) {
      void fetchSubscription(false);
    }
  }, [profile, user]);

  const fetchSubscription = async (forceProfileRefresh = true) => {
    if (!user) return;

    try {
      let nextProfile = profile;

      if (!nextProfile && forceProfileRefresh) {
        await refreshProfile();
        nextProfile = profile;
      }

      if (!nextProfile) {
        setLoading(false);
        return;
      }

      setStatus((nextProfile.subscription_status as SubscriptionStatus) || 'trial');
      setPlan((nextProfile.subscription_plan as SubscriptionPlan) || 'free');
      setTrialEndsAt(nextProfile.trial_ends_at ? new Date(nextProfile.trial_ends_at) : null);

      // Get plan features
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_code', nextProfile.subscription_plan || 'free')
        .single();

      if (planData) {
        setFeatures({
          maxCompanies: planData.max_companies,
          maxEmployees: planData.max_employees,
          aiRiskAnalysis: planData.ai_risk_analysis,
          pdfExport: planData.pdf_export,
          excelExport: planData.excel_export,
          prioritySupport: planData.priority_support,
        });
      }
    } catch (err) {
      console.error('Subscription fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isTrialExpired = () => {
    if (!trialEndsAt) return false;
    return new Date() > trialEndsAt;
  };

  const isFeatureAllowed = (feature: keyof SubscriptionFeatures): boolean => {
    if (status === 'trial' && !isTrialExpired()) return true;
    if (status === 'premium') return true;
    
    const featureValue = features[feature];
    return typeof featureValue === 'boolean' ? featureValue : true;
  };

  const getDaysLeftInTrial = (): number => {
    if (!trialEndsAt) return 0;
    const diff = trialEndsAt.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return {
    loading,
    status,
    plan,
    features,
    trialEndsAt,
    isTrialExpired: isTrialExpired(),
    daysLeftInTrial: getDaysLeftInTrial(),
    isFeatureAllowed,
    refetch: async () => {
      await refreshProfile();
      await fetchSubscription(false);
    },
  };
}
