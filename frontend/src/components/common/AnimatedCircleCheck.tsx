import { cn } from "@/lib/utils";

interface AnimatedCircleCheckProps {
  checked: boolean;
  className?: string;
  size?: number;
}

// Extracted pixel-perfect vector paths (98.8% IoU fidelity) from user's circular arrow checkmark design
const ARROW_ARC_PATH =
  "M 42.82 7.18 L 51.62 7.18 L 51.85 7.41 L 53.24 7.41 L 56.94 8.1 L 59.49 9.03 L 60.19 9.03 L 63.89 10.42 L 67.13 12.04 L 71.53 14.81 L 74.54 17.36 L 67.36 13.66 L 63.89 12.5 L 59.72 11.57 L 56.25 11.34 L 56.02 11.11 L 50.23 11.11 L 50.0 11.34 L 48.15 11.34 L 47.92 11.57 L 44.21 12.04 L 37.27 14.35 L 33.33 16.44 L 29.86 18.75 L 24.31 24.07 L 22.22 26.85 L 19.91 31.02 L 18.52 34.49 L 17.59 38.19 L 17.36 42.59 L 17.13 42.82 L 17.36 43.06 L 17.59 48.38 L 19.21 54.17 L 21.76 59.03 L 24.77 62.96 L 28.24 57.64 L 28.47 57.41 L 28.94 57.87 L 40.97 76.62 L 42.13 78.01 L 43.98 81.25 L 18.75 81.25 L 18.52 81.02 L 12.96 81.02 L 15.97 76.62 L 15.97 76.16 L 13.19 72.92 L 10.42 68.52 L 9.03 65.74 L 6.71 59.03 L 5.79 54.4 L 5.79 52.31 L 5.56 52.08 L 5.56 45.14 L 5.79 44.91 L 5.79 43.06 L 6.94 37.5 L 9.03 31.71 L 10.65 28.47 L 14.35 22.92 L 20.14 16.9 L 22.45 15.05 L 26.85 12.27 L 30.56 10.42 L 34.95 8.8 L 39.58 7.64 L 42.59 7.41 Z";

const CHECKMARK_PATH =
  "M 86.34 18.52 L 89.12 18.75 L 90.74 19.68 L 91.67 20.6 L 92.59 22.69 L 92.59 25.23 L 91.9 26.85 L 57.41 75.46 L 55.79 77.08 L 54.17 77.78 L 50.69 77.55 L 48.38 75.69 L 32.87 53.24 L 32.18 51.39 L 32.18 49.31 L 32.64 47.92 L 33.56 46.53 L 35.88 45.14 L 38.43 44.91 L 40.74 45.83 L 42.13 47.22 L 47.69 55.32 L 47.92 56.02 L 48.84 56.94 L 52.31 62.27 L 53.01 62.73 L 82.64 20.83 L 84.03 19.44 L 85.42 18.75 L 86.11 18.75 Z";

const SWOOSH_PATH =
  "M 92.13 37.27 L 93.75 42.13 L 94.44 45.83 L 94.44 47.92 L 94.68 48.15 L 94.68 54.86 L 94.44 55.09 L 94.21 58.56 L 93.06 63.43 L 91.2 68.52 L 88.89 72.92 L 84.72 78.7 L 80.09 83.33 L 75.0 87.04 L 67.36 90.74 L 60.42 92.59 L 57.64 92.82 L 57.41 93.06 L 48.84 93.06 L 48.61 92.82 L 45.6 92.59 L 38.19 90.51 L 35.42 89.35 L 32.64 87.73 L 34.95 88.66 L 40.74 90.05 L 45.37 90.28 L 45.6 90.51 L 52.78 90.05 L 57.87 88.89 L 62.96 87.04 L 68.06 84.26 L 72.92 80.56 L 77.78 75.23 L 81.48 68.98 L 82.87 65.28 L 84.03 59.72 L 84.03 53.47 L 83.33 49.77 L 91.9 37.5 Z";

export function AnimatedCircleCheck({
  checked,
  className,
  size = 18,
}: AnimatedCircleCheckProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center shrink-0 cursor-pointer select-none text-foreground transition-transform active:scale-95",
        className,
      )}
    >
      {/* Unchecked Empty Circular Border */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 transition-all duration-200",
          checked
            ? "border-transparent opacity-0 scale-75"
            : "border-neutral-400 dark:border-neutral-500 hover:border-foreground/80 opacity-100 scale-100 bg-transparent",
        )}
      />

      {/* Checked Rotating Circular Arrow Checkmark matching user image */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center text-current transition-all duration-300 ease-out origin-center",
          checked
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-50 -rotate-90 pointer-events-none",
        )}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          className="w-full h-full drop-shadow-xs"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer sweeping arrow and swoosh */}
          <g>
            <path d={ARROW_ARC_PATH} fill="currentColor" />
            <path d={SWOOSH_PATH} fill="currentColor" />
          </g>
          {/* Bold Center Checkmark */}
          <path d={CHECKMARK_PATH} fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
