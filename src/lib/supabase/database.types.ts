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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      barbero: {
        Row: {
          avatar_url: string | null
          bio: string
          foto_url: string | null
          id: string
          nombre: string
          rol: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          foto_url?: string | null
          id?: string
          nombre?: string
          rol?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          foto_url?: string | null
          id?: string
          nombre?: string
          rol?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cierres: {
        Row: {
          id: string
          motivo: string | null
          rango: unknown
        }
        Insert: {
          id?: string
          motivo?: string | null
          rango: unknown
        }
        Update: {
          id?: string
          motivo?: string | null
          rango?: unknown
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nombre: string
          notas_internas: string | null
          telefono: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nombre: string
          notas_internas?: string | null
          telefono: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          notas_internas?: string | null
          telefono?: string
          user_id?: string | null
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          antelacion_max_dias: number
          antelacion_min_horas: number
          ciudad: string
          direccion: string
          id: string
          nombre_negocio: string
          politica_cancelacion: string
          telefono: string | null
        }
        Insert: {
          antelacion_max_dias?: number
          antelacion_min_horas?: number
          ciudad?: string
          direccion?: string
          id?: string
          nombre_negocio?: string
          politica_cancelacion?: string
          telefono?: string | null
        }
        Update: {
          antelacion_max_dias?: number
          antelacion_min_horas?: number
          ciudad?: string
          direccion?: string
          id?: string
          nombre_negocio?: string
          politica_cancelacion?: string
          telefono?: string | null
        }
        Relationships: []
      }
      cron_secreto: {
        Row: {
          secreto: string
          unico: boolean
        }
        Insert: {
          secreto: string
          unico?: boolean
        }
        Update: {
          secreto?: string
          unico?: boolean
        }
        Relationships: []
      }
      fidelizacion_canjes: {
        Row: {
          cliente_id: string
          creado_at: string
          id: string
        }
        Insert: {
          cliente_id: string
          creado_at?: string
          id?: string
        }
        Update: {
          cliente_id?: string
          creado_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fidelizacion_canjes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      horario_barbero: {
        Row: {
          abre: string
          cierra: string
          dia_semana: number
          id: string
        }
        Insert: {
          abre: string
          cierra: string
          dia_semana: number
          id?: string
        }
        Update: {
          abre?: string
          cierra?: string
          dia_semana?: number
          id?: string
        }
        Relationships: []
      }
      resenas: {
        Row: {
          comentario: string | null
          created_at: string
          estrellas: number
          id: string
          reserva_id: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          estrellas: number
          id?: string
          reserva_id: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          estrellas?: number
          id?: string
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resenas_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: true
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_servicios: {
        Row: {
          duracion_min: number
          precio_cents: number
          reserva_id: string
          servicio_id: string
        }
        Insert: {
          duracion_min: number
          precio_cents: number
          reserva_id: string
          servicio_id: string
        }
        Update: {
          duracion_min?: number
          precio_cents?: number
          reserva_id?: string
          servicio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reserva_servicios_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_servicios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          cliente_id: string
          created_at: string
          estado: string
          fin: string
          id: string
          inicio: string
          notas: string | null
          precio_total_cents: number
          rango: unknown
          recordatorio_enviado_at: string | null
          token: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          estado?: string
          fin: string
          id?: string
          inicio: string
          notas?: string | null
          precio_total_cents: number
          rango?: unknown
          recordatorio_enviado_at?: string | null
          token?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          estado?: string
          fin?: string
          id?: string
          inicio?: string
          notas?: string | null
          precio_total_cents?: number
          rango?: unknown
          recordatorio_enviado_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios: {
        Row: {
          activo: boolean
          categoria: string
          duracion_min: number
          id: string
          nombre: string
          orden: number
          precio_cents: number
        }
        Insert: {
          activo?: boolean
          categoria: string
          duracion_min: number
          id?: string
          nombre: string
          orden?: number
          precio_cents: number
        }
        Update: {
          activo?: boolean
          categoria?: string
          duracion_min?: number
          id?: string
          nombre?: string
          orden?: number
          precio_cents?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancelar_reserva_por_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      canjear_fidelizacion: { Args: { p_cliente_id: string }; Returns: boolean }
      clientes_resumen: {
        Args: never
        Returns: {
          email: string
          gasto_total_cents: number
          id: string
          nombre: string
          notas_internas: string
          segmento: string
          telefono: string
          ultima_visita: string
          visitas: number
        }[]
      }
      crear_reserva: {
        Args: {
          p_email: string
          p_inicio: string
          p_nombre: string
          p_notas?: string
          p_servicio_ids: string[]
          p_telefono: string
        }
        Returns: {
          reserva_id: string
          token: string
        }[]
      }
      crear_reserva_admin: {
        Args: {
          p_email: string
          p_inicio: string
          p_nombre: string
          p_notas?: string
          p_servicio_ids: string[]
          p_telefono: string
        }
        Returns: {
          reserva_id: string
          token: string
        }[]
      }
      dejar_resena_por_token: {
        Args: { p_comentario?: string; p_estrellas: number; p_token: string }
        Returns: boolean
      }
      es_admin: { Args: never; Returns: boolean }
      fidelizacion_clientes: {
        Args: never
        Returns: {
          cliente_id: string
          puede_canjear: boolean
          sellos_disponibles: number
        }[]
      }
      marcar_recordatorio_enviado: {
        Args: { p_id: string; p_secret: string }
        Returns: boolean
      }
      mi_fidelizacion: { Args: never; Returns: Json }
      obtener_reserva_por_token: { Args: { p_token: string }; Returns: Json }
      ocupacion_mes: {
        Args: { p_anio: number; p_mes: number; p_respetar_antelacion?: boolean }
        Returns: {
          cap: number
          fecha: string
          ocupados: number
        }[]
      }
      reclamar_admin: { Args: never; Returns: boolean }
      resenas_recientes: {
        Args: { p_limite?: number }
        Returns: {
          cliente_nombre: string
          comentario: string
          creado_at: string
          estrellas: number
          id: string
          servicios: string
        }[]
      }
      reservas_pendientes_recordatorio: {
        Args: { p_secret: string }
        Returns: Json
      }
      slots_disponibles: {
        Args: {
          p_duracion_min: number
          p_fecha: string
          p_respetar_antelacion?: boolean
        }
        Returns: {
          inicio: string
        }[]
      }
      vincular_cliente_actual: { Args: never; Returns: boolean }
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
