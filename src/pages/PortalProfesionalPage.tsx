import {
  Banknote,
  BriefcaseBusiness,
  Camera,
  Download,
  FileCheck2,
  GraduationCap,
  IdCard,
  LogOut,
  Save,
  Upload,
  UserRound,
} from "lucide-react";
import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  actualizarFechaDocumento,
  actualizarMiPerfilProfesional,
  clearSession,
  downloadBlob,
  listarMisDocumentosProfesional,
  obtenerMiPerfilProfesional,
  subirDocumentoProfesional,
  subirFotoProfesional,
} from "../api";
import type { DocumentoPortalProfesional, ProfesionalPerfil, ProfesionalPerfilPayload } from "../types";
import { Loading } from "../ui/Loading";

const API_URL = import.meta.env.VITE_API_URL || "https://api-pruebas.viveips.com.co";

const DOCUMENTOS_PERSONALES = ["cedula", "hoja_vida", "rut", "cert_bancaria"];
const DOCUMENTOS_ACADEMICOS = ["tarjeta_prof", "rethus"];
const ANTECEDENTES = ["ant_procuraduria", "ant_contraloria", "ant_policia", "ant_correctivas"];

const TODOS_LOS_CURSOS = [
  { id: "seg_paciente", nombre: "Seguridad del Paciente", vigencia: 12 },
  { id: "atencion_violencia", nombre: "Atención Víctimas Violencia Sexual", vigencia: 24 },
  { id: "bls", nombre: "RCP Básico / Soporte Vital Básico (BLS)", vigencia: 24 },
  { id: "acls", nombre: "Soporte Vital Avanzado (ACLS)", vigencia: 24 },
  { id: "humanizacion", nombre: "Humanización en Salud", vigencia: 24 },
  { id: "admin_medicamentos", nombre: "Administración de Medicamentos", vigencia: 24 },
  { id: "toma_muestras", nombre: "Toma de Muestras / Vacunación", vigencia: 24 },
];

const CAMPOS_INICIALES: ProfesionalPerfilPayload = {
  nombre: "",
  email: "",
  telefono: "",
  especialidad: "",
  ciudad: "",
  direccion: "",
  banco: "",
  num_cuenta: "",
  titular_cuenta: "",
  rh: "",
  fecha_nacimiento: "",
  expedicion_cedula: "",
  departamento: "",
};

const CARGOS = [
  "Médico General",
  "Médico Especialista",
  "Auxiliar de Enfermería",
  "Jefe de Enfermería",
  "Psicólogo",
  "Terapeuta Físico",
  "Terapeuta Ocupacional",
  "Terapeuta de Lenguaje",
  "Terapeuta Integral",
  "Terapeuta Respiratorio",
  "Nutricionista",
  "Trabajo Social",
  "Cuidador",
  "Biomédico",
  "Personal Administrativo",
  "Otro",
];

