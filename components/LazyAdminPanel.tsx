"use client";

import { useEffect, useState } from "react";

export default function LazyAdminPanel() {
  const [Panel, setPanel] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import("@/components/AdminFloatingPanel").then((mod) => {
      setPanel(() => mod.default);
    });
  }, []);

  if (!Panel) return null;
  return <Panel />;
}
