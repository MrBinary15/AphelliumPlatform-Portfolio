"use client";

import { useEffect, useState } from "react";

export default function LazyFrostParticles() {
  const [FrostParticles, setFP] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import("@/components/FrostParticles").then((mod) => {
      setFP(() => mod.default);
    });
  }, []);

  if (!FrostParticles) return null;
  return <FrostParticles />;
}
