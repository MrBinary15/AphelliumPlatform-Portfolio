import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LazyFrostParticles from "@/components/LazyFrostParticles";
import { getServerLanguage } from "@/utils/i18n";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLanguage();
  return (
    <>
      <LazyFrostParticles />
      <a href="#main-content" className="sr-only focus:not-sr-only">
        {lang === "en" ? "Skip to content" : "Saltar al contenido"}
      </a>
      <Navbar />
      <div className="fixed top-16 md:top-24 right-3 sm:right-4 z-[52] md:z-[60]">
        <LanguageSwitcher />
      </div>
      <main id="main-content" className="min-h-screen relative z-[1]" role="main">
        {children}
      </main>
      <Footer />
    </>
  );
}
