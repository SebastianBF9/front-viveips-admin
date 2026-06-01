import {
  Banknote,
  BriefcaseBusiness,
  Camera,
  Download,
  FileCheck2,
  GraduationCap,
  IdCard,
  LogOut,
  Plus,
  Save,
  Syringe,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  actualizarFechaDocumento,
  actualizarMiPerfilProfesional,
  aceptarTratamientoDatos,
  clearSession,
  downloadBlob,
  eliminarFormacionPortal,
  guardarFormacionPortal,
  guardarMisExperiencias,
  guardarMisReferencias,
  guardarMisVacunas,
  listarDepartamentos,
  listarMisExperiencias,
  listarMisFormaciones,
  listarMisReferencias,
  listarMisVacunas,
  listarMisDocumentosProfesional,
  listarMunicipios,
  obtenerMiPerfilProfesional,
  subirDocumentoProfesional,
  subirFotoProfesional,
} from "../api";
import type {
  DocumentoPortalProfesional,
  ExperienciaLaboral,
  FormacionPortal,
  ProfesionalPerfil,
  ProfesionalPerfilPayload,
  ReferenciaPersonal,
  UbicacionDepartamento,
  UbicacionMunicipio,
  VacunaProfesional,
} from "../types";
import { Loading } from "../ui/Loading";

const API_URL = import.meta.env.VITE_API_URL || "https://api-pruebas.viveips.com.co";

