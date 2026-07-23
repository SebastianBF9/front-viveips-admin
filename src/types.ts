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

export interface PacienteIpsHealthcare {
  id_externo: string;
  user_id?: string | null;
  tipo_documento: string;
  documento: string;
  nombre: string;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  estado?: string | null;
  motivo_estado?: string | null;
  estado_clinico?: string | null;
  departamento?: string | null;
  ciudad?: string | null;
  sede?: string | null;
  barrio?: string | null;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  regimen?: string | null;
  aseguradora?: string | null;
  poliza?: string | null;
  telefono?: string | null;
  telefono_2?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  contacto_familiar?: string | null;
  telefono_familiar?: string | null;
  documento_familiar?: string | null;
  parentesco_familiar?: string | null;
  telefono_emergencia?: string | null;
  historia_clinica?: string | null;
  grupo_sanguineo?: string | null;
  alertas_medicas?: string | null;
  kenko_id?: string | null;
  frecuencia_visita?: string | null;
  profesional_principal_id?: string | null;
  fecha_ultimo_contacto?: string | null;
  fecha_proximo_seguimiento?: string | null;
  grupo_etareo?: string | null;
  traqueostomia?: boolean;
  gastrostomia?: boolean;
  oxigeno?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
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
  cargo_complementario?: string | null;
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
  cargo_complementario?: string | null;
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
  entregas_abiertas?: number;
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
  cargo_complementario?: string | null;
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
  cargo_complementario?: string | null;
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
  permiso_modulo_servicios: boolean;
  permiso_modulo_talento_humano: boolean;
  permiso_modulo_infraestructura: boolean;
  permiso_modulo_recursos: boolean;
  permiso_modulo_procesos_prioritarios: boolean;
  permiso_modulo_historia_clinica: boolean;
  permiso_modulo_gestion_documental: boolean;
  permiso_gestion_solicitudes: boolean;
  permiso_ver_profesionales: boolean;
  permiso_crear_profesionales: boolean;
  permiso_ver_capacitaciones: boolean;
  permiso_tecnovigilancia: boolean;
  permiso_recursos_comprar: boolean;
  permiso_recursos_aprobar: boolean;
  permiso_recursos_recibir: boolean;
  permiso_recursos_ajustar: boolean;
  permiso_recursos_dar_baja: boolean;
  permiso_recursos_despachar: boolean;
  permiso_recursos_auditoria: boolean;
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
  permiso_modulo_servicios: boolean;
  permiso_modulo_talento_humano: boolean;
  permiso_modulo_infraestructura: boolean;
  permiso_modulo_recursos: boolean;
  permiso_modulo_procesos_prioritarios: boolean;
  permiso_modulo_historia_clinica: boolean;
  permiso_modulo_gestion_documental: boolean;
  permiso_gestion_solicitudes: boolean;
  permiso_ver_profesionales: boolean;
  permiso_crear_profesionales: boolean;
  permiso_ver_capacitaciones: boolean;
  permiso_tecnovigilancia: boolean;
  permiso_recursos_comprar: boolean;
  permiso_recursos_aprobar: boolean;
  permiso_recursos_recibir: boolean;
  permiso_recursos_ajustar: boolean;
  permiso_recursos_dar_baja: boolean;
  permiso_recursos_despachar: boolean;
  permiso_recursos_auditoria: boolean;
}

export type UsuarioPermisosPayload = Pick<
  UsuarioPermisos,
  | "permiso_ver_todo"
  | "permiso_modulo_servicios"
  | "permiso_modulo_talento_humano"
  | "permiso_modulo_infraestructura"
  | "permiso_modulo_recursos"
  | "permiso_modulo_procesos_prioritarios"
  | "permiso_modulo_historia_clinica"
  | "permiso_modulo_gestion_documental"
  | "permiso_gestion_solicitudes"
  | "permiso_ver_profesionales"
  | "permiso_crear_profesionales"
  | "permiso_ver_capacitaciones"
  | "permiso_tecnovigilancia"
  | "permiso_recursos_comprar"
  | "permiso_recursos_aprobar"
  | "permiso_recursos_recibir"
  | "permiso_recursos_ajustar"
  | "permiso_recursos_dar_baja"
  | "permiso_recursos_despachar"
  | "permiso_recursos_auditoria"
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

