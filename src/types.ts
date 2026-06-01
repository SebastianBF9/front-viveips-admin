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
  documentos_cargados: number;
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

export interface DocumentoProfesional {
  id: number;
  tipo_documento_id: number;
  tipo_codigo: string;
  tipo_nombre: string;
  nombre_archivo: string;
  fecha_vencimiento: string | null;
  estado: string;
  aprobado: number;
}

export interface FormacionAcademica {
  id: number;
  profesional_id: number;
  tipo: string;
  institucion: string;
  titulo: string | null;
  nivel: string | null;
  anio_grado: number | null;
  ciudad: string | null;
  nombre_archivo: string | null;
  ruta_archivo: string | null;
  diploma_nombre_archivo: string | null;
  diploma_ruta_archivo: string | null;
  acta_nombre_archivo: string | null;
  acta_ruta_archivo: string | null;
}

export interface ProfesionalAdmin {
  id: number;
  nombre: string;
  cedula: string | null;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  ciudad?: string | null;
  banco?: string | null;
  num_cuenta?: string | null;
  titular_cuenta?: string | null;
  activo: number;
  fecha_creacion?: string | null;
  ultimo_acceso?: string | null;
  fecha_deshabilitacion?: string | null;
  estado_contrato?: string | null;
  fecha_contrato?: string | null;
  fecha_firma_contrato?: string | null;
  documentos?: DocumentoProfesional[];
  formaciones?: FormacionAcademica[];
  servicios?: ServicioProfesionalAsignado[];
}

export interface ProfesionalPerfil {
  id: number;
  usuario_id: number;
  nombre: string;
  cedula: string | null;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  ciudad: string | null;
  direccion: string | null;
  banco: string | null;
  num_cuenta: string | null;
  num_cuenta_mascara?: string | null;
  titular_cuenta: string | null;
  rh: string | null;
  fecha_nacimiento: string | null;
  expedicion_cedula: string | null;
  departamento: string | null;
  foto?: string | null;
  acepta_tratamiento_datos?: number | boolean | null;
  version_politica_datos?: string | null;
  fecha_acepta_tratamiento_datos?: string | null;
}

export interface ProfesionalPerfilPayload {
  nombre: string;
  email: string;
  telefono?: string | null;
  especialidad?: string | null;
  ciudad?: string | null;
  direccion?: string | null;
  banco?: string | null;
  num_cuenta?: string | null;
  titular_cuenta?: string | null;
  rh?: string | null;
  fecha_nacimiento?: string | null;
  expedicion_cedula?: string | null;
  departamento?: string | null;
}

export interface DocumentoPortalProfesional {
  id: number | null;
  profesional_id?: number | null;
  tipo_documento_id: number;
  tipo_codigo: string;
  tipo_nombre: string;
  nombre_archivo: string | null;
  ruta_archivo?: string | null;
  mime_type?: string | null;
  fecha_vencimiento: string | null;
  estado: "vigente" | "vencer" | "vencido" | "sin_cargar" | "sin_vencimiento" | string;
  aprobado?: number | null;
  tiene_vencimiento: number;
  es_curso: number;
}

export interface UbicacionDepartamento {
  codigo_departamento: string;
  nombre_departamento: string;
}

export interface UbicacionMunicipio {
  codigo_municipio?: string | null;
  nombre_municipio: string;
  codigo_departamento?: string | null;
}

export interface ReferenciaPersonal {
  id?: number | null;
  nombre: string;
  relacion: string;
  telefono: string;
  email?: string | null;
  ocupacion?: string | null;
}

export interface ExperienciaLaboral {
  empresa: string;
  cargo?: string | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
  actualmente?: boolean;
  documento_id?: number | null;
  nombre_archivo?: string | null;
}

export interface VacunaProfesional {
  vacuna_codigo: string;
  fecha_aplicacion: string | null;
}

export interface FormacionPortal {
  id?: number | null;
  tipo: "bachillerato" | "profesional" | "especializacion" | string;
  institucion: string;
  titulo?: string | null;
  nivel?: string | null;
  anio_grado?: number | string | null;
  ciudad?: string | null;
  nombre_archivo?: string | null;
  diploma_nombre_archivo?: string | null;
  acta_nombre_archivo?: string | null;
}

export interface ServicioProfesionalAsignado {
  id: number;
  profesional_id: number;
  servicio_ips_id: number;
  es_servicio_base: number;
  tipo_relacion: string;
  rol_en_servicio: string | null;
  disponibilidad: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  observaciones: string | null;
  distintivo: string | null;
  tipo_servicio_ips: string | null;
  estado_servicio_ips: string;
  codigo: string;
  nombre: string;
  grupo: string;
}

