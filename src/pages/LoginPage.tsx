import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../api";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(usuario, password);
      const next = params.get("next");
      navigate(next && next.startsWith("/") ? next : "/portal-profesional", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Vive IPS Servicios Domiciliarios">
        <div className="login-brand-content">
          <div className="login-brand-logos">
            <img src="/logo_carnet.png" alt="Vive IPS" />
            <span aria-hidden="true" />
            <img src="/logo_servicio_domiciliario.png" alt="Servicios Domiciliarios" />
          </div>
          <h1>Calidad en cada atención</h1>
          <p>Comprometidos con una atención segura, humana y oportuna</p>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-content">
          <div className="login-form-brand" aria-label="Vive IPS Servicios Domiciliarios">
            <img src="/logo_carnet.png" alt="Vive IPS" />
            <span aria-hidden="true" />
            <img src="/logo_servicio_domiciliario.png" alt="Servicios Domiciliarios" />
          </div>
          <p className="login-welcome">Ingresa con tus credenciales</p>

          <form className="login-card" onSubmit={onSubmit}>
            <h2>Iniciar sesión</h2>
            <label>
              Usuario
              <input value={usuario} onChange={(event) => setUsuario(event.target.value)} autoComplete="username" />
            </label>
            <label>
              Contraseña
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
              />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
