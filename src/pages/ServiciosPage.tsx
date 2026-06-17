import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarServiciosIps } from "../api";
import type { ServicioIps } from "../types";
import { Loading } from "../ui/Loading";

const estandaresVisibles = [
  {
    key: "procesos_prioritarios",
    label: "Procesos prioritarios",
    description: "Protocolos, guias, responsables y evidencias de socializacion.",
  },
  {
    key: "historia_clinica_registros",
    label: "Historia clinica y registros",
    description: "Formatos, plan de cuidado, evoluciones, egreso, auditoria y trazabilidad.",
  },
  {
    key: "interdependencia",
    label: "Interdependencia",
    description: "Servicios propios o contratados, REPS, convenios, vigencias y tiempos de respuesta.",
  },
  {
    key: "gestion_documental",
    label: "Gestion documental",
    description: "Soportes, versiones, vencimientos y responsables documentales del servicio.",
  },
];

export function ServiciosPage() {
  const [servicios, setServicios] = useState<ServicioIps[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [estandarActivo, setEstandarActivo] = useState(estandaresVisibles[0].key);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listarServiciosIps()
      .then((data) => setServicios(data.servicios || []))
      .catch((err) => setError(err instanceof Error ? err.message : "No fue posible cargar servicios"))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return servicios.filter((servicio) => {
      if (estado && servicio.estado !== estado) return false;
      if (!q) return true;
      return [servicio.codigo, servicio.nombre, servicio.grupo, servicio.distintivo, servicio.tipo]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(q));
    });
  }, [busqueda, estado, servicios]);

  const habilitados = servicios.filter((servicio) => servicio.estado === "habilitado").length;
  const proximos = servicios.filter((servicio) => servicio.estado === "proximo").length;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Habilitación</span>
          <h1>Servicios Vive IPS</h1>
          <p>Servicios habilitados y próximos a habilitar con tablero independiente.</p>
        </div>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <strong>{servicios.length}</strong>
          <span>Total Vive IPS</span>
        </article>
        <article className="kpi-card">
          <strong>{habilitados}</strong>
          <span>Habilitados</span>
        </article>
        <article className="kpi-card">
          <strong>{proximos}</strong>
          <span>Próximos</span>
        </article>
      </div>

      <section className="table-card">
        <div className="section-heading">
          <h2>Estándares en construcción</h2>
          <p>Estos frentes quedan visibles para tenerlos presentes en la habilitación de cada servicio.</p>
        </div>
        <nav className="tabs compact-tabs" aria-label="Estándares en construcción">
          {estandaresVisibles.map((estandar) => (
            <button
              key={estandar.key}
              className={estandarActivo === estandar.key ? "active" : ""}
              type="button"
              onClick={() => setEstandarActivo(estandar.key)}
            >
              {estandar.label}
            </button>
          ))}
        </nav>
        <div className="empty-state">
          {estandaresVisibles.find((estandar) => estandar.key === estandarActivo)?.description}
        </div>
      </section>

      <div className="toolbar">
        <div className="search-field">
          <Search size={18} />
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por código, servicio, grupo o distintivo" />
        </div>
        <select value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="habilitado">Habilitados</option>
          <option value="proximo">Próximos</option>
        </select>
      </div>

      {loading && <Loading text="Cargando servicios..." />}
      {error && <div className="error-box">{error}</div>}

      {!loading && !error && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Servicio</th>
                <th>Grupo</th>
                <th>Estado</th>
                <th>Distintivo / Tipo</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((servicio) => (
                <tr key={servicio.id}>
                  <td className="code">{servicio.codigo}</td>
                  <td>
                    <Link className="table-link" to={`/servicios/${servicio.codigo}`}>
                      {servicio.nombre}
                    </Link>
                  </td>
                  <td>{servicio.grupo}</td>
                  <td>
                    <span className={`pill ${servicio.estado}`}>{servicio.estado === "habilitado" ? "Habilitado" : "Próximo"}</span>
                  </td>
                  <td>
                    {servicio.distintivo || servicio.tipo || "Sin distintivo"}
                    {servicio.distintivo && servicio.tipo && <small>{servicio.tipo}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length === 0 && <Loading text="No hay servicios con esos filtros." />}
        </div>
      )}
    </section>
  );
}
