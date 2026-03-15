import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import AdminFloatingPanel from "@/components/AdminFloatingPanel";

const outfit = Outfit({ 
  variable: "--font-heading",
  subsets: ["latin"],
});

const inter = Inter({ 
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aphellium Platform",
  description: "Enterprise cooling infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${outfit.variable} antialiased dark bg-[var(--bg-dark)] text-white`}>
        {children}
        <AdminFloatingPanel />
      </body>
    </html>
  );
}
