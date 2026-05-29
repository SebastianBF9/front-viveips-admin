import { LogOut, ShieldCheck, Stethoscope, UsersRound } from "lucide-react";
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

  const puedeVerServicios = Boolean(acceso?.permiso_ver_todo);
  const puedeVerTalento = Boolean(acceso?.permiso_ver_todo || acceso?.permiso_ver_profesionales || acceso?.permiso_crear_profesionales);
  const puedeVerAccesos = Boolean(acceso?.permiso_ver_todo);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.jpg" alt="Vive IPS" />
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
