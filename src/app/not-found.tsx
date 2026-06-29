import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto text-center py-24">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <h1 className="font-display text-xl font-semibold text-text-primary mt-4">Página no encontrada</h1>
      <p className="text-sm text-text-secondary mt-2">La ruta que buscas no existe o fue movida.</p>
      <Link href="/dashboard" className="btn btn-primary inline-flex mt-6 px-4 py-2.5 text-sm">
        Volver al inicio
      </Link>
    </div>
  );
}
