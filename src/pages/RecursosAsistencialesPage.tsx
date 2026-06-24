import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  FileDown,
  Eye,
  FlaskConical,
  History,
  MoreVertical,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Search,
  Snowflake,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  actualizarOrdenCompraRecurso,
  actualizarRecepcionRecurso,
  actualizarDespachoRecurso,
  actualizarProveedorRecurso,
  actualizarRecursoAsistencial,
  ajustarInventarioLote,
  aprobarOrdenCompraRecurso,
  asociarProveedorRecurso,
  asociarServicioRecurso,
  buscarPacientesIpsHealthcare,
  cambiarEstadoInventarioLote,
  crearOrdenCompraRecurso,
  crearDespachoRecurso,
  crearRecepcionRecurso,
  crearProveedorRecurso,
  crearRecursoAsistencial,
  crearSolicitudCompraReorden,
  darBajaInventarioLote,
  devolverDespachoInventarioRecurso,
  devolverInventarioLote,
  descargarDespachosProfesional,
  downloadBlob,
  eliminarOrdenCompraRecurso,
  cancelarDespachoRecurso,
  eliminarProveedorDeRecurso,
  eliminarProveedorRecurso,
  eliminarRecursoAsistencial,
  eliminarServicioDeRecurso,
  ingresarRecepcionAInventario,
  listarAuditoriaRecursos,
  listarInventarioLotes,
  listarMovimientosInventario,
  obtenerReportesRecursos,
  listarDespachosRecursos,
  listarHistorialEntregasRecursos,
  listarResultadosInvima,
  listarOrdenesCompraRecursos,
  listarProfesionales,
  listarProveedoresRecursos,
  listarRecepcionesRecursos,
  listarRecursosAsistenciales,
  listarServiciosIps,
  obtenerOrdenCompraRecurso,
  obtenerDespachoRecurso,
  obtenerMiAcceso,
  obtenerRecepcionRecurso,
  marcarSalidaDespachoRecurso,
  obtenerRecursoAsistencial,
  programarReintentoDespachoRecurso,
  subirFichaTecnicaRecurso,
  sugerirAsignacionFefo,
  trasladarInventarioLote,
} from "../api";
import type {
  OrdenCompraRecurso,
  OrdenCompraRecursoDetalle,
  OrdenCompraRecursoPayload,
  PacienteIpsHealthcare,
  PermisosAcceso,
  InventarioLoteRecurso,
  InvimaAlertasEstado,
  InvimaAlertaResultado,
  MovimientoInventarioRecurso,
  AuditoriaRecurso,
  ReportesRecursosResumen,
  DespachoRecurso,
  DespachoRecursoDetalle,
  DespachoRecursoPayload,
  ProfesionalAdmin,
  ProveedorRecurso,
  ProveedorRecursoPayload,
  RecepcionRecurso,
  RecepcionRecursoDetalle,
  RecepcionRecursoPayload,
  RecursoAsistencial,
  RecursoAsistencialPayload,
  ServicioIps,
} from "../types";
import { Loading } from "../ui/Loading";

const TIPOS_RECURSO = [
  { value: "medicamento", label: "Medicamento" },
  { value: "dispositivo_medico", label: "Dispositivo medico" },
  { value: "insumo", label: "Insumo" },
  { value: "reactivo", label: "Reactivo" },
];

const ESTADOS_RECURSO = ["activo", "inactivo", "en_revision", "rechazado"];
const ESTADOS_PROVEEDOR = ["activo", "inactivo", "en_revision", "bloqueado"];
const ESTADOS_ORDEN_COMPRA = ["borrador", "solicitada", "aprobada", "enviada_proveedor", "parcialmente_recibida", "recibida", "cerrada", "cancelada"];
const TIPOS_RECEPCION = ["tecnica", "administrativa", "tecnica_administrativa"];
const ESTADOS_RECEPCION = ["pendiente", "aprobada", "rechazada", "parcial"];
const ESTADOS_LOTE = ["disponible", "cuarentena", "bloqueado", "vencido", "agotado", "dado_de_baja"];
const ESTADOS_DESPACHO = ["preparado", "en_camino", "entregado", "devuelto", "fallido", "cancelado"];
const TABS = ["catalogo", "proveedores", "compras", "recepcion", "inventario", "distribucion", "auditoria", "reportes", "invima"] as const;

type TabKey = (typeof TABS)[number];
type AlertaKey = "proximos_vencer" | "vencidos" | "stock_minimo" | "reorden" | "recepciones" | "entregas";

type AlertaDetalle = {
  id: string;
  titulo: string;
  detalle: string;
  meta?: string;
  recurso_id?: number;
  cantidad_sugerida?: number;
};

const REPORTES_VACIOS: ReportesRecursosResumen = {
  kardex: [],
  consumo: [],
  vencimientos_bajas: [],
  compras_por_proveedor: [],
  cumplimiento_entregas: [],
  rotacion: [],
};

const INVIMA_ESTADO_VACIO: InvimaAlertasEstado = {
  ultima_fecha_revisada: null,
  ultima_ejecucion: null,
  total_revisadas: 0,
  total_coincidencias: 0,
  error_ultima_ejecucion: null,
};

type RecursoForm = {
  id?: number;
  codigo: string;
  nombre: string;
  tipo_recurso: string;
  descripcion: string;
  presentacion: string;
  unidad_medida: string;
  concentracion: string;
  principio_activo: string;
  registro_sanitario: string;
  fecha_vencimiento_registro_sanitario: string;
  requiere_registro_sanitario: boolean;
  requiere_cadena_frio: boolean;
  temperatura_min: string;
  temperatura_max: string;
  humedad_min: string;
  humedad_max: string;
  es_lasa: boolean;
  alto_riesgo: boolean;
  requiere_formula: boolean;
  requiere_ficha_tecnica: boolean;
  stock_minimo: string;
  stock_maximo: string;
  punto_reorden: string;
  tiempo_reposicion_dias: string;
  estado: string;
  observaciones: string;
  servicios: number[];
  proveedores: number[];
  ficha?: File | null;
  ficha_version: string;
  ficha_fecha: string;
  ficha_observaciones: string;
};

type ProveedorForm = ProveedorRecursoPayload & { id?: number };

type OrdenDetalleForm = {
  recurso_id: string;
  cantidad: string;
  valor_unitario: string;
  fecha_estimada_entrega: string;
  observaciones: string;
};

type OrdenCompraForm = {
  id?: number;
  numero_orden: string;
  proveedor_id: string;
  fecha_orden: string;
  fecha_estimada_entrega: string;
  estado: string;
  impuestos: string;
  factura_numero: string;
  factura_archivo: string;
  observaciones: string;
  detalles: OrdenDetalleForm[];
};

type RecepcionDetalleForm = {
  recurso_id: string;
  lote: string;
  cantidad_recibida: string;
  fecha_vencimiento: string;
  cantidad_pendiente: string;
  permitir_exceso: boolean;
  justificacion_exceso: string;
  registro_sanitario_validado: boolean;
  empaque_integro: boolean;
  temperatura_recibida: string;
  humedad_recibida: string;
  cumple: boolean;
  motivo_rechazo: string;
  observaciones: string;
};

type RecepcionForm = {
  id?: number;
  orden_compra_id: string;
  proveedor_id: string;
  fecha_recepcion: string;
  tipo_recepcion: string;
  estado: string;
  observaciones: string;
  detalles: RecepcionDetalleForm[];
};

type DespachoDetalleForm = {
  recurso_id: string;
  inventario_lote_id: string;
  cantidad: string;
  seleccion_manual: boolean;
  justificacion_seleccion_manual: string;
  recomendaciones_almacenamiento: string;
  observaciones: string;
};

type DespachoForm = {
  id?: number;
  numero_despacho: string;
  responsable_entrega_id: string;
  paciente_nombre: string;
  paciente_documento: string;
  paciente_telefono: string;
  paciente_email: string;
  direccion_entrega: string;
  ciudad_entrega: string;
  fecha_programada: string;
  estado: string;
  observaciones: string;
  detalles: DespachoDetalleForm[];
};

type ReintentoForm = {
  despacho: DespachoRecurso;
  fecha_programada: string;
  observaciones: string;
};

type DevolucionDespachoForm = {
  despacho: DespachoRecurso;
  apto_reintegro: boolean;
  motivo: string;
};

type OperacionLote = "ajuste" | "baja" | "estado" | "traslado" | "devolucion";

type OperacionLoteForm = {
  lote: InventarioLoteRecurso;
  operacion: OperacionLote;
  tipoAjuste: "positivo" | "negativo";
  cantidad: string;
  causaBaja: "vencimiento" | "deterioro" | "perdida" | "dano";
  estadoDestino: "disponible" | "bloqueado" | "cuarentena";
  ubicacionDestino: string;
  origenDevolucion: "profesional" | "paciente";
  aptoReintegro: boolean;
  motivo: string;
};

function bool(valor: unknown) {
  return valor === true || valor === 1 || valor === "1";
}

function texto(valor?: string | number | null) {
  if (valor === 0) return "0";
  return valor ? String(valor) : "-";
}

function dinero(valor?: string | number | null) {
  const numeroValor = Number(valor || 0);
  return numeroValor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function numero(valor: string) {
  const limpio = String(valor || "").replace(/[^0-9.,-]/g, "").replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) && limpio ? n : null;
}

function labelTipo(tipo?: string | null) {
  return TIPOS_RECURSO.find((item) => item.value === tipo)?.label || texto(tipo);
}

function reglasTipoRecurso(tipo?: string | null) {
  return {
    requiereRegistroSanitario: true,
    requiereFormula: tipo !== "insumo",
    esMedicamento: tipo === "medicamento",
    requiereVencimientoLote: tipo === "medicamento",
  };
}

function normalizarFormPorTipo(form: RecursoForm): RecursoForm {
  const reglas = reglasTipoRecurso(form.tipo_recurso);
  return {
    ...form,
    requiere_registro_sanitario: reglas.requiereRegistroSanitario,
    requiere_formula: reglas.requiereFormula,
    concentracion: reglas.esMedicamento ? form.concentracion : "",
    principio_activo: reglas.esMedicamento ? form.principio_activo : "",
    es_lasa: reglas.esMedicamento ? form.es_lasa : false,
    alto_riesgo: reglas.esMedicamento ? form.alto_riesgo : false,
  };
}

function labelTabRecursos(tab: TabKey) {
  const labels: Record<TabKey, string> = {
    catalogo: "Catálogo",
    proveedores: "Proveedores",
    compras: "Compras",
    recepcion: "Recepción",
    inventario: "Inventario",
    distribucion: "Distribución",
    auditoria: "Auditoría",
    reportes: "Reportes",
    invima: "Alertas INVIMA",
  };
  return labels[tab];
}

function estadoNormalizado(valor?: string | null) {
  return String(valor || "").trim().toLowerCase();
}

function puedeRecibirOrden(orden?: Pick<OrdenCompraRecurso, "estado"> | null) {
  return ["aprobada", "enviada_proveedor", "parcialmente_recibida"].includes(estadoNormalizado(orden?.estado));
}

function puedeAprobarOrden(orden?: Pick<OrdenCompraRecurso, "estado"> | null) {
  return ["borrador", "solicitada"].includes(estadoNormalizado(orden?.estado));
}

function fechaHora(valor?: string | null) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return texto(valor);
  return fecha.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function labelAuditoria(valor?: string | null) {
  return String(valor || "-").replaceAll("_", " ");
}

function datosAuditoria(valor: unknown) {
  if (!valor) return null;
  if (typeof valor === "string") {
    try {
      return JSON.parse(valor);
    } catch {
      return valor;
    }
  }
  return valor;
}

