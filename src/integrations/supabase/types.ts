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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      notas_fiscais: {
        Row: {
          created_at: string
          data_conclusao: string | null
          data_nf: string
          id: string
          numero_nf: string
          observacao: string | null
          referente_a: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_conclusao?: string | null
          data_nf: string
          id?: string
          numero_nf: string
          observacao?: string | null
          referente_a: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_conclusao?: string | null
          data_nf?: string
          id?: string
          numero_nf?: string
          observacao?: string | null
          referente_a?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          area: string
          confianca_leitura: number | null
          created_at: string
          data_conclusao: string | null
          data_inicio: string
          equipamento: string
          hora_conclusao: string | null
          hora_inicio: string
          horimetro: number
          id: string
          imagem_url: string
          manutencao_tipo: string
          observacoes: string | null
          responsavel: string
          setor: string
          updated_at: string
        }
        Insert: {
          area: string
          confianca_leitura?: number | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio: string
          equipamento: string
          hora_conclusao?: string | null
          hora_inicio: string
          horimetro: number
          id?: string
          imagem_url: string
          manutencao_tipo: string
          observacoes?: string | null
          responsavel: string
          setor: string
          updated_at?: string
        }
        Update: {
          area?: string
          confianca_leitura?: number | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string
          equipamento?: string
          hora_conclusao?: string | null
          hora_inicio?: string
          horimetro?: number
          id?: string
          imagem_url?: string
          manutencao_tipo?: string
          observacoes?: string | null
          responsavel?: string
          setor?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_escaneadas: {
        Row: {
          area: string | null
          confianca_leitura: number | null
          created_at: string
          data_conclusao: string | null
          data_inicio: string | null
          equipamento: string | null
          hora_conclusao: string | null
          hora_inicio: string | null
          horimetro: number | null
          id: string
          imagem_url: string
          manutencao_tipo: string | null
          observacoes: string | null
          responsavel: string | null
          revisado: boolean | null
          setor: string | null
          texto_extraido: string | null
        }
        Insert: {
          area?: string | null
          confianca_leitura?: number | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          equipamento?: string | null
          hora_conclusao?: string | null
          hora_inicio?: string | null
          horimetro?: number | null
          id?: string
          imagem_url: string
          manutencao_tipo?: string | null
          observacoes?: string | null
          responsavel?: string | null
          revisado?: boolean | null
          setor?: string | null
          texto_extraido?: string | null
        }
        Update: {
          area?: string | null
          confianca_leitura?: number | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          equipamento?: string | null
          hora_conclusao?: string | null
          hora_inicio?: string | null
          horimetro?: number | null
          id?: string
          imagem_url?: string
          manutencao_tipo?: string | null
          observacoes?: string | null
          responsavel?: string | null
          revisado?: boolean | null
          setor?: string | null
          texto_extraido?: string | null
        }
        Relationships: []
      }
      preventivas: {
        Row: {
          created_at: string
          data_conclusao: string | null
          data_prevista: string
          descricao: string
          equipamento: string
          id: string
          observacao_baixa: string | null
          responsavel: string
          setor: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_conclusao?: string | null
          data_prevista: string
          descricao: string
          equipamento: string
          id?: string
          observacao_baixa?: string | null
          responsavel: string
          setor: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_conclusao?: string | null
          data_prevista?: string
          descricao?: string
          equipamento?: string
          id?: string
          observacao_baixa?: string | null
          responsavel?: string
          setor?: string
          status?: string
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
