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
      // ✅ 1. ORGANIZATIONS (Kuruluşlar)
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          description: string | null
          industry: string | null
          country: string
          city: string | null
          address: string | null
          phone: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          description?: string | null
          industry?: string | null
          country?: string
          city?: string | null
          address?: string | null
          phone?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          description?: string | null
          industry?: string | null
          country?: string
          city?: string | null
          address?: string | null
          phone?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // ✅ 2. PROFILES (Kullanıcı Profilleri)
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          full_name: string | null
          email: string | null
          avatar_url: string | null
          phone: string | null
          position: string | null
          department: string | null
          role: "admin" | "inspector" | "staff" | "manager"
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          phone?: string | null
          position?: string | null
          department?: string | null
          role?: "admin" | "inspector" | "staff" | "manager"
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          phone?: string | null
          position?: string | null
          department?: string | null
          role?: "admin" | "inspector" | "staff" | "manager"
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
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

      // ✅ 3. USER_ROLES (Kullanıcı Rolleri)
      user_roles: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: "admin" | "manager" | "inspector" | "staff"
          permissions: Json
          assigned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role: "admin" | "manager" | "inspector" | "staff"
          permissions?: Json
          assigned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: "admin" | "manager" | "inspector" | "staff"
          permissions?: Json
          assigned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }

      // ✅ 4. INSPECTIONS (Denetimler)
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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

      // ✅ 5. FINDINGS (Bulgular/DÖF)
      findings: {
        Row: {
          id: string
          inspection_id: string
          description: string
          action_required: string | null
          due_date: string | null
          is_resolved: boolean
          resolved_at: string | null
          resolution_notes: string | null
          assigned_to: string | null
          priority: "low" | "medium" | "high" | "critical"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inspection_id: string
          description: string
          action_required?: string | null
          due_date?: string | null
          is_resolved?: boolean
          resolved_at?: string | null
          resolution_notes?: string | null
          assigned_to?: string | null
          priority?: "low" | "medium" | "high" | "critical"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inspection_id?: string
          description?: string
          action_required?: string | null
          due_date?: string | null
          is_resolved?: boolean
          resolved_at?: string | null
          resolution_notes?: string | null
          assigned_to?: string | null
          priority?: "low" | "medium" | "high" | "critical"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ✅ 6. INSPECTION_TEMPLATES (Denetim Şablonları)
      inspection_templates: {
        Row: {
          id: string
          org_id: string
          title: string
          description: string | null
          fields_json: Record<string, any>
          created_by: string
          is_active: boolean
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          title: string
          description?: string | null
          fields_json: Record<string, any>
          created_by: string
          is_active?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          title?: string
          description?: string | null
          fields_json?: Record<string, any>
          created_by?: string
          is_active?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ✅ 7. BULK_CAPA_SESSIONS (Toplu DÖF Oturumları)
      bulk_capa_sessions: {
        Row: {
          id: string
          org_id: string
          user_id: string
          site_name: string
          recipient_email: string
          status: "active" | "archived" | "sent"
          entries_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          site_name: string
          recipient_email: string
          status?: "active" | "archived" | "sent"
          entries_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          site_name?: string
          recipient_email?: string
          status?: "active" | "archived" | "sent"
          entries_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_capa_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_capa_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ✅ 8. BULK_CAPA_ENTRIES (Toplu DÖF Girdileri)
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
          fk_value: number | null
          fk_level: string | null
          ai_warning: string | null
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
          fk_value?: number | null
          fk_level?: string | null
          ai_warning?: string | null
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
          fk_value?: number | null
          fk_level?: string | null
          ai_warning?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_capa_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bulk_capa_sessions"
            referencedColumns: ["id"]
          }
        ]
      }

      // ✅ 9. AUDIT_LOGS (Denetim Günlükleri)
      audit_logs: {
        Row: {
          id: string
          org_id: string
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          old_values: Record<string, any> | null
          new_values: Record<string, any> | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          old_values?: Record<string, any> | null
          new_values?: Record<string, any> | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          old_values?: Record<string, any> | null
          new_values?: Record<string, any> | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ✅ 10. NOTIFICATIONS (Bildirimler)
      notifications: {
        Row: {
          id: string
          user_id: string
          org_id: string
          title: string
          message: string | null
          type: "info" | "warning" | "error" | "success"
          is_read: boolean
          action_url: string | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          title: string
          message?: string | null
          type?: "info" | "warning" | "error" | "success"
          is_read?: boolean
          action_url?: string | null
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string
          title?: string
          message?: string | null
          type?: "info" | "warning" | "error" | "success"
          is_read?: boolean
          action_url?: string | null
          created_at?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }

      // ✅ 11. REPORTS (Raporlar)
      reports: {
        Row: {
          id: string
          org_id: string
          user_id: string
          title: string
          report_type: "inspection" | "risk" | "compliance" | "summary"
          content: Record<string, any> | null
          generated_at: string
          export_format: string
          file_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          title: string
          report_type: "inspection" | "risk" | "compliance" | "summary"
          content?: Record<string, any> | null
          generated_at?: string
          export_format?: string
          file_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          title?: string
          report_type?: "inspection" | "risk" | "compliance" | "summary"
          content?: Record<string, any> | null
          generated_at?: string
          export_format?: string
          file_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ✅ 12. SAFETY_LIBRARY (İSG Kütüphanesi)
      safety_library: {
        Row: {
          id: string
          category_id: string
          category_label: string
          hazard_name: string
          prevention_text: string
          risk_level: "low" | "medium" | "high" | "critical"
          regulation: string | null
          details: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          category_label: string
          hazard_name: string
          prevention_text: string
          risk_level?: "low" | "medium" | "high" | "critical"
          regulation?: string | null
          details?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          category_label?: string
          hazard_name?: string
          prevention_text?: string
          risk_level?: "low" | "medium" | "high" | "critical"
          regulation?: string | null
          details?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }

    Views: {}
    Functions: {}

    Enums: {
      app_role: "admin" | "inspector" | "viewer" | "staff" | "manager"
      inspection_status: "draft" | "in_progress" | "completed" | "cancelled"
      risk_level: "low" | "medium" | "high" | "critical"
    }

    CompositeTypes: {}
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never