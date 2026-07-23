import { ArrowLeft, FileText, MessageCircle, Paperclip, Plus, Save, Send } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { actualizarGestionSolicitud, crearSolicitud, downloadBlob, listarMisSolicitudes, listarSolicitudesGestion, obtenerSolicitud, responderSolicitud } from "../api";
import { Loading } from "../ui/Loading";

const etiquetas: Record<string, string> = { error: "Reportar un error", mejora: "Sugerencia de mejora", solicitud: "Solicitud", otro: "Otro" };
const estados: Record<string, string> = { abierto: "Abierto", en_revision: "En revisión", en_progreso: "En progreso", resuelto: "Resuelto", cerrado: "Cerrado" };

function fecha(value?: string) { return value ? new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "-"; }
function archivos(event: ChangeEvent<HTMLInputElement>) { return Array.from(event.target.files || []).slice(0, 5); }

export function SolicitudesPage({ gestion = false }: { gestion?: boolean }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [seleccionada, setSeleccionada] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [crear, setCrear] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({ asunto: "", categoria: "error", descripcion: "", archivos: [] as File[] });
  const [respuesta, setRespuesta] = useState("");
  const [adjuntosRespuesta, setAdjuntosRespuesta] = useState<File[]>([]);
  const [gestionForm, setGestionForm] = useState({ estado: "abierto", prioridad: "media", responsable: "" });

  async function cargar() {
    setLoading(true); setError("");
    try { setItems((gestion ? await listarSolicitudesGestion(filtro) : await listarMisSolicitudes()).solicitudes || []); }
    catch (err) { setError(err instanceof Error ? err.message : "No fue posible cargar las solicitudes"); }
    finally { setLoading(false); }
  }
  useEffect(() => { cargar(); }, [gestion, filtro]);

  async function abrir(id: number) {
    setGuardando(`abrir-${id}`); setError("");
    try {
      const data = await obtenerSolicitud(id); setSeleccionada(data.solicitud);
      setGestionForm({ estado: data.solicitud.estado, prioridad: data.solicitud.prioridad, responsable: data.solicitud.responsable || "" });
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible abrir la solicitud"); }
    finally { setGuardando(""); }
  }
  async function enviarNueva(event: FormEvent) {
    event.preventDefault(); setGuardando("crear"); setError("");
    try { await crearSolicitud(form); setForm({ asunto: "", categoria: "error", descripcion: "", archivos: [] }); setCrear(false); setSuccess("Solicitud enviada. Podrás seguir su gestión aquí mismo."); await cargar(); }
    catch (err) { setError(err instanceof Error ? err.message : "No fue posible enviar la solicitud"); }
    finally { setGuardando(""); }
  }
  async function enviarRespuesta(event: FormEvent) {
    event.preventDefault(); if (!seleccionada || !respuesta.trim()) return; setGuardando("respuesta"); setError("");
    try { await responderSolicitud(seleccionada.id, respuesta, adjuntosRespuesta); setRespuesta(""); setAdjuntosRespuesta([]); setSeleccionada(null); setSuccess("Respuesta enviada correctamente."); await cargar(); }
    catch (err) { setError(err instanceof Error ? err.message : "No fue posible enviar la respuesta"); }
    finally { setGuardando(""); }
  }
  async function guardarGestion(payload = gestionForm) {
    if (!seleccionada) return; setGuardando("gestion"); setError("");
    try {
      const data = await actualizarGestionSolicitud(seleccionada.id, payload);
      setSeleccionada((actual: any) => ({ ...actual, ...data.solicitud }));
      setItems((actuales) => actuales.map((item) => item.id === seleccionada.id ? { ...item, ...data.solicitud } : item));
      setGestionForm({ estado: data.solicitud.estado, prioridad: data.solicitud.prioridad, responsable: data.solicitud.responsable || "" });
      setSuccess(`Gestión actualizada: ${estados[data.solicitud.estado]} · prioridad ${data.solicitud.prioridad}.`);
    }
    catch (err) { setError(err instanceof Error ? err.message : "No fue posible guardar la gestión"); }
    finally { setGuardando(""); }
  }
  function descargar(adjunto: any) { if (seleccionada) downloadBlob(`/solicitudes/${seleccionada.id}/adjuntos/${adjunto.id}/descargar`, adjunto.nombre_archivo, true).catch((err) => setError(err.message)); }

  if (loading) return <Loading text="Cargando solicitudes..." />;
  return <main className={gestion ? "page solicitudes-page" : "professional-portal-page solicitudes-portal-page"}>
    {!gestion && <header className="professional-topbar"><div className="professional-topbar-brand"><img src="/logo_carnet.png" alt="Vive IPS" /></div><div className="professional-topbar-user"><button className="topbar-soft-btn" type="button" onClick={() => navigate("/portal-profesional")}><ArrowLeft size={16} /> Mi portal</button><button className="topbar-soft-btn active" type="button"><MessageCircle size={15} /> Solicitudes</button></div></header>}
    <div className={gestion ? "" : "professional-portal-content"}>
    <header className={gestion ? "page-header" : "professional-welcome solicitudes-welcome"}><div><span className="eyebrow">{gestion ? "Administración" : "Soporte y mejoras"}</span><h1>{gestion ? "Gestión de solicitudes" : "¿En qué te podemos ayudar?"}</h1><p>{gestion ? "Revisa, prioriza, responde y cierra los casos reportados por el equipo." : "Registra una novedad, sugerencia o solicitud y consulta aquí cada avance."}</p></div>
      <div className="solicitudes-actions">{!gestion && <button className="brand-action-btn" onClick={() => setCrear(true)}><Plus size={17} /> Nueva solicitud</button>}{!gestion && <button className="secondary-btn" onClick={() => navigate("/portal-profesional")}><ArrowLeft size={16} /> Mi portal</button>}</div></header>
    {error && <div className="error-box">{error}</div>}{success && <div className="success-box">{success}</div>}
    {gestion && <div className="solicitudes-filter"><label>Estado <select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todos</option>{Object.entries(estados).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>}
    <div className="solicitudes-list">{items.map((item) => <button type="button" className="solicitud-row" key={item.id} onClick={() => abrir(item.id)}><span className={`solicitud-status ${item.estado}`}>{estados[item.estado]}</span><div><strong>#{item.id} · {item.asunto}</strong><span>{etiquetas[item.categoria]} · {gestion ? item.profesional_nombre : "Actualizado"} {fecha(item.actualizado_en)}</span></div><small className={`priority ${item.prioridad}`}>{item.prioridad}</small></button>)}{items.length === 0 && <div className="empty-state">No hay solicitudes {gestion && filtro ? "con este estado" : "registradas"}.</div>}</div>
    {crear && <div className="modal-backdrop"><form className="modal solicitud-modal" onSubmit={enviarNueva}><button className="modal-close-btn" type="button" onClick={() => setCrear(false)}>×</button><h2>Nueva solicitud</h2><p>Describe el caso con el mayor detalle posible. Puedes adjuntar hasta cinco archivos.</p><label>Tipo<select value={form.categoria} onChange={(e) => setForm({...form, categoria:e.target.value})}>{Object.entries(etiquetas).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Asunto<input required minLength={4} maxLength={180} value={form.asunto} onChange={(e) => setForm({...form, asunto:e.target.value})} /></label><label>Descripción<textarea required minLength={10} rows={6} value={form.descripcion} onChange={(e) => setForm({...form, descripcion:e.target.value})} /></label><label>Adjuntos <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" onChange={(e) => setForm({...form, archivos: archivos(e)})} /><small>Imágenes, PDF o Word. Máximo 10 MB cada uno.</small></label><div className="modal-actions"><button className="secondary-btn" type="button" onClick={() => setCrear(false)}>Cerrar</button><button className="primary-btn" disabled={guardando === "crear"}><Send size={16} /> {guardando === "crear" ? "Enviando..." : "Enviar solicitud"}</button></div></form></div>}
    {seleccionada && <div className="modal-backdrop"><div className="modal wide-modal solicitud-detail"><button className="modal-close-btn" type="button" onClick={() => setSeleccionada(null)}>×</button><span className={`solicitud-status ${seleccionada.estado}`}>{estados[seleccionada.estado]}</span><h2>#{seleccionada.id} · {seleccionada.asunto}</h2><p className="solicitud-meta">{etiquetas[seleccionada.categoria]} · Creada {fecha(seleccionada.creado_en)} {gestion && `por ${seleccionada.profesional_nombre || "profesional"}`}</p>{error && <div className="error-box solicitud-modal-feedback">{error}</div>}{success && <div className="success-box solicitud-modal-feedback">{success}</div>}<article className="solicitud-description"><strong>Descripción</strong><p>{seleccionada.descripcion}</p>{seleccionada.adjuntos_iniciales?.map((a:any) => <button key={a.id} onClick={() => descargar(a)} className="attachment"><Paperclip size={14} />{a.nombre_archivo}</button>)}</article>{gestion && <section className="gestion-form"><label>Estado<select value={gestionForm.estado} disabled={guardando === "gestion"} onChange={(e) => { const next = {...gestionForm, estado:e.target.value}; setGestionForm(next); void guardarGestion(next); }}>{Object.entries(estados).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label>Prioridad<select value={gestionForm.prioridad} disabled={guardando === "gestion"} onChange={(e) => { const next = {...gestionForm, prioridad:e.target.value}; setGestionForm(next); void guardarGestion(next); }}>{["baja","media","alta","urgente"].map(v=><option key={v}>{v}</option>)}</select></label><label>Responsable<input value={gestionForm.responsable} disabled={guardando === "gestion"} placeholder="Nombre de quien lo gestiona" onChange={(e) => setGestionForm({...gestionForm,responsable:e.target.value})} onBlur={() => void guardarGestion(gestionForm)} /></label><button className="secondary-btn" type="button" onClick={() => void guardarGestion(gestionForm)} disabled={guardando === "gestion"}><Save size={15} /> {guardando === "gestion" ? "Guardando..." : "Guardar gestión"}</button></section>}<section className="solicitud-thread">{seleccionada.mensajes?.map((m:any)=><article key={m.id} className="thread-message"><strong>{m.autor}</strong><small>{fecha(m.creado_en)}</small><p>{m.mensaje}</p>{m.adjuntos?.map((a:any)=><button key={a.id} onClick={() => descargar(a)} className="attachment"><FileText size={14}/>{a.nombre_archivo}</button>)}</article>)}</section><form className="solicitud-reply" onSubmit={enviarRespuesta}><textarea required placeholder="Escribe una respuesta o comentario..." value={respuesta} onChange={(e) => setRespuesta(e.target.value)} /><input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" onChange={(e) => setAdjuntosRespuesta(archivos(e))} /><div className="modal-actions"><button className="secondary-btn" type="button" onClick={() => setSeleccionada(null)}>Cerrar</button><button className="primary-btn" disabled={guardando === "respuesta"}><MessageCircle size={16} /> Enviar respuesta</button></div></form></div></div>}
    </div>
  </main>;
}
