import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import LazyAdminPanel from "@/components/LazyAdminPanel";
import InlineTextOverrides from "@/components/InlineTextOverrides";
import ChatWidget from "@/components/ChatWidget";
import PWAManager from "@/components/PWAManager";
import { LanguageProvider } from "@/components/LanguageContext";
import { ToastProvider } from "@/components/ToastProvider";
import { getServerLanguage } from "@/utils/i18n";
import { getAuthUser } from "@/utils/auth";
import { isAdmin as checkIsAdmin } from "@/utils/roles";

const outfit = Outfit({ 
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({ 
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aphellium | Sustainable Cooling Technology",
    template: "%s | Aphellium",
  },
  description: "Advanced passive hybrid eco-cooler integrating nanotechnology, AI, and blockchain for sustainable floriculture logistics.",
  metadataBase: new URL("https://aphellium.com"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aphellium",
  },
  icons: {
    apple: "/assets/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_EC",
    siteName: "Aphellium",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06b6d4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getServerLanguage();
  const auth = await getAuthUser();
  const showAdminPanel = !!auth && checkIsAdmin(auth.role);
  const chatUserName = auth?.user.email?.split("@")[0] || "Invitado";

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} antialiased dark bg-[var(--bg-dark)] text-white`} suppressHydrationWarning>
        <LanguageProvider initialLanguage={lang}>
          <ToastProvider>
            <Suspense fallback={null}>
              <InlineTextOverrides />
            </Suspense>
            {children}
            {showAdminPanel ? (
              <Suspense fallback={null}>
                <LazyAdminPanel />
              </Suspense>
            ) : null}
            <Suspense fallback={null}>
              <ChatWidget userId={auth?.user.id || null} userName={chatUserName} userRole={auth?.role || null} />
            </Suspense>
            <Suspense fallback={null}>
              <PWAManager userId={auth?.user.id || null} />
            </Suspense>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
