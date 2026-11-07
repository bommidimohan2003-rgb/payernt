import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightAdornment?: ReactNode;
  containerClassName?: string;
  inputWrapperClassName?: string;
  cutoutBgClass?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    containerClassName,
    inputWrapperClassName,
    cutoutBgClass,
    label,
    error,
    icon,
    rightAdornment,
    id,
    required,
    ...rest
  },
  ref,
) {
  const inputId = id ?? rest.name ?? (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : undefined);
  const bgCutout = cutoutBgClass || "bg-card dark:bg-[#1E1E1E]";

  return (
    <div className={cn("w-full relative", label && "pt-2", containerClassName)}>
      <div
        className={cn(
          "group relative flex items-center gap-3 rounded-[20px] border px-4.5 sm:px-5 h-12 sm:h-13 transition-all",
          bgCutout,
          "border-neutral-300 dark:border-neutral-700/90 focus-within:border-foreground/80 dark:focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-foreground/20 dark:focus-within:ring-white/20",
          error && "border-destructive focus-within:border-destructive focus-within:ring-destructive/30",
          inputWrapperClassName,
        )}
      >
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "absolute -top-2.5 left-5 sm:left-6 px-2 text-xs font-medium tracking-tight transition-colors pointer-events-none select-none z-10",
              bgCutout,
              error
                ? "text-destructive font-semibold"
                : "text-muted-foreground/90 dark:text-[#BDBDBD] group-focus-within:text-foreground dark:group-focus-within:text-white font-medium",
            )}
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}

        {icon && (
          <span className="text-muted-foreground/80 dark:text-[#BDBDBD] shrink-0 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 transition-colors group-focus-within:text-foreground dark:group-focus-within:text-white">
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          required={required}
          className={cn(
            "flex-1 min-w-0 w-full bg-transparent outline-none text-sm sm:text-base placeholder:text-muted-foreground/60 dark:placeholder:text-neutral-500 text-foreground dark:text-white [color-scheme:light] dark:[color-scheme:dark]",
            className,
          )}
          {...rest}
        />

        {rightAdornment && (
          <span className="shrink-0 flex items-center justify-center text-muted-foreground/80 dark:text-[#BDBDBD] [&>svg]:w-5 [&>svg]:h-5 transition-colors group-focus-within:text-foreground dark:group-focus-within:text-white">
            {rightAdornment}
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 ml-5 text-xs text-destructive">{error}</p>}
    </div>
  );
});
