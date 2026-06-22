import { Camera, Eraser, FileDown, GraduationCap, IdCard, LogOut, MapPin, Menu, PenLine, Truck, X } from "lucide-react";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearSession,
  confirmarMiEntregaRecurso,
  descargarMisDespachosAsignados,
  downloadUrl,
  getToken,
  listarEnfermerasConfirmacionRecursos,
  listarMisEntregasRecursos,
  obtenerMiEntregaRecurso,
  obtenerMiPerfilProfesional,
  registrarMiEntregaFallida,
  subirEvidenciaMiEntrega,
} from "../api";
import type { DespachoRecurso, DespachoRecursoDetalle, ProfesionalAdmin, ProfesionalPerfil } from "../types";
import { Loading } from "../ui/Loading";

type EntregaForm = {
  recibido_por_nombre: string;
  recibido_por_documento: string;
  recibido_por_parentesco: string;
  paciente_email: string;
  enfermera_id: string;
  enfermera_nombre: string;
  enfermera_documento: string;
  latitud_entrega: string;
  longitud_entrega: string;
  observaciones: string;
  motivo_fallida: string;
  fecha_reintento: string;
};

const ENTREGA_INICIAL: EntregaForm = {
  recibido_por_nombre: "",
  recibido_por_documento: "",
  recibido_por_parentesco: "",
  paciente_email: "",
  enfermera_id: "",
  enfermera_nombre: "",
  enfermera_documento: "",
  latitud_entrega: "",
  longitud_entrega: "",
  observaciones: "",
  motivo_fallida: "",
  fecha_reintento: "",
};

function textoDescripcionItem(detalle: DespachoRecursoDetalle) {
  return (
    detalle.recurso_descripcion ||
    detalle.observaciones ||
    detalle.recomendaciones_almacenamiento ||
    (detalle.recurso_codigo ? `Código ${detalle.recurso_codigo}` : "") ||
    detalle.tipo_recurso ||
    ""
  );
}

function entregaRequiereConfirmacionEnfermeria(entrega: DespachoRecurso | null) {
  return Boolean(entrega?.detalles?.some((detalle) => (detalle.tipo_recurso || "").toLowerCase() === "insumo"));
}