function valorLegible(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "-";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function diferenciasAuditoria(evento: AuditoriaRecurso) {
  const anteriores = datosAuditoria(evento.datos_anteriores);
  const nuevos = datosAuditoria(evento.datos_nuevos);
  if (!anteriores || !nuevos || typeof anteriores !== "object" || typeof nuevos !== "object" || Array.isArray(anteriores) || Array.isArray(nuevos)) {
    return [];
  }
  const anteriorObj = anteriores as Record<string, unknown>;
  const nuevoObj = nuevos as Record<string, unknown>;
  return [...new Set([...Object.keys(anteriorObj), ...Object.keys(nuevoObj)])]
    .filter((campo) => JSON.stringify(anteriorObj[campo] ?? null) !== JSON.stringify(nuevoObj[campo] ?? null))
    .slice(0, 12)
    .map((campo) => ({ campo, antes: anteriorObj[campo], despues: nuevoObj[campo] }));
}

function exportarCsv(nombre: string, filas: Array<Record<string, unknown>>) {
  if (!filas.length) return;
  const columnas = Object.keys(filas[0]);
  const escapar = (valor: unknown) => `"${valorLegible(valor).replaceAll('"', '""')}"`;
  const contenido = [
    columnas.join(","),
    ...filas.map((fila) => columnas.map((columna) => escapar(fila[columna])).join(",")),
  ].join("\n");
  const blob = new Blob([`\ufeff${contenido}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function fechaLocal(valor?: string | null) {
  if (!valor) return null;
  const fecha = new Date(`${String(valor).slice(0, 10)}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function diasDesdeHoy(valor?: string | null) {
  const fecha = fechaLocal(valor);
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((fecha.getTime() - hoy.getTime()) / 86400000);
}

function despachoPreparado(despacho: DespachoRecurso) {
  return estadoNormalizado(despacho.estado) === "preparado";
}

function inicialRecurso(): RecursoForm {
  return normalizarFormPorTipo({
    codigo: "",
    nombre: "",
    tipo_recurso: "medicamento",
    descripcion: "",
    presentacion: "",
    unidad_medida: "",
    concentracion: "",
    principio_activo: "",
    registro_sanitario: "",
    fecha_vencimiento_registro_sanitario: "",
    requiere_registro_sanitario: true,
    requiere_cadena_frio: false,
    temperatura_min: "",
    temperatura_max: "",
    humedad_min: "",
    humedad_max: "",
    es_lasa: false,
    alto_riesgo: false,
    requiere_formula: true,
    requiere_ficha_tecnica: false,
    stock_minimo: "0",
    stock_maximo: "0",
    punto_reorden: "0",
    tiempo_reposicion_dias: "",
    estado: "activo",
    observaciones: "",
    servicios: [],
    proveedores: [],
    ficha: null,
    ficha_version: "",
    ficha_fecha: "",
    ficha_observaciones: "",
  });
}

function recursoAForm(recurso: RecursoAsistencial): RecursoForm {
  return normalizarFormPorTipo({
    ...inicialRecurso(),
    id: recurso.id,
    codigo: recurso.codigo || "",
    nombre: recurso.nombre || "",
    tipo_recurso: recurso.tipo_recurso || "medicamento",
    descripcion: recurso.descripcion || "",
    presentacion: recurso.presentacion || "",
    unidad_medida: recurso.unidad_medida || "",
    concentracion: recurso.concentracion || "",
    principio_activo: recurso.principio_activo || "",
    registro_sanitario: recurso.registro_sanitario || "",
    fecha_vencimiento_registro_sanitario: recurso.fecha_vencimiento_registro_sanitario || "",
    requiere_registro_sanitario: bool(recurso.requiere_registro_sanitario),
    requiere_cadena_frio: bool(recurso.requiere_cadena_frio),
    temperatura_min: recurso.temperatura_min != null ? String(recurso.temperatura_min) : "",
    temperatura_max: recurso.temperatura_max != null ? String(recurso.temperatura_max) : "",
    humedad_min: recurso.humedad_min != null ? String(recurso.humedad_min) : "",
    humedad_max: recurso.humedad_max != null ? String(recurso.humedad_max) : "",
    es_lasa: bool(recurso.es_lasa),
    alto_riesgo: bool(recurso.alto_riesgo),
    requiere_formula: bool(recurso.requiere_formula),
    requiere_ficha_tecnica: bool(recurso.requiere_ficha_tecnica),
    stock_minimo: recurso.stock_minimo != null ? String(recurso.stock_minimo) : "0",
    stock_maximo: recurso.stock_maximo != null ? String(recurso.stock_maximo) : "0",
    punto_reorden: recurso.punto_reorden != null ? String(recurso.punto_reorden) : "0",
    tiempo_reposicion_dias: recurso.tiempo_reposicion_dias != null ? String(recurso.tiempo_reposicion_dias) : "",
    estado: recurso.estado || "activo",
    observaciones: recurso.observaciones || "",
    servicios: (recurso.servicios || []).map((item) => item.servicio_ips_id),
    proveedores: (recurso.proveedores || []).map((item) => item.proveedor_id),
  });
}

function inicialProveedor(): ProveedorForm {
  return {
    nombre: "",
    nit: "",
    contacto_nombre: "",
    contacto_cargo: "",
    telefono: "",
    correo: "",
    direccion: "",
    ciudad: "",
    departamento: "",
    estado: "activo",
    observaciones: "",
  };
}

function proveedorAForm(proveedor: ProveedorRecurso): ProveedorForm {
  return {
    id: proveedor.id,
    nombre: proveedor.nombre || "",
    nit: proveedor.nit || "",
    contacto_nombre: proveedor.contacto_nombre || "",
    contacto_cargo: proveedor.contacto_cargo || "",
    telefono: proveedor.telefono || "",
    correo: proveedor.correo || "",
    direccion: proveedor.direccion || "",
    ciudad: proveedor.ciudad || "",
    departamento: proveedor.departamento || "",
    estado: proveedor.estado || "activo",
    observaciones: proveedor.observaciones || "",
  };
}

function detalleOrdenInicial(): OrdenDetalleForm {
  return {
    recurso_id: "",
    cantidad: "1",
    valor_unitario: "0",
    fecha_estimada_entrega: "",
    observaciones: "",
  };
}

function inicialOrdenCompra(): OrdenCompraForm {
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    numero_orden: "",
    proveedor_id: "",
    fecha_orden: hoy,
    fecha_estimada_entrega: "",
    estado: "borrador",
    impuestos: "0",
    factura_numero: "",
    factura_archivo: "",
    observaciones: "",
    detalles: [detalleOrdenInicial()],
  };
}

function ordenCompraAForm(orden: OrdenCompraRecurso): OrdenCompraForm {
  return {
    id: orden.id,
    numero_orden: orden.numero_orden || "",
    proveedor_id: orden.proveedor_id ? String(orden.proveedor_id) : "",
    fecha_orden: orden.fecha_orden || "",
    fecha_estimada_entrega: orden.fecha_estimada_entrega || "",
    estado: orden.estado || "borrador",
    impuestos: orden.impuestos != null ? String(orden.impuestos) : "0",
    factura_numero: orden.factura_numero || "",
    factura_archivo: orden.factura_archivo || "",
    observaciones: orden.observaciones || "",
    detalles: (orden.detalles && orden.detalles.length ? orden.detalles : []).map((detalle: OrdenCompraRecursoDetalle) => ({
      recurso_id: detalle.recurso_id ? String(detalle.recurso_id) : "",
      cantidad: detalle.cantidad != null ? String(detalle.cantidad) : "1",
      valor_unitario: detalle.valor_unitario != null ? String(detalle.valor_unitario) : "0",
      fecha_estimada_entrega: detalle.fecha_estimada_entrega || "",
      observaciones: detalle.observaciones || "",
    })).concat(orden.detalles && orden.detalles.length ? [] : [detalleOrdenInicial()]),
  };
}

function detalleRecepcionInicial(): RecepcionDetalleForm {
  return {
    recurso_id: "",
    lote: "",
    cantidad_recibida: "1",
    fecha_vencimiento: "",
    cantidad_pendiente: "",
    permitir_exceso: false,
    justificacion_exceso: "",
    registro_sanitario_validado: false,
    empaque_integro: true,
    temperatura_recibida: "",
    humedad_recibida: "",
    cumple: true,
    motivo_rechazo: "",
    observaciones: "",
  };
}

function recepcionDesdeOrden(orden: OrdenCompraRecurso): RecepcionForm {
  const hoy = new Date().toISOString().slice(0, 10);
  const detallesPendientes = (orden.detalles && orden.detalles.length ? orden.detalles : [])
    .filter((detalle) => Number(detalle.cantidad_pendiente ?? detalle.cantidad ?? 0) > 0);
  return {
    orden_compra_id: String(orden.id),
    proveedor_id: orden.proveedor_id ? String(orden.proveedor_id) : "",
    fecha_recepcion: hoy,
    tipo_recepcion: "tecnica_administrativa",
    estado: "pendiente",
    observaciones: "",
    detalles: detallesPendientes.map((detalle) => {
      const pendiente = Number(detalle.cantidad_pendiente ?? detalle.cantidad ?? 1);
      return {
        ...detalleRecepcionInicial(),
        recurso_id: detalle.recurso_id ? String(detalle.recurso_id) : "",
        cantidad_recibida: String(pendiente || 1),
        cantidad_pendiente: String(pendiente || 0),
        fecha_vencimiento: "",
      };
    }).concat(detallesPendientes.length ? [] : [detalleRecepcionInicial()]),
  };
}

function recepcionAForm(recepcion: RecepcionRecurso): RecepcionForm {
  return {
    id: recepcion.id,
    orden_compra_id: recepcion.orden_compra_id ? String(recepcion.orden_compra_id) : "",
    proveedor_id: recepcion.proveedor_id ? String(recepcion.proveedor_id) : "",
    fecha_recepcion: recepcion.fecha_recepcion || "",
    tipo_recepcion: recepcion.tipo_recepcion || "tecnica_administrativa",
    estado: recepcion.estado || "pendiente",
    observaciones: recepcion.observaciones || "",
    detalles: (recepcion.detalles && recepcion.detalles.length ? recepcion.detalles : []).map((detalle: RecepcionRecursoDetalle) => ({
      recurso_id: detalle.recurso_id ? String(detalle.recurso_id) : "",
      lote: detalle.lote || "",
      cantidad_recibida: detalle.cantidad_recibida != null ? String(detalle.cantidad_recibida) : "1",
      fecha_vencimiento: detalle.fecha_vencimiento || "",
      cantidad_pendiente: "",
      permitir_exceso: bool(detalle.permitir_exceso),
      justificacion_exceso: detalle.justificacion_exceso || "",
      registro_sanitario_validado: bool(detalle.registro_sanitario_validado),
      empaque_integro: bool(detalle.empaque_integro),
      temperatura_recibida: detalle.temperatura_recibida != null ? String(detalle.temperatura_recibida) : "",
      humedad_recibida: detalle.humedad_recibida != null ? String(detalle.humedad_recibida) : "",
      cumple: bool(detalle.cumple),
      motivo_rechazo: detalle.motivo_rechazo || "",
      observaciones: detalle.observaciones || "",
    })).concat(recepcion.detalles && recepcion.detalles.length ? [] : [detalleRecepcionInicial()]),
  };
}

function detalleDespachoInicial(seleccionManual = false): DespachoDetalleForm {
  return {
    recurso_id: "",
    inventario_lote_id: "",
    cantidad: "1",
    seleccion_manual: seleccionManual,
    justificacion_seleccion_manual: "",
    recomendaciones_almacenamiento: "",
    observaciones: "",
  };
}

function inicialDespacho(): DespachoForm {
  return {
    numero_despacho: "",
    responsable_entrega_id: "",
    paciente_nombre: "",
    paciente_documento: "",
    paciente_telefono: "",
    paciente_email: "",
    direccion_entrega: "",
    ciudad_entrega: "",
    fecha_programada: "",
    estado: "preparado",
    observaciones: "",
    detalles: [],
  };
}

function despachoAForm(despacho: DespachoRecurso): DespachoForm {
  return {
    id: despacho.id,
    numero_despacho: despacho.numero_despacho || "",
    responsable_entrega_id: despacho.responsable_entrega_id ? String(despacho.responsable_entrega_id) : "",
    paciente_nombre: despacho.paciente_nombre || "",
    paciente_documento: despacho.paciente_documento || "",
    paciente_telefono: despacho.paciente_telefono || "",
    paciente_email: despacho.paciente_email || "",
    direccion_entrega: despacho.direccion_entrega || "",
    ciudad_entrega: despacho.ciudad_entrega || "",
    fecha_programada: despacho.fecha_programada ? String(despacho.fecha_programada).slice(0, 16) : "",
    estado: despacho.estado || "preparado",
    observaciones: despacho.observaciones || "",
    detalles: (despacho.detalles && despacho.detalles.length ? despacho.detalles : []).map((detalle: DespachoRecursoDetalle) => ({
      recurso_id: detalle.recurso_id ? String(detalle.recurso_id) : "",
      inventario_lote_id: detalle.inventario_lote_id ? String(detalle.inventario_lote_id) : "",
      cantidad: detalle.cantidad != null ? String(detalle.cantidad) : "1",
      seleccion_manual: bool(detalle.seleccion_manual),
      justificacion_seleccion_manual: detalle.justificacion_seleccion_manual || "",
      recomendaciones_almacenamiento: detalle.recomendaciones_almacenamiento || "",
      observaciones: detalle.observaciones || "",
    })),
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="recursos-form-section">
      <h3>{title}</h3>
      <div className="recursos-form-grid">{children}</div>
    </section>
  );
}

export function RecursosAsistencialesPage() {
  const [tab, setTab] = useState<TabKey>("catalogo");
  const [recursos, setRecursos] = useState<RecursoAsistencial[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorRecurso[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompraRecurso[]>([]);
  const [recepciones, setRecepciones] = useState<RecepcionRecurso[]>([]);
  const [lotesInventario, setLotesInventario] = useState<InventarioLoteRecurso[]>([]);
  const [movimientosInventario, setMovimientosInventario] = useState<MovimientoInventarioRecurso[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaRecurso[]>([]);
  const [reportes, setReportes] = useState<ReportesRecursosResumen>(REPORTES_VACIOS);
  const [alertasInvima, setAlertasInvima] = useState<InvimaAlertaResultado[]>([]);
  const [estadoInvima, setEstadoInvima] = useState<InvimaAlertasEstado>(INVIMA_ESTADO_VACIO);
  const [despachos, setDespachos] = useState<DespachoRecurso[]>([]);
  const [historialEntregas, setHistorialEntregas] = useState<DespachoRecurso[]>([]);
  const [profesionales, setProfesionales] = useState<ProfesionalAdmin[]>([]);
  const [profesionalesConEntregas, setProfesionalesConEntregas] = useState<ProfesionalAdmin[]>([]);
  const [servicios, setServicios] = useState<ServicioIps[]>([]);
  const [acceso, setAcceso] = useState<PermisosAcceso | null>(null);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [servicioFiltro, setServicioFiltro] = useState("");
  const [compraQuery, setCompraQuery] = useState("");
  const [compraEstado, setCompraEstado] = useState("");
  const [recepcionQuery, setRecepcionQuery] = useState("");
  const [recepcionEstado, setRecepcionEstado] = useState("");
  const [inventarioQuery, setInventarioQuery] = useState("");
  const [inventarioEstado, setInventarioEstado] = useState("");
  const [despachoQuery, setDespachoQuery] = useState("");
  const [despachoEstado, setDespachoEstado] = useState("");
  const [auditoriaQuery, setAuditoriaQuery] = useState("");
  const [auditoriaModulo, setAuditoriaModulo] = useState("");
  const [auditoriaAccion, setAuditoriaAccion] = useState("");
  const [auditoriaUsuarioId, setAuditoriaUsuarioId] = useState("");
  const [auditoriaRecursoId, setAuditoriaRecursoId] = useState("");
  const [auditoriaLote, setAuditoriaLote] = useState("");
  const [auditoriaDesde, setAuditoriaDesde] = useState("");
  const [auditoriaHasta, setAuditoriaHasta] = useState("");
  const [reporteDesde, setReporteDesde] = useState("");
  const [reporteHasta, setReporteHasta] = useState("");
  const [reporteRecursoId, setReporteRecursoId] = useState("");
  const [reporteProveedorId, setReporteProveedorId] = useState("");
  const [reporteProfesionalId, setReporteProfesionalId] = useState("");
  const [invimaQuery, setInvimaQuery] = useState("");
  const [invimaTipo, setInvimaTipo] = useState("");
  const [invimaDesde, setInvimaDesde] = useState("");
  const [invimaHasta, setInvimaHasta] = useState("");
  const [recursoForm, setRecursoForm] = useState<RecursoForm | null>(null);
  const [proveedorForm, setProveedorForm] = useState<ProveedorForm | null>(null);
  const [ordenForm, setOrdenForm] = useState<OrdenCompraForm | null>(null);
  const [recepcionForm, setRecepcionForm] = useState<RecepcionForm | null>(null);
  const [despachoForm, setDespachoForm] = useState<DespachoForm | null>(null);
  const [pacienteBusqueda, setPacienteBusqueda] = useState("");
  const [pacientesExternos, setPacientesExternos] = useState<PacienteIpsHealthcare[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState("");
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [reintentoForm, setReintentoForm] = useState<ReintentoForm | null>(null);
  const [devolucionDespachoForm, setDevolucionDespachoForm] = useState<DevolucionDespachoForm | null>(null);
  const [listadoProfesional, setListadoProfesional] = useState("");
  const [historialPaciente, setHistorialPaciente] = useState("");
  const [historialProfesional, setHistorialProfesional] = useState("");
  const [loteDetalle, setLoteDetalle] = useState<InventarioLoteRecurso | null>(null);
  const [movimientosDetalle, setMovimientosDetalle] = useState<MovimientoInventarioRecurso[]>([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [alertaActiva, setAlertaActiva] = useState<AlertaKey | null>(null);
  const [auditoriaDetalle, setAuditoriaDetalle] = useState<AuditoriaRecurso | null>(null);
  const [operacionLoteForm, setOperacionLoteForm] = useState<OperacionLoteForm | null>(null);
  const [fefoRecursoId, setFefoRecursoId] = useState("");
  const [fefoCantidad, setFefoCantidad] = useState("1");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const accesoData = await obtenerMiAcceso();
      setAcceso(accesoData);
      const puedeConsultarAuditoria = Boolean(accesoData.permiso_ver_todo || accesoData.permiso_recursos_auditoria);
      const [recursosData, proveedoresData, serviciosData, ordenesData, recepcionesData, lotesData, movimientosData, despachosData, profesionalesData, auditoriaData, reportesData, invimaData] = await Promise.all([
        listarRecursosAsistenciales(),
        listarProveedoresRecursos(),
        listarServiciosIps(),
        listarOrdenesCompraRecursos(),
        listarRecepcionesRecursos(),
        listarInventarioLotes(),
        listarMovimientosInventario(),
        listarDespachosRecursos(),
        listarProfesionales(),
        puedeConsultarAuditoria ? listarAuditoriaRecursos({ limite: 500 }) : Promise.resolve({ eventos: [] }),
        puedeConsultarAuditoria ? obtenerReportesRecursos() : Promise.resolve({ reportes: REPORTES_VACIOS }),
        puedeConsultarAuditoria ? listarResultadosInvima({ limite: 100 }) : Promise.resolve({ alertas: [], estado: INVIMA_ESTADO_VACIO }),
      ]);
      setRecursos(recursosData.recursos || []);
      setProveedores(proveedoresData.proveedores || []);
      setOrdenes(ordenesData.ordenes || []);
      setRecepciones(recepcionesData.recepciones || []);
      setLotesInventario(lotesData.lotes || []);
      setMovimientosInventario(movimientosData.movimientos || []);
      setDespachos(despachosData.despachos || []);
      const profesionalesActivos = (profesionalesData.profesionales || []).filter((profesional) => Number(profesional.activo) === 1);
      const conteoAbiertas = new Map<string, number>();
      (despachosData.despachos || []).forEach((despacho) => {
        const estado = estadoNormalizado(despacho.estado);
        const responsableId = despacho.responsable_entrega_id;
        if (!responsableId || !["en_camino", "fallido"].includes(estado)) return;
        const key = String(responsableId);
        conteoAbiertas.set(key, (conteoAbiertas.get(key) || 0) + 1);
      });
      const profesionalesAbiertos = profesionalesActivos
        .filter((profesional) => conteoAbiertas.has(String(profesional.id)))
        .map((profesional) => ({ ...profesional, entregas_abiertas: conteoAbiertas.get(String(profesional.id)) || 0 }));
      setProfesionales(profesionalesActivos);
      setProfesionalesConEntregas(profesionalesAbiertos);
      if (listadoProfesional && !profesionalesAbiertos.some((profesional) => String(profesional.id) === String(listadoProfesional))) {
        setListadoProfesional("");
      }
      setAuditoria(auditoriaData.eventos || []);
      setReportes(reportesData.reportes || REPORTES_VACIOS);
      setAlertasInvima(invimaData.alertas || []);
      setEstadoInvima(invimaData.estado || INVIMA_ESTADO_VACIO);
      setServicios(
        (serviciosData.servicios || [])
          .filter((servicio) => servicio.estado === "habilitado" || servicio.estado === "proximo")
          .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "es")),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar recursos asistenciales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function cargarReportesFiltrados() {
    setAccion("cargar-reportes");
    setError("");
    try {
      const data = await obtenerReportesRecursos({
        fecha_desde: reporteDesde,
        fecha_hasta: reporteHasta,
        recurso_id: reporteRecursoId,
        proveedor_id: reporteProveedorId,
        responsable_entrega_id: reporteProfesionalId,
      });
      setReportes(data.reportes || REPORTES_VACIOS);
      setSuccess("Reportes actualizados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar los reportes");
    } finally {
      setAccion("");
    }
  }

  async function cargarAlertasInvimaFiltradas() {
    setAccion("cargar-invima");
    setError("");
    try {
      const data = await listarResultadosInvima({
        busqueda: invimaQuery,
        tipo: invimaTipo,
        fecha_desde: invimaDesde,
        fecha_hasta: invimaHasta,
        limite: 200,
      });
      setAlertasInvima(data.alertas || []);
      setEstadoInvima(data.estado || INVIMA_ESTADO_VACIO);
      setSuccess("Alertas INVIMA actualizadas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar las alertas INVIMA");
    } finally {
      setAccion("");
    }
  }

  function exportarAuditoria() {
    exportarCsv("auditoria_recursos.csv", auditoriaFiltrada.map((evento) => ({
      fecha: evento.created_at,
      usuario: evento.usuario_nombre,
      modulo: labelAuditoria(evento.modulo),
      accion: labelAuditoria(evento.accion),
      entidad: labelAuditoria(evento.entidad),
      referencia: evento.referencia,
      recurso: evento.recurso_nombre ? `${texto(evento.recurso_codigo)} ${evento.recurso_nombre}` : "",
      lote: evento.lote,
      estado_anterior: evento.estado_anterior,
      estado_nuevo: evento.estado_nuevo,
      observaciones: evento.observaciones,
      ip: evento.ip,
    })));
  }

  const permisoTotal = Boolean(acceso?.permiso_ver_todo);
  const puedeComprar = permisoTotal || Boolean(acceso?.permiso_recursos_comprar);
  const puedeAprobarCompras = permisoTotal || Boolean(acceso?.permiso_recursos_aprobar);
  const puedeRecibirCompras = permisoTotal || Boolean(acceso?.permiso_recursos_recibir);
  const puedeAjustarInventario = permisoTotal || Boolean(acceso?.permiso_recursos_ajustar);
  const puedeDarBajaInventario = permisoTotal || Boolean(acceso?.permiso_recursos_dar_baja);
  const puedeDespachar = permisoTotal || Boolean(acceso?.permiso_recursos_despachar);
  const puedeConsultarAuditoria = permisoTotal || Boolean(acceso?.permiso_recursos_auditoria);
  const tabsVisibles = TABS.filter((item) => !["auditoria", "reportes", "invima"].includes(item) || puedeConsultarAuditoria);

  const recursosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recursos.filter((recurso) => {
      if (tipo && recurso.tipo_recurso !== tipo) return false;
      if (estado && recurso.estado !== estado) return false;
      if (servicioFiltro && !(recurso.servicios_resumen || "").includes(servicioFiltro)) return false;
      if (!q) return true;
      return [recurso.codigo, recurso.nombre, recurso.registro_sanitario, recurso.principio_activo, recurso.proveedores_resumen, recurso.servicios_resumen].some((value) =>
        String(value || "").toLowerCase().includes(q),
      );
    });
  }, [estado, query, recursos, servicioFiltro, tipo]);

  const kpis = useMemo(
    () => ({
      total: recursos.length,
      medicamentos: recursos.filter((item) => item.tipo_recurso === "medicamento").length,
      cadenaFrio: recursos.filter((item) => bool(item.requiere_cadena_frio)).length,
      lasa: recursos.filter((item) => bool(item.es_lasa)).length,
    }),
    [recursos],
  );

  const ordenesFiltradas = useMemo(() => {
    const q = compraQuery.trim().toLowerCase();
    return ordenes.filter((orden) => {
      if (compraEstado && orden.estado !== compraEstado) return false;
      if (!q) return true;
      return [orden.numero_orden, orden.proveedor_nombre, orden.proveedor_nit, orden.factura_numero].some((value) =>
        String(value || "").toLowerCase().includes(q),
      );
    });
  }, [compraEstado, compraQuery, ordenes]);

  const recepcionesFiltradas = useMemo(() => {
    const q = recepcionQuery.trim().toLowerCase();
    return recepciones.filter((recepcion) => {
      if (recepcionEstado && recepcion.estado !== recepcionEstado) return false;
      if (!q) return true;
      return [recepcion.numero_orden, recepcion.proveedor_nombre, recepcion.proveedor_nit].some((value) =>
        String(value || "").toLowerCase().includes(q),
      );
    });
  }, [recepcionEstado, recepcionQuery, recepciones]);

  const lotesFiltrados = useMemo(() => {
    const q = inventarioQuery.trim().toLowerCase();
    return lotesInventario.filter((lote) => {
      if (inventarioEstado && lote.estado !== inventarioEstado) return false;
      if (!q) return true;
      return [lote.lote, lote.recurso_codigo, lote.recurso_nombre, lote.numero_orden, lote.ubicacion].some((value) =>
        String(value || "").toLowerCase().includes(q),
      );
    });
  }, [inventarioEstado, inventarioQuery, lotesInventario]);

  function cantidadDisponibleParaDespacho(lote: InventarioLoteRecurso) {
    const reservadaEnEdicion = despachoForm?.id
      ? despachoForm.detalles
        .filter((detalle) => Number(detalle.inventario_lote_id) === lote.id)
        .reduce((total, detalle) => total + (numero(detalle.cantidad) || 0), 0)
      : 0;
    return Number(lote.cantidad_disponible_despacho ?? lote.cantidad_actual ?? 0) + reservadaEnEdicion;
  }

  const lotesDisponiblesFefo = useMemo(() => lotesInventario
    .filter((lote) => {
      const dias = diasDesdeHoy(lote.fecha_vencimiento);
      const reservadaEnEdicion = despachoForm?.id
        ? despachoForm.detalles
          .filter((detalle) => Number(detalle.inventario_lote_id) === lote.id)
          .reduce((total, detalle) => total + (numero(detalle.cantidad) || 0), 0)
        : 0;
      const disponible = Number(lote.cantidad_disponible_despacho ?? lote.cantidad_actual ?? 0) + reservadaEnEdicion;
      return lote.estado === "disponible" && disponible > 0 && (dias == null || dias >= 0);
    })
    .sort((a, b) => {
      if (!a.fecha_vencimiento && b.fecha_vencimiento) return 1;
      if (a.fecha_vencimiento && !b.fecha_vencimiento) return -1;
      return String(a.fecha_vencimiento || "").localeCompare(String(b.fecha_vencimiento || ""))
        || a.id - b.id;
    }), [despachoForm, lotesInventario]);

  const recursosConInventarioFefo = useMemo(() => {
    const ids = new Set(lotesDisponiblesFefo.map((lote) => lote.recurso_id));
    return recursos.filter((recurso) => ids.has(recurso.id));
  }, [lotesDisponiblesFefo, recursos]);

  function prioridadFefo(lote: InventarioLoteRecurso) {
    const lotesRecurso = lotesDisponiblesFefo.filter((item) => item.recurso_id === lote.recurso_id);
    const indice = lotesRecurso.findIndex((item) => item.id === lote.id);
    return {
      prioridad: indice >= 0 ? indice + 1 : null,
      total: lotesRecurso.length,
    };
  }

  const despachosFiltrados = useMemo(() => {
    const q = despachoQuery.trim().toLowerCase();
    return despachos.filter((despacho) => {
      if (despachoEstado && estadoNormalizado(despacho.estado) !== despachoEstado) return false;
      if (!q) return true;
      return [despacho.numero_despacho, despacho.paciente_nombre, despacho.paciente_documento, despacho.responsable_nombre].some((value) =>
        String(value || "").toLowerCase().includes(q),
      );
    });
  }, [despachoEstado, despachoQuery, despachos]);

  const auditoriaFiltrada = useMemo(() => {
    const q = auditoriaQuery.trim().toLowerCase();
    return auditoria.filter((evento) => {
      if (auditoriaModulo && evento.modulo !== auditoriaModulo) return false;
      if (auditoriaAccion && evento.accion !== auditoriaAccion) return false;
      if (auditoriaUsuarioId && String(evento.usuario_id || "") !== auditoriaUsuarioId) return false;
      if (auditoriaRecursoId && String(evento.recurso_id || "") !== auditoriaRecursoId) return false;
      if (auditoriaLote && String(evento.lote || "") !== auditoriaLote) return false;
      const fecha = String(evento.created_at || "").slice(0, 10);
      if (auditoriaDesde && fecha < auditoriaDesde) return false;
      if (auditoriaHasta && fecha > auditoriaHasta) return false;
      if (!q) return true;
      return [
        evento.referencia, evento.recurso_codigo, evento.recurso_nombre, evento.lote,
        evento.usuario_nombre, evento.accion, evento.entidad, evento.observaciones,
      ].some((valor) => String(valor || "").toLowerCase().includes(q));
    });
  }, [auditoria, auditoriaAccion, auditoriaDesde, auditoriaHasta, auditoriaLote, auditoriaModulo, auditoriaQuery, auditoriaRecursoId, auditoriaUsuarioId]);

  const modulosAuditoria = useMemo(
    () => [...new Set(auditoria.map((evento) => evento.modulo).filter(Boolean))].sort(),
    [auditoria],
  );

  const accionesAuditoria = useMemo(
    () => [...new Set(auditoria.map((evento) => evento.accion).filter(Boolean))].sort(),
    [auditoria],
  );

  const usuariosAuditoria = useMemo(
    () => [...new Map(auditoria
      .filter((evento) => evento.usuario_id || evento.usuario_nombre)
      .map((evento) => [String(evento.usuario_id || evento.usuario_nombre), {
        id: String(evento.usuario_id || evento.usuario_nombre),
        nombre: texto(evento.usuario_nombre),
      }])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [auditoria],
  );

  const lotesAuditoria = useMemo(
    () => [...new Set(auditoria.map((evento) => evento.lote).filter(Boolean).map(String))].sort(),
    [auditoria],
  );

  const totalOrdenForm = useMemo(() => {
    if (!ordenForm) return 0;
    const subtotal = ordenForm.detalles.reduce((sum, detalle) => {
      return sum + (numero(detalle.cantidad) || 0) * (numero(detalle.valor_unitario) || 0);
    }, 0);
    return subtotal + (numero(ordenForm.impuestos) || 0);
  }, [ordenForm]);

  const alertasRecursos = useMemo(() => {
    const proximosVencer: AlertaDetalle[] = [];
    const vencidos: AlertaDetalle[] = [];
    const stockMinimo: AlertaDetalle[] = [];
    const reorden: AlertaDetalle[] = [];

    lotesInventario.forEach((lote) => {
      const dias = diasDesdeHoy(lote.fecha_vencimiento);
      const cantidad = Number(lote.cantidad_actual || 0);
      if (cantidad <= 0 || dias == null) return;
      const detalle = {
        id: `lote-${lote.id}`,
        titulo: `${texto(lote.recurso_codigo)} · ${texto(lote.recurso_nombre)}`,
        detalle: `Lote ${texto(lote.lote)} · ${cantidad} unidades`,
        meta: `Vence: ${texto(lote.fecha_vencimiento)}`,
      };
      if (dias <= 0) vencidos.push(detalle);
      else if (dias <= 90) proximosVencer.push({ ...detalle, meta: `${detalle.meta} · ${dias} día(s)` });
    });

    const inventarioPorRecurso = new Map<number, { lote: InventarioLoteRecurso; disponible: number }>();
    lotesInventario.forEach((lote) => {
      const actual = inventarioPorRecurso.get(lote.recurso_id) || { lote, disponible: 0 };
      if (estadoNormalizado(lote.estado) === "disponible") {
        actual.disponible += Number(lote.cantidad_actual || 0);
      }
      inventarioPorRecurso.set(lote.recurso_id, actual);
    });
    inventarioPorRecurso.forEach(({ lote, disponible }) => {
      const minimo = Number(lote.stock_minimo || 0);
      const punto = Number(lote.punto_reorden || 0);
      const base = {
        titulo: `${texto(lote.recurso_codigo)} · ${texto(lote.recurso_nombre)}`,
        detalle: `Existencia disponible: ${disponible}`,
      };
      if (minimo > 0 && disponible <= minimo) {
        stockMinimo.push({ id: `minimo-${lote.recurso_id}`, ...base, meta: `Stock mínimo: ${minimo}` });
      }
      if (punto > 0 && disponible <= punto) {
        const maximo = Number(lote.stock_maximo || 0);
        const cantidadSugerida = Math.max(maximo > disponible ? maximo - disponible : punto - disponible, 1);
        reorden.push({
          id: `reorden-${lote.recurso_id}`,
          ...base,
          meta: `Punto de reorden: ${punto} · Sugerido: ${Math.ceil(cantidadSugerida)}`,
          recurso_id: lote.recurso_id,
          cantidad_sugerida: Math.ceil(cantidadSugerida),
        });
      }
    });

    const recepcionesPendientes = recepciones
      .filter((recepcion) => ["aprobada", "parcial"].includes(estadoNormalizado(recepcion.estado)))
      .filter((recepcion) => !lotesInventario.some((lote) => Number(lote.recepcion_id) === recepcion.id))
      .map((recepcion) => ({
        id: `recepcion-${recepcion.id}`,
        titulo: `Orden ${texto(recepcion.numero_orden)}`,
        detalle: texto(recepcion.proveedor_nombre),
        meta: `Recepción ${texto(recepcion.estado)} · ${texto(recepcion.fecha_recepcion)}`,
      }));

    const entregasAtrasadas = despachos
      .filter((despacho) => ["preparado", "en_camino"].includes(estadoNormalizado(despacho.estado)))
      .filter((despacho) => {
        const dias = diasDesdeHoy(despacho.fecha_programada);
        return dias != null && dias < 0;
      })
      .map((despacho) => ({
        id: `despacho-${despacho.id}`,
        titulo: `${despacho.numero_despacho} · ${texto(despacho.paciente_nombre)}`,
        detalle: texto(despacho.direccion_entrega),
        meta: `Programada: ${texto(despacho.fecha_programada)} · ${texto(despacho.estado)}`,
      }));

    return {
      proximos_vencer: proximosVencer,
      vencidos,
      stock_minimo: stockMinimo,
      reorden,
      recepciones: recepcionesPendientes,
      entregas: entregasAtrasadas,
    };
  }, [despachos, lotesInventario, recepciones]);

  const configuracionAlertas: Array<{ key: AlertaKey; label: string; ayuda: string; tono: string }> = [
    { key: "proximos_vencer", label: "Próximos a vencer", ayuda: "En los próximos 90 días", tono: "warning" },
    { key: "vencidos", label: "Lotes vencidos", ayuda: "Con existencia registrada", tono: "danger" },
    { key: "stock_minimo", label: "Stock mínimo", ayuda: "Existencia disponible crítica", tono: "danger" },
    { key: "reorden", label: "Punto de reorden", ayuda: "Requieren iniciar compra", tono: "warning" },
    { key: "recepciones", label: "Pendientes de inventario", ayuda: "Recepciones aprobadas o parciales", tono: "info" },
    { key: "entregas", label: "Entregas atrasadas", ayuda: "Preparadas o en camino", tono: "danger" },
  ];

  async function abrirMovimientosLote(lote: InventarioLoteRecurso) {
    setLoteDetalle(lote);
    setMovimientosDetalle([]);
    setCargandoMovimientos(true);
    try {
      const data = await listarMovimientosInventario({ inventario_lote_id: lote.id });
      setMovimientosDetalle(data.movimientos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar los movimientos del lote");
      setLoteDetalle(null);
    } finally {
      setCargandoMovimientos(false);
    }
  }

  function abrirOperacionLote(lote: InventarioLoteRecurso, operacion: OperacionLote, elemento?: HTMLElement) {
    elemento?.closest("details")?.removeAttribute("open");
    if (operacion === "baja" && !puedeDarBajaInventario) {
      setError("No tienes permiso para dar de baja inventario.");
      return;
    }
    if (operacion !== "baja" && !puedeAjustarInventario) {
      setError("No tienes permiso para ajustar inventario.");
      return;
    }
    const estadoDestino = lote.estado === "bloqueado" || lote.estado === "cuarentena" ? "disponible" : "bloqueado";
    setOperacionLoteForm({
      lote,
      operacion,
      tipoAjuste: "positivo",
      cantidad: "",
      causaBaja: "vencimiento",
      estadoDestino,
      ubicacionDestino: "",
      origenDevolucion: "profesional",
      aptoReintegro: false,
      motivo: "",
    });
  }

  async function guardarOperacionLote() {
    if (!operacionLoteForm) return;
    const { lote, operacion, motivo } = operacionLoteForm;
    const cantidad = numero(operacionLoteForm.cantidad);
    if (!motivo.trim()) {
      setError("El motivo de la operación es obligatorio.");
      return;
    }
    if (["ajuste", "baja", "devolucion"].includes(operacion) && (!cantidad || cantidad <= 0)) {
      setError("La cantidad debe ser mayor a cero.");
      return;
    }
    if (operacion === "traslado" && !operacionLoteForm.ubicacionDestino.trim()) {
      setError("La ubicación destino es obligatoria.");
      return;
    }

    setAccion("guardar-operacion-lote");
    setError("");
    setSuccess("");
    try {
      if (operacion === "ajuste") {
        await ajustarInventarioLote(lote.id, {
          tipo: operacionLoteForm.tipoAjuste,
          cantidad: cantidad || 0,
          motivo: motivo.trim(),
        });
      } else if (operacion === "baja") {
        await darBajaInventarioLote(lote.id, {
          cantidad: cantidad || 0,
          causa: operacionLoteForm.causaBaja,
          motivo: motivo.trim(),
        });
      } else if (operacion === "estado") {
        await cambiarEstadoInventarioLote(lote.id, {
          estado: operacionLoteForm.estadoDestino,
          motivo: motivo.trim(),
        });
      } else if (operacion === "traslado") {
        await trasladarInventarioLote(lote.id, {
          ubicacion_destino: operacionLoteForm.ubicacionDestino.trim(),
          motivo: motivo.trim(),
        });
      } else {
        await devolverInventarioLote(lote.id, {
          cantidad: cantidad || 0,
          origen: operacionLoteForm.origenDevolucion,
          apto_reintegro: operacionLoteForm.aptoReintegro,
          motivo: motivo.trim(),
        });
      }
      setOperacionLoteForm(null);
      setSuccess("Operación de inventario registrada correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la operación de inventario");
    } finally {
      setAccion("");
    }
  }

  function actualizarRecurso(campo: keyof RecursoForm, valor: string | boolean | number[] | File | null) {
    setRecursoForm((actual) => {
      if (!actual) return actual;
      const siguiente = { ...actual, [campo]: valor };
      if (campo === "tipo_recurso") {
        return normalizarFormPorTipo(siguiente);
      }
      if (campo === "requiere_cadena_frio" && valor === false) {
        siguiente.temperatura_min = "";
        siguiente.temperatura_max = "";
      }
      return normalizarFormPorTipo(siguiente);
    });
  }

  function toggleRelacion(campo: "servicios" | "proveedores", id: number) {
    setRecursoForm((actual) => {
      if (!actual) return actual;
      const set = new Set(actual[campo]);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...actual, [campo]: [...set] };
    });
  }

  function actualizarOrden(campo: keyof OrdenCompraForm, valor: string) {
    setOrdenForm((actual) => (actual ? { ...actual, [campo]: valor } : actual));
  }

  function actualizarDetalleOrden(index: number, campo: keyof OrdenDetalleForm, valor: string) {
    setOrdenForm((actual) => {
      if (!actual) return actual;
      const detalles = actual.detalles.map((detalle, idx) => (idx === index ? { ...detalle, [campo]: valor } : detalle));
      return { ...actual, detalles };
    });
  }

  function agregarDetalleOrden() {
    setOrdenForm((actual) => (actual ? { ...actual, detalles: [...actual.detalles, detalleOrdenInicial()] } : actual));
  }

  function quitarDetalleOrden(index: number) {
    setOrdenForm((actual) => {
      if (!actual) return actual;
      const detalles = actual.detalles.filter((_, idx) => idx !== index);
      return { ...actual, detalles: detalles.length ? detalles : [detalleOrdenInicial()] };
    });
  }

  function actualizarRecepcion(campo: keyof RecepcionForm, valor: string) {
    setRecepcionForm((actual) => (actual ? { ...actual, [campo]: valor } : actual));
  }

  function actualizarDetalleRecepcion(index: number, campo: keyof RecepcionDetalleForm, valor: string | boolean) {
    setRecepcionForm((actual) => {
      if (!actual) return actual;
      const detalles = actual.detalles.map((detalle, idx) => (idx === index ? { ...detalle, [campo]: valor } : detalle));
      return { ...actual, detalles };
    });
  }

  function actualizarDespacho(campo: keyof DespachoForm, valor: string) {
    setDespachoForm((actual) => (actual ? { ...actual, [campo]: valor } : actual));
  }

  function actualizarDetalleDespacho(index: number, campo: keyof DespachoDetalleForm, valor: string | boolean) {
    setDespachoForm((actual) => {
      if (!actual) return actual;
      const detalles = actual.detalles.map((detalle, idx) => {
        if (idx !== index) return detalle;
        const siguiente = { ...detalle, [campo]: valor };
        if (campo === "inventario_lote_id" && typeof valor === "string") {
          const lote = lotesInventario.find((item) => item.id === Number(valor));
          siguiente.recurso_id = lote?.recurso_id ? String(lote.recurso_id) : "";
          siguiente.seleccion_manual = true;
          siguiente.justificacion_seleccion_manual = "";
        }
        return siguiente;
      });
      return { ...actual, detalles };
    });
  }

  async function aplicarFefoDespacho() {
    if (!despachoForm || !fefoRecursoId) {
      setError("Selecciona el recurso para aplicar FEFO.");
      return;
    }
    const cantidad = numero(fefoCantidad);
    if (!cantidad || cantidad <= 0) {
      setError("La cantidad FEFO debe ser mayor a cero.");
      return;
    }
    const recursoId = Number(fefoRecursoId);
    const existentes = despachoForm.detalles.some((detalle) => Number(detalle.recurso_id) === recursoId);
    if (existentes && !window.confirm("Este recurso ya tiene lotes en el despacho. ¿Reemplazarlos con la asignación FEFO?")) return;

    setAccion("aplicar-fefo");
    setError("");
    try {
      const data = await sugerirAsignacionFefo({
        recurso_id: recursoId,
        cantidad,
        despacho_id: despachoForm.id || null,
      });
      const sugeridos: DespachoDetalleForm[] = data.asignaciones.map((asignacion) => ({
        recurso_id: String(asignacion.recurso_id),
        inventario_lote_id: String(asignacion.id),
        cantidad: String(asignacion.cantidad_sugerida),
        seleccion_manual: false,
        justificacion_seleccion_manual: "",
        recomendaciones_almacenamiento: "",
        observaciones: "",
      }));
      setDespachoForm((actual) => {
        if (!actual) return actual;
        const otros = actual.detalles.filter((detalle) => detalle.inventario_lote_id && Number(detalle.recurso_id) !== recursoId);
        return { ...actual, detalles: [...otros, ...sugeridos] };
      });
      setFefoRecursoId("");
      setFefoCantidad("1");
      setSuccess(`Recurso agregado con FEFO: ${sugeridos.length} lote${sugeridos.length === 1 ? "" : "s"} asignado${sugeridos.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible calcular la asignación FEFO");
    } finally {
      setAccion("");
    }
  }

  function agregarDetalleDespacho() {
    setDespachoForm((actual) => (actual ? { ...actual, detalles: [...actual.detalles, detalleDespachoInicial(true)] } : actual));
  }

  function quitarDetalleDespacho(index: number) {
    setDespachoForm((actual) => {
      if (!actual) return actual;
      const detalles = actual.detalles.filter((_, idx) => idx !== index);
      return { ...actual, detalles };
    });
  }

  function payloadRecurso(form: RecursoForm): RecursoAsistencialPayload {
    const normalizado = normalizarFormPorTipo(form);
    return {
      codigo: normalizado.codigo.trim() || null,
      nombre: normalizado.nombre.trim(),
      tipo_recurso: normalizado.tipo_recurso,
      descripcion: normalizado.descripcion || null,
      presentacion: normalizado.presentacion || null,
      unidad_medida: normalizado.unidad_medida || null,
      concentracion: normalizado.concentracion || null,
      principio_activo: normalizado.principio_activo || null,
      registro_sanitario: normalizado.registro_sanitario || null,
      fecha_vencimiento_registro_sanitario: normalizado.fecha_vencimiento_registro_sanitario || null,
      requiere_registro_sanitario: normalizado.requiere_registro_sanitario,
      requiere_cadena_frio: normalizado.requiere_cadena_frio,
      temperatura_min: normalizado.requiere_cadena_frio ? numero(normalizado.temperatura_min) : null,
      temperatura_max: normalizado.requiere_cadena_frio ? numero(normalizado.temperatura_max) : null,
      humedad_min: numero(normalizado.humedad_min),
      humedad_max: numero(normalizado.humedad_max),
      es_lasa: normalizado.es_lasa,
      alto_riesgo: normalizado.alto_riesgo,
      requiere_formula: normalizado.requiere_formula,
      requiere_ficha_tecnica: normalizado.requiere_ficha_tecnica,
      stock_minimo: numero(normalizado.stock_minimo) || 0,
      stock_maximo: numero(normalizado.stock_maximo) || 0,
      punto_reorden: numero(normalizado.punto_reorden) || 0,
      tiempo_reposicion_dias: normalizado.tiempo_reposicion_dias ? Number(normalizado.tiempo_reposicion_dias) : null,
      estado: normalizado.estado,
      observaciones: normalizado.observaciones || null,
    };
  }

  function payloadOrden(form: OrdenCompraForm): OrdenCompraRecursoPayload {
    return {
      numero_orden: form.numero_orden.trim() || null,
      proveedor_id: Number(form.proveedor_id),
      fecha_orden: form.fecha_orden || null,
      fecha_estimada_entrega: form.fecha_estimada_entrega || null,
      estado: form.estado,
      impuestos: numero(form.impuestos) || 0,
      factura_numero: form.factura_numero || null,
      factura_archivo: form.factura_archivo || null,
      observaciones: form.observaciones || null,
      detalles: form.detalles
        .filter((detalle) => detalle.recurso_id)
        .map((detalle) => ({
          recurso_id: Number(detalle.recurso_id),
          cantidad: numero(detalle.cantidad) || 0,
          valor_unitario: numero(detalle.valor_unitario) || 0,
          fecha_estimada_entrega: detalle.fecha_estimada_entrega || null,
          observaciones: detalle.observaciones || null,
        })),
    };
  }

  function payloadRecepcion(form: RecepcionForm): RecepcionRecursoPayload {
    return {
      orden_compra_id: Number(form.orden_compra_id),
      proveedor_id: Number(form.proveedor_id),
      fecha_recepcion: form.fecha_recepcion || null,
      tipo_recepcion: form.tipo_recepcion,
      estado: form.estado,
      observaciones: form.observaciones || null,
      detalles: form.detalles
        .filter((detalle) => detalle.recurso_id)
        .map((detalle) => ({
          recurso_id: Number(detalle.recurso_id),
          lote: detalle.lote || null,
          cantidad_recibida: numero(detalle.cantidad_recibida) || 0,
          fecha_vencimiento: detalle.fecha_vencimiento || null,
          permitir_exceso: detalle.permitir_exceso,
          justificacion_exceso: detalle.justificacion_exceso || null,
          registro_sanitario_validado: detalle.registro_sanitario_validado,
          empaque_integro: detalle.empaque_integro,
          temperatura_recibida: numero(detalle.temperatura_recibida),
          humedad_recibida: numero(detalle.humedad_recibida),
          cumple: detalle.cumple,
          motivo_rechazo: detalle.motivo_rechazo || null,
          observaciones: detalle.observaciones || null,
        })),
    };
  }

  function payloadDespacho(form: DespachoForm): DespachoRecursoPayload {
    return {
      numero_despacho: null,
      responsable_entrega_id: form.responsable_entrega_id ? Number(form.responsable_entrega_id) : null,
      paciente_nombre: form.paciente_nombre || null,
      paciente_documento: form.paciente_documento || null,
      paciente_telefono: form.paciente_telefono || null,
      paciente_email: form.paciente_email || null,
      direccion_entrega: form.direccion_entrega || null,
      ciudad_entrega: form.ciudad_entrega || null,
      fecha_programada: form.fecha_programada || null,
      estado: form.estado,
      observaciones: form.observaciones || null,
      detalles: form.detalles
        .filter((detalle) => detalle.inventario_lote_id)
        .map((detalle) => ({
          recurso_id: Number(detalle.recurso_id),
          inventario_lote_id: Number(detalle.inventario_lote_id),
          cantidad: numero(detalle.cantidad) || 0,
          seleccion_manual: detalle.seleccion_manual,
          justificacion_seleccion_manual: detalle.justificacion_seleccion_manual || null,
          recomendaciones_almacenamiento: detalle.recomendaciones_almacenamiento || null,
          observaciones: detalle.observaciones || null,
        })),
    };
  }

  async function abrirEditarRecurso(recurso: RecursoAsistencial) {
    setAccion(`editar-recurso-${recurso.id}`);
    try {
      const data = await obtenerRecursoAsistencial(recurso.id);
      setRecursoForm(recursoAForm(data.recurso));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el recurso");
    } finally {
      setAccion("");
    }
  }

  async function guardarRecurso() {
    if (!recursoForm) return;
    if (!recursoForm.nombre.trim()) {
      setError("El nombre del recurso es obligatorio.");
      return;
    }
    if (!recursoForm.registro_sanitario.trim()) {
      setError("El registro sanitario es obligatorio para todos los recursos asistenciales.");
      return;
    }
    setAccion("guardar-recurso");
    setError("");
    setSuccess("");
    try {
      const previo = recursoForm.id ? await obtenerRecursoAsistencial(recursoForm.id) : null;
      const recursoId = recursoForm.id
        ? (await actualizarRecursoAsistencial(recursoForm.id, payloadRecurso(recursoForm)), recursoForm.id)
        : (await crearRecursoAsistencial(payloadRecurso(recursoForm))).recurso_id;

      const serviciosPrevios = new Set((previo?.recurso.servicios || []).map((item) => item.servicio_ips_id));
      const proveedoresPrevios = new Set((previo?.recurso.proveedores || []).map((item) => item.proveedor_id));

      for (const servicioId of recursoForm.servicios) {
        await asociarServicioRecurso(recursoId, { servicio_ips_id: servicioId, tipo_relacion: "relacionado", estado: "activo" });
        serviciosPrevios.delete(servicioId);
      }
      for (const servicioId of serviciosPrevios) await eliminarServicioDeRecurso(recursoId, servicioId);

      recursoForm.proveedores.forEach((proveedorId, index) => proveedoresPrevios.delete(proveedorId));
      for (const proveedorId of recursoForm.proveedores) {
        await asociarProveedorRecurso(recursoId, { proveedor_id: proveedorId, proveedor_preferido: proveedorId === recursoForm.proveedores[0], estado: "activo" });
      }
      for (const proveedorId of proveedoresPrevios) await eliminarProveedorDeRecurso(recursoId, proveedorId);

      if (recursoForm.ficha) {
        await subirFichaTecnicaRecurso(recursoId, recursoForm.ficha, {
          version: recursoForm.ficha_version,
          fecha_documento: recursoForm.ficha_fecha,
          observaciones: recursoForm.ficha_observaciones,
        });
      }

      setRecursoForm(null);
      setSuccess("Recurso guardado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el recurso");
    } finally {
      setAccion("");
    }
  }

  async function guardarProveedor() {
    if (!proveedorForm) return;
    if (!proveedorForm.nombre.trim()) {
      setError("El nombre del proveedor es obligatorio.");
      return;
    }
    setAccion("guardar-proveedor");
    setError("");
    setSuccess("");
    try {
      if (proveedorForm.id) await actualizarProveedorRecurso(proveedorForm.id, proveedorForm);
      else await crearProveedorRecurso(proveedorForm);
      setProveedorForm(null);
      setSuccess("Proveedor guardado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el proveedor");
    } finally {
      setAccion("");
    }
  }

  async function abrirEditarOrden(orden: OrdenCompraRecurso) {
    setAccion(`editar-orden-${orden.id}`);
    try {
      const data = await obtenerOrdenCompraRecurso(orden.id);
      setOrdenForm(ordenCompraAForm(data.orden));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar la orden de compra");
    } finally {
      setAccion("");
    }
  }

  async function guardarOrden() {
    if (!ordenForm) return;
    if (!ordenForm.proveedor_id) {
      setError("El proveedor es obligatorio.");
      return;
    }
    if (!ordenForm.detalles.some((detalle) => detalle.recurso_id && (numero(detalle.cantidad) || 0) > 0)) {
      setError("Agrega al menos un recurso con cantidad mayor a cero.");
      return;
    }
    setAccion("guardar-orden");
    setError("");
    setSuccess("");
    try {
      if (ordenForm.id) await actualizarOrdenCompraRecurso(ordenForm.id, payloadOrden(ordenForm));
      else await crearOrdenCompraRecurso(payloadOrden(ordenForm));
      setOrdenForm(null);
      setSuccess("Orden de compra guardada correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la orden de compra");
    } finally {
      setAccion("");
    }
  }

  async function abrirRecepcionDesdeOrden(orden: OrdenCompraRecurso) {
    if (!puedeRecibirOrden(orden)) {
      setError("La orden debe estar aprobada o parcialmente recibida antes de registrar recepción.");
      return;
    }
    setAccion(`recibir-orden-${orden.id}`);
    try {
      const data = await obtenerOrdenCompraRecurso(orden.id);
      if (!puedeRecibirOrden(data.orden)) {
        setError("La orden debe estar aprobada o parcialmente recibida antes de registrar recepción.");
        return;
      }
      setRecepcionForm(recepcionDesdeOrden(data.orden));
      setTab("recepcion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar la orden para recepción");
    } finally {
      setAccion("");
    }
  }

  async function abrirEditarRecepcion(recepcion: RecepcionRecurso) {
    setAccion(`editar-recepcion-${recepcion.id}`);
    try {
      const data = await obtenerRecepcionRecurso(recepcion.id);
      setRecepcionForm(recepcionAForm(data.recepcion));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar la recepción");
    } finally {
      setAccion("");
    }
  }

  async function guardarRecepcion() {
    if (!recepcionForm) return;
    if (!recepcionForm.orden_compra_id || !recepcionForm.proveedor_id) {
      setError("La orden de compra y el proveedor son obligatorios.");
      return;
    }
    if (!recepcionForm.detalles.some((detalle) => detalle.recurso_id && (numero(detalle.cantidad_recibida) || 0) > 0)) {
      setError("Agrega al menos un recurso recibido con cantidad mayor a cero.");
      return;
    }
    const excesoSinJustificar = recepcionForm.detalles.some((detalle) => {
      const cantidad = numero(detalle.cantidad_recibida) || 0;
      const pendiente = numero(detalle.cantidad_pendiente) || 0;
      return detalle.cumple && pendiente > 0 && cantidad > pendiente && (!detalle.permitir_exceso || !detalle.justificacion_exceso.trim());
    });
    if (excesoSinJustificar) {
      setError("Para recibir más de lo pendiente debes marcar permiso especial y escribir una justificación.");
      return;
    }
    setAccion("guardar-recepcion");
    setError("");
    setSuccess("");
    try {
      if (recepcionForm.id) await actualizarRecepcionRecurso(recepcionForm.id, payloadRecepcion(recepcionForm));
      else await crearRecepcionRecurso(payloadRecepcion(recepcionForm));
      setRecepcionForm(null);
      setSuccess("Recepción guardada correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la recepción");
    } finally {
      setAccion("");
    }
  }

  async function ingresarInventario(recepcion: RecepcionRecurso) {
    if (!window.confirm(`Ingresar la recepción ${texto(recepcion.numero_orden)} al inventario?`)) return;
    setAccion(`inventario-recepcion-${recepcion.id}`);
    setError("");
    setSuccess("");
    try {
      const data = await ingresarRecepcionAInventario(recepcion.id);
      setSuccess(`${data.mensaje}. Lotes creados: ${data.lotes_creados}. Omitidos: ${data.lotes_omitidos}.`);
      await cargar();
      setTab("inventario");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible ingresar la recepción a inventario");
    } finally {
      setAccion("");
    }
  }

  async function abrirEditarDespacho(despacho: DespachoRecurso) {
    if (!despachoPreparado(despacho)) {
      setError("Solo se pueden editar despachos en estado preparado.");
      return;
    }
    setAccion(`editar-despacho-${despacho.id}`);
    try {
      const data = await obtenerDespachoRecurso(despacho.id);
      setDespachoForm(despachoAForm(data.despacho));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el despacho");
    } finally {
      setAccion("");
    }
  }

  async function buscarPacientesExternos() {
    const termino = pacienteBusqueda.trim();
    setBuscandoPacientes(true);
    setError("");
    try {
      const data = await buscarPacientesIpsHealthcare({ busqueda: termino || undefined, limit: 50 });
      setPacientesExternos(data.pacientes || []);
      if (!(data.pacientes || []).length) setError("No se encontraron pacientes en ips_healthcare con esa búsqueda.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible consultar pacientes externos");
    } finally {
      setBuscandoPacientes(false);
    }
  }

  function seleccionarPacienteExterno(idExterno: string) {
    setPacienteSeleccionado(idExterno);
    const paciente = pacientesExternos.find((item) => item.id_externo === idExterno);
    if (!paciente) return;
    setDespachoForm((actual) => actual ? {
      ...actual,
      paciente_nombre: paciente.nombre || "",
      paciente_documento: paciente.documento || "",
      paciente_telefono: paciente.telefono || paciente.whatsapp || paciente.telefono_2 || paciente.telefono_emergencia || "",
      paciente_email: paciente.email || "",
      ciudad_entrega: paciente.ciudad || "",
      direccion_entrega: paciente.direccion || "",
      observaciones: [
        actual.observaciones,
        paciente.aseguradora ? `Aseguradora: ${paciente.aseguradora}` : "",
        paciente.estado_clinico ? `Estado clínico: ${paciente.estado_clinico}` : "",
        paciente.alertas_medicas ? `Alertas médicas: ${paciente.alertas_medicas}` : "",
      ].filter(Boolean).join("\n"),
    } : actual);
  }

  function cerrarDespachoForm() {
    setDespachoForm(null);
    setPacienteBusqueda("");
    setPacientesExternos([]);
    setPacienteSeleccionado("");
  }

  async function guardarDespacho() {
    if (!despachoForm) return;
    if (!despachoForm.responsable_entrega_id) {
      setError("Selecciona el responsable de ruta.");
      return;
    }
    if (!despachoForm.paciente_nombre.trim() || !despachoForm.direccion_entrega.trim()) {
      setError("El paciente y la dirección de entrega son obligatorios.");
      return;
    }
    if (!despachoForm.detalles.some((detalle) => detalle.inventario_lote_id && (numero(detalle.cantidad) || 0) > 0)) {
      setError("Agrega al menos un lote con cantidad mayor a cero.");
      return;
    }
    if (despachoForm.detalles.some((detalle) => detalle.seleccion_manual && !detalle.justificacion_seleccion_manual.trim())) {
      setError("Toda selección manual que se aparte de FEFO requiere justificación.");
      return;
    }
    setAccion("guardar-despacho");
    setError("");
    setSuccess("");
    try {
      if (despachoForm.id) await actualizarDespachoRecurso(despachoForm.id, payloadDespacho(despachoForm));
      else await crearDespachoRecurso(payloadDespacho(despachoForm));
      cerrarDespachoForm();
      setSuccess("Despacho guardado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el despacho");
    } finally {
      setAccion("");
    }
  }

  async function marcarSalidaDespacho(despacho: DespachoRecurso) {
    if (!despachoPreparado(despacho)) {
      setError("Solo se puede marcar salida de despachos en estado preparado.");
      return;
    }
    if (!window.confirm(`Marcar salida del despacho ${despacho.numero_despacho}? Se descontará inventario.`)) return;
    setAccion(`salida-despacho-${despacho.id}`);
    setError("");
    setSuccess("");
    try {
      const data = await marcarSalidaDespachoRecurso(despacho.id);
      setSuccess(data.mensaje);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible marcar la salida del despacho");
    } finally {
      setAccion("");
    }
  }

  async function cancelarDespacho(despacho: DespachoRecurso) {
    if (!despachoPreparado(despacho)) {
      setError("Solo se pueden cancelar despachos en estado preparado.");
      return;
    }
    if (!window.confirm(`Cancelar el despacho ${despacho.numero_despacho}?`)) return;
    setAccion(`cancelar-despacho-${despacho.id}`);
    setError("");
    setSuccess("");
    try {
      await cancelarDespachoRecurso(despacho.id);
      setSuccess("Despacho cancelado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cancelar el despacho");
    } finally {
      setAccion("");
    }
  }

  async function descargarActaDespacho(despacho: DespachoRecurso) {
    setAccion(`acta-despacho-${despacho.id}`);
    setError("");
    try {
      await downloadBlob(`/despachos-recursos/${despacho.id}/acta`, `acta_${despacho.numero_despacho}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar el acta");
    } finally {
      setAccion("");
    }
  }

  async function cargarHistorialEntregas() {
    setAccion("historial-entregas");
    setError("");
    try {
      const data = await listarHistorialEntregasRecursos({
        paciente_documento: historialPaciente || undefined,
        responsable_entrega_id: historialProfesional || undefined,
      });
      setHistorialEntregas(data.despachos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el historial de entregas");
    } finally {
      setAccion("");
    }
  }

  async function descargarListadoDespachosProfesional() {
    if (!listadoProfesional) {
      setError("Selecciona un profesional para descargar sus entregas abiertas.");
      return;
    }
    setAccion("listado-despachos-profesional");
    setError("");
    try {
      await descargarDespachosProfesional(listadoProfesional);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar el listado de entregas abiertas");
    } finally {
      setAccion("");
    }
  }

  async function guardarReintentoDespacho() {
    if (!reintentoForm) return;
    if (!reintentoForm.fecha_programada) {
      setError("Selecciona la fecha del reintento.");
      return;
    }
    setAccion(`reintento-despacho-${reintentoForm.despacho.id}`);
    setError("");
    setSuccess("");
    try {
      await programarReintentoDespachoRecurso(reintentoForm.despacho.id, {
        fecha_programada: reintentoForm.fecha_programada,
        observaciones: reintentoForm.observaciones || null,
      });
      setReintentoForm(null);
      setSuccess("Reintento programado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible programar el reintento");
    } finally {
      setAccion("");
    }
  }

  async function guardarDevolucionDespacho() {
    if (!devolucionDespachoForm) return;
    if (!devolucionDespachoForm.motivo.trim()) {
      setError("El motivo de devolución es obligatorio.");
      return;
    }
    setAccion(`devolver-despacho-${devolucionDespachoForm.despacho.id}`);
    setError("");
    setSuccess("");
    try {
      await devolverDespachoInventarioRecurso(devolucionDespachoForm.despacho.id, {
        apto_reintegro: devolucionDespachoForm.apto_reintegro,
        motivo: devolucionDespachoForm.motivo.trim(),
      });
      setDevolucionDespachoForm(null);
      setSuccess(devolucionDespachoForm.apto_reintegro ? "Productos reintegrados al inventario." : "Devolución registrada sin reintegrar existencias.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible devolver el despacho");
    } finally {
      setAccion("");
    }
  }

  async function inactivarRecurso(recurso: RecursoAsistencial) {
    if (!window.confirm(`Inactivar ${recurso.nombre}?`)) return;
    setAccion(`inactivar-recurso-${recurso.id}`);
    try {
      await eliminarRecursoAsistencial(recurso.id);
      setSuccess("Recurso inactivado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible inactivar el recurso");
    } finally {
      setAccion("");
    }
  }

  async function inactivarProveedor(proveedor: ProveedorRecurso) {
    if (!window.confirm(`Inactivar ${proveedor.nombre}?`)) return;
    setAccion(`inactivar-proveedor-${proveedor.id}`);
    try {
      await eliminarProveedorRecurso(proveedor.id);
      setSuccess("Proveedor inactivado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible inactivar el proveedor");
    } finally {
      setAccion("");
    }
  }

  async function cancelarOrden(orden: OrdenCompraRecurso) {
    if (!window.confirm(`Cancelar la orden ${orden.numero_orden}?`)) return;
    setAccion(`cancelar-orden-${orden.id}`);
    try {
      await eliminarOrdenCompraRecurso(orden.id);
      setSuccess("Orden de compra cancelada correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cancelar la orden");
    } finally {
      setAccion("");
    }
  }

  async function aprobarOrden(orden: OrdenCompraRecurso) {
    if (!puedeAprobarOrden(orden)) return;
    setAccion(`aprobar-orden-${orden.id}`);
    setError("");
    setSuccess("");
    try {
      await aprobarOrdenCompraRecurso(orden.id);
      setSuccess("Orden aprobada correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible aprobar la orden");
    } finally {
      setAccion("");
    }
  }

  async function crearSolicitudDesdeReorden(alerta: AlertaDetalle) {
    if (!alerta.recurso_id) return;
    setAccion(`solicitud-reorden-${alerta.recurso_id}`);
    setError("");
    setSuccess("");
    try {
      await crearSolicitudCompraReorden({
        recurso_id: alerta.recurso_id,
        cantidad: alerta.cantidad_sugerida || 1,
        observaciones: `Solicitud generada desde alerta de punto de reorden. ${alerta.detalle}`,
      });
      setAlertaActiva(null);
      setTab("compras");
      setSuccess("Solicitud de compra creada desde la alerta de reorden.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la solicitud de compra");
    } finally {
      setAccion("");
    }
  }

  return (
    <section className="page recursos-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Medicamentos, insumos y reactivos</span>
          <h1>Recursos Asistenciales</h1>
          <p>Catálogo base de medicamentos, dispositivos médicos, insumos, reactivos, proveedores y relación con servicios IPS.</p>
        </div>
        <div className="infra-header-actions recursos-header-actions">
          <button className="secondary-btn" type="button" onClick={cargar} disabled={loading}>
            Actualizar
          </button>
          {puedeComprar && <button className="brand-action-btn" type="button" onClick={() => setRecursoForm(inicialRecurso())}>
            <Plus size={17} /> Nuevo recurso
          </button>}
        </div>
      </header>

      <div className="kpi-grid four">
        <MiniKpi icon={<Boxes size={18} />} label="Total recursos" value={kpis.total} />
        <MiniKpi icon={<FlaskConical size={18} />} label="Medicamentos" value={kpis.medicamentos} />
        <MiniKpi icon={<Snowflake size={18} />} label="Cadena de frio" value={kpis.cadenaFrio} tone="info" />
        <MiniKpi icon={<AlertTriangle size={18} />} label="LASA" value={kpis.lasa} tone="warning" />
      </div>

      <section className="recursos-alert-panel">
        <div className="recursos-alert-heading">
          <div>
            <span className="eyebrow">Control operativo</span>
            <h2>Alertas prioritarias</h2>
          </div>
          <span>Selecciona una alerta para ver el detalle.</span>
        </div>
        <div className="recursos-alert-grid">
          {configuracionAlertas.map((alerta) => {
            const total = alertasRecursos[alerta.key].length;
            return (
              <button
                className={`recursos-alert-item ${alerta.tono} ${total ? "has-alerts" : ""}`}
                type="button"
                key={alerta.key}
                onClick={() => setAlertaActiva(alerta.key)}
              >
                <AlertTriangle size={18} />
                <span><strong>{alerta.label}</strong><small>{alerta.ayuda}</small></span>
                <b>{total}</b>
              </button>
            );
          })}
        </div>
      </section>

      <div className="tabs recursos-tabs">
        {tabsVisibles.map((item) => (
          <button key={item} className={tab === item ? "active" : ""} type="button" onClick={() => setTab(item)}>
            {labelTabRecursos(item)}
          </button>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}
      {loading && <Loading text="Cargando recursos asistenciales..." />}

      {!loading && tab === "catalogo" && (
        <>
          <div className="toolbar">
            <label className="search-field">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar recurso, código, registro sanitario o proveedor" />
            </label>
            <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
              <option value="">Todos los tipos</option>
              {TIPOS_RECURSO.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select value={estado} onChange={(event) => setEstado(event.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_RECURSO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={servicioFiltro} onChange={(event) => setServicioFiltro(event.target.value)}>
              <option value="">Todos los servicios</option>
              {servicios.map((servicio) => (
                <option key={servicio.id} value={`${servicio.codigo} - ${servicio.nombre}`}>
                  {servicio.codigo} - {servicio.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="recursos-list-head recursos-list-head-main" aria-hidden="true">
            <span>Recurso</span>
            <span>Estado y alertas</span>
            <span>Información relacionada</span>
            <span>Acciones</span>
          </div>
          <div className="recursos-grid recursos-desktop-list">
            {recursosFiltrados.map((recurso) => (
              <article className="recurso-card" key={recurso.id}>
                <div className="recurso-card-head">
                  <div className="recurso-icon">
                    <PackagePlus size={19} />
                  </div>
                  <div>
                    <strong>{recurso.nombre}</strong>
                    <span>{texto(recurso.codigo)} · {labelTipo(recurso.tipo_recurso)}</span>
                  </div>
                </div>
                <div className="meta-row">
                  <span className={`pill ${recurso.estado}`}>{recurso.estado}</span>
                  {bool(recurso.requiere_cadena_frio) && <span className="tag cold">Cadena de frio</span>}
                  {bool(recurso.es_lasa) && <span className="tag lasa">LASA</span>}
                  {bool(recurso.alto_riesgo) && <span className="tag warning">Medicamento controlado</span>}
                </div>
                <dl className="recurso-dl">
                  <div><dt>Servicios</dt><dd>{texto(recurso.servicios_resumen)}</dd></div>
                  <div><dt>Proveedor principal</dt><dd>{texto(recurso.proveedor_principal || recurso.proveedores_resumen)}</dd></div>
                  <div><dt>Registro sanitario</dt><dd>{texto(recurso.registro_sanitario)}</dd></div>
                  <div><dt>Stock mín / máx</dt><dd>{texto(recurso.stock_minimo)} / {texto(recurso.stock_maximo)}</dd></div>
                </dl>
                {puedeComprar && (
                  <div className="recursos-actions">
                    <button type="button" onClick={() => abrirEditarRecurso(recurso)} disabled={accion === `editar-recurso-${recurso.id}`}>
                      <Pencil size={15} /> Editar
                    </button>
                    <button className="danger" type="button" onClick={() => inactivarRecurso(recurso)} disabled={accion === `inactivar-recurso-${recurso.id}`}>
                      <Trash2 size={15} /> Inactivar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {!recursosFiltrados.length && <div className="empty-state">No hay recursos para los filtros seleccionados.</div>}
        </>
      )}

      {!loading && tab === "proveedores" && (
        <section className="table-card">
          <div className="section-heading inline-heading">
            <div>
              <h2>Proveedores</h2>
              <p>Aliados para compra y suministro de recursos asistenciales.</p>
            </div>
            {puedeComprar && <button className="primary-btn" type="button" onClick={() => setProveedorForm(inicialProveedor())}>
              <Plus size={16} /> Nuevo proveedor
            </button>}
          </div>
          <div className="recursos-list-head recursos-list-head-provider" aria-hidden="true">
            <span>Proveedor</span>
            <span>NIT</span>
            <span>Contacto</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          <div className="recursos-provider-grid recursos-provider-list">
            {proveedores.map((proveedor) => (
              <article className="proveedor-card" key={proveedor.id}>
                <strong>{proveedor.nombre}</strong>
                <span>NIT: {texto(proveedor.nit)}</span>
                <span>{texto(proveedor.telefono)} · {texto(proveedor.correo)}</span>
                <span className={`pill ${proveedor.estado}`}>{proveedor.estado}</span>
                {puedeComprar && (
                  <div className="recursos-actions">
                    <button type="button" onClick={() => setProveedorForm(proveedorAForm(proveedor))}>
                      <Pencil size={15} /> Editar
                    </button>
                    <button className="danger" type="button" onClick={() => inactivarProveedor(proveedor)}>
                      <Trash2 size={15} /> Inactivar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && tab === "compras" && (
        <section className="table-card compras-card">
          <div className="section-heading inline-heading">
            <div>
              <h2>Órdenes de compra</h2>
              <p>Adquisición de medicamentos, dispositivos médicos, insumos y reactivos desde proveedores registrados.</p>
            </div>
            {puedeComprar && <button className="primary-btn" type="button" onClick={() => setOrdenForm(inicialOrdenCompra())}>
              <Plus size={16} /> Nueva orden
            </button>}
          </div>

          <div className="toolbar compras-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input value={compraQuery} onChange={(event) => setCompraQuery(event.target.value)} placeholder="Buscar orden, proveedor o factura" />
            </label>
            <select value={compraEstado} onChange={(event) => setCompraEstado(event.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_ORDEN_COMPRA.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="recursos-list-head recursos-list-head-main" aria-hidden="true">
            <span>Orden y proveedor</span>
            <span>Estado</span>
            <span>Información de compra</span>
            <span>Acciones</span>
          </div>
          <div className="ordenes-grid recursos-desktop-list">
            {ordenesFiltradas.map((orden) => (
              <article className="orden-card" key={orden.id}>
                <div className="orden-card-head">
                  <div className="recurso-icon">
                    <Truck size={19} />
                  </div>
                  <div>
                    <strong>{orden.numero_orden}</strong>
                    <span>{texto(orden.proveedor_nombre)}{orden.proveedor_nit ? ` · ${orden.proveedor_nit}` : ""}</span>
                  </div>
                </div>
                <div className="meta-row">
                  <span className={`pill ${orden.estado}`}>{orden.estado}</span>
                  <span className="tag">{texto(orden.items)} ítems</span>
                </div>
                <dl className="recurso-dl">
                  <div><dt>Fecha orden</dt><dd>{texto(orden.fecha_orden)}</dd></div>
                  <div><dt>Entrega estimada</dt><dd>{texto(orden.fecha_estimada_entrega)}</dd></div>
                  <div><dt>Solicitado</dt><dd>{texto(orden.cantidad_solicitada_total)}</dd></div>
                  <div><dt>Recibido / pendiente</dt><dd>{texto(orden.cantidad_recibida_total)} / {texto(orden.cantidad_pendiente_total)}</dd></div>
                  <div><dt>Factura</dt><dd>{texto(orden.factura_numero)}</dd></div>
                  <div><dt>Total</dt><dd>{dinero(orden.total)}</dd></div>
                </dl>
                <div className="recursos-actions">
                  {puedeAprobarCompras && puedeAprobarOrden(orden) && (
                    <button type="button" onClick={() => aprobarOrden(orden)} disabled={accion === `aprobar-orden-${orden.id}`}>
                      <Save size={15} /> Aprobar
                    </button>
                  )}
                  {puedeRecibirCompras && <button type="button" onClick={() => abrirRecepcionDesdeOrden(orden)} disabled={accion === `recibir-orden-${orden.id}` || !puedeRecibirOrden(orden)}>
                    <ClipboardList size={15} /> Recibir
                  </button>}
                  {puedeComprar && <button type="button" onClick={() => abrirEditarOrden(orden)} disabled={accion === `editar-orden-${orden.id}` || ["cerrada", "cancelada"].includes(estadoNormalizado(orden.estado))}>
                    <Pencil size={15} /> Editar
                  </button>}
                  {puedeComprar && <button className="danger" type="button" onClick={() => cancelarOrden(orden)} disabled={accion === `cancelar-orden-${orden.id}` || orden.estado === "cancelada"}>
                    <Trash2 size={15} /> Cancelar
                  </button>}
                </div>
              </article>
            ))}
          </div>
          {!ordenesFiltradas.length && <div className="empty-state">No hay órdenes de compra para los filtros seleccionados.</div>}
        </section>
      )}

      {!loading && tab === "recepcion" && (
        <section className="table-card compras-card">
          <div className="section-heading inline-heading">
            <div>
              <h2>Recepción técnica y administrativa</h2>
              <p>Valida cantidad, lote, vencimiento, empaque, registro sanitario y condiciones de transporte.</p>
            </div>
            <button className="primary-btn" type="button" onClick={() => setTab("compras")}>
              <Truck size={16} /> Ir a compras
            </button>
          </div>

          <div className="toolbar compras-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input value={recepcionQuery} onChange={(event) => setRecepcionQuery(event.target.value)} placeholder="Buscar orden o proveedor" />
            </label>
            <select value={recepcionEstado} onChange={(event) => setRecepcionEstado(event.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_RECEPCION.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="recursos-list-head recursos-list-head-main" aria-hidden="true">
            <span>Orden y proveedor</span>
            <span>Estado</span>
            <span>Información de recepción</span>
            <span>Acciones</span>
          </div>
          <div className="ordenes-grid recursos-desktop-list">
            {recepcionesFiltradas.map((recepcion) => (
              <article className="orden-card" key={recepcion.id}>
                <div className="orden-card-head">
                  <div className="recurso-icon">
                    <ClipboardList size={19} />
                  </div>
                  <div>
                    <strong>{texto(recepcion.numero_orden)}</strong>
                    <span>{texto(recepcion.proveedor_nombre)}{recepcion.proveedor_nit ? ` · ${recepcion.proveedor_nit}` : ""}</span>
                  </div>
                </div>
                <div className="meta-row">
                  <span className={`pill ${recepcion.estado}`}>{recepcion.estado}</span>
                  <span className="tag">{texto(recepcion.tipo_recepcion)}</span>
                </div>
                <dl className="recurso-dl">
                  <div><dt>Fecha recepción</dt><dd>{texto(recepcion.fecha_recepcion)}</dd></div>
                  <div><dt>Ítems</dt><dd>{texto(recepcion.items)}</dd></div>
                  <div><dt>Proveedor</dt><dd>{texto(recepcion.proveedor_nombre)}</dd></div>
                  <div><dt>Observaciones</dt><dd>{texto(recepcion.observaciones)}</dd></div>
                </dl>
                <div className="recursos-actions">
                  {puedeRecibirCompras && <button type="button" onClick={() => ingresarInventario(recepcion)} disabled={accion === `inventario-recepcion-${recepcion.id}` || !["aprobada", "parcial"].includes(String(recepcion.estado))}>
                    <Boxes size={15} /> Inventario
                  </button>}
                  {puedeRecibirCompras && <button type="button" onClick={() => abrirEditarRecepcion(recepcion)} disabled={accion === `editar-recepcion-${recepcion.id}`}>
                    <Pencil size={15} /> Editar
                  </button>}
                </div>
              </article>
            ))}
          </div>
          {!recepcionesFiltradas.length && <div className="empty-state">No hay recepciones registradas todavía. Inicia desde una orden de compra.</div>}
        </section>
      )}

      {!loading && tab === "inventario" && (
        <section className="table-card compras-card">
          <div className="section-heading inline-heading">
            <div>
              <h2>Inventario por lote</h2>
              <p>Existencias creadas desde recepciones aprobadas, con lote, vencimiento, ubicación y trazabilidad de movimientos.</p>
            </div>
            <button className="secondary-btn" type="button" onClick={cargar} disabled={loading}>
              Actualizar
            </button>
          </div>

          <div className="toolbar compras-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input value={inventarioQuery} onChange={(event) => setInventarioQuery(event.target.value)} placeholder="Buscar lote, recurso u orden" />
            </label>
            <select value={inventarioEstado} onChange={(event) => setInventarioEstado(event.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_LOTE.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="recursos-list-head recursos-list-head-inventory" aria-hidden="true">
            <span>Recurso y lote</span>
            <span>Estado</span>
            <span>Existencias y trazabilidad</span>
            <span>Acciones</span>
          </div>
          <div className="ordenes-grid recursos-desktop-list recursos-inventory-list">
            {lotesFiltrados.map((lote) => {
              const fefo = prioridadFefo(lote);
              return (
              <article className="orden-card" key={lote.id}>
                <div className="orden-card-head">
                  <div className="recurso-icon">
                    <Boxes size={19} />
                  </div>
                  <div>
                    <strong>{texto(lote.recurso_nombre)}</strong>
                    <span>{texto(lote.recurso_codigo)} · Lote {texto(lote.lote)}</span>
                  </div>
                </div>
                <div className="meta-row">
                  <span className={`pill ${lote.estado}`}>{lote.estado}</span>
                  {fefo.prioridad && <span className="tag fefo">FEFO #{fefo.prioridad} de {fefo.total}</span>}
                  {bool(lote.requiere_cadena_frio) && <span className="tag cold">Cadena de frio</span>}
                </div>
                <dl className="recurso-dl">
                  <div><dt>Cantidad actual</dt><dd>{texto(lote.cantidad_actual)}</dd></div>
                  <div><dt>Disponible despacho</dt><dd>{texto(lote.cantidad_disponible_despacho ?? lote.cantidad_actual)}</dd></div>
                  <div><dt>Vencimiento</dt><dd>{texto(lote.fecha_vencimiento)}</dd></div>
                  <div><dt>Ubicación</dt><dd>{texto(lote.ubicacion)}</dd></div>
                  <div><dt>Orden origen</dt><dd>{texto(lote.numero_orden)}</dd></div>
                </dl>
                <div className="recursos-actions">
                  <button type="button" onClick={() => abrirMovimientosLote(lote)}>
                    <ClipboardList size={15} /> Ver movimientos
                  </button>
                  {(puedeAjustarInventario || puedeDarBajaInventario) && <details className="lote-options">
                    <summary><MoreVertical size={15} /> Opciones</summary>
                    <div className="lote-options-menu">
                      {puedeAjustarInventario && <button type="button" onClick={(event) => abrirOperacionLote(lote, "ajuste", event.currentTarget)}>Ajustar existencias</button>}
                      {puedeAjustarInventario && lote.estado !== "bloqueado" && (
                        <button type="button" onClick={(event) => abrirOperacionLote(lote, "estado", event.currentTarget)}>Bloquear o poner en cuarentena</button>
                      )}
                      {puedeAjustarInventario && (lote.estado === "bloqueado" || lote.estado === "cuarentena") && (
                        <button type="button" onClick={(event) => abrirOperacionLote(lote, "estado", event.currentTarget)}>Desbloquear lote</button>
                      )}
                      {puedeAjustarInventario && <button type="button" onClick={(event) => abrirOperacionLote(lote, "traslado", event.currentTarget)}>Trasladar</button>}
                      {puedeAjustarInventario && <button type="button" onClick={(event) => abrirOperacionLote(lote, "devolucion", event.currentTarget)}>Registrar devolución</button>}
                      {puedeDarBajaInventario && <button className="danger" type="button" onClick={(event) => abrirOperacionLote(lote, "baja", event.currentTarget)}>Dar de baja</button>}
                    </div>
                  </details>}
                </div>
              </article>
              );
            })}
          </div>
          {!lotesFiltrados.length && <div className="empty-state">No hay lotes de inventario para los filtros seleccionados.</div>}

          <div className="section-heading inventory-subheading">
            <div>
              <h2>Movimientos recientes</h2>
              <p>Entradas, salidas, ajustes, bajas, devoluciones, bloqueos y traslados con trazabilidad por lote.</p>
            </div>
          </div>
          <div className="recursos-list-head recursos-list-head-movement" aria-hidden="true">
            <span>Recurso</span>
            <span>Lote</span>
            <span>Movimiento</span>
            <span>Saldo</span>
            <span>Fecha</span>
          </div>
          <div className="recursos-provider-grid recursos-movement-list">
            {movimientosInventario.slice(0, 8).map((movimiento) => (
              <article className="proveedor-card" key={movimiento.id}>
                <strong>{texto(movimiento.recurso_nombre)}</strong>
                <span>{texto(movimiento.recurso_codigo)} · Lote {texto(movimiento.lote)}</span>
                <span>{movimiento.tipo_movimiento}: {texto(movimiento.cantidad)} unidades</span>
                <span>Saldo: {texto(movimiento.saldo_anterior)} → {texto(movimiento.saldo_nuevo)}</span>
                <span>{texto(movimiento.created_at)}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && tab === "distribucion" && (
        <section className="table-card compras-card">
          <div className="section-heading inline-heading">
            <div>
              <h2>Distribución domiciliaria</h2>
              <p>Entrega interna al responsable de ruta y salida de inventario hacia domicilio del paciente.</p>
            </div>
            {puedeDespachar && <button className="primary-btn" type="button" onClick={() => setDespachoForm(inicialDespacho())}>
              <Plus size={16} /> Nuevo despacho
            </button>}
          </div>

          <div className="toolbar compras-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input value={despachoQuery} onChange={(event) => setDespachoQuery(event.target.value)} placeholder="Buscar despacho, paciente o responsable" />
            </label>
            <select value={despachoEstado} onChange={(event) => setDespachoEstado(event.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_DESPACHO.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="recursos-history-panel recursos-route-panel">
            <div>
              <h3>Listado de ruta del profesional</h3>
              <p>Descarga las entregas abiertas que el profesional todavía debe gestionar.</p>
            </div>
            <select value={listadoProfesional} onChange={(event) => setListadoProfesional(event.target.value)}>
              <option value="">Seleccionar profesional</option>
              {profesionalesConEntregas.map((profesional) => (
                <option key={profesional.id} value={profesional.id}>
                  {profesional.nombre} · {profesional.entregas_abiertas || 0} abiertas
                </option>
              ))}
            </select>
            <button className="secondary-btn" type="button" onClick={descargarListadoDespachosProfesional} disabled={!listadoProfesional || accion === "listado-despachos-profesional"}>
              <FileDown size={15} /> Descargar entregas abiertas
            </button>
          </div>

          <div className="recursos-list-head recursos-list-head-main" aria-hidden="true">
            <span>Despacho y destinatario</span>
            <span>Estado</span>
            <span>Información de entrega</span>
            <span>Acciones</span>
          </div>
          <div className="ordenes-grid recursos-desktop-list">
            {despachosFiltrados.map((despacho) => (
              <article className="orden-card" key={despacho.id}>
                <div className="orden-card-head">
                  <div className="recurso-icon">
                    <Truck size={19} />
                  </div>
                  <div>
                    <strong>{despacho.numero_despacho}</strong>
                    <span>{texto(despacho.paciente_nombre)} · {texto(despacho.responsable_nombre)}</span>
                  </div>
                </div>
                <div className="meta-row">
                  <span className={`pill ${despacho.estado}`}>{despacho.estado}</span>
                  <span className="tag">{texto(despacho.items)} ítems</span>
                </div>
                <dl className="recurso-dl">
                  <div><dt>Fecha programada</dt><dd>{texto(despacho.fecha_programada)}</dd></div>
                  <div><dt>Salida</dt><dd>{texto(despacho.fecha_salida)}</dd></div>
                  <div><dt>Documento paciente</dt><dd>{texto(despacho.paciente_documento)}</dd></div>
                  <div><dt>Dirección</dt><dd>{texto(despacho.direccion_entrega)}</dd></div>
                  <div><dt>Reintentos</dt><dd>{texto(despacho.reintentos)}</dd></div>
                  <div><dt>Última falla</dt><dd>{texto(despacho.motivo_entrega_fallida)}</dd></div>
                </dl>
                <div className="recursos-actions">
                  {puedeDespachar && estadoNormalizado(despacho.estado) === "preparado" && <button type="button" onClick={() => marcarSalidaDespacho(despacho)} disabled={accion === `salida-despacho-${despacho.id}`}>
                    <Truck size={15} /> Marcar salida
                  </button>}
                  {puedeDespachar && estadoNormalizado(despacho.estado) === "fallido" && <button type="button" onClick={() => setReintentoForm({ despacho, fecha_programada: despacho.fecha_reintento ? String(despacho.fecha_reintento).slice(0, 16) : "", observaciones: "" })}>
                    <Truck size={15} /> Reintentar
                  </button>}
                  {puedeDespachar && ["en_camino", "fallido"].includes(estadoNormalizado(despacho.estado)) && !bool(despacho.devuelto_inventario) && <button type="button" onClick={() => setDevolucionDespachoForm({ despacho, apto_reintegro: true, motivo: "" })}>
                    <Boxes size={15} /> Devolver
                  </button>}
                  {["entregado", "fallido", "devuelto"].includes(estadoNormalizado(despacho.estado)) && <button type="button" onClick={() => descargarActaDespacho(despacho)} disabled={accion === `acta-despacho-${despacho.id}`}>
                    <ClipboardList size={15} /> Acta
                  </button>}
                  {puedeDespachar && despachoPreparado(despacho) && (
                    <>
                      <button type="button" onClick={() => abrirEditarDespacho(despacho)} disabled={accion === `editar-despacho-${despacho.id}`}>
                        <Pencil size={15} /> Editar
                      </button>
                      <button className="danger" type="button" onClick={() => cancelarDespacho(despacho)} disabled={accion === `cancelar-despacho-${despacho.id}`}>
                        <Trash2 size={15} /> Cancelar
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!despachosFiltrados.length && <div className="empty-state">No hay despachos para los filtros seleccionados.</div>}
          <div className="recursos-history-panel">
            <div>
              <h3>Historial de entregas</h3>
              <p>Consulta entregas por paciente o profesional sin mezclarlo con el flujo operativo.</p>
            </div>
            <input value={historialPaciente} onChange={(event) => setHistorialPaciente(event.target.value)} placeholder="Documento paciente" />
            <select value={historialProfesional} onChange={(event) => setHistorialProfesional(event.target.value)}>
              <option value="">Todos los profesionales</option>
              {profesionales.map((profesional) => <option key={profesional.id} value={profesional.id}>{profesional.nombre}</option>)}
            </select>
            <button className="secondary-btn" type="button" onClick={cargarHistorialEntregas} disabled={accion === "historial-entregas"}>
              <History size={15} /> Consultar historial
            </button>
          </div>
          {historialEntregas.length > 0 && (
            <div className="recursos-history-results">
              {historialEntregas.map((item) => (
                <article key={`historial-${item.id}`}>
                  <strong>{item.numero_despacho} · {texto(item.estado)}</strong>
                  <span>{texto(item.paciente_nombre)} · {texto(item.responsable_nombre)}</span>
                  <small>Entrega: {texto(item.fecha_entrega)} · Falla: {texto(item.fecha_fallida)}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && tab === "auditoria" && puedeConsultarAuditoria && (
        <section className="table-card compras-card auditoria-card">
          <div className="section-heading inline-heading">
            <div>
              <h2>Auditoría de recursos</h2>
              <p>Historial consolidado de cambios administrativos, entradas, salidas y entregas.</p>
            </div>
            <div className="infra-inline-actions">
              <button className="secondary-btn" type="button" onClick={exportarAuditoria} disabled={!auditoriaFiltrada.length}>
                Exportar CSV
              </button>
              <button className="secondary-btn" type="button" onClick={cargar} disabled={loading}>
                Actualizar
              </button>
            </div>
          </div>

          <div className="auditoria-summary">
            <div><span>Eventos visibles</span><strong>{auditoriaFiltrada.length}</strong></div>
            <div><span>Operaciones registradas</span><strong>{auditoria.filter((evento) => evento.fuente === "auditoria").length}</strong></div>
            <div><span>Movimientos históricos</span><strong>{auditoria.filter((evento) => evento.fuente === "movimiento_inventario").length}</strong></div>
          </div>

          <div className="toolbar auditoria-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input
                value={auditoriaQuery}
                onChange={(event) => setAuditoriaQuery(event.target.value)}
                placeholder="Buscar referencia, recurso, lote o usuario"
              />
            </label>
            <select value={auditoriaModulo} onChange={(event) => setAuditoriaModulo(event.target.value)}>
              <option value="">Todos los módulos</option>
              {modulosAuditoria.map((item) => <option key={item} value={item}>{labelAuditoria(item)}</option>)}
            </select>
            <select value={auditoriaAccion} onChange={(event) => setAuditoriaAccion(event.target.value)}>
              <option value="">Todas las acciones</option>
              {accionesAuditoria.map((item) => <option key={item} value={item}>{labelAuditoria(item)}</option>)}
            </select>
            <select value={auditoriaUsuarioId} onChange={(event) => setAuditoriaUsuarioId(event.target.value)}>
              <option value="">Todos los usuarios</option>
              {usuariosAuditoria.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
            <select value={auditoriaRecursoId} onChange={(event) => setAuditoriaRecursoId(event.target.value)}>
              <option value="">Todos los recursos</option>
              {recursos.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
            </select>
            <select value={auditoriaLote} onChange={(event) => setAuditoriaLote(event.target.value)}>
              <option value="">Todos los lotes</option>
              {lotesAuditoria.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="auditoria-date-field">
              <span>Desde</span>
              <input type="date" value={auditoriaDesde} onChange={(event) => setAuditoriaDesde(event.target.value)} />
            </label>
            <label className="auditoria-date-field">
              <span>Hasta</span>
              <input type="date" value={auditoriaHasta} onChange={(event) => setAuditoriaHasta(event.target.value)} />
            </label>
          </div>

          <div className="recursos-list-head auditoria-list-head" aria-hidden="true">
            <span>Fecha y usuario</span>
            <span>Operación</span>
            <span>Referencia</span>
            <span>Cambio</span>
            <span>Detalle</span>
          </div>
          <div className="auditoria-list">
            {auditoriaFiltrada.map((evento) => (
              <article className="auditoria-item" key={evento.id}>
                <div className="auditoria-actor">
                  <span className="auditoria-icon"><History size={18} /></span>
                  <div>
                    <strong>{fechaHora(evento.created_at)}</strong>
                    <span>{texto(evento.usuario_nombre)}</span>
                  </div>
                </div>
                <div className="auditoria-operation">
                  <span className={`audit-action ${evento.accion}`}>{labelAuditoria(evento.accion)}</span>
                  <small>{labelAuditoria(evento.modulo)} · {labelAuditoria(evento.entidad)}</small>
                </div>
                <div className="auditoria-reference">
                  <strong>{texto(evento.referencia)}</strong>
                  <span>
                    {evento.recurso_nombre
                      ? `${texto(evento.recurso_codigo)} · ${texto(evento.recurso_nombre)}`
                      : evento.lote
                        ? `Lote ${evento.lote}`
                        : "Sin recurso asociado"}
                  </span>
                </div>
                <div className="auditoria-change">
                  {evento.estado_anterior || evento.estado_nuevo ? (
                    <span>{texto(evento.estado_anterior)} → <strong>{texto(evento.estado_nuevo)}</strong></span>
                  ) : (
                    <span>{texto(evento.observaciones) !== "-" ? texto(evento.observaciones) : "Datos operativos registrados"}</span>
                  )}
                  {evento.lote && <small>Lote {evento.lote}</small>}
                </div>
                <button className="audit-detail-btn" type="button" onClick={() => setAuditoriaDetalle(evento)}>
                  <Eye size={15} /> Ver detalle
                </button>
              </article>
            ))}
          </div>
          {!auditoriaFiltrada.length && <div className="empty-state">No hay eventos para los filtros seleccionados.</div>}
        </section>
      )}

      {!loading && tab === "reportes" && puedeConsultarAuditoria && (
        <section className="table-card compras-card reportes-card">
          <div className="section-heading inline-heading">
            <div>
              <h2>Reportes de recursos</h2>
              <p>Kardex, consumo, vencimientos, compras, rotación y cumplimiento de entregas.</p>
            </div>
            <button className="secondary-btn" type="button" onClick={cargarReportesFiltrados} disabled={accion === "cargar-reportes"}>
              Aplicar filtros
            </button>
          </div>

          <div className="toolbar auditoria-toolbar">
            <label className="auditoria-date-field">
              <span>Desde</span>
              <input type="date" value={reporteDesde} onChange={(event) => setReporteDesde(event.target.value)} />
            </label>
            <label className="auditoria-date-field">
              <span>Hasta</span>
              <input type="date" value={reporteHasta} onChange={(event) => setReporteHasta(event.target.value)} />
            </label>
            <select value={reporteRecursoId} onChange={(event) => setReporteRecursoId(event.target.value)}>
              <option value="">Todos los recursos</option>
              {recursos.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
            </select>
            <select value={reporteProveedorId} onChange={(event) => setReporteProveedorId(event.target.value)}>
              <option value="">Todos los proveedores</option>
              {proveedores.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
            <select value={reporteProfesionalId} onChange={(event) => setReporteProfesionalId(event.target.value)}>
              <option value="">Todos los profesionales</option>
              {profesionales.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </div>

          <div className="reportes-grid">
            <section className="reporte-panel">
              <div className="section-heading inline-heading">
                <div>
                  <h3>Kardex por producto y lote</h3>
                  <p>{reportes.kardex.length} registros</p>
                </div>
                <button className="secondary-btn" type="button" onClick={() => exportarCsv("kardex_recursos.csv", reportes.kardex)} disabled={!reportes.kardex.length}>CSV</button>
              </div>
              <div className="movimientos-table-wrap">
                <table className="movimientos-table">
                  <thead><tr><th>Recurso</th><th>Lote</th><th>Entradas</th><th>Salidas</th><th>Saldo</th></tr></thead>
                  <tbody>
                    {reportes.kardex.slice(0, 12).map((fila) => (
                      <tr key={`${fila.inventario_lote_id}-${fila.lote}`}>
                        <td>{texto(fila.recurso_codigo)} · {texto(fila.recurso_nombre)}</td>
                        <td>{texto(fila.lote)}<br /><small>{texto(fila.fecha_vencimiento)}</small></td>
                        <td>{texto(fila.entradas)}</td>
                        <td>{texto(fila.salidas)}</td>
                        <td>{texto(fila.saldo_actual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="reporte-panel">
              <div className="section-heading inline-heading">
                <div>
                  <h3>Consumo por recurso</h3>
                  <p>{reportes.consumo.length} registros</p>
                </div>
                <button className="secondary-btn" type="button" onClick={() => exportarCsv("consumo_recursos.csv", reportes.consumo)} disabled={!reportes.consumo.length}>CSV</button>
              </div>
              <div className="movimientos-table-wrap">
                <table className="movimientos-table">
                  <thead><tr><th>Recurso</th><th>Despachado</th><th>Devuelto</th><th>Lotes</th></tr></thead>
                  <tbody>
                    {reportes.consumo.slice(0, 12).map((fila) => (
                      <tr key={fila.recurso_id}>
                        <td>{texto(fila.recurso_codigo)} · {texto(fila.recurso_nombre)}</td>
                        <td>{texto(fila.cantidad_despachada)}</td>
                        <td>{texto(fila.cantidad_devuelta)}</td>
                        <td>{texto(fila.lotes_afectados)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="reporte-panel">
              <div className="section-heading inline-heading">
                <div>
                  <h3>Vencimientos, bajas y pérdidas</h3>
                  <p>{reportes.vencimientos_bajas.length} registros</p>
                </div>
                <button className="secondary-btn" type="button" onClick={() => exportarCsv("vencimientos_bajas_recursos.csv", reportes.vencimientos_bajas)} disabled={!reportes.vencimientos_bajas.length}>CSV</button>
              </div>
              <div className="movimientos-table-wrap">
                <table className="movimientos-table">
                  <thead><tr><th>Recurso</th><th>Lote</th><th>Vence</th><th>Estado</th><th>Baja</th></tr></thead>
                  <tbody>
                    {reportes.vencimientos_bajas.slice(0, 12).map((fila) => (
                      <tr key={`${fila.recurso_id}-${fila.lote}-${fila.fecha_vencimiento}`}>
                        <td>{texto(fila.recurso_codigo)} · {texto(fila.recurso_nombre)}</td>
                        <td>{texto(fila.lote)}</td>
                        <td>{texto(fila.fecha_vencimiento)}</td>
                        <td>{labelAuditoria(fila.estado_lote)}</td>
                        <td>{texto(fila.cantidad_baja)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="reporte-panel">
              <div className="section-heading inline-heading">
                <div>
                  <h3>Compras por proveedor</h3>
                  <p>{reportes.compras_por_proveedor.length} registros</p>
                </div>
                <button className="secondary-btn" type="button" onClick={() => exportarCsv("compras_por_proveedor.csv", reportes.compras_por_proveedor)} disabled={!reportes.compras_por_proveedor.length}>CSV</button>
              </div>
              <div className="movimientos-table-wrap">
                <table className="movimientos-table">
                  <thead><tr><th>Proveedor</th><th>Órdenes</th><th>Total</th><th>Solicitado</th><th>Recibido</th></tr></thead>
                  <tbody>
                    {reportes.compras_por_proveedor.slice(0, 12).map((fila) => (
                      <tr key={fila.proveedor_id}>
                        <td>{texto(fila.proveedor_nombre)}</td>
                        <td>{texto(fila.ordenes)}</td>
                        <td>{dinero(fila.total_comprado)}</td>
                        <td>{texto(fila.cantidad_solicitada)}</td>
                        <td>{texto(fila.cantidad_recibida)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="reporte-panel">
              <div className="section-heading inline-heading">
                <div>
                  <h3>Cumplimiento de entregas</h3>
                  <p>{reportes.cumplimiento_entregas.length} registros</p>
                </div>
                <button className="secondary-btn" type="button" onClick={() => exportarCsv("cumplimiento_entregas.csv", reportes.cumplimiento_entregas)} disabled={!reportes.cumplimiento_entregas.length}>CSV</button>
              </div>
              <div className="movimientos-table-wrap">
                <table className="movimientos-table">
                  <thead><tr><th>Profesional</th><th>Total</th><th>Entregadas</th><th>Fallidas</th><th>%</th></tr></thead>
                  <tbody>
                    {reportes.cumplimiento_entregas.slice(0, 12).map((fila) => (
                      <tr key={fila.responsable_entrega_id}>
                        <td>{texto(fila.responsable_nombre)}</td>
                        <td>{texto(fila.total_despachos)}</td>
                        <td>{texto(fila.entregados)}</td>
                        <td>{texto(fila.fallidos)}</td>
                        <td>{texto(fila.cumplimiento_porcentaje)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="reporte-panel">
              <div className="section-heading inline-heading">
                <div>
                  <h3>Rotación del inventario</h3>
                  <p>{reportes.rotacion.length} registros</p>
                </div>
                <button className="secondary-btn" type="button" onClick={() => exportarCsv("rotacion_inventario.csv", reportes.rotacion)} disabled={!reportes.rotacion.length}>CSV</button>
              </div>
              <div className="movimientos-table-wrap">
                <table className="movimientos-table">
                  <thead><tr><th>Recurso</th><th>Stock actual</th><th>Salidas</th><th>Índice</th></tr></thead>
                  <tbody>
                    {reportes.rotacion.slice(0, 12).map((fila) => (
                      <tr key={fila.recurso_id}>
                        <td>{texto(fila.recurso_codigo)} · {texto(fila.recurso_nombre)}</td>
                        <td>{texto(fila.stock_actual)}</td>
                        <td>{texto(fila.cantidad_salida)}</td>
                        <td>{texto(fila.indice_rotacion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      )}

      {!loading && tab === "invima" && puedeConsultarAuditoria && (
        <section className="table-card compras-card invima-card">
          <div className="section-heading inline-heading">
            <div>
              <h2>Alertas INVIMA</h2>
              <p>Coincidencias detectadas contra medicamentos, registros sanitarios, marcas, principios activos o lotes creados en Recursos Asistenciales.</p>
            </div>
            <button className="secondary-btn" type="button" onClick={cargarAlertasInvimaFiltradas} disabled={accion === "cargar-invima"}>
              Actualizar
            </button>
          </div>

          <div className="auditoria-summary invima-summary">
            <div><span>Alertas visibles</span><strong>{alertasInvima.length}</strong></div>
            <div><span>Última revisión</span><strong>{texto(estadoInvima.ultima_fecha_revisada)}</strong></div>
            <div><span>Revisadas en último monitoreo</span><strong>{texto(estadoInvima.total_revisadas)}</strong></div>
            <div><span>Coincidencias último monitoreo</span><strong>{texto(estadoInvima.total_coincidencias)}</strong></div>
          </div>

          {estadoInvima.error_ultima_ejecucion && (
            <div className="error-box">Último monitoreo INVIMA con error: {estadoInvima.error_ultima_ejecucion}</div>
          )}

          <div className="toolbar auditoria-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input
                value={invimaQuery}
                onChange={(event) => setInvimaQuery(event.target.value)}
                placeholder="Buscar alerta, coincidencia, registro sanitario o fragmento"
              />
            </label>
            <select value={invimaTipo} onChange={(event) => setInvimaTipo(event.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="Alerta sanitaria">Alerta sanitaria</option>
              <option value="Informe de seguridad">Informe de seguridad</option>
              <option value="Alerta INVIMA">Alerta INVIMA</option>
            </select>
            <label className="auditoria-date-field">
              <span>Desde</span>
              <input type="date" value={invimaDesde} onChange={(event) => setInvimaDesde(event.target.value)} />
            </label>
            <label className="auditoria-date-field">
              <span>Hasta</span>
              <input type="date" value={invimaHasta} onChange={(event) => setInvimaHasta(event.target.value)} />
            </label>
          </div>

          <div className="invima-alert-list">
            {alertasInvima.map((alerta) => (
              <article className="invima-alert-card" key={alerta.id || alerta.pdfUrl}>
                <div className="invima-alert-main">
                  <span className={`invima-type ${alerta.type === "Informe de seguridad" ? "security" : alerta.type === "Alerta sanitaria" ? "warning" : ""}`}>
                    {texto(alerta.type)}
                  </span>
                  <h3>{texto(alerta.title)}</h3>
                  <p>{texto(alerta.textSnippet)}</p>
                  <div className="invima-match-list">
                    {(alerta.matches || []).map((match) => <span key={`${alerta.id}-${match}`}>{match}</span>)}
                  </div>
                </div>
                <div className="invima-alert-side">
                  <span>{texto(alerta.date)}</span>
                  <small>Guardada: {fechaHora(alerta.createdAt)}</small>
                  <button className="secondary-btn" type="button" onClick={() => window.open(alerta.pdfUrl, "_blank", "noopener,noreferrer")}>
                    <Eye size={15} /> Ver PDF
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!alertasInvima.length && <div className="empty-state">No hay alertas INVIMA para los filtros seleccionados.</div>}
        </section>
      )}

      {!loading && !["catalogo", "proveedores", "compras", "recepcion", "inventario", "distribucion", "auditoria", "reportes", "invima"].includes(tab) && (
        <div className="standard-card recursos-placeholder">
          <ClipboardList size={22} />
          <div>
            <h2>{labelTabRecursos(tab)}</h2>
            <p>Esta pestaña queda preparada para fases posteriores del plan. La Fase 1 se concentra en catálogo, proveedores y relaciones.</p>
          </div>
        </div>
      )}

      {auditoriaDetalle && (
        <div className="modal-backdrop" onMouseDown={() => setAuditoriaDetalle(null)}>
          <div className="modal wide-modal recursos-modal auditoria-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>Detalle de auditoría</h2>
                <p>{fechaHora(auditoriaDetalle.created_at)} · {labelAuditoria(auditoriaDetalle.accion)}</p>
              </div>
              <button type="button" onClick={() => setAuditoriaDetalle(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="auditoria-modal-body">
              <dl className="auditoria-detail-grid">
                <div><dt>Módulo</dt><dd>{labelAuditoria(auditoriaDetalle.modulo)}</dd></div>
                <div><dt>Entidad</dt><dd>{labelAuditoria(auditoriaDetalle.entidad)}</dd></div>
                <div><dt>Referencia</dt><dd>{texto(auditoriaDetalle.referencia)}</dd></div>
                <div><dt>Usuario</dt><dd>{texto(auditoriaDetalle.usuario_nombre)}</dd></div>
                <div><dt>Recurso</dt><dd>{auditoriaDetalle.recurso_nombre ? `${texto(auditoriaDetalle.recurso_codigo)} · ${auditoriaDetalle.recurso_nombre}` : "-"}</dd></div>
                <div><dt>Lote</dt><dd>{texto(auditoriaDetalle.lote)}</dd></div>
                <div><dt>Estado anterior</dt><dd>{texto(auditoriaDetalle.estado_anterior)}</dd></div>
                <div><dt>Estado nuevo</dt><dd>{texto(auditoriaDetalle.estado_nuevo)}</dd></div>
                <div><dt>Dirección IP</dt><dd>{texto(auditoriaDetalle.ip)}</dd></div>
                <div><dt>Origen</dt><dd>{labelAuditoria(auditoriaDetalle.fuente)}</dd></div>
              </dl>
              {auditoriaDetalle.observaciones && (
                <div className="auditoria-note">
                  <strong>Observaciones</strong>
                  <p>{auditoriaDetalle.observaciones}</p>
                </div>
              )}
              {diferenciasAuditoria(auditoriaDetalle).length > 0 && (
                <div className="auditoria-diff">
                  <h3>Cambios legibles</h3>
                  {diferenciasAuditoria(auditoriaDetalle).map((cambio) => (
                    <div className="auditoria-diff-row" key={cambio.campo}>
                      <strong>{labelAuditoria(cambio.campo)}</strong>
                      <span>{valorLegible(cambio.antes)}</span>
                      <span>{valorLegible(cambio.despues)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="auditoria-json-grid">
                <section>
                  <h3>Información anterior</h3>
                  <pre>{datosAuditoria(auditoriaDetalle.datos_anteriores) ? JSON.stringify(datosAuditoria(auditoriaDetalle.datos_anteriores), null, 2) : "Sin información anterior"}</pre>
                </section>
                <section>
                  <h3>Información nueva</h3>
                  <pre>{datosAuditoria(auditoriaDetalle.datos_nuevos) ? JSON.stringify(datosAuditoria(auditoriaDetalle.datos_nuevos), null, 2) : "Sin información nueva"}</pre>
                </section>
              </div>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setAuditoriaDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {operacionLoteForm && (
        <div className="modal-backdrop" onMouseDown={() => setOperacionLoteForm(null)}>
          <div className="modal infra-small-modal operacion-lote-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>Operación de inventario</h2>
                <p>{texto(operacionLoteForm.lote.recurso_nombre)} · Lote {texto(operacionLoteForm.lote.lote)}</p>
              </div>
              <button type="button" onClick={() => setOperacionLoteForm(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="operacion-lote-summary">
              <span>Existencia actual: <strong>{texto(operacionLoteForm.lote.cantidad_actual)}</strong></span>
              <span>Estado: <strong>{texto(operacionLoteForm.lote.estado)}</strong></span>
              <span>Ubicación: <strong>{texto(operacionLoteForm.lote.ubicacion)}</strong></span>
            </div>
            <div className="infra-form-grid operacion-lote-fields">
              <label>Operación
                <select
                  value={operacionLoteForm.operacion}
                  onChange={(event) => setOperacionLoteForm((actual) => actual ? { ...actual, operacion: event.target.value as OperacionLote } : actual)}
                >
                  {puedeAjustarInventario && <option value="ajuste">Ajuste de existencias</option>}
                  {puedeDarBajaInventario && <option value="baja">Baja de inventario</option>}
                  {puedeAjustarInventario && <option value="estado">Bloqueo, cuarentena o desbloqueo</option>}
                  {puedeAjustarInventario && <option value="traslado">Traslado de ubicación</option>}
                  {puedeAjustarInventario && <option value="devolucion">Devolución</option>}
                </select>
              </label>

              {operacionLoteForm.operacion === "ajuste" && (
                <label>Tipo de ajuste
                  <select
                    value={operacionLoteForm.tipoAjuste}
                    onChange={(event) => setOperacionLoteForm((actual) => actual ? { ...actual, tipoAjuste: event.target.value as "positivo" | "negativo" } : actual)}
                  >
                    <option value="positivo">Positivo</option>
                    <option value="negativo">Negativo</option>
                  </select>
                </label>
              )}

              {operacionLoteForm.operacion === "baja" && (
                <label>Causa
                  <select
                    value={operacionLoteForm.causaBaja}
                    onChange={(event) => setOperacionLoteForm((actual) => actual ? { ...actual, causaBaja: event.target.value as OperacionLoteForm["causaBaja"] } : actual)}
                  >
                    <option value="vencimiento">Vencimiento</option>
                    <option value="deterioro">Deterioro</option>
                    <option value="perdida">Pérdida</option>
                    <option value="dano">Daño</option>
                  </select>
                </label>
              )}

              {operacionLoteForm.operacion === "estado" && (
                <label>Nuevo estado
                  <select
                    value={operacionLoteForm.estadoDestino}
                    onChange={(event) => setOperacionLoteForm((actual) => actual ? { ...actual, estadoDestino: event.target.value as OperacionLoteForm["estadoDestino"] } : actual)}
                  >
                    <option value="disponible">Disponible / desbloqueado</option>
                    <option value="bloqueado">Bloqueado</option>
                    <option value="cuarentena">Cuarentena</option>
                  </select>
                </label>
              )}

              {operacionLoteForm.operacion === "traslado" && (
                <label>Ubicación destino
                  <input
                    value={operacionLoteForm.ubicacionDestino}
                    onChange={(event) => setOperacionLoteForm((actual) => actual ? { ...actual, ubicacionDestino: event.target.value } : actual)}
                    maxLength={160}
                  />
                </label>
              )}

              {operacionLoteForm.operacion === "devolucion" && (
                <>
                  <label>Devuelto por
                    <select
                      value={operacionLoteForm.origenDevolucion}
                      onChange={(event) => setOperacionLoteForm((actual) => actual ? { ...actual, origenDevolucion: event.target.value as "profesional" | "paciente" } : actual)}
                    >
                      <option value="profesional">Profesional</option>
                      <option value="paciente">Paciente</option>
                    </select>
                  </label>
                  <label className="infra-check-field">
                    <input
                      type="checkbox"
                      checked={operacionLoteForm.aptoReintegro}
                      onChange={(event) => setOperacionLoteForm((actual) => actual ? { ...actual, aptoReintegro: event.target.checked } : actual)}
                    />
                    Apto para reintegrar existencias
                  </label>
                </>
              )}

              {["ajuste", "baja", "devolucion"].includes(operacionLoteForm.operacion) && (
                <label>Cantidad
                  <input
                    value={operacionLoteForm.cantidad}
                    onChange={(event) => setOperacionLoteForm((actual) => actual ? { ...actual, cantidad: event.target.value } : actual)}
                    inputMode="decimal"
                  />
                </label>
              )}

              <label className="wide-field">Motivo obligatorio
                <textarea
                  rows={3}
                  value={operacionLoteForm.motivo}
                  onChange={(event) => setOperacionLoteForm((actual) => actual ? { ...actual, motivo: event.target.value } : actual)}
                  maxLength={500}
                />
              </label>
            </div>
            {operacionLoteForm.operacion === "devolucion" && !operacionLoteForm.aptoReintegro && (
              <div className="infra-danger-note operacion-lote-note">
                La devolución quedará registrada, pero no aumentará la existencia del lote.
              </div>
            )}
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setOperacionLoteForm(null)}>Cancelar</button>
              <button className="primary-btn infra-save-btn" type="button" onClick={guardarOperacionLote} disabled={accion === "guardar-operacion-lote"}>
                <Save size={16} /> Registrar operación
              </button>
            </div>
          </div>
        </div>
      )}

      {loteDetalle && (
        <div className="modal-backdrop" onMouseDown={() => setLoteDetalle(null)}>
          <div className="modal wide-modal recursos-modal movimientos-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>Movimientos de inventario</h2>
                <p>{texto(loteDetalle.recurso_codigo)} · {texto(loteDetalle.recurso_nombre)} · Lote {texto(loteDetalle.lote)}</p>
              </div>
              <button type="button" onClick={() => setLoteDetalle(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="movimientos-summary">
              <div><span>Existencia inicial</span><strong>{texto(loteDetalle.cantidad_inicial)}</strong></div>
              <div><span>Existencia actual</span><strong>{texto(loteDetalle.cantidad_actual)}</strong></div>
              <div><span>Estado</span><strong className={`pill ${loteDetalle.estado}`}>{loteDetalle.estado}</strong></div>
              <div><span>Ubicación</span><strong>{texto(loteDetalle.ubicacion)}</strong></div>
            </div>
            <div className="movimientos-modal-body">
              {cargandoMovimientos && <Loading text="Cargando movimientos..." />}
              {!cargandoMovimientos && movimientosDetalle.length > 0 && (
                <div className="movimientos-table-wrap">
                  <table className="movimientos-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Saldo anterior</th>
                        <th>Saldo nuevo</th>
                        <th>Origen</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosDetalle.map((movimiento) => (
                        <tr key={movimiento.id}>
                          <td>{texto(movimiento.created_at)}</td>
                          <td><span className={`movement-type ${movimiento.tipo_movimiento}`}>{texto(movimiento.tipo_movimiento)}</span></td>
                          <td>{texto(movimiento.cantidad)}</td>
                          <td>{texto(movimiento.saldo_anterior)}</td>
                          <td><strong>{texto(movimiento.saldo_nuevo)}</strong></td>
                          <td>{texto(movimiento.origen)}</td>
                          <td>{texto(movimiento.observaciones)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!cargandoMovimientos && !movimientosDetalle.length && (
                <div className="empty-state">Este lote todavía no tiene movimientos registrados.</div>
              )}
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setLoteDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {alertaActiva && (
        <div className="modal-backdrop" onMouseDown={() => setAlertaActiva(null)}>
          <div className="modal wide-modal recursos-modal recursos-alert-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>{configuracionAlertas.find((item) => item.key === alertaActiva)?.label}</h2>
                <p>{configuracionAlertas.find((item) => item.key === alertaActiva)?.ayuda}</p>
              </div>
              <button type="button" onClick={() => setAlertaActiva(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="recursos-alert-modal-body">
              {alertasRecursos[alertaActiva].length ? (
                alertasRecursos[alertaActiva].map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.titulo}</strong>
                      <span>{item.detalle}</span>
                    </div>
                    {item.meta && <small>{item.meta}</small>}
                    {puedeComprar && alertaActiva === "reorden" && item.recurso_id && (
                      <button
                        className="secondary-btn recursos-alert-action"
                        type="button"
                        onClick={() => crearSolicitudDesdeReorden(item)}
                        disabled={accion === `solicitud-reorden-${item.recurso_id}`}
                      >
                        Crear solicitud
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <div className="empty-state">No hay elementos pendientes para esta alerta.</div>
              )}
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setAlertaActiva(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {recursoForm && (
        <div className="modal-backdrop" onMouseDown={() => setRecursoForm(null)}>
          <div className="modal wide-modal recursos-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>{recursoForm.id ? "Editar recurso asistencial" : "Nuevo recurso asistencial"}</h2>
                <p>Relaciona el recurso con servicios IPS y proveedores sin usar texto libre de servicio.</p>
              </div>
              <button type="button" onClick={() => setRecursoForm(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="infra-form-body">
              <Section title="Datos generales">
                <label>Tipo de recurso
                  <select value={recursoForm.tipo_recurso} onChange={(event) => actualizarRecurso("tipo_recurso", event.target.value)}>
                    {TIPOS_RECURSO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>Código
                  <input value={recursoForm.codigo} onChange={(event) => actualizarRecurso("codigo", event.target.value)} placeholder="Se genera si se deja vacío" />
                </label>
                <label className="wide-field">Nombre *
                  <input value={recursoForm.nombre} onChange={(event) => actualizarRecurso("nombre", event.target.value)} />
                </label>
                <label>Presentación
                  <input value={recursoForm.presentacion} onChange={(event) => actualizarRecurso("presentacion", event.target.value)} />
                </label>
                <label>Unidad de medida
                  <input value={recursoForm.unidad_medida} onChange={(event) => actualizarRecurso("unidad_medida", event.target.value)} />
                </label>
                <label>Concentración
                  <input value={recursoForm.concentracion} onChange={(event) => actualizarRecurso("concentracion", event.target.value)} disabled={!reglasTipoRecurso(recursoForm.tipo_recurso).esMedicamento} />
                </label>
                <label>Principio activo
                  <input value={recursoForm.principio_activo} onChange={(event) => actualizarRecurso("principio_activo", event.target.value)} disabled={!reglasTipoRecurso(recursoForm.tipo_recurso).esMedicamento} />
                </label>
                <label>Estado
                  <select value={recursoForm.estado} onChange={(event) => actualizarRecurso("estado", event.target.value)}>
                    {ESTADOS_RECURSO.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="wide-field">Descripción
                  <textarea rows={2} value={recursoForm.descripcion} onChange={(event) => actualizarRecurso("descripcion", event.target.value)} />
                </label>
              </Section>

              <Section title="Registro sanitario y riesgos">
                <label>Registro sanitario
                  <input value={recursoForm.registro_sanitario} onChange={(event) => actualizarRecurso("registro_sanitario", event.target.value)} />
                </label>
                <label>Vencimiento registro sanitario
                  <input type="date" value={recursoForm.fecha_vencimiento_registro_sanitario} onChange={(event) => actualizarRecurso("fecha_vencimiento_registro_sanitario", event.target.value)} />
                </label>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.requiere_registro_sanitario} disabled readOnly /> Requiere registro sanitario</label>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.es_lasa} onChange={(event) => actualizarRecurso("es_lasa", event.target.checked)} disabled={!reglasTipoRecurso(recursoForm.tipo_recurso).esMedicamento} /> Es medicamento LASA</label>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.alto_riesgo} onChange={(event) => actualizarRecurso("alto_riesgo", event.target.checked)} disabled={!reglasTipoRecurso(recursoForm.tipo_recurso).esMedicamento} /> Medicamento controlado</label>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.requiere_formula} disabled readOnly /> Requiere fórmula</label>
                <div className="recursos-inline-note wide-field">
                  Registro sanitario aplica para todos. Fórmula aplica para medicamentos, dispositivos médicos y reactivos; insumos no la requieren. Vencimiento de lote obligatorio solo para medicamentos.
                </div>
                {recursoForm.es_lasa && <div className="recursos-lasa-alert wide-field">LASA marcado: validar almacenamiento, rotulación y dispensación diferenciada.</div>}
              </Section>

              <Section title="Cadena de frío y suficiencia">
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.requiere_cadena_frio} onChange={(event) => actualizarRecurso("requiere_cadena_frio", event.target.checked)} /> Requiere cadena de frío</label>
                <label>Temperatura mínima
                  <input value={recursoForm.temperatura_min} onChange={(event) => actualizarRecurso("temperatura_min", event.target.value)} disabled={!recursoForm.requiere_cadena_frio} inputMode="decimal" />
                </label>
                <label>Temperatura máxima
                  <input value={recursoForm.temperatura_max} onChange={(event) => actualizarRecurso("temperatura_max", event.target.value)} disabled={!recursoForm.requiere_cadena_frio} inputMode="decimal" />
                </label>
                <label>Humedad mínima
                  <input value={recursoForm.humedad_min} onChange={(event) => actualizarRecurso("humedad_min", event.target.value)} inputMode="decimal" />
                </label>
                <label>Humedad máxima
                  <input value={recursoForm.humedad_max} onChange={(event) => actualizarRecurso("humedad_max", event.target.value)} inputMode="decimal" />
                </label>
                <label>Stock mínimo
                  <input value={recursoForm.stock_minimo} onChange={(event) => actualizarRecurso("stock_minimo", event.target.value)} inputMode="decimal" />
                </label>
                <label>Stock máximo
                  <input value={recursoForm.stock_maximo} onChange={(event) => actualizarRecurso("stock_maximo", event.target.value)} inputMode="decimal" />
                </label>
                <label>Punto de reorden
                  <input value={recursoForm.punto_reorden} onChange={(event) => actualizarRecurso("punto_reorden", event.target.value)} inputMode="decimal" />
                </label>
                <label>Tiempo reposición días
                  <input value={recursoForm.tiempo_reposicion_dias} onChange={(event) => actualizarRecurso("tiempo_reposicion_dias", event.target.value)} inputMode="numeric" />
                </label>
              </Section>

              <Section title="Servicios IPS relacionados">
                <div className="recursos-check-list wide-field">
                  {servicios.map((servicio) => (
                    <label key={servicio.id}>
                      <input type="checkbox" checked={recursoForm.servicios.includes(servicio.id)} onChange={() => toggleRelacion("servicios", servicio.id)} />
                      <span>{servicio.codigo} - {servicio.nombre}</span>
                    </label>
                  ))}
                </div>
              </Section>

              <Section title="Proveedores y ficha técnica">
                <div className="recursos-check-list wide-field">
                  {proveedores.filter((proveedor) => proveedor.estado !== "bloqueado").map((proveedor) => (
                    <label key={proveedor.id}>
                      <input type="checkbox" checked={recursoForm.proveedores.includes(proveedor.id)} onChange={() => toggleRelacion("proveedores", proveedor.id)} />
                      <span>{proveedor.nombre}{proveedor.nit ? ` · ${proveedor.nit}` : ""}</span>
                    </label>
                  ))}
                </div>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.requiere_ficha_tecnica} onChange={(event) => actualizarRecurso("requiere_ficha_tecnica", event.target.checked)} /> Requiere ficha técnica</label>
                <label>Ficha técnica
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx" onChange={(event: ChangeEvent<HTMLInputElement>) => actualizarRecurso("ficha", event.target.files?.[0] || null)} />
                </label>
                <label>Versión ficha
                  <input value={recursoForm.ficha_version} onChange={(event) => actualizarRecurso("ficha_version", event.target.value)} />
                </label>
                <label>Fecha documento
                  <input type="date" value={recursoForm.ficha_fecha} onChange={(event) => actualizarRecurso("ficha_fecha", event.target.value)} />
                </label>
                <label className="wide-field">Observaciones
                  <textarea rows={2} value={recursoForm.observaciones} onChange={(event) => actualizarRecurso("observaciones", event.target.value)} />
                </label>
              </Section>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setRecursoForm(null)}>Cancelar</button>
              <button className="primary-btn infra-save-btn" type="button" onClick={guardarRecurso} disabled={accion === "guardar-recurso"}><Save size={16} /> Guardar recurso</button>
            </div>
          </div>
        </div>
      )}

      {ordenForm && (
        <div className="modal-backdrop" onMouseDown={() => setOrdenForm(null)}>
          <div className="modal wide-modal recursos-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>{ordenForm.id ? "Editar orden de compra" : "Nueva orden de compra"}</h2>
                <p>Registra la adquisición y sus recursos. La recepción técnica se realizará en una fase posterior.</p>
              </div>
              <button type="button" onClick={() => setOrdenForm(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="infra-form-body">
              <Section title="Datos de la orden">
                <label>Número de orden
                  <input value={ordenForm.numero_orden || "Automático al guardar"} disabled />
                </label>
                <label>Proveedor *
                  <select value={ordenForm.proveedor_id} onChange={(event) => actualizarOrden("proveedor_id", event.target.value)}>
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.filter((proveedor) => proveedor.estado !== "bloqueado").map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}{proveedor.nit ? ` · ${proveedor.nit}` : ""}</option>
                    ))}
                  </select>
                </label>
                <label>Fecha de orden
                  <input type="date" value={ordenForm.fecha_orden} onChange={(event) => actualizarOrden("fecha_orden", event.target.value)} />
                </label>
                <label>Entrega estimada
                  <input type="date" value={ordenForm.fecha_estimada_entrega} onChange={(event) => actualizarOrden("fecha_estimada_entrega", event.target.value)} />
                </label>
                <label>Estado
                  <select value={ordenForm.estado} onChange={(event) => actualizarOrden("estado", event.target.value)}>
                    {ESTADOS_ORDEN_COMPRA.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>Impuestos
                  <input value={ordenForm.impuestos} onChange={(event) => actualizarOrden("impuestos", event.target.value)} inputMode="decimal" />
                </label>
                <label>Factura final
                  <input value={ordenForm.factura_numero} onChange={(event) => actualizarOrden("factura_numero", event.target.value)} placeholder="Número de factura" />
                </label>
                <label>Archivo factura
                  <input value={ordenForm.factura_archivo} onChange={(event) => actualizarOrden("factura_archivo", event.target.value)} placeholder="Referencia o ruta del archivo" />
                </label>
                <label className="wide-field">Observaciones
                  <textarea rows={2} value={ordenForm.observaciones} onChange={(event) => actualizarOrden("observaciones", event.target.value)} />
                </label>
              </Section>

              <section className="recursos-form-section">
                <div className="orden-section-head">
                  <h3>Recursos de la orden</h3>
                  <button className="secondary-btn" type="button" onClick={agregarDetalleOrden}>
                    <Plus size={15} /> Agregar recurso
                  </button>
                </div>
                <div className="orden-detalles">
                  {ordenForm.detalles.map((detalle, index) => {
                    const subtotal = (numero(detalle.cantidad) || 0) * (numero(detalle.valor_unitario) || 0);
                    return (
                      <div className="orden-detalle-row" key={`${index}-${detalle.recurso_id || "nuevo"}`}>
                        <label>Recurso *
                          <select value={detalle.recurso_id} onChange={(event) => actualizarDetalleOrden(index, "recurso_id", event.target.value)}>
                            <option value="">Seleccionar recurso</option>
                            {recursos.filter((recurso) => recurso.estado === "activo" || recurso.estado === "en_revision").map((recurso) => (
                              <option key={recurso.id} value={recurso.id}>{texto(recurso.codigo)} · {recurso.nombre}</option>
                            ))}
                          </select>
                        </label>
                        <label>Cantidad
                          <input value={detalle.cantidad} onChange={(event) => actualizarDetalleOrden(index, "cantidad", event.target.value)} inputMode="decimal" />
                        </label>
                        <label>Valor unitario
                          <input value={detalle.valor_unitario} onChange={(event) => actualizarDetalleOrden(index, "valor_unitario", event.target.value)} inputMode="decimal" />
                        </label>
                        <label>Entrega estimada
                          <input type="date" value={detalle.fecha_estimada_entrega} onChange={(event) => actualizarDetalleOrden(index, "fecha_estimada_entrega", event.target.value)} />
                        </label>
                        <div className="orden-detalle-total">
                          <span>Total línea</span>
                          <strong>{dinero(subtotal)}</strong>
                        </div>
                        <button className="icon-danger-btn" type="button" onClick={() => quitarDetalleOrden(index)} aria-label="Quitar recurso">
                          <Trash2 size={16} />
                        </button>
                        <label className="wide-field">Observaciones del recurso
                          <input value={detalle.observaciones} onChange={(event) => actualizarDetalleOrden(index, "observaciones", event.target.value)} />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="orden-total-box">
                <span>Total estimado de la orden</span>
                <strong>{dinero(totalOrdenForm)}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setOrdenForm(null)}>Cancelar</button>
              <button className="primary-btn infra-save-btn" type="button" onClick={guardarOrden} disabled={accion === "guardar-orden"}><Save size={16} /> Guardar orden</button>
            </div>
          </div>
        </div>
      )}

      {recepcionForm && (
        <div className="modal-backdrop" onMouseDown={() => setRecepcionForm(null)}>
          <div className="modal wide-modal recursos-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>{recepcionForm.id ? "Editar recepción" : "Nueva recepción"}</h2>
                <p>Valida la recepción administrativa y técnica antes de crear inventario por lote.</p>
              </div>
              <button type="button" onClick={() => setRecepcionForm(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="infra-form-body">
              <Section title="Datos de recepción">
                <label>Orden de compra
                  <select value={recepcionForm.orden_compra_id} onChange={(event) => actualizarRecepcion("orden_compra_id", event.target.value)} disabled>
                    <option value="">Seleccionar orden</option>
                    {ordenes.map((orden) => <option key={orden.id} value={orden.id}>{orden.numero_orden}</option>)}
                  </select>
                </label>
                <label>Proveedor
                  <select value={recepcionForm.proveedor_id} onChange={(event) => actualizarRecepcion("proveedor_id", event.target.value)} disabled>
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>)}
                  </select>
                </label>
                <label>Fecha recepción
                  <input type="date" value={recepcionForm.fecha_recepcion} onChange={(event) => actualizarRecepcion("fecha_recepcion", event.target.value)} />
                </label>
                <label>Tipo de recepción
                  <select value={recepcionForm.tipo_recepcion} onChange={(event) => actualizarRecepcion("tipo_recepcion", event.target.value)}>
                    {TIPOS_RECEPCION.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>Estado
                  <select value={recepcionForm.estado} onChange={(event) => actualizarRecepcion("estado", event.target.value)}>
                    {ESTADOS_RECEPCION.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="wide-field">Observaciones generales
                  <textarea rows={2} value={recepcionForm.observaciones} onChange={(event) => actualizarRecepcion("observaciones", event.target.value)} />
                </label>
              </Section>

              <section className="recursos-form-section">
                <div className="orden-section-head">
                  <h3>Checklist por recurso</h3>
                </div>
                <div className="orden-detalles recepcion-detalles">
                  {recepcionForm.detalles.map((detalle, index) => {
                    const cantidadRecibida = numero(detalle.cantidad_recibida) || 0;
                    const cantidadPendiente = numero(detalle.cantidad_pendiente) || 0;
                    const excedePendiente = detalle.cumple && cantidadPendiente > 0 && cantidadRecibida > cantidadPendiente;
                    return (
                    <div className={`recepcion-detalle-row${excedePendiente ? " has-overage" : ""}`} key={`${index}-${detalle.recurso_id || "recurso"}`}>
                      <label>Recurso
                        <select value={detalle.recurso_id} onChange={(event) => actualizarDetalleRecepcion(index, "recurso_id", event.target.value)} disabled>
                          <option value="">Seleccionar recurso</option>
                          {recursos.map((recurso) => <option key={recurso.id} value={recurso.id}>{texto(recurso.codigo)} · {recurso.nombre}</option>)}
                        </select>
                      </label>
                      <label>Lote
                        <input value={detalle.lote} onChange={(event) => actualizarDetalleRecepcion(index, "lote", event.target.value)} />
                      </label>
                      <label>Cantidad recibida
                        <input value={detalle.cantidad_recibida} onChange={(event) => actualizarDetalleRecepcion(index, "cantidad_recibida", event.target.value)} inputMode="decimal" />
                      </label>
                      {detalle.cantidad_pendiente && (
                        <div className="recepcion-pendiente-box">
                          <span>Pendiente autorizado</span>
                          <strong>{detalle.cantidad_pendiente}</strong>
                        </div>
                      )}
                      <label>Fecha vencimiento
                        <input type="date" value={detalle.fecha_vencimiento} onChange={(event) => actualizarDetalleRecepcion(index, "fecha_vencimiento", event.target.value)} />
                      </label>
                      <label>Temperatura
                        <input value={detalle.temperatura_recibida} onChange={(event) => actualizarDetalleRecepcion(index, "temperatura_recibida", event.target.value)} inputMode="decimal" />
                      </label>
                      <label>Humedad
                        <input value={detalle.humedad_recibida} onChange={(event) => actualizarDetalleRecepcion(index, "humedad_recibida", event.target.value)} inputMode="decimal" />
                      </label>
                      <label className="infra-check-field"><input type="checkbox" checked={detalle.registro_sanitario_validado} onChange={(event) => actualizarDetalleRecepcion(index, "registro_sanitario_validado", event.target.checked)} /> Registro sanitario validado</label>
                      <label className="infra-check-field"><input type="checkbox" checked={detalle.empaque_integro} onChange={(event) => actualizarDetalleRecepcion(index, "empaque_integro", event.target.checked)} /> Empaque íntegro</label>
                      <label className="infra-check-field"><input type="checkbox" checked={detalle.cumple} onChange={(event) => actualizarDetalleRecepcion(index, "cumple", event.target.checked)} /> Cumple recepción</label>
                      {excedePendiente && (
                        <div className="recursos-inline-warning wide-field">
                          La cantidad supera el pendiente autorizado. Requiere permiso especial y justificación.
                        </div>
                      )}
                      {(excedePendiente || detalle.permitir_exceso) && (
                        <>
                          <label className="infra-check-field"><input type="checkbox" checked={detalle.permitir_exceso} onChange={(event) => actualizarDetalleRecepcion(index, "permitir_exceso", event.target.checked)} /> Permitir exceso autorizado</label>
                          <label className="wide-field">Justificación de exceso
                            <input value={detalle.justificacion_exceso} onChange={(event) => actualizarDetalleRecepcion(index, "justificacion_exceso", event.target.value)} />
                          </label>
                        </>
                      )}
                      {!detalle.cumple && (
                        <label className="wide-field">Motivo de rechazo *
                          <input value={detalle.motivo_rechazo} onChange={(event) => actualizarDetalleRecepcion(index, "motivo_rechazo", event.target.value)} />
                        </label>
                      )}
                      <label className="wide-field">Observaciones
                        <input value={detalle.observaciones} onChange={(event) => actualizarDetalleRecepcion(index, "observaciones", event.target.value)} />
                      </label>
                    </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setRecepcionForm(null)}>Cancelar</button>
              <button className="primary-btn infra-save-btn" type="button" onClick={guardarRecepcion} disabled={accion === "guardar-recepcion"}><Save size={16} /> Guardar recepción</button>
            </div>
          </div>
        </div>
      )}

      {reintentoForm && (
        <div className="modal-backdrop" onMouseDown={() => setReintentoForm(null)}>
          <div className="modal recursos-modal compact-recursos-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>Programar reintento</h2>
                <p>{reintentoForm.despacho.numero_despacho} · {texto(reintentoForm.despacho.paciente_nombre)}</p>
              </div>
              <button type="button" onClick={() => setReintentoForm(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="infra-form-body">
              <Section title="Nuevo intento de entrega">
                <label>Fecha y hora *
                  <input type="datetime-local" value={reintentoForm.fecha_programada} onChange={(event) => setReintentoForm((actual) => actual ? { ...actual, fecha_programada: event.target.value } : actual)} />
                </label>
                <label className="wide-field">Observaciones
                  <textarea rows={2} value={reintentoForm.observaciones} onChange={(event) => setReintentoForm((actual) => actual ? { ...actual, observaciones: event.target.value } : actual)} />
                </label>
              </Section>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setReintentoForm(null)}>Cancelar</button>
              <button className="primary-btn" type="button" onClick={guardarReintentoDespacho} disabled={accion === `reintento-despacho-${reintentoForm.despacho.id}`}>Guardar reintento</button>
            </div>
          </div>
        </div>
      )}

      {devolucionDespachoForm && (
        <div className="modal-backdrop" onMouseDown={() => setDevolucionDespachoForm(null)}>
          <div className="modal recursos-modal compact-recursos-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>Devolver productos</h2>
                <p>{devolucionDespachoForm.despacho.numero_despacho} · {texto(devolucionDespachoForm.despacho.paciente_nombre)}</p>
              </div>
              <button type="button" onClick={() => setDevolucionDespachoForm(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="infra-form-body">
              <Section title="Reintegro a inventario">
                <label className="infra-check-field"><input type="checkbox" checked={devolucionDespachoForm.apto_reintegro} onChange={(event) => setDevolucionDespachoForm((actual) => actual ? { ...actual, apto_reintegro: event.target.checked } : actual)} /> Productos aptos para reintegro</label>
                <label className="wide-field">Motivo obligatorio
                  <textarea rows={3} value={devolucionDespachoForm.motivo} onChange={(event) => setDevolucionDespachoForm((actual) => actual ? { ...actual, motivo: event.target.value } : actual)} placeholder="No entregado, paciente ausente, rechazo, daño..." />
                </label>
              </Section>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setDevolucionDespachoForm(null)}>Cancelar</button>
              <button className="primary-btn" type="button" onClick={guardarDevolucionDespacho} disabled={accion === `devolver-despacho-${devolucionDespachoForm.despacho.id}`}>Registrar devolución</button>
            </div>
          </div>
        </div>
      )}

      {despachoForm && (
        <div className="modal-backdrop" onMouseDown={cerrarDespachoForm}>
          <div className="modal wide-modal recursos-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>{despachoForm.id ? "Editar despacho" : "Nuevo despacho"}</h2>
                <p>Entrega interna al responsable de ruta. La entrega final con firma y ubicación será la siguiente subfase.</p>
              </div>
              <button type="button" onClick={cerrarDespachoForm} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="infra-form-body">
              <Section title="Destino y responsable">
                <label>Número de despacho
                  <input value={despachoForm.numero_despacho || "Automático al guardar"} disabled />
                </label>
                <label>Responsable de ruta *
                  <select value={despachoForm.responsable_entrega_id} onChange={(event) => actualizarDespacho("responsable_entrega_id", event.target.value)}>
                    <option value="">Seleccionar profesional</option>
                    {profesionales.map((profesional) => (
                      <option key={profesional.id} value={profesional.id}>{profesional.nombre}{profesional.cedula ? ` · ${profesional.cedula}` : ""}</option>
                    ))}
                  </select>
                </label>
                <label>Fecha programada
                  <input type="datetime-local" value={despachoForm.fecha_programada} onChange={(event) => actualizarDespacho("fecha_programada", event.target.value)} />
                </label>
                <label>Estado
                  <select value={despachoForm.estado} onChange={(event) => actualizarDespacho("estado", event.target.value)} disabled={Boolean(despachoForm.id)}>
                    {ESTADOS_DESPACHO.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <div className="patient-selector wide-field">
                  <label>Paciente *
                    <div className="patient-search-row">
                      <input
                        value={pacienteBusqueda}
                        onChange={(event) => setPacienteBusqueda(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            buscarPacientesExternos();
                          }
                        }}
                        placeholder="Buscar por nombre, documento o teléfono"
                      />
                      <button className="secondary-btn" type="button" onClick={buscarPacientesExternos} disabled={buscandoPacientes}>
                        <Search size={15} /> {buscandoPacientes ? "Buscando..." : "Buscar / cargar"}
                      </button>
                    </div>
                  </label>
                  <select value={pacienteSeleccionado} onChange={(event) => seleccionarPacienteExterno(event.target.value)} disabled={!pacientesExternos.length}>
                    <option value="">{pacientesExternos.length ? "Seleccionar paciente" : "Carga pacientes para seleccionar"}</option>
                    {pacientesExternos.map((paciente) => (
                      <option key={paciente.id_externo} value={paciente.id_externo}>
                        {paciente.nombre} · {paciente.documento}{paciente.ciudad ? ` · ${paciente.ciudad}` : ""}
                      </option>
                    ))}
                  </select>
                  {despachoForm.paciente_nombre && (
                    <div className="selected-patient-box">
                      <strong>{despachoForm.paciente_nombre}</strong>
                      <span>{despachoForm.paciente_documento || "Sin documento"} · {despachoForm.paciente_telefono || "Sin teléfono"}</span>
                      <small>{despachoForm.direccion_entrega || "Sin dirección registrada"}{despachoForm.ciudad_entrega ? ` · ${despachoForm.ciudad_entrega}` : ""}</small>
                      <small>{despachoForm.paciente_email || "Sin correo registrado"}</small>
                    </div>
                  )}
                </div>
                <label>Documento paciente
                  <input value={despachoForm.paciente_documento} onChange={(event) => actualizarDespacho("paciente_documento", event.target.value)} />
                </label>
                <label>Teléfono paciente
                  <input value={despachoForm.paciente_telefono} onChange={(event) => actualizarDespacho("paciente_telefono", event.target.value)} />
                </label>
                <label>Correo paciente
                  <input type="email" value={despachoForm.paciente_email} onChange={(event) => actualizarDespacho("paciente_email", event.target.value)} />
                </label>
                <label>Ciudad
                  <input value={despachoForm.ciudad_entrega} onChange={(event) => actualizarDespacho("ciudad_entrega", event.target.value)} />
                </label>
                <label className="wide-field">Dirección de entrega *
                  <input value={despachoForm.direccion_entrega} onChange={(event) => actualizarDespacho("direccion_entrega", event.target.value)} />
                </label>
                <label className="wide-field">Observaciones
                  <textarea rows={2} value={despachoForm.observaciones} onChange={(event) => actualizarDespacho("observaciones", event.target.value)} />
                </label>
              </Section>

              <section className="recursos-form-section">
                <div className="orden-section-head">
                  <h3>Lotes a despachar</h3>
                  <button className="secondary-btn" type="button" onClick={agregarDetalleDespacho}>
                    <Plus size={15} /> Excepción manual
                  </button>
                </div>
                <div className="fefo-assignment-box">
                  <div>
                    <strong>Agregar recurso</strong>
                    <span>El sistema asignará obligatoriamente el lote que vence primero y dividirá la cantidad si es necesario.</span>
                  </div>
                  <label>Recurso
                    <select value={fefoRecursoId} onChange={(event) => setFefoRecursoId(event.target.value)}>
                      <option value="">Seleccionar recurso</option>
                      {recursosConInventarioFefo.map((recurso) => {
                        const totalLotes = lotesDisponiblesFefo.filter((lote) => lote.recurso_id === recurso.id).length;
                        return <option key={recurso.id} value={recurso.id}>{recurso.codigo} · {recurso.nombre} · {totalLotes} lote(s)</option>;
                      })}
                    </select>
                  </label>
                  <label>Cantidad total
                    <input value={fefoCantidad} onChange={(event) => setFefoCantidad(event.target.value)} inputMode="decimal" />
                  </label>
                  <button className="primary-btn" type="button" onClick={aplicarFefoDespacho} disabled={accion === "aplicar-fefo"}>
                    <PackagePlus size={16} /> Agregar recurso
                  </button>
                </div>
                <div className="orden-detalles">
                  {despachoForm.detalles.map((detalle, index) => {
                    const loteSeleccionado = lotesInventario.find((lote) => lote.id === Number(detalle.inventario_lote_id));
                    const fefo = loteSeleccionado ? prioridadFefo(loteSeleccionado) : null;
                    return (
                      <div className="orden-detalle-row despacho-detalle-row" key={`${index}-${detalle.inventario_lote_id || "lote"}`}>
                        {detalle.seleccion_manual ? (
                          <label>Lote excepcional *
                            <select value={detalle.inventario_lote_id} onChange={(event) => actualizarDetalleDespacho(index, "inventario_lote_id", event.target.value)}>
                              <option value="">Seleccionar lote</option>
                              {lotesDisponiblesFefo.map((lote) => {
                                const prioridad = prioridadFefo(lote);
                                return (
                                <option key={lote.id} value={lote.id}>
                                  FEFO #{prioridad.prioridad} · {texto(lote.recurso_codigo)} · {lote.recurso_nombre} · Lote {lote.lote} · Vence {texto(lote.fecha_vencimiento)} · Disp. {texto(cantidadDisponibleParaDespacho(lote))}
                                </option>
                                );
                              })}
                            </select>
                          </label>
                        ) : (
                          <div className="fefo-lote-asignado">
                            <span>Lote asignado automáticamente</span>
                            <strong>{texto(loteSeleccionado?.recurso_nombre)} · Lote {texto(loteSeleccionado?.lote)}</strong>
                            <small>Vence {texto(loteSeleccionado?.fecha_vencimiento)}</small>
                          </div>
                        )}
                        <label>Cantidad
                          <input
                            value={detalle.cantidad}
                            onChange={(event) => actualizarDetalleDespacho(index, "cantidad", event.target.value)}
                            inputMode="decimal"
                            disabled={!detalle.seleccion_manual}
                          />
                        </label>
                        <div className="orden-detalle-total">
                          <span>{detalle.seleccion_manual ? "Selección manual" : "Prioridad FEFO"}</span>
                          <strong>{detalle.seleccion_manual ? "Justificar" : fefo?.prioridad ? `#${fefo.prioridad} de ${fefo.total}` : "-"}</strong>
                        </div>
                        <button className="icon-danger-btn" type="button" onClick={() => quitarDetalleDespacho(index)} aria-label="Quitar lote">
                          <Trash2 size={16} />
                        </button>
                        {!detalle.seleccion_manual && (
                          <button
                            className="secondary-btn wide-field fefo-exception-btn"
                            type="button"
                            onClick={() => actualizarDetalleDespacho(index, "seleccion_manual", true)}
                          >
                            Elegir otro lote por excepción
                          </button>
                        )}
                        <label className="wide-field">Recomendaciones de almacenamiento
                          <input value={detalle.recomendaciones_almacenamiento} onChange={(event) => actualizarDetalleDespacho(index, "recomendaciones_almacenamiento", event.target.value)} />
                        </label>
                        {detalle.seleccion_manual && (
                          <label className="wide-field fefo-manual-warning">Justificación obligatoria para apartarse de FEFO
                            <textarea
                              rows={2}
                              value={detalle.justificacion_seleccion_manual}
                              onChange={(event) => actualizarDetalleDespacho(index, "justificacion_seleccion_manual", event.target.value)}
                              maxLength={500}
                            />
                          </label>
                        )}
                        <label className="wide-field">Observaciones del lote
                          <input value={detalle.observaciones} onChange={(event) => actualizarDetalleDespacho(index, "observaciones", event.target.value)} />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={cerrarDespachoForm}>Cancelar</button>
              <button className="primary-btn infra-save-btn" type="button" onClick={guardarDespacho} disabled={accion === "guardar-despacho"}><Save size={16} /> Guardar despacho</button>
            </div>
          </div>
        </div>
      )}

      {proveedorForm && (
        <div className="modal-backdrop" onMouseDown={() => setProveedorForm(null)}>
          <div className="modal infra-small-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>{proveedorForm.id ? "Editar proveedor" : "Nuevo proveedor"}</h2>
                <p>Proveedor disponible para compra de medicamentos, dispositivos, insumos y reactivos.</p>
              </div>
              <button type="button" onClick={() => setProveedorForm(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="infra-form-grid">
              {[
                ["nombre", "Nombre *"],
                ["nit", "NIT"],
                ["contacto_nombre", "Contacto"],
                ["contacto_cargo", "Cargo contacto"],
                ["telefono", "Teléfono"],
                ["correo", "Correo"],
                ["direccion", "Dirección"],
                ["ciudad", "Ciudad"],
                ["departamento", "Departamento"],
              ].map(([campo, label]) => (
                <label key={campo}>{label}
                  <input value={String(proveedorForm[campo as keyof ProveedorForm] || "")} onChange={(event) => setProveedorForm({ ...proveedorForm, [campo]: event.target.value })} />
                </label>
              ))}
              <label>Estado
                <select value={proveedorForm.estado} onChange={(event) => setProveedorForm({ ...proveedorForm, estado: event.target.value })}>
                  {ESTADOS_PROVEEDOR.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="wide-field">Observaciones
                <textarea rows={3} value={proveedorForm.observaciones || ""} onChange={(event) => setProveedorForm({ ...proveedorForm, observaciones: event.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setProveedorForm(null)}>Cancelar</button>
              <button className="primary-btn" type="button" onClick={guardarProveedor} disabled={accion === "guardar-proveedor"}>Guardar proveedor</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MiniKpi({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone?: string }) {
  return (
    <article className={`kpi-card compact ${tone || ""}`}>
      <div className="kpi-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
