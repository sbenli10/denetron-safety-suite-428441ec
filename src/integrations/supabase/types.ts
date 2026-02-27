export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          org_id: string
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          org_id: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
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
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
      bulk_capa_entries: {
        Row: {
          ai_warning: string | null
          correction_plan: string | null
          created_at: string | null
          description: string
          fk_frequency: number | null
          fk_level: string | null
          fk_probability: number | null
          fk_severity: number | null
          fk_value: number | null
          id: string
          risk_score: string | null
          session_id: string
        }
        Insert: {
          ai_warning?: string | null
          correction_plan?: string | null
          created_at?: string | null
          description: string
          fk_frequency?: number | null
          fk_level?: string | null
          fk_probability?: number | null
          fk_severity?: number | null
          fk_value?: number | null
          id?: string
          risk_score?: string | null
          session_id: string
        }
        Update: {
          ai_warning?: string | null
          correction_plan?: string | null
          created_at?: string | null
          description?: string
          fk_frequency?: number | null
          fk_level?: string | null
          fk_probability?: number | null
          fk_severity?: number | null
          fk_value?: number | null
          id?: string
          risk_score?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_capa_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bulk_capa_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_capa_sessions: {
        Row: {
          created_at: string | null
          entries_count: number | null
          id: string
          org_id: string
          recipient_email: string
          site_name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entries_count?: number | null
          id?: string
          org_id: string
          recipient_email: string
          site_name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entries_count?: number | null
          id?: string
          org_id?: string
          recipient_email?: string
          site_name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
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
            foreignKeyName: "bulk_capa_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
      capa_records: {
        Row: {
          assigned_person: string
          corrective_action: string
          created_at: string | null
          deadline: string
          id: string
          non_conformity: string
          notes: string | null
          org_id: string
          priority: string | null
          root_cause: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_person: string
          corrective_action: string
          created_at?: string | null
          deadline: string
          id?: string
          non_conformity: string
          notes?: string | null
          org_id: string
          priority?: string | null
          root_cause: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_person?: string
          corrective_action?: string
          created_at?: string | null
          deadline?: string
          id?: string
          non_conformity?: string
          notes?: string | null
          org_id?: string
          priority?: string | null
          root_cause?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capa_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
      findings: {
        Row: {
          action_required: string | null
          assigned_to: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          inspection_id: string
          is_resolved: boolean | null
          notification_method: string | null
          priority: string | null
          resolution_notes: string | null
          resolved_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action_required?: string | null
          assigned_to?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          inspection_id: string
          is_resolved?: boolean | null
          notification_method?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_required?: string | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          inspection_id?: string
          is_resolved?: boolean | null
          notification_method?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          updated_at?: string | null
          user_id?: string | null
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
            foreignKeyName: "findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "v_recent_activities"
            referencedColumns: ["inspection_id"]
          },
        ]
      }
      hazard_analyses: {
        Row: {
          ai_result: Json
          created_at: string | null
          hazard_description: string
          id: string
          risk_score: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_result: Json
          created_at?: string | null
          hazard_description: string
          id?: string
          risk_score?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_result?: Json
          created_at?: string | null
          hazard_description?: string
          id?: string
          risk_score?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inspection_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          fields_json: Json
          id: string
          is_active: boolean | null
          org_id: string
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          fields_json: Json
          id?: string
          is_active?: boolean | null
          org_id: string
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          fields_json?: Json
          id?: string
          is_active?: boolean | null
          org_id?: string
          title?: string
          updated_at?: string | null
          usage_count?: number | null
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
            foreignKeyName: "inspection_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
      inspections: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string | null
          equipment_category: string | null
          id: string
          location_name: string
          media_urls: Json | null
          notes: string | null
          org_id: string
          risk_level: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string | null
          equipment_category?: string | null
          id?: string
          location_name: string
          media_urls?: Json | null
          notes?: string | null
          org_id: string
          risk_level?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string | null
          equipment_category?: string | null
          id?: string
          location_name?: string
          media_urls?: Json | null
          notes?: string | null
          org_id?: string
          risk_level?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
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
            foreignKeyName: "inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          org_id: string
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          org_id: string
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          org_id?: string
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          organization_id: string | null
          phone: string | null
          position: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
      reports: {
        Row: {
          content: Json | null
          created_at: string | null
          export_format: string | null
          file_url: string | null
          generated_at: string | null
          id: string
          org_id: string
          report_type: string
          title: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          export_format?: string | null
          file_url?: string | null
          generated_at?: string | null
          id?: string
          org_id: string
          report_type: string
          title: string
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          export_format?: string | null
          file_url?: string | null
          generated_at?: string | null
          id?: string
          org_id?: string
          report_type?: string
          title?: string
          user_id?: string
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
            foreignKeyName: "reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
      safety_library: {
        Row: {
          category_id: string
          category_label: string
          created_at: string | null
          details: string | null
          hazard_name: string
          id: string
          prevention_text: string
          regulation: string | null
          risk_level: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          category_label: string
          created_at?: string | null
          details?: string | null
          hazard_name: string
          id?: string
          prevention_text: string
          regulation?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          category_label?: string
          created_at?: string | null
          details?: string | null
          hazard_name?: string
          id?: string
          prevention_text?: string
          regulation?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          organization_id: string
          permissions: Json | null
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          organization_id: string
          permissions?: Json | null
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          organization_id?: string
          permissions?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
    }
    Views: {
      v_dashboard_stats: {
        Row: {
          active_inspections: number | null
          critical_count: number | null
          open_findings: number | null
          org_id: string | null
          org_name: string | null
          overdue_actions: number | null
          total_inspections: number | null
        }
        Relationships: []
      }
      v_recent_activities: {
        Row: {
          created_at: string | null
          created_by: string | null
          inspection_id: string | null
          location_name: string | null
          org_id: string | null
          risk_level: string | null
          status: string | null
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
            foreignKeyName: "inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
      v_risk_distribution: {
        Row: {
          count: number | null
          org_id: string | null
          risk_level: string | null
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
            foreignKeyName: "inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_stats"
            referencedColumns: ["org_id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
