import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Box,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  MapPin,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  actualizarEquipoBiomedico,
  crearCategoriaEquipo,
  crearEquipoBiomedico,
  darBajaEquipoBiomedico,
  downloadBlob,
  downloadUrl,
  guardarAdquisicionEquipo,
  guardarApoyoTecnicoEquipo,
  guardarDatosTecnicosEquipo,
  listarAnexosEquipo,
  listarCategoriasEquipo,
  listarEquiposBiomedicos,
  listarServiciosIps,
  marcarAnexoNoAplica,
  obtenerAlertasEquipos,
  obtenerHojaVidaEquipo,
  registrarCalibracionEquipo,
  registrarMantenimientoEquipo,
  subirAnexoEquipo,
  subirArchivoEquipo,
} from "../api";
import type {
  EquipoAdquisicion,
  EquipoAlertaResumen,
  EquipoApoyoTecnico,
  EquipoAsignacion,
  EquipoBiomedico,
  EquipoDatosTecnicos,
  EquipoDocumento,
  EquipoHojaVida,
  EquipoMantenimiento,
  ServicioIps,
} from "../types";
import { Loading } from "../ui/Loading";

const UBICACION_INICIAL = "Oficina / Bodega principal VIVE IPS";
const PERIODICIDADES = ["Mensual", "Bimestral", "Trimestral", "Cuatrimestral", "Semestral", "Anual", "Cada 2 anos", "No aplica"];
const CLASIFICACIONES_BIOMEDICAS = [
  "Equipo biomedico",
  "Equipo industrial de uso hospitalario",
  "Equipo de comunicaciones e informatica",
  "Mobiliario asistencial",
  "Otro",
];
const CLASIFICACIONES_RIESGO = ["I", "IIA", "IIB", "III", "No aplica"];
const CATEGORIAS_FALLBACK = [
  "TENSIOMETRO ANEROIDE",
  "FONENDOSCOPIO",
  "NEBULIZADOR",
  "BALANZA DIGITAL",
  "PULSIOXIMETRO",
  "ASPIRADOR DE SECRECIONES",
  "TENS ANALOGO",
  "TERMOHIGROMETRO",
  "EQUIPO DE ORGANOS",
  "BALANZA PESA BEBE",
  "BALANZA",
  "GLUCOMETRO",
  "ULTRASONIDO",
];
const OPCIONES_REVISION = ["pasa", "falla", "na"] as const;
const INSPECCION_TECNICA_ITEMS = [
  "Inspeccion fisica",
  "Insp. condiciones ambientales",
  "Insp. sistema mecanico",
  "Insp. sistema electronico",
  "Insp. sistema electrico",
  "Insp. sistema neumatico",
  "Insp. sistema hidraulico",
  "Insp. sistema optico",
  "Inspeccion de accesorios",
];
const PRUEBAS_CUALITATIVAS_ITEMS = [
  "Chasis / Carcasa",
  "Soporte",
  "Enchufe / Receptaculo",
  "Cable de alimentacion",
  "Anclaje del cordon",
  "Proteccion / Fusible",
  "Tubos / Mangueras",
  "Cables",
  "Resistencias",
  "Controles / Switches",
  "Valvula, Electrovalvulas",
  "Ventilador / Compresor",
  "Sensor",
  "Bateria / Cargador",
  "Indicadores / Displays",
];
const PRUEBAS_CUANTITATIVAS_ITEMS = ["Resistencia de tierra (O)", "Corriente de fuga (uA)", "Presion de trabajo (lb, mmHg)"];

type EquipoForm = {
  id?: number;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  registro_invima: string;
  area: string;
  servicio: string;
  servicio_ips_id: string;
  ubicacion_actual: string;
  observaciones: string;
  requiere_calibracion: boolean;
  tipo_equipo: string;
  forma_adquisicion: string;
  fecha_adquisicion: string;
  acta_recibo: string;
  fecha_instalacion: string;
  fecha_inicio_operacion: string;
  garantia_meses: string;
  costo: string;
  vida_util: string;
  proveedor: string;
  fabricante: string;
  pais_fabricacion: string;
  fuente_alimentacion: string;
  tecnologia_predominante: string;
  voltaje_min: string;
  voltaje_max: string;
  corriente_min: string;
  corriente_max: string;
  potencia: string;
  frecuencia: string;
  presion: string;
  velocidad: string;
  peso: string;
  temperatura: string;
  otros_datos_instalacion: string;
  rango_voltaje: string;
  rango_corriente: string;
  rango_potencia: string;
  rango_presion: string;
  rango_velocidad: string;
  rango_temperatura: string;
  rango_humedad: string;
  recomendaciones_fabricante: string;
  clasificacion_biomedica: string;
  clasificacion_riesgo: string;
  periodicidad_mantenimiento: string;
  periodicidad_calibracion: string;
  manual_operacion: boolean;
  manual_mantenimiento: boolean;
  foto?: File | null;
  manualUsuario?: File | null;
  manualTecnico?: File | null;
};

type MantenimientoForm = {
  tipo: string;
  fecha_mantenimiento: string;
  hora_servicio: string;
  clase_servicio: string;
  proxima_fecha: string;
  responsable: string;
  requerimiento: string;
  descripcion: string;
  inspeccion_tecnica: Record<string, string>;
  diagnostico: string;
  mediciones_reparaciones: string;
  pruebas_cualitativas: Record<string, string>;
  pruebas_cuantitativas: Record<string, string>;
  horas_hombre: string;
  horas_paro: string;
  repuestos: string;
  repuestos_utilizados: Array<{ cantidad: string; descripcion: string }>;
  costo_repuesto: string;
  costo: string;
  estado_equipo_posterior: string;
  conclusiones_observaciones: string;
  recibido_por_nombre: string;
  recibido_por_cargo: string;
  recibido_por_cc: string;
};

type CalibracionForm = {
  fecha_calibracion: string;
  proxima_calibracion: string;
  certificado: string;
  entidad_calibradora: string;
  resultado: string;
  observaciones: string;
};

function normalizar(valor?: string | null) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function texto(valor?: string | number | null) {
  if (valor === 0) return "0";
  return valor ? String(valor) : "-";
}

