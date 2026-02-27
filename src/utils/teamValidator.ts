import { TEAM_REQUIREMENTS, type CompanyInfo, type EmergencyTeams } from "@/types/adep";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTeams(
  companyInfo: CompanyInfo,
  teams: EmergencyTeams
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const requirements = TEAM_REQUIREMENTS[companyInfo.tehlike_sinifi];
  const employeeCount = companyInfo.calisan_sayisi;

  // Söndürme ekibi kontrolü
  const requiredSondurme = Math.max(
    requirements.sondurme.min,
    Math.ceil(employeeCount / requirements.sondurme.per)
  );
  if (teams.sondurme.length < requiredSondurme) {
    result.valid = false;
    result.errors.push(
      `❌ Söndürme Ekibi: En az ${requiredSondurme} kişi gerekli (mevcut: ${teams.sondurme.length})`
    );
  }

  // Kurtarma ekibi kontrolü
  const requiredKurtarma = Math.max(
    requirements.kurtarma.min,
    Math.ceil(employeeCount / requirements.kurtarma.per)
  );
  if (teams.kurtarma.length < requiredKurtarma) {
    result.valid = false;
    result.errors.push(
      `❌ Kurtarma Ekibi: En az ${requiredKurtarma} kişi gerekli (mevcut: ${teams.kurtarma.length})`
    );
  }

  // Koruma ekibi kontrolü
  const requiredKoruma = Math.max(
    requirements.koruma.min,
    Math.ceil(employeeCount / requirements.koruma.per)
  );
  if (teams.koruma.length < requiredKoruma) {
    result.warnings.push(
      `⚠️ Koruma Ekibi: ${requiredKoruma} kişi önerilir (mevcut: ${teams.koruma.length})`
    );
  }

  // İlk yardım ekibi kontrolü
  const requiredIlkYardim = Math.max(
    requirements.ilk_yardim.min,
    Math.ceil(employeeCount / requirements.ilk_yardim.per)
  );
  if (teams.ilk_yardim.length < requiredIlkYardim) {
    result.valid = false;
    result.errors.push(
      `❌ İlk Yardım Ekibi: En az ${requiredIlkYardim} kişi gerekli (mevcut: ${teams.ilk_yardim.length})`
    );
  }

  // Telefon numarası kontrolü
  const allMembers = [
    ...teams.sondurme,
    ...teams.kurtarma,
    ...teams.koruma,
    ...teams.ilk_yardim
  ];

  allMembers.forEach(member => {
    if (!member.telefon || member.telefon.length < 10) {
      result.warnings.push(
        `⚠️ ${member.ad_soyad}: Geçerli telefon numarası girilmemiş`
      );
    }
  });

  return result;
}

export function getRecommendedTeamSizes(companyInfo: CompanyInfo) {
  const requirements = TEAM_REQUIREMENTS[companyInfo.tehlike_sinifi];
  const employeeCount = companyInfo.calisan_sayisi;

  return {
    sondurme: Math.max(
      requirements.sondurme.min,
      Math.ceil(employeeCount / requirements.sondurme.per)
    ),
    kurtarma: Math.max(
      requirements.kurtarma.min,
      Math.ceil(employeeCount / requirements.kurtarma.per)
    ),
    koruma: Math.max(
      requirements.koruma.min,
      Math.ceil(employeeCount / requirements.koruma.per)
    ),
    ilk_yardim: Math.max(
      requirements.ilk_yardim.min,
      Math.ceil(employeeCount / requirements.ilk_yardim.per)
    )
  };
}