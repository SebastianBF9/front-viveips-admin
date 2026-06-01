import { Power, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { actualizarPermisosUsuario, alternarEstadoProfesional, listarUsuariosPermisos } from "../api";
import type { UsuarioPermisos, UsuarioPermisosPayload } from "../types";
import { Loading } from "../ui/Loading";

const permisos: Array<{ campo: keyof UsuarioPermisosPayload; label: string; ayuda: string }> = [
  { campo: "permiso_ver_todo", label: "Ver todo", ayuda: "Acceso total y administracion de permisos" },
  { campo: "permiso_ver_profesionales", label: "Talento Humano", ayuda: "Consultar profesionales, documentos, PDF, contrato y carnet" },
  { campo: "permiso_crear_profesionales", label: "Crear profesionales", ayuda: "Crear usuarios profesionales desde Talento Humano" },
  { campo: "permiso_ver_capacitaciones", label: "Capacitaciones", ayuda: "Gestionar capacitaciones" },
  { campo: "permiso_tecnovigilancia", label: "Dotacion", ayuda: "Gestionar equipos y tecnovigilancia" },
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
    permiso_ver_profesionales: usuario.permiso_ver_profesionales,
    permiso_crear_profesionales: usuario.permiso_crear_profesionales,
    permiso_ver_capacitaciones: usuario.permiso_ver_capacitaciones,
    permiso_tecnovigilancia: usuario.permiso_tecnovigilancia,
  };
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
          <p>Administra permisos modulares. Solo usuarios con acceso total pueden ver esta pagina.</p>
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

      <section className="table-card">
        <div className="section-heading">
          <h2>Usuarios y permisos</h2>
          <p>Crear un profesional no asigna permisos administrativos; los accesos se manejan unicamente aqui.</p>
        </div>

        <table className="access-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              {permisos.map((permiso) => (
                <th key={permiso.campo}>{permiso.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((usuario) => (
              <tr key={usuario.usuario_id}>
                <td>
                  <div className="prof-info">
                    <div className="prof-avatar">{iniciales(usuario.nombre)}</div>
                    <div>
                      <div className="prof-nombre">{usuario.nombre}</div>
                      <div className="prof-cedula">CC: {usuario.cedula}</div>
                      <small>{usuario.email || usuario.especialidad || "Sin informacion adicional"}</small>
                    </div>
                  </div>
                </td>
                <td>{usuario.rol}</td>
                <td>
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
                </td>
                {permisos.map((permiso) => (
                  <td key={permiso.campo}>
                    <label className="toggle-permission" title={permiso.ayuda}>
                      <input
                        type="checkbox"
                        checked={Boolean(usuario[permiso.campo])}
                        disabled={saving === usuario.usuario_id}
                        onChange={(event) => cambiarPermiso(usuario, permiso.campo, event.target.checked)}
                      />
                      <span />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {filtrados.length === 0 && <div className="empty-state">No hay usuarios para el filtro seleccionado.</div>}
      </section>

      <section className="access-note">
        <ShieldCheck size={20} />
        <p>El backend tambien valida estos permisos. Si alguien escribe una URL manualmente sin acceso, recibira un 403.</p>
      </section>
    </section>
  );
}
