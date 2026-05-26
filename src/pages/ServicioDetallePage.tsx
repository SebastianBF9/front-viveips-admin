import { Edit2, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  actualizarRelacion,
  crearRelacion,
  eliminarRelacion,
  listarServiciosIps,
  obtenerDetalleServicio,
} from "../api";
import type { EstadoRelacion, RelacionPayload, ServicioDetalle, ServicioIps, ServicioRelacion } from "../types";
import { Loading } from "../ui/Loading";

const estados: EstadoRelacion[] = ["pendiente", "en_revision", "cumple", "no_cumple", "no_aplica"];
const tiposRelacion = [
  "componente_asistencial",
  "servicio_independiente_soporte",
  "interdependencia_propia",
  "interdependencia_contratada",
  "procedimiento_interno",
];

const estadoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  cumple: "Cumple",
  no_cumple: "No cumple",
  no_aplica: "No aplica",
  habilitado: "Habilitado",
  proximo: "Próximo",
};

const formInicial: RelacionPayload = {
  servicio_soporte_ips_id: null,
  servicio_soporte_codigo: "",
  servicio_soporte_nombre: "",
  tipo_relacion: "componente_asistencial",
  propio_o_contratado: "propio",
  modalidad_compatible: "domiciliaria",
  complejidad_compatible: "baja",
  requiere_reps: true,
  estado: "pendiente",
  observaciones: "",
};

