import type {
  AdherenciaCapacitacionesResponse,
  CursoProfesionalCapacitacion,
  CumplimientoServicio,
  CapacitacionAdmin,
  CapacitacionArchivo,
  CapacitacionAdminPayload,
  CapacitacionPregunta,
  ConfirmarEntregaDespachoPayload,
  DevolverDespachoInventarioPayload,
  DespachoRecurso,
  DespachoRecursoPayload,
  EntregaFallidaPayload,
  ReintentoEntregaPayload,
  SugerenciaFefoResponse,
  ExamenCapacitacion,
  ArchivoCapacitacionProfesional,
  ProfesionalServicioPayload,
  PermisosAcceso,
  DocumentoPortalProfesional,
  EquipoAdquisicion,
  EquipoAlertaResumen,
  EquipoApoyoTecnico,
  EquipoBiomedico,
  EquipoCategoria,
  EquipoDatosTecnicos,
  EquipoDocumento,
  EquipoHojaVida,
  EquipoMantenimiento,
  ExperienciaLaboral,
  FormacionPortal,
  InventarioLoteRecurso,
  MovimientoInventarioRecurso,
  AuditoriaRecurso,
  AjusteInventarioPayload,
  BajaInventarioPayload,
  EstadoLotePayload,
  TrasladoLotePayload,
  DevolucionInventarioPayload,
  ProfesionalPerfil,
  ProfesionalPerfilPayload,
  ReferenciaPersonal,
  RelacionPayload,
  OrdenCompraRecurso,
  OrdenCompraRecursoPayload,
  RecursoAsistencial,
  RecursoAsistencialPayload,
  RecursoProveedorRelacion,
  RecursoServicioRelacion,
  ProveedorRecurso,
  ProveedorRecursoPayload,
  RecepcionRecurso,
  RecepcionRecursoPayload,
  ServicioDetalle,
  ServicioIps,
  ServicioProfesionalAsignado,
  TalentoHumanoServicio,
  UbicacionDepartamento,
  UbicacionMunicipio,
  UsuarioPermisos,
  UsuarioPermisosPayload,
  VacunaProfesional,
  EnviarExamenPayload,
  ResultadoExamenCapacitacion,
  ReportesRecursosResumen,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL || "https://api-pruebas.viveips.com.co";
const TOKEN_KEY = "viveips_token";
const ROL_KEY = "viveips_rol";
const CEDULA_KEY = "viveips_cedula";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function downloadUrl(endpoint: string) {
  const token = getToken();
  const glue = endpoint.includes("?") ? "&" : "?";
  return `${API_URL}${endpoint}${token ? `${glue}token=${encodeURIComponent(token)}` : ""}`;
}

export async function downloadBlob(endpoint: string, filename: string, openInNewTab = false) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { headers });
  if (!response.ok) {
    let message = "No fue posible descargar el archivo";
    try {
      const data = await response.json();
      message = typeof data?.detail === "string" ? data.detail : message;
    } catch {
      // El backend puede responder HTML/texto para descargas fallidas.
    }
    if (response.status === 401) clearSession();
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  if (openInNewTab) {
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROL_KEY);
  sessionStorage.removeItem(CEDULA_KEY);
}

export async function apiCall<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) clearSession();
    const detail = typeof data?.detail === "string" ? data.detail : data?.message;
    throw new Error(detail || "No fue posible completar la solicitud");
  }

  return data as T;
}

export async function apiFormCall<T>(method: string, endpoint: string, form: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { method, headers, body: form });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) clearSession();
    const detail = typeof data?.detail === "string" ? data.detail : data?.message;
    throw new Error(detail || "No fue posible completar la solicitud");
  }
  return data as T;
}

export async function login(usuario: string, password: string) {
  const data = await apiCall<{
    access_token: string;
    rol: string;
    cedula: string;
  }>("POST", "/auth/login", { usuario, password });

  sessionStorage.setItem(TOKEN_KEY, data.access_token);
  sessionStorage.setItem(ROL_KEY, data.rol);
  sessionStorage.setItem(CEDULA_KEY, data.cedula);
  return data;
}

