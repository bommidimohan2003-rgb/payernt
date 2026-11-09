import React from "react";
import { Hero } from "@/components/home/Hero";
import { Categories } from "@/components/home/Categories";
import { ExploreRentals } from "@/components/home/ExploreRentals";
import { NewArrivals } from "@/components/home/NewArrivals";
import { RecentlyViewed } from "@/components/home/RecentlyViewed";
import { RecommendedForYou } from "@/components/home/RecommendedForYou";
import { CustomerReviews } from "@/components/home/CustomerReviews";
import { HowItWorks } from "@/components/home/HowItWorks";
import { WhyChoose } from "@/components/home/WhyChoose";
import { MainLayout } from "@/layouts/MainLayout";
import { JsonLd } from "@/components/common/JsonLd";

const orgSchema = {
  "@type": "Organization",
  name: "paYent Rentals",
  url: "https://payent.com",
  logo: "https://payent.com/brand/payent-logo-512.png",
  sameAs: [
    "https://twitter.com/payent",
    "https://instagram.com/payent",
    "https://linkedin.com/company/payent",
    "https://youtube.com/@payent",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@payent.com",
    contactType: "customer support",
  },
};

const websiteSchema = {
  "@type": "WebSite",
  name: "paYent Rentals",
  url: "https://payent.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://payent.com/browse?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  return (
    <MainLayout>
      <JsonLd schema={orgSchema} />
      <JsonLd schema={websiteSchema} />

      {/* 1. Text-Focused Editorial Hero Section */}
      <Hero />

      {/* 2. 6 Canonical Categories with Circular Line Icons & Subcategories */}
      <Categories />

      {/* 3. Explore Rentals Section (#explore-rentals with Filters & Sort) */}
      <ExploreRentals />

      {/* 4. New Arrivals (Sorted Newest First with Pagination) */}
      <NewArrivals />

      {/* 5. Recently Viewed (Logged-in only; hidden if empty) */}
      <RecentlyViewed />

      {/* 6. Recommended For You (Personalized with Popular Fallback) */}
      <RecommendedForYou />

      {/* 7. Customer Reviews ("Real Stories, Real Experiences" Carousel) */}
      <CustomerReviews />

      {/* 8. How paYent Works (3-Step Connected Flow) */}
      <HowItWorks />

      {/* 9. Why Choose paYent (10 Verified Platform Benefits) */}
      <WhyChoose />
    </MainLayout>
  );
}