const DOCUMENTOS_PERSONALES = ["cedula", "hoja_vida", "rut", "cert_bancaria"];
const DOCUMENTOS_ACADEMICOS = ["tarjeta_prof", "rethus"];
const ANTECEDENTES = ["ant_procuraduria", "ant_contraloria", "ant_policia", "ant_correctivas"];
const REFERENCIA_VACIA: ReferenciaPersonal = { nombre: "", relacion: "", telefono: "", email: "", ocupacion: "" };
const EXPERIENCIA_VACIA: ExperienciaLaboral = { empresa: "", cargo: "", fecha_inicio: "", fecha_fin: "", actualmente: false, documento_id: null, nombre_archivo: null };
const LISTA_VACUNAS = [
  { id: "vac_hepatitis", nombre: "Hepatitis B (esquema completo)" },
  { id: "vac_tetano", nombre: "Tetanos / Td o Tdap" },
  { id: "vac_influenza", nombre: "Influenza (anual)" },
  { id: "vac_triple_viral", nombre: "Triple viral - SRP" },
  { id: "vac_varicela", nombre: "Varicela" },
  { id: "vac_covid", nombre: "COVID-19" },
];

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
  const [departamentos, setDepartamentos] = useState<UbicacionDepartamento[]>([]);
  const [municipios, setMunicipios] = useState<UbicacionMunicipio[]>([]);
  const [referencias, setReferencias] = useState<ReferenciaPersonal[]>([]);
  const [experiencias, setExperiencias] = useState<ExperienciaLaboral[]>([]);
  const [vacunas, setVacunas] = useState<Record<string, string>>({});
  const [formaciones, setFormaciones] = useState<FormacionPortal[]>([]);
  const [showTratamientoModal, setShowTratamientoModal] = useState(false);
  const [aceptaTratamiento, setAceptaTratamiento] = useState(false);
  const [aceptandoTratamiento, setAceptandoTratamiento] = useState(false);

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
      const [perfilData, docsData, deptData, refsData, expData, vacData, formData] = await Promise.all([
        obtenerMiPerfilProfesional(),
        listarMisDocumentosProfesional(),
        listarDepartamentos(),
        listarMisReferencias(),
        listarMisExperiencias(),
        listarMisVacunas(),
        listarMisFormaciones(),
      ]);
      const p = perfilData.perfil;
      const departamentoActual = p.departamento || "";
      const tratamientoAceptado = Boolean(p.acepta_tratamiento_datos);
      setPerfil(p);
      setAceptaTratamiento(tratamientoAceptado);
      setShowTratamientoModal(!tratamientoAceptado);
      setDepartamentos(deptData.departamentos || []);
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
        departamento: departamentoActual,
      });
      setDocumentos(docsData.documentos || []);
      setReferencias(refsData.referencias?.length ? refsData.referencias : []);
      setExperiencias(expData.experiencias?.length ? expData.experiencias.map((exp) => ({
        ...exp,
        fecha_inicio: fechaCorta(exp.fecha_inicio),
        fecha_fin: fechaCorta(exp.fecha_fin),
        actualmente: Boolean(exp.actualmente),
      })) : []);
      setVacunas(Object.fromEntries((vacData.vacunas || []).map((vac) => [vac.vacuna_codigo, fechaCorta(vac.fecha_aplicacion)])));
      setFormaciones(formData.formaciones || []);
      if (departamentoActual) {
        const munData = await listarMunicipios(departamentoActual);
        setMunicipios(munData.municipios || []);
      } else {
        setMunicipios([]);
      }
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

  async function cambiarDepartamento(codigo: string) {
    setForm((actual) => ({ ...actual, departamento: codigo, ciudad: "" }));
    if (!codigo) {
      setMunicipios([]);
      return;
    }
    try {
      const data = await listarMunicipios(codigo);
      setMunicipios(data.municipios || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar municipios");
    }
  }

  function manejarErrorDocumento(err: unknown, fallback: string) {
    const message = err instanceof Error ? err.message : fallback;
    if (message.includes("Tratamiento de Datos") || message.includes("tratamiento de datos")) {
      setShowTratamientoModal(true);
    }
    setError(message);
  }

  async function aceptarPoliticaDatos() {
    setAceptandoTratamiento(true);
    setError("");
    setSuccess("");
    try {
      await aceptarTratamientoDatos();
      setAceptaTratamiento(true);
      setShowTratamientoModal(false);
      setSuccess("Autorizacion de tratamiento de datos registrada correctamente.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la autorizacion de datos");
    } finally {
      setAceptandoTratamiento(false);
    }
  }

  function actualizarReferencia(index: number, campo: keyof ReferenciaPersonal, valor: string) {
    setReferencias((actual) => actual.map((ref, i) => (i === index ? { ...ref, [campo]: valor } : ref)));
  }

  function actualizarExperiencia(index: number, campo: keyof ExperienciaLaboral, valor: string | boolean) {
    setExperiencias((actual) => actual.map((exp, i) => (i === index ? { ...exp, [campo]: valor } : exp)));
  }

  async function subirCertificadoExperiencia(index: number, event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;
    setUploading(`exp-${index}`);
    setError("");
    try {
      const data = await subirDocumentoProfesional("cert_experiencia", archivo, null);
      setExperiencias((actual) => actual.map((exp, i) => (i === index ? {
        ...exp,
        documento_id: data.documento_id || exp.documento_id || null,
        nombre_archivo: data.nombre || archivo.name,
      } : exp)));
      setSuccess(data.ia_no_disponible ? "Certificado cargado; validacion IA no disponible, queda pendiente de revision." : "Certificado laboral cargado y validado con IA.");
    } catch (err) {
      manejarErrorDocumento(err, "No fue posible subir el certificado laboral");
    } finally {
      setUploading("");
    }
  }

  async function guardarFormacion(tipo: "bachillerato" | "profesional" | "especializacion", formacion: FormacionPortal, archivos: Record<string, File | null>) {
    setUploading(`formacion-${tipo}`);
    setError("");
    setSuccess("");
    try {
      const payload = new FormData();
      payload.set("tipo", tipo);
      if (formacion.id) payload.set("formacion_id", String(formacion.id));
      payload.set("institucion", formacion.institucion || "");
      if (formacion.titulo) payload.set("titulo", formacion.titulo);
      if (formacion.nivel) payload.set("nivel", formacion.nivel);
      if (formacion.anio_grado) payload.set("anio_grado", String(formacion.anio_grado));
      if (formacion.ciudad) payload.set("ciudad", formacion.ciudad);
      if (archivos.archivo) payload.set("archivo", archivos.archivo);
      if (archivos.archivo_diploma) payload.set("archivo_diploma", archivos.archivo_diploma);
      if (archivos.archivo_acta) payload.set("archivo_acta", archivos.archivo_acta);
      await guardarFormacionPortal(payload);
      setSuccess("Formacion guardada correctamente.");
      const data = await listarMisFormaciones();
      setFormaciones(data.formaciones || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la formacion");
    } finally {
      setUploading("");
    }
  }

  async function eliminarFormacion(id?: number | null) {
    if (!id) return;
    setUploading(`formacion-delete-${id}`);
    setError("");
    try {
      await eliminarFormacionPortal(id);
      const data = await listarMisFormaciones();
      setFormaciones(data.formaciones || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar la formacion");
    } finally {
      setUploading("");
    }
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
      const referenciasValidas = referencias
        .map((ref) => ({ ...ref, nombre: ref.nombre.trim(), relacion: ref.relacion.trim(), telefono: ref.telefono.trim() }))
        .filter((ref) => ref.nombre || ref.relacion || ref.telefono || ref.email || ref.ocupacion);
      const referenciasIncompletas = referenciasValidas.some((ref) => !ref.nombre || !ref.relacion || !ref.telefono);
      if (referenciasIncompletas) {
        throw new Error("Cada referencia personal debe tener nombre, relacion y telefono.");
      }
      const experienciasValidas = experiencias
        .map((exp) => ({ ...exp, empresa: exp.empresa.trim(), cargo: exp.cargo?.trim() || "", fecha_inicio: fechaCorta(exp.fecha_inicio), fecha_fin: exp.actualmente ? null : fechaCorta(exp.fecha_fin) }))
        .filter((exp) => exp.empresa && exp.fecha_inicio);
      const vacunasValidas: VacunaProfesional[] = Object.entries(vacunas)
        .filter(([, fecha]) => Boolean(fecha))
        .map(([vacuna_codigo, fecha_aplicacion]) => ({ vacuna_codigo, fecha_aplicacion }));
      await actualizarMiPerfilProfesional(form);
      await guardarMisReferencias(referenciasValidas);
      await guardarMisExperiencias(experienciasValidas);
      await guardarMisVacunas(vacunasValidas);
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
      setSuccess(data.ia_no_disponible ? "Documento cargado; validacion IA no disponible, queda pendiente de revision." : "Documento cargado y validado con IA correctamente.");
      await cargar();
    } catch (err) {
      manejarErrorDocumento(err, "No fue posible subir el documento");
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
        {!aceptaTratamiento && (
          <div className="portal-consent-warning">
            <strong>Autorizacion pendiente de tratamiento de datos</strong>
            <span>Debes aceptar la politica antes de cargar documentos sensibles.</span>
            <button type="button" onClick={() => setShowTratamientoModal(true)}>Aceptar ahora</button>
          </div>
        )}

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
            <ObjectSelectField
              label="Departamento"
              value={form.departamento || ""}
              onChange={cambiarDepartamento}
              placeholder="Selecciona departamento"
              options={departamentos.map((dept) => ({ value: dept.codigo_departamento, label: dept.nombre_departamento }))}
            />
            <ObjectSelectField
              label="Ciudad / Municipio"
              value={form.ciudad || ""}
              onChange={(value) => actualizar("ciudad", value)}
              placeholder={form.departamento ? "Selecciona ciudad" : "Selecciona primero departamento"}
              disabled={!form.departamento}
              options={municipios.map((mun) => ({ value: mun.nombre_municipio, label: mun.nombre_municipio }))}
            />
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

        <section className="portal-section-card">
          <SectionTitle icon={<UsersRound size={22} />} title="Referencias Personales" subtitle="Agrega contactos de referencia para validación administrativa." />
          <div className="dynamic-section-list">
            {referencias.length ? referencias.map((ref, index) => (
              <article className="dynamic-item-card" key={`ref-${index}`}>
                <div className="dynamic-item-header">
                  <strong>Referencia {index + 1}</strong>
                  <button className="icon-danger-btn" type="button" onClick={() => setReferencias((actual) => actual.filter((_, i) => i !== index))} title="Eliminar referencia"><Trash2 size={16} /></button>
                </div>
                <div className="portal-form-grid compact-grid">
                  <Field label="Nombre" required value={ref.nombre || ""} onChange={(value) => actualizarReferencia(index, "nombre", value)} />
                  <Field label="Relación" required value={ref.relacion || ""} onChange={(value) => actualizarReferencia(index, "relacion", value)} />
                  <Field label="Teléfono" required value={ref.telefono || ""} onChange={(value) => actualizarReferencia(index, "telefono", value)} />
                  <Field label="Correo" type="email" value={ref.email || ""} onChange={(value) => actualizarReferencia(index, "email", value)} />
                  <Field className="wide-field" label="Ocupación" value={ref.ocupacion || ""} onChange={(value) => actualizarReferencia(index, "ocupacion", value)} />
                </div>
              </article>
            )) : <div className="empty-state compact-empty">Aún no tienes referencias registradas.</div>}
          </div>
          <button className="brand-action-btn small-brand-btn" type="button" onClick={() => setReferencias((actual) => [...actual, { ...REFERENCIA_VACIA }])}><Plus size={17} /> Agregar referencia</button>
        </section>

        <DocumentSection title="Documentos Personales" icon={<IdCard size={22} />} codes={DOCUMENTOS_PERSONALES} docs={docsPorCodigo} uploading={uploading} onUpload={subirDocumento} onDownload={descargarDocumento} />
        <DocumentSection title="Documentos Académicos" icon={<GraduationCap size={22} />} codes={DOCUMENTOS_ACADEMICOS} docs={docsPorCodigo} uploading={uploading} onUpload={subirDocumento} onDownload={descargarDocumento} />

        <FormacionSection formaciones={formaciones} uploading={uploading} onSave={guardarFormacion} onDelete={eliminarFormacion} />

        <section className="portal-section-card">
          <SectionTitle icon={<BriefcaseBusiness size={22} />} title="Experiencia Laboral" subtitle="Registra tu experiencia y adjunta soportes cuando aplique." />
          <div className="dynamic-section-list">
            {experiencias.length ? experiencias.map((exp, index) => (
              <article className="dynamic-item-card" key={`exp-${index}`}>
                <div className="dynamic-item-header">
                  <strong>Experiencia {index + 1}</strong>
                  <button className="icon-danger-btn" type="button" onClick={() => setExperiencias((actual) => actual.filter((_, i) => i !== index))} title="Eliminar experiencia"><Trash2 size={16} /></button>
                </div>
                <div className="portal-form-grid compact-grid">
                  <Field label="Empresa / Institución" required value={exp.empresa || ""} onChange={(value) => actualizarExperiencia(index, "empresa", value)} />
                  <Field label="Cargo desempeñado" value={exp.cargo || ""} onChange={(value) => actualizarExperiencia(index, "cargo", value)} />
                  <Field label="Fecha inicio" required type="date" value={fechaCorta(exp.fecha_inicio)} onChange={(value) => actualizarExperiencia(index, "fecha_inicio", value)} />
                  <Field label="Fecha fin" type="date" value={fechaCorta(exp.fecha_fin)} disabled={Boolean(exp.actualmente)} onChange={(value) => actualizarExperiencia(index, "fecha_fin", value)} />
                </div>
                <label className="portal-check-row">
                  <input type="checkbox" checked={Boolean(exp.actualmente)} onChange={(event) => actualizarExperiencia(index, "actualmente", event.target.checked)} />
                  Actualmente trabajo aquí
                </label>
                <div className="file-inline-row">
                  <span>{exp.nombre_archivo || "Sin certificado laboral"}</span>
                  <input id={`exp-file-${index}`} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => subirCertificadoExperiencia(index, event)} />
                  <button className="secondary-btn" type="button" onClick={() => document.getElementById(`exp-file-${index}`)?.click()}>
                    <Upload size={15} /> {uploading === `exp-${index}` ? "Subiendo..." : "Subir certificado"}
                  </button>
                </div>
              </article>
            )) : <div className="empty-state compact-empty">Aún no has agregado experiencia laboral.</div>}
          </div>
          <button className="brand-action-btn small-brand-btn" type="button" onClick={() => setExperiencias((actual) => [...actual, { ...EXPERIENCIA_VACIA }])}><Plus size={17} /> Agregar experiencia</button>
        </section>

        <section className="portal-section-card">
          <SectionTitle icon={<Syringe size={22} />} title="Vacunas" subtitle="Registra la fecha de aplicación de tus vacunas ocupacionales." />
          <div className="portal-list-grid">
            {LISTA_VACUNAS.map((vacuna) => (
              <article className={`portal-list-row vaccine-row ${vacunas[vacuna.id] ? "state-vigente" : "state-sin_cargar"}`} key={vacuna.id}>
                <div>
                  <strong>{vacuna.nombre}</strong>
                  <span>{vacunas[vacuna.id] ? `Fecha: ${vacunas[vacuna.id]}` : "Sin fecha registrada"}</span>
                </div>
                <input className="portal-date-input" type="date" value={vacunas[vacuna.id] || ""} onChange={(event) => setVacunas((actual) => ({ ...actual, [vacuna.id]: event.target.value }))} />
              </article>
            ))}
          </div>
        </section>

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
      {showTratamientoModal && (
        <TratamientoDatosModal
          loading={aceptandoTratamiento}
          onAccept={aceptarPoliticaDatos}
          onClose={aceptaTratamiento ? () => setShowTratamientoModal(false) : undefined}
        />
      )}
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

function TratamientoDatosModal({ loading, onAccept, onClose }: {
  loading: boolean;
  onAccept: () => void;
  onClose?: () => void;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="portal-consent-modal">
      <div className="portal-consent-card">
        <div className="portal-consent-header">
          <img src="/logo_carnet.png" alt="Vive IPS" />
          <div>
            <h2>Tratamiento de datos personales</h2>
            <p>Version politica: 2026-05-12-v1</p>
          </div>
          {onClose && <button type="button" onClick={onClose}>×</button>}
        </div>
        <div className="portal-consent-body">
          <p>
            GRUPO MEDICO INTEGRAL VIVE IPS S.A.S. informa que los datos personales y documentos suministrados en esta
            plataforma seran recolectados, almacenados, consultados, actualizados y utilizados para fines administrativos,
            contractuales, asistenciales, validacion documental, cumplimiento normativo y gestion del talento humano en salud.
          </p>
          <p>
            Algunos documentos pueden contener informacion sensible, como datos relacionados con salud, vacunacion, firma
            clinica o soportes profesionales. Estos datos seran tratados conforme a la Politica de Tratamiento de Datos Personales.
          </p>
          <label className="portal-consent-check">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            <span>
              Acepto y autorizo de manera previa, expresa e informada el tratamiento de mis datos personales conforme a la
              {" "}<a href="/politica-tratamiento-datos.html" target="_blank" rel="noopener noreferrer">Politica de Tratamiento de Datos Personales</a> de VIVE IPS.
            </span>
          </label>
          <small>Esta autorizacion quedara registrada con fecha, version de politica e informacion tecnica de acceso.</small>
        </div>
        <div className="portal-consent-actions">
          <a href="/politica-tratamiento-datos.html" target="_blank" rel="noopener noreferrer">Ver politica completa</a>
          <button className="brand-action-btn" type="button" disabled={!checked || loading} onClick={onAccept}>
            {loading ? "Guardando autorizacion..." : "Aceptar y continuar"}
          </button>
        </div>
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

function ObjectSelectField({ label, value, onChange, options, required, placeholder = "Selecciona", disabled }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="portal-field">
      {label} {required && <span>*</span>}
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={`${option.value}-${option.label}`} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function FormacionSection({ formaciones, uploading, onSave, onDelete }: {
  formaciones: FormacionPortal[];
  uploading: string;
  onSave: (tipo: "bachillerato" | "profesional" | "especializacion", formacion: FormacionPortal, archivos: Record<string, File | null>) => void;
  onDelete: (id?: number | null) => void;
}) {
  const bachillerato = formaciones.find((item) => item.tipo === "bachillerato") || { tipo: "bachillerato", institucion: "", anio_grado: "", ciudad: "" };
  const profesional = formaciones.find((item) => item.tipo === "profesional") || { tipo: "profesional", institucion: "", titulo: "", nivel: "", anio_grado: "", ciudad: "" };
  const posgradosIniciales = formaciones.filter((item) => item.tipo !== "bachillerato" && item.tipo !== "profesional");
  const [bach, setBach] = useState<FormacionPortal>(bachillerato);
  const [prof, setProf] = useState<FormacionPortal>(profesional);
  const [posgrados, setPosgrados] = useState<FormacionPortal[]>(posgradosIniciales);
  const [bachArchivo, setBachArchivo] = useState<File | null>(null);
  const [diploma, setDiploma] = useState<File | null>(null);
  const [acta, setActa] = useState<File | null>(null);
  const [posgradoArchivos, setPosgradoArchivos] = useState<Record<number, File | null>>({});

  useEffect(() => {
    setBach(bachillerato);
    setProf(profesional);
    setPosgrados(posgradosIniciales);
  }, [formaciones]);

  return (
    <section className="portal-section-card">
      <SectionTitle icon={<GraduationCap size={22} />} title="Formación Académica" subtitle="Registra bachillerato, título profesional y soportes académicos." />
      <div className="dynamic-section-list">
        <article className="dynamic-item-card">
          <div className="dynamic-item-header">
            <strong>Bachillerato</strong>
            {bach.id && <button className="icon-danger-btn" type="button" onClick={() => onDelete(bach.id)}><Trash2 size={16} /></button>}
          </div>
          <div className="portal-form-grid compact-grid">
            <Field label="Institución" required value={bach.institucion || ""} onChange={(value) => setBach((actual) => ({ ...actual, institucion: value }))} />
            <Field label="Año grado" value={String(bach.anio_grado || "")} onChange={(value) => setBach((actual) => ({ ...actual, anio_grado: value }))} />
            <Field className="wide-field" label="Ciudad" value={bach.ciudad || ""} onChange={(value) => setBach((actual) => ({ ...actual, ciudad: value }))} />
          </div>
          <div className="file-inline-row">
            <span>{bachArchivo?.name || bach.nombre_archivo || "Sin soporte cargado"}</span>
            <input id="bach-file" type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => setBachArchivo(event.target.files?.[0] || null)} />
            <button className="secondary-btn" type="button" onClick={() => document.getElementById("bach-file")?.click()}><Upload size={15} /> Elegir archivo</button>
            <button className="primary-btn" type="button" disabled={uploading === "formacion-bachillerato" || !bach.institucion} onClick={() => onSave("bachillerato", bach, { archivo: bachArchivo })}>Guardar</button>
          </div>
        </article>

        <article className="dynamic-item-card">
          <div className="dynamic-item-header">
            <strong>Profesional</strong>
            {prof.id && <button className="icon-danger-btn" type="button" onClick={() => onDelete(prof.id)}><Trash2 size={16} /></button>}
          </div>
          <div className="portal-form-grid compact-grid">
            <SelectField label="Nivel" value={prof.nivel || ""} onChange={(value) => setProf((actual) => ({ ...actual, nivel: value }))} options={["Técnico", "Tecnólogo", "Profesional", "Especialización", "Maestría", "Doctorado"]} />
            <Field label="Título obtenido" required value={prof.titulo || ""} onChange={(value) => setProf((actual) => ({ ...actual, titulo: value }))} />
            <Field label="Institución" required value={prof.institucion || ""} onChange={(value) => setProf((actual) => ({ ...actual, institucion: value }))} />
            <Field label="Año grado" value={String(prof.anio_grado || "")} onChange={(value) => setProf((actual) => ({ ...actual, anio_grado: value }))} />
            <Field className="wide-field" label="Ciudad" value={prof.ciudad || ""} onChange={(value) => setProf((actual) => ({ ...actual, ciudad: value }))} />
          </div>
          <div className="file-inline-row two-files-row">
            <span>Diploma: {diploma?.name || prof.diploma_nombre_archivo || "sin cargar"}</span>
            <input id="prof-diploma-file" type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => setDiploma(event.target.files?.[0] || null)} />
            <button className="secondary-btn" type="button" onClick={() => document.getElementById("prof-diploma-file")?.click()}><Upload size={15} /> Diploma</button>
            <span>Acta: {acta?.name || prof.acta_nombre_archivo || "sin cargar"}</span>
            <input id="prof-acta-file" type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => setActa(event.target.files?.[0] || null)} />
            <button className="secondary-btn" type="button" onClick={() => document.getElementById("prof-acta-file")?.click()}><Upload size={15} /> Acta</button>
            <button className="primary-btn" type="button" disabled={uploading === "formacion-profesional" || !prof.institucion || !prof.titulo} onClick={() => onSave("profesional", prof, { archivo_diploma: diploma, archivo_acta: acta })}>Guardar</button>
          </div>
        </article>

        <article className="dynamic-item-card">
          <div className="dynamic-item-header">
            <strong>Especializaciones y otros estudios</strong>
            <button className="brand-action-btn small-brand-btn inline-add-btn" type="button" onClick={() => setPosgrados((actual) => [...actual, { tipo: "especializacion", institucion: "", titulo: "", nivel: "especializacion", anio_grado: "", ciudad: "" }])}>
              <Plus size={16} /> Agregar
            </button>
          </div>
          {posgrados.length ? posgrados.map((item, index) => (
            <div className="nested-dynamic-card" key={`posgrado-${item.id || index}`}>
              <div className="dynamic-item-header">
                <strong>Estudio {index + 1}</strong>
                <button className="icon-danger-btn" type="button" onClick={() => {
                  if (item.id) onDelete(item.id);
                  setPosgrados((actual) => actual.filter((_, i) => i !== index));
                }}><Trash2 size={16} /></button>
              </div>
              <div className="portal-form-grid compact-grid">
                <SelectField label="Nivel" value={item.nivel || ""} onChange={(value) => setPosgrados((actual) => actual.map((pos, i) => i === index ? { ...pos, nivel: value } : pos))} options={["Especialización", "Maestría", "Doctorado", "Diplomado", "Curso"]} />
                <Field label="Título" required value={item.titulo || ""} onChange={(value) => setPosgrados((actual) => actual.map((pos, i) => i === index ? { ...pos, titulo: value } : pos))} />
                <Field label="Institución" required value={item.institucion || ""} onChange={(value) => setPosgrados((actual) => actual.map((pos, i) => i === index ? { ...pos, institucion: value } : pos))} />
                <Field label="Año" value={String(item.anio_grado || "")} onChange={(value) => setPosgrados((actual) => actual.map((pos, i) => i === index ? { ...pos, anio_grado: value } : pos))} />
                <Field className="wide-field" label="Ciudad" value={item.ciudad || ""} onChange={(value) => setPosgrados((actual) => actual.map((pos, i) => i === index ? { ...pos, ciudad: value } : pos))} />
              </div>
              <div className="file-inline-row">
                <span>{posgradoArchivos[index]?.name || item.nombre_archivo || "Sin soporte cargado"}</span>
                <input id={`posgrado-file-${index}`} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => setPosgradoArchivos((actual) => ({ ...actual, [index]: event.target.files?.[0] || null }))} />
                <button className="secondary-btn" type="button" onClick={() => document.getElementById(`posgrado-file-${index}`)?.click()}><Upload size={15} /> Archivo</button>
                <button className="primary-btn" type="button" disabled={uploading === "formacion-especializacion" || !item.institucion || !item.titulo} onClick={() => onSave("especializacion", item, { archivo: posgradoArchivos[index] || null })}>Guardar</button>
              </div>
            </div>
          )) : <div className="empty-state compact-empty">Aún no has agregado especializaciones u otros estudios.</div>}
        </article>
      </div>
    </section>
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
