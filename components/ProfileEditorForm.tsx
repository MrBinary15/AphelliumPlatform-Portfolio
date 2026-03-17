"use client";

import { useEffect, useRef, useState } from "react";
import { Save, Upload, User, Loader2, CheckCircle2, AlertTriangle, Pencil, X, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type ProfileData = {
  full_name?: string | null;
  job_title?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ProfileEditorForm({
  initialProfile,
}: {
  initialProfile: ProfileData;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(initialProfile.full_name || "");
  const [jobTitle, setJobTitle] = useState(initialProfile.job_title || "");
  const [description, setDescription] = useState(initialProfile.description || "");
  const [avatarPreview, setAvatarPreview] = useState(initialProfile.avatar_url || "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = initialProfile.role === "admin";

  const lastSavedRef = useRef({
    full_name: initialProfile.full_name || "",
    job_title: initialProfile.job_title || "",
    description: initialProfile.description || "",
  });
  const firstRenderRef = useRef(true);
  const previewUrlRef = useRef<string | null>(null);
  const lastSuccessToastRef = useRef(0);

  const hasTextChanges =
    fullName !== lastSavedRef.current.full_name ||
    jobTitle !== lastSavedRef.current.job_title ||
    description !== lastSavedRef.current.description;

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    if (!isEditing || !hasTextChanges) return;

    const timer = setTimeout(async () => {
      setSaveState("saving");
      setSaveMessage("Guardando cambios...");

      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            full_name: fullName,
            job_title: jobTitle,
            description,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            showToast("Sesion expirada, vuelve a iniciar sesion.", "error");
            router.push("/admin/login");
            return;
          }
          throw new Error(result?.error || "No se pudo guardar el perfil");
        }

        lastSavedRef.current = {
          full_name: fullName,
          job_title: jobTitle,
          description,
        };
        setSaveState("saved");
        setSaveMessage("Cambios guardados y visibles en Nosotros");
        const now = Date.now();
        if (now - lastSuccessToastRef.current > 6000) {
          showToast("Perfil actualizado automaticamente.", "success");
          lastSuccessToastRef.current = now;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al guardar";
        setSaveState("error");
        setSaveMessage(message);
        showToast(message, "error");
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [description, fullName, hasTextChanges, isEditing, jobTitle]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const onAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setAvatarPreview(previewUrl);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSaveState("saving");
    setSaveMessage("Actualizando perfil...");

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          showToast("Sesion expirada, vuelve a iniciar sesion.", "error");
          router.push("/admin/login");
          return;
        }
        throw new Error(result?.error || "No se pudo actualizar el perfil");
      }

      lastSavedRef.current = {
        full_name: fullName,
        job_title: jobTitle,
        description,
      };
      setSaveState("saved");
      setSaveMessage("Perfil actualizado correctamente");
      setIsEditing(false);
      showToast("Cambios y foto guardados correctamente.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      setSaveState("error");
      setSaveMessage(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="col-span-1 flex flex-col items-center space-y-4">
        <div className="w-40 h-40 rounded-full bg-slate-900 border-2 border-slate-700 overflow-hidden relative group shadow-[0_0_35px_rgba(6,182,212,0.15)]">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="Tu Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <User size={64} />
            </div>
          )}
          {isEditing && (
            <label htmlFor="avatar_file" className="absolute inset-0 bg-black/50 flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex">
              <Upload size={24} className="mb-2" />
              <span className="text-sm font-medium">Cambiar</span>
            </label>
          )}
        </div>

        <input
          type="file"
          id="avatar_file"
          name="avatar_file"
          accept="image/*"
          className="hidden"
          disabled={!isEditing}
          onChange={onAvatarChange}
        />
        <p className="text-xs text-slate-500 text-center">
          Imagen cuadrada recomendada 400x400 px.
        </p>
      </div>

      <div className="col-span-1 md:col-span-2 space-y-4">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 flex items-center gap-2 text-sm">
          {!isEditing && saveState === "idle" && <Lock className="h-4 w-4 text-slate-400" />}
          {saveState === "saving" && <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />}
          {saveState === "saved" && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
          {saveState === "error" && <AlertTriangle className="h-4 w-4 text-rose-300" />}
          <span className="text-slate-200">
            {saveMessage || (isEditing ? "Modo edición activo — realiza tus cambios y guarda." : "Perfil bloqueado. Pulsa Editar para modificar tu información.")}
          </span>
        </div>

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-slate-300 mb-1">
            Nombre Completo
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={!isEditing}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Ej. Juan Perez"
          />
        </div>

        <div>
          <label htmlFor="job_title" className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
            Rol / Cargo en la Empresa
            {!isAdmin && <span className="text-xs text-amber-400/80 font-normal">(Solo administradores)</span>}
          </label>
          <input
            type="text"
            id="job_title"
            name="job_title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={!isEditing || !isAdmin}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Ej. Lider de Operaciones"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">
            Descripcion
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isEditing}
            className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Cuenta brevemente tu experiencia y tu aporte en Aphellium..."
          />
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
          <p className="text-xs uppercase tracking-wider text-emerald-300 mb-3">Vista previa en Nosotros</p>
          <div className="bg-gray-800/60 rounded-xl overflow-hidden border border-cyan-400/10">
            <div className="h-48 bg-gray-900 w-full flex items-center justify-center relative overflow-hidden">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Preview avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl opacity-20">👤</span>
              )}
            </div>
            <div className="p-4 text-left">
              <h4 className="font-bold text-lg text-white">{fullName.trim() || "Tu nombre"}</h4>
              <p className="text-cyan-300 text-sm mb-2 font-medium tracking-wide uppercase">{jobTitle.trim() || "Tu rol"}</p>
              <p className="text-slate-300 text-sm">{description.trim() || "Tu descripcion profesional aparecera aqui."}</p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setFullName(lastSavedRef.current.full_name);
                  setJobTitle(lastSavedRef.current.job_title);
                  setDescription(lastSavedRef.current.description);
                  setIsEditing(false);
                  setSaveState("idle");
                  setSaveMessage("");
                }}
                className="flex items-center gap-2 px-5 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Guardar cambios
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setSaveState("idle");
                setSaveMessage("");
              }}
              className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
            >
              <Pencil className="h-5 w-5" />
              Editar perfil
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
