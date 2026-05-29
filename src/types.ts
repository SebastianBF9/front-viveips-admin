export type EstadoServicioIps = "habilitado" | "proximo";
export type EstadoRelacion = "pendiente" | "en_revision" | "cumple" | "no_cumple" | "no_aplica";
export type EstadoCumplimiento = EstadoRelacion;

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

export interface CriterioCumplimiento {
  criterio_id: number;
  criterio_codigo: string;
  descripcion: string;
  tipo_respuesta: string;
  obligatorio: number;
  requiere_evidencia: number;
  norma_referencia: string | null;
  estandar_codigo: string;
  estandar: string;
  estandar_orden: number;
  cumplimiento_id: number | null;
  estado_cumplimiento: EstadoCumplimiento | null;
  respuesta: string | null;
  observacion: string | null;
  fecha_evaluacion: string | null;
  evidencia_id: number | null;
  evidencia_nombre: string | null;
  evidencia_archivo: string | null;
  evidencia_estado: string | null;
  porcentaje_calculado: number;
  estado_calculado: EstadoCumplimiento;
  fuente_calculo: "automatico" | string;
  hallazgos: string[];
}

export interface CumplimientoServicio {
  success: boolean;
  servicio: ServicioIps;
  criterios: CriterioCumplimiento[];
  resumen: {
    total: number;
    cumple: number;
    no_cumple: number;
    pendiente: number;
    en_revision: number;
    no_aplica: number;
    porcentaje_global: number;
    estado_global: EstadoCumplimiento;
    fuente: "calculado" | string;
    estandares: Array<{
      codigo: string;
      nombre: string;
      orden: number;
      total_criterios: number;
      porcentaje: number;
      estado: EstadoCumplimiento;
      pendientes: number;
      hallazgos: string[];
    }>;
  };
}

export interface ProfesionalBasico {
  id: number;
  nombre: string;
  cedula: string | null;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  usuario_activo: number;
}

export interface ProfesionalServicio extends ProfesionalBasico {
  profesional_id: number;
  servicio_ips_id: number;
  es_servicio_base: number;
  tipo_relacion: string;
  rol_en_servicio: string | null;
  disponibilidad: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: "activo" | "inactivo" | "pendiente" | string;
  observaciones: string | null;
  documentos_requeridos: number;
  documentos_cumplidos: number;
  documentos_pendientes: number;
  total_documentos: number;
  documentos_aprobados: number;
  documentos_vencidos: number;
}

export interface TalentoHumanoServicio {
  success: boolean;
  servicio: ServicioIps;
  profesionales: ProfesionalServicio[];
  disponibles: ProfesionalBasico[];
  resumen: {
    total: number;
    activos: number;
    servicio_base: number;
    participantes: number;
  };
}

export interface ProfesionalServicioPayload {
  profesional_id: number;
  es_servicio_base: boolean;
  tipo_relacion: string;
  rol_en_servicio?: string | null;
  disponibilidad?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado: "activo" | "inactivo" | "pendiente";
  observaciones?: string | null;
}
