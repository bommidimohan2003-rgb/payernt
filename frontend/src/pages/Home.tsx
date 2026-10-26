import { Hero } from "@/components/home/Hero";
import { Categories } from "@/components/home/Categories";
import { TrustStrip } from "@/components/home/TrustStrip";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CreatorCommunity } from "@/components/home/CreatorCommunity";
import { Testimonials } from "@/components/home/Testimonials";
import { MainLayout } from "@/layouts/MainLayout";
import { JsonLd } from "@/components/common/JsonLd";

const orgSchema = {
  "@type": "Organization",
  name: "Payent",
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
  name: "Payent",
  url: "https://payent.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://payent.com/categories?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  return (
    <MainLayout>
      <JsonLd schema={orgSchema} />
      <JsonLd schema={websiteSchema} />

      {/* 1. Cinematic Hero with Creator Imagery, Why PAYENT Card & Search */}
      <Hero />

      {/* 2. Explore Gear By Category */}
      <Categories />

      {/* 3. Trust / Benefit Strip */}
      <TrustStrip />

      {/* 5. How It Works (3 Steps) */}
      <HowItWorks />

      {/* 6. Creator Community Section */}
      <CreatorCommunity />

      {/* 7. What Creators Say (Testimonials) */}
      <Testimonials />
    </MainLayout>
  );
}