export type EstadoEquipoBiomedico =
  | "disponible"
  | "asignacion_en_proceso"
  | "asignado"
  | "pendiente_revision"
  | "en_mantenimiento"
  | "fuera_de_servicio"
  | "extraviado"
  | "dado_de_baja"
  | string;

export interface EquipoBiomedico {
  id: number;
  codigo_interno: string | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  registro_invima: string | null;
  area: string | null;
  servicio: string | null;
  servicio_ips_id?: number | null;
  servicio_codigo?: string | null;
  servicio_nombre?: string | null;
  ubicacion_actual: string | null;
  latitud?: number | null;
  longitud?: number | null;
  estado: EstadoEquipoBiomedico;
  requiere_calibracion: number | boolean | null;
  manual_usuario: string | null;
  manual_tecnico: string | null;
  foto_equipo?: string | null;
  observaciones: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EquipoCategoria {
  id?: number;
  nombre: string;
  activo?: number | boolean;
}

export interface EquipoAdquisicion {
  forma_adquisicion?: string | null;
  fecha_adquisicion?: string | null;
  acta_recibo?: string | null;
  fecha_instalacion?: string | null;
  fecha_inicio_operacion?: string | null;
  garantia_meses?: number | null;
  vencimiento_garantia?: string | null;
  costo?: number | null;
  vida_util?: string | null;
  proveedor?: string | null;
  proveedor_nit?: string | null;
  proveedor_direccion?: string | null;
  proveedor_telefono?: string | null;
  proveedor_email?: string | null;
  fabricante?: string | null;
  pais_fabricacion?: string | null;
  observaciones?: string | null;
}

export interface EquipoDatosTecnicos {
  tipo_equipo?: string | null;
  fuente_alimentacion?: string | null;
  tecnologia_predominante?: string | null;
  voltaje_min?: string | null;
  voltaje_max?: string | null;
  corriente_min?: string | null;
  corriente_max?: string | null;
  potencia?: string | null;
  frecuencia?: string | null;
  presion?: string | null;
  velocidad?: string | null;
  peso?: string | null;
  temperatura?: string | null;
  otros_datos_instalacion?: string | null;
  rango_voltaje?: string | null;
  rango_corriente?: string | null;
  rango_potencia?: string | null;
  rango_presion?: string | null;
  rango_velocidad?: string | null;
  rango_temperatura?: string | null;
  rango_humedad?: string | null;
  recomendaciones_fabricante?: string | null;
  observaciones?: string | null;
}

export interface EquipoApoyoTecnico {
  manual_operacion?: number | boolean | null;
  manual_mantenimiento?: number | boolean | null;
  manual_partes?: number | boolean | null;
  manual_despiece?: number | boolean | null;
  plano_electronico?: number | boolean | null;
  plano_electrico?: number | boolean | null;
  plano_neumatico?: number | boolean | null;
  plano_mecanico?: number | boolean | null;
  clasificacion_biomedica?: string | null;
  clasificacion_riesgo?: string | null;
  periodicidad_mantenimiento?: string | null;
  periodicidad_calibracion?: string | null;
  requiere_calibracion?: number | boolean | null;
  observaciones?: string | null;
}

export interface EquipoDocumento {
  id?: number | null;
  codigo?: string;
  nombre?: string;
  tipo_documento?: string | null;
  documento_id?: number | null;
  estado_anexo: "anexo" | "no_anexo" | "no_aplica" | string;
  nombre_archivo?: string | null;
  ruta_archivo?: string | null;
  fecha_vencimiento?: string | null;
  estado?: string | null;
  observaciones?: string | null;
}

export interface EquipoMantenimiento {
  id: number;
  tipo: string | null;
  numero_reporte?: string | null;
  fecha_mantenimiento: string | null;
  hora_servicio?: string | null;
  clase_servicio?: string | null;
  proxima_fecha: string | null;
  responsable: string | null;
  requerimiento?: string | null;
  descripcion: string | null;
  inspeccion_tecnica?: Record<string, string> | string | null;
  diagnostico?: string | null;
  mediciones_reparaciones?: string | null;
  pruebas_cualitativas?: Record<string, string> | string | null;
  pruebas_cuantitativas?: Record<string, string> | string | null;
  horas_hombre?: number | null;
  horas_paro?: number | null;
  repuestos: string | null;
  repuestos_utilizados?: Array<{ cantidad?: string; descripcion?: string }> | string | null;
  costo_repuesto?: number | null;
  costo: number | null;
  soporte?: string | null;
  estado_equipo_posterior: string | null;
  conclusiones_observaciones?: string | null;
  recibido_por_nombre?: string | null;
  recibido_por_cargo?: string | null;
  recibido_por_cc?: string | null;
  firmado_por?: string | null;
  firma_clinica?: string | null;
}

export interface EquipoCalibracion {
  id: number;
  fecha_calibracion: string | null;
  proxima_calibracion: string | null;
  certificado: string | null;
  entidad_calibradora: string | null;
  resultado: string | null;
  observaciones: string | null;
}

export interface EquipoMovimiento {
  id: number;
  tipo_movimiento: string | null;
  descripcion: string | null;
  ubicacion_texto?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  created_at?: string | null;
}

export interface EquipoAsignacion {
  id: number;
  estado: string;
  tipo_asignacion?: string | null;
  paciente_nombre?: string | null;
  paciente_documento?: string | null;
  paciente_telefono?: string | null;
  responsable_nombre?: string | null;
  responsable_documento?: string | null;
  responsable_telefono?: string | null;
  responsable_email?: string | null;
  direccion_entrega?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  fecha_entrega?: string | null;
  fecha_estimada_devolucion?: string | null;
  pagare_estado?: string | null;
  valor_pagare?: string | number | null;
  valor_pagare_letras?: string | null;
}

export interface EquipoHojaVida {
  success: boolean;
  equipo: EquipoBiomedico;
  adquisicion: EquipoAdquisicion | null;
  datos_tecnicos: EquipoDatosTecnicos | null;
  apoyo_tecnico: EquipoApoyoTecnico | null;
  documentos: EquipoDocumento[];
  mantenimientos: EquipoMantenimiento[];
  calibraciones: EquipoCalibracion[];
  asignacion_activa: EquipoAsignacion | null;
  movimientos: EquipoMovimiento[];
}

export interface EquipoAlertaResumen {
  success: boolean;
  mantenimientos: Array<EquipoBiomedico & { proxima_fecha?: string | null; dias_restantes?: number | null }>;
  calibraciones: Array<EquipoBiomedico & { proxima_calibracion?: string | null; dias_restantes?: number | null }>;
  asignaciones_vencidas: EquipoAsignacion[];
  pendientes_revision: EquipoBiomedico[];
  total: number;
}

export type TipoRecursoAsistencial = "medicamento" | "dispositivo_medico" | "insumo" | "reactivo";
export type EstadoRecursoAsistencial = "activo" | "inactivo" | "en_revision" | "rechazado";
export type EstadoProveedorRecurso = "activo" | "inactivo" | "en_revision" | "bloqueado";
export type EstadoOrdenCompraRecurso = "borrador" | "solicitada" | "aprobada" | "enviada_proveedor" | "parcialmente_recibida" | "recibida" | "cerrada" | "cancelada";
export type TipoRecepcionRecurso = "tecnica" | "administrativa" | "tecnica_administrativa";
export type EstadoRecepcionRecurso = "pendiente" | "aprobada" | "rechazada" | "parcial";
export type EstadoInventarioLote = "disponible" | "cuarentena" | "bloqueado" | "vencido" | "agotado" | "dado_de_baja";
export type EstadoDespachoRecurso = "preparado" | "en_camino" | "entregado" | "devuelto" | "fallido" | "cancelado";

export interface RecursoServicioRelacion {
  id?: number;
  recurso_id?: number;
  servicio_ips_id: number;
  obligatorio?: number | boolean;
  tipo_relacion?: "base" | "apoyo" | "interdependencia" | "relacionado" | string;
  cantidad_minima?: number | null;
  cantidad_maxima?: number | null;
  estado?: string;
  observaciones?: string | null;
  servicio_codigo?: string | null;
  servicio_nombre?: string | null;
  servicio_estado?: string | null;
  servicio_tipo?: string | null;
}

export interface RecursoProveedorRelacion {
  id?: number;
  recurso_id?: number;
  proveedor_id: number;
  precio_referencia?: number | null;
  tiempo_entrega_dias?: number | null;
  proveedor_preferido?: number | boolean;
  estado?: string;
  observaciones?: string | null;
  nombre?: string | null;
  nit?: string | null;
  telefono?: string | null;
  correo?: string | null;
}

export interface FichaTecnicaRecurso {
  id: number;
  recurso_id: number;
  archivo: string | null;
  nombre_archivo: string | null;
  version: string | null;
  fecha_documento: string | null;
  fecha_cargue: string | null;
  estado: string;
  observaciones: string | null;
}

export interface RecursoAsistencial {
  id: number;
  codigo: string | null;
  nombre: string;
  tipo_recurso: TipoRecursoAsistencial | string;
  descripcion: string | null;
  presentacion: string | null;
  unidad_medida: string | null;
  concentracion: string | null;
  principio_activo: string | null;
  registro_sanitario: string | null;
  fecha_vencimiento_registro_sanitario: string | null;
  requiere_registro_sanitario: number | boolean;
  requiere_cadena_frio: number | boolean;
  temperatura_min: number | null;
  temperatura_max: number | null;
  humedad_min: number | null;
  humedad_max: number | null;
  es_lasa: number | boolean;
  alto_riesgo: number | boolean;
  requiere_formula: number | boolean;
  requiere_ficha_tecnica: number | boolean;
  stock_minimo: number | null;
  stock_maximo: number | null;
  punto_reorden: number | null;
  tiempo_reposicion_dias: number | null;
  estado: EstadoRecursoAsistencial | string;
  observaciones: string | null;
  servicios_resumen?: string | null;
  proveedores_resumen?: string | null;
  proveedor_principal?: string | null;
  servicios?: RecursoServicioRelacion[];
  proveedores?: RecursoProveedorRelacion[];
  fichas_tecnicas?: FichaTecnicaRecurso[];
}

export interface RecursoAsistencialPayload {
  codigo?: string | null;
  nombre: string;
  tipo_recurso: TipoRecursoAsistencial | string;
  descripcion?: string | null;
  presentacion?: string | null;
  unidad_medida?: string | null;
  concentracion?: string | null;
  principio_activo?: string | null;
  registro_sanitario?: string | null;
  fecha_vencimiento_registro_sanitario?: string | null;
  requiere_registro_sanitario?: boolean;
  requiere_cadena_frio?: boolean;
  temperatura_min?: number | null;
  temperatura_max?: number | null;
  humedad_min?: number | null;
  humedad_max?: number | null;
  es_lasa?: boolean;
  alto_riesgo?: boolean;
  requiere_formula?: boolean;
  requiere_ficha_tecnica?: boolean;
  stock_minimo?: number | null;
  stock_maximo?: number | null;
  punto_reorden?: number | null;
  tiempo_reposicion_dias?: number | null;
  estado: EstadoRecursoAsistencial | string;
  observaciones?: string | null;
}

export interface RecursoAsistencialMasivoPayload extends RecursoAsistencialPayload {
  lote_inicial?: string | null;
  cantidad_inicial?: number | null;
  fecha_vencimiento_lote?: string | null;
  ubicacion_inicial?: string | null;
  motivo_inventario_inicial?: string | null;
}

export interface RecursosMasivosPayload {
  recursos: RecursoAsistencialMasivoPayload[];
}

export interface RecursosMasivosResponse {
  success: boolean;
  mensaje: string;
  creados: Array<{ fila: number; id: number; codigo?: string | null; nombre?: string | null; inventario_lote_id?: number | null }>;
  errores: Array<{ fila: number; nombre?: string | null; error: string }>;
}

export interface ProveedorRecurso {
  id: number;
  nombre: string;
  nit: string | null;
  contacto_nombre: string | null;
  contacto_cargo: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  estado: EstadoProveedorRecurso | string;
  observaciones: string | null;
}

export interface ProveedorRecursoPayload {
  nombre: string;
  nit?: string | null;
  contacto_nombre?: string | null;
  contacto_cargo?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  estado: EstadoProveedorRecurso | string;
  observaciones?: string | null;
}

export interface OrdenCompraRecursoDetalle {
  id?: number;
  orden_compra_id?: number;
  recurso_id: number;
  cantidad: number;
  cantidad_recibida_acumulada?: number | null;
  cantidad_pendiente?: number | null;
  valor_unitario?: number | null;
  valor_total?: number | null;
  fecha_estimada_entrega?: string | null;
  observaciones?: string | null;
  recurso_codigo?: string | null;
  recurso_nombre?: string | null;
  tipo_recurso?: string | null;
}

export interface OrdenCompraRecurso {
  id: number;
  numero_orden: string;
  proveedor_id: number;
  proveedor_nombre?: string | null;
  proveedor_nit?: string | null;
  fecha_orden: string | null;
  fecha_estimada_entrega: string | null;
  estado: EstadoOrdenCompraRecurso | string;
  subtotal: number | null;
  impuestos: number | null;
  total: number | null;
  factura_numero: string | null;
  factura_archivo: string | null;
  observaciones: string | null;
  items?: number | null;
  cantidad_solicitada_total?: number | null;
  cantidad_recibida_total?: number | null;
  cantidad_pendiente_total?: number | null;
  detalles?: OrdenCompraRecursoDetalle[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OrdenCompraRecursoPayload {
  numero_orden?: string | null;
  proveedor_id: number;
  fecha_orden?: string | null;
  fecha_estimada_entrega?: string | null;
  estado: EstadoOrdenCompraRecurso | string;
  impuestos?: number | null;
  factura_numero?: string | null;
  factura_archivo?: string | null;
  observaciones?: string | null;
  detalles: Array<{
    recurso_id: number;
    cantidad: number;
    valor_unitario?: number | null;
    fecha_estimada_entrega?: string | null;
    observaciones?: string | null;
  }>;
}

export interface RecepcionRecursoDetalle {
  id?: number;
  recepcion_id?: number;
  recurso_id: number;
  lote?: string | null;
  cantidad_recibida: number;
  fecha_vencimiento?: string | null;
  permitir_exceso?: number | boolean;
  justificacion_exceso?: string | null;
  registro_sanitario_lote?: string | null;
  registro_sanitario_validado?: number | boolean;
  empaque_integro?: number | boolean;
  temperatura_recibida?: number | null;
  humedad_recibida?: number | null;
  cumple?: number | boolean;
  motivo_rechazo?: string | null;
  observaciones?: string | null;
  recurso_codigo?: string | null;
  recurso_nombre?: string | null;
  tipo_recurso?: string | null;
  requiere_cadena_frio?: number | boolean;
  registro_sanitario?: string | null;
}

export interface RecepcionRecurso {
  id: number;
  orden_compra_id: number;
  proveedor_id: number;
  numero_orden?: string | null;
  proveedor_nombre?: string | null;
  proveedor_nit?: string | null;
  fecha_recepcion: string | null;
  tipo_recepcion: TipoRecepcionRecurso | string;
  estado: EstadoRecepcionRecurso | string;
  responsable_id?: number | null;
  observaciones: string | null;
  items?: number | null;
  lotes_inventario_count?: number | null;
  detalles?: RecepcionRecursoDetalle[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RecepcionRecursoPayload {
  orden_compra_id: number;
  proveedor_id: number;
  fecha_recepcion?: string | null;
  tipo_recepcion: TipoRecepcionRecurso | string;
  estado: EstadoRecepcionRecurso | string;
  responsable_id?: number | null;
  observaciones?: string | null;
  detalles: Array<{
    recurso_id: number;
  lote?: string | null;
  cantidad_recibida: number;
  fecha_vencimiento?: string | null;
  fecha_vencimiento_no_aplica?: boolean;
  permitir_exceso?: boolean;
    justificacion_exceso?: string | null;
    registro_sanitario_lote?: string | null;
    registro_sanitario_validado?: boolean;
    empaque_integro?: boolean;
    temperatura_recibida?: number | null;
    humedad_recibida?: number | null;
    cumple?: boolean;
    motivo_rechazo?: string | null;
    observaciones?: string | null;
  }>;
}

export interface InventarioLoteRecurso {
  id: number;
  recurso_id: number;
  lote: string;
  fecha_vencimiento: string | null;
  registro_sanitario_lote?: string | null;
  cantidad_inicial: number | null;
  cantidad_actual: number | null;
  cantidad_comprometida?: number | null;
  cantidad_disponible_despacho?: number | null;
  ubicacion: string | null;
  estado: EstadoInventarioLote | string;
  requiere_cadena_frio: number | boolean;
  temperatura_min: number | null;
  temperatura_max: number | null;
  humedad_min: number | null;
  humedad_max: number | null;
  recepcion_id?: number | null;
  recepcion_detalle_id?: number | null;
  recurso_codigo?: string | null;
  recurso_nombre?: string | null;
  tipo_recurso?: string | null;
  stock_minimo?: number | null;
  stock_maximo?: number | null;
  punto_reorden?: number | null;
  numero_orden?: string | null;
  fecha_recepcion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InventarioInicialPayload {
  recurso_id: number;
  lote: string;
  cantidad_inicial: number;
  fecha_vencimiento?: string | null;
  ubicacion?: string | null;
  motivo: string;
}

export interface MovimientoInventarioRecurso {
  id: number;
  recurso_id: number;
  inventario_lote_id: number;
  tipo_movimiento: string;
  cantidad: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  origen: string | null;
  referencia_id: number | null;
  responsable_id?: number | null;
  observaciones: string | null;
  lote?: string | null;
  recurso_codigo?: string | null;
  recurso_nombre?: string | null;
  created_at?: string | null;
}

export interface TemperaturaHumedadRecurso {
  id: number;
  fecha: string;
  turno: "manana" | "tarde" | "automatico" | string;
  hora?: string | null;
  ubicacion: string;
  dispositivo_codigo?: string | null;
  temperatura: number;
  humedad: number;
  temperatura_min: number;
  temperatura_max: number;
  humedad_min: number;
  humedad_max: number;
  cumple: number | boolean;
  origen: string;
  responsable_id?: number | null;
  responsable_nombre?: string | null;
  responsable_apellidos?: string | null;
  observaciones?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TemperaturaHumedadPayload {
  fecha: string;
  turno: "manana" | "tarde" | string;
  hora?: string | null;
  ubicacion?: string | null;
  dispositivo_codigo?: string | null;
  temperatura: number;
  humedad: number;
  temperatura_min?: number | null;
  temperatura_max?: number | null;
  humedad_min?: number | null;
  humedad_max?: number | null;
  observaciones?: string | null;
}

export interface TemperaturaHumedadResumen {
  total: number;
  cumplen: number;
  fuera_rango: number;
  ubicaciones: string[];
}

export interface AjusteInventarioPayload {
  tipo: "positivo" | "negativo";
  cantidad: number;
  motivo: string;
}

export interface BajaInventarioPayload {
  cantidad: number;
  causa: "vencimiento" | "deterioro" | "perdida" | "dano";
  motivo: string;
}

export interface EstadoLotePayload {
  estado: "disponible" | "bloqueado" | "cuarentena";
  motivo: string;
}

export interface TrasladoLotePayload {
  ubicacion_destino: string;
  motivo: string;
}

export interface DevolucionInventarioPayload {
  cantidad: number;
  origen: "profesional" | "paciente";
  apto_reintegro: boolean;
  motivo: string;
}

export interface AuditoriaRecurso {
  id: string | number;
  fuente: "auditoria" | "movimiento_inventario" | string;
  modulo: string;
  accion: string;
  entidad: string;
  entidad_id?: number | null;
  referencia?: string | null;
  recurso_id?: number | null;
  recurso_codigo?: string | null;
  recurso_nombre?: string | null;
  inventario_lote_id?: number | null;
  lote?: string | null;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  estado_anterior?: string | null;
  estado_nuevo?: string | null;
  datos_anteriores?: unknown;
  datos_nuevos?: unknown;
  observaciones?: string | null;
  ip?: string | null;
  created_at?: string | null;
}

export interface ReportesRecursosResumen {
  kardex: Array<{
    recurso_id: number;
    recurso_codigo: string | null;
    recurso_nombre: string | null;
    inventario_lote_id: number;
    lote: string | null;
    fecha_vencimiento: string | null;
    ubicacion: string | null;
    estado_lote: string | null;
    entradas: number;
    salidas: number;
    saldo_reportado: number | null;
    saldo_actual: number;
    ultimo_movimiento: string | null;
  }>;
  consumo: Array<{
    recurso_id: number;
    recurso_codigo: string | null;
    recurso_nombre: string | null;
    cantidad_despachada: number;
    cantidad_devuelta: number;
    lotes_afectados: number;
    ultimo_consumo: string | null;
  }>;
  vencimientos_bajas: Array<{
    recurso_id: number;
    recurso_codigo: string | null;
    recurso_nombre: string | null;
    lote: string | null;
    fecha_vencimiento: string | null;
    estado_lote: string | null;
    cantidad_actual: number;
    cantidad_baja: number;
    ultima_baja: string | null;
  }>;
  compras_por_proveedor: Array<{
    proveedor_id: number;
    proveedor_nombre: string | null;
    ordenes: number;
    total_comprado: number;
    cantidad_solicitada: number;
    cantidad_recibida: number;
    ultima_compra: string | null;
  }>;
  cumplimiento_entregas: Array<{
    responsable_entrega_id: number;
    responsable_nombre: string | null;
    total_despachos: number;
    entregados: number;
    fallidos: number;
    devueltos: number;
    cumplimiento_porcentaje: number | null;
    ultima_entrega: string | null;
  }>;
  rotacion: Array<{
    recurso_id: number;
    recurso_codigo: string | null;
    recurso_nombre: string | null;
    stock_actual: number;
    cantidad_salida: number;
    indice_rotacion: number | null;
  }>;
}

export interface InvimaAlertaResultado {
  id: number;
  source?: string | null;
  title: string;
  type: string;
  date?: string | null;
  pdfUrl: string;
  matches: string[];
  textSnippet?: string | null;
  notified: boolean;
  createdAt?: string | null;
}

export interface InvimaAlertasEstado {
  ultima_fecha_revisada?: string | null;
  ultima_ejecucion?: string | null;
  total_revisadas: number;
  total_coincidencias: number;
  error_ultima_ejecucion?: string | null;
}

export interface DespachoRecursoDetalle {
  id?: number;
  despacho_id?: number;
  recurso_id: number;
  inventario_lote_id: number;
  cantidad: number;
  seleccion_manual?: number | boolean;
  justificacion_seleccion_manual?: string | null;
  recomendaciones_almacenamiento?: string | null;
  observaciones?: string | null;
  recurso_codigo?: string | null;
  recurso_nombre?: string | null;
  recurso_descripcion?: string | null;
  tipo_recurso?: string | null;
  lote?: string | null;
  fecha_vencimiento?: string | null;
  cantidad_actual?: number | null;
  ubicacion?: string | null;
}

export interface DespachoRecurso {
  id: number;
  numero_despacho: string;
  responsable_entrega_id?: number | null;
  responsable_nombre?: string | null;
  responsable_cedula?: string | null;
  paciente_nombre?: string | null;
  paciente_documento?: string | null;
  paciente_telefono?: string | null;
  paciente_email?: string | null;
  direccion_entrega?: string | null;
  ciudad_entrega?: string | null;
  fecha_programada?: string | null;
  fecha_salida?: string | null;
  fecha_entrega?: string | null;
  estado: EstadoDespachoRecurso | string;
  recibido_por_nombre?: string | null;
  recibido_por_documento?: string | null;
  recibido_por_parentesco?: string | null;
  enfermera_nombre?: string | null;
  enfermera_documento?: string | null;
  latitud_entrega?: number | null;
  longitud_entrega?: number | null;
  ip_entrega?: string | null;
  firma_archivo?: string | null;
  firma_enfermera_archivo?: string | null;
  acta_archivo?: string | null;
  motivo_entrega_fallida?: string | null;
  fecha_fallida?: string | null;
  fecha_reintento?: string | null;
  reintentos?: number | null;
  evidencia_fotografica_archivo?: string | null;
  devuelto_inventario?: number | boolean | null;
  observaciones?: string | null;
  items?: number | null;
  detalles?: DespachoRecursoDetalle[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DespachoRecursoPayload {
  numero_despacho?: string | null;
  responsable_entrega_id?: number | null;
  paciente_nombre?: string | null;
  paciente_documento?: string | null;
  paciente_telefono?: string | null;
  paciente_email?: string | null;
  direccion_entrega?: string | null;
  ciudad_entrega?: string | null;
  fecha_programada?: string | null;
  estado: EstadoDespachoRecurso | string;
  observaciones?: string | null;
  detalles: Array<{
    recurso_id: number;
    inventario_lote_id: number;
    cantidad: number;
    seleccion_manual?: boolean;
    justificacion_seleccion_manual?: string | null;
    recomendaciones_almacenamiento?: string | null;
    observaciones?: string | null;
  }>;
}

export interface AsignacionFefo {
  id: number;
  recurso_id: number;
  lote: string;
  fecha_vencimiento?: string | null;
  ubicacion?: string | null;
  cantidad_actual: number;
  cantidad_disponible: number;
  cantidad_sugerida: number;
}

export interface SugerenciaFefoResponse {
  success: boolean;
  recurso: {
    id: number;
    codigo?: string | null;
    nombre: string;
  };
  cantidad_solicitada: number;
  asignaciones: AsignacionFefo[];
}

export interface ConfirmarEntregaDespachoPayload {
  recibido_por_nombre: string;
  recibido_por_documento: string;
  recibido_por_parentesco?: string | null;
  paciente_email?: string | null;
  enfermera_nombre?: string | null;
  enfermera_documento?: string | null;
  firma_enfermera_base64?: string | null;
  latitud_entrega?: number | null;
  longitud_entrega?: number | null;
  firma_base64: string;
  observaciones?: string | null;
}

export interface EntregaFallidaPayload {
  motivo: string;
  fecha_reintento?: string | null;
  observaciones?: string | null;
}

export interface ReintentoEntregaPayload {
  fecha_programada: string;
  observaciones?: string | null;
}

export interface DevolverDespachoInventarioPayload {
  apto_reintegro: boolean;
  motivo: string;
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

export interface GestionDocumentalEstandar {
  codigo: string;
  nombre: string;
  orden: number;
  total_archivos?: number;
}

export interface GestionDocumentalArchivo {
  id: number;
  estandar_codigo: string;
  estandar_nombre?: string;
  codigo: string;
  version: string;
  fecha_documento: string;
  nombre_archivo: string;
  ruta_archivo: string;
  mime_type?: string | null;
  tamano_bytes?: number | null;
  observaciones?: string | null;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
