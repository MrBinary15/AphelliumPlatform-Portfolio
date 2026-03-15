"use client";

import { useEffect, useState } from "react";
import SocialEmbed from "@/components/SocialEmbed";

interface Noticia {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

export default function NoticiaPage({ params }: { params: { id: string } }) {
  const [linkPreview, setLinkPreview] = useState<Noticia | null>(null);

  useEffect(() => {
    const fetchLinkPreview = async () => {
      const url = "https://www.linkedin.com/feed/update/urn:li:activity:7434324198684504064/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAFU5QJmkBYz3jvF8r919o8hAPNdDbD"; // Replace with dynamic link
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        setLinkPreview(data);
      } catch (error) {
        console.error("Error fetching link preview:", error);
      }
    };

    fetchLinkPreview();
  }, []);

  return (
    <div className="noticia-page">
      <h1>Aphellium Gano Emprende Imbabura</h1>
      <p>14 de marzo de 2026</p>
      <p>Equipo Editorial</p>

      <div className="link-section">
        <p>afelim</p>
        <a href="https://www.linkedin.com/feed/update/urn:li:activity:7434324198684504064/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAFU5QJmkBYz3jvF8r919o8hAPNdDbD" target="_blank" rel="noopener noreferrer">
          https://www.linkedin.com/feed/update/urn:li:activity:7434324198684504064/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAFU5QJmkBYz3jvF8r919o8hAPNdDbD
        </a>
        {linkPreview && (
          <div className="preview-container">
            <h4>{linkPreview.title}</h4>
            <p>{linkPreview.description}</p>
            {linkPreview.image && <img src={linkPreview.image} alt="Vista previa" />}
          </div>
        )}
      </div>

      {/* Renderizar el enlace de red social si existe */}
      {linkPreview?.link && (
        <SocialEmbed url={linkPreview.link} />
      )}

      {/* Enlace al post de LinkedIn */}
      <div className="mt-4">
        <a 
          href="https://www.linkedin.com/posts/jefferson-conza-46779b59_sala2026-inteligenciaartificial-ai-activity-7438693249550229506-Vu5j?utm_source=share&utm_medium=member_desktop" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-500 underline hover:text-blue-700"
        >
          Ver publicación en LinkedIn
        </a>
      </div>
    </div>
  );
}