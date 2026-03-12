export type CertificateTemplateType = "classic" | "modern" | "minimal";
export type CertificateFrameStyle = "gold" | "blue" | "green";
export type CertificateJobStatus =
  | "draft"
  | "queued"
  | "processing"
  | "processing_with_errors"
  | "completed"
  | "completed_with_errors"
  | "failed";

export interface CertificateParticipantInput {
  id?: string;
  name: string;
  tc_no?: string;
  job_title?: string;
  certificate_no?: string | null;
  pdf_path?: string | null;
  verification_code?: string | null;
}

export interface CertificateFormValues {
  company_id?: string | null;
  company_name: string;
  company_address: string;
  company_phone: string;
  training_name: string;
  training_date: string;
  training_duration: string;
  certificate_type: string;
  validity_date?: string;
  logo_url?: string;
  template_type: CertificateTemplateType;
  frame_style: CertificateFrameStyle;
  trainer_names: string[];
  notes?: string;
}

export interface CertificateRecord extends CertificateFormValues {
  id: string;
  created_at: string;
}

export interface CertificateJobRecord {
  id: string | null;
  certificate_id: string;
  status: CertificateJobStatus;
  progress: number;
  total_files: number;
  completed_files: number;
  zip_path?: string | null;
  downloadUrl?: string | null;
  error_message?: string | null;
}

export interface CertificateJobItem {
  id: string;
  participant_id: string;
  status: string;
  pdf_path?: string | null;
  verification_code?: string | null;
  error_message?: string | null;
}
