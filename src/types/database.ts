// src/types/database.ts - Supabase Database TypeScript Definitions
// Auto-generated types for type-safe database access

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'inspector' | 'supervisor' | 'employee';

export type InspectionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'completed';

export type InspectionType = 'fire_extinguisher' | 'first_aid' | 'hse_general' | 'manhours_report';

export type RatingType = '✓' | 'X' | 'NA';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          pin: string;
          role: UserRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_login: string | null;
          created_by: string | null;
          signature: string | null;
          signature_pin: string | null;
          signature_created_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          pin: string;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          created_by?: string | null;
          signature?: string | null;
          signature_pin?: string | null;
          signature_created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          pin?: string;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          created_by?: string | null;
          signature?: string | null;
          signature_pin?: string | null;
          signature_created_at?: string | null;
        };
      };
      user_permissions: {
        Row: {
          id: string;
          user_id: string;
          can_manage_users: boolean;
          can_manage_forms: boolean;
          can_create_inspections: boolean;
          can_view_inspections: boolean;
          can_review_inspections: boolean;
          can_approve_inspections: boolean;
          can_reject_inspections: boolean;
          can_view_pending_inspections: boolean;
          can_view_analytics: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          can_manage_users?: boolean;
          can_manage_forms?: boolean;
          can_create_inspections?: boolean;
          can_view_inspections?: boolean;
          can_review_inspections?: boolean;
          can_approve_inspections?: boolean;
          can_reject_inspections?: boolean;
          can_view_pending_inspections?: boolean;
          can_view_analytics?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          can_manage_users?: boolean;
          can_manage_forms?: boolean;
          can_create_inspections?: boolean;
          can_view_inspections?: boolean;
          can_review_inspections?: boolean;
          can_approve_inspections?: boolean;
          can_reject_inspections?: boolean;
          can_view_pending_inspections?: boolean;
          can_view_analytics?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          asset_type: string;
          serial_number: string;
          asset_number: number | null;
          location_id: string | null;
          type_size: string | null;
          expiry_date: string | null;
          last_inspection_date: string | null;
          is_active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_type: string;
          serial_number: string;
          asset_number?: number | null;
          location_id?: string | null;
          type_size?: string | null;
          expiry_date?: string | null;
          last_inspection_date?: string | null;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          asset_type?: string;
          serial_number?: string;
          asset_number?: number | null;
          location_id?: string | null;
          type_size?: string | null;
          expiry_date?: string | null;
          last_inspection_date?: string | null;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      form_templates: {
        Row: {
          id: string;
          name: string;
          inspection_type: InspectionType;
          description: string | null;
          fields: Json;
          is_active: boolean;
          version: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          inspection_type: InspectionType;
          description?: string | null;
          fields: Json;
          is_active?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          inspection_type?: InspectionType;
          description?: string | null;
          fields?: Json;
          is_active?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      inspections: {
        Row: {
          id: string;
          inspection_number: string;
          inspection_type: InspectionType;
          inspector_id: string;
          inspected_by: string;
          designation: string | null;
          asset_id: string | null;
          location_id: string | null;
          inspection_date: string;
          submitted_at: string | null;
          reviewed_at: string | null;
          status: InspectionStatus;
          reviewer_id: string | null;
          review_comments: string | null;
          form_template_id: string | null;
          form_data: Json;
          signature: string | null;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          inspection_number?: string;
          inspection_type: InspectionType;
          inspector_id: string;
          inspected_by: string;
          designation?: string | null;
          asset_id?: string | null;
          location_id?: string | null;
          inspection_date?: string;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          status?: InspectionStatus;
          reviewer_id?: string | null;
          review_comments?: string | null;
          form_template_id?: string | null;
          form_data: Json;
          signature?: string | null;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          inspection_number?: string;
          inspection_type?: InspectionType;
          inspector_id?: string;
          inspected_by?: string;
          designation?: string | null;
          asset_id?: string | null;
          location_id?: string | null;
          inspection_date?: string;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          status?: InspectionStatus;
          reviewer_id?: string | null;
          review_comments?: string | null;
          form_template_id?: string | null;
          form_data?: Json;
          signature?: string | null;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      inspection_items: {
        Row: {
          id: string;
          inspection_id: string;
          item_number: number;
          label: string;
          answer: RatingType | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          item_number: number;
          label: string;
          answer?: RatingType | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          item_number?: number;
          label?: string;
          answer?: RatingType | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      analytics_summary: {
        Row: {
          id: string;
          period_start: string;
          period_end: string;
          total_inspections: number;
          completed_inspections: number;
          pending_inspections: number;
          approved_inspections: number;
          rejected_inspections: number;
          fire_extinguisher_count: number;
          first_aid_count: number;
          hse_general_count: number;
          average_review_time_hours: number | null;
          compliance_rate: number | null;
          metrics_by_location: Json | null;
          metrics_by_inspector: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          period_start: string;
          period_end: string;
          total_inspections?: number;
          completed_inspections?: number;
          pending_inspections?: number;
          approved_inspections?: number;
          rejected_inspections?: number;
          fire_extinguisher_count?: number;
          first_aid_count?: number;
          hse_general_count?: number;
          average_review_time_hours?: number | null;
          compliance_rate?: number | null;
          metrics_by_location?: Json | null;
          metrics_by_inspector?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          period_start?: string;
          period_end?: string;
          total_inspections?: number;
          completed_inspections?: number;
          pending_inspections?: number;
          approved_inspections?: number;
          rejected_inspections?: number;
          fire_extinguisher_count?: number;
          first_aid_count?: number;
          hse_general_count?: number;
          average_review_time_hours?: number | null;
          compliance_rate?: number | null;
          metrics_by_location?: Json | null;
          metrics_by_inspector?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_trail: {
        Row: {
          id: string;
          user_id: string | null;
          user_name: string | null;
          user_role: UserRole | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          description: string | null;
          old_values: Json | null;
          new_values: Json | null;
          timestamp: string;
          ip_address: string | null;
          user_agent: string | null;
          request_method: string | null;
          request_path: string | null;
          severity: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_name?: string | null;
          user_role?: UserRole | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          description?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          timestamp?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          request_method?: string | null;
          request_path?: string | null;
          severity?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          user_name?: string | null;
          user_role?: UserRole | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          description?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          timestamp?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          request_method?: string | null;
          request_path?: string | null;
          severity?: string;
        };
      };
      security_logs: {
        Row: {
          id: string;
          event_type: string;
          severity: string;
          user_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          description: string;
          metadata: Json | null;
          timestamp: string;
          risk_level: number;
          requires_action: boolean;
          actioned_by: string | null;
          actioned_at: string | null;
        };
        Insert: {
          id?: string;
          event_type: string;
          severity?: string;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          description: string;
          metadata?: Json | null;
          timestamp?: string;
          risk_level?: number;
          requires_action?: boolean;
          actioned_by?: string | null;
          actioned_at?: string | null;
        };
        Update: {
          id?: string;
          event_type?: string;
          severity?: string;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          description?: string;
          metadata?: Json | null;
          timestamp?: string;
          risk_level?: number;
          requires_action?: boolean;
          actioned_by?: string | null;
          actioned_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          related_entity_type: string | null;
          related_entity_id: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
      };
    };
    Views: {
      v_users_with_permissions: {
        Row: {
          id: string;
          email: string;
          name: string;
          pin: string;
          role: UserRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_login: string | null;
          created_by: string | null;
          signature: string | null;
          signature_created_at: string | null;
          can_manage_users: boolean | null;
          can_manage_forms: boolean | null;
          can_create_inspections: boolean | null;
          can_view_inspections: boolean | null;
          can_review_inspections: boolean | null;
          can_approve_inspections: boolean | null;
          can_reject_inspections: boolean | null;
          can_view_pending_inspections: boolean | null;
          can_view_analytics: boolean | null;
        };
      };
      v_inspections_detailed: {
        Row: {
          id: string;
          inspection_number: string;
          inspection_type: InspectionType;
          inspector_id: string;
          inspected_by: string;
          designation: string | null;
          asset_id: string | null;
          location_id: string | null;
          inspection_date: string;
          submitted_at: string | null;
          reviewed_at: string | null;
          status: InspectionStatus;
          reviewer_id: string | null;
          review_comments: string | null;
          form_template_id: string | null;
          form_data: Json;
          signature: string | null;
          remarks: string | null;
          created_at: string;
          updated_at: string;
          inspector_name: string | null;
          inspector_email: string | null;
          location_name: string | null;
          asset_serial_number: string | null;
          asset_type: string | null;
          reviewer_name: string | null;
          reviewer_email: string | null;
        };
      };
      v_pending_inspections: {
        Row: {
          id: string;
          inspection_number: string;
          inspection_type: InspectionType;
          inspector_id: string;
          inspected_by: string;
          inspection_date: string;
          submitted_at: string | null;
          status: InspectionStatus;
          location_name: string | null;
          asset_serial_number: string | null;
          hours_pending: number | null;
        };
      };
      v_assets_requiring_inspection: {
        Row: {
          id: string;
          asset_type: string;
          serial_number: string;
          asset_number: number | null;
          location_id: string | null;
          type_size: string | null;
          expiry_date: string | null;
          last_inspection_date: string | null;
          is_active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          location_name: string | null;
          status: string | null;
        };
      };
    };
    Functions: {
      generate_inspection_number: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      inspection_status: InspectionStatus;
      inspection_type: InspectionType;
      rating_type: RatingType;
    };
  };
}
