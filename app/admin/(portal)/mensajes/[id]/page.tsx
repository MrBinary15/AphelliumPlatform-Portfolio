import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, User, Building, Mail, Tag } from "lucide-react";

export default async function MensajeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Obtener el mensaje y marcarlo como leído si estaba no leído
  const { data: mensaje } = await supabase
    .from("mensajes")
    .select("*")
    .eq("id", id)
    .single();

  if (!mensaje) {
    notFound();
  }

  // Marcar como leído
  if (mensaje.status === "unread") {
    const { error } = await supabase
      .from("mensajes")
      .update({ status: "read" })
      .eq("id", id);
      
    if (!error) {
      mensaje.status = "read";
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-4">
        <Link 
          href="/admin/mensajes" 
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Detalle del Mensaje</h1>
          <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
            <Clock size={14} /> Recibido el {new Date(mensaje.created_at).toLocaleString('es-ES', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'
            })}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Remitente Detalles */}
        <div className="col-span-1 space-y-6">
          <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-white/5 pb-2 text-[var(--accent-cyan)]">Información de Contacto</h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-2">
                  <User size={14} /> Nombre
                </span>
                <p className="font-medium">{mensaje.name}</p>
              </div>
              
              {mensaje.company && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-2">
                    <Building size={14} /> Empresa
                  </span>
                  <p className="font-medium text-gray-300">{mensaje.company}</p>
                </div>
              )}
              
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-2">
                  <Mail size={14} /> Correo Electrónico
                </span>
                <p className="font-medium text-gray-300 break-all">{mensaje.email}</p>
                <a 
                  href={`mailto:${mensaje.email}`} 
                  className="inline-block mt-2 text-xs font-semibold px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
                >
                  Responder Correo
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje Contenido */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-glass border border-white/10 rounded-2xl p-8 relative overflow-hidden">
            {/* Background design */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-cyan)]/5 rounded-full blur-[50px] pointer-events-none"></div>
            
            <div className="mb-6 pb-6 border-b border-white/5">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                <Tag size={14} /> Asunto / Tema
              </span>
              <h2 className="text-xl font-bold">{mensaje.topic || "Sin Asunto Específico"}</h2>
            </div>
            
            <div className="prose prose-invert prose-p:text-gray-300 max-w-none">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                Mensaje Original
              </span>
              <div className="whitespace-pre-wrap leading-relaxed text-[15px] p-6 bg-black/30 rounded-xl border border-white/5 font-medium">
                {mensaje.message}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
