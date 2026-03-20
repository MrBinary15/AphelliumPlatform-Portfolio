import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/utils/rateLimit";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const isPrivateIpv4 = (host: string) => {
  const parts = host.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return false;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
};

export async function GET(request: Request) {
  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIp(request.headers);
    const rl = rateLimit(`fetch-img:${ip}`, { limit: 30, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return NextResponse.json({ error: "Falta parametro url." }, { status: 400 });
    }

    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "URL invalida." }, { status: 400 });
    }

    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return NextResponse.json({ error: "Solo se permite http/https." }, { status: 400 });
    }

    const host = target.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host) || isPrivateIpv4(host)) {
      return NextResponse.json({ error: "Host bloqueado." }, { status: 403 });
    }

    const remoteResponse = await fetch(target.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        Referer: `${target.protocol}//${target.host}/`,
        Origin: `${target.protocol}//${target.host}`,
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!remoteResponse.ok) {
      return NextResponse.json({ error: "No se pudo descargar la imagen." }, { status: 422 });
    }

    const contentType = remoteResponse.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json({ error: "El recurso no es una imagen." }, { status: 415 });
    }

    const bytes = await remoteResponse.arrayBuffer();
    if (!bytes.byteLength) {
      return NextResponse.json({ error: "Imagen vacia." }, { status: 422 });
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error inesperado al obtener imagen remota." }, { status: 500 });
  }
}
