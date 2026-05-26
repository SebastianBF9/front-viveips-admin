export function Loading({ text = "Cargando..." }: { text?: string }) {
  return <div className="empty-state">{text}</div>;
}
