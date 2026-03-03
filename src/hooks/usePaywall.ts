import { useState } from 'react';
import { useSubscription } from './useSubscription';
import { toast } from 'sonner';

export function usePaywall() {
  const { isFeatureAllowed, status, isTrialExpired } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'trial_expired' | 'feature_locked' | 'manual'>('manual');

  const checkFeatureAccess = (
    feature: 'aiRiskAnalysis' | 'pdfExport' | 'excelExport',
    featureName: string
  ): boolean => {
    // Trial expired check
    if (status === 'trial' && isTrialExpired) {
      setUpgradeReason('trial_expired');
      setShowUpgradeModal(true);
      toast.error('Deneme süresi sona erdi', {
        description: 'Devam etmek için bir paket seçin',
      });
      return false;
    }

    // Feature access check
    if (!isFeatureAllowed(feature)) {
      setUpgradeReason('feature_locked');
      setShowUpgradeModal(true);
      toast.warning(`${featureName} özelliği kilitli`, {
        description: 'Bu özelliğe erişmek için Uzman paketine yükseltin',
      });
      return false;
    }

    return true;
  };

  const checkLimitAccess = async (
    resourceType: 'companies' | 'employees',
    currentCount: number
  ): Promise<boolean> => {
    const { features } = useSubscription();
    
    const limit = resourceType === 'companies' 
      ? features.maxCompanies 
      : features.maxEmployees;

    // Unlimited check
    if (limit === null) return true;

    // Limit exceeded
    if (currentCount >= limit) {
      setUpgradeReason('feature_locked');
      setShowUpgradeModal(true);
      toast.error(
        resourceType === 'companies' ? 'Firma limiti aşıldı' : 'Çalışan limiti aşıldı',
        {
          description: `Mevcut planınızda maksimum ${limit} ${resourceType === 'companies' ? 'firma' : 'çalışan'} ekleyebilirsiniz`,
        }
      );
      return false;
    }

    return true;
  };

  return {
    showUpgradeModal,
    setShowUpgradeModal,
    upgradeReason,
    checkFeatureAccess,
    checkLimitAccess,
  };
}