function normalizar(valor?: string | null) {
  return (valor || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function cursosPorCargo(especialidad?: string | null) {
  const cargo = normalizar(especialidad);
  if (cargo.includes("biomedico") || cargo.includes("administrativo") || cargo.includes("cuidador") || cargo === "otro") return [];
  if (cargo.includes("auxiliar") && cargo.includes("enfermer")) {
    return TODOS_LOS_CURSOS.filter((curso) => ["seg_paciente", "atencion_violencia", "bls", "humanizacion", "admin_medicamentos"].includes(curso.id));
  }
  if (cargo.includes("jefe de enfermer") || cargo.includes("enfermero jefe") || cargo.includes("enfermera jefe")) {
    return TODOS_LOS_CURSOS.filter((curso) => ["seg_paciente", "atencion_violencia", "bls", "acls", "humanizacion", "admin_medicamentos"].includes(curso.id));
  }
  if (cargo.includes("medico") || cargo.includes("psicolog") || cargo.includes("nutricion") || cargo.includes("trabajo social")) {
    return TODOS_LOS_CURSOS.filter((curso) => ["seg_paciente", "atencion_violencia", "bls", "acls", "humanizacion"].includes(curso.id));
  }
  if (cargo.includes("terapeuta") || cargo.includes("terapia") || cargo.includes("fisioterapeuta") || cargo.includes("fonoaudiolog")) {
    return TODOS_LOS_CURSOS.filter((curso) => ["seg_paciente", "atencion_violencia", "bls", "humanizacion"].includes(curso.id));
  }
  return [];
}

function estadoTexto(estado?: string | null) {
  if (estado === "vigente") return "Vigente";
  if (estado === "vencer") return "Por vencer";
  if (estado === "vencido") return "Vencido";
  if (estado === "sin_vencimiento") return "Sin vencimiento";
  return "Sin cargar";
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "";
  return String(valor).slice(0, 10);
}

function iniciales(nombre?: string | null) {
  return (nombre || "Profesional")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

export function PortalProfesionalPage() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<ProfesionalPerfil | null>(null);
  const [form, setForm] = useState<ProfesionalPerfilPayload>(CAMPOS_INICIALES);
  const [documentos, setDocumentos] = useState<DocumentoPortalProfesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const docsPorCodigo = useMemo(() => {
    return new Map(documentos.map((doc) => [doc.tipo_codigo, doc]));
  }, [documentos]);

  const cursos = useMemo(() => cursosPorCargo(form.especialidad), [form.especialidad]);
  const stats = useMemo(() => {
    return documentos.reduce(
      (total, doc) => {
        if (!doc.id) return total;
        if (doc.estado === "vigente" || doc.estado === "sin_vencimiento") total.vigentes += 1;
        if (doc.estado === "vencer") total.vencer += 1;
        if (doc.estado === "vencido") total.vencidos += 1;
        return total;
      },
      { vigentes: 0, vencer: 0, vencidos: 0 },
    );
  }, [documentos]);

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const [perfilData, docsData] = await Promise.all([obtenerMiPerfilProfesional(), listarMisDocumentosProfesional()]);
      const p = perfilData.perfil;
      setPerfil(p);
      setForm({
        nombre: p.nombre || "",
        email: p.email || "",
        telefono: p.telefono || "",
        especialidad: p.especialidad || "",
        ciudad: p.ciudad || "",
        direccion: p.direccion || "",
        banco: p.banco || "",
        num_cuenta: p.num_cuenta || "",
        titular_cuenta: p.titular_cuenta || "",
        rh: p.rh || "",
        fecha_nacimiento: fechaCorta(p.fecha_nacimiento),
        expedicion_cedula: p.expedicion_cedula || "",
        departamento: p.departamento || "",
      });
      setDocumentos(docsData.documentos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar tu portal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizar(campo: keyof ProfesionalPerfilPayload, valor: string) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarPerfil() {
    if (!form.nombre.trim() || !form.email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await actualizarMiPerfilProfesional(form);
      setSuccess("Datos guardados correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  async function subirDocumento(codigo: string, event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;
    const fecha = (document.getElementById(`venc-${codigo}`) as HTMLInputElement | null)?.value || null;
    setUploading(codigo);
    setError("");
    setSuccess("");
    try {
      const data = await subirDocumentoProfesional(codigo, archivo, fecha);
      setSuccess(data.ia_no_disponible ? "Documento cargado; validación IA pendiente." : "Documento cargado y validado correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible subir el documento");
    } finally {
      setUploading("");
    }
  }

  async function descargarDocumento(doc: DocumentoPortalProfesional) {
    if (!doc.id) return;
    try {
      await downloadBlob(`/documentos/descargar/${doc.id}`, doc.nombre_archivo || `documento_${doc.id}`, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible abrir el documento");
    }
  }

  async function cambiarFechaDocumento(doc: DocumentoPortalProfesional, fecha: string) {
    if (!doc.id) return;
    try {
      await actualizarFechaDocumento(doc.id, fecha || null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la fecha");
    }
  }

  async function cambiarFoto(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) {
      setError("La foto debe pesar máximo 2MB.");
      return;
    }
    setUploading("foto");
    setError("");
    try {
      await subirFotoProfesional(archivo);
      setSuccess("Foto guardada correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible subir la foto");
    } finally {
      setUploading("");
    }
  }

  function cerrarSesion() {
    clearSession();
    navigate("/login", { replace: true });
  }

  if (loading) return <Loading text="Cargando portal profesional..." />;

  const primerNombre = form.nombre.split(" ").filter(Boolean)[0] || "Profesional";

  return (
    <main className="professional-portal-page">
      <header className="professional-topbar">
        <img src="/logo_carnet.png" alt="Vive IPS" />
        <div className="professional-topbar-user">
          <div>
            <strong>{form.nombre || "Profesional"}</strong>
            <span>{form.especialidad || "Profesional"}</span>
          </div>
          <button className="topbar-soft-btn" type="button" onClick={() => navigate("/portal-profesional")}>Mi portal</button>
          <button className="topbar-soft-btn" type="button" disabled>Capacitaciones</button>
          <button className="topbar-soft-btn navy" type="button" disabled>Mi Carnet</button>
          <button className="topbar-logout" type="button" onClick={cerrarSesion}><LogOut size={16} /> Salir</button>
        </div>
      </header>

      <section className="professional-portal-content">
        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <section className="professional-welcome">
          <div>
            <h1>Bienvenido/a, {primerNombre}</h1>
            <p>Aquí puedes actualizar tu información y gestionar todos tus documentos.</p>
          </div>
          <div className="welcome-stats">
            <article><strong>{stats.vigentes}</strong><span>Vigentes</span></article>
            <article><strong>{stats.vencer}</strong><span>Por vencer</span></article>
            <article><strong>{stats.vencidos}</strong><span>Vencidos</span></article>
          </div>
        </section>

        <section className="portal-section-card">
          <SectionTitle icon={<UserRound size={22} />} title="Información Personal" subtitle="Mantén tus datos actualizados para el equipo administrativo." />
          <div className="profile-photo-row">
            <div className="profile-photo-preview">
              {perfil?.foto ? <img src={`${API_URL}/profesionales/foto/${perfil.id}`} alt="Foto de perfil" /> : <span>{iniciales(form.nombre)}</span>}
            </div>
            <div>
              <strong>Foto de perfil</strong>
              <span>JPG o PNG. Máximo 2MB.</span>
              <input id="foto-profesional" type="file" accept="image/jpeg,image/png" onChange={cambiarFoto} hidden />
              <button className="secondary-btn" type="button" onClick={() => document.getElementById("foto-profesional")?.click()} disabled={uploading === "foto"}>
                <Camera size={16} /> Cambiar foto
              </button>
            </div>
          </div>

          <div className="portal-form-grid">
            <Field label="Nombre completo" required value={form.nombre} onChange={(value) => actualizar("nombre", value)} />
            <Field label="Número de cédula" value={perfil?.cedula || ""} disabled />
            <Field label="Lugar de expedición cédula" value={form.expedicion_cedula || ""} onChange={(value) => actualizar("expedicion_cedula", value)} />
            <Field label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento || ""} onChange={(value) => actualizar("fecha_nacimiento", value)} />
            <SelectField label="RH" value={form.rh || ""} onChange={(value) => actualizar("rh", value)} options={["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]} />
            <Field label="Correo electrónico" required type="email" value={form.email} onChange={(value) => actualizar("email", value)} />
            <Field label="Teléfono / WhatsApp" required value={form.telefono || ""} onChange={(value) => actualizar("telefono", value)} />
            <SelectField label="Especialidad / Cargo" required value={form.especialidad || ""} onChange={(value) => actualizar("especialidad", value)} options={CARGOS} />
            <Field label="Departamento" value={form.departamento || ""} onChange={(value) => actualizar("departamento", value)} />
            <Field label="Ciudad / Municipio" value={form.ciudad || ""} onChange={(value) => actualizar("ciudad", value)} />
            <Field className="wide-field" label="Dirección de residencia" value={form.direccion || ""} onChange={(value) => actualizar("direccion", value)} />
          </div>
        </section>

        <section className="portal-section-card">
          <SectionTitle icon={<Banknote size={22} />} title="Datos Bancarios" subtitle="Información para el pago de honorarios. Solo visible para el área autorizada." />
          <div className="banking-note">Tu información bancaria es confidencial y está protegida.</div>
          <div className="portal-form-grid">
            <SelectField label="Banco" required value={form.banco || ""} onChange={(value) => actualizar("banco", value)} options={["Bancolombia", "Banco de Bogotá", "Davivienda", "BBVA", "Banco Popular", "Banco de Occidente", "Scotiabank Colpatria", "AV Villas", "Banco Agrario", "Itaú", "Otro"]} />
            <Field label="Tipo de cuenta" value="Cuenta de Ahorros" disabled />
            <Field label="Número de cuenta" required value={form.num_cuenta || ""} onChange={(value) => actualizar("num_cuenta", value)} />
            <Field label="Titular de la cuenta" value={form.titular_cuenta || ""} onChange={(value) => actualizar("titular_cuenta", value)} />
          </div>
        </section>

        <DocumentSection title="Documentos Personales" icon={<IdCard size={22} />} codes={DOCUMENTOS_PERSONALES} docs={docsPorCodigo} uploading={uploading} onUpload={subirDocumento} onDownload={descargarDocumento} />
        <DocumentSection title="Documentos Académicos" icon={<GraduationCap size={22} />} codes={DOCUMENTOS_ACADEMICOS} docs={docsPorCodigo} uploading={uploading} onUpload={subirDocumento} onDownload={descargarDocumento} />

        <section className="portal-section-card">
          <SectionTitle icon={<BriefcaseBusiness size={22} />} title="Antecedentes" subtitle="Estos documentos se mantienen como soportes periódicos del profesional." />
          <div className="portal-list-grid">
            {ANTECEDENTES.map((codigo) => (
              <ListDocumentRow key={codigo} codigo={codigo} doc={docsPorCodigo.get(codigo)} uploading={uploading} onUpload={subirDocumento} onDownload={descargarDocumento} />
            ))}
          </div>
        </section>

        <section className="portal-section-card">
          <SectionTitle icon={<FileCheck2 size={22} />} title="Cursos y Certificaciones" subtitle="La lista se calcula según tu cargo, igual que en el portal actual." />
          <div className="portal-list-grid">
            {cursos.length ? cursos.map((curso) => {
              const doc = docsPorCodigo.get(curso.id);
              return (
                <ListDocumentRow
                  key={curso.id}
                  codigo={curso.id}
                  doc={doc}
                  label={`${curso.nombre} · vigencia ${curso.vigencia} meses`}
                  uploading={uploading}
                  onUpload={subirDocumento}
                  onDownload={descargarDocumento}
                  onDateChange={cambiarFechaDocumento}
                />
              );
            }) : <div className="empty-state compact-empty">Tu cargo no tiene cursos obligatorios automáticos.</div>}
          </div>
        </section>

        <div className="portal-save-bar-new">
          <button className="primary-btn gradient-btn" type="button" onClick={guardarPerfil} disabled={saving}>
            <Save size={18} /> {saving ? "Guardando..." : "Guardar todos los cambios"}
          </button>
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="portal-section-title">
      <div>{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, disabled, className = "" }: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`portal-field ${className}`}>
      {label} {required && <span>*</span>}
      <input type={type} value={value} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="portal-field">
      {label} {required && <span>*</span>}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecciona</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function DocumentSection({ title, icon, codes, docs, uploading, onUpload, onDownload }: {
  title: string;
  icon: ReactNode;
  codes: string[];
  docs: Map<string, DocumentoPortalProfesional>;
  uploading: string;
  onUpload: (codigo: string, event: ChangeEvent<HTMLInputElement>) => void;
  onDownload: (doc: DocumentoPortalProfesional) => void;
}) {
  return (
    <section className="portal-section-card">
      <SectionTitle icon={icon} title={title} subtitle="Carga, reemplaza o consulta tus soportes actuales." />
      <div className="portal-doc-grid">
        {codes.map((codigo) => (
          <DocumentCard key={codigo} codigo={codigo} doc={docs.get(codigo)} uploading={uploading} onUpload={onUpload} onDownload={onDownload} />
        ))}
      </div>
    </section>
  );
}

function DocumentCard({ codigo, doc, uploading, onUpload, onDownload }: {
  codigo: string;
  doc?: DocumentoPortalProfesional;
  uploading: string;
  onUpload: (codigo: string, event: ChangeEvent<HTMLInputElement>) => void;
  onDownload: (doc: DocumentoPortalProfesional) => void;
}) {
  const inputId = `doc-${codigo}`;
  const cargado = Boolean(doc?.id);
  return (
    <article className={`portal-doc-card state-${doc?.estado || "sin_cargar"}`}>
      <div className="portal-doc-head">
        <strong>{doc?.tipo_nombre || codigo}</strong>
        <span className={`portal-doc-badge ${doc?.estado || "sin_cargar"}`}>{estadoTexto(doc?.estado)}</span>
      </div>
      <button className={`portal-upload-zone ${cargado ? "has-file" : ""}`} type="button" onClick={() => document.getElementById(inputId)?.click()}>
        <Upload size={18} />
        <span>{uploading === codigo ? "Subiendo..." : cargado ? doc?.nombre_archivo : "Haz clic para subir archivo"}</span>
        <small>PDF, JPG o PNG · Máx. 10MB</small>
      </button>
      <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => onUpload(codigo, event)} />
      {cargado && (
        <div className="portal-doc-actions">
          <button type="button" onClick={() => onDownload(doc!)}><Download size={15} /> Ver</button>
          <button type="button" onClick={() => document.getElementById(inputId)?.click()}>Reemplazar</button>
        </div>
      )}
    </article>
  );
}

function ListDocumentRow({ codigo, doc, label, uploading, onUpload, onDownload, onDateChange }: {
  codigo: string;
  doc?: DocumentoPortalProfesional;
  label?: string;
  uploading: string;
  onUpload: (codigo: string, event: ChangeEvent<HTMLInputElement>) => void;
  onDownload: (doc: DocumentoPortalProfesional) => void;
  onDateChange?: (doc: DocumentoPortalProfesional, fecha: string) => void;
}) {
  const inputId = `row-doc-${codigo}`;
  const cargado = Boolean(doc?.id);
  return (
    <article className={`portal-list-row state-${doc?.estado || "sin_cargar"}`}>
      <div>
        <strong>{label || doc?.tipo_nombre || codigo}</strong>
        <span>{doc?.fecha_vencimiento ? `Vence: ${fechaCorta(doc.fecha_vencimiento)}` : cargado ? "Cargado" : "Sin fecha"}</span>
      </div>
      {onDateChange && doc?.id && (
        <input className="portal-date-input" id={`venc-${codigo}`} type="date" defaultValue={fechaCorta(doc.fecha_vencimiento)} onChange={(event) => onDateChange(doc, event.target.value)} />
      )}
      <span className={`portal-doc-badge ${doc?.estado || "sin_cargar"}`}>{estadoTexto(doc?.estado)}</span>
      <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => onUpload(codigo, event)} />
      <button className="secondary-btn" type="button" onClick={() => document.getElementById(inputId)?.click()}>
        <Upload size={15} /> {uploading === codigo ? "Subiendo..." : cargado ? "Reemplazar" : "Subir"}
      </button>
      {cargado && <button className="secondary-btn" type="button" onClick={() => onDownload(doc!)}><Download size={15} /> Ver</button>}
    </article>
  );
}
