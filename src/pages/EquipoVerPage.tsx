import { useEffect, useState } from "react";
import { downloadUrl, obtenerEquipoQrPublico } from "../api";
import type { EquipoBiomedico } from "../types";

type QrEquipoResponse = {
  equipo?: EquipoBiomedico;
  asignado?: boolean;
  mensaje_privacidad?: string;
};

function texto(valor?: string | number | null) {
  if (valor === undefined || valor === null || valor === "") return "-";
  return String(valor);
}

function estadoLabel(estado?: string | null) {
  const labels: Record<string, string> = {
    disponible: "Disponible",
    asignado: "Asignado",
    asignacion_en_proceso: "Asignacion en proceso",
    pendiente_revision: "Pendiente revision",
    en_mantenimiento: "En mantenimiento",
    fuera_de_servicio: "Fuera de servicio",
    extraviado: "Extraviado",
    dado_de_baja: "Dado de baja",
  };
  return labels[estado || ""] || estado || "-";
}

function cacheBuster(url: string) {
  const glue = url.includes("?") ? "&" : "?";
  return `${url}${glue}v=${Date.now()}`;
}

export function EquipoVerPage() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get("codigo") || "";
  const [data, setData] = useState<QrEquipoResponse | null>(null);
  const [error, setError] = useState("");
  const equipo = data?.equipo || null;
  const asignado = Boolean(data?.asignado);

  useEffect(() => {
    if (!codigo) {
      setError("No se recibio codigo de equipo.");
      return;
    }
    obtenerEquipoQrPublico(codigo)
      .then((resultado) => {
        setData(resultado);
        setError("");
      })
      .catch((err) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Equipo no encontrado");
      });
  }, [codigo]);

  function irAGestion() {
    const next = encodeURIComponent("/infraestructura");
    window.location.href = `/login?next=${next}`;
  }

  return (
    <main className="equipo-ver-page">
      <section className="equipo-ver-card">
        <header className="equipo-ver-header">
          <div className="equipo-ver-logo-box">
            <img src="/logo_carnet.png" alt="VIVE IPS" />
          </div>
          <div>
            <h1>Consulta de equipo biomedico</h1>
            <p>Modulo de Tecnovigilancia</p>
          </div>
        </header>

        <div className="equipo-ver-body">
          {error && <div className="equipo-ver-error">{error}</div>}

          {!error && !equipo && <div className="equipo-ver-loading">Consultando equipo...</div>}

          {equipo && (
            <>
              <div className="equipo-ver-photo">
                {equipo.foto_equipo && equipo.codigo_interno ? (
                  <img src={cacheBuster(downloadUrl(`/qr/equipos/${encodeURIComponent(equipo.codigo_interno)}/archivo/foto`))} alt="Foto del equipo" />
                ) : (
                  <span>Sin foto cargada</span>
                )}
              </div>

              <h2>{texto(equipo.nombre)}</h2>
              <p className="equipo-ver-summary">
                {texto(equipo.marca)} - {texto(equipo.modelo)} - Serie: {texto(equipo.serie)}
              </p>

              <span className={`equipo-ver-badge ${asignado ? "asignado" : ""}`}>{estadoLabel(equipo.estado)}</span>

              <div className="equipo-ver-grid">
                <div className="equipo-ver-dato">
                  <span>Codigo</span>
                  <strong>{texto(equipo.codigo_interno)}</strong>
                </div>
                <div className="equipo-ver-dato">
                  <span>Area / Servicio</span>
                  <strong>{texto(equipo.area)} / {texto(equipo.servicio)}</strong>
                </div>
                <div className="equipo-ver-dato">
                  <span>Registro INVIMA</span>
                  <strong>{texto(equipo.registro_invima)}</strong>
                </div>
                <div className="equipo-ver-dato">
                  <span>Asignacion</span>
                  <strong>{asignado ? "Asignado actualmente" : "Sin asignacion activa"}</strong>
                </div>
              </div>

              <div className="equipo-ver-actions">
                {equipo.manual_usuario && equipo.codigo_interno && (
                  <a className="equipo-ver-secondary" href={downloadUrl(`/qr/equipos/${encodeURIComponent(equipo.codigo_interno)}/archivo/manual-usuario`)} target="_blank" rel="noopener noreferrer">
                    Manual de usuario
                  </a>
                )}
                <button className="equipo-ver-primary" type="button" onClick={irAGestion}>
                  Iniciar sesion para gestionar
                </button>
              </div>

              <div className="equipo-ver-privacy">
                {texto(data?.mensaje_privacidad || "Para gestionar este equipo inicia sesion con un usuario autorizado.")}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
