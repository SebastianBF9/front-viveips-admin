import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Download,
  FileUp,
  FileQuestion,
  FileText,
  Paperclip,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  downloadBlob,
  eliminarArchivoCapacitacionAdmin,
  eliminarCapacitacionAdmin,
  eliminarPreguntaCapacitacionAdmin,
  guardarCapacitacionAdmin,
  guardarPreguntaCapacitacionAdmin,
  listarCapacitacionesAdmin,
  listarArchivosCapacitacionAdmin,
  listarPreguntasCapacitacionAdmin,
  obtenerAdherenciaCapacitaciones,
  subirArchivoCapacitacionAdmin,
  toggleCapacitacionAdmin,
} from "../api";
import type {
  AdherenciaCapacitacion,
  AdherenciaCapacitacionesResponse,
  CapacitacionAdmin,
  CapacitacionArchivo,
  CapacitacionAdminPayload,
  CapacitacionOpcion,
  CapacitacionPregunta,
} from "../types";
import { Loading } from "../ui/Loading";

const RAMAS_CAPACITACION = [
  "Gestion Ambiental",
  "Guias de Practicas Clinicas",
  "Farmacovigilancia",
  "Procesos Prioritarios",
  "Servicios Propios",
  "Talento Humano",
  "Tecnovigilancia",
];

const CAPACITACION_FORM_INICIAL: CapacitacionAdminPayload = {
  capacitacion_id: null,
  rama: "Talento Humano",
  nombre: "",
  descripcion: "",
  vigencia_meses: 12,
  fecha_habilitacion: "",
  fecha_vencimiento: "",
  activo: 0,
};

const OPCIONES_NUEVA_PREGUNTA = ["", "", "", ""];

function normalizar(valor?: string | null) {
  return (valor || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatearFecha(valor?: string | null) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor).slice(0, 10);
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(fecha);
}

function estadoLabel(estado: AdherenciaCapacitacion["estado"]) {
  if (estado === "aprobado") return "Aprobado";
  if (estado === "no_aprobado") return "No aprobado";
  return "Pendiente";
}

