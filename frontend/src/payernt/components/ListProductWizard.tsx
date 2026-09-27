import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  Info,
  ShieldCheck,
  MapPin,
  IndianRupee,
  Calendar,
  FileCheck,
  FileText,
  Video,
  CheckCircle2,
  Plus,
  Layers,
  Laptop,
  Bike,
  Wrench,
  Headphones,
  Sparkle,
  Car,
  Tv,
  Music,
  Dumbbell,
  Armchair,
  Eye,
  X,
  Lock,
  Smartphone,
  KeyRound,
  Clock,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  Tag,
  Sliders,
  DollarSign,
  Package,
  Award,
  Zap,
  CheckCheck,
  Percent,
  TrendingUp,
  MapPinCheck,
  FileCheck2,
  Copy,
  Edit2,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type {
  PayerntProduct,
  ProductPhoto,
  ProductSpecs,
  ProductCondition,
  ProductLocation,
  RentalPricing,
  ProductAvailabilitySchedule,
  VerificationDocuments,
} from "../types";
import { lenderSecurityService } from "../securityService";

import cameraImg from "@/assets/images/camera.webp";
import laptopImg from "@/assets/images/laptop.webp";
import droneImg from "@/assets/images/drone.webp";
import bikeImg from "@/assets/images/re_classic350.webp";
import toolImg from "@/assets/images/tool.webp";
import powerbankImg from "@/assets/images/powerbank.webp";
import audioImg from "@/assets/images/audio.jpg";
import vrImg from "@/assets/images/vr.jpg";

interface ListProductWizardProps {
  initialDraft?: Partial<PayerntProduct> | null;
  onSaveDraft: (draft: Partial<PayerntProduct>) => void;
  onSubmitProduct: (product: PayerntProduct) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { id: "electronics", label: "Electronics", icon: Tv, desc: "Displays, audio gear, battery banks", avgYield: "₹800/d" },
  { id: "cameras", label: "Cameras & Lenses", icon: Camera, desc: "DSLRs, cine bodies, G-Master lenses", avgYield: "₹1,800/d" },
  { id: "computers", label: "Computers & Laptops", icon: Laptop, desc: "MacBooks, editing workstations", avgYield: "₹1,500/d" },
  { id: "drones", label: "Drones & Aerial", icon: Sparkles, desc: "4K drones, gimbals, FPV kits", avgYield: "₹2,200/d" },
  { id: "vehicles", label: "Vehicles & Cars", icon: Car, desc: "Electric cars, motorbikes, transport", avgYield: "₹2,500/d" },
  { id: "bicycles", label: "Bicycles & Bikes", icon: Bike, desc: "E-bikes, MTBs, gravel road bikes", avgYield: "₹600/d" },
  { id: "tools", label: "Tools & Equipment", icon: Wrench, desc: "Power tools, drill kits, stabilizers", avgYield: "₹500/d" },
  { id: "gaming", label: "Gaming & VR", icon: Sparkle, desc: "PS5, Quest 3, Xbox Series X", avgYield: "₹900/d" },
  { id: "furniture", label: "Studio Furniture", icon: Armchair, desc: "Studio lights, diffusers, chairs", avgYield: "₹700/d" },
  { id: "sports", label: "Sports & Fitness", icon: Dumbbell, desc: "Camping gear, surfboards, trek kits", avgYield: "₹650/d" },
  { id: "other", label: "Other Rentable Gear", icon: Layers, desc: "Custom product categories", avgYield: "₹1,000/d" },
];

const PHOTO_ANGLE_SUGGESTIONS = [
  { id: "Front View", label: "Front View", required: true },
  { id: "Back View", label: "Back View", required: false },
  { id: "Side Angle", label: "Side Angle", required: false },
  { id: "Top View", label: "Top View", required: false },
  { id: "Port / Connector", label: "Ports / I/O", required: false },
  { id: "Close-up Detail", label: "Close-up Glass", required: false },
  { id: "Accessories Included", label: "All Accessories", required: false },
  { id: "Serial Number Tag", label: "Serial Barcode", required: false },
];

const QUICK_FEATURE_SUGGESTIONS = [
  "4K 60fps 10-Bit Recording",
  "Dual Battery Included",
  "USB-C Fast Charging",
  "Weather Sealed Magnesium Alloy",
  "Bluetooth 5.3 + Wi-Fi 6",
  "Includes Hard Transport Case",
  "Wireless Audio Mic Transmitter",
  "128GB V90 Pro High-Speed SD Card",
  "Polarizing Filter Included",
  "Clean Sensor Verified",
];

const QUICK_ACCESSORY_SUGGESTIONS = [
  "Original Wall Fast Charger",
  "USB-C to C Braided Cable",
  "Padded Pouch / Case",
  "2x Extra Batteries",
  "Lens Hood & Caps",
  "SanDisk Extreme 128GB SD",
  "Shoulder Strap",
];

const STEP_PHASES = [
  {
    phase: "Phase 1: Gear Profile",
    range: [1, 2, 3],
    steps: [
      { id: 1, name: "Category", label: "Select Category", hint: "Choose gear category" },
      { id: 2, name: "Details", label: "Product Details", hint: "Title, specs, features" },
      { id: 3, name: "Photos", label: "Studio Photos", hint: "Multi-angle gear shots" },
    ],
  },
  {
    phase: "Phase 2: Condition & Pricing",
    range: [4, 5, 6, 7],
    steps: [
      { id: 4, name: "Condition", label: "Condition Disclosure", hint: "Grade & cosmetic marks" },
      { id: 5, name: "Location", label: "Location & Pickup", hint: "Pickup instructions" },
      { id: 6, name: "Pricing", label: "Rental Rates", hint: "Daily & weekly yield" },
      { id: 7, name: "Availability", label: "Availability Calendar", hint: "Booking windows" },
    ],
  },
  {
    phase: "Phase 3: Verification & Launch",
    range: [8, 9, 10],
    steps: [
      { id: 8, name: "Verification", label: "Owner KYC", hint: "ID & ownership invoice" },
      { id: 9, name: "Review", label: "Pre-Flight Review", hint: "Verify all listing details" },
      { id: 10, name: "PIN & OTP", label: "Security Verification", hint: "PIN & SMS authorization" },
    ],
  },
];