export async function verificarSesion() {
  return apiCall<{ success: boolean; rol: string; cedula: string }>("GET", "/auth/verificar");
}

export async function obtenerMiAcceso() {
  return apiCall<PermisosAcceso>("GET", "/permisos/mi-acceso");
}

export async function listarUsuariosPermisos() {
  return apiCall<{ success: boolean; usuarios: UsuarioPermisos[] }>("GET", "/permisos/usuarios");
}

export async function actualizarPermisosUsuario(usuarioId: number, payload: UsuarioPermisosPayload) {
  return apiCall<{ success: boolean; usuario: UsuarioPermisos }>("PATCH", `/permisos/usuarios/${usuarioId}`, payload);
}

export async function alternarEstadoProfesional(profesionalId: number) {
  return apiCall<{ success: boolean; activo: boolean | number }>("POST", `/profesionales/toggle-activo/${profesionalId}`);
}

export async function listarServiciosIps() {
  return apiCall<{ success: boolean; servicios: ServicioIps[]; total: number }>("GET", "/servicios-ips");
}

export async function obtenerDetalleServicio(codigo: string) {
  return apiCall<ServicioDetalle>("GET", `/servicios-ips/${encodeURIComponent(codigo)}/detalle`);
}

export async function obtenerCumplimientoServicio(codigo: string) {
  return apiCall<CumplimientoServicio>("GET", `/servicios-ips/${encodeURIComponent(codigo)}/cumplimiento`);
}

export async function obtenerTalentoHumanoServicio(codigo: string) {
  return apiCall<TalentoHumanoServicio>("GET", `/servicios-ips/${encodeURIComponent(codigo)}/profesionales`);
}

export async function crearRelacion(codigo: string, payload: RelacionPayload) {
  return apiCall("POST", `/servicios-ips/${encodeURIComponent(codigo)}/relaciones`, payload);
}

export async function actualizarRelacion(id: number, payload: RelacionPayload) {
  return apiCall("PUT", `/servicios-relaciones/${id}`, payload);
}

export async function eliminarRelacion(id: number) {
  return apiCall("DELETE", `/servicios-relaciones/${id}`);
}

export async function asignarProfesionalServicio(codigo: string, payload: ProfesionalServicioPayload) {
  return apiCall("POST", `/servicios-ips/${encodeURIComponent(codigo)}/profesionales`, payload);
}

export async function quitarProfesionalServicio(id: number) {
  return apiCall("DELETE", `/servicios-profesionales/${id}`);
}

export async function listarProfesionales() {
  return apiCall<{ success: boolean; profesionales: any[] }>("GET", "/profesionales/");
}

export async function crearProfesional(payload: {
  nombre: string;
  cedula: string;
  email: string;
  telefono?: string;
  especialidad: string;
  password: string;
}) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", "/profesionales/crear", payload);
}

export async function obtenerProfesional(id: number) {
  return apiCall<{ success: boolean; perfil: any; documentos: any[] }>("GET", `/profesionales/${id}`);
}

export async function obtenerServiciosProfesional(id: number) {
  return apiCall<{ success: boolean; servicios: ServicioProfesionalAsignado[]; total: number }>(
    "GET",
    `/profesionales/${id}/servicios`,
  );
}

export async function obtenerMisServiciosProfesional() {
  return apiCall<{ success: boolean; servicios: ServicioProfesionalAsignado[]; total: number }>(
    "GET",
    "/profesionales/mis-servicios",
  );
}

export async function obtenerFormacionProfesional(id: number) {
  return apiCall<{ success: boolean; formaciones: any[] }>("GET", `/formacion/${id}`);
}

export async function obtenerMiPerfilProfesional() {
  return apiCall<{ success: boolean; perfil: ProfesionalPerfil }>("GET", "/profesionales/mi-perfil");
}

export async function actualizarMiPerfilProfesional(payload: ProfesionalPerfilPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", "/profesionales/mi-perfil", payload);
}

