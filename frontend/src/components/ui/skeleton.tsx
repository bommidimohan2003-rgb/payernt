import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-neutral-200/80 dark:bg-neutral-800 animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
