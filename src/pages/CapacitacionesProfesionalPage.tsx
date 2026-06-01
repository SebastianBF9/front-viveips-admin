import {
  Award,
  BookOpen,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  LogOut,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearSession,
  downloadBlob,
  downloadUrl,
  enviarExamenCapacitacion,
  listarMisCapacitaciones,
  obtenerArchivosCapacitacionProfesional,
  obtenerExamenCapacitacion,
  obtenerMiPerfilProfesional,
} from "../api";
import type {
  ArchivoCapacitacionProfesional,
  CursoProfesionalCapacitacion,
  ExamenCapacitacion,
  ProfesionalPerfil,
  ResultadoExamenCapacitacion,
} from "../types";
import { Loading } from "../ui/Loading";

type MaterialesModal = {
  curso: CursoProfesionalCapacitacion;
  archivos: ArchivoCapacitacionProfesional[];
  loading: boolean;
};

type ExamenModal = {
  curso: CursoProfesionalCapacitacion;
  examen: ExamenCapacitacion | null;
  loading: boolean;
  respuestas: Record<string, number>;
  resultado: ResultadoExamenCapacitacion | null;
  sending: boolean;
};

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).slice(0, 10);
}

function estadoCurso(curso: CursoProfesionalCapacitacion) {
  if (curso.aprobado) return "aprobado";
  if (curso.mi_nota !== null && curso.mi_nota !== undefined) return "reprobado";
  return "pendiente";
}

function estadoLabel(curso: CursoProfesionalCapacitacion) {
  const estado = estadoCurso(curso);
  if (estado === "aprobado") return "Aprobado";
  if (estado === "reprobado") return "Reprobado";
  return "Pendiente";
}

function puedePresentar(curso: CursoProfesionalCapacitacion) {
  if (curso.aprobado) return false;
  if (!curso.fecha_vencimiento) return true;
  return new Date(curso.fecha_vencimiento) >= new Date();
}

