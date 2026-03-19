import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import LazyAdminPanel from "@/components/LazyAdminPanel";
import InlineTextOverrides from "@/components/InlineTextOverrides";
import ChatWidget from "@/components/ChatWidget";
import { LanguageProvider } from "@/components/LanguageContext";
import { ToastProvider } from "@/components/ToastProvider";
import { getServerLanguage } from "@/utils/i18n";
import { getAuthUser } from "@/utils/auth";
import { isAdmin as checkIsAdmin } from "@/utils/roles";

const outfit = Outfit({ 
  variable: "--font-heading",
  subsets: ["latin"],
});

const inter = Inter({ 
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Aphellium | Sustainable Cooling Technology",
    template: "%s | Aphellium",
  },
  description: "Advanced passive hybrid eco-cooler integrating nanotechnology, AI, and blockchain for sustainable floriculture logistics.",
  metadataBase: new URL("https://aphellium.com"),
  openGraph: {
    type: "website",
    locale: "es_EC",
    siteName: "Aphellium",
  },
  robots: { index: true, follow: true },
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
            <InlineTextOverrides />
            {children}
            {showAdminPanel ? <LazyAdminPanel /> : null}
            <ChatWidget userId={auth?.user.id || null} userName={chatUserName} userRole={auth?.role || null} />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
