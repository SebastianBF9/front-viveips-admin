import { LogOut, PanelsTopLeft, Stethoscope } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getToken } from "../api";

export function AppLayout() {
  const navigate = useNavigate();
  const token = getToken();

  if (!token) {
    navigate("/login", { replace: true });
    return null;
  }

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo_carnet.png" alt="Vive IPS" />
          <div>
            <strong>Vive IPS</strong>
            <span>Admin nuevo</span>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/servicios" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Stethoscope size={18} />
            Servicios
          </NavLink>
          <button className="nav-link disabled" type="button">
            <PanelsTopLeft size={18} />
            Próximamente
          </button>
        </nav>

        <button className="logout" type="button" onClick={logout}>
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
