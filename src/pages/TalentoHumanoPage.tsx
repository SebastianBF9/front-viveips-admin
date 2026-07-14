import { AlertTriangle, BadgeCheck, CheckCircle2, Clock3, CreditCard, Download, Eye, FileText, Plus, Search, UserCheck, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  apiCall,
  crearProfesional,
  downloadBlob,
  downloadUrl,
  listarProfesionales,
  obtenerMiAcceso,
  obtenerServiciosProfesional,
  openAuthenticatedWindow,
} from "../api";
import type {
  DocumentoProfesional,
  FormacionAcademica,
  PermisosAcceso,
  ProfesionalAdmin,
  ServicioProfesionalAsignado,
} from "../types";
import { Loading } from "../ui/Loading";
import { CapacitacionesTalentoSection } from "./CapacitacionesTalentoSection";

const cursosPorCargo: Record<string, string[]> = {
  medico: ["seg_paciente", "atencion_violencia", "bls", "acls", "humanizacion"],
  enfermero_jefe: ["seg_paciente", "atencion_violencia", "bls", "acls", "humanizacion", "admin_medicamentos"],
  auxiliar_enfermeria: ["seg_paciente", "atencion_violencia", "bls", "humanizacion", "admin_medicamentos"],
  terapeutas: ["seg_paciente", "atencion_violencia", "bls", "humanizacion"],
  sin_cursos: [],
};

const documentosBase = [
  "cedula",
  "hoja_vida",
  "rut",
  "cert_bancaria",
  "tarjeta_prof",
  "rethus",
  "cert_experiencia",
  "ant_procuraduria",
  "ant_contraloria",
  "ant_policia",
  "ant_correctivas",
  "vac_carnet",
];

const especialidades = [
  "Medico General",
  "Medico Especialista",
  "Auxiliar de Enfermeria",
  "Jefe de Enfermeria",
  "Psicologo",
  "Terapeuta Fisico",
  "Terapeuta Ocupacional",
  "Terapeuta de Lenguaje",
  "Terapeuta Respiratorio",
  "Nutricionista",
  "Trabajo Social",
  "Cuidador",
  "Biomedico",
  "Personal Administrativo",
  "Otro",
];

function opcionesCargoComplementario(especialidad?: string | null) {
  const cargo = normalizar(especialidad);
  if (cargo === "terapeuta fisico") return ["Terapeuta Respiratorio"];
  if (cargo === "terapeuta respiratorio") return ["Terapeuta Fisico"];
  return [];
}

const nombresDocumentos: Record<string, string> = {
  cedula: "Copia de Cedula",
  hoja_vida: "Hoja de Vida",
  rut: "RUT",
  cert_bancaria: "Cert. Bancaria",
  formacion_academica: "Formacion Academica",
  tarjeta_prof: "Tarjeta Profesional",
  rethus: "ReTHUS",
  cert_experiencia: "Experiencia Laboral",
  ant_procuraduria: "Antec. Procuraduria",
  ant_contraloria: "Antec. Contraloria",
  ant_policia: "Antec. Policia",
  ant_correctivas: "Medidas Correctivas",
  vac_carnet: "Carnet Vacunacion",
  seg_paciente: "Seg. Paciente",
  atencion_violencia: "Atenc. Violencia Sexual",
  bls: "BLS",
  acls: "ACLS",
  humanizacion: "Humanizacion",
  admin_medicamentos: "Administracion Medicamentos",
  pgirasa: "PGIRASA",
  bioseguridad: "Bioseguridad",
  toma_muestras: "Toma de Muestras",
};

type EstadoDoc = "vigente" | "sin-cargar" | "vencido" | "por-vencer" | "incompleto";

interface AccionDocumento {
  label: string;
  endpoint: string;
  filename: string;
}

interface ChecklistItem {
  codigo: string;
  nombre: string;
  estado: EstadoDoc;
  detalle: string;
  documento?: DocumentoProfesional;
  documentos?: DocumentoProfesional[];
  acciones?: AccionDocumento[];
}

interface ContratoEstado {
  estado?: string | null;
  nombre_archivo?: string | null;
  fecha_generacion?: string | null;
}

