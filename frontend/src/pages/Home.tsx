import React from "react";
import { PayerntHomepage } from "@/components/payernt-home/PayerntHomepage";
import { Categories } from "@/components/home/Categories";
import { TrustStrip } from "@/components/home/TrustStrip";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CreatorCommunity } from "@/components/home/CreatorCommunity";
import { Testimonials } from "@/components/home/Testimonials";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/common/JsonLd";

const orgSchema = {
  "@type": "Organization",
  name: "Paye₹nt",
  url: "https://payent.com",
  logo: "https://payent.com/brand/payent-logo-512.png",
  sameAs: [
    "https://twitter.com/payent",
    "https://instagram.com/payent",
    "https://github.com/payent",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@payent.com",
    contactType: "customer support",
  },
};

const websiteSchema = {
  "@type": "WebSite",
  name: "Paye₹nt",
  url: "https://payent.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://payent.com/categories?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans selection:bg-purple-100 selection:text-purple-900">
      <JsonLd schema={orgSchema} />
      <JsonLd schema={websiteSchema} />

      {/* 1. Production-Quality Paye₹nt Reference Specification Homepage */}
      <PayerntHomepage />

      {/* 2. Seamless Marketplace Exploration (Revealed on Explore / Scroll) */}
      <div id="marketplace-content" className="w-full bg-white relative z-10 border-t border-neutral-200/60">
        {/* Explore Gear By Category */}
        <Categories />

        {/* Trust / Benefit Strip */}
        <TrustStrip />

        {/* How It Works (Detailed Breakdown) */}
        <HowItWorks />

        {/* Creator Community Section */}
        <CreatorCommunity />

        {/* What Creators Say (Testimonials) */}
        <Testimonials />

        {/* Standard Marketplace Footer */}
        <Footer />
      </div>
    </div>
  );
}
