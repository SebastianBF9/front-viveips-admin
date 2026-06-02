import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  FlaskConical,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Search,
  Snowflake,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  actualizarProveedorRecurso,
  actualizarRecursoAsistencial,
  asociarProveedorRecurso,
  asociarServicioRecurso,
  crearProveedorRecurso,
  crearRecursoAsistencial,
  eliminarProveedorDeRecurso,
  eliminarProveedorRecurso,
  eliminarRecursoAsistencial,
  eliminarServicioDeRecurso,
  listarProveedoresRecursos,
  listarRecursosAsistenciales,
  listarServiciosIps,
  obtenerRecursoAsistencial,
  subirFichaTecnicaRecurso,
} from "../api";
import type {
  ProveedorRecurso,
  ProveedorRecursoPayload,
  RecursoAsistencial,
  RecursoAsistencialPayload,
  ServicioIps,
} from "../types";
import { Loading } from "../ui/Loading";

const TIPOS_RECURSO = [
  { value: "medicamento", label: "Medicamento" },
  { value: "dispositivo_medico", label: "Dispositivo medico" },
  { value: "insumo", label: "Insumo" },
];

const ESTADOS_RECURSO = ["activo", "inactivo", "en_revision", "rechazado"];
const ESTADOS_PROVEEDOR = ["activo", "inactivo", "en_revision", "bloqueado"];
const TABS = ["catalogo", "proveedores", "compras", "recepcion", "inventario", "distribucion", "auditoria"] as const;

type TabKey = (typeof TABS)[number];

type RecursoForm = {
  id?: number;
  codigo: string;
  nombre: string;
  tipo_recurso: string;
  descripcion: string;
  presentacion: string;
  unidad_medida: string;
  concentracion: string;
  principio_activo: string;
  registro_sanitario: string;
  fecha_vencimiento_registro_sanitario: string;
  requiere_registro_sanitario: boolean;
  requiere_cadena_frio: boolean;
  temperatura_min: string;
  temperatura_max: string;
  humedad_min: string;
  humedad_max: string;
  es_lasa: boolean;
  alto_riesgo: boolean;
  requiere_formula: boolean;
  requiere_ficha_tecnica: boolean;
  stock_minimo: string;
  stock_maximo: string;
  punto_reorden: string;
  tiempo_reposicion_dias: string;
  estado: string;
  observaciones: string;
  servicios: number[];
  proveedores: number[];
  ficha?: File | null;
  ficha_version: string;
  ficha_fecha: string;
  ficha_observaciones: string;
};

type ProveedorForm = ProveedorRecursoPayload & { id?: number };

function bool(valor: unknown) {
  return valor === true || valor === 1 || valor === "1";
}

function texto(valor?: string | number | null) {
  if (valor === 0) return "0";
  return valor ? String(valor) : "-";
}

function numero(valor: string) {
  const limpio = String(valor || "").replace(/[^0-9.,-]/g, "").replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) && limpio ? n : null;
}

function labelTipo(tipo?: string | null) {
  return TIPOS_RECURSO.find((item) => item.value === tipo)?.label || texto(tipo);
}

function inicialRecurso(): RecursoForm {
  return {
    codigo: "",
    nombre: "",
    tipo_recurso: "medicamento",
    descripcion: "",
    presentacion: "",
    unidad_medida: "",
    concentracion: "",
    principio_activo: "",
    registro_sanitario: "",
    fecha_vencimiento_registro_sanitario: "",
    requiere_registro_sanitario: false,
    requiere_cadena_frio: false,
    temperatura_min: "",
    temperatura_max: "",
    humedad_min: "",
    humedad_max: "",
    es_lasa: false,
    alto_riesgo: false,
    requiere_formula: false,
    requiere_ficha_tecnica: false,
    stock_minimo: "0",
    stock_maximo: "0",
    punto_reorden: "0",
    tiempo_reposicion_dias: "",
    estado: "activo",
    observaciones: "",
    servicios: [],
    proveedores: [],
    ficha: null,
    ficha_version: "",
    ficha_fecha: "",
    ficha_observaciones: "",
  };
}

