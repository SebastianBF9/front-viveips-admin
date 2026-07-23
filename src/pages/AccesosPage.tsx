import { Boxes, ClipboardList, FileText, FolderKanban, HeartPulse, MessageCircle, Power, Search, ShieldCheck, Stethoscope, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { actualizarPermisosUsuario, alternarEstadoProfesional, listarUsuariosPermisos } from "../api";
import type { UsuarioPermisos, UsuarioPermisosPayload } from "../types";
import { Loading } from "../ui/Loading";

type PermissionKey = keyof UsuarioPermisosPayload;

interface PermissionItem {
  campo: PermissionKey;
  label: string;
  ayuda: string;
}

interface PermissionGroup {
  modulo: PermissionItem;
  descripcion: string;
  icon: typeof Stethoscope;
  permisos: PermissionItem[];
}

const permisoTotal: PermissionItem = {
  campo: "permiso_ver_todo",
  label: "Acceso total",
  ayuda: "Puede entrar a todos los módulos y administrar permisos",
};

const gruposPermisos: PermissionGroup[] = [
  {
    modulo: { campo: "permiso_gestion_solicitudes", label: "Solicitudes", ayuda: "Permite gestionar solicitudes y tickets del portal profesional" },
    descripcion: "Bandeja de soporte para responder, priorizar y cerrar solicitudes.",
    icon: MessageCircle,
    permisos: [],
  },
  {
    modulo: { campo: "permiso_modulo_servicios", label: "Servicios", ayuda: "Permite entrar al módulo de servicios habilitados" },
    descripcion: "Servicios IPS, cumplimiento y relaciones por estándar.",
    icon: Stethoscope,
    permisos: [],
  },
  {
    modulo: { campo: "permiso_modulo_talento_humano", label: "Talento Humano", ayuda: "Permite entrar al módulo de Talento Humano" },
    descripcion: "Profesionales, documentos, contratos, carnet y capacitaciones.",
    icon: UsersRound,
    permisos: [
      { campo: "permiso_ver_profesionales", label: "Consultar", ayuda: "Consultar profesionales, documentos, PDF, contrato y carnet" },
      { campo: "permiso_crear_profesionales", label: "Crear profesionales", ayuda: "Crear usuarios profesionales desde Talento Humano" },
      { campo: "permiso_ver_capacitaciones", label: "Capacitaciones", ayuda: "Gestionar capacitaciones" },
    ],
  },
  {
    modulo: { campo: "permiso_modulo_infraestructura", label: "Infraestructura", ayuda: "Permite entrar al módulo de Infraestructura" },
    descripcion: "Dotación, equipos, hojas de vida y tecnovigilancia.",
    icon: Boxes,
    permisos: [
      { campo: "permiso_tecnovigilancia", label: "Dotación", ayuda: "Gestionar equipos y tecnovigilancia" },
    ],
  },
  {
    modulo: { campo: "permiso_modulo_recursos", label: "Recursos Asistenciales", ayuda: "Permite entrar al módulo de Recursos Asistenciales" },
    descripcion: "Catálogo, compras, inventario, distribución, temperatura, auditoría e INVIMA.",
    icon: HeartPulse,
    permisos: [
      { campo: "permiso_recursos_comprar", label: "Comprar", ayuda: "Crear, editar y cancelar órdenes de compra de recursos" },
      { campo: "permiso_recursos_aprobar", label: "Aprobar OC", ayuda: "Aprobar órdenes de compra de recursos" },
      { campo: "permiso_recursos_recibir", label: "Recibir", ayuda: "Registrar recepciones e ingresar a inventario" },
      { campo: "permiso_recursos_ajustar", label: "Ajustar inv.", ayuda: "Ajustar, bloquear, trasladar y registrar devoluciones de lotes" },
      { campo: "permiso_recursos_dar_baja", label: "Dar baja", ayuda: "Dar de baja recursos de inventario" },
      { campo: "permiso_recursos_despachar", label: "Despachar", ayuda: "Crear despachos, salidas, reintentos y devoluciones de entrega" },
      { campo: "permiso_recursos_auditoria", label: "Auditoría", ayuda: "Consultar auditoría, reportes e INVIMA de recursos asistenciales" },
    ],
  },
  {
    modulo: { campo: "permiso_modulo_procesos_prioritarios", label: "Procesos Prioritarios", ayuda: "Permite entrar al módulo de Procesos Prioritarios" },
    descripcion: "Modelo y seguimiento de procesos asistenciales prioritarios.",
    icon: ClipboardList,
    permisos: [],
  },
  {
    modulo: { campo: "permiso_modulo_historia_clinica", label: "Historia Clínica", ayuda: "Permite entrar al módulo de Historia Clínica y registros" },
    descripcion: "Historia clínica, registros asistenciales y trazabilidad documental.",
    icon: FileText,
    permisos: [],
  },
  {
    modulo: { campo: "permiso_modulo_gestion_documental", label: "Gestión Documental", ayuda: "Permite entrar al módulo de Gestión Documental" },
    descripcion: "Documentos internos por estándar, versiones y archivos de soporte.",
    icon: FolderKanban,
    permisos: [],
  },
];

function iniciales(nombre?: string | null) {
  return (nombre || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function payloadDesdeUsuario(usuario: UsuarioPermisos): UsuarioPermisosPayload {
  return {
    permiso_ver_todo: usuario.permiso_ver_todo,
    permiso_modulo_servicios: usuario.permiso_modulo_servicios,
    permiso_modulo_talento_humano: usuario.permiso_modulo_talento_humano,
    permiso_modulo_infraestructura: usuario.permiso_modulo_infraestructura,
    permiso_modulo_recursos: usuario.permiso_modulo_recursos,
    permiso_modulo_procesos_prioritarios: usuario.permiso_modulo_procesos_prioritarios,
    permiso_modulo_historia_clinica: usuario.permiso_modulo_historia_clinica,
    permiso_modulo_gestion_documental: usuario.permiso_modulo_gestion_documental,
    permiso_gestion_solicitudes: usuario.permiso_gestion_solicitudes,
    permiso_ver_profesionales: usuario.permiso_ver_profesionales,
    permiso_crear_profesionales: usuario.permiso_crear_profesionales,
    permiso_ver_capacitaciones: usuario.permiso_ver_capacitaciones,
    permiso_tecnovigilancia: usuario.permiso_tecnovigilancia,
    permiso_recursos_comprar: usuario.permiso_recursos_comprar,
    permiso_recursos_aprobar: usuario.permiso_recursos_aprobar,
    permiso_recursos_recibir: usuario.permiso_recursos_recibir,
    permiso_recursos_ajustar: usuario.permiso_recursos_ajustar,
    permiso_recursos_dar_baja: usuario.permiso_recursos_dar_baja,
    permiso_recursos_despachar: usuario.permiso_recursos_despachar,
    permiso_recursos_auditoria: usuario.permiso_recursos_auditoria,
  };
}

function PermisoToggle({
  checked,
  disabled,
  onChange,
  title,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (valor: boolean) => void;
  title?: string;
}) {
  return (
    <label className="toggle-permission" title={title}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span />
    </label>
  );
}

export function AccesosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioPermisos[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const data = await listarUsuariosPermisos();
      setUsuarios(data.usuarios || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const texto = query.trim().toLowerCase();
    if (!texto) return usuarios;
    return usuarios.filter((usuario) =>
      [usuario.nombre, usuario.cedula, usuario.email, usuario.especialidad, usuario.rol]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(texto)),
    );
  }, [query, usuarios]);

  async function cambiarPermiso(usuario: UsuarioPermisos, campo: keyof UsuarioPermisosPayload, valor: boolean) {
    const siguiente = { ...usuario, [campo]: valor };
    const payload = payloadDesdeUsuario(siguiente);
    setSaving(usuario.usuario_id);
    setError("");
    setSuccess("");
    try {
      const data = await actualizarPermisosUsuario(usuario.usuario_id, payload);
      setUsuarios((actuales) => actuales.map((item) => (item.usuario_id === usuario.usuario_id ? data.usuario : item)));
      setSuccess(`Permisos actualizados para ${data.usuario.nombre}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar permisos");
    } finally {
      setSaving(null);
    }
  }

  async function cambiarEstadoProfesional(usuario: UsuarioPermisos) {
    if (!usuario.profesional_id) return;
    const accion = usuario.activo ? "desactivar" : "activar";
    if (!confirm(`¿Quieres ${accion} a ${usuario.nombre}?`)) return;
    setSaving(usuario.usuario_id);
    setError("");
    setSuccess("");
    try {
      const data = await alternarEstadoProfesional(usuario.profesional_id);
      const activo = Boolean(data.activo);
      setUsuarios((actuales) => actuales.map((item) => (
        item.usuario_id === usuario.usuario_id ? { ...item, activo } : item
      )));
      setSuccess(`${usuario.nombre} quedó ${activo ? "activo" : "inactivo"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cambiar el estado del profesional");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <Loading text="Cargando accesos..." />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Configuracion</span>
          <h1>Accesos</h1>
          <p>Administra acceso global por módulo y permisos específicos para cada operación.</p>
        </div>
      </header>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, cedula, correo, cargo o rol" />
        </label>
      </div>

      <section className="table-card access-panel">
        <div className="section-heading">
          <h2>Usuarios y permisos</h2>
          <p>El acceso total conserva control completo. Los permisos de módulo permiten entrar; los permisos específicos habilitan acciones internas.</p>
        </div>

        <div className="access-user-list">
          {filtrados.map((usuario) => (
            <article className="access-user-card" key={usuario.usuario_id}>
              <div className="access-user-summary">
                <div className="prof-info">
                  <div className="prof-avatar">{iniciales(usuario.nombre)}</div>
                  <div>
                    <div className="prof-nombre">{usuario.nombre}</div>
                    <div className="prof-cedula">CC: {usuario.cedula} · {usuario.rol}</div>
                    <small>{usuario.email || usuario.especialidad || "Sin informacion adicional"}</small>
                  </div>
                </div>

                <div className="access-user-actions">
                  <label className="access-total-toggle" title={permisoTotal.ayuda}>
                    <span>{permisoTotal.label}</span>
                    <PermisoToggle
                      checked={Boolean(usuario.permiso_ver_todo)}
                      disabled={saving === usuario.usuario_id}
                      onChange={(valor) => cambiarPermiso(usuario, "permiso_ver_todo", valor)}
                    />
                  </label>

                  <div className="access-status-cell">
                    <span className={`pill ${usuario.activo ? "activo" : "inactivo"}`}>{usuario.activo ? "Activo" : "Inactivo"}</span>
                    {usuario.profesional_id ? (
                      <button
                        className={`status-toggle-btn ${usuario.activo ? "danger" : "success"}`}
                        type="button"
                        disabled={saving === usuario.usuario_id}
                        onClick={() => cambiarEstadoProfesional(usuario)}
                      >
                        <Power size={14} />
                        {usuario.activo ? "Desactivar" : "Activar"}
                      </button>
                    ) : (
                      <small>Sin perfil</small>
                    )}
                  </div>
                </div>
              </div>

              <div className="module-permissions-grid">
                {gruposPermisos.map((grupo) => {
                  const Icon = grupo.icon;
                  const moduloActivo = Boolean(usuario[grupo.modulo.campo]);
                  return (
                    <section className={`module-permission-card ${moduloActivo ? "enabled" : ""}`} key={grupo.modulo.campo}>
                      <div className="module-permission-header">
                        <span className="module-permission-icon"><Icon size={18} /></span>
                        <div>
                          <h3>{grupo.modulo.label}</h3>
                          <p>{grupo.descripcion}</p>
                        </div>
                        <PermisoToggle
                          checked={moduloActivo}
                          disabled={saving === usuario.usuario_id}
                          onChange={(valor) => cambiarPermiso(usuario, grupo.modulo.campo, valor)}
                          title={grupo.modulo.ayuda}
                        />
                      </div>

                      {grupo.permisos.length > 0 && (
                        <div className="module-permission-detail">
                          {grupo.permisos.map((permiso) => (
                            <label className="permission-chip" title={permiso.ayuda} key={permiso.campo}>
                              <input
                                type="checkbox"
                                checked={Boolean(usuario[permiso.campo])}
                                disabled={saving === usuario.usuario_id}
                                onChange={(event) => cambiarPermiso(usuario, permiso.campo, event.target.checked)}
                              />
                              <span>{permiso.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </article>
          ))}
        </div>

        {filtrados.length === 0 && <div className="empty-state">No hay usuarios para el filtro seleccionado.</div>}
      </section>

      <section className="access-note">
        <ShieldCheck size={20} />
        <p>El backend tambien valida estos permisos. Si alguien escribe una URL manualmente sin acceso, recibira un 403.</p>
      </section>
    </section>
  );
}
