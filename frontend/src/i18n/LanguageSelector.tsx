import React from "react";
import { Check, Globe } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { SUPPORTED_LANGUAGES, type Language } from "./types";

interface LanguageSelectorProps {
  className?: string;
  onSelect?: (lang: Language) => void;
  showTitle?: boolean;
}

export function LanguageSelector({
  className = "",
  onSelect,
  showTitle = false,
}: LanguageSelectorProps) {
  const { language, setLanguage, tCommon } = useLanguage();

  const handleChoose = (code: Language) => {
    setLanguage(code);
    if (onSelect) {
      onSelect(code);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            {tCommon.languages}
          </h3>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200/90 dark:border-white/[0.08] bg-white dark:bg-[#10141d] overflow-hidden divide-y divide-neutral-100 dark:divide-white/[0.06] shadow-xs">
        {SUPPORTED_LANGUAGES.map((item) => {
          const isSelected = language === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => handleChoose(item.code)}
              className={`w-full flex items-center justify-between p-3.5 sm:p-4 text-left transition-colors cursor-pointer group ${
                isSelected
                  ? "bg-neutral-100/80 dark:bg-white/[0.06] text-neutral-900 dark:text-white"
                  : "hover:bg-neutral-50 dark:hover:bg-white/[0.03] text-neutral-700 dark:text-neutral-300"
              }`}
              aria-label={`Select ${item.label} (${item.nativeLabel})`}
              aria-pressed={isSelected}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? "border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white"
                      : "border-neutral-300 dark:border-neutral-700 group-hover:border-neutral-400"
                  }`}
                >
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-black" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-tight">
                      {item.nativeLabel}
                    </span>
                    {item.nativeLabel !== item.label && (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                        ({item.label})
                      </span>
                    )}
                  </div>
                  {item.subLabel && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {item.subLabel}
                    </p>
                  )}
                </div>
              </div>

              {isSelected && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white">
                  <Check className="h-4 w-4 stroke-[2.5]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LanguageSelector;