export async function aceptarTratamientoDatos() {
  return apiCall<{ success: boolean; mensaje: string; version_politica_datos: string }>("POST", "/tratamiento-datos/aceptar");
}

export async function listarMisDocumentosProfesional() {
  return apiCall<{ success: boolean; documentos: DocumentoPortalProfesional[] }>("GET", "/documentos/mis-documentos");
}

export async function subirDocumentoProfesional(tipoDocumentoCodigo: string, archivo: File, fechaVencimiento?: string | null) {
  const token = getToken();
  const form = new FormData();
  form.set("tipo_documento_codigo", tipoDocumentoCodigo);
  if (fechaVencimiento) form.set("fecha_vencimiento", fechaVencimiento);
  form.set("archivo", archivo);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/documentos/subir`, { method: "POST", headers, body: form });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    if (response.status === 401) clearSession();
    const detail = data?.detail;
    if (detail?.ia_rechazo) {
      throw new Error(`Validación IA: ${detail.motivo || "el documento no corresponde al soporte solicitado"}`);
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail || data || "No fue posible subir el documento"));
  }
  return data as { success: boolean; mensaje: string; estado: string; nombre: string; documento_id?: number; ia_no_disponible?: boolean };
}

export async function obtenerEstadoContratoProfesional() {
  return apiCall<{
    success: boolean;
    contrato: { estado: string; nombre_archivo?: string | null; fecha_generacion?: string | null } | null;
  }>("GET", "/contratos/estado-profesional");
}

export async function subirFirmaContratoProfesional(profesionalId: number, archivo: File, textoAceptacion: string) {
  const token = getToken();
  const form = new FormData();
  form.set("archivo", archivo);
  form.set("firma_aceptacion_texto", textoAceptacion);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/contratos/subir-firma/${profesionalId}`, { method: "POST", headers, body: form });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    if (response.status === 401) clearSession();
    throw new Error(typeof data?.detail === "string" ? data.detail : "No fue posible firmar el contrato");
  }
  return data as { success: boolean; hash_documento?: string | null; email_enviado?: boolean; email_error?: string | null };
}

export async function actualizarFechaDocumento(documentoId: number, fechaVencimiento: string | null) {
  return apiCall<{ success: boolean }>("PATCH", `/documentos/${documentoId}/fecha-vencimiento`, {
    fecha_vencimiento: fechaVencimiento,
  });
}

export async function subirFotoProfesional(archivo: File) {
  const token = getToken();
  const form = new FormData();
  form.set("foto", archivo);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/profesionales/subir-foto`, { method: "POST", headers, body: form });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(data?.detail || data?.message || "No fue posible subir la foto");
  }
  return data as { success: boolean; mensaje?: string };
}

export async function listarDepartamentos() {
  return apiCall<{ success: boolean; departamentos: UbicacionDepartamento[] }>("GET", "/ubicaciones/departamentos");
}

export async function listarMunicipios(codigoDepartamento: string) {
  return apiCall<{ success: boolean; municipios: UbicacionMunicipio[] }>(
    "GET",
    `/ubicaciones/municipios/${encodeURIComponent(codigoDepartamento)}`,
  );
}

export async function listarMisReferencias() {
  return apiCall<{ success: boolean; referencias: ReferenciaPersonal[] }>("GET", "/referencias/mis-referencias");
}

export async function guardarMisReferencias(referencias: ReferenciaPersonal[]) {
  return apiCall<{ success: boolean; mensaje?: string }>("POST", "/referencias/guardar", { referencias });
}

export async function listarMisExperiencias() {
  return apiCall<{ success: boolean; experiencias: ExperienciaLaboral[] }>("GET", "/experiencia/mis-experiencias");
}

export async function guardarMisExperiencias(experiencias: ExperienciaLaboral[]) {
  return apiCall<{ success: boolean; mensaje?: string }>("POST", "/experiencia/guardar", { experiencias });
}

export async function listarMisVacunas() {
  return apiCall<{ success: boolean; vacunas: VacunaProfesional[] }>("GET", "/vacunas/mis-vacunas");
}

export async function guardarMisVacunas(vacunas: VacunaProfesional[]) {
  return apiCall<{ success: boolean; mensaje?: string }>("POST", "/vacunas/guardar", { vacunas });
}

export async function listarMisFormaciones() {
  return apiCall<{ success: boolean; formaciones: FormacionPortal[] }>("GET", "/formacion/mis-formaciones");
}

export async function guardarFormacionPortal(formData: FormData) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/formacion/guardar`, { method: "POST", headers, body: formData });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(data?.detail || data?.message || "No fue posible guardar la formacion");
  }
  return data as { success: boolean; mensaje?: string };
}

