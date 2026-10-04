import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { Language, Translations, CommonTranslations, PayerntTranslations, PayrentTranslations } from "./types";
import { en } from "./en";
import { te } from "./te";
import { hi } from "./hi";

const TRANSLATION_MAP: Record<Language, Translations> = {
  en,
  te,
  hi,
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  tCommon: CommonTranslations;
  tPayernt: PayerntTranslations;
  tPayrent: PayrentTranslations;
  isLanguageModalOpen: boolean;
  openLanguageModal: () => void;
  closeLanguageModal: () => void;
  scope: "payernt" | "payrent" | "global";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getStorageKey(scope: "payernt" | "payrent" | "global") {
  if (scope === "payernt") return "payent_payernt_lang";
  if (scope === "payrent") return "payent_payrent_lang";
  return "payent_lang";
}

function getInitialLanguage(scope: "payernt" | "payrent" | "global"): Language {
  if (typeof window === "undefined") return "en";
  try {
    const key = getStorageKey(scope);
    const saved = localStorage.getItem(key);
    if (saved === "en" || saved === "te" || saved === "hi") {
      return saved;
    }
    const globalSaved = localStorage.getItem("payent_lang");
    if (globalSaved === "en" || globalSaved === "te" || globalSaved === "hi") {
      return globalSaved;
    }
  } catch (e) {
    console.error("Failed to read language from localStorage", e);
  }
  return "en";
}

export interface LanguageProviderProps {
  children: React.ReactNode;
  scope?: "payernt" | "payrent" | "global";
}

export function LanguageProvider({ children, scope = "global" }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage(scope));
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  // Sync state if localStorage changes or other tabs/windows change it
  useEffect(() => {
    const key = getStorageKey(scope);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === "payent_lang") {
        if (e.newValue === "en" || e.newValue === "te" || e.newValue === "hi") {
          setLanguageState(e.newValue);
        }
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ language: Language; scope?: string }>;
      if (customEvent.detail) {
        if (!customEvent.detail.scope || customEvent.detail.scope === scope || customEvent.detail.scope === "global") {
          setLanguageState(customEvent.detail.language);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("payent:language_change", handleCustomChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("payent:language_change", handleCustomChange);
    };
  }, [scope]);

  const setLanguage = useCallback((newLang: Language) => {
    if (newLang !== "en" && newLang !== "te" && newLang !== "hi") return;
    setLanguageState(newLang);
    try {
      const key = getStorageKey(scope);
      localStorage.setItem(key, newLang);
      localStorage.setItem("payent_lang", newLang);
      window.dispatchEvent(
        new CustomEvent("payent:language_change", {
          detail: { language: newLang, scope },
        })
      );
    } catch (e) {
      console.error("Failed to save language to localStorage", e);
    }
  }, [scope]);

  const openLanguageModal = useCallback(() => setIsLanguageModalOpen(true), []);
  const closeLanguageModal = useCallback(() => setIsLanguageModalOpen(false), []);

  const activeTranslations = useMemo(() => {
    return TRANSLATION_MAP[language] || TRANSLATION_MAP.en;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      t: activeTranslations,
      tCommon: activeTranslations.common,
      tPayernt: activeTranslations.payernt,
      tPayrent: activeTranslations.payrent,
      isLanguageModalOpen,
      openLanguageModal,
      closeLanguageModal,
      scope,
    };
  }, [language, setLanguage, activeTranslations, isLanguageModalOpen, openLanguageModal, closeLanguageModal, scope]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return fallback context if used outside provider
    return {
      language: "en",
      setLanguage: () => {},
      t: TRANSLATION_MAP.en,
      tCommon: TRANSLATION_MAP.en.common,
      tPayernt: TRANSLATION_MAP.en.payernt,
      tPayrent: TRANSLATION_MAP.en.payrent,
      isLanguageModalOpen: false,
      openLanguageModal: () => {},
      closeLanguageModal: () => {},
      scope: "global",
    };
  }
  return context;
}
