import React from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./ui/AppLayout";
import { AccesosPage } from "./pages/AccesosPage";
import { CapacitacionesProfesionalPage } from "./pages/CapacitacionesProfesionalPage";
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
      { path: "accesos", element: <AccesosPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
