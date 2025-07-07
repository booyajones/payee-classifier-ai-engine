export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      batch_jobs: {
        Row: {
          app_created_at: string
          app_updated_at: string
          cancelled_at_timestamp: number | null
          completed_at_timestamp: number | null
          created_at_timestamp: number
          csv_file_url: string | null
          errors: Json | null
          excel_file_url: string | null
          expired_at_timestamp: number | null
          failed_at_timestamp: number | null
          file_generated_at: string | null
          file_headers: string[] | null
          file_name: string | null
          file_size_bytes: number | null
          finalizing_at_timestamp: number | null
          id: string
          in_progress_at_timestamp: number | null
          metadata: Json | null
          original_file_data: Json
          output_file_id: string | null
          request_counts_completed: number
          request_counts_failed: number
          request_counts_total: number
          row_mappings: Json
          selected_payee_column: string | null
          status: string
          unique_payee_names: string[]
          updated_at: string | null
        }
        Insert: {
          app_created_at?: string
          app_updated_at?: string
          cancelled_at_timestamp?: number | null
          completed_at_timestamp?: number | null
          created_at_timestamp: number
          csv_file_url?: string | null
          errors?: Json | null
          excel_file_url?: string | null
          expired_at_timestamp?: number | null
          failed_at_timestamp?: number | null
          file_generated_at?: string | null
          file_headers?: string[] | null
          file_name?: string | null
          file_size_bytes?: number | null
          finalizing_at_timestamp?: number | null
          id: string
          in_progress_at_timestamp?: number | null
          metadata?: Json | null
          original_file_data: Json
          output_file_id?: string | null
          request_counts_completed?: number
          request_counts_failed?: number
          request_counts_total?: number
          row_mappings: Json
          selected_payee_column?: string | null
          status: string
          unique_payee_names: string[]
          updated_at?: string | null
        }
        Update: {
          app_created_at?: string
          app_updated_at?: string
          cancelled_at_timestamp?: number | null
          completed_at_timestamp?: number | null
          created_at_timestamp?: number
          csv_file_url?: string | null
          errors?: Json | null
          excel_file_url?: string | null
          expired_at_timestamp?: number | null
          failed_at_timestamp?: number | null
          file_generated_at?: string | null
          file_headers?: string[] | null
          file_name?: string | null
          file_size_bytes?: number | null
          finalizing_at_timestamp?: number | null
          id?: string
          in_progress_at_timestamp?: number | null
          metadata?: Json | null
          original_file_data?: Json
          output_file_id?: string | null
          request_counts_completed?: number
          request_counts_failed?: number
          request_counts_total?: number
          row_mappings?: Json
          selected_payee_column?: string | null
          status?: string
          unique_payee_names?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      exclusion_keywords: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          keyword_type: string
          normalized_keyword: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          keyword_type?: string
          normalized_keyword?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          keyword_type?: string
          normalized_keyword?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      file_generation_queue: {
        Row: {
          batch_job_id: string
          created_at: string | null
          id: string
          last_error: string | null
          processed_at: string | null
          retry_count: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          batch_job_id: string
          created_at?: string | null
          id?: string
          last_error?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          batch_job_id?: string
          created_at?: string | null
          id?: string
          last_error?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payee_classifications: {
        Row: {
          ai_duplicate_reasoning: string | null
          batch_id: string | null
          classification: string
          confidence: number
          created_at: string
          duplicate_confidence_score: number | null
          duplicate_detection_method: string | null
          duplicate_group_id: string | null
          duplicate_of_payee_id: string | null
          id: string
          is_potential_duplicate: boolean | null
          keyword_exclusion: Json | null
          matching_rules: string[] | null
          original_data: Json | null
          payee_name: string
          processing_method: string | null
          processing_tier: string
          reasoning: string
          row_index: number | null
          sic_code: string | null
          sic_description: string | null
          similarity_scores: Json | null
          updated_at: string
        }
        Insert: {
          ai_duplicate_reasoning?: string | null
          batch_id?: string | null
          classification: string
          confidence: number
          created_at?: string
          duplicate_confidence_score?: number | null
          duplicate_detection_method?: string | null
          duplicate_group_id?: string | null
          duplicate_of_payee_id?: string | null
          id?: string
          is_potential_duplicate?: boolean | null
          keyword_exclusion?: Json | null
          matching_rules?: string[] | null
          original_data?: Json | null
          payee_name: string
          processing_method?: string | null
          processing_tier: string
          reasoning: string
          row_index?: number | null
          sic_code?: string | null
          sic_description?: string | null
          similarity_scores?: Json | null
          updated_at?: string
        }
        Update: {
          ai_duplicate_reasoning?: string | null
          batch_id?: string | null
          classification?: string
          confidence?: number
          created_at?: string
          duplicate_confidence_score?: number | null
          duplicate_detection_method?: string | null
          duplicate_group_id?: string | null
          duplicate_of_payee_id?: string | null
          id?: string
          is_potential_duplicate?: boolean | null
          keyword_exclusion?: Json | null
          matching_rules?: string[] | null
          original_data?: Json | null
          payee_name?: string
          processing_method?: string | null
          processing_tier?: string
          reasoning?: string
          row_index?: number | null
          sic_code?: string | null
          sic_description?: string | null
          similarity_scores?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      normalize_keyword: {
        Args: { input_text: string }
        Returns: string
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