export async function eliminarFormacionPortal(id: number) {
  return apiCall<{ success: boolean }>("DELETE", `/formacion/eliminar/${id}`);
}

export async function listarCapacitacionesAdmin() {
  return apiCall<{ success: boolean; capacitaciones: CapacitacionAdmin[] }>("GET", "/capacitaciones/admin/lista");
}

export async function guardarCapacitacionAdmin(payload: CapacitacionAdminPayload) {
  const token = getToken();
  const form = new FormData();
  if (payload.capacitacion_id) form.set("capacitacion_id", String(payload.capacitacion_id));
  form.set("rama", payload.rama);
  form.set("nombre", payload.nombre);
  form.set("descripcion", payload.descripcion || "");
  form.set("vigencia_meses", String(payload.vigencia_meses || 12));
  form.set("fecha_habilitacion", payload.fecha_habilitacion || "");
  form.set("fecha_vencimiento", payload.fecha_vencimiento || "");
  form.set("activo", String(payload.activo ? 1 : 0));

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/capacitaciones/admin/guardar`, {
    method: "POST",
    headers,
    body: form,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(data?.detail || data?.message || "No fue posible guardar la capacitacion");
  }

  return data as { success: boolean };
}

export async function toggleCapacitacionAdmin(id: number) {
  return apiCall<{ success: boolean; activo: number }>("POST", `/capacitaciones/admin/toggle/${id}`);
}

export async function eliminarCapacitacionAdmin(id: number) {
  return apiCall<{ success: boolean }>("DELETE", `/capacitaciones/admin/eliminar/${id}`);
}

export async function listarArchivosCapacitacionAdmin(id: number) {
  return apiCall<{ success: boolean; archivos: CapacitacionArchivo[] }>("GET", `/capacitaciones/admin/archivos/${id}`);
}

export async function subirArchivoCapacitacionAdmin(capacitacionId: number, archivo: File) {
  const token = getToken();
  const form = new FormData();
  form.set("capacitacion_id", String(capacitacionId));
  form.set("archivo", archivo);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/capacitaciones/admin/archivo/subir`, {
    method: "POST",
    headers,
    body: form,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(data?.detail || data?.message || "No fue posible subir el material");
  }

  return data as { success: boolean };
}

export async function eliminarArchivoCapacitacionAdmin(id: number) {
  return apiCall<{ success: boolean }>("DELETE", `/capacitaciones/admin/archivo/${id}`);
}

export async function listarPreguntasCapacitacionAdmin(id: number) {
  return apiCall<{ success: boolean; preguntas: CapacitacionPregunta[] }>("GET", `/capacitaciones/admin/preguntas/${id}`);
}

export async function guardarPreguntaCapacitacionAdmin(payload: {
  id?: number;
  capacitacion_id: number;
  pregunta: string;
  opciones: Array<{ opcion: string; es_correcta: boolean | number }>;
}) {
  return apiCall<{ success: boolean }>("POST", "/capacitaciones/admin/pregunta/guardar", payload);
}

export async function eliminarPreguntaCapacitacionAdmin(id: number) {
  return apiCall<{ success: boolean }>("DELETE", `/capacitaciones/admin/pregunta/${id}`);
}

