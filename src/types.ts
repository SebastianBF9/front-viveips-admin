export type EstadoServicioIps = "habilitado" | "proximo";
export type EstadoRelacion = "pendiente" | "en_revision" | "cumple" | "no_cumple" | "no_aplica";

export interface ServicioIps {
  id: number;
  servicio_id: number;
  distintivo: string | null;
  estado: EstadoServicioIps;
  tipo: string | null;
  observaciones: string | null;
  codigo: string;
  nombre: string;
  grupo_id: number;
  grupo: string;
}

export interface EstandarHabilitacion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: number;
}

export interface ServicioRelacion {
  id: number;
  servicio_padre_ips_id: number;
  servicio_soporte_ips_id: number | null;
  servicio_soporte_codigo: string | null;
  servicio_soporte_nombre: string;
  tipo_relacion: string;
  propio_o_contratado: "propio" | "contratado";
  modalidad_compatible: string | null;
  complejidad_compatible: string | null;
  requiere_reps: number;
  estado: EstadoRelacion;
  observaciones: string | null;
  soporte_distintivo?: string | null;
  soporte_estado_ips?: string | null;
  soporte_tipo_ips?: string | null;
}

export interface ServicioDetalle {
  servicio: ServicioIps;
  relaciones: ServicioRelacion[];
  estandares: EstandarHabilitacion[];
  resumen: {
    relaciones_total: number;
    relaciones_cumple: number;
    relaciones_pendientes: number;
    relaciones_en_revision: number;
    interdependencias: number;
    componentes_propios: number;
  };
}

export interface RelacionPayload {
  servicio_soporte_ips_id?: number | null;
  servicio_soporte_codigo?: string | null;
  servicio_soporte_nombre?: string | null;
  tipo_relacion: string;
  propio_o_contratado: "propio" | "contratado";
  modalidad_compatible?: string | null;
  complejidad_compatible?: string | null;
  requiere_reps: boolean;
  estado: EstadoRelacion;
  observaciones?: string | null;
}
