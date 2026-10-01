import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  {
    numericValue: 50,
    suffix: "k+",
    label: "Active Renters",
    icon: "👥",
    gradient: "from-foreground to-foreground/70",
  },
  {
    numericValue: 12,
    suffix: "k+",
    label: "Listings Available",
    icon: "📦",
    gradient: "from-foreground to-foreground/70",
  },
  {
    numericValue: 98,
    suffix: "%",
    label: "Satisfaction Rate",
    icon: "⭐",
    gradient: "from-amber-400 to-amber-500",
  },
  {
    numericValue: 24,
    suffix: "/7",
    label: "Customer Support",
    icon: "💬",
    gradient: "from-emerald-400 to-amber-400",
  },
];

function AnimatedCounter({
  target,
  suffix,
}: {
  target: number;
  suffix: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1800; // ms
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = target / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export function Stats() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      id="stats"
      ref={ref}
      className="relative py-24 px-4 sm:px-6 overflow-hidden bg-background text-foreground border-t border-border"
    >

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 space-y-3"
        >
          <p className="text-xs font-extrabold tracking-widest text-primary uppercase">
            TRUST &amp; METRICS
          </p>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground font-display">
            Numbers that <span className="text-primary font-bold">speak for us</span>
          </h2>
          <p className="mt-3 text-muted-foreground text-base max-w-lg mx-auto font-normal">
            Trusted by thousands of creators and lenders across the country.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="group relative rounded-2xl p-7 text-center overflow-hidden bg-card border border-border hover:border-primary/40 transition-all duration-300 shadow-xl"
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 70%)",
                }}
              />

              {/* Icon */}
              <div className="text-3xl mb-4">{s.icon}</div>

              {/* Number */}
              <div
                className={`text-4xl sm:text-5xl font-extrabold bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent`}
              >
                <AnimatedCounter target={s.numericValue} suffix={s.suffix} />
              </div>

              {/* Label */}
              <div className="mt-2 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
