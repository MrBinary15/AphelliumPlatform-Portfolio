import { redirect } from "next/navigation";

export default function AdminRootPage() {
  // Redirect /admin → /admin/dashboard
  // The middleware handles auth: unauthenticated users get sent to /admin/login first.
  redirect("/admin/dashboard");
}
