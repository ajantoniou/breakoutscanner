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
      backtest_results: {
        Row: {
          created_at: string
          days_to_breakout: number | null
          days_to_target: number | null
          id: string
          max_drawdown: number | null
          pattern_id: string | null
          profit_loss_percent: number | null
          success: boolean
        }
        Insert: {
          created_at?: string
          days_to_breakout?: number | null
          days_to_target?: number | null
          id?: string
          max_drawdown?: number | null
          pattern_id?: string | null
          profit_loss_percent?: number | null
          success: boolean
        }
        Update: {
          created_at?: string
          days_to_breakout?: number | null
          days_to_target?: number | null
          id?: string
          max_drawdown?: number | null
          pattern_id?: string | null
          profit_loss_percent?: number | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "backtest_results_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      cached_patterns: {
        Row: {
          channel_type: string | null
          confidence_score: number
          created_at: string
          ema_pattern: string | null
          entry_price: number
          id: string
          pattern_type: string
          resistance_level: number | null
          status: string
          support_level: number | null
          symbol: string
          target_price: number
          timeframe: string
          trendline_break: boolean | null
          updated_at: string
          volume_confirmation: boolean | null
        }
        Insert: {
          channel_type?: string | null
          confidence_score: number
          created_at?: string
          ema_pattern?: string | null
          entry_price: number
          id?: string
          pattern_type: string
          resistance_level?: number | null
          status?: string
          support_level?: number | null
          symbol: string
          target_price: number
          timeframe: string
          trendline_break?: boolean | null
          updated_at?: string
          volume_confirmation?: boolean | null
        }
        Update: {
          channel_type?: string | null
          confidence_score?: number
          created_at?: string
          ema_pattern?: string | null
          entry_price?: number
          id?: string
          pattern_type?: string
          resistance_level?: number | null
          status?: string
          support_level?: number | null
          symbol?: string
          target_price?: number
          timeframe?: string
          trendline_break?: boolean | null
          updated_at?: string
          volume_confirmation?: boolean | null
        }
        Relationships: []
      }
      historical_prices: {
        Row: {
          close: number
          date: string
          fetched_at: string
          high: number
          id: string
          low: number
          open: number
          symbol: string
          timeframe: string
          volume: number
        }
        Insert: {
          close: number
          date: string
          fetched_at?: string
          high: number
          id?: string
          low: number
          open: number
          symbol: string
          timeframe: string
          volume: number
        }
        Update: {
          close?: number
          date?: string
          fetched_at?: string
          high?: number
          id?: string
          low?: number
          open?: number
          symbol?: string
          timeframe?: string
          volume?: number
        }
        Relationships: []
      }
      patterns: {
        Row: {
          channel_type: Database["public"]["Enums"]["channel_type"] | null
          confidence_score: number
          created_at: string
          ema_pattern: Database["public"]["Enums"]["ema_pattern"] | null
          entry_price: number
          id: string
          pattern_type: Database["public"]["Enums"]["pattern_type"]
          resistance_level: number | null
          status: Database["public"]["Enums"]["pattern_status"]
          support_level: number | null
          symbol: string
          target_price: number
          timeframe: string
          trendline_break: boolean | null
          updated_at: string
          volume_confirmation: boolean | null
        }
        Insert: {
          channel_type?: Database["public"]["Enums"]["channel_type"] | null
          confidence_score: number
          created_at?: string
          ema_pattern?: Database["public"]["Enums"]["ema_pattern"] | null
          entry_price: number
          id?: string
          pattern_type: Database["public"]["Enums"]["pattern_type"]
          resistance_level?: number | null
          status?: Database["public"]["Enums"]["pattern_status"]
          support_level?: number | null
          symbol: string
          target_price: number
          timeframe: string
          trendline_break?: boolean | null
          updated_at?: string
          volume_confirmation?: boolean | null
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["channel_type"] | null
          confidence_score?: number
          created_at?: string
          ema_pattern?: Database["public"]["Enums"]["ema_pattern"] | null
          entry_price?: number
          id?: string
          pattern_type?: Database["public"]["Enums"]["pattern_type"]
          resistance_level?: number | null
          status?: Database["public"]["Enums"]["pattern_status"]
          support_level?: number | null
          symbol?: string
          target_price?: number
          timeframe?: string
          trendline_break?: boolean | null
          updated_at?: string
          volume_confirmation?: boolean | null
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
      channel_type: "horizontal" | "ascending" | "descending"
      ema_pattern:
        | "7over50"
        | "7over100"
        | "50over100"
        | "allBullish"
        | "allBearish"
        | "mixed"
      pattern_status: "active" | "completed" | "failed"
      pattern_type:
        | "Bull Flag"
        | "Bear Flag"
        | "Ascending Triangle"
        | "Descending Triangle"
        | "Symmetrical Triangle"
        | "Cup and Handle"
        | "Head and Shoulders"
        | "Inverse Head and Shoulders"
        | "Double Top"
        | "Double Bottom"
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
    Enums: {
      channel_type: ["horizontal", "ascending", "descending"],
      ema_pattern: [
        "7over50",
        "7over100",
        "50over100",
        "allBullish",
        "allBearish",
        "mixed",
      ],
      pattern_status: ["active", "completed", "failed"],
      pattern_type: [
        "Bull Flag",
        "Bear Flag",
        "Ascending Triangle",
        "Descending Triangle",
        "Symmetrical Triangle",
        "Cup and Handle",
        "Head and Shoulders",
        "Inverse Head and Shoulders",
        "Double Top",
        "Double Bottom",
      ],
    },
  },
} as const