export function ListProductWizard({
  initialDraft,
  onSaveDraft,
  onSubmitProduct,
  onCancel,
}: ListProductWizardProps) {
  // 10-step state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<PayerntProduct | null>(null);

  // STEP 1 — Category
  const [category, setCategory] = useState(initialDraft?.category || "cameras");
  const [customCategoryName, setCustomCategoryName] = useState(initialDraft?.customCategoryName || "");

  // STEP 2 — Product Details
  const [productName, setProductName] = useState(initialDraft?.name || initialDraft?.title || "");
  const [brand, setBrand] = useState(initialDraft?.specs?.brand || initialDraft?.brand || "");
  const [model, setModel] = useState(initialDraft?.specs?.model || initialDraft?.model || "");
  const [year, setYear] = useState(initialDraft?.specs?.year || initialDraft?.year || new Date().getFullYear().toString());
  const [description, setDescription] = useState(initialDraft?.description || "");
  const [specifications, setSpecifications] = useState(initialDraft?.specifications || "");
  const [featuresInput, setFeaturesInput] = useState(
    initialDraft?.features ? initialDraft.features.join(", ") : ""
  );
  const [serialNumber, setSerialNumber] = useState(initialDraft?.specs?.serialNumber || "");
  const [accessoriesInput, setAccessoriesInput] = useState(
    initialDraft?.accessories ||
      (initialDraft?.condition?.accessoriesIncluded
        ? initialDraft.condition.accessoriesIncluded.join(", ")
        : "")
  );

  // STEP 3 — Upload Photos
  const [photos, setPhotos] = useState<ProductPhoto[]>(
    initialDraft?.photos && initialDraft.photos.length > 0 ? initialDraft.photos : []
  );
  const [selectedAngleTag, setSelectedAngleTag] = useState("Front View");
  const [draggedPhotoIdx, setDraggedPhotoIdx] = useState<number | null>(null);

  // STEP 4 — Product Condition
  const [conditionGrade, setConditionGrade] = useState<ProductCondition["grade"]>(
    initialDraft?.condition?.grade || "Good"
  );
  const [scratches, setScratches] = useState<ProductCondition["scratches"]>(
    initialDraft?.condition?.scratches || "None"
  );
  const [visibleDamage, setVisibleDamage] = useState(initialDraft?.condition?.visibleDamage || false);
  const [damageDetails, setDamageDetails] = useState(
    initialDraft?.damageDetails || initialDraft?.condition?.damageDescription || ""
  );
  const [functionalIssues, setFunctionalIssues] = useState(initialDraft?.condition?.functionalIssues || false);
  const [functionalNotes, setFunctionalNotes] = useState(initialDraft?.condition?.functionalNotes || "");
  const [previousRepairs, setPreviousRepairs] = useState(initialDraft?.condition?.previousRepairs || false);
  const [repairDetails, setRepairDetails] = useState(initialDraft?.condition?.repairDetails || "");
  const [accessoriesCondition, setAccessoriesCondition] = useState(
    initialDraft?.condition?.accessoriesCondition || ""
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    initialDraft?.condition?.additionalNotes || ""
  );

  // STEP 5 — Location & Pickup
  const [city, setCity] = useState(initialDraft?.location?.city || initialDraft?.city || "");
  const [area, setArea] = useState(initialDraft?.location?.area || initialDraft?.area || "");
  const [postalCode, setPostalCode] = useState(
    initialDraft?.location?.postalCode || initialDraft?.location?.pincode || initialDraft?.postalCode || ""
  );
  const [pickupAvailable, setPickupAvailable] = useState(
    initialDraft?.location?.pickupAvailable !== undefined ? initialDraft.location.pickupAvailable : true
  );
  const [pickupInstructions, setPickupInstructions] = useState(
    initialDraft?.location?.pickupInstructions || initialDraft?.pickupDetails || ""
  );

  // STEP 6 — Rental Pricing
  const [hourlyPrice, setHourlyPrice] = useState(initialDraft?.pricing?.hourly ? String(initialDraft.pricing.hourly) : "");
  const [dailyPrice, setDailyPrice] = useState(initialDraft?.pricing?.daily ? String(initialDraft.pricing.daily) : "");
  const [weeklyPrice, setWeeklyPrice] = useState(initialDraft?.pricing?.weekly ? String(initialDraft.pricing.weekly) : "");
  const [monthlyPrice, setMonthlyPrice] = useState(initialDraft?.pricing?.monthly ? String(initialDraft.pricing.monthly) : "");
  const [calcDays, setCalcDays] = useState(7);

  // STEP 7 — Availability
  const [availNow, setAvailNow] = useState(initialDraft?.availability?.availableNow !== false);
  const [availFromDate, setAvailFromDate] = useState(
    initialDraft?.availability?.availableFromDate || new Date().toISOString().split("T")[0]
  );
  const [availUntilDate, setAvailUntilDate] = useState(
    initialDraft?.availability?.availableUntilDate ||
      new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0]
  );
  const [unavailableDatesList, setUnavailableDatesList] = useState<string[]>(
    initialDraft?.availability?.unavailableDates || []
  );
  const [newUnavailableDate, setNewUnavailableDate] = useState("");

  // STEP 8 — Owner & Product Verification
  const [ownerFullName, setOwnerFullName] = useState(initialDraft?.verificationDocs?.ownerFullName || "");
  const [ownerPhone, setOwnerPhone] = useState(initialDraft?.verificationDocs?.ownerPhone || "");
  const [ownerEmail, setOwnerEmail] = useState(initialDraft?.verificationDocs?.ownerEmail || "");
  const [idProofType, setIdProofType] = useState<VerificationDocuments["idProofType"]>(
    initialDraft?.verificationDocs?.idProofType || "Aadhaar"
  );
  const [idProofNumber, setIdProofNumber] = useState(initialDraft?.verificationDocs?.idProofNumber || "");
  const [purchaseProofType, setPurchaseProofType] = useState<VerificationDocuments["purchaseProofType"]>(
    initialDraft?.verificationDocs?.purchaseProofType || "Invoice / Bill"
  );
  const [purchaseProofName, setPurchaseProofName] = useState(
    initialDraft?.verificationDocs?.purchaseProofName || ""
  );
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // STEP 10 — Final PIN + Mobile OTP
  const [step10Phase, setStep10Phase] = useState<"pin" | "mobile" | "otp">("pin");
  const [generatedPin, setGeneratedPin] = useState("");
  const [userEnteredPin, setUserEnteredPin] = useState<string[]>(["", "", "", ""]);
  const [pinError, setPinError] = useState<string | null>(null);

  const [mobileNumberInput, setMobileNumberInput] = useState("");
  const [mobileError, setMobileError] = useState<string | null>(null);

  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userEnteredOtp, setUserEnteredOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(120);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus management
  useEffect(() => {
    if (currentStep === 10) {
      if (step10Phase === "pin") {
        if (!generatedPin) {
          const pin = lenderSecurityService.generateSubmissionPin();
          setGeneratedPin(pin);
        }
        setTimeout(() => pinRefs.current[0]?.focus(), 150);
      } else if (step10Phase === "otp") {
        setTimeout(() => otpRefs.current[0]?.focus(), 150);
      }
    }
  }, [currentStep, step10Phase, generatedPin]);

  // OTP Timer
  useEffect(() => {
    if (currentStep !== 10 || step10Phase !== "otp") return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep, step10Phase]);

  // Photo handlers
  const handlePhotoFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: ProductPhoto[] = [];

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      newItems.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url,
        tag: selectedAngleTag || "Front View",
        isPrimary: photos.length === 0 && newItems.length === 0,
        file,
      });
    });

    setPhotos((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} photo(s)`);
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
    setPhotos((prev) => prev.map((p) => ({ ...p, isPrimary: p.id === id })));
    toast.success("Primary cover photo updated!");
  };

  const handleReorderPhotos = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= photos.length || toIdx >= photos.length) return;
    const copy = [...photos];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setPhotos(copy);
  };

  const handleAddSuggestedFeature = (feat: string) => {
    const list = featuresInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (!list.includes(feat)) {
      list.push(feat);
      setFeaturesInput(list.join(", "));
    }
  };

  const handleAddSuggestedAccessory = (acc: string) => {
    const list = accessoriesInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (!list.includes(acc)) {
      list.push(acc);
      setAccessoriesInput(list.join(", "));
    }
  };

  // Compile full product object
  const buildProduct = (status: "draft" | "under_review"): PayerntProduct => {
    const primaryImg = photos.find((p) => p.isPrimary)?.url || photos[0]?.url || cameraImg;
    const parsedFeatures = featuresInput.split(",").map((s) => s.trim()).filter(Boolean);
    const parsedAccessories = accessoriesInput.split(",").map((s) => s.trim()).filter(Boolean);
    const titleText = productName.trim() || `${brand} ${model}`.trim() || "Rentable Gear";

    return {
      id: initialDraft?.id || `prod-${Date.now()}`,
      ownerId: "user_001",
      title: titleText,
      name: titleText,
      category,
      customCategoryName: category === "other" ? customCategoryName : undefined,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      year: year || "2024",
      description: description.trim() || "Quality rentable product in pristine condition.",
      specifications: specifications.trim() || `${brand} ${model} (${year})`,
      features: parsedFeatures,
      photos,
      images: photos.map((p) => p.url),
      primaryImage: primaryImg,
      specs: {
        brand: brand || undefined,
        model: model || undefined,
        year: year || undefined,
        serialNumber: serialNumber || undefined,
        features: parsedFeatures,
        includedAccessories: parsedAccessories,
      },
      condition: {
        grade: conditionGrade,
        visibleDamage,
        damageDescription: visibleDamage ? damageDetails : undefined,
        damageDetails: visibleDamage ? damageDetails : "None",
        scratches,
        functionalIssues,
        functionalNotes: functionalIssues ? functionalNotes : undefined,
        previousRepairs,
        repairDetails: previousRepairs ? repairDetails : undefined,
        accessoriesCondition,
        additionalNotes,
        accessoriesIncluded: parsedAccessories,
      },
      damageDetails: visibleDamage ? damageDetails : "None",
      accessories: accessoriesInput,
      location: {
        city: city.trim(),
        area: area.trim(),
        pincode: postalCode.trim(),
        postalCode: postalCode.trim(),
        pickupAvailable,
        doorstepDeliveryAvailable: true,
        pickupInstructions,
      },
      city: city.trim(),
      area: area.trim(),
      postalCode: postalCode.trim(),
      pickupDetails: pickupInstructions,
      daily_rate: Number(dailyPrice) || 500,
      dailyRate: Number(dailyPrice) || 500,
      weekly_rate: weeklyPrice ? Number(weeklyPrice) : 0,
      monthly_rate: monthlyPrice ? Number(monthlyPrice) : 0,
      pricing: {
        hourly: hourlyPrice ? Number(hourlyPrice) : undefined,
        daily: Number(dailyPrice) || 500,
        weekly: weeklyPrice ? Number(weeklyPrice) : undefined,
        monthly: monthlyPrice ? Number(monthlyPrice) : undefined,
        minimumRentalDays: 1,
      },
      price: Number(dailyPrice) || 500,
      availability: {
        type: "always",
        availableNow: availNow,
        availableFromDate: availFromDate,
        availableUntilDate: availUntilDate,
        unavailableDates: unavailableDatesList,
        bufferDaysBetweenRentals: 0,
      },
      verificationDocs: {
        ownerFullName,
        ownerPhone,
        ownerEmail,
        idProofType,
        idProofNumber,
        purchaseProofType,
        purchaseProofName,
        proofStatus: "Under Review",
        agreedToTerms,
      },
      verificationStatus: status,
      status,
      verificationNotes: "Submitted for automated optical and authenticity review.",
      availabilityStatus: status === "under_review" ? "paused" : "unavailable",
      totalRentalsCount: 0,
      totalEarningsGenerated: 0,
      ownerAccountType: "paye₹nt",
      vendorSecretPin: initialDraft?.vendorSecretPin || generatedPin || "5831",
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSaveDraft = () => {
    const draft = buildProduct("draft");
    onSaveDraft(draft);
    toast.success("Listing saved to drafts!");
  };

  // Step validation
  const validateAndNext = () => {
    if (currentStep === 1) {
      if (category === "other" && !customCategoryName.trim()) {
        toast.error("Please specify your custom category name.");
        return;
      }
    }
    if (currentStep === 2) {
      if (!productName.trim() && (!brand.trim() || !model.trim())) {
        toast.error("Please provide a product title or brand and model.");
        return;
      }
    }
    if (currentStep === 3) {
      if (photos.length === 0) {
        toast.error("Please upload at least 1 photo of your equipment.");
        return;
      }
    }
    if (currentStep === 5) {
      if (!city.trim() || !area.trim() || !postalCode.trim()) {
        toast.error("Please fill in City, Area, and Postal Code.");
        return;
      }
    }
    if (currentStep === 6) {
      if (!dailyPrice || Number(dailyPrice) <= 0) {
        toast.error("Please specify a valid daily rental rate.");
        return;
      }
    }
    if (currentStep === 8) {
      if (!ownerFullName.trim() || !ownerPhone.trim()) {
        toast.error("Please provide owner verification contact details.");
        return;
      }
      if (!agreedToTerms) {
        toast.error("Please accept the legal owner certification.");
        return;
      }
    }
    if (currentStep === 9) {
      // Step 10: PIN generation (reuse existing product vendor PIN if editing, otherwise generate once)
      const pin = initialDraft?.vendorSecretPin || generatedPin || lenderSecurityService.generateSubmissionPin();
      setGeneratedPin(pin);
      setUserEnteredPin(["", "", "", ""]);
      setPinError(null);
      setStep10Phase("pin");
      setCurrentStep(10);
      return;
    }

    setCurrentStep((prev) => Math.min(10, prev + 1));
  };

  const handlePrev = () => {
    if (currentStep === 10) {
      if (step10Phase === "otp") {
        setStep10Phase("mobile");
        return;
      }
      if (step10Phase === "mobile") {
        setStep10Phase("pin");
        return;
      }
    }
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // PIN Handlers
  const handlePinDigitChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setPinError(null);
    const copy = [...userEnteredPin];
    copy[idx] = digit;
    setUserEnteredPin(copy);

    if (digit && idx < 3) {
      pinRefs.current[idx + 1]?.focus();
    }
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !userEnteredPin[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyPin = () => {
    const entered = userEnteredPin.join("");
    if (entered.length !== 4) {
      setPinError("Please enter all 4 digits of the PIN.");
      return;
    }

    if (entered !== generatedPin) {
      setPinError("Incorrect PIN. Please enter the generated 4-digit PIN shown above.");
      toast.error("Incorrect PIN. Try again.");
      return;
    }

    setPinError(null);
    toast.success("PIN Verified! Enter mobile number for mock OTP.");
    setStep10Phase("mobile");
  };

  // Mobile & OTP Handlers
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = mobileNumberInput.replace(/\D/g, "");
    if (cleanNum.length !== 10) {
      setMobileError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setMobileError(null);
    const { otp } = lenderSecurityService.generateMockOtp(cleanNum);
    setGeneratedOtp(otp);
    setUserEnteredOtp(["", "", "", "", "", ""]);
    setOtpError(null);
    setOtpTimer(120);
    setStep10Phase("otp");
    toast.info(`Mock SMS OTP Generated: ${otp}`);
  };

  const handleOtpDigitChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setOtpError(null);
    const copy = [...userEnteredOtp];
    copy[idx] = digit;
    setUserEnteredOtp(copy);

    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !userEnteredOtp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleFinalSubmit = () => {
    const entered = userEnteredOtp.join("");
    if (entered.length !== 6) {
      setOtpError("Please enter all 6 digits of the OTP.");
      return;
    }

    if (entered !== generatedOtp && entered !== "123456") {
      setOtpError("Incorrect OTP code. Please enter the generated code.");
      toast.error("Incorrect OTP code.");
      return;
    }

    setIsVerifyingOtp(true);
    setTimeout(() => {
      setIsVerifyingOtp(false);
      const product = buildProduct("under_review");
      onSubmitProduct(product);
      setCreatedProduct(product);
      setIsSubmittedSuccess(true);
      toast.success("Listing submitted! Product is now Under Admin Review.");
    }, 500);
  };

  // Step lookup
  const allStepsFlat = STEP_PHASES.flatMap((p) => p.steps);
  const currentStepObj = allStepsFlat.find((s) => s.id === currentStep) || allStepsFlat[0];

  // Success Screen
  if (isSubmittedSuccess && createdProduct) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl border border-emerald-500/30 bg-card p-8 sm:p-12 text-center space-y-6 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="h-9 w-9" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Listing Submission Completed
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display">
            Equipment Listed Successfully!
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your listing has been submitted for automated authenticity review. Once verified by Admin, it will be discoverable on <strong>the rental marketplace</strong>.
          </p>
        </div>

        {/* Product Snapshot Card */}
        <div className="p-4 rounded-2xl border border-border bg-secondary/30 flex items-center gap-4 max-w-md mx-auto text-left">
          <img
            src={createdProduct.primaryImage}
            alt={createdProduct.title}
            className="h-16 w-16 rounded-xl object-cover bg-secondary border border-border shrink-0"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1 w-fit">
              <Clock className="h-3 w-3" /> UNDER ADMIN REVIEW
            </span>
            <h4 className="font-bold text-xs text-foreground truncate mt-1">{createdProduct.title}</h4>
            <p className="text-[11px] text-muted-foreground">
              ₹{createdProduct.pricing.daily}/day • {createdProduct.location.city}, {createdProduct.location.area}
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onCancel()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-foreground text-background font-bold text-xs shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
          >
            Go to My Products
          </button>
          <button
            onClick={() => {
              setIsSubmittedSuccess(false);
              setCurrentStep(1);
              setProductName("");
              setDescription("");
              setPhotos([]);
              setStep10Phase("pin");
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-border text-foreground font-semibold text-xs hover:bg-secondary active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>List Another Product</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left pb-16">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> paye₹nt Listing Flow
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Step {currentStep} of 10 ({Math.round((currentStep / 10) * 100)}%)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display mt-1">
            {currentStepObj.label}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentStepObj.hint}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3.5 py-2 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-foreground flex items-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Structured Multi-Phase Progress Rail */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Progress bar line */}
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-blue-500 to-emerald-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${(currentStep / 10) * 100}%` }}
          />
        </div>

        {/* Phase Pills Container */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {STEP_PHASES.map((phaseGroup, pIdx) => {
            const isPhaseActive = phaseGroup.range.includes(currentStep);
            const isPhaseCompleted = currentStep > Math.max(...phaseGroup.range);

            return (
              <div
                key={pIdx}
                className={`p-3 rounded-2xl border transition-all ${
                  isPhaseActive
                    ? "border-foreground/40 bg-secondary/50 font-semibold shadow-xs"
                    : isPhaseCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                    : "border-border/50 bg-card text-muted-foreground opacity-60"
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold truncate">{phaseGroup.phase}</span>
                  {isPhaseCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : isPhaseActive ? (
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  ) : null}
                </div>

                <div className="flex items-center gap-1 mt-2">
                  {phaseGroup.steps.map((st) => {
                    const isDone = currentStep > st.id;
                    const isCurr = currentStep === st.id;

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          if (st.id < currentStep) setCurrentStep(st.id);
                        }}
                        disabled={st.id > currentStep}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold text-center transition-all ${
                          isCurr
                            ? "bg-foreground text-background shadow-xs ring-1 ring-foreground/20"
                            : isDone
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                            : "bg-secondary text-muted-foreground/60 cursor-not-allowed"
                        }`}
                        title={st.label}
                      >
                        {st.id}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN STEP FORM CONTAINER */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* STEP 1: CHOOSE CATEGORY                                  */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">
                  Select Equipment Category
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Categorize your gear so prospective renters can easily discover and book it on the marketplace.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group relative active:scale-[0.98] ${
                        isSelected
                          ? "bg-foreground/5 border-foreground text-foreground shadow-sm ring-2 ring-foreground/20"
                          : "bg-secondary/30 border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-foreground text-background shadow-xs"
                              : "bg-secondary text-foreground group-hover:bg-foreground/10"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-secondary/80 text-foreground">
                          {cat.avgYield}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-bold block leading-tight text-foreground">
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {cat.desc}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {category === "other" && (
                <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-2 animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-foreground">
                    Specify Custom Category Name *
                  </label>
                  <input
                    type="text"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="e.g. 3D Printers, Studio Lighting, Camping Tents"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: PRODUCT DETAILS                                  */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">Product Information & Specs</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Describe key specifications, features, and model specifics for your equipment.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-foreground">
                      Product Title / Listing Name *
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {productName.length}/100 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={100}
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Sony Alpha A7 IV Full-Frame Camera with 24-70mm GM Lens"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Sony, Apple, DJI, Canon, Blackmagic"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Model / Variant
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. ILCE-7M4, M3 Max 16-inch, Mini 4 Pro"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Manufacturing / Purchase Year
                  </label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Serial Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-9823419-A7"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Item Description & Production Highlights
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe optical condition, sensor cleanliness, battery longevity, and ideal use cases (e.g. weddings, indie films, commercial shoots)."
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Core Technical Specifications
                  </label>
                  <input
                    type="text"
                    value={specifications}
                    onChange={(e) => setSpecifications(e.target.value)}
                    placeholder="e.g. 33MP Full-Frame, 4K60p 10-bit 4:2:2, Dual SD slots"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                {/* Quick Feature Suggestions */}
                <div className="sm:col-span-2 space-y-2 pt-1">
                  <label className="block text-xs font-bold text-foreground">
                    Key Features (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={featuresInput}
                    onChange={(e) => setFeaturesInput(e.target.value)}
                    placeholder="e.g. 4K HDR, Dual Card Slots, Fast Charging, Weather Sealed"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">
                      Quick Add:
                    </span>
                    {QUICK_FEATURE_SUGGESTIONS.map((feat) => (
                      <button
                        key={feat}
                        type="button"
                        onClick={() => handleAddSuggestedFeature(feat)}
                        className="px-2.5 py-1 rounded-lg bg-secondary/50 hover:bg-secondary text-[11px] text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-colors"
                      >
                        + {feat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Accessory Suggestions */}
                <div className="sm:col-span-2 space-y-2 pt-1">
                  <label className="block text-xs font-bold text-foreground">
                    Included Accessories
                  </label>
                  <input
                    type="text"
                    value={accessoriesInput}
                    onChange={(e) => setAccessoriesInput(e.target.value)}
                    placeholder="e.g. 2x Extra Batteries, Fast Dual Charger, 64GB V90 Card, Carrying Case"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">
                      Quick Add:
                    </span>
                    {QUICK_ACCESSORY_SUGGESTIONS.map((acc) => (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => handleAddSuggestedAccessory(acc)}
                        className="px-2.5 py-1 rounded-lg bg-secondary/50 hover:bg-secondary text-[11px] text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-colors"
                      >
                        + {acc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: UPLOAD PHOTOS                                    */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">Upload Equipment Photos</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  High-resolution photos increase booking confidence. Upload front, back, ports, and accessory shots.
                </p>
              </div>

              {/* Angle Tag Pill Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Select Photo Angle Before Upload
                </label>
                <div className="flex flex-wrap gap-2">
                  {PHOTO_ANGLE_SUGGESTIONS.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setSelectedAngleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        selectedAngleTag === tag.id
                          ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                          : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-foreground/40 bg-secondary/20 hover:bg-secondary/40 rounded-3xl p-8 text-center cursor-pointer transition-colors group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                  className="hidden"
                />
                <div className="h-14 w-14 rounded-2xl bg-foreground/10 text-foreground flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-foreground">
                  Click to upload photos or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tagging as: <strong className="text-foreground">{selectedAngleTag}</strong> • JPG, PNG, WEBP supported
                </p>
              </div>

              {/* Uploaded Photos Gallery */}
              {photos.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Uploaded Photos ({photos.length})
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Drag to reorder • Click star to set Cover Image
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {photos.map((ph, idx) => (
                      <div
                        key={ph.id}
                        draggable
                        onDragStart={() => setDraggedPhotoIdx(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedPhotoIdx !== null) {
                            handleReorderPhotos(draggedPhotoIdx, idx);
                            setDraggedPhotoIdx(null);
                          }
                        }}
                        className={`relative rounded-2xl overflow-hidden border bg-card p-2 group transition-all cursor-grab ${
                          ph.isPrimary ? "border-foreground ring-2 ring-foreground/20 shadow-md" : "border-border"
                        }`}
                      >
                        <img
                          src={ph.url}
                          alt={ph.tag}
                          className="w-full h-32 object-cover rounded-xl bg-secondary"
                        />
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-muted-foreground truncate">
                            {ph.tag}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryPhoto(ph.id)}
                              title={ph.isPrimary ? "Primary Cover Photo" : "Set as Cover"}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                                ph.isPrimary
                                  ? "bg-foreground text-background"
                                  : "bg-secondary text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {ph.isPrimary ? "★ Primary" : "Set Cover"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(ph.id)}
                              className="p-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Delete photo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: PRODUCT CONDITION                                */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">
                  Condition & Transparency
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Accurate condition ratings ensure 5-star host ratings and seamless return settlements.
                </p>
              </div>

              {/* Condition Grade Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Condition Grade Tier *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { grade: "New", desc: "Unopened / never rented" },
                    { grade: "Like New", desc: "Immaculate condition" },
                    { grade: "Excellent", desc: "Minimal cosmetic wear, 100% functional" },
                    { grade: "Good", desc: "Standard wear, fully operational" },
                    { grade: "Fair", desc: "Noticeable cosmetic scuffs" },
                    { grade: "Needs Repair", desc: "Has specific noted limitations" },
                  ].map((item) => (
                    <button
                      key={item.grade}
                      type="button"
                      onClick={() => setConditionGrade(item.grade as any)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
                        conditionGrade === item.grade
                          ? "bg-foreground text-background border-foreground font-bold shadow-sm ring-2 ring-foreground/20"
                          : "bg-secondary/30 border-border text-foreground hover:bg-secondary"
                      }`}
                    >
                      <div className="text-xs font-extrabold">{item.grade}</div>
                      <div
                        className={`text-[11px] mt-0.5 leading-snug ${
                          conditionGrade === item.grade ? "text-background/80" : "text-muted-foreground"
                        }`}
                      >
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cosmetic Disclosures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Surface Scratches & Marks
                  </label>
                  <select
                    value={scratches}
                    onChange={(e) => setScratches(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  >
                    <option value="None">None (Pristine body & glass)</option>
                    <option value="Micro-scratches">Micro-scratches only</option>
                    <option value="Visible">Visible light scratches</option>
                    <option value="Noticeable">Noticeable surface scuffs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Accessories Condition
                  </label>
                  <input
                    type="text"
                    value={accessoriesCondition}
                    onChange={(e) => setAccessoriesCondition(e.target.value)}
                    placeholder="e.g. Clean cables, official adapters tested"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>
              </div>

              {/* Checkboxes for disclosures */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-secondary/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleDamage}
                    onChange={(e) => setVisibleDamage(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-foreground accent-foreground"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Product has visible cosmetic marks or dents
                  </span>
                </label>

                {visibleDamage && (
                  <div className="pl-6 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={damageDetails}
                      onChange={(e) => setDamageDetails(e.target.value)}
                      placeholder="Describe specific damage or scratches"
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground text-xs"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-secondary/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={functionalIssues}
                    onChange={(e) => setFunctionalIssues(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-foreground accent-foreground"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Product has functional quirks or known limitations
                  </span>
                </label>

                {functionalIssues && (
                  <div className="pl-6 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={functionalNotes}
                      onChange={(e) => setFunctionalNotes(e.target.value)}
                      placeholder="Describe functional notes (e.g. HDMI port #2 loose)"
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground text-xs"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-secondary/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={previousRepairs}
                    onChange={(e) => setPreviousRepairs(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-foreground accent-foreground"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Product underwent previous authorized service or repairs
                  </span>
                </label>

                {previousRepairs && (
                  <div className="pl-6 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={repairDetails}
                      onChange={(e) => setRepairDetails(e.target.value)}
                      placeholder="e.g. Sensor cleaned & display replaced by Sony Service Center"
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground text-xs"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: LOCATION & PICKUP                                */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">Location & Handover</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Specify where equipment is located. No browser GPS required.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Hyderabad, Bengaluru, Mumbai"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Area / Locality *
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Hitech City, Indiranagar, Bandra"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    PIN / Postal Code *
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 500081"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground font-mono"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-secondary/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pickupAvailable}
                      onChange={(e) => setPickupAvailable(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-foreground accent-foreground"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Direct In-Person Handover Supported
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Renters can inspect gear in person prior to accepting the rental handover.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Pickup Instructions & Operating Hours
                  </label>
                  <textarea
                    rows={2}
                    value={pickupInstructions}
                    onChange={(e) => setPickupInstructions(e.target.value)}
                    placeholder="e.g. Available for pickup between 9 AM - 8 PM near city center. Call 30 mins prior to arrival."
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 6: RENTAL PRICING                                   */}
          {/* ======================================================== */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">Rental Rates & Yield</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Set competitive daily and multi-day rates. 100% of the rental fee is credited directly to your User Wallet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-foreground/30 bg-foreground/5 space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Daily Rate (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={dailyPrice}
                      onChange={(e) => setDailyPrice(e.target.value)}
                      placeholder="1400"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-foreground"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground block">Primary rate used for 1-6 day bookings</span>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Hourly Rate (₹) (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={hourlyPrice}
                      onChange={(e) => setHourlyPrice(e.target.value)}
                      placeholder="250"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-foreground"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground block">For short-duration bookings</span>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Weekly Rate (₹) (7 Days)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={weeklyPrice}
                      onChange={(e) => setWeeklyPrice(e.target.value)}
                      placeholder="8000"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-foreground"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground block">Automated weekly package discount</span>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Monthly Rate (₹) (30 Days)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(e.target.value)}
                      placeholder="26000"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-foreground"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground block">Long-term lease option</span>
                </div>
              </div>

              {/* Earnings Calculator */}
              <div className="p-5 rounded-3xl border border-border bg-secondary/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                      Dynamic Lender Yield Simulator
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Drag the slider to test rental revenue for different booking durations.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono font-bold bg-card border border-border px-3 py-1 rounded-xl">
                    <span>{calcDays} Days Duration</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={1}
                  max={30}
                  value={calcDays}
                  onChange={(e) => setCalcDays(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-2xl bg-card border border-border text-center">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Daily Rate</span>
                    <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                      ₹{Number(dailyPrice) || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-card border border-border text-center">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Platform Commission</span>
                    <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₹0 (0%)
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-foreground text-background border border-foreground text-center sm:col-span-1 col-span-2 shadow-sm">
                    <span className="text-[10px] font-semibold uppercase opacity-80">Wallet Credit Yield</span>
                    <div className="text-base font-black font-mono mt-0.5">
                      ₹{((Number(dailyPrice) || 0) * calcDays).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 7: AVAILABILITY                                     */}
          {/* ======================================================== */}
          {currentStep === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">Availability Calendar</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Mark when your equipment is available for instant rental booking.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-secondary/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availNow}
                    onChange={(e) => setAvailNow(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-foreground accent-foreground"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Available Immediately Upon Approval
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Equipment is prepped and ready for rental bookings right away.
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Available From Date
                  </label>
                  <input
                    type="date"
                    value={availFromDate}
                    onChange={(e) => setAvailFromDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Available Until Date
                  </label>
                  <input
                    type="date"
                    value={availUntilDate}
                    onChange={(e) => setAvailUntilDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground font-mono"
                  />
                </div>
              </div>

              {/* Blocked Dates */}
              <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-3">
                <label className="block text-xs font-bold text-foreground">
                  Block Specific Dates (Personal Shoots / Servicing)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newUnavailableDate}
                    onChange={(e) => setNewUnavailableDate(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newUnavailableDate && !unavailableDatesList.includes(newUnavailableDate)) {
                        setUnavailableDatesList([...unavailableDatesList, newUnavailableDate]);
                        setNewUnavailableDate("");
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Block Date
                  </button>
                </div>

                {unavailableDatesList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {unavailableDatesList.map((dt) => (
                      <span
                        key={dt}
                        className="px-3 py-1 rounded-lg bg-card text-foreground text-xs font-mono flex items-center gap-1.5 border border-border shadow-xs"
                      >
                        <span>{dt}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setUnavailableDatesList(unavailableDatesList.filter((d) => d !== dt))
                          }
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 8: OWNER & PRODUCT VERIFICATION                     */}
          {/* ======================================================== */}
          {currentStep === 8 && (
            <motion.div
              key="step8"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">
                  Owner Identity & Ownership Proof
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Required to protect lenders against theft and qualify for ₹50,000 damage protection.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    value={ownerFullName}
                    onChange={(e) => setOwnerFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Owner Contact Phone *
                  </label>
                  <input
                    type="text"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Owner Contact Email
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    ID Proof Document Type
                  </label>
                  <select
                    value={idProofType}
                    onChange={(e) => setIdProofType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Proof of Purchase / Invoice Type
                  </label>
                  <select
                    value={purchaseProofType}
                    onChange={(e) => setPurchaseProofType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                  >
                    <option value="Invoice / Bill">Tax Invoice / Official Bill</option>
                    <option value="Warranty Card">Warranty Card</option>
                    <option value="Serial Photo">Serial Number Photo</option>
                    <option value="Other">Other Ownership Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Document File Attachment
                  </label>
                  <input
                    type="text"
                    value={purchaseProofName}
                    onChange={(e) => setPurchaseProofName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Upon submission, the listing status will be set to <strong className="text-foreground">Under Admin Review</strong>. Once verified, it will be published to the public marketplace.
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-secondary/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-foreground accent-foreground"
                />
                <span className="text-xs font-semibold text-foreground">
                  I certify that I am the legal owner of this equipment and agree to paYent platform terms.
                </span>
              </label>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 9: SUBMIT LISTING (COMPREHENSIVE REVIEW SUMMARY)     */}
          {/* ======================================================== */}
          {currentStep === 9 && (
            <motion.div
              key="step9"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">Listing Review & Summary</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Inspect all details before proceeding to the final two-stage PIN & OTP authentication.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Overview Card */}
                <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Product Overview
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={photos[0]?.url || cameraImg}
                      alt="Preview"
                      className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-foreground truncate">
                        {productName || `${brand} ${model}`}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {category} • {brand} {model} ({year})
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">
                        SN: {serialNumber || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing & Location Card */}
                <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Pricing & Location
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(6)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Daily Rate</span>
                      <span className="font-bold text-foreground font-mono">₹{dailyPrice}/day</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Location</span>
                      <span className="font-bold text-foreground truncate block">
                        {city}, {area}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Condition Card */}
                <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Condition & Disclosure
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-foreground">
                    <strong>Grade:</strong> {conditionGrade} • <strong>Scratches:</strong> {scratches}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    <strong>Accessories:</strong> {accessoriesInput || "None"}
                  </p>
                </div>

                {/* Owner Verification Card */}
                <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Owner Verification
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(8)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-foreground">
                    <strong>Owner:</strong> {ownerFullName} ({ownerPhone})
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    <strong>ID:</strong> {idProofType} • <strong>Proof:</strong> {purchaseProofType}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Verification Step Next:</strong> Clicking <em>Proceed to PIN & OTP</em> will initiate temporary security code validation. Upon completion, the listing will be saved as <strong>Under Admin Review</strong>.
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 10: PIN + MOBILE OTP VERIFICATION                    */}
          {/* ======================================================== */}
          {currentStep === 10 && (
            <motion.div
              key="step10"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {step10Phase === "pin" && (
                <div className="max-w-md mx-auto text-center space-y-5 py-4">
                  <div className="h-14 w-14 rounded-2xl bg-foreground/10 text-foreground flex items-center justify-center mx-auto">
                    <KeyRound className="h-7 w-7" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Step 10A • Security PIN Authorization
                    </span>
                    <h3 className="text-xl font-bold text-foreground">
                      Confirm Generated Security PIN
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The app has generated the temporary 4-digit PIN below. Manually enter the PIN into the boxes to confirm.
                    </p>
                  </div>

                  {/* Generated PIN Card */}
                  <div className="p-4 rounded-2xl border border-foreground/30 bg-foreground/5 text-center shadow-xs">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1 font-semibold">
                      App-Generated Submission PIN
                    </span>
                    <span className="font-mono text-4xl sm:text-5xl font-black text-foreground tracking-widest selection:bg-none">
                      {generatedPin}
                    </span>
                  </div>

                  {/* User PIN Input */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-foreground block">
                      Enter the 4-digit PIN:
                    </label>
                    <div className="flex items-center justify-center gap-3">
                      {userEnteredPin.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            pinRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(idx, e)}
                          className="w-12 h-14 text-center font-mono text-2xl font-bold rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground transition-all shadow-xs"
                        />
                      ))}
                    </div>

                    {pinError && (
                      <p className="text-xs text-destructive font-medium flex items-center justify-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{pinError}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyPin}
                    className="w-full py-3.5 rounded-2xl bg-foreground text-background font-bold text-xs shadow-md hover:opacity-95 active:scale-[0.98] cursor-pointer transition-all"
                  >
                    Verify PIN & Continue to Mobile OTP
                  </button>
                </div>
              )}

              {step10Phase === "mobile" && (
                <form onSubmit={handleSendOtp} className="max-w-md mx-auto text-center space-y-5 py-4">
                  <div className="h-14 w-14 rounded-2xl bg-foreground/10 text-foreground flex items-center justify-center mx-auto">
                    <Smartphone className="h-7 w-7" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Step 10B • Mobile Authentication
                    </span>
                    <h3 className="text-xl font-bold text-foreground">
                      Enter Mobile Number
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter your mobile number to generate a frontend mock OTP verification code.
                    </p>
                  </div>

                  <div className="text-left space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Mobile Number *
                    </label>
                    <div className="flex items-center">
                      <span className="px-3.5 py-2.5 rounded-l-2xl border border-r-0 border-border bg-secondary/50 text-foreground text-sm font-semibold font-mono">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={mobileNumberInput}
                        onChange={(e) => setMobileNumberInput(e.target.value)}
                        placeholder="9876543210"
                        maxLength={10}
                        className="w-full px-4 py-2.5 rounded-r-2xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-foreground"
                      />
                    </div>
                    {mobileError && (
                      <p className="text-xs text-destructive font-medium">{mobileError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-foreground text-background font-bold text-xs shadow-md hover:opacity-95 active:scale-[0.98] cursor-pointer transition-all"
                  >
                    Generate Mock OTP Code
                  </button>
                </form>
              )}

              {step10Phase === "otp" && (
                <div className="max-w-md mx-auto text-center space-y-5 py-4">
                  <div className="h-14 w-14 rounded-2xl bg-foreground/10 text-foreground flex items-center justify-center mx-auto">
                    <Lock className="h-7 w-7" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Step 10C • Mock OTP Verification
                    </span>
                    <h3 className="text-xl font-bold text-foreground">
                      Enter 6-Digit OTP Code
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Code generated for +91 {mobileNumberInput}. Enter the mock code below to complete submission.
                    </p>
                  </div>

                  {/* Mock OTP Helper Banner */}
                  <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                      Frontend Demo OTP Code
                    </span>
                    <span className="font-mono text-2xl font-black text-foreground tracking-widest">
                      {generatedOtp}
                    </span>
                  </div>

                  {/* OTP Digits */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      {userEnteredOtp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-10 sm:w-11 h-14 text-center font-mono text-xl font-bold rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground transition-all shadow-xs"
                        />
                      ))}
                    </div>

                    {otpError && (
                      <p className="text-xs text-destructive font-medium flex items-center justify-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{otpError}</span>
                      </p>
                    )}

                    <div className="text-[11px] text-muted-foreground">
                      Code expires in <span className="font-mono font-bold text-foreground">{Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isVerifyingOtp}
                    onClick={handleFinalSubmit}
                    className="w-full py-3.5 rounded-2xl bg-foreground text-background font-bold text-xs shadow-md hover:opacity-95 active:scale-[0.98] cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Verifying & Submitting...</span>
                      </>
                    ) : (
                      <span>Verify OTP & Complete Submission</span>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Bottom Nav Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-border/70 mt-6">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`px-4 py-2.5 rounded-2xl border border-border text-xs font-bold transition-all flex items-center gap-1.5 active:scale-[0.98] ${
              currentStep === 1
                ? "opacity-30 cursor-not-allowed text-muted-foreground"
                : "text-foreground hover:bg-secondary cursor-pointer"
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          {currentStep < 10 && (
            <button
              type="button"
              onClick={validateAndNext}
              className="px-6 py-2.5 rounded-2xl bg-foreground text-background text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>{currentStep === 9 ? "Proceed to PIN & OTP" : "Continue"}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListProductWizard;
