import { useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useOriginReveal } from "@/components/navigation/OriginRevealTransition";

interface SelectionCardProps {
  label: string;
  accessibleLabel: string;
  isHovered: boolean;
  isOtherHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  tabIndex: number;
}

function SelectionCard({
  label,
  accessibleLabel,
  isHovered,
  isOtherHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  tabIndex,
}: SelectionCardProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Split label to render ₹ with exact typography
  const characters = label.split("");

  return (
    <motion.button
      ref={btnRef}
      type="button"
      tabIndex={tabIndex}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onMouseEnter}
      onBlur={onMouseLeave}
      aria-label={accessibleLabel}
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: isOtherHovered ? 0.5 : 1,
        y: 0,
        scale: isHovered && !shouldReduceMotion ? 1.02 : 1,
        borderColor: isHovered
          ? "rgba(255, 255, 255, 0.40)"
          : "rgba(255, 255, 255, 0.16)",
        backgroundColor: isHovered ? "#0c0c0c" : "#050505",
      }}
      transition={{
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative flex items-center justify-center cursor-pointer outline-none select-none rounded-2xl border text-center transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-8 focus-visible:ring-offset-black shadow-lg"
      style={{
        width: "clamp(280px, 30vw, 440px)",
        height: "clamp(160px, 18vw, 240px)",
        borderWidth: "1px",
        borderRadius: "20px",
      }}
    >
      <div className="relative inline-flex items-center justify-center font-display font-extrabold tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-none">
        {characters.map((char, index) => {
          const isRupee = char === "₹";
          return (
            <motion.span
              key={index}
              animate={{
                color: isHovered ? "#ffffff" : isOtherHovered ? "#9ca3af" : "#f4f4f5",
                letterSpacing: isHovered && !shouldReduceMotion ? "0.01em" : "-0.015em",
              }}
              transition={{
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`inline-block ${
                isRupee ? "font-serif font-black mx-[0.02em] text-[0.96em] text-white" : ""
              }`}
            >
              {char}
            </motion.span>
          );
        })}
      </div>
    </motion.button>
  );
}

export function ProductSelection() {
  const navigate = useNavigate();
  const { triggerOriginTransition } = useOriginReveal();
  const [hoveredProduct, setHoveredProduct] = useState<"payernt" | "payrent" | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Handle card click
  const handleSelect = (
    product: "payernt" | "payrent",
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const targetPayload = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };

    triggerOriginTransition(product, targetPayload);

    // Left card "paye₹nt" -> Product Owner / Lender side at /payernt
    // Right card "pay₹ent" -> Explore Marketplace at /payant
    const destination = product === "payernt" ? "/payernt" : "/payant";

    setTimeout(
      () => {
        navigate({ to: destination as any });
      },
      shouldReduceMotion ? 40 : 280
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] text-white select-none overflow-hidden"
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        backgroundColor: "#000000",
      }}
    >
      {/* Centered Horizontal Two-Box Group */}
      <main className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 md:gap-12 lg:gap-16 px-4 sm:px-8 max-w-7xl mx-auto">
        {/* LEFT RECTANGULAR BOX: paye₹nt (Product Owner Experience) */}
        <SelectionCard
          label="paye₹nt"
          accessibleLabel="Open paye₹nt Product Owner Experience"
          isHovered={hoveredProduct === "payernt"}
          isOtherHovered={hoveredProduct === "payrent"}
          onMouseEnter={() => setHoveredProduct("payernt")}
          onMouseLeave={() => setHoveredProduct(null)}
          onClick={(e) => handleSelect("payernt", e)}
          tabIndex={1}
        />

        {/* RIGHT RECTANGULAR BOX: pay₹ent (Explore Marketplace) */}
        <SelectionCard
          label="pay₹ent"
          accessibleLabel="Open pay₹ent Explore Marketplace"
          isHovered={hoveredProduct === "payrent"}
          isOtherHovered={hoveredProduct === "payernt"}
          onMouseEnter={() => setHoveredProduct("payrent")}
          onMouseLeave={() => setHoveredProduct(null)}
          onClick={(e) => handleSelect("payrent", e)}
          tabIndex={2}
        />
      </main>

      {/* Screen Reader Announcement */}
      <div className="sr-only" aria-live="polite">
        Select between paye₹nt and pay₹ent.
      </div>
    </div>
  );
}

export default ProductSelection;
