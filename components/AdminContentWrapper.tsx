"use client";
import { usePathname } from "next/navigation";

export function AdminContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname}>{children}</div>;
}
