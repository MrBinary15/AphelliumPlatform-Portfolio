import { redirect } from "next/navigation";

export default function LegacyNoticiaRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/noticias-principal/${params.id}`);
}