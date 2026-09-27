import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Wallet,
  Coins,
  Cpu,
  Camera,
  Layers,
  Sparkles,
  ChevronRight,
  Percent,
  Lock,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { toast } from "sonner";

export default function Payant() {
  const navigate = useNavigate();
  const [gearCategory, setGearCategory] = useState("camera");
  const [assetValue, setAssetValue] = useState(150000);
  const [activeTab, setActiveTab] = useState<"yield" | "liquidity" | "vault">("yield");

  // Estimated annualized return rate based on category
  const yieldRates: Record<string, number> = {
    camera: 28.5,
    gpu: 34.2,
    drone: 24.8,
    audio: 21.0,
  };

  const currentRate = yieldRates[gearCategory] || 25;
  const estimatedMonthlyYield = Math.round((assetValue * (currentRate / 100)) / 12);
  const estimatedYearlyYield = Math.round(assetValue * (currentRate / 100));

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      {/* Top Glass Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/60 border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Product Selection</span>
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="font-sans font-black tracking-tight text-xl text-white">
              pay<span className="font-serif font-extrabold text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]">₹</span>ent
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
              Protocol v2
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/payent"
            className="text-xs font-medium text-neutral-400 hover:text-white transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            <span>Switch to paye₹nt</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Button
            size="sm"
            onClick={() => toast.success("Connected to pay₹ent vault")}
            className="bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-xl px-4 h-9 shadow-lg"
          >
            Launch Terminal
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-8 max-w-7xl mx-auto">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-white/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>High-Yield Tech Asset Liquidity & Yield Protocol</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-sans font-black tracking-tight leading-[1.08] text-white"
          >
            Turn idle tech gear into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400">
              real cashflow
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-neutral-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
          >
            pay₹ent empowers creators, rental houses, and studios to monetize high-end gear through automated micro-yield pools, insured asset vaults, and instant liquidity.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <Button
              size="lg"
              onClick={() => {
                const el = document.getElementById("calculator");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-white text-black hover:bg-neutral-200 font-bold rounded-xl px-7 h-12 text-sm shadow-xl"
            >
              Calculate Asset Yield
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate({ to: "/payent" })}
              className="border-white/20 text-white hover:bg-white/10 font-semibold rounded-xl px-6 h-12 text-sm"
            >
              Browse Gear on paye₹nt
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Interactive Yield Calculator */}
      <section id="calculator" className="relative py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls */}
          <div className="lg:col-span-7 bg-neutral-950/80 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-400" />
                <span>Asset Yield Estimator</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Select your gear category and replacement value to calculate projected yield.
              </p>
            </div>

            {/* Category selection tabs */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Select Asset Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "camera", label: "Cameras & Lenses", icon: Camera },
                  { id: "gpu", label: "Workstations & GPUs", icon: Cpu },
                  { id: "drone", label: "Cinema Drones", icon: Zap },
                  { id: "audio", label: "Pro Audio Gear", icon: Layers },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = gearCategory === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGearCategory(item.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? "bg-white/10 border-white text-white shadow-md"
                          : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? "text-amber-400" : "text-neutral-400"}`} />
                      <span className="text-xs font-semibold leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-neutral-400">Asset Valuation</span>
                <span className="text-base font-bold text-white font-mono">
                  ₹{assetValue.toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                min={25000}
                max={1500000}
                step={25000}
                value={assetValue}
                onChange={(e) => setAssetValue(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
                <span>₹25,000</span>
                <span>₹7,50,000</span>
                <span>₹15,00,000</span>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-3 gap-3 border-t border-white/10 text-center">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">Annual APY</div>
                <div className="text-base font-bold text-amber-400 font-mono mt-0.5">{currentRate}%</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">Insurance</div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">100% Covered</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">Payout Cycle</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">Weekly</div>
              </div>
            </div>
          </div>

          {/* Result Card */}
          <div className="lg:col-span-5 bg-gradient-to-b from-white/10 via-white/5 to-transparent border border-white/15 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl space-y-6">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-amber-300 font-mono font-bold">
                Projected Creator Earnings
              </span>
              <div className="text-4xl sm:text-5xl font-sans font-black text-white font-mono mt-2 tracking-tight">
                ₹{estimatedMonthlyYield.toLocaleString("en-IN")}
                <span className="text-xs font-normal text-neutral-400 font-sans tracking-normal ml-1">/ month</span>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Estimated net annualized payout:{" "}
                <span className="text-white font-bold font-mono">
                  ₹{estimatedYearlyYield.toLocaleString("en-IN")} / year
                </span>
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-neutral-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Zero depreciation risk with collateral backing</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-300">
                <Coins className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Direct UPI or Bank account automated settlement</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-300">
                <Lock className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Verified KYC identity checks on every renter</span>
              </div>
            </div>

            <Button
              className="w-full bg-white text-black hover:bg-neutral-200 font-extrabold h-12 rounded-xl text-sm shadow-xl flex items-center justify-center gap-2"
              onClick={() => toast.success("Yield listing initialized for your gear.")}
            >
              <span>Deposit Asset to Pool</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Protocol Features Grid */}
      <section className="py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Architecture for Tech Asset Monetization
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400">
            Designed specifically for creators with high capital expenditure in production hardware.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-neutral-950 border border-white/10 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Percent className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Dynamic Yield Optimizer</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Algorithmic pricing dynamically matches weekend spikes and corporate shoot surges to maximize equipment revenue.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-950 border border-white/10 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Guaranteed Replacement</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every item deposited into the pay₹ent pool is insured against accidental damage, liquid exposure, or total loss.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-950 border border-white/10 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400">
              <Wallet className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Instant Collateral Liquidity</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Withdraw advance liquidity against booked rental contracts before the shoot schedule even commences.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 sm:px-8 text-center text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-4">
        <div>© 2026 Payent Platforms Inc. — pay₹ent Protocol</div>
        <div className="flex items-center gap-6">
          <Link to="/" className="hover:text-white transition-colors">
            Product Selection
          </Link>
          <Link to="/payent" className="hover:text-white transition-colors">
            paye₹nt Marketplace
          </Link>
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy & Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
