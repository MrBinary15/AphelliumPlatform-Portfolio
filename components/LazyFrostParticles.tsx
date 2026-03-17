"use client";

import dynamic from "next/dynamic";

const FrostParticles = dynamic(() => import("@/components/FrostParticles"), {
  ssr: false,
});

export default function LazyFrostParticles() {
  return <FrostParticles />;
}
