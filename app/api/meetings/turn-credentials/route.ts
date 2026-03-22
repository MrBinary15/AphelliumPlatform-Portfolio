import { NextResponse } from "next/server";

/**
 * Fetches temporary TURN credentials from Metered.ca.
 * The secret key is kept server-side to avoid exposure.
 */
export async function GET() {
  const domain = process.env.METERED_DOMAIN;
  const apiKey = process.env.METERED_SECRET_KEY;

  if (!domain || !apiKey) {
    return NextResponse.json(
      { error: "Metered no está configurado" },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(
      `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`,
      { next: { revalidate: 3600 } }, // cache 1 hour
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "No se pudieron obtener credenciales TURN" },
        { status: 502 },
      );
    }

    const iceServers = await res.json();
    return NextResponse.json({ iceServers });
  } catch {
    return NextResponse.json(
      { error: "Error al contactar Metered" },
      { status: 502 },
    );
  }
}
