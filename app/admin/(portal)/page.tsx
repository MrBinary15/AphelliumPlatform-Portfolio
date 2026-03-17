import { redirect } from "next/navigation";

export default function AdminPortalRedirect() {
  redirect("/admin/dashboard");
}
