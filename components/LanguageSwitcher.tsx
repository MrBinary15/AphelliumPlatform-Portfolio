"use client";

import { useLanguage } from "./LanguageContext";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-switcher" aria-label="Selector de idioma">
      <button
        type="button"
        onClick={() => setLanguage("es")}
        className={language === "es" ? "active" : ""}
        aria-pressed={language === "es"}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={language === "en" ? "active" : ""}
        aria-pressed={language === "en"}
      >
        EN
      </button>
    </div>
  );
}