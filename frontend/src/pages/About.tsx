import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Film,
  Camera,
  Plane,
  Monitor,
  Mic2,
  Cpu,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { api } from "@/utils/api";
import { PayentLogoMark } from "@/components/common/LogoIcon";
import heroFilmmakerImg from "@/assets/images/hero_filmmaker_rig.webp";

interface PublicStats {
  activeListings: number;
  totalRentals: number;
  happyLenders: number;
  citiesCovered: number;
}

const creatorAudiences = [
  {
    icon: Film,
    title: "Filmmakers & Cinematographers",
    description:
      "Full-frame cinema cameras, anamorphic primes, wireless video transmitters, and modular shoulder rigs for commercial and indie productions.",
  },
  {
    icon: Camera,
    title: "Photographers & Visual Artists",
    description:
      "High-resolution bodies, portrait and macro glass, portable battery strobes, light modifiers, and stabilization gimbals.",
  },
  {
    icon: Plane,
    title: "Drone Pilots & Aerial Shooters",
    description:
      "Cinema-grade quadcopters, dual-operator setups, ND filter sets, and high-capacity flight battery packs for aerial capture.",
  },
  {
    icon: Monitor,
    title: "Editors & Post-Production",
    description:
      "High-spec Apple Silicon workstations, color-critical reference monitors, external NVMe arrays, and mobile editing kits.",
  },
  {
    icon: Mic2,
    title: "Sound Designers & Podcasters",
    description:
      "Multi-track field recorders, ultra-directional shotgun mics, digital wireless lavaliers, and acoustic capture tools.",
  },
  {
    icon: Cpu,
    title: "Tech Teams & Students",
    description:
      "Testing hardware, electronic tooling, VR/AR headsets, and professional workstations for fast turnarounds and academic projects.",
  },
];

const howItWorksSteps = [
  {
    step: "01",
    title: "Discover",
    description:
      "Browse verified production gear in your city. Filter by category, dates, daily rate, and owner proximity.",
  },
  {
    step: "02",
    title: "Compare",
    description:
      "Inspect detailed specifications, included accessories, lens mounts, and community reviews before committing.",
  },
  {
    step: "03",
    title: "Reserve",
    description:
      "Book your shoot dates with transparent pricing and secure payment processing backed by Razorpay.",
  },
  {
    step: "04",
    title: "Create",
    description:
      "Pick up your gear locally, execute your shoot with confidence, and return the equipment when wraps call.",
  },
];

const platformTrustPoints = [
  {
    icon: ShieldCheck,
    title: "Verified Accounts",
    description:
      "Every renter and lender undergoes identity verification and manual admin profile reviews before listing or renting.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description:
      "Integrated payments via Razorpay with encrypted payment verification and transparent fee breakdowns.",
  },
  {
    icon: MessageSquare,
    title: "Direct Coordination",
    description:
      "Direct communication channels between lenders and creators for seamless handoffs and equipment check-ins.",
  },
  {
    icon: Clock,
    title: "Transparent Rates",
    description:
      "Clear day and multi-day rates set by gear owners with zero surprise surcharges or hidden platform fees.",
  },
];