export async function obtenerAdherenciaCapacitaciones(params: {
  estado?: string;
  capacitacion_id?: number | string;
  cargo?: string;
  q?: string;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<AdherenciaCapacitacionesResponse>("GET", `/capacitaciones/admin/adherencia${suffix}`);
}

// --- Capacitaciones del Profesional ---

export async function listarMisCapacitaciones() {
  return apiCall<{ success: boolean; cursos: CursoProfesionalCapacitacion[] }>("GET", "/capacitaciones/mis-cursos");
}

export async function obtenerArchivosCapacitacionProfesional(_capacitacionId: number) {
  return apiCall<{ success: boolean; archivos: ArchivoCapacitacionProfesional[] }>(
    "GET",
    `/capacitaciones/archivos/${_capacitacionId}`,
  );
}

export async function obtenerExamenCapacitacion(capacitacionId: number) {
  return apiCall<ExamenCapacitacion>("GET", `/capacitaciones/examen/${capacitacionId}`);
}

export async function enviarExamenCapacitacion(payload: EnviarExamenPayload) {
  return apiCall<ResultadoExamenCapacitacion>("POST", "/capacitaciones/enviar-examen", payload);
}

// --- Recursos Asistenciales ---

export async function listarRecursosAsistenciales(params: {
  tipo_recurso?: string;
  estado?: string;
  servicio_ips_id?: number | string;
  proveedor_id?: number | string;
  requiere_cadena_frio?: boolean | string;
  es_lasa?: boolean | string;
  busqueda?: string;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; recursos: RecursoAsistencial[]; total: number }>("GET", `/recursos-asistenciales${suffix}`);
}

export async function obtenerRecursoAsistencial(id: number) {
  return apiCall<{ success: boolean; recurso: RecursoAsistencial }>("GET", `/recursos-asistenciales/${id}`);
}

export async function crearRecursoAsistencial(payload: RecursoAsistencialPayload) {
  return apiCall<{ success: boolean; mensaje: string; recurso_id: number }>("POST", "/recursos-asistenciales", payload);
}

export async function actualizarRecursoAsistencial(id: number, payload: RecursoAsistencialPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", `/recursos-asistenciales/${id}`, payload);
}

export async function eliminarRecursoAsistencial(id: number) {
  return apiCall<{ success: boolean; mensaje: string }>("DELETE", `/recursos-asistenciales/${id}`);
}

export async function listarProveedoresRecursos(params: { estado?: string; busqueda?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; proveedores: ProveedorRecurso[]; total: number }>("GET", `/proveedores-recursos${suffix}`);
}

export async function crearProveedorRecurso(payload: ProveedorRecursoPayload) {
  return apiCall<{ success: boolean; mensaje: string; proveedor_id: number }>("POST", "/proveedores-recursos", payload);
}

export async function actualizarProveedorRecurso(id: number, payload: ProveedorRecursoPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", `/proveedores-recursos/${id}`, payload);
}

export async function eliminarProveedorRecurso(id: number) {
  return apiCall<{ success: boolean; mensaje: string }>("DELETE", `/proveedores-recursos/${id}`);
}

export async function asociarProveedorRecurso(recursoId: number, payload: Partial<RecursoProveedorRelacion> & { proveedor_id: number }) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/recursos-asistenciales/${recursoId}/proveedores`, payload);
}

export async function eliminarProveedorDeRecurso(recursoId: number, proveedorId: number) {
  return apiCall<{ success: boolean; mensaje: string }>("DELETE", `/recursos-asistenciales/${recursoId}/proveedores/${proveedorId}`);
}

export async function asociarServicioRecurso(recursoId: number, payload: Partial<RecursoServicioRelacion> & { servicio_ips_id: number }) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/recursos-asistenciales/${recursoId}/servicios`, payload);
}

export async function eliminarServicioDeRecurso(recursoId: number, servicioIpsId: number) {
  return apiCall<{ success: boolean; mensaje: string }>("DELETE", `/recursos-asistenciales/${recursoId}/servicios/${servicioIpsId}`);
}