export function EntregasRecursosPage() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<ProfesionalPerfil | null>(null);
  const [enfermeras, setEnfermeras] = useState<ProfesionalAdmin[]>([]);
  const [entregas, setEntregas] = useState<DespachoRecurso[]>([]);
  const [entregaActiva, setEntregaActiva] = useState<DespachoRecurso | null>(null);
  const [form, setForm] = useState<EntregaForm>(ENTREGA_INICIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [evidencia, setEvidencia] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasStroke, setHasStroke] = useState(false);
  const [hasEnfermeraStroke, setHasEnfermeraStroke] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const enfermeraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const enfermeraDrawingRef = useRef(false);

  async function cargar() {
    if (!getToken()) {
      navigate(`/login?next=${encodeURIComponent("/entregas-recursos")}`, { replace: true });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [perfilData, entregasData, enfermerasData] = await Promise.all([
        obtenerMiPerfilProfesional(),
        listarMisEntregasRecursos(),
        listarEnfermerasConfirmacionRecursos(),
      ]);
      setPerfil(perfilData.perfil);
      setEnfermeras((enfermerasData.profesionales || []) as ProfesionalAdmin[]);
      const despachos = entregasData.despachos || [];
      const despachosConDetalles = await Promise.all(
        despachos.map(async (despacho) => {
          if (despacho.detalles?.length) return despacho;
          try {
            const detalleData = await obtenerMiEntregaRecurso(despacho.id);
            return { ...despacho, detalles: detalleData.despacho.detalles || [] };
          } catch {
            return despacho;
          }
        }),
      );
      setEntregas(despachosConDetalles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar tus entregas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!entregaActiva) return;
    prepararCanvasFirma(canvasRef.current, setHasStroke);
    prepararCanvasFirma(enfermeraCanvasRef.current, setHasEnfermeraStroke);
  }, [entregaActiva]);

  function prepararCanvasFirma(canvas: HTMLCanvasElement | null, setStroke: (value: boolean) => void) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setStroke(false);
  }

  function cerrarSesion() {
    clearSession();
    navigate("/login", { replace: true });
  }

  function abrirMiCarnet() {
    window.open(downloadUrl("/carnet/mi-carnet"), "_blank", "noopener,noreferrer");
  }

  async function descargarListadoAsignado() {
    setDownloading(true);
    setError("");
    setSuccess("");
    try {
      await descargarMisDespachosAsignados();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar el listado de entregas abiertas");
    } finally {
      setDownloading(false);
    }
  }

  function actualizar(campo: keyof EntregaForm, valor: string) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function seleccionarEnfermera(enfermeraId: string) {
    const enfermera = enfermeras.find((item) => String(item.id) === enfermeraId);
    setForm((actual) => ({
      ...actual,
      enfermera_id: enfermeraId,
      enfermera_nombre: enfermera?.nombre || "",
      enfermera_documento: enfermera?.cedula || "",
    }));
  }

  function puntoFirma(event: PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement | null) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function iniciarFirma(event: PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    setHasStroke(true);
    const punto = puntoFirma(event, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(punto.x, punto.y);
  }

  function dibujarFirma(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const punto = puntoFirma(event, canvasRef.current);
    ctx.lineTo(punto.x, punto.y);
    ctx.stroke();
  }

  function terminarFirma(event: PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function limpiarFirma() {
    prepararCanvasFirma(canvasRef.current, setHasStroke);
  }

  function iniciarFirmaEnfermera(event: PointerEvent<HTMLCanvasElement>) {
    const ctx = enfermeraCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    enfermeraDrawingRef.current = true;
    setHasEnfermeraStroke(true);
    const punto = puntoFirma(event, enfermeraCanvasRef.current);
    ctx.beginPath();
    ctx.moveTo(punto.x, punto.y);
  }

  function dibujarFirmaEnfermera(event: PointerEvent<HTMLCanvasElement>) {
    if (!enfermeraDrawingRef.current) return;
    const ctx = enfermeraCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const punto = puntoFirma(event, enfermeraCanvasRef.current);
    ctx.lineTo(punto.x, punto.y);
    ctx.stroke();
  }

  function terminarFirmaEnfermera(event: PointerEvent<HTMLCanvasElement>) {
    enfermeraDrawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function limpiarFirmaEnfermera() {
    prepararCanvasFirma(enfermeraCanvasRef.current, setHasEnfermeraStroke);
  }

  function capturarUbicacion() {
    if (!navigator.geolocation) {
      setError("Este navegador no permite capturar ubicación.");
      return;
    }
    setGeoLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((actual) => ({
          ...actual,
          latitud_entrega: String(pos.coords.latitude),
          longitud_entrega: String(pos.coords.longitude),
        }));
        setGeoLoading(false);
      },
      () => {
        setError("No fue posible capturar la ubicación. Revisa permisos de GPS.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function abrirEntrega(entrega: DespachoRecurso) {
    setError("");
    setSuccess("");
    try {
      const data = await obtenerMiEntregaRecurso(entrega.id);
      const enfermeraActual = enfermeras.find((item) => String(item.id) === String(perfil?.id));
      setEntregaActiva(data.despacho);
      setForm({
        ...ENTREGA_INICIAL,
        recibido_por_nombre: data.despacho.paciente_nombre || "",
        recibido_por_documento: data.despacho.paciente_documento || "",
        paciente_email: data.despacho.paciente_email || "",
        enfermera_id: enfermeraActual ? String(enfermeraActual.id) : "",
        enfermera_nombre: enfermeraActual?.nombre || "",
        enfermera_documento: enfermeraActual?.cedula || "",
      });
      setEvidencia(null);
      setTimeout(() => capturarUbicacion(), 150);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible abrir la entrega");
    }
  }

  async function confirmarEntrega() {
    if (!entregaActiva) return;
    if (!form.recibido_por_nombre.trim() || !form.recibido_por_documento.trim()) {
      setError("Completa nombre y documento de quien recibe.");
      return;
    }
    if (!hasStroke || !canvasRef.current) {
      setError("Dibuja la firma de recibido antes de guardar.");
      return;
    }
    const requiereEnfermeria = entregaRequiereConfirmacionEnfermeria(entregaActiva);
    if (requiereEnfermeria && (!form.enfermera_id || !form.enfermera_nombre.trim() || !form.enfermera_documento.trim())) {
      setError("Selecciona la enfermera o cuidador que confirma la entrega de insumos.");
      return;
    }
    if (requiereEnfermeria && (!hasEnfermeraStroke || !enfermeraCanvasRef.current)) {
      setError("Dibuja la firma de la enfermera o cuidador para confirmar la entrega de insumos.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (evidencia) await subirEvidenciaMiEntrega(entregaActiva.id, evidencia);
      const data = await confirmarMiEntregaRecurso(entregaActiva.id, {
        recibido_por_nombre: form.recibido_por_nombre.trim(),
        recibido_por_documento: form.recibido_por_documento.trim(),
        recibido_por_parentesco: form.recibido_por_parentesco || null,
        paciente_email: form.paciente_email || null,
        enfermera_nombre: requiereEnfermeria ? form.enfermera_nombre.trim() : null,
        enfermera_documento: requiereEnfermeria ? form.enfermera_documento.trim() : null,
        latitud_entrega: form.latitud_entrega ? Number(form.latitud_entrega) : null,
        longitud_entrega: form.longitud_entrega ? Number(form.longitud_entrega) : null,
        firma_base64: canvasRef.current.toDataURL("image/png"),
        firma_enfermera_base64: requiereEnfermeria && enfermeraCanvasRef.current ? enfermeraCanvasRef.current.toDataURL("image/png") : null,
        observaciones: form.observaciones || null,
      });
      setSuccess(data.mensaje);
      setEntregaActiva(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible confirmar la entrega");
    } finally {
      setSaving(false);
    }
  }

  async function registrarFallida() {
    if (!entregaActiva) return;
    if (!form.motivo_fallida.trim()) {
      setError("Escribe el motivo de la entrega fallida.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (evidencia) await subirEvidenciaMiEntrega(entregaActiva.id, evidencia);
      const data = await registrarMiEntregaFallida(entregaActiva.id, {
        motivo: form.motivo_fallida.trim(),
        fecha_reintento: form.fecha_reintento || null,
        observaciones: form.observaciones || null,
      });
      setSuccess(data.mensaje);
      setEntregaActiva(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la entrega fallida");
    } finally {
      setSaving(false);
    }
  }

  const totalItems = useMemo(() => {
    return entregas.reduce((total, entrega) => total + Number(entrega.items || entrega.detalles?.length || 0), 0);
  }, [entregas]);

  const entregasFallidas = useMemo(() => {
    return entregas.filter((entrega) => entrega.estado === "fallido").length;
  }, [entregas]);

  const primerNombre = (perfil?.nombre || "Profesional").split(" ")[0] || "Profesional";
  const textoEntregas = entregas.length === 1 ? "1 entrega pendiente" : `${entregas.length} entregas pendientes`;

  return (
    <main className="professional-portal-page">
      <header className="professional-topbar">
        <div className="professional-topbar-brand">
          <img src="/logo_carnet.png" alt="Vive IPS" />
          <button className="topbar-menu-toggle" type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            Menú
          </button>
        </div>
        <div className={`professional-topbar-user ${mobileMenuOpen ? "open" : ""}`}>
          <div>
            <strong>{perfil?.nombre || "Profesional"}</strong>
            <span>{perfil?.especialidad || "Profesional"}</span>
          </div>
          <button className="topbar-soft-btn" type="button" onClick={() => { setMobileMenuOpen(false); navigate("/portal-profesional"); }}>Mi portal</button>
          <button className={`topbar-soft-btn topbar-delivery-btn active ${entregas.length ? "has-pending" : ""}`} type="button" onClick={() => setMobileMenuOpen(false)}>
            <Truck size={15} /> Entregas
            {entregas.length > 0 && <span>{entregas.length}</span>}
          </button>
          <button className="topbar-soft-btn" type="button" onClick={() => { setMobileMenuOpen(false); navigate("/portal-profesional/capacitaciones"); }}>
            <GraduationCap size={15} /> Capacitaciones
          </button>
          <button className="topbar-soft-btn navy" type="button" onClick={() => { setMobileMenuOpen(false); abrirMiCarnet(); }}>
            <IdCard size={15} /> Mi Carnet
          </button>
          <button className="topbar-logout" type="button" onClick={cerrarSesion}><LogOut size={16} /> Salir</button>
        </div>
      </header>

      <section className="professional-portal-content professional-deliveries-content">
        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}
        <section className="professional-welcome professional-deliveries-welcome">
          <div>
            <h1><Truck size={28} /> Entregas de recursos</h1>
            <p>Hola, {primerNombre}. Aquí gestionas los despachos asignados a tu ruta domiciliaria.</p>
          </div>
          <div className="welcome-stats">
            <article><strong>{entregas.length}</strong><span>Pendientes</span></article>
            <article><strong>{totalItems}</strong><span>Ítems</span></article>
            <article><strong>{entregasFallidas}</strong><span>Fallidas</span></article>
          </div>
        </section>

        {loading ? <Loading text="Cargando entregas..." /> : (
          <section className="portal-section-card professional-deliveries-panel">
            <div className="professional-deliveries-head">
              <div>
                <span>{textoEntregas}</span>
                <h2>Ruta asignada</h2>
                <p>Revisa cada despacho, confirma la entrega con firma o registra una novedad si no fue posible entregar.</p>
              </div>
              <button className="secondary-btn" type="button" onClick={descargarListadoAsignado} disabled={downloading || entregas.length === 0}>
                <FileDown size={16} /> {downloading ? "Generando..." : "Descargar ruta"}
              </button>
            </div>

            {entregas.length ? (
              <div className="portal-deliveries-grid">
                {entregas.map((entrega) => (
                  <article className="portal-delivery-card" key={entrega.id}>
                    <div className="portal-delivery-card-head">
                      <div>
                        <strong>{entrega.numero_despacho}</strong>
                        <span>{entrega.paciente_nombre || "Paciente sin nombre"}</span>
                      </div>
                      <small>{entrega.estado ? entrega.estado.replace("_", " ") : "en camino"}</small>
                    </div>
                    <p>{entrega.direccion_entrega || "Sin dirección"}{entrega.ciudad_entrega ? ` · ${entrega.ciudad_entrega}` : ""}</p>
                    {Boolean(entrega.detalles?.length) && (
                      <div className="portal-delivery-items-preview">
                        {entrega.detalles?.slice(0, 3).map((detalle) => (
                          <div key={detalle.id || `${detalle.inventario_lote_id}-${detalle.recurso_id}`}>
                            <strong>{detalle.recurso_nombre || "Recurso"}</strong>
                            {textoDescripcionItem(detalle) && <span>{textoDescripcionItem(detalle)}</span>}
                            <small>Lote {detalle.lote || "-"} · Cantidad {detalle.cantidad}</small>
                          </div>
                        ))}
                        {entrega.detalles && entrega.detalles.length > 3 && (
                          <em>+{entrega.detalles.length - 3} {entrega.detalles.length - 3 === 1 ? "ítem adicional" : "ítems adicionales"}</em>
                        )}
                      </div>
                    )}
                    <div className="portal-delivery-meta">
                      <span>{entrega.items || entrega.detalles?.length || 0} ítems</span>
                      <span>{entrega.fecha_salida ? `Salida: ${String(entrega.fecha_salida).slice(0, 16)}` : "En camino"}</span>
                    </div>
                    <button className="primary-btn" type="button" onClick={() => abrirEntrega(entrega)}>
                      <PenLine size={16} /> Gestionar entrega
                    </button>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state compact-empty">No tienes entregas pendientes.</div>}
          </section>
        )}
      </section>

      {entregaActiva && (
        <DeliveryModal
          entrega={entregaActiva}
          form={form}
          saving={saving}
          geoLoading={geoLoading}
          canvasRef={canvasRef}
          enfermeraCanvasRef={enfermeraCanvasRef}
          enfermeras={enfermeras}
          onChange={actualizar}
          onSelectEnfermera={seleccionarEnfermera}
          onCaptureLocation={capturarUbicacion}
          onClose={() => setEntregaActiva(null)}
          onSave={confirmarEntrega}
          onFail={registrarFallida}
          onClear={limpiarFirma}
          onClearEnfermera={limpiarFirmaEnfermera}
          evidencia={evidencia}
          onEvidence={setEvidencia}
          onPointerDown={iniciarFirma}
          onPointerMove={dibujarFirma}
          onPointerUp={terminarFirma}
          onEnfermeraPointerDown={iniciarFirmaEnfermera}
          onEnfermeraPointerMove={dibujarFirmaEnfermera}
          onEnfermeraPointerUp={terminarFirmaEnfermera}
        />
      )}
    </main>
  );
}

function DeliveryModal({
  entrega,
  form,
  saving,
  geoLoading,
  canvasRef,
  enfermeraCanvasRef,
  enfermeras,
  evidencia,
  onChange,
  onSelectEnfermera,
  onCaptureLocation,
  onClose,
  onSave,
  onFail,
  onClear,
  onClearEnfermera,
  onEvidence,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onEnfermeraPointerDown,
  onEnfermeraPointerMove,
  onEnfermeraPointerUp,
}: {
  entrega: DespachoRecurso;
  form: EntregaForm;
  saving: boolean;
  geoLoading: boolean;
  canvasRef: { current: HTMLCanvasElement | null };
  enfermeraCanvasRef: { current: HTMLCanvasElement | null };
  enfermeras: ProfesionalAdmin[];
  evidencia: File | null;
  onChange: (campo: keyof EntregaForm, valor: string) => void;
  onSelectEnfermera: (enfermeraId: string) => void;
  onCaptureLocation: () => void;
  onClose: () => void;
  onSave: () => void;
  onFail: () => void;
  onClear: () => void;
  onClearEnfermera: () => void;
  onEvidence: (archivo: File | null) => void;
  onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void;
  onEnfermeraPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  onEnfermeraPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  onEnfermeraPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void;
}) {
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const requiereEnfermeria = entregaRequiereConfirmacionEnfermeria(entrega);

  return (
    <div className="portal-signature-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-signature-title">
      <div className="portal-signature-card delivery-signature-card">
        <div className="portal-signature-header">
          <div>
            <h2 id="delivery-signature-title"><Truck size={22} /> Confirmar entrega</h2>
            <p>{entrega.numero_despacho} · {entrega.paciente_nombre || "Paciente"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="delivery-modal-body">
          <section className="delivery-section">
            <div className="delivery-summary-box">
              <div><strong>Dirección</strong><span>{entrega.direccion_entrega || "-"}</span></div>
              <div><strong>Teléfono</strong><span>{entrega.paciente_telefono || "-"}</span></div>
              <div><strong>Documento</strong><span>{entrega.paciente_documento || "-"}</span></div>
            </div>
            <div className="delivery-items-list">
              {(entrega.detalles || []).map((detalle) => (
                <article key={detalle.id || `${detalle.inventario_lote_id}-${detalle.recurso_id}`}>
                  <strong>{detalle.recurso_nombre || "Recurso"}</strong>
                  {textoDescripcionItem(detalle) && <span>{textoDescripcionItem(detalle)}</span>}
                  <span>Lote {detalle.lote || "-"} · Cantidad {detalle.cantidad}</span>
                  {detalle.recomendaciones_almacenamiento && <small>{detalle.recomendaciones_almacenamiento}</small>}
                </article>
              ))}
            </div>
          </section>

          <section className="delivery-section">
            <div className="delivery-section-title">
              <strong>Datos de recibido</strong>
              <span>Confirma quién recibe y registra la ubicación de la entrega.</span>
            </div>
            <div className="delivery-form-grid">
              <label>Recibe *
                <input value={form.recibido_por_nombre} onChange={(event) => onChange("recibido_por_nombre", event.target.value)} />
              </label>
              <label>Documento quien recibe *
                <input value={form.recibido_por_documento} onChange={(event) => onChange("recibido_por_documento", event.target.value)} />
              </label>
              <label>Parentesco / relación
                <input value={form.recibido_por_parentesco} onChange={(event) => onChange("recibido_por_parentesco", event.target.value)} />
              </label>
              <label>Correo paciente para acta
                <input type="email" value={form.paciente_email} onChange={(event) => onChange("paciente_email", event.target.value)} placeholder="correo@ejemplo.com" />
              </label>
              <button className="secondary-btn delivery-location-btn" type="button" onClick={onCaptureLocation} disabled={geoLoading}>
                <MapPin size={16} /> {geoLoading ? "Capturando..." : "Capturar ubicación"}
              </button>
              <label>Latitud
                <input value={form.latitud_entrega} disabled />
              </label>
              <label>Longitud
                <input value={form.longitud_entrega} disabled />
              </label>
              <label className="wide-field">Observaciones
                <textarea value={form.observaciones} onChange={(event) => onChange("observaciones", event.target.value)} rows={3} />
              </label>
            </div>
            <div className="delivery-evidence-box">
              <input
                ref={evidenceInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => onEvidence(event.target.files?.[0] || null)}
              />
              <button className="secondary-btn" type="button" onClick={() => evidenceInputRef.current?.click()}>
                <Camera size={16} /> Tomar evidencia fotográfica
              </button>
              <div>
                <strong>{evidencia ? "Evidencia lista" : "Evidencia opcional"}</strong>
                <span>{evidencia ? evidencia.name : "Se abrirá la cámara del dispositivo cuando esté disponible."}</span>
              </div>
              {evidencia && (
                <button
                  className="delivery-clear-evidence"
                  type="button"
                  onClick={() => {
                    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
                    onEvidence(null);
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
          </section>

          {requiereEnfermeria && (
            <section className="delivery-section nurse-confirmation-box">
              <div className="delivery-section-title">
                <strong>Confirmación enfermería/cuidador</strong>
                <span>Requerida porque esta entrega contiene insumos/EPP. Medicamentos no solicitan esta segunda confirmación.</span>
              </div>
              <div className="delivery-form-grid">
                <label>Enfermera o cuidador *
                  <select value={form.enfermera_id} onChange={(event) => onSelectEnfermera(event.target.value)} disabled={!enfermeras.length}>
                    <option value="">{enfermeras.length ? "Seleccionar enfermera o cuidador" : "No hay enfermeras o cuidadores activos disponibles"}</option>
                    {enfermeras.map((enfermera) => (
                      <option key={enfermera.id} value={enfermera.id}>
                        {enfermera.nombre}{enfermera.cedula ? ` · ${enfermera.cedula}` : ""}{enfermera.especialidad ? ` · ${enfermera.especialidad}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Documento *
                  <input value={form.enfermera_documento} disabled onChange={(event) => onChange("enfermera_documento", event.target.value)} />
                </label>
              </div>
              <div className="portal-signature-pad nurse-signature-pad">
                <strong>Firma enfermería/cuidador</strong>
                <span>La enfermera o cuidador confirma la entrega de los insumos al paciente.</span>
                <canvas
                  ref={enfermeraCanvasRef}
                  onPointerDown={onEnfermeraPointerDown}
                  onPointerMove={onEnfermeraPointerMove}
                  onPointerUp={onEnfermeraPointerUp}
                  onPointerCancel={onEnfermeraPointerUp}
                  onPointerLeave={onEnfermeraPointerUp}
                />
              </div>
              <div className="nurse-signature-actions">
                <button className="secondary-btn" type="button" onClick={onClearEnfermera}><Eraser size={16} /> Limpiar firma</button>
              </div>
            </section>
          )}

        <div className="delivery-failed-box">
          <strong>Registrar entrega fallida</strong>
          <span>Úsalo si no fue posible entregar. La devolución al inventario la confirma administración.</span>
          <label>Motivo de entrega fallida
            <textarea value={form.motivo_fallida} onChange={(event) => onChange("motivo_fallida", event.target.value)} placeholder="Paciente ausente, dirección incorrecta, rechazo..." rows={2} />
          </label>
          <label>Fecha sugerida de reintento
            <input type="datetime-local" value={form.fecha_reintento} onChange={(event) => onChange("fecha_reintento", event.target.value)} />
          </label>
          <button className="secondary-btn" type="button" onClick={onFail} disabled={saving}>
            Registrar fallida
          </button>
        </div>

        <div className="portal-signature-pad">
          <strong>Firma de recibido</strong>
          <span>El paciente o quien recibe debe firmar en el recuadro.</span>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>
        <div className="portal-signature-actions">
          <button className="secondary-btn" type="button" onClick={onClear}><Eraser size={16} /> Limpiar</button>
          <div>
            <button className="secondary-btn" type="button" onClick={onClose}>Cancelar</button>
            <button className="primary-btn" type="button" disabled={saving} onClick={onSave}>{saving ? "Guardando..." : "Confirmar entrega"}</button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
