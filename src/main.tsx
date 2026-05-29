import React from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./ui/AppLayout";
import { AccesosPage } from "./pages/AccesosPage";
import { LoginPage } from "./pages/LoginPage";
import { ServicioDetallePage } from "./pages/ServicioDetallePage";
import { ServiciosPage } from "./pages/ServiciosPage";
import { TalentoHumanoPage } from "./pages/TalentoHumanoPage";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/servicios" replace /> },
      { path: "servicios", element: <ServiciosPage /> },
      { path: "servicios/:codigo", element: <ServicioDetallePage /> },
      { path: "talento-humano", element: <TalentoHumanoPage /> },
      { path: "accesos", element: <AccesosPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
