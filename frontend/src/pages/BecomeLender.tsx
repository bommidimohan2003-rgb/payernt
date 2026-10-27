import React, { useState } from "react";
import {
  IndianRupee,
  Shield,
  Zap,
  Upload,
  Camera,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Info,
  Trash2,
  Plus,
  Star,
  Layers,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Laptop,
  Bike,
  Wrench,
  BatteryCharging,
  Headphones,
  Check,
  MapPin,
  ShieldCheck,
  Tag as TagIcon,
  Sparkle,
  User,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import type { Product } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CameraCaptureModal } from "@/components/lender/CameraCaptureModal";
import { compressImage } from "@/utils/imageUtils";

import cameraImg from "@/assets/images/camera.webp";
import laptopImg from "@/assets/images/laptop.webp";
import droneImg from "@/assets/images/drone.webp";
import bikeImg from "@/assets/images/re_classic350.webp";
import toolImg from "@/assets/images/tool.webp";
import powerbankImg from "@/assets/images/powerbank.webp";
import audioImg from "@/assets/images/audio.jpg";
import vrImg from "@/assets/images/vr.jpg";

const perks = [
  {
    icon: IndianRupee,
    title: "Passive Rental Income",
    body: "Turn idle tech gear into steady monthly yield with verified local borrowers.",
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80",
    tag: "High Yield",
  },
  {
    icon: Shield,
    title: "₹50,000 Damage Insurance",
    body: "Every single rental is fully insured against physical damage & theft.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
    tag: "Zero Risk",
  },
  {
    icon: Zap,
    title: "2-Min Direct Camera Listing",
    body: "Snap product photos directly from your phone camera and go live instantly.",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
    tag: "Instant Snap",
  },
];

interface GearPhoto {
  id: string;
  url: string;
  tag: string;
  isPrimary: boolean;
}

const CATEGORIES = [
  {
    id: "cameras",
    label: "Cameras & Lenses",
    image: cameraImg,
    icon: Camera,
    avgPrice: 1500,
  },
  {
    id: "drones",
    label: "Drones & Aerial",
    image: droneImg,
    icon: Sparkles,
    avgPrice: 2000,
  },
  {
    id: "laptops",
    label: "Laptops & Computing",
    image: laptopImg,
    icon: Laptop,
    avgPrice: 1800,
  },
  {
    id: "audio",
    label: "Audio & Microphones",
    image: audioImg,
    icon: Headphones,
    avgPrice: 700,
  },
  {
    id: "vr",
    label: "VR & Spatial",
    image: vrImg,
    icon: Sparkle,
    avgPrice: 2500,
  },
  {
    id: "tools",
    label: "Drilling Machine",
    image: toolImg,
    icon: Wrench,
    avgPrice: 500,
  },
  {
    id: "bikes",
    label: "Bikes & Cruisers",
    image: bikeImg,
    icon: Bike,
    avgPrice: 800,
  },
  {
    id: "powerbanks",
    label: "Power Bank",
    image: powerbankImg,
    icon: BatteryCharging,
    avgPrice: 600,
  },
];

