import { AlertTriangle, CheckCircle2, ClipboardList, FileCheck2, GraduationCap, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";

const procesos = [
  {
    id: "ingreso",
    nombre: "Ingreso del paciente",
    alcance: "Admisión, verificación documental, valoración inicial y apertura del plan de cuidado.",
    responsable: "Coordinación asistencial",
    evidencia: "Formato de ingreso, consentimiento, valoración inicial",
    estado: "en_revision",
    avance: 65,
  },
  {
    id: "plan-cuidado",
    nombre: "Plan de cuidado",
    alcance: "Definición, actualización y seguimiento del plan individual de atención domiciliaria.",
    responsable: "Médico tratante / Enfermería",
    evidencia: "Plan de cuidado firmado, evoluciones, ajustes clínicos",
    estado: "pendiente",
    avance: 40,
  },
  {
    id: "medicamentos",
    nombre: "Administración de medicamentos",
    alcance: "Prescripción, alistamiento, administración segura, registro y reporte de eventos.",
    responsable: "Enfermería / Recursos asistenciales",
    evidencia: "Kardex, hoja de administración, trazabilidad de lote",
    estado: "en_revision",
    avance: 55,
  },
  {
    id: "muestras",
    nombre: "Toma de muestras",
    alcance: "Preparación, identificación, toma, conservación, transporte y registro de muestras.",
    responsable: "Toma de muestras / Laboratorio",
    evidencia: "Orden, registro de toma, cadena de custodia",
    estado: "pendiente",
    avance: 35,
  },
  {
    id: "residuos",
    nombre: "Manejo de residuos",
    alcance: "Segregación, almacenamiento temporal, transporte y disposición según atención domiciliaria.",
    responsable: "Coordinación HSEQ",
    evidencia: "PGIRASA, actas, registros de gestor externo",
    estado: "pendiente",
    avance: 30,
  },
  {
    id: "egreso",
    nombre: "Egreso y cierre",
    alcance: "Cierre del servicio, educación final, devolución de equipos/insumos y registro de egreso.",
    responsable: "Coordinación asistencial",
    evidencia: "Formato de egreso, epicrisis, paz y salvo operativo",
    estado: "pendiente",
    avance: 25,
  },
];

const socializaciones = [
  { tema: "Ingreso y plan de cuidado", publico: "Médicos, enfermería y terapias", periodicidad: "Semestral", evidencia: "Lista de asistencia y evaluación" },
  { tema: "Medicamentos y eventos adversos", publico: "Enfermería y recursos asistenciales", periodicidad: "Trimestral", evidencia: "Acta de socialización" },
  { tema: "Muestras y cadena de custodia", publico: "Toma de muestras", periodicidad: "Anual", evidencia: "Lista de chequeo" },
  { tema: "Residuos en domicilio", publico: "Todo el personal asistencial", periodicidad: "Anual", evidencia: "Certificado de capacitación" },
];

const estadoLabel: Record<string, string> = {
  cumple: "Cumple",
  en_revision: "En revisión",
  pendiente: "Pendiente",
};

export function ProcesosPrioritariosPage() {
  const [procesoActivo, setProcesoActivo] = useState(procesos[0].id);
  const proceso = procesos.find((item) => item.id === procesoActivo) || procesos[0];

  const resumen = useMemo(() => {
    const promedio = Math.round(procesos.reduce((acc, item) => acc + item.avance, 0) / procesos.length);
    return {
      total: procesos.length,
      enRevision: procesos.filter((item) => item.estado === "en_revision").length,
      pendientes: procesos.filter((item) => item.estado === "pendiente").length,
      promedio,
    };
  }, []);

  return (
    <section className="page procesos-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Habilitación</span>
          <h1>Procesos Prioritarios</h1>
          <p>Protocolos, procedimientos, responsables, socialización y evidencias para servicios domiciliarios.</p>
        </div>
      </header>

      <div className="kpi-grid four">
        <article className="kpi-card"><strong>{resumen.total}</strong><span>Procesos base</span></article>
        <article className="kpi-card"><strong>{resumen.enRevision}</strong><span>En revisión</span></article>
        <article className="kpi-card"><strong>{resumen.pendientes}</strong><span>Pendientes</span></article>
        <article className="kpi-card"><strong>{resumen.promedio}%</strong><span>Avance documental</span></article>
      </div>

      <section className="procesos-layout">
        <aside className="procesos-list table-card">
          <div className="section-heading">
            <h2>Mapa de procesos</h2>
            <p>Procesos mínimos para iniciar el estándar.</p>
          </div>
          <div className="procesos-menu">
            {procesos.map((item) => (
              <button
                className={procesoActivo === item.id ? "active" : ""}
                key={item.id}
                type="button"
                onClick={() => setProcesoActivo(item.id)}
              >
                <ClipboardList size={17} />
                <span>
                  <strong>{item.nombre}</strong>
                  <small>{estadoLabel[item.estado]}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="table-card proceso-detail">
          <div className="section-heading inline-heading">
            <div>
              <h2>{proceso.nombre}</h2>
              <p>{proceso.alcance}</p>
            </div>
            <span className={`pill ${proceso.estado}`}>{estadoLabel[proceso.estado]}</span>
          </div>

          <div className="proceso-progress">
            <div>
              <strong>{proceso.avance}%</strong>
              <span>avance documental estimado</span>
            </div>
            <div className="progress-bar" aria-label={`Avance ${proceso.avance}%`}>
              <span style={{ width: `${proceso.avance}%` }} />
            </div>
          </div>

          <div className="proceso-facts">
            <article>
              <UserRoundCheck size={18} />
              <span>Responsable</span>
              <strong>{proceso.responsable}</strong>
            </article>
            <article>
              <FileCheck2 size={18} />
              <span>Evidencia esperada</span>
              <strong>{proceso.evidencia}</strong>
            </article>
            <article>
              <AlertTriangle size={18} />
              <span>Riesgo operativo</span>
              <strong>Documentación incompleta o sin socialización vigente</strong>
            </article>
          </div>
        </section>
      </section>

      <section className="table-card">
        <div className="section-heading inline-heading">
          <div>
            <h2>Matriz de control</h2>
            <p>Relación inicial entre proceso, responsable y evidencia.</p>
          </div>
          <span className="tag">Borrador operativo</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Proceso</th>
              <th>Responsable</th>
              <th>Evidencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {procesos.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.nombre}</strong><small>{item.alcance}</small></td>
                <td>{item.responsable}</td>
                <td>{item.evidencia}</td>
                <td><span className={`pill ${item.estado}`}>{estadoLabel[item.estado]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="table-card">
        <div className="section-heading">
          <h2>Socialización</h2>
          <p>Temas mínimos para evidenciar conocimiento del estándar.</p>
        </div>
        <div className="standards-grid socializacion-grid">
          {socializaciones.map((item) => (
            <article className="standard-card" key={item.tema}>
              <div className="standard-card-head">
                <strong>{item.tema}</strong>
                <GraduationCap size={18} />
              </div>
              <span>{item.publico}</span>
              <small>{item.periodicidad}</small>
              <small>{item.evidencia}</small>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
