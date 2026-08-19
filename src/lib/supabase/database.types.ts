export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      clientes_resumen: {
        Args: never
        Returns: {
          id: string
          nombre: string
          telefono: string
          email: string | null
          notas_internas: string | null
          visitas: number
          ultima_visita: string | null
          gasto_total_cents: number
          segmento: string
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
      es_admin: { Args: never; Returns: boolean }
      marcar_recordatorio_enviado: {
        Args: { p_id: string; p_secret: string }
        Returns: boolean
      }
      obtener_reserva_por_token: { Args: { p_token: string }; Returns: Json }
      reservas_pendientes_recordatorio: {
        Args: { p_secret: string }
        Returns: Json
      }
      ocupacion_mes: {
        Args: { p_anio: number; p_mes: number; p_respetar_antelacion?: boolean }
        Returns: { fecha: string; ocupados: number; cap: number }[]
      }
      reclamar_admin: { Args: never; Returns: boolean }
      vincular_cliente_actual: { Args: never; Returns: boolean }
      slots_disponibles: {
        Args: { p_duracion_min: number; p_fecha: string; p_respetar_antelacion?: boolean }
        Returns: {
          inicio: string
        }[]
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
