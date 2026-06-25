import { Building2, ClipboardList, FileText, FolderKanban, LogOut, PackagePlus, ShieldCheck, Stethoscope, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getToken, obtenerMiAcceso } from "../api";
import type { PermisosAcceso } from "../types";
import { Loading } from "./Loading";

export function AppLayout() {
  const navigate = useNavigate();
  const token = getToken();
  const [acceso, setAcceso] = useState<PermisosAcceso | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    obtenerMiAcceso()
      .then(setAcceso)
      .catch(() => {
        clearSession();
        navigate("/login", { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate, token]);

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) return <Loading text="Validando accesos..." />;

  const puedeVerServicios = Boolean(acceso?.permiso_ver_todo || acceso?.permiso_modulo_servicios);
  const puedeVerTalento = Boolean(acceso?.permiso_ver_todo || acceso?.permiso_modulo_talento_humano || acceso?.permiso_ver_profesionales || acceso?.permiso_crear_profesionales || acceso?.permiso_ver_capacitaciones);
  const puedeVerAccesos = Boolean(acceso?.permiso_ver_todo);
  const puedeVerInfraestructura = Boolean(acceso?.permiso_ver_todo || acceso?.permiso_modulo_infraestructura || acceso?.permiso_tecnovigilancia);
  const puedeVerRecursos = Boolean(
    acceso?.permiso_ver_todo ||
    acceso?.permiso_modulo_recursos ||
    acceso?.permiso_recursos_comprar ||
    acceso?.permiso_recursos_aprobar ||
    acceso?.permiso_recursos_recibir ||
    acceso?.permiso_recursos_ajustar ||
    acceso?.permiso_recursos_dar_baja ||
    acceso?.permiso_recursos_despachar ||
    acceso?.permiso_recursos_auditoria
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo_carnet.png" alt="Vive IPS" />
          <div>
            <span>Panel Administrativo</span>
          </div>
        </div>

        <nav className="nav">
          {puedeVerServicios && (
            <NavLink to="/servicios" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Stethoscope size={18} />
              Servicios
            </NavLink>
          )}
          {puedeVerTalento && (
            <NavLink to="/talento-humano" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <UsersRound size={18} />
              Talento Humano
            </NavLink>
          )}
          {puedeVerInfraestructura && (
            <NavLink to="/infraestructura" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Building2 size={18} />
              Infraestructura
            </NavLink>
          )}
          {puedeVerRecursos && (
            <NavLink to="/recursos-asistenciales" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <PackagePlus size={18} />
              Recursos Asistenciales
            </NavLink>
          )}
          {Boolean(acceso?.permiso_ver_todo || acceso?.permiso_modulo_procesos_prioritarios) && (
            <NavLink to="/procesos-prioritarios" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <ClipboardList size={18} />
              Procesos Prioritarios
            </NavLink>
          )}
          {Boolean(acceso?.permiso_ver_todo || acceso?.permiso_modulo_historia_clinica) && (
            <NavLink to="/historia-clinica-registros" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <FileText size={18} />
              Historia clínica y registros
            </NavLink>
          )}
          {Boolean(acceso?.permiso_ver_todo || acceso?.permiso_modulo_gestion_documental) && (
            <NavLink to="/gestion-documental" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <FolderKanban size={18} />
              Gestión Documental
            </NavLink>
          )}
          {puedeVerAccesos && (
            <NavLink to="/accesos" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <ShieldCheck size={18} />
              Accesos
            </NavLink>
          )}
        </nav>

        <button className="logout" type="button" onClick={logout}>
          <LogOut size={17} />
          Cerrar sesion
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
