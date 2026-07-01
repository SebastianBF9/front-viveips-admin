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
  proxima_fecha: string;
  responsable: string;
  descripcion: string;
  horas_hombre: string;
  horas_paro: string;
  repuestos: string;
  costo_repuesto: string;
  costo: string;
  estado_equipo_posterior: string;
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
  return {
    tipo: "preventivo",
    fecha_mantenimiento: new Date().toISOString().slice(0, 10),
    proxima_fecha: "",
    responsable: "",
    descripcion: "",
    horas_hombre: "",
    horas_paro: "",
    repuestos: "",
    costo_repuesto: "",
    costo: "",
    estado_equipo_posterior: "disponible",
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
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(`
      <html><head><title>Hoja de vida ${equipo.codigo_interno || ""}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111827;padding:28px;}
        h1{color:#1B3A6B;margin:0 0 6px;} h2{color:#1B3A6B;margin-top:24px;border-bottom:1px solid #dbe6f0;padding-bottom:6px;}
        table{width:100%;border-collapse:collapse;margin-top:10px;} td,th{border:1px solid #dbe6f0;padding:8px;text-align:left;font-size:12px;} th{background:#f8fafc;}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;} .item{border:1px solid #dbe6f0;padding:9px;border-radius:8px;} .item span{display:block;color:#64748b;font-size:11px;}
      </style></head><body>
      <h1>Hoja de vida de equipo biomedico</h1>
      <p>${texto(equipo.codigo_interno)} - ${texto(equipo.nombre)}</p>
      <h2>Datos generales</h2>
      <div class="grid">
        ${[
          ["Equipo", equipo.nombre],
          ["Marca / Modelo", `${texto(equipo.marca)} ${texto(equipo.modelo)}`],
          ["Serie", equipo.serie],
          ["Registro INVIMA", equipo.registro_invima],
          ["Area / Servicio", `${texto(equipo.area)} / ${texto(equipo.servicio)}`],
          ["Ubicacion", equipo.ubicacion_actual],
          ["Estado", estadoLabel(equipo.estado)],
          ["Requiere calibracion", boolEquipo(equipo.requiere_calibracion) ? "Si" : "No"],
        ]
          .map(([label, value]) => `<div class="item"><span>${label}</span><strong>${texto(value)}</strong></div>`)
          .join("")}
      </div>
      <h2>Adquisicion</h2>${tablaDetalle(hojaVida.adquisicion || {})}
      <h2>Datos tecnicos</h2>${tablaDetalle(hojaVida.datos_tecnicos || {})}
      <h2>Apoyo tecnico</h2>${tablaDetalle(hojaVida.apoyo_tecnico || {})}
      <h2>Mantenimientos</h2>${tablaFilas(["Tipo","Fecha","Proxima","Responsable","Descripcion"], hojaVida.mantenimientos.map((m) => [m.tipo, formatearFecha(m.fecha_mantenimiento), formatearFecha(m.proxima_fecha), m.responsable, m.descripcion]))}
      <h2>Calibraciones</h2>${tablaFilas(["Fecha","Proxima","Entidad","Resultado"], hojaVida.calibraciones.map((c) => [formatearFecha(c.fecha_calibracion), formatearFecha(c.proxima_calibracion), c.entidad_calibradora, c.resultado]))}
      </body></html>`);
    win.document.close();
    win.print();
  }

  function tablaDetalle(obj: Record<string, unknown>) {
    const entradas = Object.entries(obj).filter(([key]) => !["id", "equipo_id", "created_at", "updated_at"].includes(key));
    if (!entradas.length) return "<p>Sin informacion registrada.</p>";
    return `<table><tbody>${entradas.map(([key, value]) => `<tr><th>${key.replaceAll("_", " ")}</th><td>${texto(value as string)}</td></tr>`).join("")}</tbody></table>`;
  }

  function tablaFilas(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
    if (!rows.length) return "<p>Sin registros.</p>";
    return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${texto(cell)}</td>`).join("")}</tr>`)
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
        proxima_fecha: limpio(mantenimiento.proxima_fecha),
        responsable: limpio(mantenimiento.responsable),
        descripcion: limpio(mantenimiento.descripcion),
        horas_hombre: numero(mantenimiento.horas_hombre),
        horas_paro: numero(mantenimiento.horas_paro),
        repuestos: limpio(mantenimiento.repuestos),
        costo_repuesto: numero(mantenimiento.costo_repuesto),
        costo: numero(mantenimiento.costo),
        estado_equipo_posterior: limpio(mantenimiento.estado_equipo_posterior),
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
              Fecha mantenimiento *
              <input value={mantenimiento.fecha_mantenimiento} onChange={(event) => actualizarMantenimiento("fecha_mantenimiento", event.target.value)} type="date" />
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
            <label className="wide-field">
              Descripcion
              <textarea value={mantenimiento.descripcion} onChange={(event) => actualizarMantenimiento("descripcion", event.target.value)} rows={3} />
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
            <button className="primary-btn" type="button" onClick={guardarMantenimiento} disabled={accion === "mantenimiento"}>
              Guardar mantenimiento
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
            <button className="primary-btn" type="button" onClick={guardarCalibracion} disabled={accion === "calibracion"}>
              Guardar calibracion
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
                headers={["Tipo", "Reporte", "Fecha", "Proxima", "Responsable", "Costo", "Estado posterior"]}
                rows={hojaVida.mantenimientos.map((m) => [
                  m.tipo,
                  m.numero_reporte,
                  formatearFecha(m.fecha_mantenimiento),
                  formatearFecha(m.proxima_fecha),
                  m.responsable,
                  formatearMoneda(m.costo),
                  m.estado_equipo_posterior,
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

function DataTable({ empty, headers, rows }: { empty: string; headers: string[]; rows: Array<Array<string | number | null | undefined>> }) {
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
                <td key={cellIndex}>{texto(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