function exportarCsv(rows: AdherenciaCapacitacion[]) {
  const esc = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Profesional", "Cedula", "Cargo", "Rama", "Capacitacion", "Estado", "Nota", "Fecha"].map(esc).join(","),
    ...rows.map((row) =>
      [
        row.profesional,
        row.cedula,
        row.cargo,
        row.rama,
        row.capacitacion,
        row.estado_label,
        row.nota ?? "",
        formatearFecha(row.fecha_presentacion),
      ].map(esc).join(","),
    ),
  ];
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `adherencia_capacitaciones_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function opcionesEditables(opciones?: CapacitacionOpcion[]) {
  const base = (opciones || []).filter((opcion) => opcion && opcion.opcion !== undefined);
  const completas = [...base];
  while (completas.length < 4) {
    completas.push({ opcion: "", es_correcta: false });
  }
  return completas.slice(0, 4);
}

export function CapacitacionesTalentoSection() {
  const [capacitaciones, setCapacitaciones] = useState<CapacitacionAdmin[]>([]);
  const [adherencia, setAdherencia] = useState<AdherenciaCapacitacionesResponse | null>(null);
  const [busquedaCurso, setBusquedaCurso] = useState("");
  const [rama, setRama] = useState("");
  const [estadoCurso, setEstadoCurso] = useState("");
  const [busquedaAdh, setBusquedaAdh] = useState("");
  const [estadoAdh, setEstadoAdh] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalArchivos, setModalArchivos] = useState(false);
  const [capacitacionArchivos, setCapacitacionArchivos] = useState<CapacitacionAdmin | null>(null);
  const [archivos, setArchivos] = useState<CapacitacionArchivo[]>([]);
  const [modalPreguntas, setModalPreguntas] = useState(false);
  const [capacitacionPreguntas, setCapacitacionPreguntas] = useState<CapacitacionAdmin | null>(null);
  const [preguntas, setPreguntas] = useState<CapacitacionPregunta[]>([]);
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [nuevasOpciones, setNuevasOpciones] = useState<string[]>(OPCIONES_NUEVA_PREGUNTA);
  const [nuevaCorrecta, setNuevaCorrecta] = useState(0);
  const [form, setForm] = useState<CapacitacionAdminPayload>(CAPACITACION_FORM_INICIAL);
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const [lista, adh] = await Promise.all([
        listarCapacitacionesAdmin(),
        obtenerAdherenciaCapacitaciones({ estado: estadoAdh }),
      ]);
      setCapacitaciones(lista.capacitaciones || []);
      setAdherencia(adh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar capacitaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoAdh]);

  const ramas = useMemo(() => {
    return [...new Set(capacitaciones.map((capacitacion) => capacitacion.rama).filter(Boolean))].sort();
  }, [capacitaciones]);

  const cursosFiltrados = useMemo(() => {
    const texto = normalizar(busquedaCurso);
    return capacitaciones.filter((capacitacion) => {
      const matchTexto =
        !texto ||
        normalizar(capacitacion.nombre).includes(texto) ||
        normalizar(capacitacion.rama).includes(texto) ||
        normalizar(capacitacion.descripcion).includes(texto);
      const matchRama = !rama || capacitacion.rama === rama;
      const matchEstado = !estadoCurso || String(capacitacion.activo) === estadoCurso;
      return matchTexto && matchRama && matchEstado;
    });
  }, [busquedaCurso, capacitaciones, estadoCurso, rama]);

  const adherenciaFiltrada = useMemo(() => {
    const texto = normalizar(busquedaAdh);
    const rows = adherencia?.adherencia || [];
    return rows.filter((row) => {
      if (!texto) return true;
      return [row.profesional, row.cedula, row.cargo, row.rama, row.capacitacion].some((value) =>
        normalizar(value).includes(texto),
      );
    });
  }, [adherencia, busquedaAdh]);

  const activos = capacitaciones.filter((capacitacion) => Boolean(capacitacion.activo)).length;
  const totalArchivos = capacitaciones.reduce((total, capacitacion) => total + Number(capacitacion.num_archivos || 0), 0);
  const totalPreguntas = capacitaciones.reduce((total, capacitacion) => total + Number(capacitacion.num_preguntas || 0), 0);

  function abrirNuevaCapacitacion() {
    setForm(CAPACITACION_FORM_INICIAL);
    setModalAbierto(true);
    setError("");
    setSuccess("");
  }

  function abrirEditarCapacitacion(capacitacion: CapacitacionAdmin) {
    setForm({
      capacitacion_id: capacitacion.id,
      rama: capacitacion.rama || "Talento Humano",
      nombre: capacitacion.nombre || "",
      descripcion: capacitacion.descripcion || "",
      vigencia_meses: Number(capacitacion.vigencia_meses || 12),
      fecha_habilitacion: capacitacion.fecha_habilitacion ? String(capacitacion.fecha_habilitacion).slice(0, 10) : "",
      fecha_vencimiento: capacitacion.fecha_vencimiento ? String(capacitacion.fecha_vencimiento).slice(0, 10) : "",
      activo: capacitacion.activo ? 1 : 0,
    });
    setModalAbierto(true);
    setError("");
    setSuccess("");
  }

  function actualizarForm(campo: keyof CapacitacionAdminPayload, valor: string | number) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarCapacitacion() {
    const payload = {
      ...form,
      rama: String(form.rama || "").trim(),
      nombre: String(form.nombre || "").trim(),
      descripcion: String(form.descripcion || "").trim(),
      vigencia_meses: Number(form.vigencia_meses || 12),
      activo: Number(form.activo || 0),
    };

    if (!payload.rama || !payload.nombre) {
      setError("Completa rama y nombre de la capacitacion.");
      return;
    }

    setAccionLoading("guardar-capacitacion");
    setError("");
    setSuccess("");
    try {
      await guardarCapacitacionAdmin(payload);
      setSuccess(payload.capacitacion_id ? "Capacitacion actualizada correctamente." : "Capacitacion creada correctamente.");
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la capacitacion");
    } finally {
      setAccionLoading("");
    }
  }

  async function cambiarEstado(capacitacion: CapacitacionAdmin) {
    setAccionLoading(`toggle-${capacitacion.id}`);
    setError("");
    setSuccess("");
    try {
      const data = await toggleCapacitacionAdmin(capacitacion.id);
      setSuccess(data.activo ? "Capacitacion activada correctamente." : "Capacitacion desactivada correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cambiar el estado");
    } finally {
      setAccionLoading("");
    }
  }

  async function eliminarCapacitacion(capacitacion: CapacitacionAdmin) {
    const confirmar = window.confirm(`Eliminar la capacitacion "${capacitacion.nombre}"? Esta accion no se puede deshacer.`);
    if (!confirmar) return;

    setAccionLoading(`eliminar-${capacitacion.id}`);
    setError("");
    setSuccess("");
    try {
      await eliminarCapacitacionAdmin(capacitacion.id);
      setSuccess("Capacitacion eliminada correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar la capacitacion");
    } finally {
      setAccionLoading("");
    }
  }

  async function abrirArchivosCapacitacion(capacitacion: CapacitacionAdmin) {
    setCapacitacionArchivos(capacitacion);
    setModalArchivos(true);
    setAccionLoading(`archivos-${capacitacion.id}`);
    setError("");
    setSuccess("");
    try {
      const data = await listarArchivosCapacitacionAdmin(capacitacion.id);
      setArchivos(data.archivos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar los materiales");
    } finally {
      setAccionLoading("");
    }
  }

  async function recargarArchivos() {
    if (!capacitacionArchivos) return;
    const data = await listarArchivosCapacitacionAdmin(capacitacionArchivos.id);
    setArchivos(data.archivos || []);
  }

  async function subirMateriales(files: FileList | null) {
    if (!capacitacionArchivos || !files?.length) {
      setError("Selecciona al menos un archivo para subir.");
      return;
    }

    setAccionLoading("subir-material");
    setError("");
    setSuccess("");
    try {
      for (const file of Array.from(files)) {
        await subirArchivoCapacitacionAdmin(capacitacionArchivos.id, file);
      }
      setSuccess(files.length === 1 ? "Material cargado correctamente." : "Materiales cargados correctamente.");
      await recargarArchivos();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible subir el material");
    } finally {
      setAccionLoading("");
    }
  }

  async function descargarMaterial(archivo: CapacitacionArchivo) {
    setAccionLoading(`descargar-material-${archivo.id}`);
    setError("");
    try {
      await downloadBlob(`/capacitaciones/descargar-archivo/${archivo.id}`, archivo.nombre_archivo || `material_${archivo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar el material");
    } finally {
      setAccionLoading("");
    }
  }

  async function eliminarMaterial(archivo: CapacitacionArchivo) {
    const confirmar = window.confirm(`Eliminar el material "${archivo.nombre_archivo}"?`);
    if (!confirmar) return;

    setAccionLoading(`eliminar-material-${archivo.id}`);
    setError("");
    setSuccess("");
    try {
      await eliminarArchivoCapacitacionAdmin(archivo.id);
      setSuccess("Material eliminado correctamente.");
      await recargarArchivos();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar el material");
    } finally {
      setAccionLoading("");
    }
  }

  async function abrirPreguntasCapacitacion(capacitacion: CapacitacionAdmin) {
    setCapacitacionPreguntas(capacitacion);
    setModalPreguntas(true);
    setNuevaPregunta("");
    setNuevasOpciones([...OPCIONES_NUEVA_PREGUNTA]);
    setNuevaCorrecta(0);
    setAccionLoading(`preguntas-${capacitacion.id}`);
    setError("");
    setSuccess("");
    try {
      const data = await listarPreguntasCapacitacionAdmin(capacitacion.id);
      setPreguntas((data.preguntas || []).map((pregunta) => ({
        ...pregunta,
        opciones: opcionesEditables(pregunta.opciones),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar las preguntas");
    } finally {
      setAccionLoading("");
    }
  }

  async function recargarPreguntas() {
    if (!capacitacionPreguntas) return;
    const data = await listarPreguntasCapacitacionAdmin(capacitacionPreguntas.id);
    setPreguntas((data.preguntas || []).map((pregunta) => ({
      ...pregunta,
      opciones: opcionesEditables(pregunta.opciones),
    })));
  }

  function actualizarPreguntaTexto(id: number, valor: string) {
    setPreguntas((actuales) => actuales.map((pregunta) => (
      pregunta.id === id ? { ...pregunta, pregunta: valor } : pregunta
    )));
  }

  function actualizarOpcionPregunta(id: number, index: number, valor: string) {
    setPreguntas((actuales) => actuales.map((pregunta) => {
      if (pregunta.id !== id) return pregunta;
      const opciones = opcionesEditables(pregunta.opciones);
      opciones[index] = { ...opciones[index], opcion: valor };
      return { ...pregunta, opciones };
    }));
  }

  function marcarOpcionCorrecta(id: number, index: number) {
    setPreguntas((actuales) => actuales.map((pregunta) => {
      if (pregunta.id !== id) return pregunta;
      return {
        ...pregunta,
        opciones: opcionesEditables(pregunta.opciones).map((opcion, i) => ({
          ...opcion,
          es_correcta: i === index,
        })),
      };
    }));
  }

  function validarPregunta(pregunta: string, opciones: Array<{ opcion: string; es_correcta: boolean | number }>) {
    const opcionesValidas = opciones.filter((opcion) => opcion.opcion.trim());
    if (!pregunta.trim()) return "Escribe la pregunta.";
    if (opcionesValidas.length < 2) return "Agrega al menos dos opciones.";
    if (!opcionesValidas.some((opcion) => Boolean(opcion.es_correcta))) return "Marca la respuesta correcta.";
    return "";
  }

  async function guardarPreguntaExistente(pregunta: CapacitacionPregunta) {
    const opciones = opcionesEditables(pregunta.opciones)
      .map((opcion) => ({ opcion: opcion.opcion.trim(), es_correcta: Boolean(opcion.es_correcta) }))
      .filter((opcion) => opcion.opcion);
    const errorValidacion = validarPregunta(pregunta.pregunta, opciones);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setAccionLoading(`guardar-pregunta-${pregunta.id}`);
    setError("");
    setSuccess("");
    try {
      await guardarPreguntaCapacitacionAdmin({
        id: pregunta.id,
        capacitacion_id: pregunta.capacitacion_id,
        pregunta: pregunta.pregunta.trim(),
        opciones,
      });
      setSuccess("Pregunta guardada correctamente.");
      await recargarPreguntas();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la pregunta");
    } finally {
      setAccionLoading("");
    }
  }

  async function guardarNuevaPregunta() {
    if (!capacitacionPreguntas) return;
    const opciones = nuevasOpciones
      .map((opcion, index) => ({ opcion: opcion.trim(), es_correcta: index === nuevaCorrecta }))
      .filter((opcion) => opcion.opcion);
    const errorValidacion = validarPregunta(nuevaPregunta, opciones);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setAccionLoading("guardar-nueva-pregunta");
    setError("");
    setSuccess("");
    try {
      await guardarPreguntaCapacitacionAdmin({
        capacitacion_id: capacitacionPreguntas.id,
        pregunta: nuevaPregunta.trim(),
        opciones,
      });
      setNuevaPregunta("");
      setNuevasOpciones([...OPCIONES_NUEVA_PREGUNTA]);
      setNuevaCorrecta(0);
      setSuccess("Pregunta agregada correctamente.");
      await recargarPreguntas();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible agregar la pregunta");
    } finally {
      setAccionLoading("");
    }
  }

  async function eliminarPregunta(pregunta: CapacitacionPregunta) {
    const confirmar = window.confirm("Eliminar esta pregunta?");
    if (!confirmar) return;

    setAccionLoading(`eliminar-pregunta-${pregunta.id}`);
    setError("");
    setSuccess("");
    try {
      await eliminarPreguntaCapacitacionAdmin(pregunta.id);
      setSuccess("Pregunta eliminada correctamente.");
      await recargarPreguntas();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar la pregunta");
    } finally {
      setAccionLoading("");
    }
  }

  if (loading) return <Loading text="Cargando capacitaciones..." />;

  return (
    <div className="training-section">
      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <div className="kpi-grid four training-kpis">
        <article className="kpi-card compact success">
          <div className="kpi-icon"><BookOpenCheck size={18} /></div>
          <strong>{activos}</strong>
          <span>Capacitaciones activas</span>
        </article>
        <article className="kpi-card compact muted">
          <div className="kpi-icon"><FileText size={18} /></div>
          <strong>{totalArchivos}</strong>
          <span>Materiales cargados</span>
        </article>
        <article className="kpi-card compact muted">
          <div className="kpi-icon"><FileQuestion size={18} /></div>
          <strong>{totalPreguntas}</strong>
          <span>Preguntas configuradas</span>
        </article>
        <article className="kpi-card compact warning">
          <div className="kpi-icon"><Clock3 size={18} /></div>
          <strong>{adherencia?.resumen.pendientes || 0}</strong>
          <span>Pendientes por presentar</span>
        </article>
      </div>

      <section className="table-card">
        <div className="section-heading training-heading">
          <div>
            <h2>Capacitaciones internas</h2>
            <p>Cursos, vigencias, materiales y preguntas disponibles para el equipo.</p>
          </div>
          <button className="brand-action-btn" type="button" onClick={abrirNuevaCapacitacion}>
            <Plus size={17} />
            Nueva capacitacion
          </button>
        </div>

        <div className="toolbar padded-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input value={busquedaCurso} onChange={(event) => setBusquedaCurso(event.target.value)} placeholder="Buscar curso o rama" />
          </label>
          <select value={rama} onChange={(event) => setRama(event.target.value)}>
            <option value="">Todas las ramas</option>
            {ramas.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={estadoCurso} onChange={(event) => setEstadoCurso(event.target.value)}>
            <option value="">Todos</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </select>
        </div>

        <table className="training-table">
          <thead>
            <tr>
              <th>Rama</th>
              <th>Capacitacion</th>
              <th>Materiales</th>
              <th>Preguntas</th>
              <th>Habilitacion</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cursosFiltrados.map((capacitacion) => (
              <tr key={capacitacion.id}>
                <td><span className="training-chip">{capacitacion.rama || "-"}</span></td>
                <td>
                  <strong>{capacitacion.nombre}</strong>
                  {capacitacion.descripcion && <small>{capacitacion.descripcion}</small>}
                </td>
                <td>
                  <button
                    type="button"
                    className="training-count-btn materials"
                    onClick={() => abrirArchivosCapacitacion(capacitacion)}
                    title="Gestionar materiales"
                  >
                    <strong>{capacitacion.num_archivos || 0}</strong>
                    <Paperclip size={14} />
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="training-count-btn questions"
                    onClick={() => abrirPreguntasCapacitacion(capacitacion)}
                    title="Gestionar preguntas"
                  >
                    <strong>{capacitacion.num_preguntas || 0}</strong>
                    <FileQuestion size={14} />
                  </button>
                </td>
                <td>{formatearFecha(capacitacion.fecha_habilitacion)}</td>
                <td>{formatearFecha(capacitacion.fecha_vencimiento)}</td>
                <td>
                  <span className={`pill ${capacitacion.activo ? "activo" : "inactivo"}`}>
                    {capacitacion.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <div className="table-actions training-actions">
                    <button
                      type="button"
                      onClick={() => abrirEditarCapacitacion(capacitacion)}
                      className="training-icon-action edit"
                      title="Editar capacitación"
                      aria-label="Editar capacitación"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarEstado(capacitacion)}
                      className={`training-icon-action power ${capacitacion.activo ? "active" : "inactive"}`}
                      disabled={accionLoading === `toggle-${capacitacion.id}`}
                      title={capacitacion.activo ? "Desactivar capacitación" : "Activar capacitación"}
                      aria-label={capacitacion.activo ? "Desactivar capacitación" : "Activar capacitación"}
                    >
                      <Power size={15} />
                    </button>
                    <button
                      type="button"
                      className="training-icon-action delete"
                      onClick={() => eliminarCapacitacion(capacitacion)}
                      disabled={accionLoading === `eliminar-${capacitacion.id}`}
                      title="Eliminar capacitación"
                      aria-label="Eliminar capacitación"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cursosFiltrados.length === 0 && <div className="empty-state">No hay capacitaciones con esos filtros.</div>}
      </section>

      <section className="table-card">
        <div className="section-heading training-heading">
          <div>
            <h2>Adherencia de capacitaciones</h2>
            <p>Profesionales que aprobaron, no aprobaron o tienen pendiente cada capacitacion activa.</p>
          </div>
          <button className="secondary-btn" type="button" onClick={() => exportarCsv(adherenciaFiltrada)}>
            <Download size={16} />
            Exportar CSV
          </button>
        </div>

        <div className="kpi-grid four adherence-mini-grid">
          <article className="adherence-mini"><span>Total</span><strong>{adherencia?.resumen.total || 0}</strong></article>
          <article className="adherence-mini approved"><span>Aprobados</span><strong>{adherencia?.resumen.aprobados || 0}</strong></article>
          <article className="adherence-mini failed"><span>No aprobados</span><strong>{adherencia?.resumen.no_aprobados || 0}</strong></article>
          <article className="adherence-mini pending"><span>Pendientes</span><strong>{adherencia?.resumen.pendientes || 0}</strong></article>
        </div>

        <div className="toolbar padded-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input value={busquedaAdh} onChange={(event) => setBusquedaAdh(event.target.value)} placeholder="Buscar profesional, cedula o curso" />
          </label>
          <select value={estadoAdh} onChange={(event) => setEstadoAdh(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="aprobado">Aprobado</option>
            <option value="no_aprobado">No aprobado</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>

        <table className="training-table">
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Cedula</th>
              <th>Cargo</th>
              <th>Rama</th>
              <th>Capacitacion</th>
              <th>Estado</th>
              <th>Nota</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {adherenciaFiltrada.map((row) => (
              <tr key={`${row.profesional_id}-${row.capacitacion_id}`}>
                <td><strong>{row.profesional || "-"}</strong></td>
                <td>{row.cedula || "-"}</td>
                <td>{row.cargo || "-"}</td>
                <td><span className="training-chip">{row.rama || "-"}</span></td>
                <td>{row.capacitacion || "-"}</td>
                <td>
                  <span className={`training-status ${row.estado}`}>
                    {row.estado === "aprobado" && <CheckCircle2 size={13} />}
                    {row.estado === "no_aprobado" && <AlertCircle size={13} />}
                    {row.estado === "pendiente" && <Clock3 size={13} />}
                    {estadoLabel(row.estado)}
                  </span>
                </td>
                <td><strong>{row.nota == null ? "-" : `${Number(row.nota).toFixed(0)}/100`}</strong></td>
                <td>{formatearFecha(row.fecha_presentacion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {adherenciaFiltrada.length === 0 && <div className="empty-state">No hay registros de adherencia con esos filtros.</div>}
      </section>

      {modalAbierto && (
        <div className="modal-backdrop" onMouseDown={() => setModalAbierto(false)}>
          <div className="modal training-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="professional-detail-title training-modal-title">
              <h2><BookOpenCheck size={22} /> {form.capacitacion_id ? "Editar capacitacion" : "Nueva capacitacion"}</h2>
              <button type="button" onClick={() => setModalAbierto(false)} aria-label="Cerrar modal">
                <X size={22} />
              </button>
            </div>

            <div className="training-modal-body">
              <div className="training-form-grid">
                <label>
                  Rama <span>*</span>
                  <select value={form.rama} onChange={(event) => actualizarForm("rama", event.target.value)}>
                    {RAMAS_CAPACITACION.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Vigencia
                  <select value={form.vigencia_meses} onChange={(event) => actualizarForm("vigencia_meses", Number(event.target.value))}>
                    <option value={1}>1 mes</option>
                    <option value={3}>3 meses</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                    <option value={24}>24 meses</option>
                  </select>
                </label>

                <label className="wide-field">
                  Nombre del curso <span>*</span>
                  <input value={form.nombre} onChange={(event) => actualizarForm("nombre", event.target.value)} placeholder="Ej: Seguridad del paciente" />
                </label>

                <label className="wide-field">
                  Descripcion / informacion del curso
                  <textarea
                    rows={3}
                    value={form.descripcion || ""}
                    onChange={(event) => actualizarForm("descripcion", event.target.value)}
                    placeholder="Descripcion opcional..."
                  />
                </label>

                <label>
                  Fecha habilitacion
                  <input
                    type="date"
                    value={form.fecha_habilitacion || ""}
                    onChange={(event) => actualizarForm("fecha_habilitacion", event.target.value)}
                  />
                </label>

                <label>
                  Fecha vencimiento
                  <input
                    type="date"
                    value={form.fecha_vencimiento || ""}
                    onChange={(event) => actualizarForm("fecha_vencimiento", event.target.value)}
                  />
                </label>

                <label>
                  Estado
                  <select value={form.activo} onChange={(event) => actualizarForm("activo", Number(event.target.value))}>
                    <option value={0}>Inactivo</option>
                    <option value={1}>Activo</option>
                  </select>
                </label>
              </div>

              <div className="modal-actions contract-actions">
                <button className="secondary-btn pill-btn" type="button" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button className="primary-btn gradient-btn" type="button" onClick={guardarCapacitacion} disabled={accionLoading === "guardar-capacitacion"}>
                  Guardar capacitacion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalArchivos && capacitacionArchivos && (
        <div className="modal-backdrop" onMouseDown={() => setModalArchivos(false)}>
          <div className="modal training-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="professional-detail-title training-modal-title">
              <h2><Paperclip size={22} /> Materiales de capacitacion</h2>
              <button type="button" onClick={() => setModalArchivos(false)} aria-label="Cerrar modal">
                <X size={22} />
              </button>
            </div>

            <div className="training-modal-body">
              <div className="training-file-heading">
                <div>
                  <strong>{capacitacionArchivos.nombre}</strong>
                  <span>{capacitacionArchivos.rama || "Sin rama"}</span>
                </div>
                <span className="training-chip">{archivos.length} archivo(s)</span>
              </div>

              <div className="training-upload-box">
                <input
                  id="training-material-input"
                  type="file"
                  accept=".pdf,.ppt,.pptx"
                  multiple
                  onChange={(event) => {
                    subirMateriales(event.target.files);
                    event.target.value = "";
                  }}
                />
                <label htmlFor="training-material-input">
                  <FileUp size={16} />
                  Subir presentacion (PDF / PPT)
                </label>
                <span>Puedes subir multiples archivos</span>
              </div>

              <div className="training-file-list">
                {archivos.map((archivo) => (
                  <article className="training-file-item" key={archivo.id}>
                    <div>
                      <FileText size={18} />
                      <div>
                        <strong>{archivo.nombre_archivo || `Material ${archivo.id}`}</strong>
                        <span>{archivo.mime_type || "Archivo"}</span>
                      </div>
                    </div>
                    <div className="table-actions training-actions">
                      <button
                        type="button"
                        className="training-icon-action edit"
                        onClick={() => descargarMaterial(archivo)}
                        disabled={accionLoading === `descargar-material-${archivo.id}`}
                        title="Descargar material"
                        aria-label="Descargar material"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        className="training-icon-action delete"
                        onClick={() => eliminarMaterial(archivo)}
                        disabled={accionLoading === `eliminar-material-${archivo.id}`}
                        title="Eliminar material"
                        aria-label="Eliminar material"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
                {archivos.length === 0 && <div className="empty-state compact-empty">Esta capacitacion no tiene materiales cargados.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalPreguntas && capacitacionPreguntas && (
        <div className="modal-backdrop" onMouseDown={() => setModalPreguntas(false)}>
          <div className="modal training-modal training-questions-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="professional-detail-title training-modal-title">
              <h2><FileQuestion size={22} /> Preguntas del examen</h2>
              <button type="button" onClick={() => setModalPreguntas(false)} aria-label="Cerrar modal">
                <X size={22} />
              </button>
            </div>

            <div className="training-modal-body">
              <div className="training-file-heading">
                <div>
                  <strong>{capacitacionPreguntas.nombre}</strong>
                  <span>{capacitacionPreguntas.rama || "Sin rama"}</span>
                </div>
                <span className="training-chip">{preguntas.length} pregunta(s)</span>
              </div>

              <div className="training-question-list">
                {preguntas.map((pregunta, index) => (
                  <article className="training-question-card" key={pregunta.id}>
                    <div className="training-question-title-row">
                      <strong>{index + 1}.</strong>
                      <input
                        value={pregunta.pregunta}
                        onChange={(event) => actualizarPreguntaTexto(pregunta.id, event.target.value)}
                        placeholder="Escribe la pregunta"
                      />
                      <button
                        type="button"
                        className="training-icon-action delete"
                        onClick={() => eliminarPregunta(pregunta)}
                        disabled={accionLoading === `eliminar-pregunta-${pregunta.id}`}
                        title="Eliminar pregunta"
                        aria-label="Eliminar pregunta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="training-option-list">
                      {opcionesEditables(pregunta.opciones).map((opcion, opcionIndex) => (
                        <label className="training-option-row" key={`${pregunta.id}-${opcionIndex}`}>
                          <input
                            type="radio"
                            name={`correcta-${pregunta.id}`}
                            checked={Boolean(opcion.es_correcta)}
                            onChange={() => marcarOpcionCorrecta(pregunta.id, opcionIndex)}
                          />
                          <input
                            value={opcion.opcion}
                            onChange={(event) => actualizarOpcionPregunta(pregunta.id, opcionIndex, event.target.value)}
                            placeholder={`Opcion ${opcionIndex + 1}`}
                          />
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="primary-btn gradient-btn compact-action"
                      onClick={() => guardarPreguntaExistente(pregunta)}
                      disabled={accionLoading === `guardar-pregunta-${pregunta.id}`}
                    >
                      Guardar
                    </button>
                  </article>
                ))}

                <article className="training-question-card new-question-card">
                  <div className="training-question-title-row">
                    <strong>Nueva</strong>
                    <input
                      value={nuevaPregunta}
                      onChange={(event) => setNuevaPregunta(event.target.value)}
                      placeholder="Escribe la pregunta"
                    />
                  </div>

                  <div className="training-option-list">
                    {nuevasOpciones.map((opcion, index) => (
                      <label className="training-option-row" key={index}>
                        <input
                          type="radio"
                          name="nueva-correcta"
                          checked={nuevaCorrecta === index}
                          onChange={() => setNuevaCorrecta(index)}
                        />
                        <input
                          value={opcion}
                          onChange={(event) => setNuevasOpciones((actuales) => actuales.map((item, i) => i === index ? event.target.value : item))}
                          placeholder={`Opcion ${index + 1}`}
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="primary-btn gradient-btn compact-action"
                    onClick={guardarNuevaPregunta}
                    disabled={accionLoading === "guardar-nueva-pregunta"}
                  >
                    Agregar pregunta
                  </button>
                </article>

                {preguntas.length === 0 && <div className="empty-state compact-empty">Aun no hay preguntas guardadas para esta capacitacion.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
