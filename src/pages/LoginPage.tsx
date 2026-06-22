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
      <form className="login-card" onSubmit={onSubmit}>
        <img src="/logo_carnet.png" alt="Vive IPS" />
        <h1>Admin Vive IPS</h1>
        <p>Panel administrativo</p>

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
    </main>
  );
}