export function ServicioDetallePage() {
  const { codigo = "" } = useParams();
  const [detalle, setDetalle] = useState<ServicioDetalle | null>(null);
  const [servicios, setServicios] = useState<ServicioIps[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<ServicioRelacion | null>(null);
  const [form, setForm] = useState<RelacionPayload>(formInicial);

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const [detalleData, serviciosData] = await Promise.all([
        obtenerDetalleServicio(codigo),
        listarServiciosIps(),
      ]);
      setDetalle(detalleData);
      setServicios(serviciosData.servicios || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el servicio");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [codigo]);

  const serviciosSoporte = useMemo(() => {
    return servicios.filter((servicio) => servicio.codigo !== codigo);
  }, [codigo, servicios]);

  function abrirNuevo() {
    setEditando(null);
    setForm(formInicial);
    setModalOpen(true);
  }

  function abrirEditar(relacion: ServicioRelacion) {
    setEditando(relacion);
    setForm({
      servicio_soporte_ips_id: relacion.servicio_soporte_ips_id,
      servicio_soporte_codigo: relacion.servicio_soporte_codigo || "",
      servicio_soporte_nombre: relacion.servicio_soporte_nombre || "",
      tipo_relacion: relacion.tipo_relacion,
      propio_o_contratado: relacion.propio_o_contratado,
      modalidad_compatible: relacion.modalidad_compatible || "",
      complejidad_compatible: relacion.complejidad_compatible || "",
      requiere_reps: Boolean(relacion.requiere_reps),
      estado: relacion.estado,
      observaciones: relacion.observaciones || "",
    });
    setModalOpen(true);
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editando) {
        await actualizarRelacion(editando.id, form);
      } else {
        await crearRelacion(codigo, form);
      }
      setModalOpen(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la relación");
    } finally {
      setSaving(false);
    }
  }

  async function borrar(relacion: ServicioRelacion) {
    if (!confirm(`¿Eliminar la relación con ${relacion.servicio_soporte_nombre}?`)) return;
    await eliminarRelacion(relacion.id);
    await cargar();
  }

  if (loading) return <Loading text="Cargando detalle del servicio..." />;
  if (error && !detalle) return <div className="error-box">{error}</div>;
  if (!detalle) return <Loading text="Servicio no encontrado." />;

  const { servicio, resumen } = detalle;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <Link className="back-link" to="/servicios">Servicios</Link>
          <span className="eyebrow">Servicio {servicio.codigo}</span>
          <h1>{servicio.nombre}</h1>
          <p>{servicio.observaciones || "Dashboard independiente de habilitación."}</p>
          <div className="meta-row">
            <span className={`pill ${servicio.estado}`}>{estadoLabel[servicio.estado] || servicio.estado}</span>
            <span className="tag">{servicio.grupo}</span>
            {servicio.tipo && <span className="tag">{servicio.tipo}</span>}
            {servicio.distintivo && <span className="tag">{servicio.distintivo}</span>}
          </div>
        </div>
        <button className="primary-btn" type="button" onClick={abrirNuevo}>
          <Plus size={18} />
          Agregar relación
        </button>
      </header>

      {error && <div className="error-box">{error}</div>}

      <div className="kpi-grid five">
        <article className="kpi-card"><strong>{resumen.relaciones_total}</strong><span>Relaciones</span></article>
        <article className="kpi-card"><strong>{resumen.componentes_propios}</strong><span>Componentes propios</span></article>
        <article className="kpi-card"><strong>{resumen.interdependencias}</strong><span>Interdependencias</span></article>
        <article className="kpi-card"><strong>{resumen.relaciones_pendientes}</strong><span>Pendientes</span></article>
        <article className="kpi-card"><strong>{resumen.relaciones_en_revision}</strong><span>En revisión</span></article>
      </div>

      <section className="table-card">
        <div className="section-heading">
          <h2>Componentes e interdependencias</h2>
          <p>Las relaciones no cierran cumplimiento automáticamente; deben validarse con evidencia.</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Servicio relacionado</th>
              <th>Tipo</th>
              <th>Propiedad</th>
              <th>Estado</th>
              <th>Modalidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {detalle.relaciones.map((relacion) => (
              <tr key={relacion.id}>
                <td>
                  <strong>{relacion.servicio_soporte_codigo} {relacion.servicio_soporte_nombre}</strong>
                  <small>{relacion.observaciones || "Sin observaciones"}</small>
                </td>
                <td>{relacion.tipo_relacion}</td>
                <td>{relacion.propio_o_contratado}</td>
                <td><span className={`pill ${relacion.estado}`}>{estadoLabel[relacion.estado] || relacion.estado}</span></td>
                <td>{[relacion.modalidad_compatible, relacion.complejidad_compatible].filter(Boolean).join(" / ") || "Por definir"}</td>
                <td className="actions">
                  <button type="button" onClick={() => abrirEditar(relacion)}><Edit2 size={16} /></button>
                  <button type="button" className="danger" onClick={() => borrar(relacion)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {detalle.relaciones.length === 0 && <Loading text="No hay relaciones configuradas." />}
      </section>

      <section className="standards-grid">
        {detalle.estandares.map((estandar) => (
          <article className="standard-card" key={estandar.id}>
            <strong>{estandar.nombre}</strong>
            <span>{estandar.descripcion || "Pendiente de checklist específico."}</span>
          </article>
        ))}
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <form className="modal" onSubmit={guardar} onMouseDown={(event) => event.stopPropagation()}>
            <h2>{editando ? "Editar relación" : "Agregar relación"}</h2>

            <label>
              Servicio Vive IPS relacionado
              <select
                value={form.servicio_soporte_ips_id || ""}
                onChange={(event) => {
                  const value = event.target.value ? Number(event.target.value) : null;
                  setForm({ ...form, servicio_soporte_ips_id: value });
                }}
              >
                <option value="">Servicio externo o no registrado</option>
                {serviciosSoporte.map((servicioItem) => (
                  <option key={servicioItem.id} value={servicioItem.id}>
                    {servicioItem.codigo} - {servicioItem.nombre}
                  </option>
                ))}
              </select>
            </label>

            {!form.servicio_soporte_ips_id && (
              <div className="form-grid">
                <label>
                  Código soporte
                  <input value={form.servicio_soporte_codigo || ""} onChange={(event) => setForm({ ...form, servicio_soporte_codigo: event.target.value })} />
                </label>
                <label>
                  Nombre soporte
                  <input value={form.servicio_soporte_nombre || ""} onChange={(event) => setForm({ ...form, servicio_soporte_nombre: event.target.value })} />
                </label>
              </div>
            )}

            <div className="form-grid">
              <label>
                Tipo relación
                <select value={form.tipo_relacion} onChange={(event) => setForm({ ...form, tipo_relacion: event.target.value })}>
                  {tiposRelacion.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
              </label>
              <label>
                Propio / contratado
                <select value={form.propio_o_contratado} onChange={(event) => setForm({ ...form, propio_o_contratado: event.target.value as "propio" | "contratado" })}>
                  <option value="propio">propio</option>
                  <option value="contratado">contratado</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                Modalidad
                <input value={form.modalidad_compatible || ""} onChange={(event) => setForm({ ...form, modalidad_compatible: event.target.value })} />
              </label>
              <label>
                Complejidad
                <input value={form.complejidad_compatible || ""} onChange={(event) => setForm({ ...form, complejidad_compatible: event.target.value })} />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Estado
                <select value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value as EstadoRelacion })}>
                  {estados.map((item) => <option key={item} value={item}>{estadoLabel[item]}</option>)}
                </select>
              </label>
              <label className="check-row">
                <input type="checkbox" checked={form.requiere_reps} onChange={(event) => setForm({ ...form, requiere_reps: event.target.checked })} />
                Requiere REPS
              </label>
            </div>

            <label>
              Observaciones
              <textarea value={form.observaciones || ""} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} rows={4} />
            </label>

            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="primary-btn" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
