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
      bancos: {
        Row: {
          agencia: string | null
          conta: string | null
          created_at: string
          fechamento_dia: number | null
          id: string
          limite: number | null
          nome: string
          saldo_inicial: number
          tipo: string
          updated_at: string
          user_id: string
          vencimento_dia: number | null
        }
        Insert: {
          agencia?: string | null
          conta?: string | null
          created_at?: string
          fechamento_dia?: number | null
          id?: string
          limite?: number | null
          nome: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id: string
          vencimento_dia?: number | null
        }
        Update: {
          agencia?: string | null
          conta?: string | null
          created_at?: string
          fechamento_dia?: number | null
          id?: string
          limite?: number | null
          nome?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id?: string
          vencimento_dia?: number | null
        }
        Relationships: []
      }
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
          grupo_id: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grupo_id?: string | null
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grupo_id?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["movimento_tipo"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_categoria"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          obs: string | null
          telefone: string | null
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
          produto_id: string | null
          stage: string
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
          produto_id?: string | null
          stage?: string
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
          produto_id?: string | null
          stage?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas_pipeline: {
        Row: {
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          user_id?: string
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
      fornecedores: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          obs: string | null
          telefone: string | null
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
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grupos_categoria: {
        Row: {
          created_at: string
          id: string
          nome: string
          ordem: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lancamento_rateios: {
        Row: {
          categoria_id: string | null
          created_at: string
          descricao: string | null
          id: string
          lancamento_id: string
          percentual: number | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lancamento_id: string
          percentual?: number | null
          user_id: string
          valor?: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lancamento_id?: string
          percentual?: number | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_rateios_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_rateios_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          banco_id: string | null
          categoria_id: string | null
          cliente_id: string | null
          contato_id: string | null
          created_at: string
          data: string
          descricao: string
          fornecedor_id: string | null
          id: string
          parcela_grupo_id: string | null
          parcela_numero: number | null
          parcela_total: number | null
          status: Database["public"]["Enums"]["lancamento_status"]
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          banco_id?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          contato_id?: string | null
          created_at?: string
          data: string
          descricao: string
          fornecedor_id?: string | null
          id?: string
          parcela_grupo_id?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          status?: Database["public"]["Enums"]["lancamento_status"]
          tipo: Database["public"]["Enums"]["movimento_tipo"]
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          banco_id?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          contato_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          parcela_grupo_id?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          status?: Database["public"]["Enums"]["lancamento_status"]
          tipo?: Database["public"]["Enums"]["movimento_tipo"]
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
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
      metas: {
        Row: {
          ano: number
          categoria_id: string | null
          created_at: string
          id: string
          mes: number
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          ano: number
          categoria_id?: string | null
          created_at?: string
          id?: string
          mes: number
          tipo: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          ano?: number
          categoria_id?: string | null
          created_at?: string
          id?: string
          mes?: number
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_fatura: {
        Row: {
          cartao_id: string
          competencia_ref: string
          conta_origem_id: string
          created_at: string
          data: string
          descricao: string | null
          id: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          cartao_id: string
          competencia_ref: string
          conta_origem_id: string
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          cartao_id?: string
          competencia_ref?: string
          conta_origem_id?: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_fatura_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_fatura_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transferencias: {
        Row: {
          afeta_fatura: boolean
          banco_destino_id: string
          banco_origem_id: string
          created_at: string
          data: string
          descricao: string | null
          id: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          afeta_fatura?: boolean
          banco_destino_id: string
          banco_origem_id: string
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          afeta_fatura?: boolean
          banco_destino_id?: string
          banco_origem_id?: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_banco_destino_id_fkey"
            columns: ["banco_destino_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_banco_origem_id_fkey"
            columns: ["banco_origem_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
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
