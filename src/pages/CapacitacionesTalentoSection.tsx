import { AlertCircle, BookOpenCheck, CheckCircle2, Clock3, Download, FileQuestion, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listarCapacitacionesAdmin, obtenerAdherenciaCapacitaciones } from "../api";
import type { AdherenciaCapacitacion, AdherenciaCapacitacionesResponse, CapacitacionAdmin } from "../types";
import { Loading } from "../ui/Loading";

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

export function CapacitacionesTalentoSection() {
  const [capacitaciones, setCapacitaciones] = useState<CapacitacionAdmin[]>([]);
  const [adherencia, setAdherencia] = useState<AdherenciaCapacitacionesResponse | null>(null);
  const [busquedaCurso, setBusquedaCurso] = useState("");
  const [rama, setRama] = useState("");
  const [estadoCurso, setEstadoCurso] = useState("");
  const [busquedaAdh, setBusquedaAdh] = useState("");
  const [estadoAdh, setEstadoAdh] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) return <Loading text="Cargando capacitaciones..." />;

  return (
    <div className="training-section">
      {error && <div className="error-box">{error}</div>}

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
                <td>{capacitacion.num_archivos || 0}</td>
                <td>{capacitacion.num_preguntas || 0}</td>
                <td>{formatearFecha(capacitacion.fecha_habilitacion)}</td>
                <td>{formatearFecha(capacitacion.fecha_vencimiento)}</td>
                <td>
                  <span className={`pill ${capacitacion.activo ? "activo" : "inactivo"}`}>
                    {capacitacion.activo ? "Activo" : "Inactivo"}
                  </span>
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
    </div>
  );
}