export function CapacitacionesProfesionalPage() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<ProfesionalPerfil | null>(null);
  const [cursos, setCursos] = useState<CursoProfesionalCapacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filtroRama, setFiltroRama] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [materialesModal, setMaterialesModal] = useState<MaterialesModal | null>(null);
  const [examenModal, setExamenModal] = useState<ExamenModal | null>(null);

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const [perfilData, cursosData] = await Promise.all([
        obtenerMiPerfilProfesional(),
        listarMisCapacitaciones(),
      ]);
      setPerfil(perfilData.perfil);
      setCursos(cursosData.cursos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar tus capacitaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const ramas = useMemo(() => {
    return Array.from(new Set(cursos.map((curso) => curso.rama).filter(Boolean))).sort();
  }, [cursos]);

  const cursosFiltrados = useMemo(() => {
    return cursos.filter((curso) => {
      if (filtroRama && curso.rama !== filtroRama) return false;
      if (filtroEstado && estadoCurso(curso) !== filtroEstado) return false;
      return true;
    });
  }, [cursos, filtroRama, filtroEstado]);

  const stats = useMemo(() => {
    return cursos.reduce(
      (total, curso) => {
        const estado = estadoCurso(curso);
        if (estado === "aprobado") total.aprobados += 1;
        if (estado === "pendiente") total.pendientes += 1;
        if (estado === "reprobado") total.reprobados += 1;
        return total;
      },
      { aprobados: 0, pendientes: 0, reprobados: 0 },
    );
  }, [cursos]);

  function cerrarSesion() {
    clearSession();
    navigate("/login", { replace: true });
  }

  function abrirMiCarnet() {
    window.open(downloadUrl("/carnet/mi-carnet"), "_blank", "noopener,noreferrer");
  }

  async function abrirMateriales(curso: CursoProfesionalCapacitacion) {
    setError("");
    setMaterialesModal({ curso, archivos: [], loading: true });
    try {
      const data = await obtenerArchivosCapacitacionProfesional(curso.id);
      setMaterialesModal({ curso, archivos: data.archivos || [], loading: false });
    } catch (err) {
      setMaterialesModal(null);
      setError(err instanceof Error ? err.message : "No fue posible cargar los materiales");
    }
  }

  async function descargarMaterial(archivo: ArchivoCapacitacionProfesional) {
    try {
      await downloadBlob(`/capacitaciones/descargar-archivo/${archivo.id}`, archivo.nombre_archivo || `material_${archivo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar el material");
    }
  }

  async function abrirExamen(curso: CursoProfesionalCapacitacion) {
    setError("");
    setSuccess("");
    setExamenModal({
      curso,
      examen: null,
      loading: true,
      respuestas: {},
      resultado: null,
      sending: false,
    });
    try {
      const data = await obtenerExamenCapacitacion(curso.id);
      setExamenModal({
        curso,
        examen: data,
        loading: false,
        respuestas: {},
        resultado: null,
        sending: false,
      });
    } catch (err) {
      setExamenModal(null);
      setError(err instanceof Error ? err.message : "No fue posible cargar el examen");
    }
  }

  function responderPregunta(preguntaId: number, opcionId: number) {
    setExamenModal((actual) => actual ? ({
      ...actual,
      respuestas: { ...actual.respuestas, [String(preguntaId)]: opcionId },
    }) : actual);
  }

  async function enviarExamen() {
    if (!examenModal?.examen) return;
    setError("");
    setExamenModal((actual) => actual ? { ...actual, sending: true } : actual);
    try {
      const resultado = await enviarExamenCapacitacion({
        capacitacion_id: examenModal.curso.id,
        respuestas: examenModal.respuestas,
      });
      setExamenModal((actual) => actual ? { ...actual, resultado, sending: false } : actual);
      setSuccess(resultado.aprobado ? "Capacitacion aprobada. Ya puedes descargar tu certificado." : "Examen enviado. Puedes revisar tu resultado e intentar nuevamente.");
      await cargar();
    } catch (err) {
      setExamenModal((actual) => actual ? { ...actual, sending: false } : actual);
      setError(err instanceof Error ? err.message : "No fue posible enviar el examen");
    }
  }

  async function descargarCertificado(curso: CursoProfesionalCapacitacion) {
    try {
      await downloadBlob(`/capacitaciones/certificado/${curso.id}`, `certificado_${curso.nombre || curso.id}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar el certificado");
    }
  }

  function onFiltroEstado(event: ChangeEvent<HTMLSelectElement>) {
    setFiltroEstado(event.target.value);
  }

  if (loading) {
    return (
      <main className="professional-portal-page">
        <Loading text="Cargando capacitaciones..." />
      </main>
    );
  }

  return (
    <main className="professional-portal-page">
      <header className="professional-topbar">
        <img src="/logo_carnet.png" alt="Vive IPS" />
        <div className="professional-topbar-user">
          <div>
            <strong>{perfil?.nombre || "Profesional"}</strong>
            <span>{perfil?.especialidad || "Profesional"}</span>
          </div>
          <button className="topbar-soft-btn" type="button" onClick={() => navigate("/portal-profesional")}>Mi portal</button>
          <button className="topbar-soft-btn navy active" type="button">Capacitaciones</button>
          <button className="topbar-soft-btn navy" type="button" onClick={abrirMiCarnet}>Mi Carnet</button>
          <button className="topbar-logout" type="button" onClick={cerrarSesion}><LogOut size={16} /> Salir</button>
        </div>
      </header>

      <div className="professional-portal-content professional-training-content">
        <section className="professional-welcome">
          <div>
            <h1><GraduationCap size={28} /> Mis Capacitaciones</h1>
            <p>Cursos habilitados para ti. Revisa el material y aprueba el examen con nota minima de 80.</p>
          </div>
          <div className="welcome-stats">
            <article><strong>{stats.aprobados}</strong><span>Aprobadas</span></article>
            <article><strong>{stats.pendientes}</strong><span>Pendientes</span></article>
            <article><strong>{stats.reprobados}</strong><span>Reprobadas</span></article>
          </div>
        </section>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <section className="portal-section-card professional-training-panel">
          <div className="professional-training-filters">
            <label>
              <span>Rama</span>
              <select value={filtroRama} onChange={(event) => setFiltroRama(event.target.value)}>
                <option value="">Todas</option>
                {ramas.map((rama) => <option key={rama} value={rama}>{rama}</option>)}
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select value={filtroEstado} onChange={onFiltroEstado}>
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="reprobado">Reprobado</option>
              </select>
            </label>
          </div>

          <div className="professional-training-grid">
            {cursosFiltrados.map((curso) => (
              <article className="professional-training-card" key={curso.id}>
                <div className="professional-training-card-head">
                  <span className="rama-chip">{curso.rama || "General"}</span>
                  <span className={`professional-training-badge ${estadoCurso(curso)}`}>{estadoLabel(curso)}</span>
                </div>
                <h2>{curso.nombre}</h2>
                <div className="professional-training-meta">
                  <span><CalendarClock size={15} /> Plazo: {fechaCorta(curso.fecha_vencimiento || curso.fecha_habilitacion)}</span>
                  {curso.fecha_presentacion && <span><CalendarCheck2 size={15} /> Presentado: {fechaCorta(curso.fecha_presentacion)}</span>}
                  {curso.mi_nota !== null && curso.mi_nota !== undefined && <span><Trophy size={15} /> Nota: {curso.mi_nota}%</span>}
                </div>
                <div className="professional-training-actions">
                  <button className="btn-cap btn-material" type="button" disabled={!curso.num_archivos} onClick={() => abrirMateriales(curso)}>
                    <BookOpen size={16} /> Material ({curso.num_archivos || 0})
                  </button>
                  <button className="btn-cap btn-examen" type="button" disabled={!puedePresentar(curso)} onClick={() => abrirExamen(curso)}>
                    {curso.mi_nota !== null && curso.mi_nota !== undefined ? <RotateCcw size={16} /> : <FileText size={16} />}
                    {curso.mi_nota !== null && curso.mi_nota !== undefined ? "Reintentar" : "Presentar examen"}
                  </button>
                  {Boolean(curso.aprobado) && (
                    <button className="btn-cap btn-cert" type="button" onClick={() => descargarCertificado(curso)}>
                      <Award size={16} /> Certificado
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {cursosFiltrados.length === 0 && (
            <div className="empty-state compact-empty">No hay capacitaciones con esos filtros.</div>
          )}
        </section>
      </div>

      {materialesModal && (
        <div className="modal-backdrop">
          <div className="modal training-modal">
            <div className="training-modal-title">
              <h2>Material de {materialesModal.curso.nombre}</h2>
              <p>Descarga y revisa los soportes antes de presentar el examen.</p>
            </div>
            <div className="training-modal-body">
              {materialesModal.loading ? (
                <Loading text="Cargando materiales..." />
              ) : (
                <div className="training-file-list">
                  {materialesModal.archivos.map((archivo) => (
                    <article className="training-file-item" key={archivo.id}>
                      <div>
                        <FileText size={18} />
                        <div>
                          <strong>{archivo.nombre_archivo}</strong>
                          <span>{archivo.mime_type || "Archivo"}</span>
                        </div>
                      </div>
                      <button className="secondary-btn" type="button" onClick={() => descargarMaterial(archivo)}>
                        <Download size={15} /> Descargar
                      </button>
                    </article>
                  ))}
                  {materialesModal.archivos.length === 0 && <div className="empty-state compact-empty">No hay materiales cargados.</div>}
                </div>
              )}
              <div className="modal-actions">
                <button className="secondary-btn" type="button" onClick={() => setMaterialesModal(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {examenModal && (
        <div className="modal-backdrop">
          <div className="modal training-modal training-questions-modal">
            <div className="training-modal-title">
              <h2>Examen: {examenModal.curso.nombre}</h2>
              <p>Selecciona una respuesta por pregunta.</p>
            </div>
            <div className="training-modal-body">
              {examenModal.loading || !examenModal.examen ? (
                <Loading text="Cargando examen..." />
              ) : (
                <div className="professional-exam-list">
                  {examenModal.examen.preguntas.map((pregunta, index) => (
                    <article className="professional-exam-question" key={pregunta.id}>
                      <h3>{index + 1}. {pregunta.pregunta}</h3>
                      <div className="professional-exam-options">
                        {pregunta.opciones.map((opcion) => (
                          <label key={opcion.id}>
                            <input
                              type="radio"
                              name={`pregunta-${pregunta.id}`}
                              checked={examenModal.respuestas[String(pregunta.id)] === opcion.id}
                              onChange={() => responderPregunta(pregunta.id, opcion.id)}
                              disabled={Boolean(examenModal.resultado)}
                            />
                            <span>{opcion.opcion}</span>
                          </label>
                        ))}
                      </div>
                    </article>
                  ))}
                  {examenModal.examen.preguntas.length === 0 && <div className="empty-state compact-empty">Este examen aun no tiene preguntas.</div>}
                </div>
              )}

              {examenModal.resultado && (
                <div className={`professional-exam-result ${examenModal.resultado.aprobado ? "approved" : "failed"}`}>
                  {examenModal.resultado.aprobado ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                  <div>
                    <strong>{examenModal.resultado.aprobado ? "Aprobaste" : "No aprobaste"}</strong>
                    <span>Nota: {examenModal.resultado.nota} / Correctas: {examenModal.resultado.correctas} de {examenModal.resultado.total}</span>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="secondary-btn" type="button" onClick={() => setExamenModal(null)}>Cerrar</button>
                <button
                  className="primary-btn"
                  type="button"
                  disabled={examenModal.loading || examenModal.sending || Boolean(examenModal.resultado) || !examenModal.examen?.preguntas.length}
                  onClick={enviarExamen}
                >
                  {examenModal.sending ? "Enviando..." : "Enviar examen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
