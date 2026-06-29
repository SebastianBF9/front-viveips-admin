import { useEffect, useMemo, useState } from "react";
import { obtenerEquipoQrPublico } from "../api";
import type { EquipoBiomedico } from "../types";

function texto(valor?: string | number | null) {
  if (valor === undefined || valor === null || valor === "") return "-";
  return String(valor);
}

function portalPublicoBase() {
  const host = window.location.hostname;
  const esPruebas = host === "pruebas.portal.viveips.com.co" || host.includes("localhost") || host.includes("127.0.0.1") || host.includes("admin-pruebas");
  return esPruebas ? "https://admin-pruebas.portal.viveips.com.co" : "https://admin.portal.viveips.com.co";
}

export function EquipoQrPage() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get("codigo") || "";
  const nombreInicial = params.get("nombre") || "";
  const [equipo, setEquipo] = useState<EquipoBiomedico | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!codigo) {
      setError("Sin codigo");
      return;
    }
    obtenerEquipoQrPublico(codigo)
      .then((data) => {
        setEquipo(data.equipo || null);
        setError("");
      })
      .catch((err) => {
        setEquipo(null);
        setError(err instanceof Error ? err.message : "Equipo no encontrado");
      });
  }, [codigo]);

  const urlConsulta = useMemo(() => {
    const base = portalPublicoBase();
    return `${base}/equipos/ver?codigo=${encodeURIComponent(codigo)}`;
  }, [codigo]);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=10&data=${encodeURIComponent(urlConsulta)}`;

  return (
    <main className="equipo-qr-page">
      <section className="equipo-qr-label">
        <img className="equipo-qr-logo" src="/logo_carnet.png" alt="VIVE IPS" />
        <h1>Equipo biomedico</h1>
        <p className="equipo-qr-subtitle">Escanea para consultar informacion del equipo</p>

        <div className="equipo-qr-box">
          {codigo ? <img src={qrUrl} alt="QR del equipo" /> : <span>Sin codigo</span>}
        </div>

        <strong className="equipo-qr-name">{texto(equipo?.nombre || nombreInicial || (error ? "Equipo biomedico" : "Cargando..."))}</strong>
        <strong className="equipo-qr-code">{texto(codigo)}</strong>

        <p className="equipo-qr-help">
          VIVE IPS - Modulo de Tecnovigilancia
          <br />
          Uso interno y consulta autorizada
        </p>

        <div className="equipo-qr-actions">
          <button className="equipo-qr-secondary" type="button" onClick={() => window.close()}>
            Cerrar
          </button>
          <button className="equipo-qr-primary" type="button" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
      </section>
    </main>
  );
}
