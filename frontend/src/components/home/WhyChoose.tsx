import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Headphones,
  Award,
  Sparkles,
  RefreshCw,
} from "lucide-react";

const brandValues = [
  {
    icon: ShieldCheck,
    title: "Escrow Deposit Security",
    subtitle:
      "Razorpay-backed escrow protection keeps funds 100% safe until return.",
    badge: "Escrow Shield",
  },
  {
    icon: Award,
    title: "Biometric Identity Pass",
    subtitle:
      "Every lender & renter undergoes instant government KYC verification.",
    badge: "ID Verified",
  },
  {
    icon: RefreshCw,
    title: "Zero Capital Depreciation",
    subtitle:
      "Never waste ₹4L+ on tech gear that depreciates before your next shoot.",
    badge: "Asset Smart",
  },
  {
    icon: Headphones,
    title: "24/7 Production Concierge",
    subtitle:
      "Dedicated live tech assistance and replacement gear dispatch in 2 hours.",
    badge: "Concierge 24/7",
  },
];

export function WhyChoose() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#1E1E1E] py-16 md:py-24 text-foreground dark:text-white">
      {/* Ambient Radial Spotlights */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-primary">Precision & Trust</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground font-display">
              Engineered for Creators. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-600 dark:via-purple-400 to-amber-600 dark:to-amber-400">
                Protected for Owners.
              </span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground dark:text-neutral-400 font-medium">
              Standard rental houses charge exorbitant deposits and rigid 24-hour
              penalties. Payent gives you liquid access to certified, insured tech
              hardware at your terms.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {brandValues.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group relative p-6 rounded-3xl border border-border dark:border-white/15 bg-card dark:bg-gradient-to-b dark:from-white/10 dark:via-white/5 dark:to-white/0 backdrop-blur-2xl shadow-md hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-secondary dark:bg-white/10 text-primary flex items-center justify-center border border-border dark:border-white/15 group-hover:scale-110 transition-transform">
                      <IconComp className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground dark:text-neutral-400 px-2.5 py-1 rounded-full bg-secondary dark:bg-white/5 border border-border dark:border-white/10">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-foreground dark:text-white group-hover:text-primary transition-colors font-display">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground dark:text-neutral-400 font-medium mt-1.5 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
