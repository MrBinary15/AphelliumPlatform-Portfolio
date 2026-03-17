"use client";

import { useState, useRef } from "react";
import { submitContactMessage } from "@/app/(main)/contacto/actions";
import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export default function ContactForm() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const t = language === "en"
    ? {
        title: "Send us a message",
        success: "Thank you! Your message has been sent successfully. We will contact you soon.",
        fullName: "Full name *",
        company: "Company",
        email: "Email *",
        topic: "Topic",
        message: "Message *",
        fullNamePh: "e.g. John Doe",
        companyPh: "e.g. AgroExport Inc.",
        emailPh: "your.email@company.com",
        topicPlaceholder: "Select an area of interest...",
        sales: "Commercial inquiry",
        tech: "Technical support",
        partnership: "Strategic partnership",
        other: "Other",
        messagePh: "How can we help you?",
        sending: "Sending...",
        submit: "Send Message",
        privacy: "By submitting this form, you agree to our privacy policy.",
      }
    : {
        title: "Envíanos un mensaje",
        success: "¡Gracias! Tu mensaje ha sido enviado correctamente. Nos pondremos en contacto pronto.",
        fullName: "Nombre completo *",
        company: "Empresa",
        email: "Correo electrónico *",
        topic: "Asunto",
        message: "Mensaje *",
        fullNamePh: "Ej. Juan Pérez",
        companyPh: "Ej. AgroExport S.A.",
        emailPh: "tucorreo@empresa.com",
        topicPlaceholder: "Selecciona un área de interés...",
        sales: "Consulta Comercial",
        tech: "Soporte Técnico",
        partnership: "Alianzas Estratégicas",
        other: "Otro",
        messagePh: "¿En qué podemos ayudarte?",
        sending: "Enviando...",
        submit: "Enviar Mensaje",
        privacy: "Al enviar este formulario, aceptas nuestra política de privacidad.",
      };

  async function handleSubmit(formData: FormData) {
    // Honeypot check — bots fill hidden fields
    if (formData.get("website")) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    
    const result = await submitContactMessage(formData);
    
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      // Reset form fields
      if (formRef.current) formRef.current.reset();
    }
  }

  return (
    <div className="bg-glass p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-white/10 relative overflow-hidden">
       <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--accent-cyan)]/10 to-transparent blur-[60px] -z-10 pointer-events-none"></div>
      <h3 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6 flex items-center gap-3">
        <MessageSquare className="text-[var(--accent-green)]" />
        {t.title}
      </h3>
      
      <form ref={formRef} action={handleSubmit} className="space-y-6">
        {/* Honeypot — hidden from real users, bots fill it */}
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm">
            {t.success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">{t.fullName}</label>
            <input 
              type="text" 
              id="name" 
              name="name"
              required
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
              placeholder={t.fullNamePh}
            />
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-400 mb-2">{t.company}</label>
            <input 
              type="text" 
              id="company" 
              name="company"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
              placeholder={t.companyPh}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">{t.email}</label>
          <input 
            type="email" 
            id="email" 
            name="email"
            required
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
            placeholder={t.emailPh}
          />
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-400 mb-2">{t.topic}</label>
          <select 
            id="topic" 
            name="topic"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all appearance-none"
          >
            <option value="" className="bg-gray-900 text-gray-400">{t.topicPlaceholder}</option>
            <option value="sales" className="bg-gray-900">{t.sales}</option>
            <option value="tech" className="bg-gray-900">{t.tech}</option>
            <option value="partnership" className="bg-gray-900">{t.partnership}</option>
            <option value="other" className="bg-gray-900">{t.other}</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-2">{t.message}</label>
          <textarea 
            id="message" 
            name="message"
            required
            rows={4}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all resize-none"
            placeholder={t.messagePh}
          ></textarea>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] text-black font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(0,186,224,0.3)] hover:shadow-[0_0_30px_rgba(0,186,224,0.5)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.sending : t.submit}
          </button>
          <p className="text-center text-xs text-gray-500 mt-4">
            {t.privacy}
          </p>
        </div>
      </form>
    </div>
  );
}
