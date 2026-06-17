import React from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./ui/AppLayout";
import { AccesosPage } from "./pages/AccesosPage";
import { CapacitacionesProfesionalPage } from "./pages/CapacitacionesProfesionalPage";
import { EntregasRecursosPage } from "./pages/EntregasRecursosPage";
import { EstandarPendientePage } from "./pages/EstandarPendientePage";
import { InfraestructuraPage } from "./pages/InfraestructuraPage";
import { LoginPage } from "./pages/LoginPage";
import { PortalProfesionalPage } from "./pages/PortalProfesionalPage";
import { RecursosAsistencialesPage } from "./pages/RecursosAsistencialesPage";
import { ServicioDetallePage } from "./pages/ServicioDetallePage";
import { ServiciosPage } from "./pages/ServiciosPage";
import { TalentoHumanoPage } from "./pages/TalentoHumanoPage";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/entregas-recursos", element: <EntregasRecursosPage /> },
  { path: "/portal-profesional", element: <PortalProfesionalPage /> },
  { path: "/portal-profesional/capacitaciones", element: <CapacitacionesProfesionalPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/servicios" replace /> },
      { path: "servicios", element: <ServiciosPage /> },
      { path: "servicios/:codigo", element: <ServicioDetallePage /> },
      { path: "talento-humano", element: <TalentoHumanoPage /> },
      { path: "infraestructura", element: <InfraestructuraPage /> },
      { path: "recursos-asistenciales", element: <RecursosAsistencialesPage /> },
      {
        path: "procesos-prioritarios",
        element: (
          <EstandarPendientePage
            title="Procesos Prioritarios"
            description="Protocolos, procedimientos, guías, responsables, socialización y evidencias del servicio."
          />
        ),
      },
      {
        path: "historia-clinica-registros",
        element: (
          <EstandarPendientePage
            title="Historia clínica y registros"
            description="Formatos, ingreso, evolución, plan de cuidado, egreso, referencia, contrarreferencia, auditoría y trazabilidad."
          />
        ),
      },
      {
        path: "gestion-documental",
        element: (
          <EstandarPendientePage
            title="Gestión Documental"
            description="Soportes, versiones, vencimientos, responsables y evidencia documental del servicio."
          />
        ),
      },
      { path: "accesos", element: <AccesosPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