export async function subirFichaTecnicaRecurso(recursoId: number, archivo: File, payload: { version?: string; fecha_documento?: string; observaciones?: string } = {}) {
  const form = new FormData();
  form.set("archivo", archivo);
  if (payload.version) form.set("version", payload.version);
  if (payload.fecha_documento) form.set("fecha_documento", payload.fecha_documento);
  if (payload.observaciones) form.set("observaciones", payload.observaciones);
  return apiFormCall<{ success: boolean; mensaje: string; ficha_id: number; ruta: string }>("POST", `/recursos-asistenciales/${recursoId}/fichas-tecnicas`, form);
}

export async function listarOrdenesCompraRecursos(params: { estado?: string; proveedor_id?: number | string; busqueda?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; ordenes: OrdenCompraRecurso[]; total: number }>("GET", `/ordenes-compra-recursos${suffix}`);
}

export async function obtenerOrdenCompraRecurso(id: number) {
  return apiCall<{ success: boolean; orden: OrdenCompraRecurso }>("GET", `/ordenes-compra-recursos/${id}`);
}

export async function crearOrdenCompraRecurso(payload: OrdenCompraRecursoPayload) {
  return apiCall<{ success: boolean; mensaje: string; orden_id: number }>("POST", "/ordenes-compra-recursos", payload);
}

export async function crearSolicitudCompraReorden(payload: { recurso_id: number; cantidad: number; proveedor_id?: number | null; observaciones?: string | null }) {
  return apiCall<{ success: boolean; mensaje: string; orden_id: number }>("POST", "/ordenes-compra-recursos/desde-reorden", payload);
}

export async function actualizarOrdenCompraRecurso(id: number, payload: OrdenCompraRecursoPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", `/ordenes-compra-recursos/${id}`, payload);
}

export async function aprobarOrdenCompraRecurso(id: number) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/ordenes-compra-recursos/${id}/aprobar`);
}

export async function eliminarOrdenCompraRecurso(id: number) {
  return apiCall<{ success: boolean; mensaje: string }>("DELETE", `/ordenes-compra-recursos/${id}`);
}

export async function listarRecepcionesRecursos(params: { estado?: string; orden_compra_id?: number | string; proveedor_id?: number | string; busqueda?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; recepciones: RecepcionRecurso[]; total: number }>("GET", `/recepciones-recursos${suffix}`);
}

export async function obtenerRecepcionRecurso(id: number) {
  return apiCall<{ success: boolean; recepcion: RecepcionRecurso }>("GET", `/recepciones-recursos/${id}`);
}

export async function crearRecepcionRecurso(payload: RecepcionRecursoPayload) {
  return apiCall<{ success: boolean; mensaje: string; recepcion_id: number }>("POST", "/recepciones-recursos", payload);
}

export async function actualizarRecepcionRecurso(id: number, payload: RecepcionRecursoPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", `/recepciones-recursos/${id}`, payload);
}

export async function ingresarRecepcionAInventario(id: number) {
  return apiCall<{ success: boolean; mensaje: string; lotes_creados: number; lotes_omitidos: number }>("POST", `/recepciones-recursos/${id}/ingresar-inventario`);
}

export async function listarInventarioLotes(params: { estado?: string; recurso_id?: number | string; busqueda?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; lotes: InventarioLoteRecurso[]; total: number }>("GET", `/inventario-recursos/lotes${suffix}`);
}

export async function listarMovimientosInventario(params: { recurso_id?: number | string; inventario_lote_id?: number | string; tipo_movimiento?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; movimientos: MovimientoInventarioRecurso[]; total: number }>("GET", `/inventario-recursos/movimientos${suffix}`);
}

export async function sugerirAsignacionFefo(payload: { recurso_id: number; cantidad: number; despacho_id?: number | null }) {
  return apiCall<SugerenciaFefoResponse>("POST", "/inventario-recursos/sugerir-fefo", payload);
}

export async function ajustarInventarioLote(id: number, payload: AjusteInventarioPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/inventario-recursos/lotes/${id}/ajustar`, payload);
}

export async function darBajaInventarioLote(id: number, payload: BajaInventarioPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/inventario-recursos/lotes/${id}/dar-baja`, payload);
}

export async function cambiarEstadoInventarioLote(id: number, payload: EstadoLotePayload) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/inventario-recursos/lotes/${id}/cambiar-estado`, payload);
}

