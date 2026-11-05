import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightAdornment?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, containerClassName, label, error, icon, rightAdornment, id, required, ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : undefined);

  return (
    <div className={cn("w-full relative", label && "pt-1.5", containerClassName)}>
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-xl border bg-card dark:bg-[#1E1E1E] px-3 sm:px-3.5 h-10.5 sm:h-11 transition-colors",
          "border-neutral-400/80 dark:border-neutral-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40",
          error && "border-destructive focus-within:border-destructive focus-within:ring-destructive/30",
        )}
      >
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "absolute -top-2.5 left-3.5 px-1.5 bg-card dark:bg-[#1E1E1E] text-[11px] font-semibold tracking-tight transition-colors pointer-events-none select-none z-10",
              error
                ? "text-destructive"
                : "text-muted-foreground group-focus-within:text-primary",
            )}
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}

        {icon && (
          <span className="text-muted-foreground shrink-0 flex items-center justify-center">
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          required={required}
          className={cn(
            "flex-1 min-w-0 w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground text-foreground",
            className,
          )}
          {...rest}
        />

        {rightAdornment && (
          <span className="shrink-0 flex items-center justify-center text-muted-foreground">
            {rightAdornment}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
});
