const translations: Record<string, Record<string, string>> = {
  es: {
    greeting: "Hola",
    welcome: "Bienvenido a nuestra página web",
  },
  en: {
    greeting: "Hello",
    welcome: "Welcome to our website",
  },
};

export const translate = (key: string, language: string): string => {
  return translations[language]?.[key] || key;
};