export async function trasladarInventarioLote(id: number, payload: TrasladoLotePayload) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/inventario-recursos/lotes/${id}/trasladar`, payload);
}

export async function devolverInventarioLote(id: number, payload: DevolucionInventarioPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/inventario-recursos/lotes/${id}/devolver`, payload);
}

export async function listarAuditoriaRecursos(params: {
  modulo?: string;
  accion?: string;
  recurso_id?: number | string;
  usuario_id?: number | string;
  fecha_desde?: string;
  fecha_hasta?: string;
  busqueda?: string;
  limite?: number;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; eventos: AuditoriaRecurso[]; total: number }>("GET", `/auditoria-recursos${suffix}`);
}

export async function obtenerReportesRecursos(params: {
  fecha_desde?: string;
  fecha_hasta?: string;
  recurso_id?: number | string;
  proveedor_id?: number | string;
  responsable_entrega_id?: number | string;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; reportes: ReportesRecursosResumen }>("GET", `/reportes-recursos/resumen${suffix}`);
}

export async function listarDespachosRecursos(params: { estado?: string; responsable_entrega_id?: number | string; busqueda?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; despachos: DespachoRecurso[]; total: number }>("GET", `/despachos-recursos${suffix}`);
}

export async function obtenerDespachoRecurso(id: number) {
  return apiCall<{ success: boolean; despacho: DespachoRecurso }>("GET", `/despachos-recursos/${id}`);
}

export async function crearDespachoRecurso(payload: DespachoRecursoPayload) {
  return apiCall<{ success: boolean; mensaje: string; despacho_id: number }>("POST", "/despachos-recursos", payload);
}

export async function actualizarDespachoRecurso(id: number, payload: DespachoRecursoPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", `/despachos-recursos/${id}`, payload);
}

export async function marcarSalidaDespachoRecurso(id: number) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/despachos-recursos/${id}/marcar-salida`);
}

export async function programarReintentoDespachoRecurso(id: number, payload: ReintentoEntregaPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/despachos-recursos/${id}/reintentar`, payload);
}

