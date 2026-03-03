export type SubscriptionStatus = 'trial' | 'free' | 'premium' | 'cancelled';
export type SubscriptionPlan = 'free' | 'expert';

export interface SubscriptionFeatures {
  maxCompanies: number | null; // null = unlimited
  maxEmployees: number | null;
  aiRiskAnalysis: boolean;
  pdfExport: boolean;
  excelExport: boolean;
  prioritySupport: boolean;
}

export interface SubscriptionPlanData {
  id: string;
  plan_code: SubscriptionPlan;
  plan_name: string;
  price: number;
  currency: string;
  billing_period: 'monthly' | 'yearly';
  max_companies: number | null;
  max_employees: number | null;
  ai_risk_analysis: boolean;
  pdf_export: boolean;
  excel_export: boolean;
  priority_support: boolean;
}

export interface BillingHistory {
  id: string;
  user_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  invoice_url: string | null;
  billing_date: string;
  period_start: string;
  period_end: string;
  payment_method: string | null;
}

export interface UserSession {
  id: string;
  user_id: string;
  device_name: string;
  device_type: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web';
  browser: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  created_at: string;
  is_current: boolean;
}