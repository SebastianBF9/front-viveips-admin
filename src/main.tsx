import React from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./ui/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { ServicioDetallePage } from "./pages/ServicioDetallePage";
import { ServiciosPage } from "./pages/ServiciosPage";
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
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