export async function devolverDespachoInventarioRecurso(id: number, payload: DevolverDespachoInventarioPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/despachos-recursos/${id}/devolver-inventario`, payload);
}

export async function cancelarDespachoRecurso(id: number) {
  return apiCall<{ success: boolean; mensaje: string }>("DELETE", `/despachos-recursos/${id}`);
}

export async function listarHistorialEntregasRecursos(params: { paciente_documento?: string; responsable_entrega_id?: number | string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; despachos: DespachoRecurso[]; total: number }>("GET", `/despachos-recursos/historial${suffix}`);
}

export async function listarMisEntregasRecursos() {
  return apiCall<{ success: boolean; despachos: DespachoRecurso[]; total: number }>("GET", "/despachos-recursos/mis-entregas");
}

export async function obtenerMiEntregaRecurso(id: number) {
  return apiCall<{ success: boolean; despacho: DespachoRecurso }>("GET", `/despachos-recursos/mis-entregas/${id}`);
}

export async function confirmarMiEntregaRecurso(id: number, payload: ConfirmarEntregaDespachoPayload) {
  return apiCall<{ success: boolean; mensaje: string; firma_archivo: string }>("POST", `/despachos-recursos/mis-entregas/${id}/confirmar`, payload);
}

export async function registrarMiEntregaFallida(id: number, payload: EntregaFallidaPayload) {
  return apiCall<{ success: boolean; mensaje: string }>("POST", `/despachos-recursos/mis-entregas/${id}/fallar`, payload);
}

export async function subirEvidenciaMiEntrega(id: number, archivo: File) {
  const form = new FormData();
  form.set("archivo", archivo);
  return apiFormCall<{ success: boolean; mensaje: string; ruta: string }>("POST", `/despachos-recursos/mis-entregas/${id}/evidencia`, form);
}

// --- Infraestructura / Tecnovigilancia ---

export async function listarEquiposBiomedicos(params: {
  estado?: string;
  area?: string;
  servicio?: string;
  buscar?: string;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiCall<{ success: boolean; equipos: EquipoBiomedico[]; total: number }>("GET", `/equipos${suffix}`);
}

export async function obtenerHojaVidaEquipo(equipoId: number) {
  return apiCall<EquipoHojaVida>("GET", `/equipos/${equipoId}/hoja-vida`);
}

export async function crearEquipoBiomedico(payload: Partial<EquipoBiomedico>) {
  return apiCall<{ success: boolean; mensaje: string; equipo_id: number; codigo_interno?: string }>("POST", "/equipos", payload);
}

export async function actualizarEquipoBiomedico(equipoId: number, payload: Partial<EquipoBiomedico>) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", `/equipos/${equipoId}`, payload);
}

export async function darBajaEquipoBiomedico(equipoId: number, motivo: string) {
  return apiCall<{ success: boolean; mensaje: string }>("PATCH", `/equipos/${equipoId}/dar-baja`, { motivo });
}

export async function listarCategoriasEquipo() {
  return apiCall<{ success: boolean; categorias: EquipoCategoria[] }>("GET", "/equipos/categorias");
}

export async function crearCategoriaEquipo(nombre: string) {
  return apiCall<{ success: boolean; categoria_id?: number; mensaje?: string }>("POST", "/equipos/categorias", { nombre });
}

export async function guardarAdquisicionEquipo(equipoId: number, payload: EquipoAdquisicion) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", `/equipos/${equipoId}/adquisicion`, payload);
}

export async function guardarDatosTecnicosEquipo(equipoId: number, payload: EquipoDatosTecnicos) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", `/equipos/${equipoId}/datos-tecnicos-completo`, payload);
}

export async function guardarApoyoTecnicoEquipo(equipoId: number, payload: EquipoApoyoTecnico) {
  return apiCall<{ success: boolean; mensaje: string }>("PUT", `/equipos/${equipoId}/apoyo-tecnico`, payload);
}

export async function subirArchivoEquipo(equipoId: number, tipo: "foto" | "manual-usuario" | "manual-tecnico", archivo: File) {
  const form = new FormData();
  form.set("archivo", archivo);
  return apiFormCall<{ success: boolean; mensaje?: string; ruta?: string }>("POST", `/equipos/${equipoId}/archivos/${tipo}`, form);
}

export async function listarAnexosEquipo(equipoId: number) {
  return apiCall<{ success: boolean; anexos: EquipoDocumento[] }>("GET", `/equipos/${equipoId}/anexos/catalogo`);
}

export async function subirAnexoEquipo(equipoId: number, tipoAnexo: string, archivo: File) {
  const form = new FormData();
  form.set("archivo", archivo);
  return apiFormCall<{ success: boolean; mensaje?: string; documento_id?: number }>(
    "POST",
    `/equipos/${equipoId}/anexos/${encodeURIComponent(tipoAnexo)}/upload`,
    form,
  );
}

export async function marcarAnexoNoAplica(equipoId: number, tipoAnexo: string) {
  return apiCall<{ success: boolean; mensaje: string }>(
    "POST",
    `/equipos/${equipoId}/anexos/${encodeURIComponent(tipoAnexo)}/no-aplica`,
  );
}

export async function registrarMantenimientoEquipo(equipoId: number, payload: Partial<EquipoMantenimiento>) {
  return apiCall<{ success: boolean; mensaje?: string; numero_reporte?: string }>("POST", `/equipos/${equipoId}/historial`, payload);
}

export async function registrarCalibracionEquipo(
  equipoId: number,
  payload: {
    fecha_calibracion: string;
    proxima_calibracion?: string | null;
    certificado?: string | null;
    entidad_calibradora?: string | null;
    resultado?: string | null;
    observaciones?: string | null;
  },
) {
  return apiCall<{ success: boolean; mensaje?: string; calibracion_id?: number }>("POST", `/equipos/${equipoId}/calibraciones`, payload);
}

export async function obtenerAlertasEquipos() {
  return apiCall<EquipoAlertaResumen>("GET", "/equipos/alertas/resumen");
}
