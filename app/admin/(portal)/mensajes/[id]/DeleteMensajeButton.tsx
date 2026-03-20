"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function DeleteMensajeButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar este mensaje permanentemente?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mensajes/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/mensajes");
        router.refresh();
      } else {
        alert("No se pudo eliminar el mensaje");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-30"
    >
      <Trash2 size={14} />
      {loading ? "Eliminando..." : "Eliminar Mensaje"}
    </button>
  );
}