function normalizar(valor?: string | null) {
  return (valor || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function iniciales(nombre?: string | null) {
  return (nombre || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function grupoCargo(especialidad?: string | null) {
  const cargo = normalizar(especialidad);
  if (["biomedico", "biomedica", "administrativo", "cuidador"].some((item) => cargo.includes(item)) || cargo === "otro") {
    return "sin_cursos";
  }
  if (cargo.includes("auxiliar") && cargo.includes("enfermer")) return "auxiliar_enfermeria";
  if (["jefe de enfermeria", "enfermero jefe", "enfermera jefe", "enfermero(a) jefe"].some((item) => cargo.includes(item))) {
    return "enfermero_jefe";
  }
  if (["medico", "psicolog", "nutricion", "trabajo social"].some((item) => cargo.includes(item))) return "medico";
  if (["terapeuta", "terapia", "fisioterapeuta", "fonoaudiologo", "fonoaudiologa", "fonoaudiologia"].some((item) => cargo.includes(item))) {
    return "terapeutas";
  }
  return "sin_cursos";
}

function codigosEsperados(especialidad?: string | null) {
  const grupo = grupoCargo(especialidad);
  return [...documentosBase.slice(0, 4), "formacion_academica", ...documentosBase.slice(4), ...(cursosPorCargo[grupo] || [])];
}

function tieneArchivoFormacion(item?: FormacionAcademica | null) {
  return Boolean(item && (item.ruta_archivo || item.nombre_archivo));
}

function tieneDiploma(item?: FormacionAcademica | null) {
  return Boolean(item && (item.diploma_ruta_archivo || item.diploma_nombre_archivo));
}

function tieneActa(item?: FormacionAcademica | null) {
  return Boolean(item && (item.acta_ruta_archivo || item.acta_nombre_archivo));
}

function estadoFormacion(formaciones: FormacionAcademica[] = []): EstadoDoc {
  const bachillerato = formaciones.find((item) => item.tipo === "bachillerato");
  const profesional = formaciones.find((item) => item.tipo === "profesional");
  if (bachillerato && profesional && tieneDiploma(profesional) && tieneActa(profesional)) return "vigente";
  if (formaciones.length > 0) return "incompleto";
  return "sin-cargar";
}

function accionesFormacion(formaciones: FormacionAcademica[] = []): AccionDocumento[] {
  const bachillerato = formaciones.find((item) => item.tipo === "bachillerato");
  const profesional = formaciones.find((item) => item.tipo === "profesional");
  const especializaciones = formaciones.filter((item) => item.tipo === "especializacion");
  const acciones: AccionDocumento[] = [];

  if (tieneArchivoFormacion(bachillerato)) {
    acciones.push({
      label: "Bach.",
      endpoint: `/formacion/archivo/${bachillerato!.id}`,
      filename: `bachillerato_${bachillerato!.id}`,
    });
  }
  if (tieneDiploma(profesional)) {
    acciones.push({
      label: "Diploma",
      endpoint: `/formacion/archivo/${profesional!.id}/diploma`,
      filename: `diploma_${profesional!.id}`,
    });
  }
  if (tieneActa(profesional)) {
    acciones.push({
      label: "Acta",
      endpoint: `/formacion/archivo/${profesional!.id}/acta`,
      filename: `acta_${profesional!.id}`,
    });
  }
  especializaciones
    .filter((item) => tieneArchivoFormacion(item))
    .forEach((item, index) => {
      acciones.push({
        label: `Espec. ${index + 1}`,
        endpoint: `/formacion/archivo/${item.id}`,
        filename: `especializacion_${item.id}`,
      });
    });

  return acciones;
}

function detalleFormacion(formaciones: FormacionAcademica[] = []) {
  const bachillerato = formaciones.find((item) => item.tipo === "bachillerato");
  const profesional = formaciones.find((item) => item.tipo === "profesional");
  const especializaciones = formaciones.filter((item) => item.tipo === "especializacion");
  const partes: string[] = [];

  if (bachillerato) {
    partes.push(`${bachillerato.institucion || "Bachillerato"}${bachillerato.anio_grado ? ` - ${bachillerato.anio_grado}` : ""}`);
  }
  if (profesional) {
    partes.push(`${tieneDiploma(profesional) ? "Diploma cargado" : "Diploma faltante"} - ${tieneActa(profesional) ? "Acta cargada" : "Acta faltante"}`);
  }
  especializaciones.forEach((item) => {
    partes.push(`${item.titulo || item.institucion || "Especializacion"}${item.nivel ? ` - ${item.nivel}` : ""}`);
  });

  return partes.length ? partes.join(" | ") : "Sin informacion registrada";
}

function etiquetaEstadoDoc(estado: EstadoDoc) {
  const labels: Record<EstadoDoc, string> = {
    vigente: "Vigente",
    "sin-cargar": "Sin cargar",
    vencido: "Vencido",
    "por-vencer": "Por vencer",
    incompleto: "Incompleto",
  };
  return labels[estado];
}

function checklistProfesional(profesional: ProfesionalAdmin): ChecklistItem[] {
  const docs = new Map<string, DocumentoProfesional[]>();
  (profesional.documentos || []).forEach((doc) => {
    const actuales = docs.get(doc.tipo_codigo) || [];
    actuales.push(doc);
    docs.set(doc.tipo_codigo, actuales);
  });

  return codigosEsperados(profesional.especialidad).map((codigo) => {
    if (codigo === "formacion_academica") {
      const estado = estadoFormacion(profesional.formaciones || []);
      return {
        codigo,
        nombre: nombresDocumentos[codigo],
        estado,
        detalle: estado === "vigente" ? detalleFormacion(profesional.formaciones || []) : estado === "incompleto" ? detalleFormacion(profesional.formaciones || []) : "No cargada",
        acciones: accionesFormacion(profesional.formaciones || []),
      };
    }

    const documentos = docs.get(codigo) || [];
    if (codigo === "cert_experiencia") {
      return {
        codigo,
        nombre: nombresDocumentos[codigo],
        estado: documentos.length ? "vigente" : "sin-cargar",
        detalle: `${documentos.length} archivo(s)`,
        documentos,
      };
    }

    const doc = documentos[0];
    if (!doc) {
      return { codigo, nombre: nombresDocumentos[codigo] || codigo, estado: "sin-cargar", detalle: "No cargado" };
    }

    const estadoNormalizado = (doc.estado || "vigente").replace(/_/g, "-") as EstadoDoc;
    return {
      codigo,
      nombre: nombresDocumentos[codigo] || doc.tipo_nombre || codigo,
      estado: estadoNormalizado === "vencido" || estadoNormalizado === "por-vencer" ? estadoNormalizado : "vigente",
      detalle: doc.fecha_vencimiento ? `Vence ${doc.fecha_vencimiento}` : "Sin vencimiento",
      documento: doc,
    };
  });
}

function resumenDocumental(profesional: ProfesionalAdmin) {
  const items = checklistProfesional(profesional);
  const cumplidos = items.filter((item) => item.estado === "vigente").length;
  const porVencer = items.filter((item) => item.estado === "por-vencer" || item.estado === "incompleto").length;
  const vencidos = items.filter((item) => item.estado === "vencido").length;
  const pendientes = items.filter((item) => item.estado === "sin-cargar" || item.estado === "incompleto").length;
  const faltantes = items.filter((item) => item.estado === "sin-cargar").length;
  return { total: items.length, cumplidos, porVencer, vencidos, pendientes, faltantes, items };
}

function nombreArchivoSeguro(valor: string) {
  return normalizar(valor).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "profesional";
}

function formatearFechaSistema(valor?: string | null) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

function normalizarEstadoContrato(valor?: string | null) {
  return normalizar(valor).replace(/[\s-]+/g, "_");
}

function esContratoValorFijo(especialidad?: string | null) {
  const cargo = normalizar(especialidad);
  return cargo.includes("biomedico") || cargo.includes("biomedica") || cargo.includes("administrativo") || cargo.includes("administrativa");
}

function infoContrato(profesional: ProfesionalAdmin, contrato?: ContratoEstado | null) {
  const estado = normalizarEstadoContrato(contrato?.estado || profesional.estado_contrato);
  if (!estado) {
    return {
      clave: "no-generado",
      texto: "Contrato",
      titulo: "Contrato no generado",
      detalle: "Sin contrato generado",
    };
  }
  if (estado.includes("firmado_completo") || estado.includes("completo") || estado.includes("finalizado")) {
    return {
      clave: "completo",
      texto: "Contrato",
      titulo: "Contrato completo",
      detalle: "Contrato firmado por ambas partes",
    };
  }
  if (estado.includes("firmado")) {
    return {
      clave: "firmado-profesional",
      texto: "Contrato",
      titulo: "Firmado por el profesional",
      detalle: "Pendiente por firma del gerente",
    };
  }
  return {
    clave: "pendiente-firma",
    texto: "Contrato",
    titulo: "Pendiente por firma del trabajador",
    detalle: "Contrato generado, pendiente por firma del profesional",
  };
}

function serviciosResumen(servicios: ServicioProfesionalAsignado[] = []) {
  const ordenados = [...servicios].sort((a, b) => Number(b.es_servicio_base) - Number(a.es_servicio_base));
  return {
    visibles: ordenados.slice(0, 3),
    restantes: Math.max(ordenados.length - 3, 0),
  };
}

function textoRegenerarContrato(contrato?: ContratoEstado | null) {
  const estado = normalizarEstadoContrato(contrato?.estado);
  if (!contrato) return "Generar nuevo contrato:";
  if (estado.includes("firmado_completo") || estado.includes("completo")) return "Regenerar contrato si necesitas reemplazar el actual:";
  return "Generar nuevo contrato si necesitas reemplazar el actual:";
}

function normalizarValorMoneda(valor: string) {
  return String(valor || "").replace(/[^0-9]/g, "");
}

function formatearMoneda(valor: string) {
  const limpio = normalizarValorMoneda(valor);
  if (!limpio) return "";
  return new Intl.NumberFormat("es-CO").format(Number(limpio));
}

function generarPasswordTemporal() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function TalentoHumanoPage() {
  const [profesionales, setProfesionales] = useState<ProfesionalAdmin[]>([]);
  const [tab, setTab] = useState<"listado" | "crear" | "capacitaciones">("listado");
  const [acceso, setAcceso] = useState<PermisosAcceso | null>(null);
  const [seleccionado, setSeleccionado] = useState<ProfesionalAdmin | null>(null);
  const [serviciosSeleccionado, setServiciosSeleccionado] = useState<ServicioProfesionalAsignado[]>([]);
  const [serviciosLoading, setServiciosLoading] = useState(false);
  const [contratoProfesional, setContratoProfesional] = useState<ProfesionalAdmin | null>(null);
  const [contratoEstado, setContratoEstado] = useState<ContratoEstado | null>(null);
  const [valorUrbano, setValorUrbano] = useState("");
  const [valorRural, setValorRural] = useState("");
  const [valorMensual, setValorMensual] = useState("");
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState("");
  const [vistaEstado, setVistaEstado] = useState<"activos" | "inactivos">("activos");
  const [estado, setEstado] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    cedula: "",
    email: "",
    telefono: "",
    especialidad: "",
    cargo_complementario: "",
    password: "",
  });

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const [data, permisos] = await Promise.all([listarProfesionales(), obtenerMiAcceso()]);
      setProfesionales((data.profesionales || []) as ProfesionalAdmin[]);
      setAcceso(permisos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar talento humano");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const puedeCrearProfesionales = Boolean(acceso?.permiso_ver_todo || acceso?.permiso_crear_profesionales);
  const puedeVerCapacitaciones = Boolean(acceso?.permiso_ver_todo || acceso?.permiso_ver_capacitaciones);

  const filtrados = useMemo(() => {
    const texto = normalizar(query);
    return profesionales.filter((profesional) => {
      const resumen = resumenDocumental(profesional);
      const matchTexto =
        !texto ||
        normalizar(profesional.nombre).includes(texto) ||
        normalizar(profesional.cedula).includes(texto) ||
        normalizar(profesional.email).includes(texto) ||
        normalizar(profesional.especialidad).includes(texto) ||
        (profesional.servicios || []).some((servicio) =>
          normalizar(`${servicio.codigo} ${servicio.nombre} ${servicio.rol_en_servicio || ""}`).includes(texto),
        );
      const matchVista = vistaEstado === "activos" ? Boolean(profesional.activo) : !profesional.activo;
      const matchEstado =
        estado === "todos" ||
        (estado === "pendientes" && resumen.pendientes > 0) ||
        (estado === "vencidos" && resumen.vencidos > 0);
      return matchTexto && matchVista && matchEstado;
    });
  }, [estado, profesionales, query, vistaEstado]);

  const kpis = useMemo(() => {
    const activos = profesionales.filter((profesional) => Boolean(profesional.activo)).length;
    const documentos = profesionales.reduce(
      (acumulado, profesional) => {
        const resumen = resumenDocumental(profesional);
        acumulado.vigentes += resumen.cumplidos;
        acumulado.porVencerIncompletos += resumen.porVencer;
        acumulado.vencidos += resumen.vencidos;
        acumulado.faltantes += resumen.faltantes;
        return acumulado;
      },
      { vigentes: 0, porVencerIncompletos: 0, vencidos: 0, faltantes: 0 },
    );
    return { activos, inactivos: profesionales.length - activos, ...documentos };
  }, [profesionales]);

  async function ejecutarAccion(clave: string, accion: () => Promise<void>) {
    setAccionLoading(clave);
    setError("");
    setSuccess("");
    try {
      await accion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible completar la accion");
    } finally {
      setAccionLoading("");
    }
  }

  async function descargarDocumento(documento: DocumentoProfesional) {
    await ejecutarAccion(`doc-${documento.id}`, async () => {
      await downloadBlob(`/documentos/descargar/${documento.id}`, documento.nombre_archivo || `documento_${documento.id}`, true);
    });
  }

  async function descargarAccionDocumento(accion: AccionDocumento) {
    await ejecutarAccion(`accion-doc-${accion.endpoint}`, async () => {
      await downloadBlob(accion.endpoint, accion.filename, true);
    });
  }

  function consultarRethus(cedula?: string | null) {
    if (cedula) {
      navigator.clipboard?.writeText(cedula).catch(() => {});
      setSuccess(`Cedula ${cedula} copiada. Pegala en Numero de Identificacion en ReTHUS.`);
    }
    window.open(
      "https://web.sispro.gov.co/THS/Cliente/ConsultasPublicas/ConsultaPublicaDeTHxIdentificacion.aspx",
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function descargarHojaVida(profesional: ProfesionalAdmin) {
    await ejecutarAccion(`pdf-${profesional.id}`, async () => {
      await downloadBlob(`/pdf/profesional/${profesional.id}`, `HV_${nombreArchivoSeguro(profesional.nombre)}.pdf`);
    });
  }

  function abrirCarnet(profesional: ProfesionalAdmin) {
    const params = new URLSearchParams({ profesionalId: String(profesional.id) });
    openAuthenticatedWindow(`/carnet?${params.toString()}`);
  }

  async function abrirDetalleProfesional(profesional: ProfesionalAdmin) {
    setSeleccionado(profesional);
    setServiciosSeleccionado([]);
    setServiciosLoading(true);
    try {
      const data = await obtenerServiciosProfesional(profesional.id);
      setServiciosSeleccionado(data.servicios || []);
    } catch {
      setServiciosSeleccionado([]);
    } finally {
      setServiciosLoading(false);
    }
  }

  function actualizarNuevoUsuario(campo: keyof typeof nuevoUsuario, valor: string) {
    setNuevoUsuario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function crearUsuario() {
    if (!puedeCrearProfesionales) {
      setError("No tienes permiso para crear profesionales.");
      return;
    }
    const payload = {
      ...nuevoUsuario,
      nombre: nuevoUsuario.nombre.trim(),
      cedula: nuevoUsuario.cedula.trim(),
      email: nuevoUsuario.email.trim(),
      telefono: nuevoUsuario.telefono.trim(),
      especialidad: nuevoUsuario.especialidad.trim(),
      cargo_complementario: nuevoUsuario.cargo_complementario.trim(),
      password: nuevoUsuario.password.trim(),
    };

    if (!payload.nombre || !payload.cedula || !payload.email || !payload.especialidad || !payload.password) {
      setError("Completa nombre, cedula, correo, especialidad y contrasena temporal.");
      return;
    }
    if (payload.password.length < 8) {
      setError("La contrasena temporal debe tener minimo 8 caracteres.");
      return;
    }

    await ejecutarAccion("crear-usuario", async () => {
      const data = await crearProfesional(payload);
      setSuccess(data.mensaje || `Usuario ${payload.nombre} creado correctamente`);
      setNuevoUsuario({ nombre: "", cedula: "", email: "", telefono: "", especialidad: "", cargo_complementario: "", password: "" });
      await cargar();
      setTab("listado");
    });
  }

  async function abrirContrato(profesional: ProfesionalAdmin) {
    setContratoProfesional(profesional);
    setContratoEstado(null);
    setValorUrbano("");
    setValorRural("");
    setValorMensual("");
    setFechaInicio(new Date().toISOString().slice(0, 10));
    await ejecutarAccion(`contrato-estado-${profesional.id}`, async () => {
      const data = await apiCall<{ contrato: ContratoEstado | null }>("GET", `/contratos/estado/${profesional.id}`);
      setContratoEstado(data.contrato || null);
    });
  }

  async function descargarContrato(profesional: ProfesionalAdmin) {
    await ejecutarAccion(`contrato-descarga-${profesional.id}`, async () => {
      await downloadBlob(`/contratos/descargar/${profesional.id}`, `Contrato_${nombreArchivoSeguro(profesional.nombre)}.pdf`);
    });
  }

  async function generarContrato() {
    if (!contratoProfesional) return;
    const contratoFijo = esContratoValorFijo(contratoProfesional.especialidad);
    const mensual = Number(normalizarValorMoneda(valorMensual));
    const urbano = Number(normalizarValorMoneda(valorUrbano));
    const rural = Number(normalizarValorMoneda(valorRural));
    if (!fechaInicio) {
      setError("Ingresa la fecha de inicio para generar el contrato.");
      return;
    }
    if (contratoFijo && (!mensual || mensual <= 0)) {
      setError("Ingresa el valor mensual del contrato.");
      return;
    }
    if (!contratoFijo && (!urbano || urbano <= 0 || !rural || rural <= 0)) {
      setError("Ingresa valor urbano y valor rural para generar el contrato.");
      return;
    }

    await ejecutarAccion(`contrato-generar-${contratoProfesional.id}`, async () => {
      await apiCall("POST", `/contratos/generar/${contratoProfesional.id}`, {
        ...(contratoFijo ? { valor_mensual: mensual } : { valor_urbano: urbano, valor_rural: rural }),
        fecha_inicio: fechaInicio,
      });
      const data = await apiCall<{ contrato: ContratoEstado | null }>("GET", `/contratos/estado/${contratoProfesional.id}`);
      setContratoEstado(data.contrato || null);
      await downloadBlob(`/contratos/descargar/${contratoProfesional.id}`, `Contrato_${nombreArchivoSeguro(contratoProfesional.nombre)}.pdf`);
      await cargar();
    });
  }

  async function firmarContratoGerente() {
    if (!contratoProfesional) return;
    await ejecutarAccion(`contrato-firma-${contratoProfesional.id}`, async () => {
      await apiCall("POST", `/contratos/firma-gerente/${contratoProfesional.id}`);
      const data = await apiCall<{ contrato: ContratoEstado | null }>("GET", `/contratos/estado/${contratoProfesional.id}`);
      setContratoEstado(data.contrato || null);
      await downloadBlob(`/contratos/descargar/${contratoProfesional.id}`, `Contrato_${nombreArchivoSeguro(contratoProfesional.nombre)}.pdf`);
      await cargar();
    });
  }

  if (loading) return <Loading text="Cargando talento humano..." />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Talento Humano</span>
          <h1>Profesionales</h1>
          <p>Consulta profesionales, documentos, contratos, PDF completo y carnet desde el admin nuevo.</p>
        </div>
        {puedeCrearProfesionales && (
          <button className="brand-action-btn" type="button" onClick={() => setTab("crear")}>
            <Plus size={18} />
            Nuevo profesional
          </button>
        )}
      </header>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <div className="kpi-grid five talent-kpis">
        <article className="kpi-card compact success">
          <div className="kpi-icon"><UserCheck size={18} /></div>
          <strong>{kpis.activos}</strong>
          <span>Profesionales activos</span>
        </article>
        <article className="kpi-card compact success">
          <div className="kpi-icon"><CheckCircle2 size={18} /></div>
          <strong>{kpis.vigentes}</strong>
          <span>Documentos vigentes</span>
        </article>
        <article className="kpi-card compact warning">
          <div className="kpi-icon"><Clock3 size={18} /></div>
          <strong>{kpis.porVencerIncompletos}</strong>
          <span>Por vencer / Incompletos</span>
        </article>
        <article className="kpi-card compact danger">
          <div className="kpi-icon"><AlertTriangle size={18} /></div>
          <strong>{kpis.vencidos}</strong>
          <span>Documentos vencidos</span>
        </article>
        <article className="kpi-card compact muted">
          <div className="kpi-icon"><FileText size={18} /></div>
          <strong>{kpis.faltantes}</strong>
          <span>Documentos faltantes</span>
        </article>
      </div>

      <div className="subtabs">
        <button className={tab === "listado" ? "active" : ""} type="button" onClick={() => setTab("listado")}>Listado</button>
        {puedeCrearProfesionales && (
          <button className={tab === "crear" ? "active" : ""} type="button" onClick={() => setTab("crear")}>Crear usuario</button>
        )}
        {puedeVerCapacitaciones && (
          <button className={tab === "capacitaciones" ? "active" : ""} type="button" onClick={() => setTab("capacitaciones")}>Capacitaciones</button>
        )}
      </div>

      {tab === "listado" && (
        <>
          <div className="toolbar">
            <label className="search-field">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, cedula, correo o cargo" />
            </label>
            <div className="professional-status-tabs" role="tablist" aria-label="Estado de profesionales">
              <button className={vistaEstado === "activos" ? "active" : ""} type="button" onClick={() => setVistaEstado("activos")}>Activos ({kpis.activos})</button>
              <button className={vistaEstado === "inactivos" ? "active" : ""} type="button" onClick={() => setVistaEstado("inactivos")}>Inactivos ({kpis.inactivos})</button>
            </div>
            <select value={estado} onChange={(event) => setEstado(event.target.value)}>
              <option value="todos">Todos los documentos</option>
              <option value="pendientes">Con pendientes</option>
              <option value="vencidos">Con vencidos</option>
            </select>
          </div>

          <section className="table-card">
        <div className="section-heading">
          <h2>Profesionales {vistaEstado}</h2>
          <p>{vistaEstado === "activos" ? "Profesionales disponibles para la operación actual." : "Usuarios retirados de la operación, conservados para consulta administrativa."}</p>
        </div>
        <table className="professionals-table">
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Especialidad</th>
              <th>Contacto</th>
              <th>Documentos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((profesional) => {
              const resumen = resumenDocumental(profesional);
              const contratoInfo = infoContrato(profesional);
              const servicios = serviciosResumen(profesional.servicios || []);
              return (
                <tr key={profesional.id}>
                  <td>
                    <div className="prof-info">
                      <div className="prof-avatar">{iniciales(profesional.nombre)}</div>
                      <div>
                        <div className="prof-nombre">{profesional.nombre}</div>
                        <div className="prof-cedula">CC: {profesional.cedula || "Sin cedula"}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="specialty-cell">
                      <span>{profesional.especialidad || "Sin especialidad"}</span>
                      {profesional.cargo_complementario && <small>Cargo complementario: {profesional.cargo_complementario}</small>}
                      {servicios.visibles.length > 0 ? (
                        <div className="service-chip-list">
                          {servicios.visibles.map((servicio) => (
                            <span className={servicio.es_servicio_base ? "base" : ""} key={servicio.id}>
                              {servicio.codigo} {servicio.nombre}
                            </span>
                          ))}
                          {servicios.restantes > 0 && <span>+{servicios.restantes}</span>}
                        </div>
                      ) : (
                        <small>Sin servicios asignados</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="contact-cell">
                      <span>{profesional.email || "Sin correo"}</span>
                      <small>{profesional.telefono || "Sin telefono"}</small>
                    </div>
                  </td>
                  <td>
                    <div className="docs-mini" title={`${resumen.cumplidos}/${resumen.total} documentos vigentes`}>
                      {resumen.items.map((item) => (
                        <span key={item.codigo} className={`doc-mini-badge ${item.estado}`} title={`${item.nombre}: ${item.detalle}`} />
                      ))}
                    </div>
                    <small>{resumen.cumplidos}/{resumen.total}</small>
                  </td>
                  <td><span className={`pill ${profesional.activo ? "activo" : "inactivo"}`}>{profesional.activo ? "Activo" : "Inactivo"}</span></td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => abrirDetalleProfesional(profesional)}><Eye size={15} /> Ver</button>
                      <button type="button" onClick={() => descargarHojaVida(profesional)} disabled={accionLoading === `pdf-${profesional.id}`}>
                        <Download size={15} /> PDF
                      </button>
                      <button
                        className={`contract-action ${contratoInfo.clave}`}
                        type="button"
                        onClick={() => abrirContrato(profesional)}
                        title={contratoInfo.titulo}
                      >
                        <FileText size={15} /> {contratoInfo.texto}
                      </button>
                      <button type="button" onClick={() => abrirCarnet(profesional)}><CreditCard size={15} /> Carnet</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && <div className="empty-state">No hay profesionales {vistaEstado} para el filtro seleccionado.</div>}
      </section>
        </>
      )}

      {tab === "crear" && puedeCrearProfesionales && (
        <section className="table-card create-user-card">
          <div className="section-heading">
            <h2>Crear nuevo profesional</h2>
            <p>Completa la informacion para crear el acceso al portal de profesionales.</p>
          </div>

          <div className="create-user-form">
            <label>
              Nombre completo <span>*</span>
              <input value={nuevoUsuario.nombre} onChange={(event) => actualizarNuevoUsuario("nombre", event.target.value)} placeholder="Ej: Maria Lopez" />
            </label>
            <label>
              Numero de cedula <span>*</span>
              <input value={nuevoUsuario.cedula} onChange={(event) => actualizarNuevoUsuario("cedula", event.target.value)} placeholder="Ej: 1234567890" />
            </label>
            <label>
              Correo electronico <span>*</span>
              <input value={nuevoUsuario.email} onChange={(event) => actualizarNuevoUsuario("email", event.target.value)} type="email" placeholder="correo@ejemplo.com" />
            </label>
            <label>
              Telefono / WhatsApp
              <input value={nuevoUsuario.telefono} onChange={(event) => actualizarNuevoUsuario("telefono", event.target.value)} placeholder="300 000 0000" />
            </label>
            <label>
              Especialidad / Cargo <span>*</span>
              <select
                value={nuevoUsuario.especialidad}
                onChange={(event) => {
                  const especialidad = event.target.value;
                  const opciones = opcionesCargoComplementario(especialidad);
                  setNuevoUsuario((actual) => ({
                    ...actual,
                    especialidad,
                    cargo_complementario: opciones.includes(actual.cargo_complementario) ? actual.cargo_complementario : "",
                  }));
                }}
              >
                <option value="">Seleccionar...</option>
                {especialidades.map((especialidad) => (
                  <option key={especialidad} value={especialidad}>{especialidad}</option>
                ))}
              </select>
            </label>
            {opcionesCargoComplementario(nuevoUsuario.especialidad).length > 0 && (
              <label className="cargo-complementario-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(nuevoUsuario.cargo_complementario)}
                  onChange={(event) => actualizarNuevoUsuario("cargo_complementario", event.target.checked ? opcionesCargoComplementario(nuevoUsuario.especialidad)[0] : "")}
                />
                <span>Agregar cargo complementario</span>
              </label>
            )}
            {nuevoUsuario.cargo_complementario && (
              <label>
                Cargo complementario <span>*</span>
                <select value={nuevoUsuario.cargo_complementario} onChange={(event) => actualizarNuevoUsuario("cargo_complementario", event.target.value)}>
                  {opcionesCargoComplementario(nuevoUsuario.especialidad).map((cargo) => <option key={cargo} value={cargo}>{cargo}</option>)}
                </select>
              </label>
            )}
            <label>
              Contrasena temporal <span>*</span>
              <div className="password-row">
                <input value={nuevoUsuario.password} onChange={(event) => actualizarNuevoUsuario("password", event.target.value)} placeholder="Minimo 8 caracteres" />
                <button type="button" onClick={() => actualizarNuevoUsuario("password", generarPasswordTemporal())}>Generar</button>
              </div>
            </label>
          </div>

          <div className="create-user-actions">
            <button className="secondary-btn pill-btn" type="button" onClick={() => setTab("listado")}>Cancelar</button>
            <button className="brand-action-btn" type="button" onClick={crearUsuario} disabled={accionLoading === "crear-usuario"}>
              <Plus size={18} />
              Crear usuario
            </button>
          </div>
        </section>
      )}

      {tab === "capacitaciones" && puedeVerCapacitaciones && <CapacitacionesTalentoSection />}

      {seleccionado && (
        <div className="modal-backdrop" onMouseDown={() => setSeleccionado(null)}>
          <div className="modal wide-modal professional-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="professional-detail-title">
              <h2><UserRound size={22} /> Detalle del profesional</h2>
              <button type="button" onClick={() => setSeleccionado(null)} aria-label="Cerrar modal">
                <X size={22} />
              </button>
            </div>

            <div className="modal-profile-header legacy-profile-header">
              <div className="avatar-circle">{iniciales(seleccionado.nombre)}</div>
              <div>
                <h2>{seleccionado.nombre}</h2>
                <p>{seleccionado.especialidad || "Sin cargo"}{seleccionado.cargo_complementario ? ` + ${seleccionado.cargo_complementario}` : ""}</p>
                <p>CC: {seleccionado.cedula || "Sin cedula"} - {seleccionado.email || "Sin correo"} - {seleccionado.telefono || "Sin telefono"}</p>
              </div>
            </div>

            <section className="flat-card legacy-section">
              <div className="legacy-section-heading">
                <h2>Servicios asignados</h2>
              </div>

              {serviciosLoading ? (
                <div className="empty-state">Cargando servicios asignados...</div>
              ) : serviciosSeleccionado.length ? (
                <div className="assigned-services-grid">
                  {serviciosSeleccionado.map((servicio) => (
                    <article className="assigned-service-card" key={servicio.id}>
                      <div>
                        <strong>{servicio.codigo} - {servicio.nombre}</strong>
                        <span>{servicio.grupo}</span>
                      </div>
                      <div className="assigned-service-tags">
                        <span className={`pill ${servicio.es_servicio_base ? "activo" : "proximo"}`}>
                          {servicio.es_servicio_base ? "Servicio base" : "Participante"}
                        </span>
                        <span className={`pill ${servicio.estado === "activo" ? "activo" : "pendiente"}`}>
                          {servicio.estado || "pendiente"}
                        </span>
                      </div>
                      <dl>
                        <div>
                          <dt>Rol</dt>
                          <dd>{servicio.rol_en_servicio || servicio.tipo_relacion || "Sin rol definido"}</dd>
                        </div>
                        <div>
                          <dt>Disponibilidad</dt>
                          <dd>{servicio.disponibilidad || "Sin dato"}</dd>
                        </div>
                        <div>
                          <dt>Distintivo</dt>
                          <dd>{servicio.distintivo || "No aplica"}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Este profesional no tiene servicios asignados.</div>
              )}
            </section>

            <section className="flat-card legacy-section">
              <div className="legacy-section-heading">
                <h2>Estado de documentos</h2>
              </div>
              <div className="modal-docs-grid">
                {checklistProfesional(seleccionado).map((item) => (
                  <article className={`modal-doc-item ${item.estado}`} key={item.codigo}>
                    <div>
                      <strong>{item.nombre}</strong>
                      <span>{item.detalle}</span>
                    </div>
                    <div className="doc-actions">
                      <span className={`pill ${item.estado}`}>{etiquetaEstadoDoc(item.estado)}</span>
                      {item.acciones?.map((accion) => (
                        <button
                          type="button"
                          key={`${item.codigo}-${accion.endpoint}`}
                          onClick={() => descargarAccionDocumento(accion)}
                          disabled={accionLoading === `accion-doc-${accion.endpoint}`}
                        >
                          <Download size={14} /> {accion.label}
                        </button>
                      ))}
                      {item.documentos?.map((documento, index) => (
                        <button
                          type="button"
                          key={documento.id}
                          onClick={() => descargarDocumento(documento)}
                          disabled={accionLoading === `doc-${documento.id}`}
                        >
                          <Download size={14} /> Exp. {index + 1}
                        </button>
                      ))}
                      {item.documento && (
                        <button type="button" onClick={() => descargarDocumento(item.documento!)} disabled={accionLoading === `doc-${item.documento.id}`}>
                          <Download size={14} /> Descargar
                        </button>
                      )}
                      {item.codigo === "rethus" && (
                        <button className="consult-btn" type="button" onClick={() => consultarRethus(seleccionado.cedula)}>
                          Consultar
                        </button>
                      )}
                      {!item.documento && !item.documentos?.length && !item.acciones?.length && item.codigo !== "rethus" && (
                        <small>No disponible</small>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="legacy-extra-section">
              <div className="bank-info-box">
                <strong>Datos bancarios:</strong>
                <span>{seleccionado.banco || "-"} - Cuenta Ahorros: {seleccionado.num_cuenta || "-"}</span>
              </div>

              <div className="system-info-box">
                <h2>Informacion del sistema</h2>
                <div className="system-info-grid">
                  <div>
                    <span>Fecha de creacion</span>
                    <strong>{formatearFechaSistema(seleccionado.fecha_creacion)}</strong>
                  </div>
                  <div>
                    <span>Ultimo ingreso</span>
                    <strong>{formatearFechaSistema(seleccionado.ultimo_acceso)}</strong>
                  </div>
                  <div>
                    <span>Fecha deshabilitacion</span>
                    <strong>{formatearFechaSistema(seleccionado.fecha_deshabilitacion)}</strong>
                  </div>
                  <div>
                    <span>Estado contrato</span>
                    <strong>{infoContrato(seleccionado).detalle}</strong>
                  </div>
                </div>
              </div>
            </section>

            <div className="modal-actions professional-modal-actions">
              <button className="brand-action-btn" type="button" onClick={() => descargarHojaVida(seleccionado)}>
                <Download size={16} />
                Descargar hoja de vida
              </button>
              <button className="primary-btn close-detail-btn" type="button" onClick={() => setSeleccionado(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {contratoProfesional && (
        <div className="modal-backdrop" onMouseDown={() => setContratoProfesional(null)}>
          <div className="modal contract-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="contract-modal-header">
              <div>
                <h2><FileText size={22} /> Generar contrato</h2>
                <p>{contratoProfesional.nombre} - {contratoProfesional.especialidad || "Sin cargo"}</p>
              </div>
              <button className="modal-close-btn" type="button" onClick={() => setContratoProfesional(null)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <div className="contract-modal-body">
              <div className={`contract-state-box ${infoContrato(contratoProfesional, contratoEstado).clave}`}>
                <BadgeCheck size={18} />
                <div>
                  <strong>{infoContrato(contratoProfesional, contratoEstado).detalle}</strong>
                  <span>
                    {contratoEstado?.nombre_archivo
                      ? `Archivo: ${contratoEstado.nombre_archivo}`
                      : contratoEstado?.fecha_generacion || contratoProfesional.fecha_contrato || "Sin archivo generado"}
                  </span>
                  {(contratoEstado || contratoProfesional.estado_contrato) && (
                    <button className="contract-download-btn" type="button" onClick={() => descargarContrato(contratoProfesional)}>
                      <Download size={15} /> Descargar contrato
                    </button>
                  )}
                </div>
              </div>

              <p className="contract-regenerate-text">{textoRegenerarContrato(contratoEstado)}</p>

              <div className="contract-form-grid">
                {esContratoValorFijo(contratoProfesional.especialidad) ? (
                  <label>
                    Valor mensual del contrato <span>*</span>
                    <input
                      value={valorMensual}
                      onChange={(event) => setValorMensual(formatearMoneda(event.target.value))}
                      inputMode="numeric"
                      placeholder="Ej: 600.000"
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      Valor urbano <span>*</span>
                      <input
                        value={valorUrbano}
                        onChange={(event) => setValorUrbano(formatearMoneda(event.target.value))}
                        inputMode="numeric"
                        placeholder="Ej: 50.000"
                      />
                    </label>
                    <label>
                      Valor rural <span>*</span>
                      <input
                        value={valorRural}
                        onChange={(event) => setValorRural(formatearMoneda(event.target.value))}
                        inputMode="numeric"
                        placeholder="Ej: 65.000"
                      />
                    </label>
                  </>
                )}
                <label className="contract-date-field">
                  Fecha de inicio del contrato <span>*</span>
                  <input value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} type="date" />
                </label>
              </div>

              <div className="contract-note">
                La fecha indicada sera la fecha de inicio visible dentro del contrato. El backend calculara la fecha final segun la duracion configurada.
                {esContratoValorFijo(contratoProfesional.especialidad) ? " Para este cargo el contrato se liquida por valor mensual fijo." : ""}
              </div>

              <div className="modal-actions contract-actions">
                <button className="secondary-btn pill-btn" type="button" onClick={() => setContratoProfesional(null)}>Cancelar</button>
                {normalizarEstadoContrato(contratoEstado?.estado || contratoProfesional.estado_contrato).includes("firmado") &&
                  !normalizarEstadoContrato(contratoEstado?.estado || contratoProfesional.estado_contrato).includes("completo") && (
                    <button className="secondary-btn pill-btn" type="button" onClick={firmarContratoGerente} disabled={accionLoading.includes("contrato-firma")}>
                      Firmar gerente
                    </button>
                  )}
                <button className="primary-btn gradient-btn" type="button" onClick={generarContrato} disabled={accionLoading.includes("contrato-generar")}>
                  Generar contrato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
