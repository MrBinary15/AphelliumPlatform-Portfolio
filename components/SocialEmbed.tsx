"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { Link2, Loader2 } from "lucide-react";
import Image from "next/image";

interface SocialEmbedProps {
  url?: string;
  embedHtml?: string;
}

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  platform?: string;
}

function getEmbedIframeSrc(embedHtml?: string): string | null {
  if (!embedHtml) return null;
  const match = embedHtml.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  const src = match?.[1]?.trim();
  if (!src) return null;

  try {
    const parsed = new URL(src);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

const SocialEmbed: React.FC<SocialEmbedProps> = ({ url, embedHtml }) => {
  const { language } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [hasError, setHasError] = useState(false);

  const t = language === "en"
    ? {
        sectionTitle: "Original post",
        sectionDescription: "Preview or embed from the original publication source.",
        embedded: "Embedded post",
        loading: "Loading publication preview...",
        unavailable: "Preview unavailable for this link.",
        source: "Source",
      }
    : {
        sectionTitle: "Publicacion original",
        sectionDescription: "Vista previa o insercion desde la fuente de la publicacion original.",
        embedded: "Publicacion embebida",
        loading: "Cargando vista previa de la publicacion...",
        unavailable: "No se pudo generar vista previa para este enlace.",
        source: "Fuente",
      };

  const iframeSrc = getEmbedIframeSrc(embedHtml);

  useEffect(() => {
    setIsMounted(true);

    async function fetchPreview() {
      if (!url || iframeSrc) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
          setHasError(true);
          return;
        }
        const data = (await response.json()) as LinkPreview;
        setPreview(data);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreview();
  }, [url, iframeSrc]);

  if (!isMounted) return null;
  if (!url && !iframeSrc) return null;

  const platform = preview?.platform || "web";
  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

  return (
    <section className="mt-12 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{t.sectionTitle}</h3>
          <p className="text-sm text-gray-400 mt-1">{t.sectionDescription}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs text-gray-300 bg-white/5">
          <Link2 size={13} />
          {platformLabel}
        </span>
      </div>

      <div className="p-6">
      {iframeSrc && (
        <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 text-sm text-gray-300">
            {t.embedded}
          </div>
          <div className="w-full aspect-video bg-black">
            <iframe
              src={iframeSrc}
              className="w-full h-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              title="social-embed"
            />
          </div>
        </div>
      )}

      {!iframeSrc && isLoading && (
        <div className="min-h-[140px] rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-3 text-gray-300">
          <Loader2 size={24} className="animate-spin text-[var(--accent-cyan)]" />
          <p className="text-sm">{t.loading}</p>
        </div>
      )}

      {!iframeSrc && !isLoading && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          {preview?.image && (
            <div className="relative w-full h-52 md:h-64 bg-black/40">
              <Image
                src={preview.image}
                alt={preview.title || "preview"}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )}

          <div className="p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
              {t.source}: {preview?.siteName || platformLabel}
            </p>

            <h4 className="text-white text-xl font-semibold leading-snug mb-3">
              {preview?.title || t.unavailable}
            </h4>

            {preview?.description && (
              <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 mb-5">
                {preview.description}
              </p>
            )}

            {hasError && (
              <p className="text-red-300 text-sm mb-4">{t.unavailable}</p>
            )}

          </div>
        </div>
      )}
      </div>
    </section>
  );
};

export default SocialEmbed;