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
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          processo_id: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          processo_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          processo_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_metadata: {
        Row: {
          category: string
          created_at: string
          id: string
          mime_type: string
          original_name: string
          process_id: string
          size_bytes: number
          storage_path: string
          tags: string[] | null
          task_id: string | null
          uploaded_by: string
          version: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          mime_type: string
          original_name: string
          process_id: string
          size_bytes: number
          storage_path: string
          tags?: string[] | null
          task_id?: string | null
          uploaded_by: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          mime_type?: string
          original_name?: string
          process_id?: string
          size_bytes?: number
          storage_path?: string
          tags?: string[] | null
          task_id?: string | null
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_metadata_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "kanban_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          event_category: string
          id: string
          marked_for_today: boolean
          marked_for_today_at: string | null
          observacoes: string | null
          position_index: number
          priority: string
          processo_id: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_category?: string
          id?: string
          marked_for_today?: boolean
          marked_for_today_at?: string | null
          observacoes?: string | null
          position_index?: number
          priority?: string
          processo_id?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_category?: string
          id?: string
          marked_for_today?: boolean
          marked_for_today_at?: string | null
          observacoes?: string | null
          position_index?: number
          priority?: string
          processo_id?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_tasks_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          complemento: string | null
          created_at: string | null
          data_movimento: string
          descricao: string
          id: string
          processo_id: string
        }
        Insert: {
          complemento?: string | null
          created_at?: string | null
          data_movimento: string
          descricao: string
          id?: string
          processo_id: string
        }
        Update: {
          complemento?: string | null
          created_at?: string | null
          data_movimento?: string
          descricao?: string
          id?: string
          processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      processo_acoes_manuais: {
        Row: {
          created_at: string
          data_acao: string
          descricao: string
          id: string
          processo_id: string
          responsavel_id: string
        }
        Insert: {
          created_at?: string
          data_acao?: string
          descricao: string
          id?: string
          processo_id: string
          responsavel_id: string
        }
        Update: {
          created_at?: string
          data_acao?: string
          descricao?: string
          id?: string
          processo_id?: string
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processo_acoes_manuais_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_comunicacoes: {
        Row: {
          created_at: string
          data_comunicacao: string
          id: string
          meio: string
          processo_id: string
          responsavel_id: string
          resumo: string | null
        }
        Insert: {
          created_at?: string
          data_comunicacao?: string
          id?: string
          meio?: string
          processo_id: string
          responsavel_id: string
          resumo?: string | null
        }
        Update: {
          created_at?: string
          data_comunicacao?: string
          id?: string
          meio?: string
          processo_id?: string
          responsavel_id?: string
          resumo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_comunicacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_notas: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          processo_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          conteudo?: string
          created_at?: string
          id?: string
          processo_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          processo_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_notas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: true
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          advogado: string
          advogado_id: string | null
          cliente: string
          comarca: string
          created_at: string | null
          data_distribuicao: string | null
          data_ultima_sincronizacao: string | null
          descricao_movimentacao: string | null
          fase: string | null
          id: string
          numero: string
          parte_contraria: string | null
          sigla_tribunal: string | null
          sistema_tribunal: string | null
          tags: string[] | null
          tipo_acao: string | null
          ultima_movimentacao: string | null
          updated_at: string | null
          user_id: string
          valor_causa: number | null
          vara: string
        }
        Insert: {
          advogado: string
          advogado_id?: string | null
          cliente: string
          comarca: string
          created_at?: string | null
          data_distribuicao?: string | null
          data_ultima_sincronizacao?: string | null
          descricao_movimentacao?: string | null
          fase?: string | null
          id?: string
          numero: string
          parte_contraria?: string | null
          sigla_tribunal?: string | null
          sistema_tribunal?: string | null
          tags?: string[] | null
          tipo_acao?: string | null
          ultima_movimentacao?: string | null
          updated_at?: string | null
          user_id: string
          valor_causa?: number | null
          vara: string
        }
        Update: {
          advogado?: string
          advogado_id?: string | null
          cliente?: string
          comarca?: string
          created_at?: string | null
          data_distribuicao?: string | null
          data_ultima_sincronizacao?: string | null
          descricao_movimentacao?: string | null
          fase?: string | null
          id?: string
          numero?: string
          parte_contraria?: string | null
          sigla_tribunal?: string | null
          sistema_tribunal?: string | null
          tags?: string[] | null
          tipo_acao?: string | null
          ultima_movimentacao?: string | null
          updated_at?: string | null
          user_id?: string
          valor_causa?: number | null
          vara?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          oab_number: string | null
          oab_uf: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          oab_number?: string | null
          oab_uf?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          oab_number?: string | null
          oab_uf?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      task_activities: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "kanban_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string | null
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          mime_type?: string | null
          storage_path: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          storage_path?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "kanban_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          position_index: number
          task_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          position_index?: number
          task_id: string
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          position_index?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "kanban_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "kanban_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_acoes: {
        Row: {
          acao: string
          comentario: string | null
          created_at: string
          etapa_id: string | null
          id: string
          usuario_id: string
          workflow_id: string
        }
        Insert: {
          acao: string
          comentario?: string | null
          created_at?: string
          etapa_id?: string | null
          id?: string
          usuario_id: string
          workflow_id: string
        }
        Update: {
          acao?: string
          comentario?: string | null
          created_at?: string
          etapa_id?: string | null
          id?: string
          usuario_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_acoes_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "workflow_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_acoes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_comentarios: {
        Row: {
          autor_id: string
          created_at: string
          id: string
          parent_id: string | null
          posicao_texto: number | null
          resolvido: boolean
          texto: string
          tipo: string
          workflow_id: string
        }
        Insert: {
          autor_id: string
          created_at?: string
          id?: string
          parent_id?: string | null
          posicao_texto?: number | null
          resolvido?: boolean
          texto: string
          tipo?: string
          workflow_id: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          posicao_texto?: number | null
          resolvido?: boolean
          texto?: string
          tipo?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_comentarios_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "workflow_comentarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_comentarios_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_etapas: {
        Row: {
          concluido_em: string | null
          created_at: string
          id: string
          nome: string
          ordem: number
          prazo_dias: number | null
          responsavel_id: string | null
          status: string
          workflow_id: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          prazo_dias?: number | null
          responsavel_id?: string | null
          status?: string
          workflow_id: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          prazo_dias?: number | null
          responsavel_id?: string | null
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_etapas_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_regras: {
        Row: {
          ativa: boolean
          atribuicoes: Json
          condicoes: Json
          created_at: string
          id: string
          nome: string
          prioridade: number
        }
        Insert: {
          ativa?: boolean
          atribuicoes?: Json
          condicoes?: Json
          created_at?: string
          id?: string
          nome: string
          prioridade?: number
        }
        Update: {
          ativa?: boolean
          atribuicoes?: Json
          condicoes?: Json
          created_at?: string
          id?: string
          nome?: string
          prioridade?: number
        }
        Relationships: []
      }
      workflow_versoes: {
        Row: {
          autor_id: string
          conteudo: string | null
          created_at: string
          id: string
          motivo: string | null
          numero_versao: number
          workflow_id: string
        }
        Insert: {
          autor_id: string
          conteudo?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          numero_versao?: number
          workflow_id: string
        }
        Update: {
          autor_id?: string
          conteudo?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          numero_versao?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_versoes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          criador_id: string
          descricao: string | null
          id: string
          prazo_final: string | null
          processo_id: string | null
          status: string
          tags: string[] | null
          tipo_documento: string
          titulo: string
          updated_at: string
          urgencia: string
        }
        Insert: {
          created_at?: string
          criador_id: string
          descricao?: string | null
          id?: string
          prazo_final?: string | null
          processo_id?: string | null
          status?: string
          tags?: string[] | null
          tipo_documento?: string
          titulo: string
          updated_at?: string
          urgencia?: string
        }
        Update: {
          created_at?: string
          criador_id?: string
          descricao?: string | null
          id?: string
          prazo_final?: string | null
          processo_id?: string | null
          status?: string
          tags?: string[] | null
          tipo_documento?: string
          titulo?: string
          updated_at?: string
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_workflow: {
        Args: { _user_id: string; _workflow_id: string }
        Returns: boolean
      }
      get_audit_logs: {
        Args: never
        Returns: {
          id: number
          old_record: Json
          op: string
          record: Json
          record_id: string
          table_name: string
          ts: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_senior: { Args: { _user_id: string }; Returns: boolean }
      is_chat_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_workflow_participant: {
        Args: { _user_id: string; _workflow_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "senior" | "junior" | "intern" | "secretary"
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
      app_role: ["admin", "senior", "junior", "intern", "secretary"],
    },
  },
} as const
