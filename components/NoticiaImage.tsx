"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";

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
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      onError={() => setError(true)}
      className={`object-cover group-hover:scale-105 transition-transform duration-500 ${className}`}
      unoptimized
    />
  );
}
