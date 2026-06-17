interface EstandarPendientePageProps {
  title: string;
  description: string;
}

export function EstandarPendientePage({ title, description }: EstandarPendientePageProps) {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Habilitación</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>

      <section className="table-card">
        <div className="section-heading">
          <h2>Módulo en construcción</h2>
          <p>Esta sección queda disponible en el menú para continuar su desarrollo operativo.</p>
        </div>
        <div className="empty-state">Pendiente de configuración.</div>
      </section>
    </section>
  );
}
