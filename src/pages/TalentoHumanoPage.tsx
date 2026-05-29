import { Download, Eye, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { downloadUrl, listarProfesionales, obtenerFormacionProfesional, obtenerProfesional } from "../api";
import type { DocumentoProfesional, FormacionAcademica, ProfesionalAdmin } from "../types";
import { Loading } from "../ui/Loading";

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

type EstadoDoc = "cumple" | "pendiente" | "vencido" | "en_revision";

interface ChecklistItem {
  codigo: string;
  nombre: string;
  estado: EstadoDoc;
  detalle: string;
  documento?: DocumentoProfesional;
}

function normalizar(valor?: string | null) {
  return (valor || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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
  if (
    [
      "terapeuta",
      "terapia",
      "fisioterapeuta",
      "fonoaudiologo",
      "fonoaudiologa",
      "fonoaudiologia",
    ].some((item) => cargo.includes(item))
  ) {
    return "terapeutas";
  }
  return "sin_cursos";
}

function codigosEsperados(especialidad?: string | null) {
  const grupo = grupoCargo(especialidad);
  return [...documentosBase.slice(0, 4), "formacion_academica", ...documentosBase.slice(4), ...(cursosPorCargo[grupo] || [])];
}

function estadoFormacion(formaciones: FormacionAcademica[] = []): EstadoDoc {
  const bachillerato = formaciones.some((item) => item.tipo === "bachillerato");
  const profesional = formaciones.find((item) => item.tipo === "profesional");
  const soporteProfesional = Boolean(
    profesional &&
      (profesional.diploma_ruta_archivo ||
        profesional.diploma_nombre_archivo ||
        profesional.ruta_archivo ||
        profesional.nombre_archivo),
  );
  if (bachillerato && profesional && soporteProfesional) return "cumple";
  if (formaciones.length > 0) return "en_revision";
  return "pendiente";
}

function checklistProfesional(profesional: ProfesionalAdmin): ChecklistItem[] {
  const docs = new Map((profesional.documentos || []).map((doc) => [doc.tipo_codigo, doc]));
  return codigosEsperados(profesional.especialidad).map((codigo) => {
    if (codigo === "formacion_academica") {
      const estado = estadoFormacion(profesional.formaciones || []);
      return {
        codigo,
        nombre: nombresDocumentos[codigo],
        estado,
        detalle: estado === "cumple" ? "Completa" : estado === "en_revision" ? "Incompleta" : "No cargada",
      };
    }
    const doc = docs.get(codigo);
    if (!doc) {
      return { codigo, nombre: nombresDocumentos[codigo] || codigo, estado: "pendiente", detalle: "No cargado" };
    }
    const estadoNormalizado = (doc.estado || "").replace(/_/g, "-");
    const estado = estadoNormalizado === "vencido" ? "vencido" : "cumple";
    return {
      codigo,
      nombre: nombresDocumentos[codigo] || doc.tipo_nombre || codigo,
      estado,
      detalle: doc.fecha_vencimiento ? `Vence ${doc.fecha_vencimiento}` : "Sin vencimiento",
      documento: doc,
    };
  });
}

function resumenDocumental(profesional: ProfesionalAdmin) {
  const items = checklistProfesional(profesional);
  const cumplidos = items.filter((item) => item.estado === "cumple").length;
  const vencidos = items.filter((item) => item.estado === "vencido").length;
  const pendientes = items.length - cumplidos;
  return { total: items.length, cumplidos, vencidos, pendientes };
}

export function TalentoHumanoPage() {
  const [profesionales, setProfesionales] = useState<ProfesionalAdmin[]>([]);
  const [seleccionado, setSeleccionado] = useState<ProfesionalAdmin | null>(null);
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const data = await listarProfesionales();
      const base = (data.profesionales || []) as ProfesionalAdmin[];
      const enriquecidos = await Promise.all(
        base.map(async (profesional) => {
          try {
            const [detalle, formacion] = await Promise.all([
              obtenerProfesional(profesional.id),
              obtenerFormacionProfesional(profesional.id),
            ]);
            return {
              ...profesional,
              documentos: (detalle.documentos || []) as DocumentoProfesional[],
              formaciones: (formacion.formaciones || []) as FormacionAcademica[],
            };
          } catch {
            return { ...profesional, documentos: [], formaciones: [] };
          }
        }),
      );
      setProfesionales(enriquecidos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar talento humano");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const texto = normalizar(query);
    return profesionales.filter((profesional) => {
      const resumen = resumenDocumental(profesional);
      const matchTexto =
        !texto ||
        normalizar(profesional.nombre).includes(texto) ||
        normalizar(profesional.cedula).includes(texto) ||
        normalizar(profesional.especialidad).includes(texto);
      const matchEstado =
        estado === "todos" ||
        (estado === "activos" && Boolean(profesional.activo)) ||
        (estado === "inactivos" && !profesional.activo) ||
        (estado === "pendientes" && resumen.pendientes > 0) ||
        (estado === "vencidos" && resumen.vencidos > 0);
      return matchTexto && matchEstado;
    });
  }, [estado, profesionales, query]);

  const kpis = useMemo(() => {
    const activos = profesionales.filter((profesional) => Boolean(profesional.activo)).length;
    const pendientes = profesionales.filter((profesional) => resumenDocumental(profesional).pendientes > 0).length;
    const vencidos = profesionales.filter((profesional) => resumenDocumental(profesional).vencidos > 0).length;
    return { total: profesionales.length, activos, pendientes, vencidos };
  }, [profesionales]);

  if (loading) return <Loading text="Cargando talento humano..." />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Talento Humano</span>
          <h1>Profesionales</h1>
          <p>Gestiona la vista documental y operativa del talento humano de Vive IPS.</p>
        </div>
      </header>

      {error && <div className="error-box">{error}</div>}

      <div className="kpi-grid four">
        <article className="kpi-card"><strong>{kpis.total}</strong><span>Profesionales</span></article>
        <article className="kpi-card"><strong>{kpis.activos}</strong><span>Activos</span></article>
        <article className="kpi-card"><strong>{kpis.pendientes}</strong><span>Con pendientes</span></article>
        <article className="kpi-card"><strong>{kpis.vencidos}</strong><span>Con vencidos</span></article>
      </div>

      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, cedula o cargo" />
        </label>
        <select value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="pendientes">Con pendientes</option>
          <option value="vencidos">Con vencidos</option>
        </select>
      </div>

      <section className="table-card">
        <div className="section-heading">
          <h2>Listado de profesionales</h2>
          <p>La columna documental usa la misma regla por cargo migrada desde el portal actual.</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Cargo</th>
              <th>Documentos</th>
              <th>Contrato</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((profesional) => {
              const resumen = resumenDocumental(profesional);
              return (
                <tr key={profesional.id}>
                  <td>
                    <strong>{profesional.nombre}</strong>
                    <small>{profesional.cedula || "Sin cedula"} - {profesional.email || "Sin correo"}</small>
                  </td>
                  <td>{profesional.especialidad || "Sin cargo"}</td>
                  <td>
                    <strong>{resumen.cumplidos}/{resumen.total}</strong>
                    <small>{resumen.vencidos ? `${resumen.vencidos} vencidos` : `${resumen.pendientes} pendientes`}</small>
                  </td>
                  <td>{profesional.estado_contrato || "Sin contrato"}</td>
                  <td><span className={`pill ${profesional.activo ? "activo" : "inactivo"}`}>{profesional.activo ? "Activo" : "Inactivo"}</span></td>
                  <td className="actions">
                    <button type="button" onClick={() => setSeleccionado(profesional)} title="Ver ficha">
                      <Eye size={16} />
                    </button>
                    <a className="icon-link" href={downloadUrl(`/pdf/profesional/${profesional.id}`)} title="Descargar HV">
                      <Download size={16} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && <div className="empty-state">No hay profesionales para el filtro seleccionado.</div>}
      </section>

      {seleccionado && (
        <div className="modal-backdrop" onMouseDown={() => setSeleccionado(null)}>
          <div className="modal wide-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-profile-header">
              <div className="avatar-circle"><UserRound size={24} /></div>
              <div>
                <h2>{seleccionado.nombre}</h2>
                <p>{seleccionado.especialidad || "Sin cargo"} - CC {seleccionado.cedula || "Sin cedula"}</p>
              </div>
            </div>

            <div className="detail-grid">
              <article><span>Correo</span><strong>{seleccionado.email || "Sin dato"}</strong></article>
              <article><span>Telefono</span><strong>{seleccionado.telefono || "Sin dato"}</strong></article>
              <article><span>Contrato</span><strong>{seleccionado.estado_contrato || "Sin contrato"}</strong></article>
              <article><span>Estado</span><strong>{seleccionado.activo ? "Activo" : "Inactivo"}</strong></article>
            </div>

            <section className="table-card flat-card">
              <div className="section-heading">
                <h2>Checklist documental</h2>
                <p>Documentos esperados segun el cargo registrado.</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                    <th>Archivo</th>
                  </tr>
                </thead>
                <tbody>
                  {checklistProfesional(seleccionado).map((item) => (
                    <tr key={item.codigo}>
                      <td><strong>{item.nombre}</strong><small>{item.codigo}</small></td>
                      <td><span className={`pill ${item.estado}`}>{item.estado}</span></td>
                      <td>{item.detalle}</td>
                      <td>
                        {item.documento ? (
                          <a className="table-link" href={downloadUrl(`/documentos/descargar/${item.documento.id}`)}>
                            Descargar
                          </a>
                        ) : (
                          <small>No disponible</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="modal-actions">
              <a className="secondary-btn" href={downloadUrl(`/pdf/profesional/${seleccionado.id}`)}>
                <Download size={16} />
                Descargar hoja de vida
              </a>
              <button className="primary-btn" type="button" onClick={() => setSeleccionado(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
