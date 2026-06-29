import { useEffect, useMemo, useState } from "react";
import { descargarCarnetProfesional, obtenerMiPerfilProfesional, obtenerProfesional } from "../api";

const API_URL = import.meta.env.VITE_API_URL || "https://api-pruebas.viveips.com.co";

type CarnetPerfil = {
  id: number;
  nombre: string;
  cedula?: string | null;
  especialidad?: string | null;
  foto?: string | null;
  rh?: string | null;
  activo?: boolean | number | null;
};

function texto(valor?: string | number | null, fallback = "") {
  if (valor === undefined || valor === null || valor === "") return fallback;
  return String(valor);
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function portalPublicoBase() {
  const host = window.location.hostname;
  if (host.includes("admin-pruebas") || host.includes("localhost") || host.includes("127.0.0.1")) return "https://pruebas.portal.viveips.com.co";
  return "https://portal.viveips.com.co";
}

export function CarnetPage() {
  const params = new URLSearchParams(window.location.search);
  const profesionalId = params.get("profesionalId") || "";
  const tokenParam = params.get("token") || "";
  const [perfil, setPerfil] = useState<CarnetPerfil | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const activo = perfil?.activo === undefined || perfil?.activo === null ? true : Boolean(perfil.activo);
  const nombre = texto(perfil?.nombre, "Profesional");
  const cedula = texto(perfil?.cedula, "-");
  const cargo = texto(perfil?.especialidad, "");
  const rh = texto(perfil?.rh, "No registra");
  const qrUrl = useMemo(() => `${portalPublicoBase()}/verificar.html?cedula=${encodeURIComponent(cedula)}`, [cedula]);
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&color=1B3A6B&bgcolor=FFFFFF&data=${encodeURIComponent(qrUrl)}`;

  useEffect(() => {
    setLoading(true);
    setError("");
    if (tokenParam) sessionStorage.setItem("viveips_token", tokenParam);
    const request = profesionalId ? obtenerProfesional(Number(profesionalId)).then((data) => data.perfil) : obtenerMiPerfilProfesional().then((data) => data.perfil);
    request
      .then((data) => setPerfil(data as CarnetPerfil))
      .catch((err) => setError(err instanceof Error ? err.message : "No fue posible cargar el carnet"))
      .finally(() => setLoading(false));
  }, [profesionalId, tokenParam]);

  async function descargar() {
    if (!perfil) return;
    setDownloading(true);
    try {
      await descargarCarnetProfesional(profesionalId || undefined, nombre);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar el carnet");
    } finally {
      window.setTimeout(() => setDownloading(false), 3000);
    }
  }

  return (
    <main className="carnet-page">
      {loading && <div className="carnet-loading">Cargando carnet...</div>}
      {error && <div className="carnet-error">{error}</div>}

      {!loading && perfil && (
        <>
          <section className="carnet-card" aria-label={`Carnet de ${nombre}`}>
            <header className="carnet-header">
              <div className="carnet-logo-row">
                <img src="/logo_carnet.png" alt="Vive IPS" />
                <img src="/logo_servicio_domiciliario.png" alt="Servicios Domiciliarios" />
              </div>
              <div className="carnet-nit">NIT 900924678-3</div>
            </header>

            <div className="carnet-body">
              <div className="carnet-photo-wrap">
                {perfil.foto ? (
                  <img className="carnet-photo" src={`${API_URL}/profesionales/foto/${perfil.id}`} alt={nombre} />
                ) : (
                  <div className="carnet-photo initials">{iniciales(nombre)}</div>
                )}
              </div>

              <h1>{nombre}</h1>
              <div className="carnet-role">{cargo}</div>
              <div className="carnet-id">CC: {cedula}</div>
              <div className="carnet-id carnet-rh">RH: {rh}</div>
              <div className={`carnet-status ${activo ? "active" : "inactive"}`}>{activo ? "ACTIVO" : "INACTIVO"}</div>
              <div className="carnet-divider" />
              <div className="carnet-qr">
                <img src={qrImg} alt="QR de verificacion" />
                <span>Escanea para verificar</span>
              </div>
            </div>

            <footer className="carnet-footer">GRUPO MEDICO INTEGRAL VIVE IPS S.A.S</footer>
          </section>

          <button className="carnet-download" type="button" onClick={descargar} disabled={downloading}>
            {downloading ? "Generando..." : "Descargar carnet (PNG)"}
          </button>
        </>
      )}
    </main>
  );
}