function recursoAForm(recurso: RecursoAsistencial): RecursoForm {
  return {
    ...inicialRecurso(),
    id: recurso.id,
    codigo: recurso.codigo || "",
    nombre: recurso.nombre || "",
    tipo_recurso: recurso.tipo_recurso || "medicamento",
    descripcion: recurso.descripcion || "",
    presentacion: recurso.presentacion || "",
    unidad_medida: recurso.unidad_medida || "",
    concentracion: recurso.concentracion || "",
    principio_activo: recurso.principio_activo || "",
    registro_sanitario: recurso.registro_sanitario || "",
    fecha_vencimiento_registro_sanitario: recurso.fecha_vencimiento_registro_sanitario || "",
    requiere_registro_sanitario: bool(recurso.requiere_registro_sanitario),
    requiere_cadena_frio: bool(recurso.requiere_cadena_frio),
    temperatura_min: recurso.temperatura_min != null ? String(recurso.temperatura_min) : "",
    temperatura_max: recurso.temperatura_max != null ? String(recurso.temperatura_max) : "",
    humedad_min: recurso.humedad_min != null ? String(recurso.humedad_min) : "",
    humedad_max: recurso.humedad_max != null ? String(recurso.humedad_max) : "",
    es_lasa: bool(recurso.es_lasa),
    alto_riesgo: bool(recurso.alto_riesgo),
    requiere_formula: bool(recurso.requiere_formula),
    requiere_ficha_tecnica: bool(recurso.requiere_ficha_tecnica),
    stock_minimo: recurso.stock_minimo != null ? String(recurso.stock_minimo) : "0",
    stock_maximo: recurso.stock_maximo != null ? String(recurso.stock_maximo) : "0",
    punto_reorden: recurso.punto_reorden != null ? String(recurso.punto_reorden) : "0",
    tiempo_reposicion_dias: recurso.tiempo_reposicion_dias != null ? String(recurso.tiempo_reposicion_dias) : "",
    estado: recurso.estado || "activo",
    observaciones: recurso.observaciones || "",
    servicios: (recurso.servicios || []).map((item) => item.servicio_ips_id),
    proveedores: (recurso.proveedores || []).map((item) => item.proveedor_id),
  };
}

function inicialProveedor(): ProveedorForm {
  return {
    nombre: "",
    nit: "",
    contacto_nombre: "",
    contacto_cargo: "",
    telefono: "",
    correo: "",
    direccion: "",
    ciudad: "",
    departamento: "",
    estado: "activo",
    observaciones: "",
  };
}

function proveedorAForm(proveedor: ProveedorRecurso): ProveedorForm {
  return {
    id: proveedor.id,
    nombre: proveedor.nombre || "",
    nit: proveedor.nit || "",
    contacto_nombre: proveedor.contacto_nombre || "",
    contacto_cargo: proveedor.contacto_cargo || "",
    telefono: proveedor.telefono || "",
    correo: proveedor.correo || "",
    direccion: proveedor.direccion || "",
    ciudad: proveedor.ciudad || "",
    departamento: proveedor.departamento || "",
    estado: proveedor.estado || "activo",
    observaciones: proveedor.observaciones || "",
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="recursos-form-section">
      <h3>{title}</h3>
      <div className="recursos-form-grid">{children}</div>
    </section>
  );
}

