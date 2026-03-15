"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteNoticia } from "@/app/admin/(portal)/noticias/actions";

export default function DeleteNoticiaButton({ id, title }: { id: string, title?: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault(); // Evitar navegación si está dentro de un Link o contenedor clickeable
    e.stopPropagation();

    if (!window.confirm(`¿Estás seguro de que quieres eliminar la noticia ${title ? `"${title}"` : ''}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteNoticia(id);
    if (result?.error) {
      alert("Error al eliminar la noticia: " + result.error);
      setIsDeleting(false);
    }
    // Si tiene éxito, Next.js hará revalidatePath y actualizará la lista automáticamente
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-all border border-white/10 group-hover:border-red-500/30"
      title="Eliminar Noticia"
    >
      {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    </button>
  );
}
