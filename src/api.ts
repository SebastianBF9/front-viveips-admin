import type {
  CumplimientoServicio,
  ProfesionalServicioPayload,
  RelacionPayload,
  ServicioDetalle,
  ServicioIps,
  TalentoHumanoServicio,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL || "https://api-pruebas.viveips.com.co";
const TOKEN_KEY = "viveips_token";
const ROL_KEY = "viveips_rol";
const CEDULA_KEY = "viveips_cedula";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROL_KEY);
  sessionStorage.removeItem(CEDULA_KEY);
}

export async function apiCall<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) clearSession();
    const detail = typeof data?.detail === "string" ? data.detail : data?.message;
    throw new Error(detail || "No fue posible completar la solicitud");
  }

  return data as T;
}

export async function login(usuario: string, password: string) {
  const data = await apiCall<{
    access_token: string;
    rol: string;
    cedula: string;
  }>("POST", "/auth/login", { usuario, password });

  sessionStorage.setItem(TOKEN_KEY, data.access_token);
  sessionStorage.setItem(ROL_KEY, data.rol);
  sessionStorage.setItem(CEDULA_KEY, data.cedula);
  return data;
}

export async function verificarSesion() {
  return apiCall<{ success: boolean; rol: string; cedula: string }>("GET", "/auth/verificar");
}

export async function listarServiciosIps() {
  return apiCall<{ success: boolean; servicios: ServicioIps[]; total: number }>("GET", "/servicios-ips");
}

export async function obtenerDetalleServicio(codigo: string) {
  return apiCall<ServicioDetalle>("GET", `/servicios-ips/${encodeURIComponent(codigo)}/detalle`);
}

export async function obtenerCumplimientoServicio(codigo: string) {
  return apiCall<CumplimientoServicio>("GET", `/servicios-ips/${encodeURIComponent(codigo)}/cumplimiento`);
}

export async function obtenerTalentoHumanoServicio(codigo: string) {
  return apiCall<TalentoHumanoServicio>("GET", `/servicios-ips/${encodeURIComponent(codigo)}/profesionales`);
}

export async function crearRelacion(codigo: string, payload: RelacionPayload) {
  return apiCall("POST", `/servicios-ips/${encodeURIComponent(codigo)}/relaciones`, payload);
}

export async function actualizarRelacion(id: number, payload: RelacionPayload) {
  return apiCall("PUT", `/servicios-relaciones/${id}`, payload);
}

export async function eliminarRelacion(id: number) {
  return apiCall("DELETE", `/servicios-relaciones/${id}`);
}

export async function asignarProfesionalServicio(codigo: string, payload: ProfesionalServicioPayload) {
  return apiCall("POST", `/servicios-ips/${encodeURIComponent(codigo)}/profesionales`, payload);
}

export async function quitarProfesionalServicio(id: number) {
  return apiCall("DELETE", `/servicios-profesionales/${id}`);
}
