import { Download, FileArchive, FileText, Search, Trash2, Upload } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  downloadBlob,
  eliminarArchivoGestionDocumental,
  listarArchivosGestionDocumental,
  subirArchivoGestionDocumental,
} from "../api";
import type { GestionDocumentalArchivo, GestionDocumentalEstandar } from "../types";
import { Loading } from "../ui/Loading";

type FormState = {
  codigo: string;
  version: string;
  fecha_documento: string;
  observaciones: string;
  archivo: File | null;
};

const formInicial: FormState = {
  codigo: "",
  version: "",
  fecha_documento: "",
  observaciones: "",
  archivo: null,
};

function formatoBytes(value?: number | null) {
  const bytes = Number(value || 0);
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GestionDocumentalPage() {
  const [archivos, setArchivos] = useState<GestionDocumentalArchivo[]>([]);
  const [estandares, setEstandares] = useState<GestionDocumentalEstandar[]>([]);
  const [estandarActivo, setEstandarActivo] = useState("talento_humano");
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState<FormState>(formInicial);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const data = await listarArchivosGestionDocumental({ busqueda });
      setArchivos(data.archivos || []);
      setEstandares(data.estandares || []);
      if (!estandarActivo && data.estandares?.length) setEstandarActivo(data.estandares[0].codigo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar gestión documental");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const archivosEstandar = useMemo(() => {
    return archivos.filter((archivo) => archivo.estandar_codigo === estandarActivo);
  }, [archivos, estandarActivo]);

  const estandarActual = estandares.find((item) => item.codigo === estandarActivo);
  const totalArchivos = archivos.length;
  const estandaresConArchivo = estandares.filter((item) => Number(item.total_archivos || 0) > 0).length;

  function actualizarForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!form.archivo) {
      setError("Selecciona un archivo para cargar.");
      return;
    }
    setAccion("subir");
    try {
      await subirArchivoGestionDocumental({
        estandar_codigo: estandarActivo,
        codigo: form.codigo,
        version: form.version,
        fecha_documento: form.fecha_documento,
        observaciones: form.observaciones,
        archivo: form.archivo,
      });
      setForm(formInicial);
      setSuccess("Archivo documental cargado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el archivo");
    } finally {
      setAccion("");
    }
  }

  async function descargar(archivo: GestionDocumentalArchivo) {
    setAccion(`descargar-${archivo.id}`);
    try {
      await downloadBlob(`/gestion-documental/archivos/${archivo.id}/descargar`, archivo.nombre_archivo, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar el archivo");
    } finally {
      setAccion("");
    }
  }

  async function eliminar(archivo: GestionDocumentalArchivo) {
    if (!confirm(`Eliminar ${archivo.nombre_archivo}?`)) return;
    setAccion(`eliminar-${archivo.id}`);
    try {
      await eliminarArchivoGestionDocumental(archivo.id);
      setSuccess("Archivo documental eliminado.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar el archivo");
    } finally {
      setAccion("");
    }
  }

  return (
    <section className="page gestion-documental-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Habilitación</span>
          <h1>Gestión Documental</h1>
          <p>Repositorio de soportes por estándar: código, versión, fecha, archivo y consulta documental.</p>
        </div>
      </header>

      <div className="kpi-grid three">
        <article className="kpi-card"><strong>{totalArchivos}</strong><span>Archivos cargados</span></article>
        <article className="kpi-card"><strong>{estandares.length}</strong><span>Estándares</span></article>
        <article className="kpi-card"><strong>{estandaresConArchivo}</strong><span>Con soportes</span></article>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <section className="gestion-doc-layout">
        <aside className="table-card gestion-doc-standards">
          <div className="section-heading">
            <h2>Estándares</h2>
            <p>Selecciona dónde cargar o consultar archivos.</p>
          </div>
          <div className="gestion-doc-standard-list">
            {estandares.map((estandar) => (
              <button
                className={estandarActivo === estandar.codigo ? "active" : ""}
                key={estandar.codigo}
                type="button"
                onClick={() => setEstandarActivo(estandar.codigo)}
              >
                <FileArchive size={17} />
                <span>
                  <strong>{estandar.nombre}</strong>
                  <small>{estandar.total_archivos || 0} archivo(s)</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="table-card gestion-doc-panel">
          <div className="section-heading">
            <h2>{estandarActual?.nombre || "Estándar"}</h2>
            <p>Carga soportes con código, versión y fecha del documento.</p>
          </div>

          <form className="gestion-doc-form" onSubmit={guardar}>
            <label>Código
              <input value={form.codigo} onChange={(event) => actualizarForm("codigo", event.target.value)} required placeholder="Ej. PRO-ING-001" />
            </label>
            <label>Versión
              <input value={form.version} onChange={(event) => actualizarForm("version", event.target.value)} required placeholder="Ej. 01" />
            </label>
            <label>Fecha
              <input type="date" value={form.fecha_documento} onChange={(event) => actualizarForm("fecha_documento", event.target.value)} required />
            </label>
            <label className="gestion-doc-file">Archivo
              <input
                type="file"
                required
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                onChange={(event) => actualizarForm("archivo", event.target.files?.[0] || null)}
              />
            </label>
            <label className="gestion-doc-observaciones">Observaciones
              <input value={form.observaciones} onChange={(event) => actualizarForm("observaciones", event.target.value)} placeholder="Opcional" />
            </label>
            <button className="brand-action-btn" type="submit" disabled={accion === "subir"}>
              <Upload size={17} /> Cargar archivo
            </button>
          </form>
        </section>
      </section>

      <section className="table-card">
        <div className="section-heading inline-heading">
          <div>
            <h2>Archivos del estándar</h2>
            <p>{archivosEstandar.length} soporte(s) disponible(s) para consulta y descarga.</p>
          </div>
          <label className="search-field gestion-doc-search">
            <Search size={18} />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") cargar();
              }}
              placeholder="Buscar código, versión o archivo"
            />
          </label>
        </div>

        {loading ? (
          <Loading text="Cargando gestión documental..." />
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Versión</th>
                  <th>Fecha</th>
                  <th>Archivo</th>
                  <th>Cargado por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {archivosEstandar.map((archivo) => (
                  <tr key={archivo.id}>
                    <td><strong>{archivo.codigo}</strong><small>{archivo.observaciones || "Sin observaciones"}</small></td>
                    <td>{archivo.version}</td>
                    <td>{archivo.fecha_documento || "-"}</td>
                    <td>
                      <FileText size={16} /> {archivo.nombre_archivo}
                      <small>{formatoBytes(archivo.tamano_bytes)}</small>
                    </td>
                    <td>{archivo.usuario_nombre || "Sistema"}</td>
                    <td className="actions">
                      <button type="button" onClick={() => descargar(archivo)} disabled={accion === `descargar-${archivo.id}`}>
                        <Download size={16} />
                      </button>
                      <button className="danger" type="button" onClick={() => eliminar(archivo)} disabled={accion === `eliminar-${archivo.id}`}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!archivosEstandar.length && <div className="empty-state">No hay archivos cargados para este estándar.</div>}
          </>
        )}
      </section>
    </section>
  );
}
