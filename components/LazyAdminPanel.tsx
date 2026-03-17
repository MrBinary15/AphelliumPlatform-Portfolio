"use client";

import dynamic from "next/dynamic";

const AdminFloatingPanel = dynamic(
  () => import("@/components/AdminFloatingPanel"),
  { ssr: false }
);

export default function LazyAdminPanel() {
  return <AdminFloatingPanel />;
}
