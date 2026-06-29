import React from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./ui/AppLayout";
import { AccesosPage } from "./pages/AccesosPage";
import { CapacitacionesProfesionalPage } from "./pages/CapacitacionesProfesionalPage";
import { EntregasRecursosPage } from "./pages/EntregasRecursosPage";
import { EquipoQrPage } from "./pages/EquipoQrPage";
import { EstandarPendientePage } from "./pages/EstandarPendientePage";
import { GestionDocumentalPage } from "./pages/GestionDocumentalPage";
import { InfraestructuraPage } from "./pages/InfraestructuraPage";
import { LoginPage } from "./pages/LoginPage";
import { PortalProfesionalPage } from "./pages/PortalProfesionalPage";
import { ProcesosPrioritariosPage } from "./pages/ProcesosPrioritariosPage";
import { RecursosAsistencialesPage } from "./pages/RecursosAsistencialesPage";
import { ServicioDetallePage } from "./pages/ServicioDetallePage";
import { ServiciosPage } from "./pages/ServiciosPage";
import { TalentoHumanoPage } from "./pages/TalentoHumanoPage";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/equipos/qr", element: <EquipoQrPage /> },
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
      { path: "procesos-prioritarios", element: <ProcesosPrioritariosPage /> },
      {
        path: "historia-clinica-registros",
        element: (
          <EstandarPendientePage
            title="Historia clínica y registros"
            description="Formatos, ingreso, evolución, plan de cuidado, egreso, referencia, contrarreferencia, auditoría y trazabilidad."
          />
        ),
      },
      { path: "gestion-documental", element: <GestionDocumentalPage /> },
      { path: "accesos", element: <AccesosPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
