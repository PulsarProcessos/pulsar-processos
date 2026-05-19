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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      campanhas: {
        Row: {
          canal: string
          created_at: string
          fim: string | null
          id: string
          inicio: string | null
          leads: number
          nome: string
          orcamento: number
          status: Database["public"]["Enums"]["campanha_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          canal: string
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          leads?: number
          nome: string
          orcamento?: number
          status?: Database["public"]["Enums"]["campanha_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          canal?: string
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          leads?: number
          nome?: string
          orcamento?: number
          status?: Database["public"]["Enums"]["campanha_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          created_at: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["movimento_tipo"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contatos: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          obs: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["contato_tipo"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome: string
          obs?: string | null
          telefone?: string | null
          tipo: Database["public"]["Enums"]["contato_tipo"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome?: string
          obs?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["contato_tipo"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          cliente: string
          contato: string | null
          created_at: string
          dias: number
          email: string | null
          id: string
          obs: string | null
          origem_lead_id: string | null
          probabilidade: number
          stage: Database["public"]["Enums"]["deal_stage"]
          titulo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          cliente: string
          contato?: string | null
          created_at?: string
          dias?: number
          email?: string | null
          id?: string
          obs?: string | null
          origem_lead_id?: string | null
          probabilidade?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          titulo: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          cliente?: string
          contato?: string | null
          created_at?: string
          dias?: number
          email?: string | null
          id?: string
          obs?: string | null
          origem_lead_id?: string | null
          probabilidade?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          titulo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      eventos: {
        Row: {
          canal: string | null
          created_at: string
          data: string
          id: string
          obs: string | null
          tipo: Database["public"]["Enums"]["evento_tipo"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canal?: string | null
          created_at?: string
          data: string
          id?: string
          obs?: string | null
          tipo: Database["public"]["Enums"]["evento_tipo"]
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canal?: string | null
          created_at?: string
          data?: string
          id?: string
          obs?: string | null
          tipo?: Database["public"]["Enums"]["evento_tipo"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          categoria_id: string | null
          contato_id: string | null
          created_at: string
          data: string
          descricao: string
          id: string
          status: Database["public"]["Enums"]["lancamento_status"]
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          contato_id?: string | null
          created_at?: string
          data: string
          descricao: string
          id?: string
          status?: Database["public"]["Enums"]["lancamento_status"]
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          contato_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          status?: Database["public"]["Enums"]["lancamento_status"]
          tipo?: Database["public"]["Enums"]["movimento_tipo"]
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          data: string
          email: string | null
          id: string
          nome: string
          obs: string | null
          origem: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          email?: string | null
          id?: string
          nome: string
          obs?: string | null
          origem?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          email?: string | null
          id?: string
          nome?: string
          obs?: string | null
          origem?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          updated_at?: string
          user_id?: string
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
      campanha_status: "Ativa" | "Pausada" | "Encerrada"
      contato_tipo: "Cliente" | "Fornecedor"
      deal_stage:
        | "Lead"
        | "Qualificado"
        | "Proposta Enviada"
        | "Negociação"
        | "Ganho"
        | "Perdido"
      evento_tipo: "Postagem" | "Atividade" | "Reunião"
      lancamento_status: "Pago" | "Pendente"
      lead_status:
        | "Novo"
        | "Contatado"
        | "Qualificado"
        | "Convertido"
        | "Perdido"
      movimento_tipo: "Receita" | "Despesa"
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
    Enums: {
      campanha_status: ["Ativa", "Pausada", "Encerrada"],
      contato_tipo: ["Cliente", "Fornecedor"],
      deal_stage: [
        "Lead",
        "Qualificado",
        "Proposta Enviada",
        "Negociação",
        "Ganho",
        "Perdido",
      ],
      evento_tipo: ["Postagem", "Atividade", "Reunião"],
      lancamento_status: ["Pago", "Pendente"],
      lead_status: [
        "Novo",
        "Contatado",
        "Qualificado",
        "Convertido",
        "Perdido",
      ],
      movimento_tipo: ["Receita", "Despesa"],
    },
  },
} as const