export function RecursosAsistencialesPage() {
  const [tab, setTab] = useState<TabKey>("catalogo");
  const [recursos, setRecursos] = useState<RecursoAsistencial[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorRecurso[]>([]);
  const [servicios, setServicios] = useState<ServicioIps[]>([]);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [servicioFiltro, setServicioFiltro] = useState("");
  const [recursoForm, setRecursoForm] = useState<RecursoForm | null>(null);
  const [proveedorForm, setProveedorForm] = useState<ProveedorForm | null>(null);

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const [recursosData, proveedoresData, serviciosData] = await Promise.all([
        listarRecursosAsistenciales(),
        listarProveedoresRecursos(),
        listarServiciosIps(),
      ]);
      setRecursos(recursosData.recursos || []);
      setProveedores(proveedoresData.proveedores || []);
      setServicios(
        (serviciosData.servicios || [])
          .filter((servicio) => servicio.estado === "habilitado" || servicio.estado === "proximo")
          .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "es")),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar recursos asistenciales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const recursosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recursos.filter((recurso) => {
      if (tipo && recurso.tipo_recurso !== tipo) return false;
      if (estado && recurso.estado !== estado) return false;
      if (servicioFiltro && !(recurso.servicios_resumen || "").includes(servicioFiltro)) return false;
      if (!q) return true;
      return [recurso.codigo, recurso.nombre, recurso.registro_sanitario, recurso.principio_activo, recurso.proveedores_resumen, recurso.servicios_resumen].some((value) =>
        String(value || "").toLowerCase().includes(q),
      );
    });
  }, [estado, query, recursos, servicioFiltro, tipo]);

  const kpis = useMemo(
    () => ({
      total: recursos.length,
      medicamentos: recursos.filter((item) => item.tipo_recurso === "medicamento").length,
      cadenaFrio: recursos.filter((item) => bool(item.requiere_cadena_frio)).length,
      lasa: recursos.filter((item) => bool(item.es_lasa)).length,
    }),
    [recursos],
  );

  function actualizarRecurso(campo: keyof RecursoForm, valor: string | boolean | number[] | File | null) {
    setRecursoForm((actual) => {
      if (!actual) return actual;
      const siguiente = { ...actual, [campo]: valor };
      if (campo === "requiere_cadena_frio" && valor === false) {
        siguiente.temperatura_min = "";
        siguiente.temperatura_max = "";
      }
      return siguiente;
    });
  }

  function toggleRelacion(campo: "servicios" | "proveedores", id: number) {
    setRecursoForm((actual) => {
      if (!actual) return actual;
      const set = new Set(actual[campo]);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...actual, [campo]: [...set] };
    });
  }

  function payloadRecurso(form: RecursoForm): RecursoAsistencialPayload {
    return {
      codigo: form.codigo.trim() || null,
      nombre: form.nombre.trim(),
      tipo_recurso: form.tipo_recurso,
      descripcion: form.descripcion || null,
      presentacion: form.presentacion || null,
      unidad_medida: form.unidad_medida || null,
      concentracion: form.concentracion || null,
      principio_activo: form.principio_activo || null,
      registro_sanitario: form.registro_sanitario || null,
      fecha_vencimiento_registro_sanitario: form.fecha_vencimiento_registro_sanitario || null,
      requiere_registro_sanitario: form.requiere_registro_sanitario,
      requiere_cadena_frio: form.requiere_cadena_frio,
      temperatura_min: form.requiere_cadena_frio ? numero(form.temperatura_min) : null,
      temperatura_max: form.requiere_cadena_frio ? numero(form.temperatura_max) : null,
      humedad_min: numero(form.humedad_min),
      humedad_max: numero(form.humedad_max),
      es_lasa: form.es_lasa,
      alto_riesgo: form.alto_riesgo,
      requiere_formula: form.requiere_formula,
      requiere_ficha_tecnica: form.requiere_ficha_tecnica,
      stock_minimo: numero(form.stock_minimo) || 0,
      stock_maximo: numero(form.stock_maximo) || 0,
      punto_reorden: numero(form.punto_reorden) || 0,
      tiempo_reposicion_dias: form.tiempo_reposicion_dias ? Number(form.tiempo_reposicion_dias) : null,
      estado: form.estado,
      observaciones: form.observaciones || null,
    };
  }

  async function abrirEditarRecurso(recurso: RecursoAsistencial) {
    setAccion(`editar-recurso-${recurso.id}`);
    try {
      const data = await obtenerRecursoAsistencial(recurso.id);
      setRecursoForm(recursoAForm(data.recurso));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el recurso");
    } finally {
      setAccion("");
    }
  }

  async function guardarRecurso() {
    if (!recursoForm) return;
    if (!recursoForm.nombre.trim()) {
      setError("El nombre del recurso es obligatorio.");
      return;
    }
    setAccion("guardar-recurso");
    setError("");
    setSuccess("");
    try {
      const previo = recursoForm.id ? await obtenerRecursoAsistencial(recursoForm.id) : null;
      const recursoId = recursoForm.id
        ? (await actualizarRecursoAsistencial(recursoForm.id, payloadRecurso(recursoForm)), recursoForm.id)
        : (await crearRecursoAsistencial(payloadRecurso(recursoForm))).recurso_id;

      const serviciosPrevios = new Set((previo?.recurso.servicios || []).map((item) => item.servicio_ips_id));
      const proveedoresPrevios = new Set((previo?.recurso.proveedores || []).map((item) => item.proveedor_id));

      for (const servicioId of recursoForm.servicios) {
        await asociarServicioRecurso(recursoId, { servicio_ips_id: servicioId, tipo_relacion: "relacionado", estado: "activo" });
        serviciosPrevios.delete(servicioId);
      }
      for (const servicioId of serviciosPrevios) await eliminarServicioDeRecurso(recursoId, servicioId);

      recursoForm.proveedores.forEach((proveedorId, index) => proveedoresPrevios.delete(proveedorId));
      for (const proveedorId of recursoForm.proveedores) {
        await asociarProveedorRecurso(recursoId, { proveedor_id: proveedorId, proveedor_preferido: proveedorId === recursoForm.proveedores[0], estado: "activo" });
      }
      for (const proveedorId of proveedoresPrevios) await eliminarProveedorDeRecurso(recursoId, proveedorId);

      if (recursoForm.ficha) {
        await subirFichaTecnicaRecurso(recursoId, recursoForm.ficha, {
          version: recursoForm.ficha_version,
          fecha_documento: recursoForm.ficha_fecha,
          observaciones: recursoForm.ficha_observaciones,
        });
      }

      setRecursoForm(null);
      setSuccess("Recurso guardado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el recurso");
    } finally {
      setAccion("");
    }
  }

  async function guardarProveedor() {
    if (!proveedorForm) return;
    if (!proveedorForm.nombre.trim()) {
      setError("El nombre del proveedor es obligatorio.");
      return;
    }
    setAccion("guardar-proveedor");
    setError("");
    setSuccess("");
    try {
      if (proveedorForm.id) await actualizarProveedorRecurso(proveedorForm.id, proveedorForm);
      else await crearProveedorRecurso(proveedorForm);
      setProveedorForm(null);
      setSuccess("Proveedor guardado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el proveedor");
    } finally {
      setAccion("");
    }
  }

  async function inactivarRecurso(recurso: RecursoAsistencial) {
    if (!window.confirm(`Inactivar ${recurso.nombre}?`)) return;
    setAccion(`inactivar-recurso-${recurso.id}`);
    try {
      await eliminarRecursoAsistencial(recurso.id);
      setSuccess("Recurso inactivado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible inactivar el recurso");
    } finally {
      setAccion("");
    }
  }

  async function inactivarProveedor(proveedor: ProveedorRecurso) {
    if (!window.confirm(`Inactivar ${proveedor.nombre}?`)) return;
    setAccion(`inactivar-proveedor-${proveedor.id}`);
    try {
      await eliminarProveedorRecurso(proveedor.id);
      setSuccess("Proveedor inactivado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible inactivar el proveedor");
    } finally {
      setAccion("");
    }
  }

  return (
    <section className="page recursos-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Medicamentos e insumos</span>
          <h1>Recursos Asistenciales</h1>
          <p>Catálogo base de medicamentos, dispositivos médicos, insumos, proveedores y relación con servicios IPS.</p>
        </div>
        <div className="infra-header-actions recursos-header-actions">
          <button className="secondary-btn" type="button" onClick={cargar} disabled={loading}>
            Actualizar
          </button>
          <button className="brand-action-btn" type="button" onClick={() => setRecursoForm(inicialRecurso())}>
            <Plus size={17} /> Nuevo recurso
          </button>
        </div>
      </header>

      <div className="kpi-grid four">
        <MiniKpi icon={<Boxes size={18} />} label="Total recursos" value={kpis.total} />
        <MiniKpi icon={<FlaskConical size={18} />} label="Medicamentos" value={kpis.medicamentos} />
        <MiniKpi icon={<Snowflake size={18} />} label="Cadena de frio" value={kpis.cadenaFrio} tone="info" />
        <MiniKpi icon={<AlertTriangle size={18} />} label="LASA" value={kpis.lasa} tone="warning" />
      </div>

      <div className="tabs recursos-tabs">
        {TABS.map((item) => (
          <button key={item} className={tab === item ? "active" : ""} type="button" onClick={() => setTab(item)}>
            {item === "catalogo" ? "Catálogo" : item === "recepcion" ? "Recepción" : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}
      {loading && <Loading text="Cargando recursos asistenciales..." />}

      {!loading && tab === "catalogo" && (
        <>
          <div className="toolbar">
            <label className="search-field">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar recurso, código, registro sanitario o proveedor" />
            </label>
            <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
              <option value="">Todos los tipos</option>
              {TIPOS_RECURSO.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select value={estado} onChange={(event) => setEstado(event.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_RECURSO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={servicioFiltro} onChange={(event) => setServicioFiltro(event.target.value)}>
              <option value="">Todos los servicios</option>
              {servicios.map((servicio) => (
                <option key={servicio.id} value={`${servicio.codigo} - ${servicio.nombre}`}>
                  {servicio.codigo} - {servicio.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="recursos-grid">
            {recursosFiltrados.map((recurso) => (
              <article className="recurso-card" key={recurso.id}>
                <div className="recurso-card-head">
                  <div className="recurso-icon">
                    <PackagePlus size={19} />
                  </div>
                  <div>
                    <strong>{recurso.nombre}</strong>
                    <span>{texto(recurso.codigo)} · {labelTipo(recurso.tipo_recurso)}</span>
                  </div>
                </div>
                <div className="meta-row">
                  <span className={`pill ${recurso.estado}`}>{recurso.estado}</span>
                  {bool(recurso.requiere_cadena_frio) && <span className="tag cold">Cadena de frio</span>}
                  {bool(recurso.es_lasa) && <span className="tag lasa">LASA</span>}
                </div>
                <dl className="recurso-dl">
                  <div><dt>Servicios</dt><dd>{texto(recurso.servicios_resumen)}</dd></div>
                  <div><dt>Proveedor principal</dt><dd>{texto(recurso.proveedor_principal || recurso.proveedores_resumen)}</dd></div>
                  <div><dt>Registro sanitario</dt><dd>{texto(recurso.registro_sanitario)}</dd></div>
                  <div><dt>Stock mín / máx</dt><dd>{texto(recurso.stock_minimo)} / {texto(recurso.stock_maximo)}</dd></div>
                </dl>
                <div className="recursos-actions">
                  <button type="button" onClick={() => abrirEditarRecurso(recurso)} disabled={accion === `editar-recurso-${recurso.id}`}>
                    <Pencil size={15} /> Editar
                  </button>
                  <button className="danger" type="button" onClick={() => inactivarRecurso(recurso)} disabled={accion === `inactivar-recurso-${recurso.id}`}>
                    <Trash2 size={15} /> Inactivar
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!recursosFiltrados.length && <div className="empty-state">No hay recursos para los filtros seleccionados.</div>}
        </>
      )}

      {!loading && tab === "proveedores" && (
        <section className="table-card">
          <div className="section-heading inline-heading">
            <div>
              <h2>Proveedores</h2>
              <p>Aliados para compra y suministro de recursos asistenciales.</p>
            </div>
            <button className="primary-btn" type="button" onClick={() => setProveedorForm(inicialProveedor())}>
              <Plus size={16} /> Nuevo proveedor
            </button>
          </div>
          <div className="recursos-provider-grid">
            {proveedores.map((proveedor) => (
              <article className="proveedor-card" key={proveedor.id}>
                <strong>{proveedor.nombre}</strong>
                <span>NIT: {texto(proveedor.nit)}</span>
                <span>{texto(proveedor.telefono)} · {texto(proveedor.correo)}</span>
                <span className={`pill ${proveedor.estado}`}>{proveedor.estado}</span>
                <div className="recursos-actions">
                  <button type="button" onClick={() => setProveedorForm(proveedorAForm(proveedor))}>
                    <Pencil size={15} /> Editar
                  </button>
                  <button className="danger" type="button" onClick={() => inactivarProveedor(proveedor)}>
                    <Trash2 size={15} /> Inactivar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && !["catalogo", "proveedores"].includes(tab) && (
        <div className="standard-card recursos-placeholder">
          <ClipboardList size={22} />
          <div>
            <h2>{tab === "recepcion" ? "Recepción" : tab[0].toUpperCase() + tab.slice(1)}</h2>
            <p>Esta pestaña queda preparada para fases posteriores del plan. La Fase 1 se concentra en catálogo, proveedores y relaciones.</p>
          </div>
        </div>
      )}

      {recursoForm && (
        <div className="modal-backdrop" onMouseDown={() => setRecursoForm(null)}>
          <div className="modal wide-modal recursos-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>{recursoForm.id ? "Editar recurso asistencial" : "Nuevo recurso asistencial"}</h2>
                <p>Relaciona el recurso con servicios IPS y proveedores sin usar texto libre de servicio.</p>
              </div>
              <button type="button" onClick={() => setRecursoForm(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="infra-form-body">
              <Section title="Datos generales">
                <label>Tipo de recurso
                  <select value={recursoForm.tipo_recurso} onChange={(event) => actualizarRecurso("tipo_recurso", event.target.value)}>
                    {TIPOS_RECURSO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>Código
                  <input value={recursoForm.codigo} onChange={(event) => actualizarRecurso("codigo", event.target.value)} placeholder="Se genera si se deja vacío" />
                </label>
                <label className="wide-field">Nombre *
                  <input value={recursoForm.nombre} onChange={(event) => actualizarRecurso("nombre", event.target.value)} />
                </label>
                <label>Presentación
                  <input value={recursoForm.presentacion} onChange={(event) => actualizarRecurso("presentacion", event.target.value)} />
                </label>
                <label>Unidad de medida
                  <input value={recursoForm.unidad_medida} onChange={(event) => actualizarRecurso("unidad_medida", event.target.value)} />
                </label>
                <label>Concentración
                  <input value={recursoForm.concentracion} onChange={(event) => actualizarRecurso("concentracion", event.target.value)} disabled={recursoForm.tipo_recurso !== "medicamento"} />
                </label>
                <label>Principio activo
                  <input value={recursoForm.principio_activo} onChange={(event) => actualizarRecurso("principio_activo", event.target.value)} disabled={recursoForm.tipo_recurso !== "medicamento"} />
                </label>
                <label>Estado
                  <select value={recursoForm.estado} onChange={(event) => actualizarRecurso("estado", event.target.value)}>
                    {ESTADOS_RECURSO.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="wide-field">Descripción
                  <textarea rows={2} value={recursoForm.descripcion} onChange={(event) => actualizarRecurso("descripcion", event.target.value)} />
                </label>
              </Section>

              <Section title="Registro sanitario y riesgos">
                <label>Registro sanitario
                  <input value={recursoForm.registro_sanitario} onChange={(event) => actualizarRecurso("registro_sanitario", event.target.value)} />
                </label>
                <label>Vencimiento registro sanitario
                  <input type="date" value={recursoForm.fecha_vencimiento_registro_sanitario} onChange={(event) => actualizarRecurso("fecha_vencimiento_registro_sanitario", event.target.value)} />
                </label>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.requiere_registro_sanitario} onChange={(event) => actualizarRecurso("requiere_registro_sanitario", event.target.checked)} /> Requiere registro sanitario</label>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.es_lasa} onChange={(event) => actualizarRecurso("es_lasa", event.target.checked)} /> Es medicamento LASA</label>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.alto_riesgo} onChange={(event) => actualizarRecurso("alto_riesgo", event.target.checked)} /> Alto riesgo</label>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.requiere_formula} onChange={(event) => actualizarRecurso("requiere_formula", event.target.checked)} /> Requiere fórmula</label>
                {recursoForm.es_lasa && <div className="recursos-lasa-alert wide-field">LASA marcado: validar almacenamiento, rotulación y dispensación diferenciada.</div>}
              </Section>

              <Section title="Cadena de frío y suficiencia">
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.requiere_cadena_frio} onChange={(event) => actualizarRecurso("requiere_cadena_frio", event.target.checked)} /> Requiere cadena de frío</label>
                <label>Temperatura mínima
                  <input value={recursoForm.temperatura_min} onChange={(event) => actualizarRecurso("temperatura_min", event.target.value)} disabled={!recursoForm.requiere_cadena_frio} inputMode="decimal" />
                </label>
                <label>Temperatura máxima
                  <input value={recursoForm.temperatura_max} onChange={(event) => actualizarRecurso("temperatura_max", event.target.value)} disabled={!recursoForm.requiere_cadena_frio} inputMode="decimal" />
                </label>
                <label>Humedad mínima
                  <input value={recursoForm.humedad_min} onChange={(event) => actualizarRecurso("humedad_min", event.target.value)} inputMode="decimal" />
                </label>
                <label>Humedad máxima
                  <input value={recursoForm.humedad_max} onChange={(event) => actualizarRecurso("humedad_max", event.target.value)} inputMode="decimal" />
                </label>
                <label>Stock mínimo
                  <input value={recursoForm.stock_minimo} onChange={(event) => actualizarRecurso("stock_minimo", event.target.value)} inputMode="decimal" />
                </label>
                <label>Stock máximo
                  <input value={recursoForm.stock_maximo} onChange={(event) => actualizarRecurso("stock_maximo", event.target.value)} inputMode="decimal" />
                </label>
                <label>Punto de reorden
                  <input value={recursoForm.punto_reorden} onChange={(event) => actualizarRecurso("punto_reorden", event.target.value)} inputMode="decimal" />
                </label>
                <label>Tiempo reposición días
                  <input value={recursoForm.tiempo_reposicion_dias} onChange={(event) => actualizarRecurso("tiempo_reposicion_dias", event.target.value)} inputMode="numeric" />
                </label>
              </Section>

              <Section title="Servicios IPS relacionados">
                <div className="recursos-check-list wide-field">
                  {servicios.map((servicio) => (
                    <label key={servicio.id}>
                      <input type="checkbox" checked={recursoForm.servicios.includes(servicio.id)} onChange={() => toggleRelacion("servicios", servicio.id)} />
                      <span>{servicio.codigo} - {servicio.nombre}</span>
                    </label>
                  ))}
                </div>
              </Section>

              <Section title="Proveedores y ficha técnica">
                <div className="recursos-check-list wide-field">
                  {proveedores.filter((proveedor) => proveedor.estado !== "bloqueado").map((proveedor) => (
                    <label key={proveedor.id}>
                      <input type="checkbox" checked={recursoForm.proveedores.includes(proveedor.id)} onChange={() => toggleRelacion("proveedores", proveedor.id)} />
                      <span>{proveedor.nombre}{proveedor.nit ? ` · ${proveedor.nit}` : ""}</span>
                    </label>
                  ))}
                </div>
                <label className="infra-check-field"><input type="checkbox" checked={recursoForm.requiere_ficha_tecnica} onChange={(event) => actualizarRecurso("requiere_ficha_tecnica", event.target.checked)} /> Requiere ficha técnica</label>
                <label>Ficha técnica
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx" onChange={(event: ChangeEvent<HTMLInputElement>) => actualizarRecurso("ficha", event.target.files?.[0] || null)} />
                </label>
                <label>Versión ficha
                  <input value={recursoForm.ficha_version} onChange={(event) => actualizarRecurso("ficha_version", event.target.value)} />
                </label>
                <label>Fecha documento
                  <input type="date" value={recursoForm.ficha_fecha} onChange={(event) => actualizarRecurso("ficha_fecha", event.target.value)} />
                </label>
                <label className="wide-field">Observaciones
                  <textarea rows={2} value={recursoForm.observaciones} onChange={(event) => actualizarRecurso("observaciones", event.target.value)} />
                </label>
              </Section>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setRecursoForm(null)}>Cancelar</button>
              <button className="primary-btn infra-save-btn" type="button" onClick={guardarRecurso} disabled={accion === "guardar-recurso"}><Save size={16} /> Guardar recurso</button>
            </div>
          </div>
        </div>
      )}

      {proveedorForm && (
        <div className="modal-backdrop" onMouseDown={() => setProveedorForm(null)}>
          <div className="modal infra-small-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="infra-modal-header">
              <div>
                <h2>{proveedorForm.id ? "Editar proveedor" : "Nuevo proveedor"}</h2>
                <p>Proveedor disponible para compra de medicamentos, dispositivos e insumos.</p>
              </div>
              <button type="button" onClick={() => setProveedorForm(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="infra-form-grid">
              {[
                ["nombre", "Nombre *"],
                ["nit", "NIT"],
                ["contacto_nombre", "Contacto"],
                ["contacto_cargo", "Cargo contacto"],
                ["telefono", "Teléfono"],
                ["correo", "Correo"],
                ["direccion", "Dirección"],
                ["ciudad", "Ciudad"],
                ["departamento", "Departamento"],
              ].map(([campo, label]) => (
                <label key={campo}>{label}
                  <input value={String(proveedorForm[campo as keyof ProveedorForm] || "")} onChange={(event) => setProveedorForm({ ...proveedorForm, [campo]: event.target.value })} />
                </label>
              ))}
              <label>Estado
                <select value={proveedorForm.estado} onChange={(event) => setProveedorForm({ ...proveedorForm, estado: event.target.value })}>
                  {ESTADOS_PROVEEDOR.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="wide-field">Observaciones
                <textarea rows={3} value={proveedorForm.observaciones || ""} onChange={(event) => setProveedorForm({ ...proveedorForm, observaciones: event.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setProveedorForm(null)}>Cancelar</button>
              <button className="primary-btn" type="button" onClick={guardarProveedor} disabled={accion === "guardar-proveedor"}>Guardar proveedor</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MiniKpi({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone?: string }) {
  return (
    <article className={`kpi-card compact ${tone || ""}`}>
      <div className="kpi-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