export default function About() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .getPublicStats()
      .then((data) => {
        if (isMounted && data) {
          setStats(data as PublicStats);
        }
      })
      .catch((err) => console.warn("[About] Stats notice:", err))
      .finally(() => {
        if (isMounted) setLoadingStats(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <MainLayout>
      {/* 1. ABOUT HERO (Section 29) */}
      <section className="relative overflow-hidden bg-neutral-50/70 dark:bg-[#05090D] pt-16 pb-20 sm:pt-24 sm:pb-28 transition-colors duration-300">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-b from-neutral-200/40 via-neutral-100/10 to-transparent dark:from-[#0B1522] dark:via-[#071017] dark:to-transparent rounded-full blur-[160px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: About Story Headline & CTAs */}
            <div className="lg:col-span-7">
              {/* Eyebrow */}
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-[#AAB3BC]">
                  Built For People Who Create
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-neutral-950 dark:text-white leading-[1.1]">
                Gear should never <br />
                <span className="underline decoration-neutral-400 dark:decoration-neutral-600 underline-offset-8">
                  limit your story.
                </span>
              </h1>

              {/* Supporting Text */}
              <p className="mt-5 text-sm sm:text-base text-neutral-600 dark:text-[#AAB3BC] leading-relaxed max-w-xl">
                PAYENT connects creators with the technology they need to create
                more without owning everything. Rent professional cinema cameras, drones, workstations, and audio gear directly from verified lenders.
              </p>

              {/* Quick CTAs */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/browse"
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[#161616] text-[#FFFFFF] hover:bg-[#292929] active:bg-[#0B0B0B] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] dark:hover:bg-[#FFFFFF] text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <span>Explore Gear</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Micro-trust indicators */}
              <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Verified Creators</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>Razorpay Protected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span>Direct Handoffs</span>
                </div>
              </div>
            </div>

            {/* Right: Editorial Creator & Gear Composition */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0D151D]/90 backdrop-blur-xl p-5 sm:p-6 shadow-2xl space-y-5">
                {/* Cinematic Visual Banner with Overlay */}
                <div className="relative h-44 sm:h-48 rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 group">
                  <img
                    src={heroFilmmakerImg}
                    alt="Creators filming on set"
                    loading="lazy"
                    decoding="async"
                    width={600}
                    height={240}
                    className="w-full h-full object-cover object-center filter contrast-110 brightness-95 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  
                  {/* Floating Brand Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-lg">
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-400">
                      CREATOR HUB
                    </span>
                  </div>

                  {/* Editorial Tagline Overlay */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white">
                    <div>
                      <div className="text-xs font-black tracking-wide uppercase text-white drop-shadow-md">
                        Real Gear • Real Creators
                      </div>
                      <div className="text-[10px] text-neutral-300 font-medium">
                        Verified peer-to-peer equipment exchange
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold backdrop-blur-md">
                      ACTIVE
                    </span>
                  </div>
                </div>

                {/* Creator Categories Visual Strip */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center p-2 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-center">
                    <Camera className="w-4 h-4 text-emerald-500 mb-1" />
                    <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">Cameras</span>
                    <span className="text-[9px] text-neutral-400">Cinema & FX</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-center">
                    <Plane className="w-4 h-4 text-emerald-500 mb-1" />
                    <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">Drones</span>
                    <span className="text-[9px] text-neutral-400">DJI & Aerial</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-center">
                    <Monitor className="w-4 h-4 text-emerald-500 mb-1" />
                    <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">Laptops</span>
                    <span className="text-[9px] text-neutral-400">M3 Studio</span>
                  </div>
                </div>

                {/* Real Live Marketplace Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="p-3 rounded-2xl bg-neutral-100/70 dark:bg-white/[0.04]">
                    <div className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-400">
                      Live Catalog
                    </div>
                    <div className="text-lg font-black text-neutral-900 dark:text-white font-mono mt-0.5">
                      {loadingStats ? "..." : `${stats?.activeListings || 2}+ Items`}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-neutral-100/70 dark:bg-white/[0.04]">
                    <div className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-400">
                      Verified Safety
                    </div>
                    <div className="text-lg font-black text-neutral-900 dark:text-white font-mono mt-0.5">
                      100% Escrow
                    </div>
                  </div>
                </div>

                {/* Footer preview */}
                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-1">
                  <span>Direct local & courier handoffs</span>
                  <Link to="/browse" className="font-semibold text-neutral-900 dark:text-white hover:underline flex items-center gap-1">
                    Explore Roster <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OUR STORY (Section 30) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-4">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Our Story
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-neutral-950 dark:text-white leading-tight">
              A marketplace forged by filmmakers and tech enthusiasts.
            </h2>
          </div>

          <div className="lg:col-span-8 space-y-8 text-neutral-700 dark:text-[#AAB3BC] text-sm sm:text-base leading-relaxed">
            <div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white mb-2">
                The Problem
              </h3>
              <p>
                Professional production equipment is prohibitively expensive. A
                capable cinema camera package, high-spec drone, or mobile
                editing workstation can demand substantial upfront capital. Yet
                across commercial production houses, freelance studios, and
                creator gear closets, thousands of dollars worth of equipment
                sits idle between projects.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white mb-2">
                The Idea
              </h3>
              <p>
                We asked a straightforward question: why should access to
                world-class storytelling technology require personal ownership?
                By bridging creators who need equipment for a few shoot days
                with owners whose gear is between calls, we build a
                collaborative, circular production economy.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white mb-2">
                The Marketplace
              </h3>
              <p>
                PAYENT was designed from day one with the rigorous standards
                creative professionals expect. Clear specifications, verified
                account holders, secure payment handling, and real feedback
                ensure that both renters and gear owners operate with mutual
                trust and clarity.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white mb-2">
                The Vision
              </h3>
              <p>
                To empower every creator, student, and indie crew with the tools
                to tell compelling stories. When the barriers to professional
                tech fall away, creative vision becomes the only limit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OUR MISSION (Section 31) */}
      <section className="bg-neutral-100/60 dark:bg-[#071017] py-20 sm:py-28 transition-colors">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <span className="h-0.5 w-8 bg-primary rounded-full" />
          </div>
          <span className="block text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-[#AAB3BC] mb-4">
            Our Mission
          </span>
          <blockquote className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-950 dark:text-white leading-snug">
            “Democratize access to professional-grade technology. Minimize
            electronic waste through shared utility. Empower every storyteller
            to produce without limits.”
          </blockquote>
          <p className="mt-6 text-sm text-neutral-500 dark:text-[#8D98A3] font-medium">
            Designed for the next generation of creative independence.
          </p>
        </div>
      </section>

      {/* 4. CREATOR AUDIENCE (Section 32) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Who It Is For
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-neutral-950 dark:text-white">
            Built across creative disciplines.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-600 dark:text-[#AAB3BC]">
            Whatever your focus in modern digital production, PAYENT provides
            verified gear suited to your exact workflow.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creatorAudiences.map((aud) => {
            const IconComp = aud.icon;
            return (
              <div
                key={aud.title}
                className="p-6 rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/25 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-neutral-900 dark:text-white mb-4">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-950 dark:text-white mb-2">
                    {aud.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#AAB3BC] leading-relaxed">
                    {aud.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. HOW PAYENT WORKS (Section 33) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            The Rental Journey
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-neutral-950 dark:text-white">
            How PAYENT Works
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-600 dark:text-[#AAB3BC]">
            A seamless four-step flow built around clarity, speed, and trust.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorksSteps.map((step) => (
            <div
              key={step.step}
              className="relative p-6 rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs font-black text-primary tracking-wider">
                  {step.step}
                </span>
                <h3 className="mt-2 text-lg font-bold text-neutral-950 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-[#AAB3BC] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. TRUST & SAFETY (Section 34) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Platform Security
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-neutral-950 dark:text-white">
            Built on accountability.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-600 dark:text-[#AAB3BC]">
            We operate genuine platform safeguards so every gear exchange
            proceeds with peace of mind.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {platformTrustPoints.map((pt) => {
            const IconComp = pt.icon;
            return (
              <div
                key={pt.title}
                className="p-6 rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10"
              >
                <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-primary mb-4">
                  <IconComp className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 dark:text-white mb-2">
                  {pt.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#AAB3BC] leading-relaxed">
                  {pt.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. REAL COMMUNITY STATS (Section 35) */}
      <section className="bg-neutral-100/60 dark:bg-[#071017] py-16 sm:py-20 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              The Platform In Motion
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
              More than a rental platform.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-[#AAB3BC]">
              Real-time platform activity from our connected database.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                label: "Active Listings",
                val:
                  loadingStats
                    ? null
                    : stats?.activeListings !== undefined
                      ? stats.activeListings > 0
                        ? `${stats.activeListings}+`
                        : "Active"
                      : "Verified",
                note: "Verified gear available",
              },
              {
                label: "Completed Rentals",
                val:
                  loadingStats
                    ? null
                    : stats?.totalRentals !== undefined
                      ? stats.totalRentals > 0
                        ? `${stats.totalRentals}+`
                        : "Growing"
                      : "Verified",
                note: "Successful transactions",
              },
              {
                label: "Registered Lenders",
                val:
                  loadingStats
                    ? null
                    : stats?.happyLenders !== undefined
                      ? stats.happyLenders > 0
                        ? `${stats.happyLenders}+`
                        : "Active"
                      : "Verified",
                note: "Community equipment owners",
              },
              {
                label: "Cities Covered",
                val:
                  loadingStats
                    ? null
                    : stats?.citiesCovered !== undefined
                      ? stats.citiesCovered > 0
                        ? `${stats.citiesCovered}+`
                        : "India-wide"
                      : "Nationwide",
                note: "Active urban hubs",
              },
            ].map((st) => (
              <div
                key={st.label}
                className="p-6 rounded-2xl bg-white dark:bg-[#0D151D] border border-black/10 dark:border-white/10 text-center"
              >
                {st.val === null ? (
                  <div className="h-9 w-16 bg-secondary/80 animate-pulse rounded-lg mx-auto" />
                ) : (
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-neutral-950 dark:text-white">
                    {st.val}
                  </div>
                )}
                <div className="mt-1.5 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-[#E0E5EA]">
                  {st.label}
                </div>
                <div className="mt-1 text-[11px] text-neutral-500 dark:text-[#697680]">
                  {st.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. LENDER CTA (Section 36) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="rounded-3xl bg-[#161616] text-white dark:bg-[#0D151D] border border-white/10 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Creator Monetization
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Own gear? <br />
              Put it to work.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#AAB3BC] leading-relaxed">
              Turn idle cameras, cinema lenses, and workstations into consistent
              monthly income. You maintain complete control over rental pricing,
              availability, and renter approvals.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              to="/browse"
              className="inline-flex items-center gap-2.5 h-12 px-8 rounded-full bg-white text-black hover:bg-[#EAEAEA] text-sm font-bold transition-all shadow-lg cursor-pointer"
            >
              <span>Explore Gear</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA (Section 37) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-neutral-950 dark:text-white">
          Create More. Rent Smarter.
        </h2>
        <p className="mt-4 text-sm sm:text-base text-neutral-600 dark:text-[#AAB3BC] max-w-xl mx-auto">
          Explore production-grade tech in your area or list your equipment on
          the creator marketplace.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-[#161616] text-[#FFFFFF] hover:bg-[#292929] active:bg-[#0B0B0B] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] dark:hover:bg-[#FFFFFF] text-sm font-bold transition-all shadow-md cursor-pointer"
          >
            <span>Explore Gear</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