export interface PermisosAcceso {
  success: boolean;
  rol: string;
  cedula: string;
  permiso_ver_todo: boolean;
  permiso_ver_profesionales: boolean;
  permiso_crear_profesionales: boolean;
  permiso_ver_capacitaciones: boolean;
  permiso_tecnovigilancia: boolean;
}

export interface UsuarioPermisos {
  usuario_id: number;
  profesional_id: number | null;
  nombre: string;
  cedula: string;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  rol: string;
  activo: boolean;
  permiso_ver_todo: boolean;
  permiso_ver_profesionales: boolean;
  permiso_crear_profesionales: boolean;
  permiso_ver_capacitaciones: boolean;
  permiso_tecnovigilancia: boolean;
}

export type UsuarioPermisosPayload = Pick<
  UsuarioPermisos,
  | "permiso_ver_todo"
  | "permiso_ver_profesionales"
  | "permiso_crear_profesionales"
  | "permiso_ver_capacitaciones"
  | "permiso_tecnovigilancia"
>;

export interface CapacitacionAdmin {
  id: number;
  rama: string;
  nombre: string;
  descripcion: string | null;
  vigencia_meses: number;
  fecha_habilitacion: string | null;
  fecha_vencimiento: string | null;
  activo: number;
  num_archivos: number;
  num_preguntas: number;
}

export interface CapacitacionAdminPayload {
  capacitacion_id?: number | string | null;
  rama: string;
  nombre: string;
  descripcion?: string | null;
  vigencia_meses: number;
  fecha_habilitacion?: string | null;
  fecha_vencimiento?: string | null;
  activo: number;
}

export interface CapacitacionArchivo {
  id: number;
  capacitacion_id: number;
  nombre_archivo: string;
  ruta_archivo: string | null;
  mime_type: string | null;
  fecha_subida?: string | null;
  created_at?: string | null;
}

export interface CapacitacionOpcion {
  id?: number;
  opcion: string;
  es_correcta: number | boolean;
  orden?: number | null;
}

export interface CapacitacionPregunta {
  id: number;
  capacitacion_id: number;
  pregunta: string;
  orden?: number | null;
  opciones: CapacitacionOpcion[];
}

export interface CursoProfesionalCapacitacion {
  id: number;
  rama: string;
  nombre: string;
  descripcion: string | null;
  vigencia_meses: number;
  fecha_habilitacion: string | null;
  fecha_vencimiento: string | null;
  activo: number;
  mi_nota: number | null;
  aprobado: number | null;
  fecha_presentacion: string | null;
  num_archivos: number;
}

export interface ArchivoCapacitacionProfesional {
  id: number;
  capacitacion_id: number;
  nombre_archivo: string;
  ruta_archivo: string | null;
  mime_type: string | null;
}

export interface OpcionExamenCapacitacion {
  id: number;
  opcion: string;
  orden?: number | null;
}

export interface PreguntaExamenCapacitacion {
  id: number;
  pregunta: string;
  orden?: number | null;
  opciones: OpcionExamenCapacitacion[];
}

export interface ExamenCapacitacion {
  success: boolean;
  capacitacion: CapacitacionAdmin;
  preguntas: PreguntaExamenCapacitacion[];
}

export interface EnviarExamenPayload {
  capacitacion_id: number;
  respuestas: Record<string, number>;
}

export interface ResultadoExamenCapacitacion {
  success: boolean;
  nota: number;
  aprobado: number;
  correctas: number;
  total: number;
}

export interface AdherenciaCapacitacion {
  profesional_id: number;
  profesional: string;
  cedula: string | null;
  cargo: string | null;
  capacitacion_id: number;
  capacitacion: string;
  rama: string;
  fecha_habilitacion: string | null;
  fecha_vencimiento: string | null;
  intento_id: number | null;
  nota: number | null;
  aprobado: number | null;
  fecha_presentacion: string | null;
  estado: "aprobado" | "no_aprobado" | "pendiente";
  estado_label: string;
}

export interface AdherenciaCapacitacionesResponse {
  success: boolean;
  resumen: {
    total: number;
    aprobados: number;
    no_aprobados: number;
    pendientes: number;
  };
  adherencia: AdherenciaCapacitacion[];
  capacitaciones: Array<{ id: number; nombre: string; rama: string }>;
  cargos: string[];
}
