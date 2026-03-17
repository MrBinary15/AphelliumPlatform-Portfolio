import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="relative">
        <h1 className="text-[120px] sm:text-[180px] font-black text-white/5 leading-none select-none">404</h1>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl sm:text-5xl font-extrabold mb-4 text-white">Página no encontrada</p>
          <p className="text-gray-400 text-lg mb-8 max-w-md">
            La página que buscas no existe o ha sido movida.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[var(--accent-cyan)] text-black font-semibold px-6 py-3 rounded-xl hover:bg-[var(--accent-cyan)]/90 transition-colors"
            >
              <Home size={18} />
              Ir al inicio
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={18} />
              Contacto
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