export default function BecomeLender() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/become-lender" }) as {
    title?: string;
    category?: string;
    price?: string;
    description?: string;
  };
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stepper step state (1: Basics, 2: Pricing & Terms, 3: Photos & Submit)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [title, setTitle] = useState(search.title || "");
  const [category, setCategory] = useState(search.category || "cameras");
  const [condition, setCondition] = useState("Like New");
  const [price, setPrice] = useState(search.price || "");
  const [description, setDescription] = useState(search.description || "");

  // Photos State
  const [photos, setPhotos] = useState<GearPhoto[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeAngleTag, setActiveAngleTag] = useState("Front View");

  // File input ref for fallbacks
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Handlers for Camera Capture
  const handleCameraCapture = async (imageDataUrl: string, angleTag?: string) => {
    try {
      const compressedUrl = await compressImage(imageDataUrl, 1200, 0.82);
      const newPhoto: GearPhoto = {
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        url: compressedUrl,
        tag: angleTag || "Front View",
        isPrimary: photos.length === 0,
      };
      setPhotos((prev) => [...prev, newPhoto]);
      toast.success(`Photo added (${newPhoto.tag})`);
    } catch {
      const newPhoto: GearPhoto = {
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        url: imageDataUrl,
        tag: angleTag || "Front View",
        isPrimary: photos.length === 0,
      };
      setPhotos((prev) => [...prev, newPhoto]);
      toast.success(`Photo added (${newPhoto.tag})`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (> 20MB).`);
        continue;
      }
      try {
        const compressedUrl = await compressImage(file, 1200, 0.82);
        setPhotos((prev) => [
          ...prev,
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            url: compressedUrl,
            tag: prev.length === 0 ? "Front View" : "Gear Angle",
            isPrimary: prev.length === 0,
          },
        ]);
      } catch {
        toast.error(`Failed to process image: ${file.name}`);
      }
    }
    e.target.value = "";
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const handleSetPrimaryPhoto = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isPrimary: p.id === id,
      }))
    );
  };

  // Primary image preview
  const primaryImage =
    photos.find((p) => p.isPrimary)?.url ||
    photos[0]?.url ||
    "";

  // Form Submit Handler
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter item title.");
      setCurrentStep(1);
      return;
    }

    if (!price || Number(price) <= 0) {
      toast.error("Please specify a valid daily rental price.");
      setCurrentStep(2);
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide a description of your gear.");
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    const priceNum = Number(price);

    const ownerCity = user?.city || user?.address || "Visakhapatnam, Gajuwaka, AP";
    const newProduct: Product = {
      id: `p-custom-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      image: primaryImage,
      category: category,
      rating: 5.0,
      reviews: 0,
      available: false,
      isReference: false,
      status: "pending",
      location: ownerCity,
      owner: {
        name: user?.fullName || user?.email || "Verified Lender",
        email: user?.email || "",
        avatar: user?.profilePhotoUrl || user?.profile_photo_url || user?.avatar || "",
        rating: 5.0,
        city: ownerCity,
      },
    };

    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token && !user?.email) {
      toast.error("Please log in to publish your gear.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await api.createCustomProduct(token || "", newProduct);
      if (!res || res.success === false) {
        throw new Error(res?.message || "Server could not persist listing.");
      }
      toast.success(
        "Listing submitted for Admin Approval! Your tech gear listing is under review and will appear publicly once approved by an Admin.",
      );
      window.dispatchEvent(new CustomEvent("payent_products_updated"));
      setIsSubmitting(false);
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[BecomeLender] Backend submission error:", msg);
      toast.error(`Listing failed: ${msg}`);
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      {/* Hidden File Input for Gallery Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Direct Camera Capture WebRTC Modal */}
      {isCameraOpen && (
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraCapture}
          onFallbackUpload={() => fileInputRef.current?.click()}
          angleTag={activeAngleTag}
        />
      )}

      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-28 bg-gradient-to-b from-background via-background/95 to-secondary/30">
        {/* Background Ambient Glow Orbs */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-br from-primary/20 via-purple-500/10 to-emerald-500/10 blur-[130px] rounded-full -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* PERKS GRID SECTION */}
          <div className="space-y-6">
            <div className="text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-display">
                Why Host Your Gear on Payent
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Built from the ground up for seamless, protected peer-to-peer equipment sharing.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {perks.map((p) => (
                <div
                  key={p.title}
                  className="relative overflow-hidden rounded-3xl border border-border/80 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-xl p-6 shadow-lg flex flex-col justify-between"
                >
                  <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl bg-secondary mb-5">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-3 right-3 text-xs font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full border border-white/20 shadow-md">
                      {p.tag}
                    </span>
                    <div className="absolute bottom-3 left-3 h-10 w-10 rounded-xl bg-primary/20 backdrop-blur-md border border-primary/40 grid place-items-center text-primary shadow-xl">
                      <p.icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-lg text-foreground font-display">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {p.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MAIN LISTING WORKFLOW SECTION */}
          <div id="listing-form" className="pt-4">
            {done ? (
              /* Success Confirmation View */
              <div className="max-w-2xl mx-auto rounded-3xl p-8 sm:p-12 border border-emerald-500/30 bg-card/80 dark:bg-card/60 backdrop-blur-2xl text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 grid place-items-center mx-auto shadow-lg">
                  <CheckCircle2 className="h-12 w-12" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-500">
                    Listing Successfully Queued
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground font-display">
                    Your Gear is Listed!
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    "{title}" has been submitted and is currently undergoing fast automated verification before launching live to borrowers.
                  </p>
                </div>

                {/* Submitted Product Card Preview */}
                <div className="p-4 rounded-2xl bg-secondary/60 border border-border/80 max-w-sm mx-auto text-left flex gap-4 items-center shadow-md">
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt={title}
                      className="h-18 w-18 rounded-xl object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="h-18 w-18 rounded-xl bg-secondary border border-border shrink-0 grid place-items-center text-muted-foreground">
                      <Camera className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm truncate text-foreground">
                      {title}
                    </h4>
                    <p className="text-xs text-muted-foreground capitalize">
                      {category} • ₹{price}/day
                    </p>
                    <span className="mt-1.5 inline-flex items-center text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      Under Admin Review
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => {
                      setDone(false);
                      setTitle("");
                      setPrice("");
                      setDescription("");
                      setPhotos([]);
                      setCurrentStep(1);
                    }}
                    variant="outline"
                    className="rounded-2xl font-bold"
                  >
                    <Plus className="h-4 w-4 mr-2" /> List Another Item
                  </Button>
                  <Button
                    onClick={() => navigate({ to: "/dashboard" })}
                    className="bg-primary text-primary-foreground rounded-2xl font-bold px-6"
                  >
                    Go to Lender Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Guided Form & Live Preview Grid */
              <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Form Side (7 cols desktop) */}
                <div className="lg:col-span-7 rounded-3xl border border-border/80 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-2xl p-6 sm:p-10 space-y-8 shadow-xl">
                  {/* Stepper Navigation */}
                  <div className="space-y-4 border-b border-border/80 pb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">
                        Step {currentStep} of 3
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {currentStep === 1 && "Product Name & Description"}
                        {currentStep === 2 && "Product Photos"}
                        {currentStep === 3 && "Pricing & Terms"}
                      </span>
                    </div>

                    {/* Step Timeline Stepper Indicator */}
                    <nav aria-label="Listing Progress">
                      <ol className="grid grid-cols-3 gap-2">
                        {[
                          { num: 1, label: "Name & Specs" },
                          { num: 2, label: "Photos" },
                          { num: 3, label: "Pricing" },
                        ].map((step) => {
                          const isActive = currentStep === step.num;
                          const isCompleted = currentStep > step.num;
                          return (
                            <li key={step.num}>
                              <button
                                type="button"
                                onClick={() =>
                                  setCurrentStep(step.num as 1 | 2 | 3)
                                }
                                aria-current={isActive ? "step" : undefined}
                                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                  isActive
                                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs"
                                    : isCompleted
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-border/70 bg-background/40 text-muted-foreground hover:bg-secondary/60"
                                }`}
                              >
                                <span
                                  className={`h-5 w-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : isCompleted
                                      ? "bg-emerald-500 text-white"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {isCompleted ? (
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  ) : (
                                    step.num
                                  )}
                                </span>
                                <span className="truncate">{step.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    </nav>
                  </div>

                  <form onSubmit={onSubmit} className="space-y-6">
                    {/* STEP 1: PRODUCT NAME, CATEGORY, CONDITION & DESCRIPTION */}
                    {currentStep === 1 && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <Input
                          label="Product Name"
                          placeholder="e.g. Sony Alpha A7 IV Camera + 24-70mm GM Lens"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />

                        {/* Category Selector Grid */}
                        <div>
                          <div className="mb-3 space-y-0.5 text-left">
                            <label className="text-xs font-bold text-foreground block">
                              Category Selection
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Select the gear category that best matches your equipment.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {CATEGORIES.map((c) => {
                              const isSelected = category === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setCategory(c.id)}
                                  className={`group relative rounded-2xl overflow-hidden text-left cursor-pointer transition-all duration-300 h-28 sm:h-36 flex flex-col justify-end border shadow-sm ${
                                    isSelected
                                      ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl scale-[1.02]"
                                      : "border-border/80 bg-neutral-900 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
                                  }`}
                                >
                                  {/* Full Card Background Photo with enhanced contrast */}
                                  <div className="absolute inset-0 w-full h-full bg-neutral-950 overflow-hidden">
                                    <img
                                      src={c.image}
                                      alt={c.label}
                                      loading="lazy"
                                      className="w-full h-full object-cover filter brightness-110 contrast-105 group-hover:scale-110 transition-all duration-500 ease-out"
                                    />
                                    {/* Gradient overlay for high legibility */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />
                                  </div>

                                  {/* Selected Active Checkmark Badge */}
                                  {isSelected && (
                                    <div className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-lg z-20 animate-in zoom-in-50 duration-200">
                                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </div>
                                  )}

                                  {/* Category Title sitting at the bottom of the card */}
                                  <div className="relative z-10 p-3 text-left w-full">
                                    <h4
                                      className={`text-xs sm:text-sm font-bold text-white transition-colors leading-tight line-clamp-1 drop-shadow-md ${
                                        isSelected
                                          ? "text-primary font-black"
                                          : "group-hover:text-primary"
                                      }`}
                                    >
                                      {c.label}
                                    </h4>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Item Condition Selector */}
                        <div className="space-y-2.5">
                          <div className="mb-2 space-y-0.5 text-left">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 font-display">
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              Item Condition
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Help borrowers accurately gauge equipment wear and reliability.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {[
                              {
                                id: "Like New",
                                title: "Like New",
                                subtitle: "Pristine, zero signs of wear",
                                icon: Sparkles,
                                badge: "Flawless",
                              },
                              {
                                id: "Excellent",
                                title: "Excellent",
                                subtitle: "Minor cosmetic signs, 100% tested",
                                icon: CheckCircle2,
                                badge: "Tested",
                              },
                              {
                                id: "Good",
                                title: "Good",
                                subtitle: "Normal cosmetic wear, fully working",
                                icon: ShieldCheck,
                                badge: "Reliable",
                              },
                            ].map((cond) => {
                              const isSelected = condition === cond.id;
                              const Icon = cond.icon;
                              return (
                                <button
                                  key={cond.id}
                                  type="button"
                                  onClick={() => setCondition(cond.id)}
                                  className={`relative p-3 rounded-2xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between gap-2 overflow-hidden ${
                                    isSelected
                                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-md scale-[1.01]"
                                      : "border-border/80 bg-card/60 dark:bg-zinc-900/60 hover:border-primary/40 hover:bg-card/90 shadow-sm"
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div
                                      className={`h-6 w-6 rounded-lg grid place-items-center border transition-colors ${
                                        isSelected
                                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                          : "bg-secondary text-foreground border-border/70"
                                      }`}
                                    >
                                      <Icon className="h-3.5 w-3.5" />
                                    </div>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        isSelected
                                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                          : "bg-secondary text-muted-foreground border-border/60"
                                      }`}
                                    >
                                      {cond.badge}
                                    </span>
                                  </div>
                                  <div>
                                    <h5
                                      className={`text-xs sm:text-sm font-bold leading-tight ${
                                        isSelected
                                          ? "text-primary font-black"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {cond.title}
                                    </h5>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                      {cond.subtitle}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Product Description & Included Accessories */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 font-display">
                              <Info className="h-3.5 w-3.5 text-primary" />
                              Product Description & Included Accessories
                            </label>
                            <span className="text-xs text-muted-foreground font-medium">
                              {description.length} characters
                            </span>
                          </div>

                          {/* Rich Textarea Box */}
                          <div className="relative rounded-2xl border border-border/80 bg-card/60 dark:bg-zinc-900/60 p-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 transition-all shadow-sm">
                            <textarea
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Describe item condition, included batteries, chargers, SD cards, carrying cases, and any special guidelines for borrowers..."
                              className="w-full bg-transparent p-3 min-h-[105px] focus:outline-none text-sm placeholder:text-muted-foreground/70 leading-relaxed resize-y"
                              required
                            />
                            <div className="px-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted-foreground border-t border-border/40 pt-1.5">
                              <span>Be specific about included cables, bags & battery health.</span>
                              <span className="font-semibold text-emerald-500">
                                ✓ Helps faster borrower approval
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Step Navigation Action Bar */}
                        <div className="pt-4 border-t border-border/70 flex flex-col sm:flex-row gap-3 items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                            <span>Step 1 of 3: Details & Specs</span>
                          </div>

                          <Button
                            type="button"
                            onClick={() => {
                              if (!title.trim() || !description.trim()) {
                                toast.error(
                                  "Please fill in product name and description before proceeding."
                                );
                                return;
                              }
                              setCurrentStep(2);
                            }}
                            className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>Continue to Photos</span>
                            <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: DIRECT CAMERA CAPTURE & PHOTO UPLOAD */}
                    {currentStep === 2 && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <div>
                          <label className="text-xs font-bold text-foreground block mb-3">
                            Snap Photos with Camera or Upload
                          </label>

                          <div className="grid sm:grid-cols-2 gap-4">
                            {/* DIRECT CAMERA ACTION BUTTON */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAngleTag(
                                  photos.length === 0
                                    ? "Front View"
                                    : photos.length === 1
                                    ? "Side Angle"
                                    : "Accessories/Serial"
                                );
                                setIsCameraOpen(true);
                              }}
                              className="p-5 rounded-3xl border-2 border-primary/50 bg-gradient-to-br from-primary/20 via-rose-500/10 to-primary/5 text-left flex items-center gap-4 shadow-md cursor-pointer hover:border-primary transition-all"
                            >
                              <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg">
                                <Camera className="h-7 w-7" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 font-display">
                                  Take Photo with Camera
                                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Snap product photos directly from device camera
                                </p>
                              </div>
                            </button>

                            {/* FILE UPLOAD DROPZONE BUTTON */}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="p-5 rounded-3xl border-2 border-dashed border-border bg-card text-left flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-all"
                            >
                              <div className="h-14 w-14 rounded-2xl bg-secondary text-foreground grid place-items-center">
                                <Upload className="h-6 w-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-foreground font-display">
                                  Upload Image File
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Select existing photos from gallery
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Photo Gallery Thumbnails */}
                        {photos.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-foreground">
                              <span>Captured Gallery ({photos.length})</span>
                              <span className="text-xs text-muted-foreground font-normal">
                                Tap thumbnail to select primary image
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                              {photos.map((photo) => (
                                <div
                                  key={photo.id}
                                  onClick={() => handleSetPrimaryPhoto(photo.id)}
                                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer bg-black/40 shadow-sm ${
                                    photo.isPrimary
                                      ? "border-primary ring-2 ring-primary/40"
                                      : "border-border"
                                  }`}
                                >
                                  <img
                                    src={photo.url}
                                    alt="Gear angle"
                                    className="h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                                  <span className="absolute bottom-2 left-2 text-xs font-bold text-white bg-black/70 px-2 py-0.5 rounded-md backdrop-blur-md">
                                    {photo.tag}
                                  </span>

                                  {photo.isPrimary && (
                                    <span className="absolute top-2 left-2 text-[10px] font-bold text-black bg-primary px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                                      <Check className="h-2.5 w-2.5" /> Primary
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemovePhoto(photo.id);
                                    }}
                                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/80 text-red-400 grid place-items-center"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(1)}
                            className="rounded-2xl font-bold"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className="bg-primary text-primary-foreground px-8 rounded-2xl font-bold"
                          >
                            Continue to Pricing
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: PRICING & TERMS */}
                    {currentStep === 3 && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <div>
                          <Input
                            label="Daily Rental Rate (₹ / Day)"
                            type="number"
                            placeholder="e.g. 850"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                          />
                          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                            <Info className="h-4 w-4 text-primary" />
                            Suggested rate for {category}: ₹
                            {CATEGORIES.find((c) => c.id === category)
                              ?.avgPrice || 750}
                            /day based on market demand.
                          </p>
                        </div>

                        {/* Insurance Protection Badge Card */}
                        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 space-y-2 shadow-sm">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <Shield className="h-4 w-4" />
                            ₹50,000 Payent Damage Coverage Included
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Your equipment is automatically insured against accidental damage or non-return by verified borrowers.
                          </p>
                        </div>

                        <div className="pt-4 flex justify-between items-center border-t border-border/80">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(2)}
                            className="rounded-2xl font-bold"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back
                          </Button>
                          <Button
                            type="submit"
                            size="lg"
                            className="bg-primary text-primary-foreground px-10 rounded-2xl font-bold shadow-lg cursor-pointer"
                            loading={isSubmitting}
                          >
                            Submit Listing
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                {/* Live Marketplace Product Card Preview (5 cols desktop) */}
                <div className="lg:col-span-5 sticky top-24 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5 font-display">
                      <Layers className="h-3.5 w-3.5 text-primary" /> Live Catalog Preview
                    </span>
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      Real-time Preview
                    </span>
                  </div>

                  {/* Compact Unified Product Card */}
                  <div className="group relative rounded-3xl overflow-hidden border border-border/80 dark:border-white/10 bg-neutral-900 shadow-xl h-72 sm:h-80 flex flex-col justify-between p-4.5 transition-all duration-300">
                    {/* Background Product / Category Image */}
                    <div className="absolute inset-0 w-full h-full bg-neutral-900 overflow-hidden">
                      <img
                        src={primaryImage || CATEGORIES.find((c) => c.id === category)?.image || cameraImg}
                        alt="Product preview"
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Deep multi-stop gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 pointer-events-none" />
                    </div>

                    {/* Top Row: Badges sitting on top of image */}
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Verified</span>
                        </span>
                        <span className="inline-block text-xs font-bold text-white bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full capitalize">
                          {category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/15 shadow-sm">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>5.0</span>
                        </div>
                        <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-sm">
                          <TagIcon className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Product details sitting at the bottom of the image */}
                    <div className="relative z-10 space-y-2.5 mt-auto">
                      <div>
                        <h3 className="font-extrabold text-base sm:text-lg leading-snug line-clamp-1 text-white drop-shadow-md font-display">
                          {title || "High-Resolution Tech Gear"}
                        </h3>
                        <p className="text-xs text-white/80 line-clamp-2 mt-1 leading-relaxed">
                          {description || "High-performance tech gear available for peer-to-peer rental in your area."}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-white/15 flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl sm:text-2xl font-black text-white font-display drop-shadow-sm">
                            ₹{price || "850"}
                          </span>
                          <span className="text-xs text-white/70 font-semibold">
                            /day
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-white/90">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-[130px] font-medium">
                            {user?.city || user?.address || "Bengaluru, KA"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Policy Card */}
                  <div className="p-3 rounded-xl border border-border/80 bg-secondary/40 text-xs text-muted-foreground flex items-center gap-2.5 shadow-sm">
                    <Shield className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Automatic ₹50,000 damage policy and verified lender coverage.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
