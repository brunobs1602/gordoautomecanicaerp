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
      fin_cadastros: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          data: Json
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data?: Json
          id?: string
          nome?: string
          tipo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data?: Json
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      fin_historico: {
        Row: {
          conta_id: string | null
          data: string
          documento_id: string | null
          forma_id: string | null
          id: string
          observacao: string
          status_anterior: string | null
          status_novo: string | null
          tipo: string
          titulo_id: string | null
          usuario_id: string | null
          usuario_nome: string
          valor: number | null
        }
        Insert: {
          conta_id?: string | null
          data?: string
          documento_id?: string | null
          forma_id?: string | null
          id?: string
          observacao?: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo: string
          titulo_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string
          valor?: number | null
        }
        Update: {
          conta_id?: string | null
          data?: string
          documento_id?: string | null
          forma_id?: string | null
          id?: string
          observacao?: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo?: string
          titulo_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string
          valor?: number | null
        }
        Relationships: []
      }
      fin_movimentos: {
        Row: {
          conta_id: string
          criado_em: string
          data: Json
          data_mov: string
          documento_id: string | null
          estornado: boolean
          estorno_de: string | null
          forma_id: string | null
          id: string
          tipo: string
          titulo_id: string | null
          usuario_id: string | null
          usuario_nome: string
          valor: number
        }
        Insert: {
          conta_id: string
          criado_em?: string
          data?: Json
          data_mov?: string
          documento_id?: string | null
          estornado?: boolean
          estorno_de?: string | null
          forma_id?: string | null
          id?: string
          tipo: string
          titulo_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string
          valor: number
        }
        Update: {
          conta_id?: string
          criado_em?: string
          data?: Json
          data_mov?: string
          documento_id?: string | null
          estornado?: boolean
          estorno_de?: string | null
          forma_id?: string | null
          id?: string
          tipo?: string
          titulo_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_movimentos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "fin_cadastros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_movimentos_estorno_de_fkey"
            columns: ["estorno_de"]
            isOneToOne: false
            referencedRelation: "fin_movimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_movimentos_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "fin_titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_titulos: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          categoria_id: string | null
          cliente_id: string | null
          criado_em: string
          criado_por: string | null
          data: Json
          descricao: string
          documento_id: string | null
          grupo: string | null
          id: string
          origem: string
          pago: number
          parcela: number
          parcelas: number
          status: string
          tipo: string
          valor: number
          vencimento: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: Json
          descricao?: string
          documento_id?: string | null
          grupo?: string | null
          id?: string
          origem?: string
          pago?: number
          parcela?: number
          parcelas?: number
          status?: string
          tipo: string
          valor: number
          vencimento: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: Json
          descricao?: string
          documento_id?: string | null
          grupo?: string | null
          id?: string
          origem?: string
          pago?: number
          parcela?: number
          parcelas?: number
          status?: string
          tipo?: string
          valor?: number
          vencimento?: string
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
      orc_aprovacoes: {
        Row: {
          conta_id: string | null
          id: string
          itens: Json
          link_id: string
          observacao: string
          orcamento_id: string
          respondido_em: string
          total_aprovado: number
          total_recusado: number
        }
        Insert: {
          conta_id?: string | null
          id?: string
          itens: Json
          link_id: string
          observacao?: string
          orcamento_id: string
          respondido_em?: string
          total_aprovado: number
          total_recusado: number
        }
        Update: {
          conta_id?: string | null
          id?: string
          itens?: Json
          link_id?: string
          observacao?: string
          orcamento_id?: string
          respondido_em?: string
          total_aprovado?: number
          total_recusado?: number
        }
        Relationships: [
          {
            foreignKeyName: "orc_aprovacoes_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "orc_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orc_aprovacoes_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orc_links: {
        Row: {
          ativo: boolean
          criado_em: string
          criado_por: string | null
          criado_por_nome: string
          id: string
          orcamento_id: string
          token: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          criado_por_nome?: string
          id?: string
          orcamento_id: string
          token: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          criado_por_nome?: string
          id?: string
          orcamento_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "orc_links_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
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
      portal_contas: {
        Row: {
          ativo: boolean
          cliente_id: string
          criado_em: string
          email: string
          nome: string
          ultimo_acesso: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          criado_em?: string
          email: string
          nome?: string
          ultimo_acesso?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          criado_em?: string
          email?: string
          nome?: string
          ultimo_acesso?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_contas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
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
      excluir_registro: {
        Args: {
          _id: string
          _motivo?: string
          _somente_verificar?: boolean
          _tipo: string
        }
        Returns: Json
      }
      fin__aplicar: {
        Args: {
          _data: string
          _excesso: boolean
          _pagamentos: Json
          _titulo: string
        }
        Returns: Json
      }
      fin_ajustar: {
        Args: { _conta: string; _data: string; _motivo: string; _valor: number }
        Returns: undefined
      }
      fin_baixar: {
        Args: {
          _data: string
          _excesso?: boolean
          _pagamentos: Json
          _titulo: string
        }
        Returns: Json
      }
      fin_cancelar_titulo: {
        Args: { _id: string; _motivo: string }
        Returns: undefined
      }
      fin_estornar: {
        Args: { _motivo: string; _mov: string }
        Returns: undefined
      }
      fin_finalizar_os: {
        Args: {
          _data: string
          _excesso?: boolean
          _orc: string
          _pagamentos: Json
          _parcelas: number
          _vencimento: string
        }
        Returns: Json
      }
      fin_log: {
        Args: {
          _antes: string
          _conta: string
          _depois: string
          _doc: string
          _forma: string
          _obs: string
          _tipo: string
          _titulo: string
          _valor: number
        }
        Returns: undefined
      }
      fin_nome_usuario: { Args: never; Returns: string }
      fin_parcelar: {
        Args: { _id: string; _parcelas: number; _primeiro: string }
        Returns: undefined
      }
      fin_transferir: {
        Args: {
          _data: string
          _de: string
          _obs: string
          _para: string
          _valor: number
        }
        Returns: undefined
      }
      orc_desativar_link: { Args: { _orc: string }; Returns: undefined }
      orc_gerar_link: { Args: { _orc: string }; Returns: string }
      orc_itens_calc: { Args: { _data: Json }; Returns: Json }
      orc_valido: { Args: { _validade: string }; Returns: boolean }
      portal_abrir_orcamento: { Args: { _orc: string }; Returns: string }
      portal_ativo: { Args: never; Returns: boolean }
      portal_confirmar:
        | {
            Args: { _aprovados: string[]; _token: string; _versao: string }
            Returns: Json
          }
        | {
            Args: {
              _aprovados: string[]
              _obs: string
              _token: string
              _versao: string
            }
            Returns: Json
          }
      portal_conta_ativar: {
        Args: { _ativo: boolean; _user: string }
        Returns: undefined
      }
      portal_ler: { Args: { _token: string }; Returns: Json }
      portal_meus_orcamentos: { Args: never; Returns: Json }
      portal_minha_conta: { Args: never; Returns: Json }
      portal_vincular: { Args: { _token: string }; Returns: Json }
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
