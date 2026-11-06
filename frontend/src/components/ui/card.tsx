import * as React from "react";

import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  cutoutTitle?: React.ReactNode;
  cutoutAction?: React.ReactNode;
  cutoutIcon?: React.ReactNode;
  cutoutBgClass?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      cutoutTitle,
      cutoutAction,
      cutoutIcon,
      cutoutBgClass = "bg-card dark:bg-[#1E1E1E]",
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border/80 dark:border-neutral-700/80 bg-card text-card-foreground shadow-xs transition-colors",
        cutoutTitle && "relative pt-5 sm:pt-6",
        className,
      )}
      {...props}
    >
      {cutoutTitle && (
        <div
          className={cn(
            "absolute -top-2.5 sm:-top-3 left-4 px-2 flex items-center gap-1.5 z-10 pointer-events-none select-none",
            cutoutBgClass,
          )}
        >
          {cutoutIcon && (
            <span className="shrink-0 text-muted-foreground flex items-center">
              {cutoutIcon}
            </span>
          )}
          <span className="text-xs sm:text-[13px] font-bold tracking-tight text-foreground">
            {cutoutTitle}
          </span>
        </div>
      )}
      {cutoutAction && (
        <div
          className={cn(
            "absolute -top-2.5 sm:-top-3 right-4 px-1.5 z-10 pointer-events-auto",
            cutoutBgClass,
          )}
        >
          {cutoutAction}
        </div>
      )}
      {children}
    </div>
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
