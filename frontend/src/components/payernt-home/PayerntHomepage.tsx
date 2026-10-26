import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { HeroHeader } from "./HeroHeader";
import { HeroContent } from "./HeroContent";
import { DroneShowcase } from "./DroneShowcase";
import { CameraProductPanel } from "./CameraProductPanel";
import { HowItWorksModal } from "./HowItWorksModal";

interface PayerntHomepageProps {
  className?: string;
}

export function PayerntHomepage({ className = "" }: PayerntHomepageProps) {
  const navigate = useNavigate();
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const handleExplore = () => {
    navigate({ to: "/categories" });
  };

  const handleHowItWorks = () => {
    setIsHowItWorksOpen(true);
  };

  const handleSelectCamera = () => {
    navigate({ to: "/categories" });
  };

  return (
    <div
      role="region"
      aria-label="Paye₹nt Homepage"
      className={`relative min-h-screen w-full flex items-center justify-center p-3 sm:p-5 md:p-8 lg:p-10 select-none overflow-x-hidden ${className}`}
      style={{
        background:
          "radial-gradient(130% 120% at 50% 15%, #e9f6ed 0%, #d5edd9 55%, #c6e5cd 100%)",
        backgroundColor: "var(--color-mint-background, #dceee1)",
      }}
    >
      {/* ==================================================================== */}
      {/* Centered White Container with Thick Black Border                     */}
      {/* ==================================================================== */}
      <main
        className="relative w-full max-w-[1140px] xl:max-w-[1240px] bg-white rounded-[26px] sm:rounded-[30px] md:rounded-[34px] border-[3.5px] sm:border-[4px] border-[#0a0a0a] shadow-[0_24px_60px_-15px_rgba(25,50,35,0.18),0_10px_25px_-5px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col justify-between"
        style={{
          minHeight: "clamp(580px, 82vh, 760px)",
        }}
      >
        {/* ================================================================== */}
        {/* 1. Header (Inside Upper Portion of White Container)                */}
        {/* ================================================================== */}
        <div className="w-full px-5 sm:px-8 md:px-10 pt-5 sm:pt-7 md:pt-8 pb-2 sm:pb-3 z-30 relative bg-white">
          <HeroHeader />
        </div>

        {/* ================================================================== */}
        {/* 2. Desktop & Tablet Visual Composition (>= 768px)                  */}
        {/* ================================================================== */}
        <div className="hidden md:block relative flex-1 w-full min-h-[520px] lg:min-h-[580px] xl:min-h-[620px]">
          {/* Pristine Photographic Showcase as Background Canvas */}
          <div className="absolute inset-0 z-0">
            <DroneShowcase onExploreGear={handleExplore} />
          </div>

          {/* Interactive Live Hero Content (Overlaying White Region) */}
          <div className="relative z-10 px-5 sm:px-8 md:px-10 pt-3 sm:pt-4 lg:pt-6">
            <HeroContent
              onExplore={handleExplore}
              onHowItWorks={handleHowItWorks}
            />
          </div>
        </div>

        {/* ================================================================== */}
        {/* 3. Mobile Optimized Stack (< 768px)                                */}
        {/* ================================================================== */}
        <div className="block md:hidden w-full px-4 sm:px-6 pt-2 pb-6 space-y-6">
          {/* Live Mobile Hero Content */}
          <HeroContent
            onExplore={handleExplore}
            onHowItWorks={handleHowItWorks}
          />

          {/* Mobile Drone Showcase Photograph */}
          <div className="w-full pt-1">
            <DroneShowcase onExploreGear={handleExplore} />
          </div>

          {/* Mobile Camera Product Panel */}
          <div className="w-full">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-neutral-900 tracking-wide uppercase">
                Featured Cinema Gear
              </span>
              <span className="text-[11px] font-mono text-[#6622aa] font-medium">
                Verified Available
              </span>
            </div>
            <CameraProductPanel
              isStandalone={true}
              onSelectGear={handleSelectCamera}
            />
          </div>
        </div>
      </main>

      {/* ==================================================================== */}
      {/* 4. Accessible Interactive "How It Works" Modal                       */}
      {/* ==================================================================== */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onExplore={handleExplore}
      />
    </div>
  );
}

export default PayerntHomepage;
