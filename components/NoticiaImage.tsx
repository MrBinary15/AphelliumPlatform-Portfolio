"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

interface NoticiaImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

export default function NoticiaImage({ src, alt, className = "" }: NoticiaImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="absolute inset-0 opacity-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
        <ImageIcon size={64} className="text-white" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${className}`}
    />
  );
}
