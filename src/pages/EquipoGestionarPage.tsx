import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  asignarEquipoQr,
  buscarPacientesIpsHealthcare,
  clearSession,
  descargarPagareEquipo,
  downloadUrl,
  listarDepartamentos,
  listarMantenimientosEquipo,
  listarMunicipios,
  listarProfesionales,
  obtenerEquipoQrPublico,
  obtenerHojaVidaEquipo,
  obtenerMiPerfilProfesional,
  registrarDevolucionEquipoQr,
  verificarSesion,
} from "../api";
import type {
  EquipoAsignacion,
  EquipoBiomedico,
  EquipoHojaVida,
  PacienteIpsHealthcare,
  ProfesionalPerfil,
  UbicacionDepartamento,
  UbicacionMunicipio,
} from "../types";

type ProfesionalOption = {
  id: number;
  nombre?: string | null;
  cedula?: string | null;
  usuario_cedula?: string | null;
  telefono?: string | null;
  email?: string | null;
  especialidad?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  direccion?: string | null;
};

type AsignacionForm = {
  tipo: string;
  fechaDev: string;
  pacienteBusqueda: string;
  pacienteId: string;
  profesionalId: string;
  pacienteNombre: string;
  pacienteDocumento: string;
  pacienteTelefono: string;
  responsableNombre: string;
  responsableDocumento: string;
  responsableTelefono: string;
  responsableEmail: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  latitud: string;
  longitud: string;
  estadoEntrega: string;
  observaciones: string;
  acepta: boolean;
};

type DevolucionForm = {
  estadoFinal: string;
  estadoRecibe: string;
  latitud: string;
  longitud: string;
  observaciones: string;
};

const emptyAsignacionForm: AsignacionForm = {
  tipo: "paciente",
  fechaDev: "",
  pacienteBusqueda: "",
  pacienteId: "",
  profesionalId: "",
  pacienteNombre: "",
  pacienteDocumento: "",
  pacienteTelefono: "",
  responsableNombre: "",
  responsableDocumento: "",
  responsableTelefono: "",
  responsableEmail: "",
  ciudad: "",
  departamento: "",
  direccion: "",
  latitud: "",
  longitud: "",
  estadoEntrega: "",
  observaciones: "",
  acepta: false,
};

const emptyDevolucionForm: DevolucionForm = {
  estadoFinal: "pendiente_revision",
  estadoRecibe: "",
  latitud: "",
  longitud: "",
  observaciones: "",
};

function texto(valor?: string | number | null) {
  if (valor === undefined || valor === null || valor === "") return "-";
  return String(valor);
}

function fecha(valor?: string | null) {
  return valor ? String(valor).substring(0, 10) : "-";
}

function estadoLabel(estado?: string | null) {
  const labels: Record<string, string> = {
    disponible: "Disponible",
    asignado: "Asignado",
    asignacion_en_proceso: "Asignacion en proceso",
    pendiente_revision: "Pendiente revision",
    en_mantenimiento: "En mantenimiento",
    fuera_de_servicio: "Fuera de servicio",
    extraviado: "Extraviado",
    dado_de_baja: "Dado de baja",
    activa: "Activa",
  };
  return labels[estado || ""] || estado || "-";
}

function fechaInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fechaValida(valor?: string | null) {
  if (!valor) return null;
  const date = new Date(`${String(valor).substring(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sumarDias(valor: string, dias: number) {
  const date = fechaValida(valor);
  if (!date) return "";
  date.setDate(date.getDate() + dias);
  return fechaInput(date);
}

function normalizarTexto(valor?: string | null) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function mesesPorPeriodicidad(periodicidad?: string | null) {
  const textoNormalizado = normalizarTexto(periodicidad);
  if (!textoNormalizado) return 0;
  if (textoNormalizado.includes("mensual")) return 1;
  if (textoNormalizado.includes("bimensual")) return 2;
  if (textoNormalizado.includes("trimestral")) return 3;
  if (textoNormalizado.includes("semestral")) return 6;
  if (textoNormalizado.includes("anual")) return 12;
  const numero = textoNormalizado.match(/\d+/);
  return numero ? Number(numero[0]) : 0;
}

function calcularProximaDesdeBase(fechaBase?: string | null, periodicidad?: string | null) {
  const base = fechaValida(fechaBase);
  const meses = mesesPorPeriodicidad(periodicidad);
  if (!base || !meses) return "";
  let proxima = new Date(base);
  proxima.setMonth(proxima.getMonth() + meses);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let guardia = 0;
  while (proxima < hoy && guardia < 80) {
    proxima.setMonth(proxima.getMonth() + meses);
    guardia += 1;
  }
  return fechaInput(proxima);
}

function usarCanvasFirma() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [firmado, setFirmado] = useState(false);

  const setCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    canvasRef.current = canvas;
    setFirmado(false);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";

    const pos = (event: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pointer = "touches" in event ? event.touches[0] : event;
      return {
        x: (pointer.clientX - rect.left) * (canvas.width / rect.width),
        y: (pointer.clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    const start = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      drawingRef.current = true;
      const point = pos(event);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    };
    const move = (event: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return;
      event.preventDefault();
      const point = pos(event);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      setFirmado(true);
    };
    const end = () => {
      drawingRef.current = false;
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    cleanupRef.current = () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
    };
  }, []);

  useEffect(() => () => cleanupRef.current?.(), []);

  function limpiarFirma() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmado(false);
  }

  function firmaBase64() {
    return firmado ? canvasRef.current?.toDataURL("image/png") || "" : "";
  }

  return { canvasRef: setCanvasRef, firmado, limpiarFirma, firmaBase64 };
}

export function EquipoGestionarPage() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get("codigo") || "";
  const accion = params.get("accion") || "";
  const [hoja, setHoja] = useState<EquipoHojaVida | null>(null);
  const [equipoPublico, setEquipoPublico] = useState<EquipoBiomedico | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [devolucionOpen, setDevolucionOpen] = useState(false);
  const [asignacionForm, setAsignacionForm] = useState<AsignacionForm>(emptyAsignacionForm);
  const [devolucionForm, setDevolucionForm] = useState<DevolucionForm>(emptyDevolucionForm);
  const [fechaDevHelp, setFechaDevHelp] = useState("");
  const [pacientes, setPacientes] = useState<PacienteIpsHealthcare[]>([]);
  const [profesionales, setProfesionales] = useState<ProfesionalOption[]>([]);
  const [departamentos, setDepartamentos] = useState<UbicacionDepartamento[]>([]);
  const [municipios, setMunicipios] = useState<UbicacionMunicipio[]>([]);
  const [receptor, setReceptor] = useState<ProfesionalPerfil | null>(null);
  const firmaAsignacion = usarCanvasFirma();
  const firmaDevolucion = usarCanvasFirma();

  const equipo = hoja?.equipo || equipoPublico;
  const asignacion = hoja?.asignacion_activa || null;
  const asignado = Boolean(asignacion && asignacion.estado === "activa");

  const pacienteSeleccionado = useMemo(
    () => pacientes.find((paciente) => String(paciente.id_externo) === String(asignacionForm.pacienteId)) || null,
    [asignacionForm.pacienteId, pacientes],
  );
  const puedeFirmarAsignacion = Boolean(asignacionForm.latitud && asignacionForm.longitud);
  const puedeFirmarDevolucion = Boolean(devolucionForm.latitud && devolucionForm.longitud);

  useEffect(() => {
    cargar();
  }, [codigo]);

  useEffect(() => {
    if (!equipo || loading) return;
    if (accion === "asignar" && !asignacion) abrirAsignacion();
  }, [accion, equipo?.id, loading, asignacion?.id]);

  function mostrarError(mensaje: string) {
    setError(mensaje);
    setSuccess("");
  }

  function mostrarSuccess(mensaje: string) {
    setSuccess(mensaje);
    setError("");
  }

  async function cargar() {
    if (!codigo) {
      setError("No se recibio codigo de equipo.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verificarSesion();
      const publico = await obtenerEquipoQrPublico(codigo);
      if (!publico.equipo?.id) throw new Error("Equipo no encontrado");
      setEquipoPublico(publico.equipo);
      const hojaVida = await obtenerHojaVidaEquipo(publico.equipo.id);
      setHoja(hojaVida);
    } catch (err) {
      if (err instanceof Error && /sesion|token|autoriz/i.test(err.message)) {
        const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.href = `/login?next=${next}`;
        return;
      }
      setError(err instanceof Error ? err.message : "No fue posible cargar el equipo");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    window.location.href = `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;
  }

  async function cargarDepartamentosSiHaceFalta() {
    if (departamentos.length) return departamentos;
    const data = await listarDepartamentos();
    const items = data.departamentos || [];
    setDepartamentos(items);
    return items;
  }

  function encontrarDepartamento(valor: string, lista = departamentos) {
    const normalizado = normalizarTexto(valor);
    if (!normalizado) return null;
    return (
      lista.find((dept) => normalizarTexto(dept.codigo_departamento) === normalizado || normalizarTexto(dept.nombre_departamento) === normalizado) || null
    );
  }

  function nombreDepartamento(codigoDepartamento: string) {
    return departamentos.find((dept) => String(dept.codigo_departamento) === String(codigoDepartamento))?.nombre_departamento || codigoDepartamento;
  }

  async function cargarMunicipiosDepartamento(codigoDepartamento: string) {
    if (!codigoDepartamento) {
      setMunicipios([]);
      return [];
    }
    const data = await listarMunicipios(codigoDepartamento);
    const items = data.municipios || [];
    setMunicipios(items);
    return items;
  }

  async function aplicarUbicacion(departamento?: string | null, ciudad?: string | null) {
    try {
      const deptos = await cargarDepartamentosSiHaceFalta();
      const dept = encontrarDepartamento(departamento || "", deptos);
      const codigoDept = dept?.codigo_departamento || "";
      const municipiosDept = codigoDept ? await cargarMunicipiosDepartamento(codigoDept) : [];
      const municipio = ciudad ? municipiosDept.find((mun) => normalizarTexto(mun.nombre_municipio) === normalizarTexto(ciudad)) : null;
      setAsignacionForm((actual) => ({
        ...actual,
        departamento: codigoDept,
        ciudad: municipio?.nombre_municipio || "",
      }));
    } catch (err) {
      mostrarError(err instanceof Error ? err.message : "No fue posible cargar departamentos y ciudades.");
    }
  }

  async function cambiarDepartamento(codigoDepartamento: string) {
    setAsignacionForm((actual) => ({ ...actual, departamento: codigoDepartamento, ciudad: "" }));
    try {
      await cargarMunicipiosDepartamento(codigoDepartamento);
    } catch (err) {
      mostrarError(err instanceof Error ? err.message : "No fue posible cargar ciudades.");
    }
  }

  function camposFaltantesAsignacion() {
    const faltantes: string[] = [];
    if (!asignacionForm.tipo) faltantes.push("tipo de asignacion");
    if (!asignacionForm.fechaDev) faltantes.push("fecha estimada de devolucion");
    if (asignacionForm.tipo === "profesional" && !asignacionForm.profesionalId) faltantes.push("profesional");
    if (!asignacionForm.pacienteNombre) faltantes.push(asignacionForm.tipo === "profesional" ? "nombre del profesional" : "paciente / usuario");
    if (!asignacionForm.pacienteDocumento) faltantes.push("documento paciente / profesional");
    if (!asignacionForm.pacienteTelefono) faltantes.push("telefono paciente / profesional");
    if (!asignacionForm.responsableNombre) faltantes.push("responsable");
    if (!asignacionForm.responsableDocumento) faltantes.push("documento responsable");
    if (!asignacionForm.responsableTelefono) faltantes.push("telefono responsable");
    if (!asignacionForm.responsableEmail) faltantes.push("correo responsable");
    if (!asignacionForm.departamento) faltantes.push("departamento");
    if (!asignacionForm.ciudad) faltantes.push("ciudad");
    if (!asignacionForm.direccion) faltantes.push("direccion de entrega");
    if (!asignacionForm.latitud || !asignacionForm.longitud) faltantes.push("ubicacion GPS");
    if (!asignacionForm.estadoEntrega) faltantes.push("estado del equipo al entregar");
    if (!asignacionForm.observaciones) faltantes.push("observaciones");
    if (!asignacionForm.acepta) faltantes.push("aceptacion de pagare/acta");
    if (!firmaAsignacion.firmado) faltantes.push("firma del responsable");
    return faltantes;
  }

  function camposFaltantesDevolucion() {
    const faltantes: string[] = [];
    if (!devolucionForm.estadoFinal) faltantes.push("estado final del equipo");
    if (!devolucionForm.estadoRecibe) faltantes.push("estado fisico al recibir");
    if (!devolucionForm.latitud || !devolucionForm.longitud) faltantes.push("ubicacion GPS");
    if (!devolucionForm.observaciones) faltantes.push("observaciones de devolucion");
    if (!firmaDevolucion.firmado) faltantes.push("firma de devolucion");
    return faltantes;
  }

  async function calcularFechaTentativa(equipoId: number, hojaVida: EquipoHojaVida | null) {
    setFechaDevHelp("Calculando con base en el proximo mantenimiento...");
    try {
      const data = await listarMantenimientosEquipo(equipoId);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const proximas = (data.mantenimientos || [])
        .map((mantenimiento) => (mantenimiento.proxima_fecha ? String(mantenimiento.proxima_fecha).substring(0, 10) : ""))
        .filter(Boolean)
        .sort();
      const proximaFutura = proximas.find((item) => {
        const date = fechaValida(item);
        return date ? date >= hoy : false;
      });
      if (proximaFutura) {
        setAsignacionForm((actual) => ({ ...actual, fechaDev: sumarDias(proximaFutura, -15) }));
        setFechaDevHelp(`Automatica: 15 dias antes del mantenimiento (${proximaFutura}).`);
        return;
      }

      const adquisicion = hojaVida?.adquisicion || {};
      const apoyo = hojaVida?.apoyo_tecnico || {};
      const fechaBase = adquisicion.fecha_adquisicion || adquisicion.fecha_instalacion || adquisicion.fecha_inicio_operacion || "";
      const proximaCalculada = calcularProximaDesdeBase(fechaBase, apoyo.periodicidad_mantenimiento);
      if (proximaCalculada) {
        setAsignacionForm((actual) => ({ ...actual, fechaDev: sumarDias(proximaCalculada, -15) }));
        setFechaDevHelp(
          `Automatica: 15 dias antes del proximo mantenimiento calculado desde compra (${fechaBase}) y periodicidad ${apoyo.periodicidad_mantenimiento}: ${proximaCalculada}.`,
        );
        return;
      }

      const proximaPasada = proximas[0] || "";
      if (proximaPasada) {
        setAsignacionForm((actual) => ({ ...actual, fechaDev: sumarDias(proximaPasada, -15) }));
        setFechaDevHelp(`Automatica: 15 dias antes del mantenimiento registrado (${proximaPasada}).`);
        return;
      }

      setFechaDevHelp("No hay mantenimientos ni fecha de compra/periodicidad suficientes para calcular.");
    } catch {
      setFechaDevHelp("No fue posible calcular la fecha automaticamente.");
    }
  }

  function capturarGPS(tipo: "asignacion" | "devolucion") {
    if (!navigator.geolocation) {
      mostrarError("Este dispositivo no permite geolocalizacion.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitud = position.coords.latitude.toFixed(8);
        const longitud = position.coords.longitude.toFixed(8);
        if (tipo === "asignacion") setAsignacionForm((actual) => ({ ...actual, latitud, longitud }));
        if (tipo === "devolucion") setDevolucionForm((actual) => ({ ...actual, latitud, longitud }));
      },
      () => mostrarError("No fue posible obtener la ubicacion. Activa permisos de GPS."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function abrirAsignacion() {
    if (!equipo?.id) return;
    setAsignacionForm(emptyAsignacionForm);
    setPacientes([]);
    setMunicipios([]);
    setAsignarOpen(true);
    firmaAsignacion.limpiarFirma();
    cargarDepartamentosSiHaceFalta().catch((err) => mostrarError(err instanceof Error ? err.message : "No fue posible cargar departamentos."));
    calcularFechaTentativa(equipo.id, hoja);
    setTimeout(() => capturarGPS("asignacion"), 150);
  }

  async function abrirDevolucion() {
    if (!asignacion) return;
    setDevolucionForm(emptyDevolucionForm);
    setDevolucionOpen(true);
    firmaDevolucion.limpiarFirma();
    setTimeout(() => capturarGPS("devolucion"), 150);
    if (!receptor) {
      obtenerMiPerfilProfesional()
        .then((data) => setReceptor(data.perfil || null))
        .catch(() => setReceptor(null));
    }
  }

  async function buscarPacientes() {
    setBusy(true);
    try {
      const data = await buscarPacientesIpsHealthcare({ busqueda: asignacionForm.pacienteBusqueda, limit: 50 });
      setPacientes(data.pacientes || []);
      if (!data.pacientes?.length) mostrarError("No se encontraron pacientes.");
    } catch (err) {
      mostrarError(err instanceof Error ? err.message : "No fue posible consultar pacientes externos.");
    } finally {
      setBusy(false);
    }
  }

  async function seleccionarPaciente(idExterno: string) {
    const paciente = pacientes.find((item) => String(item.id_externo) === String(idExterno));
    if (!paciente) {
      setAsignacionForm((actual) => ({ ...actual, pacienteId: idExterno }));
      return;
    }
    const telefono = paciente.telefono || paciente.whatsapp || paciente.telefono_2 || paciente.telefono_emergencia || "";
    setAsignacionForm((actual) => ({
      ...actual,
      pacienteId: idExterno,
      pacienteNombre: paciente.nombre || "",
      pacienteDocumento: paciente.documento || "",
      pacienteTelefono: telefono,
      direccion: paciente.direccion || "",
    }));
    await aplicarUbicacion(paciente.departamento, paciente.ciudad);
  }

  async function cargarProfesionalesSiHaceFalta() {
    if (profesionales.length) return;
    try {
      const data = await listarProfesionales();
      setProfesionales(data.profesionales || []);
    } catch (err) {
      mostrarError(err instanceof Error ? err.message : "No fue posible cargar profesionales.");
    }
  }

  function cambiarTipoAsignacion(tipo: string) {
    setAsignacionForm((actual) => ({
      ...actual,
      tipo,
      pacienteId: "",
      profesionalId: "",
      pacienteBusqueda: "",
      pacienteNombre: "",
      pacienteDocumento: "",
      pacienteTelefono: "",
      responsableNombre: tipo === "profesional" ? actual.responsableNombre : "",
      responsableDocumento: tipo === "profesional" ? actual.responsableDocumento : "",
      responsableTelefono: tipo === "profesional" ? actual.responsableTelefono : "",
      responsableEmail: tipo === "profesional" ? actual.responsableEmail : "",
    }));
    if (tipo === "profesional") cargarProfesionalesSiHaceFalta();
  }

  async function seleccionarProfesional(id: string) {
    const profesional = profesionales.find((item) => String(item.id) === String(id));
    if (!profesional) {
      setAsignacionForm((actual) => ({ ...actual, profesionalId: id }));
      return;
    }
    const documento = profesional.cedula || profesional.usuario_cedula || "";
    setAsignacionForm((actual) => ({
      ...actual,
      profesionalId: id,
      pacienteNombre: profesional.nombre || "",
      pacienteDocumento: documento,
      pacienteTelefono: profesional.telefono || "",
      responsableNombre: profesional.nombre || "",
      responsableDocumento: documento,
      responsableTelefono: profesional.telefono || "",
      responsableEmail: profesional.email || "",
      direccion: profesional.direccion || "",
    }));
    await aplicarUbicacion(profesional.departamento, profesional.ciudad);
  }

  async function guardarAsignacion(event: FormEvent) {
    event.preventDefault();
    if (!equipo?.id) return mostrarError("No se encontro el equipo.");
    const faltantes = camposFaltantesAsignacion();
    if (faltantes.length) return mostrarError(`Faltan campos obligatorios: ${faltantes.join(", ")}.`);
    const firma = firmaAsignacion.firmaBase64();
    if (!firma) return mostrarError("La firma del responsable es obligatoria y debe realizarse despues de capturar la ubicacion GPS.");

    setBusy(true);
    try {
      await asignarEquipoQr(equipo.id, {
        tipo_asignacion: asignacionForm.tipo || "paciente",
        paciente_nombre: asignacionForm.tipo === "profesional" ? asignacionForm.responsableNombre : asignacionForm.pacienteNombre || null,
        paciente_documento: asignacionForm.pacienteDocumento || null,
        paciente_telefono: asignacionForm.pacienteTelefono || null,
        responsable_nombre: asignacionForm.responsableNombre,
        responsable_documento: asignacionForm.responsableDocumento,
        responsable_telefono: asignacionForm.responsableTelefono || null,
        responsable_email: asignacionForm.responsableEmail || null,
        direccion_entrega: asignacionForm.direccion,
        ciudad: asignacionForm.ciudad || null,
        departamento: nombreDepartamento(asignacionForm.departamento) || null,
        latitud_entrega: Number(asignacionForm.latitud),
        longitud_entrega: Number(asignacionForm.longitud),
        fecha_estimada_devolucion: asignacionForm.fechaDev || null,
        estado_equipo_entrega: asignacionForm.estadoEntrega || null,
        observaciones_entrega: asignacionForm.observaciones || null,
        firma_base64: firma,
        acepta_pagare: true,
      });
      setAsignarOpen(false);
      mostrarSuccess("Equipo asignado correctamente.");
      await cargar();
    } catch (err) {
      mostrarError(err instanceof Error ? `No fue posible asignar el equipo: ${err.message}` : "No fue posible asignar el equipo.");
    } finally {
      setBusy(false);
    }
  }

  async function guardarDevolucion(event: FormEvent) {
    event.preventDefault();
    if (!asignacion) return mostrarError("No se encontro la asignacion.");
    const faltantes = camposFaltantesDevolucion();
    if (faltantes.length) return mostrarError(`Faltan campos obligatorios: ${faltantes.join(", ")}.`);
    const firma = firmaDevolucion.firmaBase64();
    if (!firma) return mostrarError("La firma de devolucion es obligatoria y debe realizarse despues de capturar la ubicacion GPS.");

    setBusy(true);
    try {
      const data = await registrarDevolucionEquipoQr(asignacion.id, {
        latitud_devolucion: Number(devolucionForm.latitud),
        longitud_devolucion: Number(devolucionForm.longitud),
        estado_equipo_devolucion: devolucionForm.estadoRecibe,
        observaciones_devolucion: devolucionForm.observaciones || null,
        firma_base64: firma,
        dejar_en_estado: devolucionForm.estadoFinal || "pendiente_revision",
      });
      const envio = data.acta_devolucion_enviada_email
        ? " El acta fue enviada al correo del responsable."
        : " El acta fue generada, pero no se confirmo envio por correo.";
      setDevolucionOpen(false);
      mostrarSuccess(`Devolucion registrada correctamente. El pagare quedo cerrado.${envio}`);
      await cargar();
    } catch (err) {
      mostrarError(err instanceof Error ? `No fue posible registrar la devolucion: ${err.message}` : "No fue posible registrar la devolucion.");
    } finally {
      setBusy(false);
    }
  }

  async function descargarPagare() {
    if (!asignacion) return;
    setBusy(true);
    try {
      await descargarPagareEquipo(asignacion.id);
    } catch (err) {
      mostrarError(err instanceof Error ? err.message : "No fue posible descargar el pagare.");
    } finally {
      setBusy(false);
    }
  }

  const modalAbierto = asignarOpen || devolucionOpen;

  return (
    <main className="equipo-gestion-page">
      {modalAbierto && (error || success) && (
        <div className={`equipo-gestion-alert equipo-gestion-floating-alert ${error ? "error" : "success"}`}>
          {error || success}
        </div>
      )}

      <section className="equipo-gestion-card">
        <header className="equipo-gestion-head">
          <div>
            <h1>Gestion de equipo biomedico</h1>
            <p>Asignacion, devolucion y consulta interna</p>
          </div>
          <button type="button" className="equipo-gestion-btn equipo-gestion-btn-secondary" onClick={logout}>
            Cerrar sesion
          </button>
        </header>

        <div className="equipo-gestion-body">
          {!modalAbierto && error && <div className="equipo-gestion-alert error">{error}</div>}
          {!modalAbierto && success && <div className="equipo-gestion-alert success">{success}</div>}

          {loading && <div className="equipo-gestion-loading">Cargando equipo...</div>}

          {!loading && equipo && (
            <>
              <div className="equipo-gestion-title-row">
                <div>
                  <h2>{texto(equipo.nombre)}</h2>
                  <p>
                    {texto(equipo.marca)} · {texto(equipo.modelo)} · Serie: {texto(equipo.serie)}
                  </p>
                </div>
                <span className={`equipo-gestion-badge ${asignado ? "asignado" : ""}`}>{estadoLabel(equipo.estado)}</span>
              </div>

              <div className="equipo-gestion-grid">
                <Dato label="Codigo" value={equipo.codigo_interno} />
                <Dato label="Area / Servicio" value={`${texto(equipo.area)} / ${texto(equipo.servicio)}`} />
                <Dato label="Ubicacion actual" value={equipo.ubicacion_actual} />
                <Dato label="Registro INVIMA" value={equipo.registro_invima} />
              </div>

              <h3 className="equipo-gestion-section-title">Asignacion actual</h3>
              {asignacion ? (
                <div className="equipo-gestion-grid">
                  <Dato label="Estado" value={estadoLabel(asignacion.estado)} />
                  <Dato label="Paciente" value={asignacion.paciente_nombre} />
                  <Dato label="Responsable" value={asignacion.responsable_nombre} />
                  <Dato label="Direccion" value={asignacion.direccion_entrega} />
                  <Dato label="Entrega" value={fecha(asignacion.fecha_entrega)} />
                  <Dato label="Devolucion estimada" value={fecha(asignacion.fecha_estimada_devolucion)} />
                </div>
              ) : (
                <div className="equipo-gestion-empty">Este equipo no tiene asignacion activa.</div>
              )}

              <div className="equipo-gestion-actions">
                {!asignacion && (
                  <button type="button" className="equipo-gestion-btn equipo-gestion-btn-primary" onClick={abrirAsignacion}>
                    📦 Asignar equipo
                  </button>
                )}
                {asignacion && (
                  <>
                    <button type="button" className="equipo-gestion-btn equipo-gestion-btn-ok" onClick={descargarPagare} disabled={busy}>
                      📄 Descargar pagare
                    </button>
                    <button type="button" className="equipo-gestion-btn equipo-gestion-btn-danger" onClick={abrirDevolucion}>
                      ↩ Registrar devolucion
                    </button>
                  </>
                )}
                <a className="equipo-gestion-btn equipo-gestion-btn-secondary" href={`/equipos/ver?codigo=${encodeURIComponent(equipo.codigo_interno || codigo)}`} target="_blank" rel="noopener noreferrer">
                  👁 Vista publica
                </a>
                {equipo.manual_usuario && equipo.codigo_interno && (
                  <a
                    className="equipo-gestion-btn equipo-gestion-btn-secondary"
                    href={downloadUrl(`/qr/equipos/${encodeURIComponent(equipo.codigo_interno)}/archivo/manual-usuario`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📥 Manual usuario
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {asignarOpen && equipo && (
        <div className="equipo-gestion-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAsignarOpen(false)}>
          <form className="equipo-gestion-modal" onSubmit={guardarAsignacion}>
            <ModalHead title="📦 Asignar equipo" subtitle={`${texto(equipo.codigo_interno)} · ${texto(equipo.nombre)}`} onClose={() => setAsignarOpen(false)} />
            <div className="equipo-gestion-modal-body">
              <div className="equipo-gestion-form-grid">
                <label>
                  Tipo asignacion
                  <select value={asignacionForm.tipo} onChange={(event) => cambiarTipoAsignacion(event.target.value)}>
                    <option value="paciente">Paciente / usuario</option>
                    <option value="profesional">Profesional</option>
                    <option value="sede">Sede</option>
                  </select>
                </label>
                <label>
                  Fecha estimada devolucion
                  <input type="date" value={asignacionForm.fechaDev} onChange={(event) => setAsignacionForm((actual) => ({ ...actual, fechaDev: event.target.value }))} />
                  <small>{fechaDevHelp}</small>
                </label>

                {asignacionForm.tipo !== "profesional" && (
                  <div className="equipo-gestion-patient-box">
                    <label>Paciente / usuario</label>
                    <div className="equipo-gestion-search-row">
                      <input
                        value={asignacionForm.pacienteBusqueda}
                        onChange={(event) => setAsignacionForm((actual) => ({ ...actual, pacienteBusqueda: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            buscarPacientes();
                          }
                        }}
                        placeholder="Buscar por nombre, documento o telefono"
                      />
                      <button type="button" className="equipo-gestion-btn equipo-gestion-btn-secondary" onClick={buscarPacientes} disabled={busy}>
                        🔎 Buscar
                      </button>
                    </div>
                    <select value={asignacionForm.pacienteId} onChange={(event) => seleccionarPaciente(event.target.value)} disabled={!pacientes.length}>
                      <option value="">{pacientes.length ? "Selecciona paciente" : "Busca pacientes para seleccionar"}</option>
                      {pacientes.map((paciente) => (
                        <option key={paciente.id_externo} value={paciente.id_externo}>
                          {paciente.nombre || "Sin nombre"}{paciente.documento ? ` · ${paciente.documento}` : ""}{paciente.ciudad ? ` · ${paciente.ciudad}` : ""}
                        </option>
                      ))}
                    </select>
                    {pacienteSeleccionado && (
                      <div className="equipo-gestion-selected">
                        <strong>{pacienteSeleccionado.nombre || "Paciente seleccionado"}</strong>
                        <span>
                          {[
                            pacienteSeleccionado.documento ? `Documento: ${pacienteSeleccionado.documento}` : "",
                            asignacionForm.pacienteTelefono ? `Telefono: ${asignacionForm.pacienteTelefono}` : "",
                            pacienteSeleccionado.direccion ? `Direccion: ${pacienteSeleccionado.direccion}` : "",
                            pacienteSeleccionado.aseguradora ? `Aseguradora: ${pacienteSeleccionado.aseguradora}` : "",
                            pacienteSeleccionado.alertas_medicas ? `Alertas: ${pacienteSeleccionado.alertas_medicas}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    )}
                    <input
                      value={asignacionForm.pacienteNombre}
                      onChange={(event) => setAsignacionForm((actual) => ({ ...actual, pacienteNombre: event.target.value }))}
                      placeholder="Nombre paciente / usuario editable"
                    />
                  </div>
                )}

                {asignacionForm.tipo === "profesional" && (
                  <label>
                    Profesional
                    <select value={asignacionForm.profesionalId} onFocus={cargarProfesionalesSiHaceFalta} onChange={(event) => seleccionarProfesional(event.target.value)}>
                      <option value="">Selecciona profesional</option>
                      {profesionales.map((profesional) => (
                        <option key={profesional.id} value={profesional.id}>
                          {profesional.nombre || "Sin nombre"}{profesional.cedula || profesional.usuario_cedula ? ` · ${profesional.cedula || profesional.usuario_cedula}` : ""}{profesional.especialidad ? ` · ${profesional.especialidad}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <Campo label="Documento paciente / profesional" value={asignacionForm.pacienteDocumento} onChange={(value) => setAsignacionForm((actual) => ({ ...actual, pacienteDocumento: value }))} />
                <Campo label="Telefono paciente / profesional" value={asignacionForm.pacienteTelefono} onChange={(value) => setAsignacionForm((actual) => ({ ...actual, pacienteTelefono: value }))} />
                <Campo label="Responsable *" value={asignacionForm.responsableNombre} onChange={(value) => setAsignacionForm((actual) => ({ ...actual, responsableNombre: value }))} />
                <Campo label="Documento responsable *" value={asignacionForm.responsableDocumento} onChange={(value) => setAsignacionForm((actual) => ({ ...actual, responsableDocumento: value }))} />
                <Campo label="Telefono responsable" value={asignacionForm.responsableTelefono} onChange={(value) => setAsignacionForm((actual) => ({ ...actual, responsableTelefono: value }))} />
                <Campo label="Correo responsable" type="email" value={asignacionForm.responsableEmail} onChange={(value) => setAsignacionForm((actual) => ({ ...actual, responsableEmail: value }))} />
                <label>
                  Departamento *
                  <select value={asignacionForm.departamento} onFocus={cargarDepartamentosSiHaceFalta} onChange={(event) => cambiarDepartamento(event.target.value)}>
                    <option value="">Selecciona departamento</option>
                    {departamentos.map((dept) => (
                      <option key={dept.codigo_departamento} value={dept.codigo_departamento}>
                        {dept.nombre_departamento}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Ciudad *
                  <select
                    value={asignacionForm.ciudad}
                    disabled={!asignacionForm.departamento}
                    onChange={(event) => setAsignacionForm((actual) => ({ ...actual, ciudad: event.target.value }))}
                  >
                    <option value="">{asignacionForm.departamento ? "Selecciona ciudad" : "Selecciona primero departamento"}</option>
                    {municipios.map((mun) => (
                      <option key={mun.codigo_municipio || mun.nombre_municipio} value={mun.nombre_municipio}>
                        {mun.nombre_municipio}
                      </option>
                    ))}
                  </select>
                </label>
                <Campo label="Direccion entrega *" wide value={asignacionForm.direccion} onChange={(value) => setAsignacionForm((actual) => ({ ...actual, direccion: value }))} />
                <Campo label="Latitud GPS *" readOnly value={asignacionForm.latitud} onChange={() => undefined} />
                <Campo label="Longitud GPS *" readOnly value={asignacionForm.longitud} onChange={() => undefined} />
                <div className="equipo-gestion-wide">
                  <button type="button" className="equipo-gestion-btn equipo-gestion-btn-secondary" onClick={() => capturarGPS("asignacion")}>
                    📍 Capturar ubicacion GPS
                  </button>
                </div>
                <label className="equipo-gestion-wide">
                  Estado del equipo al entregar
                  <textarea rows={2} value={asignacionForm.estadoEntrega} onChange={(event) => setAsignacionForm((actual) => ({ ...actual, estadoEntrega: event.target.value }))} />
                </label>
                <label className="equipo-gestion-wide">
                  Observaciones
                  <textarea rows={2} value={asignacionForm.observaciones} onChange={(event) => setAsignacionForm((actual) => ({ ...actual, observaciones: event.target.value }))} />
                </label>
              </div>

              <label className="equipo-gestion-accept">
                <input type="checkbox" checked={asignacionForm.acepta} onChange={(event) => setAsignacionForm((actual) => ({ ...actual, acepta: event.target.checked }))} />
                <span>Declaro que el responsable recibe el equipo y acepta las condiciones del pagare/acta de responsabilidad. Se guardara evidencia de fecha, usuario, GPS y firma.</span>
              </label>

              <h4>Firma del responsable</h4>
              <div className={`equipo-gestion-signature-wrap ${puedeFirmarAsignacion ? "" : "disabled"}`}>
                <canvas ref={firmaAsignacion.canvasRef} width={760} height={220} className="equipo-gestion-signature" />
                {!puedeFirmarAsignacion && <div className="equipo-gestion-signature-lock">Captura primero la ubicacion GPS para habilitar la firma.</div>}
              </div>
              <div className="equipo-gestion-signature-actions">
                <button type="button" className="equipo-gestion-btn equipo-gestion-btn-secondary" onClick={firmaAsignacion.limpiarFirma}>
                  Limpiar firma
                </button>
              </div>
            </div>
            <ModalActions busy={busy} submitLabel="✅ Guardar asignacion" onCancel={() => setAsignarOpen(false)} />
          </form>
        </div>
      )}

      {devolucionOpen && asignacion && equipo && (
        <div className="equipo-gestion-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDevolucionOpen(false)}>
          <form className="equipo-gestion-modal" onSubmit={guardarDevolucion}>
            <ModalHead title="↩ Registrar devolucion" subtitle={`${texto(equipo.codigo_interno)} · ${texto(equipo.nombre)}`} onClose={() => setDevolucionOpen(false)} />
            <div className="equipo-gestion-modal-body">
              <div className="equipo-gestion-summary-grid">
                <Resumen title="Entrega / devuelve" asignacion={asignacion} />
                <div className="equipo-gestion-summary-card">
                  <h4>Recibe VIVE IPS</h4>
                  <DatoCompacto label="Usuario receptor" value={receptor?.nombre || "Usuario autenticado"} />
                  <DatoCompacto label="Documento" value={receptor?.cedula} />
                  <DatoCompacto label="Cargo" value={receptor?.especialidad || "Tecnovigilancia"} />
                  <DatoCompacto label="Registro" value="Se guardara usuario, fecha, IP y GPS" />
                </div>
              </div>
              <div className="equipo-gestion-info-box">
                Al guardar, se generara el acta de devolucion, recepcion y cierre del pagare. Si el responsable tiene correo, se enviara automaticamente.
              </div>
              <div className="equipo-gestion-form-grid">
                <label>
                  Estado final del equipo
                  <select value={devolucionForm.estadoFinal} onChange={(event) => setDevolucionForm((actual) => ({ ...actual, estadoFinal: event.target.value }))}>
                    <option value="pendiente_revision">Pendiente revision</option>
                    <option value="disponible">Disponible</option>
                    <option value="en_mantenimiento">En mantenimiento</option>
                  </select>
                </label>
                <Campo label="Estado fisico al recibir *" value={devolucionForm.estadoRecibe} onChange={(value) => setDevolucionForm((actual) => ({ ...actual, estadoRecibe: value }))} />
                <Campo label="Latitud devolucion *" readOnly value={devolucionForm.latitud} onChange={() => undefined} />
                <Campo label="Longitud devolucion *" readOnly value={devolucionForm.longitud} onChange={() => undefined} />
                <div className="equipo-gestion-wide">
                  <button type="button" className="equipo-gestion-btn equipo-gestion-btn-secondary" onClick={() => capturarGPS("devolucion")}>
                    📍 Capturar ubicacion GPS
                  </button>
                </div>
                <label className="equipo-gestion-wide">
                  Observaciones de devolucion
                  <textarea rows={3} value={devolucionForm.observaciones} onChange={(event) => setDevolucionForm((actual) => ({ ...actual, observaciones: event.target.value }))} />
                </label>
              </div>
              <h4>Firma de devolucion</h4>
              <p className="equipo-gestion-muted">Firma de la persona que entrega/devuelve el equipo.</p>
              <div className={`equipo-gestion-signature-wrap ${puedeFirmarDevolucion ? "" : "disabled"}`}>
                <canvas ref={firmaDevolucion.canvasRef} width={760} height={220} className="equipo-gestion-signature" />
                {!puedeFirmarDevolucion && <div className="equipo-gestion-signature-lock">Captura primero la ubicacion GPS para habilitar la firma.</div>}
              </div>
              <div className="equipo-gestion-signature-actions">
                <button type="button" className="equipo-gestion-btn equipo-gestion-btn-secondary" onClick={firmaDevolucion.limpiarFirma}>
                  Limpiar firma
                </button>
              </div>
            </div>
            <ModalActions busy={busy} submitLabel="✅ Guardar devolucion y cerrar pagare" onCancel={() => setDevolucionOpen(false)} />
          </form>
        </div>
      )}
    </main>
  );
}

function Dato({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="equipo-gestion-dato">
      <span>{label}</span>
      <strong>{texto(value)}</strong>
    </div>
  );
}

function DatoCompacto({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="equipo-gestion-compact">
      <span>{label}</span>
      <strong>{texto(value)}</strong>
    </div>
  );
}

function Resumen({ title, asignacion }: { title: string; asignacion: EquipoAsignacion }) {
  return (
    <div className="equipo-gestion-summary-card">
      <h4>{title}</h4>
      <DatoCompacto label="Responsable" value={asignacion.responsable_nombre} />
      <DatoCompacto label="Documento" value={asignacion.responsable_documento} />
      <DatoCompacto label="Telefono" value={asignacion.responsable_telefono} />
      <DatoCompacto label="Correo acta" value={asignacion.responsable_email || "No registrado"} />
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  wide = false,
  readOnly = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className={wide ? "equipo-gestion-wide" : undefined}>
      {label}
      <input type={type} value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ModalHead({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="equipo-gestion-modal-head">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
    </div>
  );
}

function ModalActions({ busy, submitLabel, onCancel }: { busy: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div className="equipo-gestion-modal-actions">
      <button type="button" className="equipo-gestion-btn equipo-gestion-btn-secondary" onClick={onCancel}>
        Cancelar
      </button>
      <button type="submit" className="equipo-gestion-btn equipo-gestion-btn-primary" disabled={busy}>
        {busy ? "Guardando..." : submitLabel}
      </button>
    </div>
  );
}
