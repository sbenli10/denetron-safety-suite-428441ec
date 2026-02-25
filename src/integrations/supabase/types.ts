export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          full_name: string | null
          avatar_url: string | null
          role: "admin" | "inspector" | "staff" | "manager"
          email: string | null
          updated_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: "admin" | "inspector" | "staff" | "manager"
          email?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: "admin" | "inspector" | "staff" | "manager"
          email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      inspections: {
        Row: {
          id: string
          org_id: string
          user_id: string
          location_name: string
          equipment_category: string | null
          status: "draft" | "in_progress" | "completed" | "cancelled"
          risk_level: "low" | "medium" | "high" | "critical" | null
          answers: Record<string, any>
          media_urls: string[]
          notes: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id?: string
          location_name: string
          equipment_category?: string | null
          status?: "draft" | "in_progress" | "completed" | "cancelled"
          risk_level?: "low" | "medium" | "high" | "critical" | null
          answers?: Record<string, any>
          media_urls?: string[]
          notes?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          location_name?: string
          equipment_category?: string | null
          status?: "draft" | "in_progress" | "completed" | "cancelled"
          risk_level?: "low" | "medium" | "high" | "critical" | null
          answers?: Record<string, any>
          media_urls?: string[]
          notes?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      findings: {
        Row: {
          id: string
          inspection_id: string
          description: string
          action_required: string | null
          due_date: string | null
          is_resolved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          inspection_id: string
          description: string
          action_required?: string | null
          due_date?: string | null
          is_resolved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          inspection_id?: string
          description?: string
          action_required?: string | null
          due_date?: string | null
          is_resolved?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          }
        ]
      }
      bulk_capa_sessions: {
        Row: {
          id: string
          user_id: string
          site_name: string
          recipient_email: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          site_name: string
          recipient_email?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          site_name?: string
          recipient_email?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulk_capa_entries: {
        Row: {
          id: string
          session_id: string
          description: string
          correction_plan: string | null
          risk_score: string | null
          justification: string | null
          fk_probability: number | null
          fk_severity: number | null
          fk_frequency: number | null
          fk_risk_value: number | null
          fk_risk_level: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          description: string
          correction_plan?: string | null
          risk_score?: string | null
          justification?: string | null
          fk_probability?: number | null
          fk_severity?: number | null
          fk_frequency?: number | null
          fk_risk_value?: number | null
          fk_risk_level?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          description?: string
          correction_plan?: string | null
          risk_score?: string | null
          justification?: string | null
          fk_probability?: number | null
          fk_severity?: number | null
          fk_frequency?: number | null
          fk_risk_value?: number | null
          fk_risk_level?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: "admin" | "inspector" | "viewer"
        }
        Insert: {
          id?: string
          user_id: string
          role: "admin" | "inspector" | "viewer"
        }
        Update: {
          id?: string
          user_id?: string
          role?: "admin" | "inspector" | "viewer"
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      app_role: "admin" | "inspector" | "viewer"
    }
    CompositeTypes: {}
  }
}