function escapeHtml(valor?: string | number | null) {
  return texto(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function limpio(valor: string) {
  const v = String(valor || "").trim();
  return v ? v : null;
}

function numero(valor: string) {
  const v = String(valor || "").replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) && v ? n : null;
}

function boolEquipo(valor: unknown) {
  return valor === true || valor === 1 || valor === "1";
}

function extensionDesdeRuta(ruta?: string | null, fallback = ".pdf") {
  const match = String(ruta || "").match(/\.([A-Za-z0-9]+)(?:[?#].*)?$/);
  return match ? `.${match[1].toLowerCase()}` : fallback;
}

function formatearFecha(valor?: string | null) {
  if (!valor) return "-";
  const fecha = new Date(`${valor}`.includes("T") ? valor : `${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(fecha);
}

function formatearMoneda(valor?: number | string | null) {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n) || n === 0) return "-";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

function sumarMeses(fechaBase: string, meses: string) {
  const n = Number(meses);
  if (!fechaBase || !Number.isFinite(n) || n <= 0) return null;
  const fecha = new Date(`${fechaBase}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return null;
  fecha.setMonth(fecha.getMonth() + n);
  return fecha.toISOString().slice(0, 10);
}

function estadoLabel(estado?: string | null) {
  const labels: Record<string, string> = {
    disponible: "Disponible",
    asignacion_en_proceso: "Asignacion en proceso",
    asignado: "Asignado",
    pendiente_revision: "Pendiente revision",
    en_mantenimiento: "En mantenimiento",
    fuera_de_servicio: "Fuera de servicio",
    extraviado: "Extraviado",
    dado_de_baja: "Dado de baja",
  };
  return labels[estado || ""] || texto(estado);
}

function estadoClass(estado?: string | null) {
  if (estado === "disponible") return "activo";
  if (estado === "asignado") return "asignado";
  if (estado === "pendiente_revision" || estado === "en_mantenimiento" || estado === "asignacion_en_proceso") return "proximo";
  if (estado === "dado_de_baja" || estado === "fuera_de_servicio" || estado === "extraviado") return "inactivo";
  return "no_aplica";
}

function estadoAnexoLabel(estado?: string | null) {
  if (estado === "anexo") return "Anexo";
  if (estado === "no_aplica") return "No aplica";
  return "No anexo";
}

function nombreAnexo(doc: EquipoDocumento) {
  return doc.nombre || doc.tipo_documento || doc.codigo || "Documento";
}

function inicialForm(equipo?: EquipoBiomedico | null, hoja?: EquipoHojaVida | null): EquipoForm {
  const adquisicion = hoja?.adquisicion || {};
  const tecnicos = hoja?.datos_tecnicos || {};
  const apoyo = hoja?.apoyo_tecnico || {};
  return {
    id: equipo?.id,
    nombre: equipo?.nombre || "",
    marca: equipo?.marca || "",
    modelo: equipo?.modelo || "",
    serie: equipo?.serie || "",
    registro_invima: equipo?.registro_invima || "",
    area: equipo?.area || "",
    servicio: equipo?.servicio || "",
    servicio_ips_id: equipo?.servicio_ips_id ? String(equipo.servicio_ips_id) : "",
    ubicacion_actual: equipo?.ubicacion_actual || UBICACION_INICIAL,
    observaciones: equipo?.observaciones || "",
    requiere_calibracion: boolEquipo(equipo?.requiere_calibracion || apoyo.requiere_calibracion),
    tipo_equipo: tecnicos.tipo_equipo || "movil",
    forma_adquisicion: adquisicion.forma_adquisicion || "",
    fecha_adquisicion: adquisicion.fecha_adquisicion || "",
    acta_recibo: adquisicion.acta_recibo || "",
    fecha_instalacion: adquisicion.fecha_instalacion || "",
    fecha_inicio_operacion: adquisicion.fecha_inicio_operacion || "",
    garantia_meses: adquisicion.garantia_meses ? String(adquisicion.garantia_meses) : "",
    costo: adquisicion.costo ? String(adquisicion.costo) : "",
    vida_util: adquisicion.vida_util || "",
    proveedor: adquisicion.proveedor || "",
    fabricante: adquisicion.fabricante || "",
    pais_fabricacion: adquisicion.pais_fabricacion || "",
    fuente_alimentacion: tecnicos.fuente_alimentacion || "",
    tecnologia_predominante: tecnicos.tecnologia_predominante || "",
    voltaje_min: tecnicos.voltaje_min || "",
    voltaje_max: tecnicos.voltaje_max || "",
    corriente_min: tecnicos.corriente_min || "",
    corriente_max: tecnicos.corriente_max || "",
    potencia: tecnicos.potencia || "",
    frecuencia: tecnicos.frecuencia || "",
    presion: tecnicos.presion || "",
    velocidad: tecnicos.velocidad || "",
    peso: tecnicos.peso || "",
    temperatura: tecnicos.temperatura || "",
    otros_datos_instalacion: tecnicos.otros_datos_instalacion || "",
    rango_voltaje: tecnicos.rango_voltaje || "",
    rango_corriente: tecnicos.rango_corriente || "",
    rango_potencia: tecnicos.rango_potencia || "",
    rango_presion: tecnicos.rango_presion || "",
    rango_velocidad: tecnicos.rango_velocidad || "",
    rango_temperatura: tecnicos.rango_temperatura || "",
    rango_humedad: tecnicos.rango_humedad || "",
    recomendaciones_fabricante: tecnicos.recomendaciones_fabricante || "",
    clasificacion_biomedica: apoyo.clasificacion_biomedica || "",
    clasificacion_riesgo: apoyo.clasificacion_riesgo || "",
    periodicidad_mantenimiento: apoyo.periodicidad_mantenimiento || "",
    periodicidad_calibracion: apoyo.periodicidad_calibracion || "",
    manual_operacion: boolEquipo(apoyo.manual_operacion),
    manual_mantenimiento: boolEquipo(apoyo.manual_mantenimiento),
    foto: null,
    manualUsuario: null,
    manualTecnico: null,
  };
}

function inicialMantenimiento(): MantenimientoForm {
  const revisionInicial = (items: string[], valor = "pasa") => Object.fromEntries(items.map((item) => [item, valor]));
  return {
    tipo: "preventivo",
    fecha_mantenimiento: new Date().toISOString().slice(0, 10),
    hora_servicio: new Date().toTimeString().slice(0, 5),
    clase_servicio: "inspeccion",
    proxima_fecha: "",
    responsable: "",
    requerimiento: "Se realiza mantenimiento preventivo segun cronograma",
    descripcion: "",
    inspeccion_tecnica: revisionInicial(INSPECCION_TECNICA_ITEMS),
    diagnostico: "",
    mediciones_reparaciones: "Se realiza mantenimiento preventivo segun protocolo.\nSe revisa equipo, accesorios y condiciones generales de funcionamiento.",
    pruebas_cualitativas: revisionInicial(PRUEBAS_CUALITATIVAS_ITEMS),
    pruebas_cuantitativas: revisionInicial(PRUEBAS_CUANTITATIVAS_ITEMS),
    horas_hombre: "",
    horas_paro: "",
    repuestos: "",
    repuestos_utilizados: [{ cantidad: "", descripcion: "" }],
    costo_repuesto: "",
    costo: "",
    estado_equipo_posterior: "disponible",
    conclusiones_observaciones: "Se entrega el equipo en buen estado y funcionando correctamente.",
    recibido_por_nombre: "",
    recibido_por_cargo: "",
    recibido_por_cc: "",
  };
}

function inicialCalibracion(): CalibracionForm {
  return {
    fecha_calibracion: new Date().toISOString().slice(0, 10),
    proxima_calibracion: "",
    certificado: "",
    entidad_calibradora: "",
    resultado: "",
    observaciones: "",
  };
}

function StatCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone?: string }) {
  return (
    <article className={`kpi-card compact ${tone || ""}`}>
      <div className="kpi-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="infra-info-item">
      <span>{label}</span>
      <strong>{texto(value)}</strong>
    </div>
  );
}

export function InfraestructuraPage() {
  const [equipos, setEquipos] = useState<EquipoBiomedico[]>([]);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_FALLBACK);
  const [serviciosIps, setServiciosIps] = useState<ServicioIps[]>([]);
  const [alertas, setAlertas] = useState<EquipoAlertaResumen | null>(null);
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [menuEquipo, setMenuEquipo] = useState<number | null>(null);
  const [form, setForm] = useState<EquipoForm | null>(null);
  const [formMode, setFormMode] = useState<"crear" | "editar">("crear");
  const [hojaVida, setHojaVida] = useState<EquipoHojaVida | null>(null);
  const [hojaTab, setHojaTab] = useState("general");
  const [mantenimientoEquipo, setMantenimientoEquipo] = useState<EquipoBiomedico | null>(null);
  const [mantenimiento, setMantenimiento] = useState<MantenimientoForm>(inicialMantenimiento);
  const [calibracionEquipo, setCalibracionEquipo] = useState<EquipoBiomedico | null>(null);
  const [calibracion, setCalibracion] = useState<CalibracionForm>(inicialCalibracion);
  const [bajaEquipo, setBajaEquipo] = useState<EquipoBiomedico | null>(null);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [anexosEquipoId, setAnexosEquipoId] = useState<number | null>(null);
  const [anexos, setAnexos] = useState<EquipoDocumento[]>([]);

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const [inventario, categoriasData, serviciosData] = await Promise.all([
        listarEquiposBiomedicos(),
        listarCategoriasEquipo().catch(() => ({ categorias: [] })),
        listarServiciosIps().catch(() => ({ servicios: [] })),
      ]);
      setEquipos(inventario.equipos || []);
      setServiciosIps(
        (serviciosData.servicios || [])
          .filter((servicio) => servicio.estado === "habilitado" && (!servicio.tipo || servicio.tipo === "individual"))
          .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "es")),
      );
      const categoriasNuevas = (categoriasData.categorias || [])
        .map((cat) => normalizarCategoria(cat.nombre))
        .filter(Boolean);
      setCategorias([...new Set([...categoriasNuevas, ...CATEGORIAS_FALLBACK])].sort((a, b) => a.localeCompare(b, "es")));
      obtenerAlertasEquipos()
        .then(setAlertas)
        .catch(() => setAlertas(null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar infraestructura");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = normalizar(query);
    return equipos.filter((equipo) => {
      if (estado && equipo.estado !== estado) return false;
      if (!q) return true;
      return [
        equipo.codigo_interno,
        equipo.nombre,
        equipo.marca,
        equipo.modelo,
        equipo.serie,
        equipo.area,
        equipo.servicio,
        equipo.ubicacion_actual,
      ].some((valor) => normalizar(valor).includes(q));
    });
  }, [equipos, estado, query]);

  const kpis = useMemo(
    () => ({
      total: equipos.length,
      disponibles: equipos.filter((equipo) => equipo.estado === "disponible").length,
      asignados: equipos.filter((equipo) => equipo.estado === "asignado").length,
      revision: equipos.filter((equipo) => ["pendiente_revision", "en_mantenimiento", "asignacion_en_proceso"].includes(equipo.estado)).length,
      bajas: equipos.filter((equipo) => equipo.estado === "dado_de_baja").length,
    }),
    [equipos],
  );

  function normalizarCategoria(valor?: string | null) {
    return String(valor || "").trim().replace(/\s+/g, " ").toUpperCase();
  }

  function actualizarForm(campo: keyof EquipoForm, valor: string | boolean | File | null) {
    setForm((actual) => {
      if (!actual) return actual;
      const siguiente = { ...actual, [campo]: valor };
      if (campo === "requiere_calibracion" && valor === false) siguiente.periodicidad_calibracion = "";
      return siguiente;
    });
  }

  function actualizarFile(campo: "foto" | "manualUsuario" | "manualTecnico", event: ChangeEvent<HTMLInputElement>) {
    actualizarForm(campo, event.target.files?.[0] || null);
  }

  function actualizarMantenimiento(campo: keyof MantenimientoForm, valor: string) {
    setMantenimiento((actual) => ({ ...actual, [campo]: valor }));
  }

  function actualizarRevisionMantenimiento(campo: "inspeccion_tecnica" | "pruebas_cualitativas" | "pruebas_cuantitativas", item: string, valor: string) {
    setMantenimiento((actual) => ({
      ...actual,
      [campo]: { ...actual[campo], [item]: valor },
    }));
  }

  function actualizarRepuestoMantenimiento(index: number, campo: "cantidad" | "descripcion", valor: string) {
    setMantenimiento((actual) => ({
      ...actual,
      repuestos_utilizados: actual.repuestos_utilizados.map((repuesto, repuestoIndex) =>
        repuestoIndex === index ? { ...repuesto, [campo]: valor } : repuesto,
      ),
    }));
  }

  function agregarRepuestoMantenimiento() {
    setMantenimiento((actual) => ({
      ...actual,
      repuestos_utilizados: [...actual.repuestos_utilizados, { cantidad: "", descripcion: "" }],
    }));
  }

  function quitarRepuestoMantenimiento(index: number) {
    setMantenimiento((actual) => ({
      ...actual,
      repuestos_utilizados:
        actual.repuestos_utilizados.length > 1
          ? actual.repuestos_utilizados.filter((_, repuestoIndex) => repuestoIndex !== index)
          : [{ cantidad: "", descripcion: "" }],
    }));
  }

  function actualizarCalibracion(campo: keyof CalibracionForm, valor: string) {
    setCalibracion((actual) => ({ ...actual, [campo]: valor }));
  }

  async function ejecutar(clave: string, accionFn: () => Promise<void>) {
    setAccion(clave);
    setError("");
    setSuccess("");
    try {
      await accionFn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible completar la accion");
    } finally {
      setAccion("");
    }
  }

  async function abrirCrear() {
    setFormMode("crear");
    setForm(inicialForm());
  }

  async function abrirEditar(equipo: EquipoBiomedico) {
    setMenuEquipo(null);
    setAccion(`editar-${equipo.id}`);
    try {
      const hv = await obtenerHojaVidaEquipo(equipo.id);
      setFormMode("editar");
      setForm(inicialForm(hv.equipo, hv));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el equipo");
    } finally {
      setAccion("");
    }
  }

  async function abrirHojaVida(equipo: EquipoBiomedico) {
    setMenuEquipo(null);
    setAccion(`hv-${equipo.id}`);
    setHojaTab("general");
    try {
      const hv = await obtenerHojaVidaEquipo(equipo.id);
      setHojaVida(hv);
      listarAnexosEquipo(equipo.id)
        .then((data) => {
          setAnexos(data.anexos || []);
          setAnexosEquipoId(equipo.id);
        })
        .catch(() => {
          setAnexos(hv.documentos || []);
          setAnexosEquipoId(equipo.id);
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar la hoja de vida");
    } finally {
      setAccion("");
    }
  }

  function abrirQR(equipo: EquipoBiomedico) {
    if (!equipo.codigo_interno) {
      setError("Este equipo no tiene codigo interno para generar QR.");
      return;
    }
    const params = new URLSearchParams({ codigo: equipo.codigo_interno, nombre: equipo.nombre || "Equipo biomedico" });
    window.open(`/equipos/qr?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  function imprimirHojaVida() {
    if (!hojaVida) return;
    const equipo = hojaVida.equipo;
    const documentos = anexos.length ? anexos : hojaVida.documentos || [];
    const fechaImpresion = new Date().toLocaleDateString("es-CO");
    const fotoSrc = equipo.foto_equipo && equipo.codigo_interno
      ? downloadUrl(`/qr/equipos/${encodeURIComponent(equipo.codigo_interno)}/archivo/foto`)
      : "";
    const win = window.open("", "_blank");
    if (!win) {
      setError("El navegador bloqueo la ventana de impresion. Permite ventanas emergentes para este sitio.");
      return;
    }
    win.opener = null;
    win.document.write(`
      <html><head><title>Hoja de vida - ${escapeHtml(equipo.codigo_interno || "")}</title>
      <style>
        @page{size:A4;margin:11mm;}
        *{box-sizing:border-box;}
        html,body{margin:0;padding:0;background:white;}
        body{font-family:Arial,sans-serif;color:#1f2937;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .print-page{padding:0 4px;}
        .pdf-header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:3px solid #0f766e;padding-bottom:9px;margin-bottom:12px;break-inside:avoid;page-break-inside:avoid;}
        .pdf-header h1{margin:0;color:#0f766e;font-size:22px;line-height:1.1;}
        .pdf-header p{margin:4px 0 0;color:#64748b;font-size:13px;}
        .pdf-meta{text-align:right;color:#64748b;font-size:11px;line-height:1.35;white-space:nowrap;}
        .pdf-meta strong{display:block;color:#1B3A6B;font-size:12px;}
        .hero{display:flex;gap:14px;align-items:center;margin:10px 0 16px;break-inside:avoid;page-break-inside:avoid;}
        .hero-icon{width:42px;height:42px;border-radius:999px;background:#0f766e;color:white;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;flex:0 0 auto;}
        .hero h2{margin:0;color:#1f2937;font-size:19px;line-height:1.1;}
        .hero p{margin:4px 0 0;color:#64748b;font-size:13px;}
        .photo-strip{display:flex;align-items:center;gap:18px;margin:0 0 16px;break-inside:avoid;page-break-inside:avoid;}
        .photo-box{width:130px;height:92px;border:1px solid #dbe3ea;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto;}
        .photo-box img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
        .photo-empty{color:#94a3b8;font-weight:700;font-size:11px;text-align:center;padding:8px;}
        .photo-title span{display:block;color:#1f2937;font-size:12px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;}
        .photo-title strong{display:block;color:#1f2937;font-size:18px;line-height:1.15;margin-top:4px;}
        .photo-title p{margin:4px 0 0;color:#1f2937;font-size:14px;}
        .section{margin:15px 0 18px;}
        .section h3{margin:0 0 9px;color:#111827;font-size:16px;line-height:1.2;break-after:avoid;page-break-after:avoid;}
        .card-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;background:#f8fafc;border:1px solid #dbe3ea;border-radius:8px;padding:9px;break-inside:auto;page-break-inside:auto;}
        .field-card{background:#fff;border:1px solid #dbe3ea;border-radius:7px;padding:8px 9px;min-height:44px;break-inside:avoid;page-break-inside:avoid;}
        .field-card span{display:block;color:#1f2937;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;line-height:1.2;}
        .field-card strong{display:block;color:#1f2937;font-size:16px;line-height:1.15;margin-top:5px;overflow-wrap:anywhere;}
        .wide{grid-column:1 / -1;}
        table{width:100%;border-collapse:collapse;margin-top:8px;break-inside:auto;page-break-inside:auto;}
        thead{display:table-header-group;}
        tr{break-inside:avoid;page-break-inside:avoid;}
        th{background:#eef2f7;color:#334155;text-align:left;font-size:10px;text-transform:uppercase;padding:7px;border:1px solid #dbe3ea;}
        td{padding:7px;border:1px solid #dbe3ea;vertical-align:top;font-size:11px;}
        .empty-box{border:1px dashed #cbd5e1;border-radius:8px;padding:13px;color:#64748b;font-weight:700;}
        .assignment{border:1px dashed #cbd5e1;border-radius:8px;padding:13px;color:#64748b;font-size:12px;line-height:1.35;}
        .assignment strong{color:#1f2937;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
      </style></head><body><main class="print-page">
      <header class="pdf-header">
        <div>
          <h1>Hoja de vida del equipo biomedico</h1>
          <p>VIVE IPS - Modulo de Tecnovigilancia</p>
        </div>
        <div class="pdf-meta"><strong>${escapeHtml(equipo.codigo_interno)}</strong>${escapeHtml(fechaImpresion)}</div>
      </header>
      <section class="hero">
        <div class="hero-icon">HV</div>
        <div>
          <h2>${escapeHtml(equipo.nombre || "Equipo biomedico")}</h2>
          <p>${escapeHtml(equipo.marca)} - ${escapeHtml(equipo.modelo)} - Serie: ${escapeHtml(equipo.serie)}</p>
          <p>Codigo: ${escapeHtml(equipo.codigo_interno)} - Estado: ${escapeHtml(estadoLabel(equipo.estado))}</p>
        </div>
      </section>
      <section class="photo-strip">
        <div class="photo-box">${fotoSrc ? `<img src="${escapeHtml(fotoSrc)}" alt="Foto del equipo">` : `<div class="photo-empty">Sin foto cargada</div>`}</div>
        <div class="photo-title">
          <span>Foto del equipo</span>
          <strong>${escapeHtml(equipo.nombre)}</strong>
          <p>${escapeHtml(equipo.codigo_interno)} - ${escapeHtml(equipo.marca)} ${escapeHtml(equipo.modelo)}</p>
        </div>
      </section>
      ${seccionTarjetas("Datos generales", [
        ["Equipo", equipo.nombre],
        ["Codigo", equipo.codigo_interno],
        ["Marca", equipo.marca],
        ["Modelo", equipo.modelo],
        ["Serie", equipo.serie],
        ["Registro INVIMA", equipo.registro_invima],
        ["Area", equipo.area],
        ["Servicio", equipo.servicio],
        ["Ubicacion actual", equipo.ubicacion_actual],
        ["Estado", estadoLabel(equipo.estado)],
        ["Requiere calibracion", boolEquipo(equipo.requiere_calibracion) ? "Si" : "No"],
        ["Observaciones", equipo.observaciones, true],
        ["Foto", equipo.foto_equipo ? "Cargada" : "Sin cargar"],
        ["Manual usuario", equipo.manual_usuario ? "Cargado" : "Sin cargar"],
        ["Manual tecnico", equipo.manual_tecnico ? "Cargado" : "Sin cargar"],
      ])}
      ${seccionObjeto("Adquisicion, proveedor y garantia", hojaVida.adquisicion || {})}
      ${seccionObjeto("Registro tecnico de instalacion", hojaVida.datos_tecnicos || {})}
      ${seccionObjeto("Apoyo tecnico y clasificacion", hojaVida.apoyo_tecnico || {})}
      ${seccionDocumentos(documentos)}
      ${seccionTabla("Mantenimientos", ["Tipo","Reporte","Fecha","Proxima","Responsable","Costo repuesto","Costo total","Descripcion"], hojaVida.mantenimientos.map((m) => [m.tipo, m.numero_reporte, formatearFecha(m.fecha_mantenimiento), formatearFecha(m.proxima_fecha), m.responsable, formatearMoneda(m.costo_repuesto), formatearMoneda(m.costo), m.descripcion]))}
      ${seccionTabla("Calibraciones", ["Fecha","Proxima","Certificado","Entidad","Resultado","Observaciones"], hojaVida.calibraciones.map((c) => [formatearFecha(c.fecha_calibracion), formatearFecha(c.proxima_calibracion), c.certificado, c.entidad_calibradora, c.resultado, c.observaciones]))}
      ${seccionTabla("Movimientos", ["Fecha","Tipo","Descripcion","Ubicacion"], hojaVida.movimientos.map((m) => [formatearFecha(m.created_at), m.tipo_movimiento, m.descripcion, m.ubicacion_texto]))}
      ${seccionAsignacion(hojaVida.asignacion_activa)}
      </main></body></html>`);
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 400);
  }

  function jsonMantenimiento(valor: unknown) {
    if (!valor) return {};
    if (typeof valor === "string") {
      try {
        return JSON.parse(valor) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    if (typeof valor === "object") return valor as Record<string, unknown>;
    return {};
  }

  function repuestosMantenimiento(valor: EquipoMantenimiento["repuestos_utilizados"]) {
    if (!valor) return [];
    if (typeof valor === "string") {
      try {
        const parsed = JSON.parse(valor);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(valor) ? valor : [];
  }

  function marcaRevision(valor: unknown, esperado: string) {
    return String(valor || "").toLowerCase() === esperado ? "X" : "";
  }

  function filasRevision(items: string[], datos: Record<string, unknown>) {
    return items
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item)}</td><td>${marcaRevision(datos[item], "pasa")}</td><td>${marcaRevision(datos[item], "falla")}</td><td>${marcaRevision(datos[item], "na")}</td><td></td></tr>`,
      )
      .join("");
  }

  function filasPruebas(items: string[], datos: Record<string, unknown>) {
    return items
      .map(
        (item) =>
          `<tr><td>${marcaRevision(datos[item], "pasa")}</td><td>${marcaRevision(datos[item], "falla")}</td><td>${escapeHtml(item)}</td><td>${marcaRevision(datos[item], "na")}</td><td></td></tr>`,
      )
      .join("");
  }

  function imprimirMantenimiento(mantenimientoItem: EquipoMantenimiento) {
    if (!hojaVida) return;
    const equipo = hojaVida.equipo;
    const fechaImpresion = new Date().toLocaleDateString("es-CO");
    const inspeccion = jsonMantenimiento(mantenimientoItem.inspeccion_tecnica);
    const cualitativas = jsonMantenimiento(mantenimientoItem.pruebas_cualitativas);
    const cuantitativas = jsonMantenimiento(mantenimientoItem.pruebas_cuantitativas);
    const repuestosUsados = repuestosMantenimiento(mantenimientoItem.repuestos_utilizados);
    const win = window.open("", "_blank");
    if (!win) {
      setError("El navegador bloqueo la ventana de impresion. Permite ventanas emergentes para este sitio.");
      return;
    }
    win.opener = null;
    win.document.write(`
      <html><head><title>Reporte de servicio - ${escapeHtml(mantenimientoItem.numero_reporte || equipo.codigo_interno || "")}</title>
      <style>
        @page{size:A4;margin:8mm;}
        *{box-sizing:border-box;}
        html,body{margin:0;padding:0;background:#fff;}
        body{font-family:Arial,sans-serif;color:#263645;font-size:9px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .page{border:1px solid #7b8794;padding:6px;}
        .top{display:grid;grid-template-columns:1fr 1.3fr .9fr;align-items:start;gap:8px;margin-bottom:6px;}
        .brand{font-size:24px;color:#334155;line-height:.95;font-weight:700;}
        .brand span{color:#b03a48;}
        .company{text-align:center;color:#334155;font-weight:800;line-height:1.25;font-size:10px;}
        .report{border:1px solid #7b8794;text-align:center;padding:6px;font-weight:900;font-size:11px;color:#334155;}
        table{width:100%;border-collapse:collapse;table-layout:fixed;}
        th,td{border:1px solid #8c98a4;padding:3px 4px;vertical-align:middle;min-height:17px;}
        th{background:#e8edf2;color:#334155;text-transform:uppercase;font-size:8px;text-align:center;font-weight:900;}
        td.label{background:#f2f5f8;color:#334155;text-transform:uppercase;font-weight:900;width:13%;}
        td.center{text-align:center;}
        .section-title{background:#dfe6ed;text-align:center;text-transform:uppercase;font-weight:900;color:#334155;}
        .muted{color:#64748b;}
        .spacer td{height:18px;}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;}
        .footer{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;}
        .signature{height:70px;vertical-align:bottom;}
        .signature-line{height:34px;}
        .xcell{font-weight:900;text-align:center;font-size:12px;}
        .obs{height:42px;font-weight:800;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
      </style></head><body><main class="page">
        <header class="top">
          <div class="brand"><span>Medical</span><br>Solutions</div>
          <div class="company">
            J&amp;H MEDICAL SOLUTIONS<br>
            INGENIERIA BIOMEDICA<br>
            COMERCIALIZACION Y MANTENIMIENTO DE EQUIPOS BIOMEDICOS<br>
            <span class="muted">Reporte generado por VIVE IPS - ${escapeHtml(fechaImpresion)}</span>
          </div>
          <div class="report">REPORTE DE SERVICIO<br>N ${escapeHtml(mantenimientoItem.numero_reporte || "-")}</div>
        </header>
        <table>
          <tr><th colspan="4">Informacion del cliente</th><th colspan="4">Informacion del equipo</th><th colspan="4">Informacion del servicio</th></tr>
          <tr><td class="label">Nombre</td><td colspan="3">VIVE IPS - GRUPO MEDICO INTEGRAL</td><td class="label">Nombre</td><td colspan="3">${escapeHtml(equipo.nombre)}</td><td class="label">Fecha</td><td>${escapeHtml(formatearFecha(mantenimientoItem.fecha_mantenimiento))}</td><td class="label">Hora</td><td>${escapeHtml(mantenimientoItem.hora_servicio || "-")}</td></tr>
          <tr><td class="label">Ciudad</td><td colspan="3">${escapeHtml(equipo.ubicacion_actual || "-")}</td><td class="label">Marca</td><td colspan="3">${escapeHtml(equipo.marca)}</td><td class="label" colspan="2">Clase servicio</td><td colspan="2">${escapeHtml(mantenimientoItem.clase_servicio || mantenimientoItem.tipo || "-")}</td></tr>
          <tr><td class="label">Sede</td><td colspan="3">${escapeHtml(equipo.area || "-")}</td><td class="label">Modelo</td><td colspan="3">${escapeHtml(equipo.modelo)}</td><td class="label">M. preventivo</td><td class="xcell">${marcaRevision(mantenimientoItem.tipo, "preventivo")}</td><td class="label">Inspeccion</td><td class="xcell">${marcaRevision(mantenimientoItem.clase_servicio, "inspeccion")}</td></tr>
          <tr><td class="label">Telefono</td><td colspan="3">-</td><td class="label">Serie</td><td colspan="3">${escapeHtml(equipo.serie)}</td><td class="label">M. correctivo</td><td class="xcell">${marcaRevision(mantenimientoItem.tipo, "correctivo")}</td><td class="label">Validacion</td><td class="xcell">${marcaRevision(mantenimientoItem.clase_servicio, "validacion")}</td></tr>
          <tr><td class="label">Direccion</td><td colspan="3">-</td><td class="label">Area / Dpto</td><td colspan="3">${escapeHtml(equipo.servicio || equipo.area || "-")}</td><td class="label">Instalacion</td><td class="xcell">${marcaRevision(mantenimientoItem.clase_servicio, "instalacion")}</td><td class="label">Capacitacion</td><td class="xcell">${marcaRevision(mantenimientoItem.clase_servicio, "capacitacion")}</td></tr>
          <tr><td class="label">Contacto</td><td colspan="3">VIVE IPS</td><td class="label">Ubicacion</td><td colspan="3">${escapeHtml(equipo.ubicacion_actual || "-")}</td><td class="label">Cortesia</td><td class="xcell" colspan="3">${marcaRevision(mantenimientoItem.clase_servicio, "cortesia")}</td></tr>
          <tr><td class="label">Requerimiento</td><td colspan="11">${escapeHtml(mantenimientoItem.requerimiento || mantenimientoItem.descripcion || "-")}</td></tr>
          <tr class="spacer"><td colspan="12"></td></tr>
        </table>
        <table style="margin-top:6px;">
          <tr><th colspan="5">Inspeccion tecnica</th><th colspan="7">Diagnostico</th></tr>
          <tr><th>Check list</th><th>P</th><th>F</th><th>N/A</th><th>Comentarios</th><td colspan="7" rowspan="${INSPECCION_TECNICA_ITEMS.length + 1}" class="obs">${escapeHtml(mantenimientoItem.diagnostico || "-")}</td></tr>
          ${filasRevision(INSPECCION_TECNICA_ITEMS, inspeccion)}
        </table>
        <table style="margin-top:6px;">
          <tr><th>Mediciones y reparaciones efectuadas</th></tr>
          <tr><td class="obs">${escapeHtml(mantenimientoItem.mediciones_reparaciones || mantenimientoItem.descripcion || "-").replaceAll("\n", "<br>")}</td></tr>
        </table>
        <div class="two">
          <table>
            <tr><th>Pasa</th><th>Falla</th><th>Prueba cualitativa</th><th>N/A</th><th>Comentarios</th></tr>
            ${filasPruebas(PRUEBAS_CUALITATIVAS_ITEMS, cualitativas)}
          </table>
          <div>
            <table>
              <tr><th>Pasa</th><th>Falla</th><th>Test cuantitativo</th><th>N/A</th><th>Comentarios</th></tr>
              ${filasPruebas(PRUEBAS_CUANTITATIVAS_ITEMS, cuantitativas)}
            </table>
            <table style="margin-top:6px;">
              <tr><th colspan="2">Repuestos utilizados</th></tr>
              <tr><th>Cant.</th><th>Descripcion</th></tr>
              ${
                repuestosUsados.length
                  ? repuestosUsados.map((repuesto) => `<tr><td>${escapeHtml(repuesto.cantidad || "")}</td><td>${escapeHtml(repuesto.descripcion || "")}</td></tr>`).join("")
                  : `<tr><td colspan="2">No se registraron repuestos.</td></tr>`
              }
            </table>
          </div>
        </div>
        <div class="two">
          <table>
            <tr><th colspan="2">Estado final del equipo</th></tr>
            <tr><td>Funcionando correctamente</td><td class="center">${normalizar(mantenimientoItem.estado_equipo_posterior) === "disponible" ? "SI" : ""}</td></tr>
            <tr><td>Funcionando con observaciones</td><td class="center">${normalizar(mantenimientoItem.estado_equipo_posterior).includes("observ") ? "SI" : "NO"}</td></tr>
            <tr><td>Fuera de servicio</td><td class="center">${normalizar(mantenimientoItem.estado_equipo_posterior).includes("fuera") ? "SI" : "NO"}</td></tr>
          </table>
          <table>
            <tr><th>Conclusiones y observaciones</th></tr>
            <tr><td class="obs">${escapeHtml(mantenimientoItem.conclusiones_observaciones || mantenimientoItem.descripcion || "-").replaceAll("\n", "<br>")}</td></tr>
          </table>
        </div>
        <div class="footer">
          <table>
            <tr><th>Servicio realizado por</th></tr>
            <tr><td class="signature">Nombre: ${escapeHtml(mantenimientoItem.responsable || mantenimientoItem.firmado_por || "-")}<br>Cargo: ${escapeHtml(mantenimientoItem.responsable ? "Responsable tecnico" : "-")}<br>Firma: ________________________</td></tr>
          </table>
          <table>
            <tr><th>Servicio recibido y aprobado por</th></tr>
            <tr><td class="signature">Nombre: ${escapeHtml(mantenimientoItem.recibido_por_nombre || "-")}<br>Cargo: ${escapeHtml(mantenimientoItem.recibido_por_cargo || "-")}<br>C.C.: ${escapeHtml(mantenimientoItem.recibido_por_cc || "-")}<br>Firma: ________________________</td></tr>
          </table>
        </div>
      </main></body></html>`);
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 400);
  }

  function labelCampo(key: string) {
    return key.replaceAll("_", " ");
  }

  function valorCampo(value: unknown) {
    if (typeof value === "boolean" || value === 1 || value === 0) return boolEquipo(value) ? "Si" : "No";
    return value as string | number | null | undefined;
  }

  function seccionTarjetas(titulo: string, items: Array<[string, unknown, boolean?]>) {
    const contenido = items
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([label, value, wide]) => `<div class="field-card ${wide ? "wide" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(valorCampo(value) as string)}</strong></div>`)
      .join("");
    return `<section class="section"><h3>${escapeHtml(titulo)}</h3><div class="card-grid">${contenido || `<div class="field-card wide"><strong>Sin informacion registrada.</strong></div>`}</div></section>`;
  }

  function seccionObjeto(titulo: string, obj: Record<string, unknown>) {
    const entries = Object.entries(obj)
      .filter(([key]) => !["id", "equipo_id", "created_at", "updated_at"].includes(key))
      .map(([key, value]) => [labelCampo(key), valorCampo(value)] as [string, unknown]);
    return seccionTarjetas(titulo, entries);
  }

  function estadoAnexoPdf(doc: EquipoDocumento) {
    if (doc.estado_anexo === "anexo") return "anexo";
    if (doc.estado_anexo === "no_aplica") return "no_aplica";
    return "no_anexo";
  }

  function seccionDocumentos(documentos: EquipoDocumento[]) {
    if (!documentos.length) return `<section class="section"><h3>Documentos anexos</h3><div class="empty-box">No hay documentos anexos registrados.</div></section>`;
    return `<section class="section"><h3>Documentos anexos</h3><table><thead><tr><th>N</th><th>Documento</th><th>Anexo</th><th>No anexo</th><th>No aplica</th></tr></thead><tbody>${documentos
      .map((doc, index) => {
        const estado = estadoAnexoPdf(doc);
        return `<tr><td>${index + 1}</td><td>${escapeHtml(nombreAnexo(doc))}</td><td>${estado === "anexo" ? "X" : ""}</td><td>${estado === "no_anexo" ? "X" : ""}</td><td>${estado === "no_aplica" ? "X" : ""}</td></tr>`;
      })
      .join("")}</tbody></table></section>`;
  }

  function seccionTabla(titulo: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
    if (!rows.length) return `<section class="section"><h3>${escapeHtml(titulo)}</h3><div class="empty-box">Sin registros.</div></section>`;
    return `<section class="section"><h3>${escapeHtml(titulo)}</h3>${tablaFilas(headers, rows)}</section>`;
  }

  function seccionAsignacion(asignacion: EquipoAsignacion | null) {
    if (!asignacion) return `<section class="section"><h3>Asignacion activa / responsable actual</h3><div class="assignment"><strong>Sin asignacion activa</strong> Este equipo no esta asignado actualmente.</div></section>`;
    return `${seccionTarjetas("Asignacion activa / responsable actual", [
      ["Responsable", asignacion.responsable_nombre],
      ["Documento", asignacion.responsable_documento],
      ["Telefono", asignacion.responsable_telefono],
      ["Email", asignacion.responsable_email],
      ["Fecha entrega", formatearFecha(asignacion.fecha_entrega)],
      ["Fecha estimada devolucion", formatearFecha(asignacion.fecha_estimada_devolucion)],
      ["Direccion entrega", asignacion.direccion_entrega, true],
      ["Estado entrega", asignacion.estado_entrega],
      ["Observaciones", asignacion.observaciones, true],
    ])}`;
  }

  function tablaDetalle(obj: Record<string, unknown>) {
    const entradas = Object.entries(obj).filter(([key]) => !["id", "equipo_id", "created_at", "updated_at"].includes(key));
    if (!entradas.length) return "<p>Sin informacion registrada.</p>";
    return `<table><tbody>${entradas.map(([key, value]) => `<tr><th>${escapeHtml(key.replaceAll("_", " "))}</th><td>${escapeHtml(value as string)}</td></tr>`).join("")}</tbody></table>`;
  }

  function tablaFilas(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
    if (!rows.length) return "<p>Sin registros.</p>";
    return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`;
  }

  async function guardarEquipo() {
    if (!form) return;
    const nombre = normalizarCategoria(form.nombre);
    if (!nombre) {
      setError("Selecciona o escribe el nombre/categoria del equipo.");
      return;
    }

    await ejecutar("guardar-equipo", async () => {
      let equipoId = form.id || 0;
      const basePayload = {
        nombre,
        marca: limpio(form.marca),
        modelo: limpio(form.modelo),
        serie: limpio(form.serie),
        registro_invima: limpio(form.registro_invima),
        area: limpio(form.area),
        servicio: limpio(form.servicio),
        servicio_ips_id: form.servicio_ips_id ? Number(form.servicio_ips_id) : null,
        ubicacion_actual: limpio(form.ubicacion_actual) || UBICACION_INICIAL,
        requiere_calibracion: form.requiere_calibracion,
        observaciones: limpio(form.observaciones),
      };

      if (formMode === "crear") {
        const data = await crearEquipoBiomedico(basePayload);
        equipoId = data.equipo_id;
      } else {
        await actualizarEquipoBiomedico(equipoId, basePayload);
      }

      const vencimiento = sumarMeses(form.fecha_inicio_operacion || form.fecha_instalacion || form.fecha_adquisicion, form.garantia_meses);
      const adquisicion: EquipoAdquisicion = {
        forma_adquisicion: limpio(form.forma_adquisicion),
        fecha_adquisicion: limpio(form.fecha_adquisicion),
        acta_recibo: limpio(form.acta_recibo),
        fecha_instalacion: limpio(form.fecha_instalacion),
        fecha_inicio_operacion: limpio(form.fecha_inicio_operacion),
        garantia_meses: numero(form.garantia_meses),
        vencimiento_garantia: vencimiento,
        costo: numero(form.costo),
        vida_util: limpio(form.vida_util),
        proveedor: limpio(form.proveedor),
        fabricante: limpio(form.fabricante),
        pais_fabricacion: limpio(form.pais_fabricacion),
      };
      const tecnicos: EquipoDatosTecnicos = {
        tipo_equipo: form.tipo_equipo || "movil",
        fuente_alimentacion: limpio(form.fuente_alimentacion),
        tecnologia_predominante: limpio(form.tecnologia_predominante),
        voltaje_min: limpio(form.voltaje_min),
        voltaje_max: limpio(form.voltaje_max),
        corriente_min: limpio(form.corriente_min),
        corriente_max: limpio(form.corriente_max),
        potencia: limpio(form.potencia),
        frecuencia: limpio(form.frecuencia),
        presion: limpio(form.presion),
        velocidad: limpio(form.velocidad),
        peso: limpio(form.peso),
        temperatura: limpio(form.temperatura),
        otros_datos_instalacion: limpio(form.otros_datos_instalacion),
        rango_voltaje: limpio(form.rango_voltaje),
        rango_corriente: limpio(form.rango_corriente),
        rango_potencia: limpio(form.rango_potencia),
        rango_presion: limpio(form.rango_presion),
        rango_velocidad: limpio(form.rango_velocidad),
        rango_temperatura: limpio(form.rango_temperatura),
        rango_humedad: limpio(form.rango_humedad),
        recomendaciones_fabricante: limpio(form.recomendaciones_fabricante),
      };
      const apoyo: EquipoApoyoTecnico = {
        manual_operacion: form.manual_operacion,
        manual_mantenimiento: form.manual_mantenimiento,
        clasificacion_biomedica: limpio(form.clasificacion_biomedica),
        clasificacion_riesgo: limpio(form.clasificacion_riesgo),
        periodicidad_mantenimiento: limpio(form.periodicidad_mantenimiento),
        periodicidad_calibracion: form.requiere_calibracion ? limpio(form.periodicidad_calibracion) : null,
        requiere_calibracion: form.requiere_calibracion,
      };

      await guardarAdquisicionEquipo(equipoId, adquisicion);
      await guardarDatosTecnicosEquipo(equipoId, tecnicos);
      await guardarApoyoTecnicoEquipo(equipoId, apoyo);
      if (form.foto) await subirArchivoEquipo(equipoId, "foto", form.foto);
      if (form.manualUsuario) await subirArchivoEquipo(equipoId, "manual-usuario", form.manualUsuario);
      if (form.manualTecnico) await subirArchivoEquipo(equipoId, "manual-tecnico", form.manualTecnico);

      setForm(null);
      setSuccess(formMode === "crear" ? "Equipo creado correctamente." : "Equipo actualizado correctamente.");
      await cargar();
    });
  }

  async function guardarNuevaCategoria() {
    if (!form?.nombre) return;
    await ejecutar("categoria", async () => {
      const nombre = normalizarCategoria(form.nombre);
      await crearCategoriaEquipo(nombre);
      setCategorias((actual) => [...new Set([nombre, ...actual])].sort((a, b) => a.localeCompare(b, "es")));
      setSuccess("Categoria creada correctamente.");
    });
  }

  async function guardarMantenimiento() {
    if (!mantenimientoEquipo) return;
    if (!mantenimiento.fecha_mantenimiento) {
      setError("La fecha de mantenimiento es obligatoria.");
      return;
    }
    await ejecutar("mantenimiento", async () => {
      await registrarMantenimientoEquipo(mantenimientoEquipo.id, {
        tipo: mantenimiento.tipo,
        numero_reporte: null,
        fecha_mantenimiento: mantenimiento.fecha_mantenimiento,
        hora_servicio: limpio(mantenimiento.hora_servicio),
        clase_servicio: limpio(mantenimiento.clase_servicio),
        proxima_fecha: limpio(mantenimiento.proxima_fecha),
        responsable: limpio(mantenimiento.responsable),
        requerimiento: limpio(mantenimiento.requerimiento),
        descripcion: limpio(mantenimiento.descripcion),
        inspeccion_tecnica: mantenimiento.inspeccion_tecnica,
        diagnostico: limpio(mantenimiento.diagnostico),
        mediciones_reparaciones: limpio(mantenimiento.mediciones_reparaciones),
        pruebas_cualitativas: mantenimiento.pruebas_cualitativas,
        pruebas_cuantitativas: mantenimiento.pruebas_cuantitativas,
        horas_hombre: numero(mantenimiento.horas_hombre),
        horas_paro: numero(mantenimiento.horas_paro),
        repuestos: limpio(mantenimiento.repuestos),
        repuestos_utilizados: mantenimiento.repuestos_utilizados.filter((repuesto) => repuesto.cantidad.trim() || repuesto.descripcion.trim()),
        costo_repuesto: numero(mantenimiento.costo_repuesto),
        costo: numero(mantenimiento.costo),
        estado_equipo_posterior: limpio(mantenimiento.estado_equipo_posterior),
        conclusiones_observaciones: limpio(mantenimiento.conclusiones_observaciones),
        recibido_por_nombre: limpio(mantenimiento.recibido_por_nombre),
        recibido_por_cargo: limpio(mantenimiento.recibido_por_cargo),
        recibido_por_cc: limpio(mantenimiento.recibido_por_cc),
      });
      setMantenimientoEquipo(null);
      setMantenimiento(inicialMantenimiento());
      setSuccess("Mantenimiento registrado y firmado correctamente.");
      await cargar();
      if (hojaVida?.equipo.id === mantenimientoEquipo.id) await abrirHojaVida(mantenimientoEquipo);
    });
  }

  async function guardarCalibracion() {
    if (!calibracionEquipo) return;
    await ejecutar("calibracion", async () => {
      await registrarCalibracionEquipo(calibracionEquipo.id, {
        fecha_calibracion: calibracion.fecha_calibracion,
        proxima_calibracion: limpio(calibracion.proxima_calibracion),
        certificado: limpio(calibracion.certificado),
        entidad_calibradora: limpio(calibracion.entidad_calibradora),
        resultado: limpio(calibracion.resultado),
        observaciones: limpio(calibracion.observaciones),
      });
      setCalibracionEquipo(null);
      setCalibracion(inicialCalibracion());
      setSuccess("Calibracion registrada correctamente.");
      await cargar();
      if (hojaVida?.equipo.id === calibracionEquipo.id) await abrirHojaVida(calibracionEquipo);
    });
  }

  async function confirmarBaja() {
    if (!bajaEquipo || motivoBaja.trim().length < 8) {
      setError("Escribe un motivo de al menos 8 caracteres.");
      return;
    }
    await ejecutar("baja", async () => {
      await darBajaEquipoBiomedico(bajaEquipo.id, motivoBaja.trim());
      setBajaEquipo(null);
      setMotivoBaja("");
      setSuccess("Equipo dado de baja correctamente.");
      await cargar();
    });
  }

  async function cargarAnexos(equipoId: number) {
    setAnexosEquipoId(equipoId);
    try {
      const data = await listarAnexosEquipo(equipoId);
      setAnexos(data.anexos || []);
    } catch {
      setAnexos([]);
    }
  }

  async function subirAnexo(doc: EquipoDocumento, archivo?: File | null) {
    if (!anexosEquipoId || !archivo) return;
    await ejecutar(`anexo-${doc.codigo}`, async () => {
      await subirAnexoEquipo(anexosEquipoId, doc.codigo || doc.tipo_documento || "", archivo);
      await cargarAnexos(anexosEquipoId);
      setSuccess("Anexo cargado correctamente.");
    });
  }

  async function noAplicaAnexo(doc: EquipoDocumento) {
    if (!anexosEquipoId) return;
    await ejecutar(`anexo-na-${doc.codigo}`, async () => {
      await marcarAnexoNoAplica(anexosEquipoId, doc.codigo || doc.tipo_documento || "");
      await cargarAnexos(anexosEquipoId);
      setSuccess("Anexo marcado como no aplica.");
    });
  }

  function descargarAnexo(doc: EquipoDocumento) {
    if (!anexosEquipoId) return;
    const tipo = doc.codigo || doc.tipo_documento || "";
    downloadBlob(`/equipos/${anexosEquipoId}/anexos/${encodeURIComponent(tipo)}/descargar`, doc.nombre_archivo || "anexo", true).catch((err) =>
      setError(err instanceof Error ? err.message : "No fue posible descargar el anexo"),
    );
  }

  function descargarArchivoHojaVida(equipo: EquipoBiomedico, tipo: "foto" | "manual-usuario" | "manual-tecnico") {
    const nombres = {
      foto: `foto_equipo_${equipo.codigo_interno || equipo.id}${extensionDesdeRuta(equipo.foto_equipo, ".jpg")}`,
      "manual-usuario": `manual_usuario_${equipo.codigo_interno || equipo.id}${extensionDesdeRuta(equipo.manual_usuario)}`,
      "manual-tecnico": `manual_tecnico_${equipo.codigo_interno || equipo.id}${extensionDesdeRuta(equipo.manual_tecnico)}`,
    };

    ejecutar(`archivo-${tipo}-${equipo.id}`, async () => {
      await downloadBlob(`/equipos/${equipo.id}/${tipo}/descargar`, nombres[tipo]);
    });
  }

  function puedeDarBaja(equipo: EquipoBiomedico) {
    return !["asignado", "asignacion_en_proceso", "dado_de_baja"].includes(equipo.estado);
  }

  function renderEquipoActions(equipo: EquipoBiomedico) {
    return (
      <div className="infra-actions">
        <button className="qr" type="button" onClick={() => abrirQR(equipo)} title="Abrir QR imprimible">
          <QrCode size={15} /> QR
        </button>
        <button type="button" onClick={() => abrirHojaVida(equipo)} disabled={accion === `hv-${equipo.id}`}>
          <Eye size={15} /> Hoja de vida
        </button>
        <div className="infra-menu-wrap">
          <button type="button" onClick={() => setMenuEquipo(menuEquipo === equipo.id ? null : equipo.id)}>
            Opciones <ChevronDown size={14} />
          </button>
          {menuEquipo === equipo.id && (
            <div className="infra-menu">
              <button type="button" onClick={() => setMantenimientoEquipo(equipo)}>
                <Wrench size={14} /> Mantenimiento
              </button>
              {boolEquipo(equipo.requiere_calibracion) && (
                <button type="button" onClick={() => setCalibracionEquipo(equipo)}>
                  <CalendarClock size={14} /> Calibracion
                </button>
              )}
              {equipo.estado !== "dado_de_baja" && (
                <button type="button" onClick={() => abrirEditar(equipo)}>
                  <Edit3 size={14} /> Editar
                </button>
              )}
              {puedeDarBaja(equipo) && (
                <button className="danger" type="button" onClick={() => setBajaEquipo(equipo)}>
                  <Archive size={14} /> Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="page infrastructure-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Infraestructura</span>
          <h1>Tecnovigilancia</h1>
          <p>Inventario, hoja de vida, QR, anexos y mantenimientos de equipos biomedicos.</p>
        </div>
        <div className="infra-header-actions">
          <button className="secondary-btn" type="button" onClick={cargar} disabled={loading}>
            <RefreshCw size={17} /> Actualizar
          </button>
          <button className="brand-action-btn" type="button" onClick={abrirCrear}>
            <Plus size={17} /> Nuevo equipo
          </button>
        </div>
      </header>

      <div className="kpi-grid five">
        <StatCard icon={<Box size={18} />} label="Total equipos" value={kpis.total} />
        <StatCard icon={<BadgeCheck size={18} />} label="Disponibles" value={kpis.disponibles} tone="success" />
        <StatCard icon={<MapPin size={18} />} label="Asignados" value={kpis.asignados} />
        <StatCard icon={<Wrench size={18} />} label="Revision / mantenimiento" value={kpis.revision} tone="warning" />
        <StatCard icon={<Archive size={18} />} label="Bajas" value={kpis.bajas} tone="muted" />
      </div>

      {alertas?.total ? (
        <div className="infra-alert-box">
          <AlertTriangle size={19} />
          <div>
            <strong>{alertas.total} alerta(s) de infraestructura</strong>
            <span>
              {alertas.mantenimientos?.length || 0} mantenimientos, {alertas.calibraciones?.length || 0} calibraciones,{" "}
              {alertas.asignaciones_vencidas?.length || 0} asignaciones vencidas y {alertas.pendientes_revision?.length || 0} en revision.
            </span>
          </div>
        </div>
      ) : null}

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por equipo, codigo, serie, area o ubicacion" />
        </label>
        <select value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="disponible">Disponible</option>
          <option value="asignado">Asignado</option>
          <option value="pendiente_revision">Pendiente revision</option>
          <option value="en_mantenimiento">En mantenimiento</option>
          <option value="dado_de_baja">Dado de baja</option>
        </select>
      </div>

      {loading && <Loading text="Cargando equipos..." />}

      {!loading && (
        <section className="table-card infra-table-card">
          <div className="equipos-table-view">
            <table className="infra-table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Marca / Modelo</th>
                  <th>Serie</th>
                  <th>Area / Servicio</th>
                  <th>Ubicacion</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((equipo) => (
                  <tr key={equipo.id}>
                    <td>
                      <div className="infra-equipo-cell">
                        <div className="infra-equipo-icon">
                          <Wrench size={18} />
                        </div>
                        <div>
                          <strong>{texto(equipo.nombre)}</strong>
                          <span>Codigo: {texto(equipo.codigo_interno)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {texto(equipo.marca)}
                      <small>{texto(equipo.modelo)}</small>
                    </td>
                    <td>{texto(equipo.serie)}</td>
                    <td>
                      {texto(equipo.area)}
                      <small>{texto(equipo.servicio)}</small>
                    </td>
                    <td>{texto(equipo.ubicacion_actual)}</td>
                    <td>
                      <span className={`pill ${estadoClass(equipo.estado)}`}>{estadoLabel(equipo.estado)}</span>
                    </td>
                    <td>{renderEquipoActions(equipo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="equipos-card-view">
            {filtrados.map((equipo) => (
              <article className="equipo-card" key={equipo.id}>
                <div className="equipo-card-header">
                  <div className="infra-equipo-icon">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <strong>{texto(equipo.nombre)}</strong>
                    <span>Codigo: {texto(equipo.codigo_interno)}</span>
                  </div>
                </div>
                <div className="equipo-card-details">
                  <div>
                    <span>Marca / Modelo</span>
                    <strong>{texto(equipo.marca)}</strong>
                    <small>{texto(equipo.modelo)}</small>
                  </div>
                  <div>
                    <span>Serie</span>
                    <strong>{texto(equipo.serie)}</strong>
                  </div>
                  <div>
                    <span>Area / Servicio</span>
                    <strong>{texto(equipo.area)}</strong>
                    <small>{texto(equipo.servicio)}</small>
                  </div>
                  <div>
                    <span>Ubicacion</span>
                    <strong>{texto(equipo.ubicacion_actual)}</strong>
                  </div>
                </div>
                <div className="equipo-card-footer">
                  <span className={`pill ${estadoClass(equipo.estado)}`}>{estadoLabel(equipo.estado)}</span>
                  <div className="equipo-card-actions">{renderEquipoActions(equipo)}</div>
                </div>
              </article>
            ))}
          </div>

          {filtrados.length === 0 && <div className="empty-state">No hay equipos para los filtros seleccionados.</div>}
        </section>
      )}

      {form && (
        <div className="modal-backdrop" onMouseDown={() => setForm(null)}>
          <div className="modal wide-modal infra-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>{formMode === "crear" ? "Nuevo equipo biomedico" : "Editar equipo biomedico"}</h2>
                <p>{formMode === "crear" ? "El codigo interno se genera automaticamente." : "Codigo, estado y asignaciones se conservan desde sus flujos."}</p>
              </div>
              <button type="button" onClick={() => setForm(null)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <div className="infra-form-body">
              <FormSection title="Datos generales">
                <label>
                  Nombre / categoria *
                  <div className="infra-category-row">
                    <input list="categorias-equipo" value={form.nombre} onChange={(event) => actualizarForm("nombre", event.target.value)} />
                    <datalist id="categorias-equipo">
                      {categorias.map((categoria) => (
                        <option key={categoria} value={categoria} />
                      ))}
                    </datalist>
                    <button type="button" onClick={guardarNuevaCategoria} disabled={accion === "categoria"}>
                      <Plus size={15} />
                    </button>
                  </div>
                </label>
                <label>
                  Ubicacion inicial
                  <input value={form.ubicacion_actual} onChange={(event) => actualizarForm("ubicacion_actual", event.target.value)} />
                </label>
                <label>
                  Marca
                  <input value={form.marca} onChange={(event) => actualizarForm("marca", event.target.value)} />
                </label>
                <label>
                  Modelo
                  <input value={form.modelo} onChange={(event) => actualizarForm("modelo", event.target.value)} />
                </label>
                <label>
                  Serie
                  <input value={form.serie} onChange={(event) => actualizarForm("serie", event.target.value)} />
                </label>
                <label>
                  Registro INVIMA
                  <input value={form.registro_invima} onChange={(event) => actualizarForm("registro_invima", event.target.value)} />
                </label>
                <label>
                  Area
                  <input value={form.area} onChange={(event) => actualizarForm("area", event.target.value)} placeholder="Atencion domiciliaria" />
                </label>
                <label>
                  Servicio
                  <select
                    value={form.servicio_ips_id}
                    onChange={(event) => {
                      const valor = event.target.value;
                      const seleccionado = serviciosIps.find((servicio) => String(servicio.id) === valor);
                      actualizarForm("servicio_ips_id", valor);
                      actualizarForm("servicio", seleccionado ? `${seleccionado.codigo} - ${seleccionado.nombre}` : "");
                    }}
                  >
                    <option value="">Selecciona servicio individual</option>
                    {serviciosIps.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.codigo} - {servicio.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo
                  <select value={form.tipo_equipo} onChange={(event) => actualizarForm("tipo_equipo", event.target.value)}>
                    <option value="movil">Movil</option>
                    <option value="fijo">Fijo</option>
                  </select>
                </label>
                <label>
                  Foto del equipo
                  <input accept="image/*" onChange={(event) => actualizarFile("foto", event)} type="file" />
                </label>
                <label>
                  Manual de usuario
                  <input accept=".pdf,.doc,.docx" onChange={(event) => actualizarFile("manualUsuario", event)} type="file" />
                </label>
                <label>
                  Manual tecnico
                  <input accept=".pdf,.doc,.docx" onChange={(event) => actualizarFile("manualTecnico", event)} type="file" />
                </label>
                <label className="wide-field">
                  Observaciones
                  <textarea value={form.observaciones} onChange={(event) => actualizarForm("observaciones", event.target.value)} rows={2} />
                </label>
              </FormSection>

              <FormSection title="Adquisicion / garantia">
                <label>
                  Forma adquisicion
                  <input value={form.forma_adquisicion} onChange={(event) => actualizarForm("forma_adquisicion", event.target.value)} />
                </label>
                <label>
                  Fecha adquisicion
                  <input value={form.fecha_adquisicion} onChange={(event) => actualizarForm("fecha_adquisicion", event.target.value)} type="date" />
                </label>
                <label>
                  Acta recibo
                  <input value={form.acta_recibo} onChange={(event) => actualizarForm("acta_recibo", event.target.value)} />
                </label>
                <label>
                  Fecha instalacion
                  <input value={form.fecha_instalacion} onChange={(event) => actualizarForm("fecha_instalacion", event.target.value)} type="date" />
                </label>
                <label>
                  Inicio operacion
                  <input value={form.fecha_inicio_operacion} onChange={(event) => actualizarForm("fecha_inicio_operacion", event.target.value)} type="date" />
                </label>
                <label>
                  Garantia meses
                  <input value={form.garantia_meses} onChange={(event) => actualizarForm("garantia_meses", event.target.value)} inputMode="numeric" />
                </label>
                <InfoItem label="Vencimiento garantia" value={sumarMeses(form.fecha_inicio_operacion || form.fecha_instalacion || form.fecha_adquisicion, form.garantia_meses) || "Se calculara al guardar"} />
                <label>
                  Costo
                  <input value={form.costo} onChange={(event) => actualizarForm("costo", event.target.value)} inputMode="numeric" />
                </label>
                <label>
                  Vida util
                  <input value={form.vida_util} onChange={(event) => actualizarForm("vida_util", event.target.value)} placeholder="Ej: 10 anos" />
                </label>
                <label>
                  Proveedor
                  <input value={form.proveedor} onChange={(event) => actualizarForm("proveedor", event.target.value)} />
                </label>
                <label>
                  Fabricante
                  <input value={form.fabricante} onChange={(event) => actualizarForm("fabricante", event.target.value)} />
                </label>
                <label>
                  Pais fabricacion
                  <input value={form.pais_fabricacion} onChange={(event) => actualizarForm("pais_fabricacion", event.target.value)} />
                </label>
              </FormSection>

              <FormSection title="Registro tecnico de instalacion">
                {[
                  ["fuente_alimentacion", "Fuente alimentacion"],
                  ["tecnologia_predominante", "Tecnologia predominante"],
                  ["voltaje_min", "Voltaje minimo"],
                  ["voltaje_max", "Voltaje maximo"],
                  ["corriente_min", "Corriente minima"],
                  ["corriente_max", "Corriente maxima"],
                  ["potencia", "Potencia"],
                  ["frecuencia", "Frecuencia"],
                  ["presion", "Presion"],
                  ["velocidad", "Velocidad"],
                  ["peso", "Peso"],
                  ["temperatura", "Temperatura"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input value={String(form[key as keyof EquipoForm] || "")} onChange={(event) => actualizarForm(key as keyof EquipoForm, event.target.value)} />
                  </label>
                ))}
                <label className="wide-field">
                  Otros datos de instalacion
                  <textarea value={form.otros_datos_instalacion} onChange={(event) => actualizarForm("otros_datos_instalacion", event.target.value)} rows={2} />
                </label>
              </FormSection>

              <FormSection title="Registro tecnico de funcionamiento">
                {[
                  ["rango_voltaje", "Rango voltaje"],
                  ["rango_corriente", "Rango corriente"],
                  ["rango_potencia", "Rango potencia"],
                  ["rango_presion", "Rango presion"],
                  ["rango_velocidad", "Rango velocidad"],
                  ["rango_temperatura", "Rango temperatura"],
                  ["rango_humedad", "Rango humedad"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input value={String(form[key as keyof EquipoForm] || "")} onChange={(event) => actualizarForm(key as keyof EquipoForm, event.target.value)} />
                  </label>
                ))}
                <label className="wide-field">
                  Otras recomendaciones del fabricante
                  <textarea value={form.recomendaciones_fabricante} onChange={(event) => actualizarForm("recomendaciones_fabricante", event.target.value)} rows={2} />
                </label>
              </FormSection>

              <FormSection title="Apoyo tecnico y clasificacion">
                <label>
                  Clasificacion biomedica
                  <select value={form.clasificacion_biomedica} onChange={(event) => actualizarForm("clasificacion_biomedica", event.target.value)}>
                    <option value="">Selecciona clasificacion</option>
                    {form.clasificacion_biomedica && !CLASIFICACIONES_BIOMEDICAS.includes(form.clasificacion_biomedica) && (
                      <option value={form.clasificacion_biomedica}>{form.clasificacion_biomedica}</option>
                    )}
                    {CLASIFICACIONES_BIOMEDICAS.map((clasificacion) => (
                      <option key={clasificacion} value={clasificacion}>
                        {clasificacion}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Clasificacion riesgo
                  <select value={form.clasificacion_riesgo} onChange={(event) => actualizarForm("clasificacion_riesgo", event.target.value)}>
                    <option value="">Selecciona riesgo</option>
                    {form.clasificacion_riesgo && !CLASIFICACIONES_RIESGO.includes(form.clasificacion_riesgo) && (
                      <option value={form.clasificacion_riesgo}>{form.clasificacion_riesgo}</option>
                    )}
                    {CLASIFICACIONES_RIESGO.map((riesgo) => (
                      <option key={riesgo} value={riesgo}>
                        {riesgo}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Periodicidad mantenimiento
                  <select value={form.periodicidad_mantenimiento} onChange={(event) => actualizarForm("periodicidad_mantenimiento", event.target.value)}>
                    <option value="">Selecciona periodicidad</option>
                    {PERIODICIDADES.map((periodicidad) => (
                      <option key={periodicidad} value={periodicidad}>
                        {periodicidad}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Periodicidad calibracion
                  <select
                    disabled={!form.requiere_calibracion}
                    value={form.periodicidad_calibracion}
                    onChange={(event) => actualizarForm("periodicidad_calibracion", event.target.value)}
                  >
                    <option value="">Selecciona periodicidad</option>
                    {PERIODICIDADES.map((periodicidad) => (
                      <option key={periodicidad} value={periodicidad}>
                        {periodicidad}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="infra-check-field">
                  <input checked={form.manual_operacion} onChange={(event) => actualizarForm("manual_operacion", event.target.checked)} type="checkbox" />
                  Tiene manual de operacion
                </label>
                <label className="infra-check-field">
                  <input checked={form.manual_mantenimiento} onChange={(event) => actualizarForm("manual_mantenimiento", event.target.checked)} type="checkbox" />
                  Tiene manual de mantenimiento
                </label>
                <label className="infra-check-field infra-check-highlight">
                  <input checked={form.requiere_calibracion} onChange={(event) => actualizarForm("requiere_calibracion", event.target.checked)} type="checkbox" />
                  Requiere calibracion
                </label>
              </FormSection>
            </div>

            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button className="primary-btn infra-save-btn" type="button" onClick={guardarEquipo} disabled={accion === "guardar-equipo"}>
                <Save size={16} /> Guardar equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {hojaVida && (
        <HojaVidaModal
          accion={accion}
          anexos={anexos}
          descargaAnexo={descargarAnexo}
          descargarArchivoHojaVida={descargarArchivoHojaVida}
          hojaTab={hojaTab}
          hojaVida={hojaVida}
          imprimirHojaVida={imprimirHojaVida}
          noAplicaAnexo={noAplicaAnexo}
          setCalibracionEquipo={(equipo) => {
            setCalibracionEquipo(equipo);
            setCalibracion(inicialCalibracion());
          }}
          setHojaTab={setHojaTab}
          setHojaVida={setHojaVida}
          setMantenimientoEquipo={(equipo) => {
            setMantenimientoEquipo(equipo);
            setMantenimiento(inicialMantenimiento());
          }}
          subirAnexo={subirAnexo}
        />
      )}

      {mantenimientoEquipo && (
        <SimpleModal title="Registrar mantenimiento" subtitle={`${mantenimientoEquipo.codigo_interno || ""} - ${mantenimientoEquipo.nombre}`} onClose={() => setMantenimientoEquipo(null)}>
          <div className="infra-form-grid">
            <label>
              Tipo
              <select value={mantenimiento.tipo} onChange={(event) => actualizarMantenimiento("tipo", event.target.value)}>
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
              </select>
            </label>
            <label>
              Clase de servicio
              <select value={mantenimiento.clase_servicio} onChange={(event) => actualizarMantenimiento("clase_servicio", event.target.value)}>
                <option value="inspeccion">Inspeccion</option>
                <option value="validacion">Validacion</option>
                <option value="cortesia">Cortesia</option>
                <option value="capacitacion">Capacitacion</option>
                <option value="instalacion">Instalacion</option>
              </select>
            </label>
            <label>
              Fecha mantenimiento *
              <input value={mantenimiento.fecha_mantenimiento} onChange={(event) => actualizarMantenimiento("fecha_mantenimiento", event.target.value)} type="date" />
            </label>
            <label>
              Hora
              <input value={mantenimiento.hora_servicio} onChange={(event) => actualizarMantenimiento("hora_servicio", event.target.value)} type="time" />
            </label>
            <label>
              Proxima fecha
              <input value={mantenimiento.proxima_fecha} onChange={(event) => actualizarMantenimiento("proxima_fecha", event.target.value)} type="date" />
            </label>
            <label>
              Responsable
              <input value={mantenimiento.responsable} onChange={(event) => actualizarMantenimiento("responsable", event.target.value)} />
            </label>
            <label>
              Estado posterior
              <input value={mantenimiento.estado_equipo_posterior} onChange={(event) => actualizarMantenimiento("estado_equipo_posterior", event.target.value)} />
            </label>
            <label className="wide-field">
              Requerimiento
              <textarea value={mantenimiento.requerimiento} onChange={(event) => actualizarMantenimiento("requerimiento", event.target.value)} rows={2} />
            </label>
            <label className="wide-field">
              Diagnostico
              <textarea value={mantenimiento.diagnostico} onChange={(event) => actualizarMantenimiento("diagnostico", event.target.value)} rows={3} />
            </label>
            <label className="wide-field">
              Mediciones y reparaciones efectuadas
              <textarea
                value={mantenimiento.mediciones_reparaciones}
                onChange={(event) => actualizarMantenimiento("mediciones_reparaciones", event.target.value)}
                rows={3}
              />
            </label>
            <label>
              Horas hombre
              <input value={mantenimiento.horas_hombre} onChange={(event) => actualizarMantenimiento("horas_hombre", event.target.value)} inputMode="decimal" />
            </label>
            <label>
              Horas paro
              <input value={mantenimiento.horas_paro} onChange={(event) => actualizarMantenimiento("horas_paro", event.target.value)} inputMode="decimal" />
            </label>
            <label>
              Costo repuesto
              <input value={mantenimiento.costo_repuesto} onChange={(event) => actualizarMantenimiento("costo_repuesto", event.target.value)} inputMode="numeric" />
            </label>
            <label>
              Costo total
              <input value={mantenimiento.costo} onChange={(event) => actualizarMantenimiento("costo", event.target.value)} inputMode="numeric" />
            </label>
            <label className="wide-field">
              Repuestos
              <textarea value={mantenimiento.repuestos} onChange={(event) => actualizarMantenimiento("repuestos", event.target.value)} rows={2} />
            </label>
            <div className="wide-field maintenance-check-section">
              <div>
                <strong>Inspeccion tecnica</strong>
                <span>Marca cada punto como pasa, falla o no aplica.</span>
              </div>
              <div className="maintenance-check-grid">
                {INSPECCION_TECNICA_ITEMS.map((item) => (
                  <label key={item}>
                    {item}
                    <select value={mantenimiento.inspeccion_tecnica[item] || "na"} onChange={(event) => actualizarRevisionMantenimiento("inspeccion_tecnica", item, event.target.value)}>
                      {OPCIONES_REVISION.map((opcion) => (
                        <option key={opcion} value={opcion}>
                          {opcion === "na" ? "N/A" : opcion === "pasa" ? "Pasa" : "Falla"}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
            <div className="wide-field maintenance-check-section">
              <div>
                <strong>Prueba cualitativa</strong>
                <span>Condicion visual y funcional de componentes.</span>
              </div>
              <div className="maintenance-check-grid">
                {PRUEBAS_CUALITATIVAS_ITEMS.map((item) => (
                  <label key={item}>
                    {item}
                    <select value={mantenimiento.pruebas_cualitativas[item] || "na"} onChange={(event) => actualizarRevisionMantenimiento("pruebas_cualitativas", item, event.target.value)}>
                      {OPCIONES_REVISION.map((opcion) => (
                        <option key={opcion} value={opcion}>
                          {opcion === "na" ? "N/A" : opcion === "pasa" ? "Pasa" : "Falla"}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
            <div className="wide-field maintenance-check-section">
              <div>
                <strong>Prueba cuantitativa</strong>
                <span>Mediciones del equipo cuando apliquen.</span>
              </div>
              <div className="maintenance-check-grid">
                {PRUEBAS_CUANTITATIVAS_ITEMS.map((item) => (
                  <label key={item}>
                    {item}
                    <select value={mantenimiento.pruebas_cuantitativas[item] || "na"} onChange={(event) => actualizarRevisionMantenimiento("pruebas_cuantitativas", item, event.target.value)}>
                      {OPCIONES_REVISION.map((opcion) => (
                        <option key={opcion} value={opcion}>
                          {opcion === "na" ? "N/A" : opcion === "pasa" ? "Pasa" : "Falla"}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
            <div className="wide-field maintenance-parts-section">
              <div>
                <strong>Repuestos utilizados</strong>
                <button className="secondary-btn" type="button" onClick={agregarRepuestoMantenimiento}>
                  <Plus size={14} /> Agregar
                </button>
              </div>
              {mantenimiento.repuestos_utilizados.map((repuesto, index) => (
                <div className="maintenance-part-row" key={index}>
                  <input
                    value={repuesto.cantidad}
                    onChange={(event) => actualizarRepuestoMantenimiento(index, "cantidad", event.target.value)}
                    placeholder="Cant."
                    inputMode="numeric"
                  />
                  <input
                    value={repuesto.descripcion}
                    onChange={(event) => actualizarRepuestoMantenimiento(index, "descripcion", event.target.value)}
                    placeholder="Descripcion"
                  />
                  <button className="secondary-btn" type="button" onClick={() => quitarRepuestoMantenimiento(index)} aria-label="Quitar repuesto">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <label className="wide-field">
              Descripcion
              <textarea value={mantenimiento.descripcion} onChange={(event) => actualizarMantenimiento("descripcion", event.target.value)} rows={3} />
            </label>
            <label className="wide-field">
              Conclusiones y observaciones
              <textarea value={mantenimiento.conclusiones_observaciones} onChange={(event) => actualizarMantenimiento("conclusiones_observaciones", event.target.value)} rows={3} />
            </label>
            <label>
              Recibido por
              <input value={mantenimiento.recibido_por_nombre} onChange={(event) => actualizarMantenimiento("recibido_por_nombre", event.target.value)} />
            </label>
            <label>
              Cargo recibido
              <input value={mantenimiento.recibido_por_cargo} onChange={(event) => actualizarMantenimiento("recibido_por_cargo", event.target.value)} />
            </label>
            <label>
              C.C. recibido
              <input value={mantenimiento.recibido_por_cc} onChange={(event) => actualizarMantenimiento("recibido_por_cc", event.target.value)} />
            </label>
          </div>
          <div className="infra-signed-note">
            <FileCheck2 size={17} />
            Se guardara como mantenimiento firmado. El backend valida que el usuario tenga firma clinica registrada.
          </div>
          <div className="modal-actions">
            <button className="secondary-btn" type="button" onClick={() => setMantenimientoEquipo(null)}>
              Cancelar
            </button>
            <button className="primary-btn infra-save-btn" type="button" onClick={guardarMantenimiento} disabled={accion === "mantenimiento"}>
              <Save size={16} /> Guardar mantenimiento
            </button>
          </div>
        </SimpleModal>
      )}

      {calibracionEquipo && (
        <SimpleModal title="Registrar calibracion" subtitle={`${calibracionEquipo.codigo_interno || ""} - ${calibracionEquipo.nombre}`} onClose={() => setCalibracionEquipo(null)}>
          <div className="infra-form-grid">
            <label>
              Fecha calibracion *
              <input value={calibracion.fecha_calibracion} onChange={(event) => actualizarCalibracion("fecha_calibracion", event.target.value)} type="date" />
            </label>
            <label>
              Proxima calibracion
              <input value={calibracion.proxima_calibracion} onChange={(event) => actualizarCalibracion("proxima_calibracion", event.target.value)} type="date" />
            </label>
            <label>
              Certificado
              <input value={calibracion.certificado} onChange={(event) => actualizarCalibracion("certificado", event.target.value)} />
            </label>
            <label>
              Entidad calibradora
              <input value={calibracion.entidad_calibradora} onChange={(event) => actualizarCalibracion("entidad_calibradora", event.target.value)} />
            </label>
            <label className="wide-field">
              Resultado
              <input value={calibracion.resultado} onChange={(event) => actualizarCalibracion("resultado", event.target.value)} />
            </label>
            <label className="wide-field">
              Observaciones
              <textarea value={calibracion.observaciones} onChange={(event) => actualizarCalibracion("observaciones", event.target.value)} rows={3} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="secondary-btn" type="button" onClick={() => setCalibracionEquipo(null)}>
              Cancelar
            </button>
            <button className="primary-btn infra-save-btn" type="button" onClick={guardarCalibracion} disabled={accion === "calibracion"}>
              <Save size={16} /> Guardar calibracion
            </button>
          </div>
        </SimpleModal>
      )}

      {bajaEquipo && (
        <SimpleModal title="Eliminar equipo" subtitle={`${bajaEquipo.codigo_interno || ""} - ${bajaEquipo.nombre}`} onClose={() => setBajaEquipo(null)}>
          <div className="infra-danger-note">
            Esta accion marca el equipo como dado de baja. No se permite cuando tiene asignacion activa o en proceso.
          </div>
          <label>
            Motivo obligatorio *
            <textarea value={motivoBaja} onChange={(event) => setMotivoBaja(event.target.value)} rows={4} maxLength={500} />
          </label>
          <div className="modal-actions delete-modal-actions">
            <button className="secondary-btn" type="button" onClick={() => setBajaEquipo(null)}>
              Cancelar
            </button>
            <button className="primary-btn danger-btn danger-action-btn" type="button" onClick={confirmarBaja} disabled={accion === "baja"}>
              Confirmar eliminacion
            </button>
          </div>
        </SimpleModal>
      )}
    </section>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="infra-form-section">
      <h3>{title}</h3>
      <div className="infra-form-grid">{children}</div>
    </section>
  );
}

function SimpleModal({
  children,
  onClose,
  subtitle,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal infra-small-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="infra-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function HojaVidaModal({
  accion,
  anexos,
  descargaAnexo,
  descargarArchivoHojaVida,
  hojaTab,
  hojaVida,
  imprimirHojaVida,
  noAplicaAnexo,
  setCalibracionEquipo,
  setHojaTab,
  setHojaVida,
  setMantenimientoEquipo,
  subirAnexo,
}: {
  accion: string;
  anexos: EquipoDocumento[];
  descargaAnexo: (doc: EquipoDocumento) => void;
  descargarArchivoHojaVida: (equipo: EquipoBiomedico, tipo: "foto" | "manual-usuario" | "manual-tecnico") => void;
  hojaTab: string;
  hojaVida: EquipoHojaVida;
  imprimirHojaVida: () => void;
  noAplicaAnexo: (doc: EquipoDocumento) => void;
  setCalibracionEquipo: (equipo: EquipoBiomedico) => void;
  setHojaTab: (tab: string) => void;
  setHojaVida: (hoja: EquipoHojaVida | null) => void;
  setMantenimientoEquipo: (equipo: EquipoBiomedico) => void;
  subirAnexo: (doc: EquipoDocumento, archivo?: File | null) => void;
}) {
  const equipo = hojaVida.equipo;
  const tabs = [
    ["general", "General"],
    ["adquisicion", "Adquisicion"],
    ["tecnicos", "Datos tecnicos"],
    ["apoyo", "Apoyo tecnico"],
    ["anexos", "Anexos"],
    ["mantenimientos", "Mantenimientos"],
    ["movimientos", "Movimientos"],
  ];

  return (
    <div className="modal-backdrop" onMouseDown={() => setHojaVida(null)}>
      <div className="modal wide-modal infra-hv-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="infra-modal-header">
          <div>
            <h2>Hoja de vida</h2>
            <p>
              {texto(equipo.codigo_interno)} - {texto(equipo.nombre)}
            </p>
          </div>
          <div className="infra-modal-header-actions">
            <button type="button" onClick={imprimirHojaVida}>
              <Printer size={16} /> Imprimir
            </button>
            <button type="button" onClick={() => setHojaVida(null)} aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="tabs">
          {tabs.map(([key, label]) => (
            <button key={key} className={hojaTab === key ? "active" : ""} type="button" onClick={() => setHojaTab(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="infra-hv-body">
          {hojaTab === "general" && (
            <>
              {equipo.foto_equipo && equipo.codigo_interno && (
                <div className="infra-photo-strip">
                  <img src={downloadUrl(`/qr/equipos/${encodeURIComponent(equipo.codigo_interno)}/archivo/foto`)} alt="Foto del equipo" />
                  <div>
                    <strong>{equipo.nombre}</strong>
                    <span>{texto(equipo.codigo_interno)} - {texto(equipo.marca)} {texto(equipo.modelo)}</span>
                  </div>
                </div>
              )}
              {(equipo.foto_equipo || equipo.manual_usuario || equipo.manual_tecnico) && (
                <div className="infra-file-actions">
                  <strong>Archivos del equipo</strong>
                  <div>
                    {equipo.foto_equipo && (
                      <button type="button" onClick={() => descargarArchivoHojaVida(equipo, "foto")} disabled={accion === `archivo-foto-${equipo.id}`}>
                        <Download size={15} /> Foto
                      </button>
                    )}
                    {equipo.manual_usuario && (
                      <button type="button" onClick={() => descargarArchivoHojaVida(equipo, "manual-usuario")} disabled={accion === `archivo-manual-usuario-${equipo.id}`}>
                        <Download size={15} /> Manual de usuario
                      </button>
                    )}
                    {equipo.manual_tecnico && (
                      <button type="button" onClick={() => descargarArchivoHojaVida(equipo, "manual-tecnico")} disabled={accion === `archivo-manual-tecnico-${equipo.id}`}>
                        <Download size={15} /> Manual tecnico
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="detail-grid">
                <InfoItem label="Equipo" value={equipo.nombre} />
                <InfoItem label="Codigo" value={equipo.codigo_interno} />
                <InfoItem label="Marca" value={equipo.marca} />
                <InfoItem label="Modelo" value={equipo.modelo} />
                <InfoItem label="Serie" value={equipo.serie} />
                <InfoItem label="Registro INVIMA" value={equipo.registro_invima} />
                <InfoItem label="Area" value={equipo.area} />
                <InfoItem label="Servicio" value={equipo.servicio} />
                <InfoItem label="Ubicacion" value={equipo.ubicacion_actual} />
                <InfoItem label="Estado" value={estadoLabel(equipo.estado)} />
                <InfoItem label="Requiere calibracion" value={boolEquipo(equipo.requiere_calibracion) ? "Si" : "No"} />
                <InfoItem label="Observaciones" value={equipo.observaciones} />
              </div>
              {hojaVida.asignacion_activa && (
                <div className="infra-assignment-box">
                  <ClipboardList size={18} />
                  <div>
                    <strong>Asignacion activa</strong>
                    <span>
                      Responsable: {texto(hojaVida.asignacion_activa.responsable_nombre)} - Entrega:{" "}
                      {formatearFecha(hojaVida.asignacion_activa.fecha_entrega)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {hojaTab === "adquisicion" && (
            <div className="detail-grid">
              <InfoItem label="Forma adquisicion" value={hojaVida.adquisicion?.forma_adquisicion} />
              <InfoItem label="Fecha adquisicion" value={formatearFecha(hojaVida.adquisicion?.fecha_adquisicion)} />
              <InfoItem label="Acta recibo" value={hojaVida.adquisicion?.acta_recibo} />
              <InfoItem label="Fecha instalacion" value={formatearFecha(hojaVida.adquisicion?.fecha_instalacion)} />
              <InfoItem label="Inicio operacion" value={formatearFecha(hojaVida.adquisicion?.fecha_inicio_operacion)} />
              <InfoItem label="Garantia meses" value={hojaVida.adquisicion?.garantia_meses} />
              <InfoItem label="Vencimiento garantia" value={formatearFecha(hojaVida.adquisicion?.vencimiento_garantia)} />
              <InfoItem label="Costo" value={formatearMoneda(hojaVida.adquisicion?.costo)} />
              <InfoItem label="Vida util" value={hojaVida.adquisicion?.vida_util} />
              <InfoItem label="Proveedor" value={hojaVida.adquisicion?.proveedor} />
              <InfoItem label="Fabricante" value={hojaVida.adquisicion?.fabricante} />
              <InfoItem label="Pais fabricacion" value={hojaVida.adquisicion?.pais_fabricacion} />
            </div>
          )}

          {hojaTab === "tecnicos" && (
            <div className="detail-grid">
              {Object.entries(hojaVida.datos_tecnicos || {})
                .filter(([key]) => !["id", "equipo_id", "created_at", "updated_at"].includes(key))
                .map(([key, value]) => (
                  <InfoItem key={key} label={key.replaceAll("_", " ")} value={value as string} />
                ))}
            </div>
          )}

          {hojaTab === "apoyo" && (
            <div className="detail-grid">
              {Object.entries(hojaVida.apoyo_tecnico || {})
                .filter(([key]) => !["id", "equipo_id", "created_at", "updated_at"].includes(key))
                .map(([key, value]) => (
                  <InfoItem key={key} label={key.replaceAll("_", " ")} value={typeof value === "boolean" || value === 1 || value === 0 ? (boolEquipo(value) ? "Si" : "No") : (value as string)} />
                ))}
            </div>
          )}

          {hojaTab === "anexos" && (
            <div className="infra-anexos-grid">
              {anexos.length ? (
                anexos.map((doc) => (
                  <article className="infra-anexo-row" key={doc.codigo || doc.tipo_documento || doc.id}>
                    <div>
                      <strong>{nombreAnexo(doc)}</strong>
                      <span>{doc.nombre_archivo || doc.observaciones || "Sin archivo cargado"}</span>
                    </div>
                    <span className={`pill ${doc.estado_anexo === "anexo" ? "activo" : doc.estado_anexo === "no_aplica" ? "no_aplica" : "pendiente"}`}>
                      {estadoAnexoLabel(doc.estado_anexo)}
                    </span>
                    <div className="infra-anexo-actions">
                      {doc.estado_anexo === "anexo" && (
                        <button type="button" onClick={() => descargaAnexo(doc)}>
                          <Download size={14} /> Descargar
                        </button>
                      )}
                      <label>
                        <Upload size={14} /> Cargar
                        <input
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                          onChange={(event) => subirAnexo(doc, event.target.files?.[0])}
                          type="file"
                        />
                      </label>
                      <button type="button" onClick={() => noAplicaAnexo(doc)} disabled={accion === `anexo-na-${doc.codigo}`}>
                        No aplica
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">No hay catalogo de anexos para este equipo.</div>
              )}
            </div>
          )}

          {hojaTab === "mantenimientos" && (
            <div className="infra-history-section">
              <div className="infra-inline-actions">
                <button className="primary-btn" type="button" onClick={() => setMantenimientoEquipo(equipo)}>
                  <Wrench size={16} /> Registrar mantenimiento
                </button>
                {boolEquipo(equipo.requiere_calibracion) && (
                  <button className="secondary-btn" type="button" onClick={() => setCalibracionEquipo(equipo)}>
                    <CalendarClock size={16} /> Registrar calibracion
                  </button>
                )}
              </div>
              <DataTable
                empty="Sin mantenimientos registrados."
                headers={["Tipo", "Reporte", "Fecha", "Proxima", "Responsable", "Costo", "Estado posterior", "Acciones"]}
                rows={hojaVida.mantenimientos.map((m) => [
                  m.tipo,
                  m.numero_reporte,
                  formatearFecha(m.fecha_mantenimiento),
                  formatearFecha(m.proxima_fecha),
                  m.responsable,
                  formatearMoneda(m.costo),
                  m.estado_equipo_posterior,
                  <button className="secondary-btn" type="button" onClick={() => imprimirMantenimiento(m)}>
                    <Printer size={14} /> Imprimir
                  </button>,
                ])}
              />
              <DataTable
                empty="Sin calibraciones registradas."
                headers={["Fecha", "Proxima", "Certificado", "Entidad", "Resultado"]}
                rows={hojaVida.calibraciones.map((c) => [
                  formatearFecha(c.fecha_calibracion),
                  formatearFecha(c.proxima_calibracion),
                  c.certificado,
                  c.entidad_calibradora,
                  c.resultado,
                ])}
              />
            </div>
          )}

          {hojaTab === "movimientos" && (
            <DataTable
              empty="Sin movimientos registrados."
              headers={["Fecha", "Tipo", "Descripcion", "Ubicacion"]}
              rows={hojaVida.movimientos.map((m) => [formatearFecha(m.created_at), m.tipo_movimiento, m.descripcion, m.ubicacion_texto])}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DataTable({ empty, headers, rows }: { empty: string; headers: string[]; rows: Array<Array<ReactNode>> }) {
  if (!rows.length) return <div className="empty-state">{empty}</div>;
  return (
    <div className="infra-subtable">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{typeof cell === "string" || typeof cell === "number" || cell === null || cell === undefined ? texto(cell) : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
