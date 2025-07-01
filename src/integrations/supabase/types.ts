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
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          updated_at?: string
        }
        Relationships: []
      }
      payee_classifications: {
        Row: {
          batch_id: string | null
          classification: string
          confidence: number
          created_at: string
          id: string
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
          batch_id?: string | null
          classification: string
          confidence: number
          created_at?: string
          id?: string
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
          batch_id?: string | null
          classification?: string
          confidence?: number
          created_at?: string
          id?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
