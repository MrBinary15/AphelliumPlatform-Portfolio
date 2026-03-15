"use client";

import { useState } from "react";
import { submitContactMessage } from "@/app/(main)/contacto/actions";
import { MessageSquare } from "lucide-react";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    const result = await submitContactMessage(formData);
    
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  return (
    <div className="bg-glass p-8 md:p-10 rounded-3xl border border-white/10 relative overflow-hidden">
       <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--accent-cyan)]/10 to-transparent blur-[60px] -z-10 pointer-events-none"></div>
      <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <MessageSquare className="text-[var(--accent-green)]" />
        Envíanos un mensaje
      </h3>
      
      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm">
            ¡Gracias! Tu mensaje ha sido enviado correctamente. Nos pondremos en contacto pronto.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Nombre completo *</label>
            <input 
              type="text" 
              id="name" 
              name="name"
              required
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-400 mb-2">Empresa</label>
            <input 
              type="text" 
              id="company" 
              name="company"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
              placeholder="Ej. AgroExport S.A."
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Correo electrónico *</label>
          <input 
            type="email" 
            id="email" 
            name="email"
            required
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
            placeholder="tucorreo@empresa.com"
          />
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-400 mb-2">Asunto</label>
          <select 
            id="topic" 
            name="topic"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all appearance-none"
          >
            <option value="" className="bg-gray-900 text-gray-400">Selecciona un área de interés...</option>
            <option value="sales" className="bg-gray-900">Consulta Comercial</option>
            <option value="tech" className="bg-gray-900">Soporte Técnico</option>
            <option value="partnership" className="bg-gray-900">Alianzas Estratégicas</option>
            <option value="other" className="bg-gray-900">Otro</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-2">Mensaje *</label>
          <textarea 
            id="message" 
            name="message"
            required
            rows={4}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all resize-none"
            placeholder="¿En qué podemos ayudarte?"
          ></textarea>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] text-black font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(0,186,224,0.3)] hover:shadow-[0_0_30px_rgba(0,186,224,0.5)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enviando..." : "Enviar Mensaje"}
          </button>
          <p className="text-center text-xs text-gray-500 mt-4">
            Al enviar este formulario, aceptas nuestra política de privacidad.
          </p>
        </div>
      </form>
    </div>
  );
}
