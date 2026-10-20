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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          admin_id: string
          admin_nome: string
          alvo: string
          antes: string | null
          data: string
          depois: string | null
          descricao: string
          id: string
          secao: string | null
          tipo: string
        }
        Insert: {
          admin_id?: string
          admin_nome?: string
          alvo?: string
          antes?: string | null
          data?: string
          depois?: string | null
          descricao?: string
          id?: string
          secao?: string | null
          tipo: string
        }
        Update: {
          admin_id?: string
          admin_nome?: string
          alvo?: string
          antes?: string | null
          data?: string
          depois?: string | null
          descricao?: string
          id?: string
          secao?: string | null
          tipo?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          criado_em: string
          criado_por: string | null
          data: Json
          documento: string
          id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: Json
          documento?: string
          id?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: Json
          documento?: string
          id?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          data: Json
          id: number
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          data?: Json
          id?: number
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          data?: Json
          id?: number
        }
        Relationships: []
      }
      marcas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      orcamentos: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          cliente_id: string | null
          criado_em: string
          criado_por: string | null
          data: Json
          id: string
          numero: number
          status: string
          tipo: string
          veiculo_id: string | null
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          cliente_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: Json
          id?: string
          numero: number
          status?: string
          tipo?: string
          veiculo_id?: string | null
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          cliente_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: Json
          id?: string
          numero?: number
          status?: string
          tipo?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          descricao: string
          id: string
          nome: string
          permissoes: Json
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          id: string
          nome: string
          permissoes?: Json
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          id?: string
          nome?: string
          permissoes?: Json
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          codigo: string
          criado_em: string
          criado_por: string | null
          data: Json
          id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          data?: Json
          id?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          data?: Json
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          criado_em: string
          email: string
          id: string
          nome: string
          telefone: string
          ultimo_acesso: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          email: string
          id: string
          nome: string
          telefone?: string
          ultimo_acesso?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string
          ultimo_acesso?: string | null
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          criado_em: string
          criado_por: string | null
          data: Json
          id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: Json
          id?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: Json
          id?: string
        }
        Relationships: []
      }
      user_perfis: {
        Row: {
          perfil_id: string
          user_id: string
        }
        Insert: {
          perfil_id: string
          user_id: string
        }
        Update: {
          perfil_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_perfis_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_perfis_profile_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          cliente_id: string
          criado_em: string
          criado_por: string | null
          data: Json
          id: string
          placa: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          cliente_id: string
          criado_em?: string
          criado_por?: string | null
          data?: Json
          id?: string
          placa?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          cliente_id?: string
          criado_em?: string
          criado_por?: string | null
          data?: Json
          id?: string
          placa?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      eh_administrador: { Args: never; Returns: boolean }
      precisa_configuracao_inicial: { Args: never; Returns: boolean }
      registrar_acesso: { Args: never; Returns: undefined }
      resetar_dados_operacionais: { Args: never; Returns: Json }
      tem_permissao: {
        Args: { _acao: string; _modulo: string }
        Returns: boolean
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
