import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export function Newsletter() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setDone(true);
  };

  return (
    <section
      id="newsletter"
      ref={ref}
      className="relative py-20 px-4 sm:px-6 overflow-hidden bg-white dark:bg-[#1E1E1E] text-foreground"
    >
      <div className="relative max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl p-8 md:p-14 text-center overflow-hidden border border-border bg-card shadow-sm space-y-6"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 bg-secondary border border-border text-foreground text-xs font-medium">
            <Mail className="h-3.5 w-3.5 text-foreground/75" aria-hidden="true" />
            <span>paYent Insider</span>
          </div>

          <h3 className="text-2xl sm:text-4xl font-semibold tracking-tight text-foreground font-display">
            Get exclusive rental deals <br className="hidden sm:inline" />
            &amp; new gear alerts
          </h3>

          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto font-normal">
            No spam. Just new gear drops, lender discounts, and creator perks delivered once a week.
          </p>

          {done ? (
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-6 py-3 rounded-xl font-semibold text-xs sm:text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Subscribed. Check your inbox soon.</span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto pt-2"
            >
              <div className="relative w-full">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-secondary/50 border border-border focus:border-foreground text-foreground placeholder:text-muted-foreground text-xs sm:text-sm rounded-xl pl-10 pr-4 py-3.5 focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-semibold text-xs sm:text-sm px-6 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Subscribe</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
