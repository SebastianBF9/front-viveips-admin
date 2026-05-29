import { BadgeCheck, CreditCard, Download, Eye, FileText, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  apiCall,
  downloadBlob,
  downloadUrl,
  listarProfesionales,
  obtenerFormacionProfesional,
  obtenerProfesional,
} from "../api";
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

type EstadoDoc = "vigente" | "sin-cargar" | "vencido" | "por-vencer";

interface ChecklistItem {
  codigo: string;
  nombre: string;
  estado: EstadoDoc;
  detalle: string;
  documento?: DocumentoProfesional;
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
  const actaProfesional = Boolean(profesional && (profesional.acta_ruta_archivo || profesional.acta_nombre_archivo));
  if (bachillerato && profesional && soporteProfesional && actaProfesional) return "vigente";
  if (formaciones.length > 0) return "por-vencer";
  return "sin-cargar";
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
        detalle: estado === "vigente" ? "Completa" : estado === "por-vencer" ? "Incompleta" : "No cargada",
      };
    }

    const doc = docs.get(codigo);
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
  const vencidos = items.filter((item) => item.estado === "vencido").length;
  const pendientes = items.filter((item) => item.estado === "sin-cargar").length;
  return { total: items.length, cumplidos, vencidos, pendientes, items };
}

function nombreArchivoSeguro(valor: string) {
  return normalizar(valor).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "profesional";
}

export function TalentoHumanoPage() {
  const [profesionales, setProfesionales] = useState<ProfesionalAdmin[]>([]);
  const [seleccionado, setSeleccionado] = useState<ProfesionalAdmin | null>(null);
  const [contratoProfesional, setContratoProfesional] = useState<ProfesionalAdmin | null>(null);
  const [contratoEstado, setContratoEstado] = useState<ContratoEstado | null>(null);
  const [valorUrbano, setValorUrbano] = useState("");
  const [valorRural, setValorRural] = useState("");
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState("");
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
        normalizar(profesional.email).includes(texto) ||
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

  async function ejecutarAccion(clave: string, accion: () => Promise<void>) {
    setAccionLoading(clave);
    setError("");
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

  async function descargarHojaVida(profesional: ProfesionalAdmin) {
    await ejecutarAccion(`pdf-${profesional.id}`, async () => {
      await downloadBlob(`/pdf/profesional/${profesional.id}`, `HV_${nombreArchivoSeguro(profesional.nombre)}.pdf`);
    });
  }

  function abrirCarnet(profesional: ProfesionalAdmin) {
    window.open(downloadUrl(`/carnet/generar/${profesional.id}`), "_blank", "noopener,noreferrer");
  }

  async function abrirContrato(profesional: ProfesionalAdmin) {
    setContratoProfesional(profesional);
    setContratoEstado(null);
    setValorUrbano("");
    setValorRural("");
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
    const urbano = Number(valorUrbano);
    const rural = Number(valorRural);
    if (!urbano || urbano <= 0 || !rural || rural <= 0 || !fechaInicio) {
      setError("Ingresa valor urbano, valor rural y fecha de inicio para generar el contrato.");
      return;
    }

    await ejecutarAccion(`contrato-generar-${contratoProfesional.id}`, async () => {
      await apiCall("POST", `/contratos/generar/${contratoProfesional.id}`, {
        valor_urbano: urbano,
        valor_rural: rural,
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
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, cedula, correo o cargo" />
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
          <p>Replica el flujo actual: ver detalle, PDF, contrato y carnet.</p>
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
                  <td>{profesional.especialidad || "Sin especialidad"}</td>
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
                      <button type="button" onClick={() => setSeleccionado(profesional)}><Eye size={15} /> Ver</button>
                      <button type="button" onClick={() => descargarHojaVida(profesional)} disabled={accionLoading === `pdf-${profesional.id}`}>
                        <Download size={15} /> PDF
                      </button>
                      <button type="button" onClick={() => abrirContrato(profesional)}><FileText size={15} /> Contrato</button>
                      <button type="button" onClick={() => abrirCarnet(profesional)}><CreditCard size={15} /> Carnet</button>
                    </div>
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
                <h2>Estado de documentos</h2>
                <p>Documentos esperados segun el cargo registrado.</p>
              </div>
              <div className="modal-docs-grid">
                {checklistProfesional(seleccionado).map((item) => (
                  <article className={`modal-doc-item ${item.estado}`} key={item.codigo}>
                    <div>
                      <strong>{item.nombre}</strong>
                      <span>{item.detalle}</span>
                    </div>
                    <div className="doc-actions">
                      <span className={`pill ${item.estado}`}>{item.estado}</span>
                      {item.documento ? (
                        <button type="button" onClick={() => descargarDocumento(item.documento!)} disabled={accionLoading === `doc-${item.documento.id}`}>
                          <Download size={14} /> Descargar
                        </button>
                      ) : (
                        <small>No disponible</small>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => descargarHojaVida(seleccionado)}>
                <Download size={16} />
                Descargar hoja de vida
              </button>
              <button className="primary-btn" type="button" onClick={() => setSeleccionado(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {contratoProfesional && (
        <div className="modal-backdrop" onMouseDown={() => setContratoProfesional(null)}>
          <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-profile-header">
              <div className="avatar-circle"><FileText size={24} /></div>
              <div>
                <h2>Contrato</h2>
                <p>{contratoProfesional.nombre} - {contratoProfesional.especialidad || "Sin cargo"}</p>
              </div>
            </div>

            <div className="contract-state">
              <BadgeCheck size={18} />
              <div>
                <strong>{contratoEstado?.estado || contratoProfesional.estado_contrato || "Sin contrato generado"}</strong>
                <span>{contratoEstado?.fecha_generacion || contratoProfesional.fecha_contrato || "Sin fecha registrada"}</span>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Valor urbano
                <input value={valorUrbano} onChange={(event) => setValorUrbano(event.target.value)} inputMode="numeric" placeholder="Ej: 45000" />
              </label>
              <label>
                Valor rural
                <input value={valorRural} onChange={(event) => setValorRural(event.target.value)} inputMode="numeric" placeholder="Ej: 55000" />
              </label>
              <label>
                Fecha inicio
                <input value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} type="date" />
              </label>
            </div>

            <div className="modal-actions wrap">
              <button className="secondary-btn" type="button" onClick={() => descargarContrato(contratoProfesional)}>
                <Download size={16} /> Descargar contrato
              </button>
              <button className="secondary-btn" type="button" onClick={firmarContratoGerente} disabled={accionLoading.includes("contrato-firma")}>
                Firmar gerente
              </button>
              <button className="primary-btn" type="button" onClick={generarContrato} disabled={accionLoading.includes("contrato-generar")}>
                Generar contrato
              </button>
              <button className="secondary-btn" type="button" onClick={() => setContratoProfesional(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
