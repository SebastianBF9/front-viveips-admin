import { Camera, Eraser, FileDown, LogOut, MapPin, PenLine, Truck, X } from "lucide-react";
import { PointerEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearSession,
  confirmarMiEntregaRecurso,
  descargarMisDespachosAsignados,
  getToken,
  listarMisEntregasRecursos,
  obtenerMiEntregaRecurso,
  registrarMiEntregaFallida,
  subirEvidenciaMiEntrega,
} from "../api";
import type { DespachoRecurso } from "../types";
import { Loading } from "../ui/Loading";

type EntregaForm = {
  recibido_por_nombre: string;
  recibido_por_documento: string;
  recibido_por_parentesco: string;
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
  latitud_entrega: "",
  longitud_entrega: "",
  observaciones: "",
  motivo_fallida: "",
  fecha_reintento: "",
};

export function EntregasRecursosPage() {
  const navigate = useNavigate();
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  async function cargar() {
    if (!getToken()) {
      navigate(`/login?next=${encodeURIComponent("/entregas-recursos")}`, { replace: true });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await listarMisEntregasRecursos();
      setEntregas(data.despachos || []);
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
    const canvas = canvasRef.current;
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
    setHasStroke(false);
  }, [entregaActiva]);

  function cerrarSesion() {
    clearSession();
    navigate("/login", { replace: true });
  }

  async function descargarListadoAsignado() {
    setDownloading(true);
    setError("");
    setSuccess("");
    try {
      await descargarMisDespachosAsignados();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar el listado de despachos");
    } finally {
      setDownloading(false);
    }
  }

  function actualizar(campo: keyof EntregaForm, valor: string) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function puntoFirma(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
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
    const punto = puntoFirma(event);
    ctx.beginPath();
    ctx.moveTo(punto.x, punto.y);
  }

  function dibujarFirma(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const punto = puntoFirma(event);
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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasStroke(false);
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
      setEntregaActiva(data.despacho);
      setForm({
        ...ENTREGA_INICIAL,
        recibido_por_nombre: data.despacho.paciente_nombre || "",
        recibido_por_documento: data.despacho.paciente_documento || "",
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
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (evidencia) await subirEvidenciaMiEntrega(entregaActiva.id, evidencia);
      const data = await confirmarMiEntregaRecurso(entregaActiva.id, {
        recibido_por_nombre: form.recibido_por_nombre.trim(),
        recibido_por_documento: form.recibido_por_documento.trim(),
        recibido_por_parentesco: form.recibido_por_parentesco || null,
        latitud_entrega: form.latitud_entrega ? Number(form.latitud_entrega) : null,
        longitud_entrega: form.longitud_entrega ? Number(form.longitud_entrega) : null,
        firma_base64: canvasRef.current.toDataURL("image/png"),
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

  return (
    <main className="deliveries-page">
      <header className="deliveries-header">
        <div>
          <span>VIVE IPS</span>
          <h1>Entregas de recursos</h1>
          <p>Despachos en camino asignados a tu ruta domiciliaria.</p>
        </div>
        <div className="deliveries-header-actions">
          <button type="button" onClick={descargarListadoAsignado} disabled={downloading}>
            <FileDown size={16} /> {downloading ? "Generando..." : "Descargar listado"}
          </button>
          <button type="button" onClick={cerrarSesion}><LogOut size={16} /> Salir</button>
        </div>
      </header>

      <section className="deliveries-content">
        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}
        {loading ? <Loading text="Cargando entregas..." /> : (
          entregas.length ? (
            <div className="portal-deliveries-grid">
              {entregas.map((entrega) => (
                <article className="portal-delivery-card" key={entrega.id}>
                  <div>
                    <strong>{entrega.numero_despacho}</strong>
                    <span>{entrega.paciente_nombre || "Paciente sin nombre"}</span>
                    <small>{entrega.direccion_entrega || "Sin dirección"}{entrega.ciudad_entrega ? ` · ${entrega.ciudad_entrega}` : ""}</small>
                  </div>
                  <div className="portal-delivery-meta">
                    <span>{entrega.items || 0} ítems</span>
                    <span>{entrega.fecha_salida ? `Salida: ${String(entrega.fecha_salida).slice(0, 16)}` : "En camino"}</span>
                  </div>
                  <button className="primary-btn" type="button" onClick={() => abrirEntrega(entrega)}>
                    <PenLine size={16} /> Entregar
                  </button>
                </article>
              ))}
            </div>
          ) : <div className="empty-state compact-empty">No tienes entregas pendientes.</div>
        )}
      </section>

      {entregaActiva && (
        <DeliveryModal
          entrega={entregaActiva}
          form={form}
          saving={saving}
          geoLoading={geoLoading}
          canvasRef={canvasRef}
          onChange={actualizar}
          onCaptureLocation={capturarUbicacion}
          onClose={() => setEntregaActiva(null)}
          onSave={confirmarEntrega}
          onFail={registrarFallida}
          onClear={limpiarFirma}
          evidencia={evidencia}
          onEvidence={setEvidencia}
          onPointerDown={iniciarFirma}
          onPointerMove={dibujarFirma}
          onPointerUp={terminarFirma}
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
  evidencia,
  onChange,
  onCaptureLocation,
  onClose,
  onSave,
  onFail,
  onClear,
  onEvidence,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  entrega: DespachoRecurso;
  form: EntregaForm;
  saving: boolean;
  geoLoading: boolean;
  canvasRef: { current: HTMLCanvasElement | null };
  evidencia: File | null;
  onChange: (campo: keyof EntregaForm, valor: string) => void;
  onCaptureLocation: () => void;
  onClose: () => void;
  onSave: () => void;
  onFail: () => void;
  onClear: () => void;
  onEvidence: (archivo: File | null) => void;
  onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void;
}) {
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);

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
