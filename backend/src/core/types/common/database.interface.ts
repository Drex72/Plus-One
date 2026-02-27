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
      attendees: {
        Row: {
          attributes: Json
          created_at: string
          deleted_at: string | null
          email: string | null
          embedding: string | null
          event_id: string
          external_id: string | null
          id: string
          metadata: Json
          name: string
          preferences: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          embedding?: string | null
          event_id: string
          external_id?: string | null
          id?: string
          metadata?: Json
          name: string
          preferences?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          embedding?: string | null
          event_id?: string
          external_id?: string | null
          id?: string
          metadata?: Json
          name?: string
          preferences?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          matching_config: Json
          name: string
          starts_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          matching_config?: Json
          name: string
          starts_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          matching_config?: Json
          name?: string
          starts_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          attendee_a_id: string
          attendee_b_id: string
          created_at: string
          event_id: string
          id: string
          metadata: Json
          score: number
          score_breakdown: Json
          status: string
          strategy: string
          tenant_id: string
        }
        Insert: {
          attendee_a_id: string
          attendee_b_id: string
          created_at?: string
          event_id: string
          id?: string
          metadata?: Json
          score: number
          score_breakdown?: Json
          status?: string
          strategy?: string
          tenant_id: string
        }
        Update: {
          attendee_a_id?: string
          attendee_b_id?: string
          created_at?: string
          event_id?: string
          id?: string
          metadata?: Json
          score?: number
          score_breakdown?: Json
          status?: string
          strategy?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_attendee_a_id_fkey"
            columns: ["attendee_a_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_attendee_b_id_fkey"
            columns: ["attendee_b_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      matching_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          event_id: string
          id: string
          mode: string
          result_summary: Json | null
          started_at: string | null
          status: string
          tenant_id: string
          trigger_attendee_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          event_id: string
          id?: string
          mode?: string
          result_summary?: Json | null
          started_at?: string | null
          status?: string
          tenant_id: string
          trigger_attendee_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          event_id?: string
          id?: string
          mode?: string
          result_summary?: Json | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          trigger_attendee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matching_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_jobs_trigger_attendee_id_fkey"
            columns: ["trigger_attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          api_key: string
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          name: string
          updated_at: string
          webhook_endpoint: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
          webhook_endpoint?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
          webhook_endpoint?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          endpoint: string
          event_id: string
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          match_id: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          endpoint: string
          event_id: string
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          match_id?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          endpoint?: string
          event_id?: string
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          match_id?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_nearest_attendees: {
        Args: {
          p_embedding: string
          p_event_id: string
          p_limit?: number
          p_tenant_id: string
        }
        Returns: {
          attributes: Json
          created_at: string
          deleted_at: string | null
          email: string | null
          embedding: string | null
          event_id: string
          external_id: string | null
          id: string
          metadata: Json
          name: string
          preferences: Json
          status: string
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "attendees"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
