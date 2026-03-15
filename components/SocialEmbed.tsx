import React, { useEffect, useState } from "react";

interface SocialEmbedProps {
  url: string;
}

const SocialEmbed: React.FC<SocialEmbedProps> = ({ url }) => {
  const [postId, setPostId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);

    // Función para extraer el ID de LinkedIn
    const extractLinkedInId = (url: string): string | null => {
      const match = url.match(/(?:ugcPost:|\/posts\/|\/video\/|activity:|share:)([0-9]+)/);
      return match ? match[1] : null;
    };

    const id = extractLinkedInId(url);
    setPostId(id);
  }, [url]);

  if (!isMounted) return null;

  if (!postId) {
    return (
      <div className="bg-slate-900 text-white p-4 rounded-xl text-center">
        <p className="text-red-500">URL de LinkedIn no válida.</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Ver en LinkedIn
        </a>
      </div>
    );
  }

  const embedUrl = `https://www.linkedin.com/embed/feed/update/urn:li:share:${postId}`;

  return (
    <div className="aspect-video bg-slate-900 rounded-xl border border-white/10 overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <iframe
        src={embedUrl}
        title="Publicación de LinkedIn"
        frameBorder="0"
        allowFullScreen
        className="w-full h-full"
        onLoad={() => setIsLoading(false)}
      ></iframe>
    </div>
  );
};

export default SocialEmbed;