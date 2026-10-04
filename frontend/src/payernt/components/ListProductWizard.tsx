import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Save,
  Trash2,
  Info,
  ShieldCheck,
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  CheckCircle2,
  Plus,
  Laptop,
  Bike,
  Wrench,
  Headphones,
  Car,
  Tv,
  Dumbbell,
  Armchair,
  Eye,
  X,
  Clock,
  ArrowRight,
  AlertCircle,
  Package,
  CheckCheck,
  Edit2,
  ImagePlus,
  RefreshCw,
  Video,
  Play,
  Navigation,
  Layers,
  Sparkle,
  Sliders,
  IndianRupee,
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
} from "../types";
import { usePayerntStore } from "../store";
import { payerntApi } from "../payerntApiService";

interface ListProductWizardProps {
  initialDraft?: Partial<PayerntProduct> | null;
  onSaveDraft: (draft: Partial<PayerntProduct>) => void;
  onSubmitProduct: (product: PayerntProduct) => void;
  onCancel: () => void;
}

// 12 Core Categories with comprehensive metadata: Brands, 1-Click Popular Presets, Spec Fields & Tailored Placeholders
export interface CategoryConfig {
  id: string;
  label: string;
  icon: any;
  minPrice: number;
  maxPrice: number;
  brands: string[];
  presets: {
    title: string;
    brand: string;
    model: string;
    heightCm: string;
    widthCm: string;
    weightKg: string;
    description: string;
    specs: {
      lensMount?: string;
      sensorResolution?: string;
      processor?: string;
      ram?: string;
      storage?: string;
      flightTime?: string;
      batteryCapacity?: string;
      engineCc?: string;
      mileage?: string;
      powerWattage?: string;
      connectivity?: string;
    };
  }[];
  specFields: {
    id: "lensMount" | "sensorResolution" | "processor" | "ram" | "storage" | "flightTime" | "batteryCapacity" | "engineCc" | "mileage" | "powerWattage" | "connectivity";
    label: string;
    placeholder: string;
    span?: string;
  }[];
  titlePlaceholder: string;
  brandPlaceholder: string;
  modelPlaceholder: string;
  descPlaceholder: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "cameras",
    label: "Cameras & Optics",
    icon: Camera,
    minPrice: 800,
    maxPrice: 2400,
    brands: ["Sony", "Canon", "Nikon", "Fujifilm", "Blackmagic", "Panasonic", "RED", "DJI", "GoPro", "Leica"],
    presets: [
      {
        title: "Sony Alpha A7 IV Mirrorless Camera",
        brand: "Sony",
        model: "ILCE-7M4",
        heightCm: "9.6",
        widthCm: "13.1",
        weightKg: "0.65",
        description: "Full-frame 33MP hybrid mirrorless camera with 4K 60p 10-bit recording, advanced real-time AF, and 5-axis in-body image stabilization.",
        specs: {
          lensMount: "Sony E-Mount",
          sensorResolution: "33MP Full-Frame Exmor R",
          connectivity: "4K 60p 10-bit 4:2:2, HDMI, USB-C 3.2, Dual SD/CFexpress",
        },
      },
      {
        title: "Canon EOS R5 Full-Frame Camera",
        brand: "Canon",
        model: "EOS R5",
        heightCm: "9.8",
        widthCm: "13.8",
        weightKg: "0.74",
        description: "Flagship 45MP full-frame mirrorless camera capable of internal 8K RAW video recording with Dual Pixel CMOS AF II.",
        specs: {
          lensMount: "Canon RF",
          sensorResolution: "45MP Full-Frame Dual Pixel",
          connectivity: "8K RAW / 4K 120p, Dual CFexpress B/SD UHS-II",
        },
      },
      {
        title: "Fujifilm X-T5 Mirrorless Camera",
        brand: "Fujifilm",
        model: "X-T5",
        heightCm: "9.1",
        widthCm: "13.0",
        weightKg: "0.56",
        description: "Compact, retro-dial mirrorless camera featuring 40.2MP X-Trans sensor, Film Simulation modes, and 6.2K video.",
        specs: {
          lensMount: "Fujifilm X-Mount",
          sensorResolution: "40.2MP APS-C X-Trans HR",
          connectivity: "6.2K 30p, Micro HDMI, Dual SD UHS-II",
        },
      },
      {
        title: "Blackmagic Pocket Cinema Camera 6K Pro",
        brand: "Blackmagic",
        model: "BMPCC 6K Pro",
        heightCm: "12.3",
        widthCm: "18.0",
        weightKg: "1.24",
        description: "Cinema-grade Super 35 HDR sensor camera with built-in motorized ND filters, dual native ISO, and 6K Blackmagic RAW.",
        specs: {
          lensMount: "Canon EF Mount",
          sensorResolution: "6144 x 3456 Super 35 HDR",
          connectivity: "6K 60p Blackmagic RAW, Dual Mini XLR, USB-C Recording",
        },
      },
    ],
    specFields: [
      { id: "lensMount", label: "Lens Mount", placeholder: "e.g. Sony E-Mount / Canon RF / Nikon Z" },
      { id: "sensorResolution", label: "Sensor Resolution", placeholder: "e.g. 33MP Full-Frame / 45MP BSI / 24MP APS-C" },
      { id: "connectivity", label: "Max Video & Ports", placeholder: "e.g. 4K 60p 10-bit 4:2:2, HDMI, Dual SD" },
    ],
    titlePlaceholder: "e.g. Sony Alpha A7 IV Mirrorless Camera",
    brandPlaceholder: "e.g. Sony",
    modelPlaceholder: "e.g. ILCE-7M4",
    descPlaceholder: "Describe optical condition, sensor cleanliness, shutter count, and included accessories...",
  },
  {
    id: "computers",
    label: "Computers & Laptops",
    icon: Laptop,
    minPrice: 1000,
    maxPrice: 3000,
    brands: ["Apple", "Dell", "Lenovo", "ASUS", "HP", "Razer", "MSI", "Acer", "Microsoft"],
    presets: [
      {
        title: "Apple MacBook Pro 16\" M3 Max",
        brand: "Apple",
        model: "A2991",
        heightCm: "1.68",
        widthCm: "35.5",
        weightKg: "2.16",
        description: "16-inch Liquid Retina XDR laptop with Apple M3 Max (16-core CPU, 40-core GPU), 64GB Unified Memory, and 1TB SSD for heavy 3D rendering.",
        specs: {
          processor: "Apple M3 Max (16-core CPU)",
          ram: "64GB Unified Memory",
          storage: "1TB PCIe NVMe SSD",
          connectivity: "40-core GPU, 3x Thunderbolt 4, HDMI, MagSafe 3",
        },
      },
      {
        title: "Dell XPS 15 9530 OLED Creator Laptop",
        brand: "Dell",
        model: "XPS 15 9530",
        heightCm: "1.8",
        widthCm: "34.4",
        weightKg: "1.92",
        description: "15.6-inch 3.5K OLED touchscreen workstation powered by Intel Core i7-13700H and NVIDIA RTX 4060 graphics.",
        specs: {
          processor: "Intel Core i7-13700H (14 Cores)",
          ram: "32GB DDR5 5200MHz",
          storage: "1TB M.2 PCIe 4.0 SSD",
          connectivity: "NVIDIA GeForce RTX 4060 8GB, 2x Thunderbolt 4",
        },
      },
      {
        title: "Lenovo Legion Pro 7i Gen 8",
        brand: "Lenovo",
        model: "Legion Pro 7i",
        heightCm: "2.6",
        widthCm: "36.3",
        weightKg: "2.8",
        description: "High-end 16-inch 240Hz WQXGA gaming laptop featuring Intel Core i9-13900HX and NVIDIA RTX 4080 12GB.",
        specs: {
          processor: "Intel Core i9-13900HX (24 Cores)",
          ram: "32GB DDR5 5600MHz",
          storage: "2TB NVMe PCIe 4.0 SSD",
          connectivity: "NVIDIA RTX 4080 12GB 175W TGP, HDMI 2.1",
        },
      },
    ],
    specFields: [
      { id: "processor", label: "Processor / CPU", placeholder: "e.g. Apple M3 Max / Intel Core i9-13900H" },
      { id: "ram", label: "RAM / Memory", placeholder: "e.g. 64GB Unified / 32GB DDR5" },
      { id: "storage", label: "Storage Drive", placeholder: "e.g. 1TB NVMe PCIe SSD" },
      { id: "connectivity", label: "GPU & Ports", placeholder: "e.g. NVIDIA RTX 4080 12GB / Thunderbolt 4" },
    ],
    titlePlaceholder: "e.g. Apple MacBook Pro 16\" M3 Max",
    brandPlaceholder: "e.g. Apple",
    modelPlaceholder: "e.g. A2991",
    descPlaceholder: "Describe battery health %, cycle count, cosmetic condition, charger type...",
  },
  {
    id: "electronics",
    label: "Electronics & Displays",
    icon: Tv,
    minPrice: 400,
    maxPrice: 1500,
    brands: ["Sony", "Samsung", "LG", "BenQ", "TCL", "ViewSonic", "Epson", "Anker Nebula", "Apple"],
    presets: [
      {
        title: "LG OLED C3 55\" 4K 120Hz Smart Display",
        brand: "LG",
        model: "OLED55C3",
        heightCm: "70.3",
        widthCm: "122.2",
        weightKg: "14.1",
        description: "Self-lit OLED evo display with α9 AI Processor Gen6, 4K 120Hz VRR, Dolby Vision, and 4x HDMI 2.1 ports for color grading and gaming.",
        specs: {
          sensorResolution: "55-inch 4K UHD (3840x2160)",
          powerWattage: "OLED evo Panel, 120Hz G-Sync / FreeSync",
          connectivity: "4x HDMI 2.1 (48Gbps), eARC, Optical, USB",
        },
      },
      {
        title: "BenQ SW272U 27\" 4K Color-Accurate Monitor",
        brand: "BenQ",
        model: "SW272U",
        heightCm: "50.1",
        widthCm: "61.4",
        weightKg: "8.6",
        description: "Professional 27-inch 4K IPS monitor with 99% Adobe RGB / 99% DCI-P3 coverage, hardware calibration, and 90W USB-C PD.",
        specs: {
          sensorResolution: "27-inch 4K UHD (3840x2160) Anti-Glare",
          powerWattage: "IPS Panel, 60Hz 10-bit HDR10, Delta E <= 1.5",
          connectivity: "USB-C 90W PD, 2x HDMI 2.0, DP 1.4, SD Card Reader",
        },
      },
    ],
    specFields: [
      { id: "sensorResolution", label: "Screen Size & Resolution", placeholder: "e.g. 55-inch 4K UHD (3840x2160)" },
      { id: "powerWattage", label: "Panel & Refresh Rate", placeholder: "e.g. OLED 120Hz / IPS 144Hz HDR" },
      { id: "connectivity", label: "I/O Ports & Connectivity", placeholder: "e.g. 4x HDMI 2.1, USB-C 90W PD, eARC" },
    ],
    titlePlaceholder: "e.g. LG OLED C3 55\" 4K 120Hz Smart Display",
    brandPlaceholder: "e.g. LG",
    modelPlaceholder: "e.g. OLED55C3",
    descPlaceholder: "Describe panel condition, zero dead pixels, included stand/mount, remote and cables...",
  },
  {
    id: "drones",
    label: "Drones & Aerial",
    icon: Sparkles,
    minPrice: 1200,
    maxPrice: 3500,
    brands: ["DJI", "Autel Robotics", "Skydio", "GoPro", "BetaFPV", "iFlight", "Parrot"],
    presets: [
      {
        title: "DJI Mavic 3 Pro Cine Fly More Combo",
        brand: "DJI",
        model: "Mavic 3 Pro Cine",
        heightCm: "10.7",
        widthCm: "34.7",
        weightKg: "0.96",
        description: "Triple-camera flagship drone featuring 4/3 Hasselblad sensor with Apple ProRes 422 HQ, omnidirectional sensing, and 43-min flight time.",
        specs: {
          flightTime: "43 mins per battery (3x Batteries included)",
          batteryCapacity: "15 km O4 HD Video Link",
          sensorResolution: "Hasselblad 4/3 CMOS 5.1K / Apple ProRes",
          connectivity: "Omnidirectional APAS 5.0 + DJI RC PRO Controller",
        },
      },
      {
        title: "DJI Mini 4 Pro Fly More Combo Plus",
        brand: "DJI",
        model: "Mini 4 Pro",
        heightCm: "9.1",
        widthCm: "14.8",
        weightKg: "0.249",
        description: "Sub-249g lightweight travel drone with omnidirectional obstacle sensing, 4K/60fps HDR true vertical video, and 20km transmission.",
        specs: {
          flightTime: "34 mins (Standard) / 45 mins (Plus Battery)",
          batteryCapacity: "20 km FHD Video Transmission",
          sensorResolution: "1/1.3\" CMOS 48MP 4K/60fps HDR",
          connectivity: "Omnidirectional Obstacle Sensing + DJI RC 2",
        },
      },
    ],
    specFields: [
      { id: "flightTime", label: "Max Flight Time", placeholder: "e.g. 43 mins per battery" },
      { id: "batteryCapacity", label: "Transmission Range", placeholder: "e.g. 15 km O4 Video Link" },
      { id: "sensorResolution", label: "Camera Sensor & Video", placeholder: "e.g. Hasselblad 4/3 CMOS 5.1K ProRes" },
      { id: "connectivity", label: "Obstacle Sensing & RC", placeholder: "e.g. Omnidirectional APAS 5.0 + DJI RC 2" },
    ],
    titlePlaceholder: "e.g. DJI Mavic 3 Pro Cine Fly More Combo",
    brandPlaceholder: "e.g. DJI",
    modelPlaceholder: "e.g. Mavic 3 Pro",
    descPlaceholder: "Describe flight hours, battery health cycles, propeller condition, RC controller, and ND filters...",
  },
  {
    id: "audio",
    label: "Audio & Microphones",
    icon: Headphones,
    minPrice: 500,
    maxPrice: 1800,
    brands: ["Shure", "Sony", "Sennheiser", "Rode", "Audio-Technica", "Bose", "JBL", "Focusrite", "Zoom"],
    presets: [
      {
        title: "Shure SM7B Vocal Studio Microphone",
        brand: "Shure",
        model: "SM7B",
        heightCm: "19.8",
        widthCm: "11.7",
        weightKg: "0.76",
        description: "Legendary dynamic cardioid studio microphone with smooth, flat frequency response for broadcast, podcasting, and vocal recording.",
        specs: {
          lensMount: "Cardioid Dynamic (Acoustic Isolation)",
          connectivity: "XLR 3-pin Balanced Output",
          batteryCapacity: "Passive (+48V Phantom required if using Cloudlifter)",
          powerWattage: "Frequency Response: 50Hz - 20kHz",
        },
      },
      {
        title: "Rode Wireless PRO Dual Microphone Kit",
        brand: "Rode",
        model: "Wireless PRO",
        heightCm: "4.4",
        widthCm: "4.6",
        weightKg: "0.28",
        description: "Dual-channel digital wireless microphone system with 32-bit float on-board recording, timecode, and 260m transmission range.",
        specs: {
          lensMount: "Omnidirectional Lavalier + Built-in Mic",
          connectivity: "2.4GHz Series IV Digital / USB-C / 3.5mm TRS",
          batteryCapacity: "7 hours per TX (Smart Charge Case included)",
          powerWattage: "32-bit Float On-Board Recording, Timecode Gen",
        },
      },
    ],
    specFields: [
      { id: "lensMount", label: "Form Factor & Polar Pattern", placeholder: "e.g. Cardioid Dynamic / Omnidirectional Lav" },
      { id: "connectivity", label: "Audio Interface & Output", placeholder: "e.g. XLR 3-pin / USB-C / 3.5mm TRS" },
      { id: "batteryCapacity", label: "Power & Battery Life", placeholder: "e.g. +48V Phantom Power / 7h internal battery" },
      { id: "powerWattage", label: "Frequency Range & Bits", placeholder: "e.g. 50Hz - 20kHz / 32-bit Float" },
    ],
    titlePlaceholder: "e.g. Shure SM7B Studio Broadcast Microphone",
    brandPlaceholder: "e.g. Shure",
    modelPlaceholder: "e.g. SM7B",
    descPlaceholder: "Describe audio clarity, included cables, shockmount, pop filter, and phantom power requirements...",
  },
  {
    id: "vehicles",
    label: "Vehicles & Transport",
    icon: Car,
    minPrice: 1500,
    maxPrice: 5000,
    brands: ["Royal Enfield", "Honda", "Yamaha", "KTM", "Ather", "Ola Electric", "Suzuki", "Hyundai", "Toyota"],
    presets: [
      {
        title: "Royal Enfield Himalayan 450 Dual-ABS",
        brand: "Royal Enfield",
        model: "Himalayan 450",
        heightCm: "131.6",
        widthCm: "85.2",
        weightKg: "196",
        description: "Liquid-cooled 452cc adventure tourer motorcycle with Sherpa engine (40 PS power), long-travel Showa suspension, and switchable ABS.",
        specs: {
          engineCc: "452 cc Liquid-Cooled Single Cylinder (40 PS)",
          batteryCapacity: "Petrol (17 Litre Fuel Tank)",
          mileage: "30 kmpl Estimated Fuel Economy",
          connectivity: "6-Speed Manual with Slipper Clutch / Dual-Channel ABS",
        },
      },
      {
        title: "Ather 450X Gen 3 Smart Electric Scooter",
        brand: "Ather",
        model: "450X Gen 3",
        heightCm: "125.0",
        widthCm: "70.0",
        weightKg: "111",
        description: "High-performance smart electric scooter featuring 6.2 kW PMS motor, Warp mode acceleration, touchscreen navigation, and fast charging.",
        specs: {
          engineCc: "6.2 kW Peak PMS Motor (26 Nm Torque)",
          batteryCapacity: "3.7 kWh Lithium-Ion Battery Pack",
          mileage: "146 km Certified Range (105 km TrueRange)",
          connectivity: "7-inch Touchscreen Android OS / 4G LTE / Disc Brakes",
        },
      },
    ],
    specFields: [
      { id: "engineCc", label: "Engine Displacement / Motor", placeholder: "e.g. 452 cc Liquid-Cooled / 6.2 kW PMS Motor" },
      { id: "batteryCapacity", label: "Fuel / Battery Type", placeholder: "e.g. Petrol / 3.7 kWh Lithium-Ion" },
      { id: "mileage", label: "Mileage / Driving Range", placeholder: "e.g. 30 kmpl / 146 km TrueRange" },
      { id: "connectivity", label: "Transmission & Brakes", placeholder: "e.g. 6-Speed Manual / Dual ABS" },
    ],
    titlePlaceholder: "e.g. Royal Enfield Himalayan 450 Dual-Channel ABS",
    brandPlaceholder: "e.g. Royal Enfield",
    modelPlaceholder: "e.g. Himalayan 450",
    descPlaceholder: "Describe vehicle mechanical condition, odometer reading, insurance coverage, and helmet availability...",
  },
  {
    id: "bicycles",
    label: "Bicycles & Mobility",
    icon: Bike,
    minPrice: 300,
    maxPrice: 1000,
    brands: ["Trek", "Giant", "Specialized", "Hero", "Firefox", "Montra", "Btwin Decathlon", "Scott"],
    presets: [
      {
        title: "Trek Marlin 7 Gen 3 Mountain Bike",
        brand: "Trek",
        model: "Marlin 7 Gen 3",
        heightCm: "105.0",
        widthCm: "180.0",
        weightKg: "14.6",
        description: "Trail-ready cross-country mountain bike with lightweight Alpha Silver aluminum frame, RockShox suspension fork, and Shimano 1x drivetrain.",
        specs: {
          lensMount: "Alpha Silver Aluminum (Size L / 19.5\")",
          processor: "Shimano Deore M4100 1x10 Speed (11-46T)",
          connectivity: "Shimano MT200 Hydraulic Disc Brakes / 100mm Fork",
        },
      },
    ],
    specFields: [
      { id: "lensMount", label: "Frame Material & Size", placeholder: "e.g. Alpha Silver Aluminum (Size L / 19.5\")" },
      { id: "processor", label: "Drivetrain & Gears", placeholder: "e.g. Shimano Deore 1x10 Speed" },
      { id: "connectivity", label: "Braking & Suspension", placeholder: "e.g. Hydraulic Disc Brakes / 100mm Fork" },
    ],
    titlePlaceholder: "e.g. Trek Marlin 7 Gen 3 Mountain Bike",
    brandPlaceholder: "e.g. Trek",
    modelPlaceholder: "e.g. Marlin 7 Gen 3",
    descPlaceholder: "Describe frame condition, tire tread depth, brake responsiveness, and included helmet/lock...",
  },
  {
    id: "tools",
    label: "Tools & Equipment",
    icon: Wrench,
    minPrice: 300,
    maxPrice: 1000,
    brands: ["Bosch", "DeWalt", "Makita", "Milwaukee", "Black+Decker", "Stanley", "Hilti", "Kärcher"],
    presets: [
      {
        title: "Bosch Professional GSB 18V-50 Cordless Drill Kit",
        brand: "Bosch",
        model: "GSB 18V-50",
        heightCm: "22.9",
        widthCm: "18.9",
        weightKg: "1.4",
        description: "Brushless 18V cordless combi drill & impact driver with 50 Nm torque, 13mm metal chuck, 2x 4.0Ah batteries, and hard case.",
        specs: {
          powerWattage: "18V Brushless Motor / 50 Nm Torque / 1800 RPM",
          storage: "13mm Keyless Metal Auto-Lock Chuck",
          batteryCapacity: "2x 18V 4.0Ah Li-Ion + GAL 18V-40 Fast Charger",
        },
      },
    ],
    specFields: [
      { id: "powerWattage", label: "Power Rating & Torque", placeholder: "e.g. 18V Brushless / 50 Nm Torque / 2100W" },
      { id: "storage", label: "Chuck / Blade / Collet", placeholder: "e.g. 13mm Keyless Metal Chuck / 185mm Blade" },
      { id: "batteryCapacity", label: "Power Source & Batteries", placeholder: "e.g. 2x 18V 4.0Ah Li-Ion + Fast Charger" },
    ],
    titlePlaceholder: "e.g. Bosch Professional GSB 18V-50 Brushless Drill",
    brandPlaceholder: "e.g. Bosch",
    modelPlaceholder: "e.g. GSB 18V-50",
    descPlaceholder: "Describe tool motor condition, battery cycle life, included drill bit accessories, and case...",
  },
  {
    id: "gaming",
    label: "Gaming & VR",
    icon: Sparkle,
    minPrice: 500,
    maxPrice: 1600,
    brands: ["Sony PlayStation", "Microsoft Xbox", "Nintendo", "Meta Quest", "Valve", "ASUS ROG", "MSI", "Logitech G"],
    presets: [
      {
        title: "Sony PlayStation 5 Pro 2TB Console",
        brand: "Sony PlayStation",
        model: "CFI-7000",
        heightCm: "10.4",
        widthCm: "39.0",
        weightKg: "3.1",
        description: "Next-generation PS5 Pro console featuring AI upscaling (PSSR), advanced hardware ray tracing, 2TB custom NVMe SSD, and 4K 120Hz output.",
        specs: {
          storage: "2TB Custom High-Speed NVMe SSD",
          sensorResolution: "4K 60-120 FPS / PSSR Ray Tracing / 8K Support",
          connectivity: "1x DualSense Wireless Controller, HDMI 2.1, Wi-Fi 7",
        },
      },
      {
        title: "Meta Quest 3 512GB VR / MR Headset",
        brand: "Meta Quest",
        model: "Quest 3 512GB",
        heightCm: "16.0",
        widthCm: "22.0",
        weightKg: "0.51",
        description: "Breakthrough mixed reality headset with 4K+ Infinite Display, Snapdragon XR2 Gen 2 chip, full-color passthrough, and Touch Plus controllers.",
        specs: {
          storage: "512GB On-Board High-Speed Storage",
          sensorResolution: "2064x2208 per eye 4K+ Infinite Display / 120Hz",
          connectivity: "2x Touch Plus Controllers, USB-C Charging Cable",
        },
      },
    ],
    specFields: [
      { id: "storage", label: "Storage Capacity", placeholder: "e.g. 2TB Custom High-Speed NVMe SSD" },
      { id: "sensorResolution", label: "Max Resolution & FPS", placeholder: "e.g. 4K 120 FPS / 8K HDR / 120Hz VR" },
      { id: "connectivity", label: "Controllers & Peripherals", placeholder: "e.g. 2x Wireless Controllers + Charging Stand" },
    ],
    titlePlaceholder: "e.g. Sony PlayStation 5 Pro 2TB Console",
    brandPlaceholder: "e.g. Sony PlayStation",
    modelPlaceholder: "e.g. CFI-7000",
    descPlaceholder: "Describe console system software, number of controllers, cables, and pre-installed game passes...",
  },
  {
    id: "furniture",
    label: "Studio Furniture",
    icon: Armchair,
    minPrice: 400,
    maxPrice: 1200,
    brands: ["Herman Miller", "Steelcase", "IKEA", "Secretlab", "Godrej Interio", "Green Soul", "Featherlite"],
    presets: [
      {
        title: "Herman Miller Aeron Ergonomic Chair (Size B)",
        brand: "Herman Miller",
        model: "Aeron Size B",
        heightCm: "104.0",
        widthCm: "68.5",
        weightKg: "18.6",
        description: "Iconic ergonomic office chair with Pellicle 8Z breathable mesh, PostureFit SL sacral support, and fully adjustable 3D armrests.",
        specs: {
          lensMount: "Pellicle 8Z Breathable Mesh & Die-Cast Aluminum",
          connectivity: "PostureFit SL Lumbar, Fully Adjustable 3D Arms, Tilt",
          powerWattage: "Max Weight Capacity: 159 kg (350 lbs)",
        },
      },
    ],
    specFields: [
      { id: "lensMount", label: "Construction Material", placeholder: "e.g. 8Z Pellicle Mesh & Die-Cast Aluminum" },
      { id: "connectivity", label: "Ergonomic Adjustments", placeholder: "e.g. PostureFit SL Lumbar, 4D Armrests, Synchro-Tilt" },
      { id: "powerWattage", label: "Max Weight Load Capacity", placeholder: "e.g. 159 kg / 350 lbs rating" },
    ],
    titlePlaceholder: "e.g. Herman Miller Aeron Ergonomic Chair (Size B)",
    brandPlaceholder: "e.g. Herman Miller",
    modelPlaceholder: "e.g. Aeron Size B",
    descPlaceholder: "Describe lumbar support state, mesh elasticity, hydraulic cylinder smoothness, and armrests...",
  },
  {
    id: "sports",
    label: "Sports & Fitness",
    icon: Dumbbell,
    minPrice: 350,
    maxPrice: 1100,
    brands: ["Bowflex", "Cultsport", "Decathlon Domyos", "Yonex", "Cosco", "Nike", "Adidas", "Stag"],
    presets: [
      {
        title: "Bowflex SelectTech 552 Adjustable Dumbbells (Pair)",
        brand: "Bowflex",
        model: "SelectTech 552",
        heightCm: "22.8",
        widthCm: "42.9",
        weightKg: "48.0",
        description: "Space-saving dial-adjustable dumbbell system replacing 15 sets of weights from 2.5kg to 24kg per dumbbell.",
        specs: {
          storage: "Adjustable 2.5 kg to 24 kg per dumbbell (48 kg pair)",
          lensMount: "High-Grade Steel Plates with Durable Thermoplastic Mold",
          powerWattage: "Max Combined Weight: 48 kg with Storage Trays",
        },
      },
    ],
    specFields: [
      { id: "storage", label: "Weight / Resistance Range", placeholder: "e.g. 2.5 kg to 24 kg per dumbbell (48kg pair)" },
      { id: "lensMount", label: "Build Material & Coating", placeholder: "e.g. Heavy-Duty Alloy Steel with Rubber Coating" },
      { id: "powerWattage", label: "Max User Weight / Capacity", placeholder: "e.g. 150 kg max load rating" },
    ],
    titlePlaceholder: "e.g. Bowflex SelectTech 552 Adjustable Dumbbells",
    brandPlaceholder: "e.g. Bowflex",
    modelPlaceholder: "e.g. SelectTech 552",
    descPlaceholder: "Describe weight selection dial smoothness, lock security, tray condition, and storage stand...",
  },
  {
    id: "other",
    label: "Other Rentable Gear",
    icon: Layers,
    minPrice: 500,
    maxPrice: 2000,
    brands: ["Universal Pro", "Custom Built", "Standard Equipment", "Industrial Pro"],
    presets: [
      {
        title: "Heavy-Duty Stainless Steel Studio C-Stand Kit",
        brand: "Universal Pro",
        model: "CS-330",
        heightCm: "330.0",
        widthCm: "100.0",
        weightKg: "8.5",
        description: "Professional 3.3m stainless steel turtle-base C-stand with grip head, 1.27m extension arm, and 20kg payload capacity.",
        specs: {
          connectivity: "3.3m Max Height, 20kg Payload, Turtle Base, 2x Grip Heads",
          powerWattage: "Heavy-Duty Stainless Steel 100% Rust-Resistant",
        },
      },
    ],
    specFields: [
      { id: "connectivity", label: "Primary Function & Specs", placeholder: "e.g. 3.3m Turtle Base C-Stand with 20kg payload" },
      { id: "powerWattage", label: "Power / Capacity Rating", placeholder: "e.g. 230V Pure Sine Wave Inverter 3500W Peak" },
    ],
    titlePlaceholder: "e.g. Heavy Duty Stainless Steel Studio C-Stand Kit",
    brandPlaceholder: "e.g. Universal Pro",
    modelPlaceholder: "e.g. CS-330",
    descPlaceholder: "Describe equipment condition, setup instructions, included accessories, and recommended uses...",
  },
];

const CONDITION_GRADES: { grade: ProductCondition["grade"]; label: string; desc: string }[] = [
  { grade: "Like New", label: "Like New", desc: "Flawless cosmetic state, barely used, 100% operational" },
  { grade: "Excellent", label: "Excellent", desc: "Minor microscopic signs of usage, fully pristine" },
  { grade: "Good", label: "Good", desc: "Normal cosmetic wear, tested and fully functional" },
  { grade: "Fair", label: "Fair", desc: "Visible cosmetic marks/scratches, functions properly" },
  { grade: "Needs Repair", label: "Needs Repair", desc: "Minor cosmetic issue or specific operational quirk noted" },
];

const SCRATCH_LEVELS: ProductCondition["scratches"][] = ["None", "Micro-scratches", "Visible", "Noticeable"];

const QUICK_ACCESSORY_TAGS = [
  "Original Charger",
  "USB-C Cable",
  "Padded Carry Case",
  "Extra Battery",
  "Lens Cap & Hood",
  "High-Speed SD Card",
  "Shoulder Strap",
  "Power Adapter",
];

export function ListProductWizard({
  initialDraft,
  onSaveDraft,
  onSubmitProduct,
  onCancel,
}: ListProductWizardProps) {
  const { activeAccount, profile } = usePayerntStore();

  // Exactly 5 Stages:
  // 1 = CATEGORY + SPECIFICATIONS
  // 2 = PHOTOS + CONDITION
  // 3 = AVAILABILITY + LOCATION
  // 4 = PRODUCT REVIEW + TERMS
  // 5 = PRICE RANGE + FINAL SUBMISSION
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<PayerntProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullTermsModal, setShowFullTermsModal] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  // STAGE 01 — Category & Specifications
  const [category, setCategory] = useState<string>(initialDraft?.category || "");
  const [isCategorySelected, setIsCategorySelected] = useState<boolean>(!!initialDraft?.category);
  const [customCategoryName, setCustomCategoryName] = useState(initialDraft?.customCategoryName || "");
  const [productName, setProductName] = useState(initialDraft?.name || initialDraft?.title || "");
  const [brand, setBrand] = useState(initialDraft?.specs?.brand || initialDraft?.brand || "");
  const [model, setModel] = useState(initialDraft?.specs?.model || initialDraft?.model || "");
  const [deviceId, setDeviceId] = useState(initialDraft?.specs?.serialNumber || "");
  const [year, setYear] = useState(initialDraft?.specs?.year || initialDraft?.year || new Date().getFullYear().toString());
  const [description, setDescription] = useState(initialDraft?.description || "");

  // Physical Dimensions: Height, Width, Weight ONLY
  const [heightCm, setHeightCm] = useState(initialDraft?.specs?.customSpecs?.find((s) => s.label === "Height")?.value || "");
  const [widthCm, setWidthCm] = useState(initialDraft?.specs?.customSpecs?.find((s) => s.label === "Width")?.value || "");
  const [weightKg, setWeightKg] = useState(initialDraft?.specs?.customSpecs?.find((s) => s.label === "Weight")?.value || "");

  // Optional Additional Specifications (Key-Value)
  const [additionalSpecs, setAdditionalSpecs] = useState<{ label: string; value: string }[]>(() => {
    if (initialDraft?.specs?.customSpecs) {
      return initialDraft.specs.customSpecs.filter(
        (s) => s.label !== "Height" && s.label !== "Width" && s.label !== "Weight"
      );
    }
    return [];
  });
  const [newSpecLabel, setNewSpecLabel] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");

  // Category-Specific Specs
  const [lensMount, setLensMount] = useState(initialDraft?.specs?.lensMount || "");
  const [sensorResolution, setSensorResolution] = useState(initialDraft?.specs?.sensorResolution || "");
  const [processor, setProcessor] = useState(initialDraft?.specs?.processor || "");
  const [ram, setRam] = useState(initialDraft?.specs?.ram || "");
  const [storage, setStorage] = useState(initialDraft?.specs?.storage || "");
  const [flightTime, setFlightTime] = useState(initialDraft?.specs?.flightTime || "");
  const [batteryCapacity, setBatteryCapacity] = useState(initialDraft?.specs?.batteryCapacity || "");
  const [engineCc, setEngineCc] = useState(initialDraft?.specs?.engineCc || "");
  const [mileage, setMileage] = useState(initialDraft?.specs?.mileage || "");
  const [powerWattage, setPowerWattage] = useState(initialDraft?.specs?.powerWattage || "");
  const [connectivity, setConnectivity] = useState(initialDraft?.specs?.connectivity || "");

  // Active category configuration and dynamic helpers
  const currentCategoryMeta = useMemo(() => {
    return CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  }, [category]);

  const handleSelectCategory = (catId: string) => {
    setCategory(catId);
    setIsCategorySelected(true);
  };

  const handleSelectBrand = (b: string) => {
    setBrand(b);
    if (!productName || productName.trim() === "" || CATEGORIES.some((c) => c.brands.some((oldB) => productName.trim() === oldB))) {
      setProductName(`${b} `);
    }
  };

  const handleApplyPreset = (preset: CategoryConfig["presets"][0]) => {
    setProductName(preset.title);
    setBrand(preset.brand);
    setModel(preset.model);
    setHeightCm(preset.heightCm);
    setWidthCm(preset.widthCm);
    setWeightKg(preset.weightKg);
    setDescription(preset.description);

    if (preset.specs.lensMount !== undefined) setLensMount(preset.specs.lensMount);
    if (preset.specs.sensorResolution !== undefined) setSensorResolution(preset.specs.sensorResolution);
    if (preset.specs.processor !== undefined) setProcessor(preset.specs.processor);
    if (preset.specs.ram !== undefined) setRam(preset.specs.ram);
    if (preset.specs.storage !== undefined) setStorage(preset.specs.storage);
    if (preset.specs.flightTime !== undefined) setFlightTime(preset.specs.flightTime);
    if (preset.specs.batteryCapacity !== undefined) setBatteryCapacity(preset.specs.batteryCapacity);
    if (preset.specs.engineCc !== undefined) setEngineCc(preset.specs.engineCc);
    if (preset.specs.mileage !== undefined) setMileage(preset.specs.mileage);
    if (preset.specs.powerWattage !== undefined) setPowerWattage(preset.specs.powerWattage);
    if (preset.specs.connectivity !== undefined) setConnectivity(preset.specs.connectivity);

    toast.success(`Loaded specs for ${preset.title}!`);
  };

  const getSpecValue = (id: string): string => {
    switch (id) {
      case "lensMount": return lensMount;
      case "sensorResolution": return sensorResolution;
      case "processor": return processor;
      case "ram": return ram;
      case "storage": return storage;
      case "flightTime": return flightTime;
      case "batteryCapacity": return batteryCapacity;
      case "engineCc": return engineCc;
      case "mileage": return mileage;
      case "powerWattage": return powerWattage;
      case "connectivity": return connectivity;
      default: return "";
    }
  };

  const setSpecValue = (id: string, val: string) => {
    switch (id) {
      case "lensMount": setLensMount(val); break;
      case "sensorResolution": setSensorResolution(val); break;
      case "processor": setProcessor(val); break;
      case "ram": setRam(val); break;
      case "storage": setStorage(val); break;
      case "flightTime": setFlightTime(val); break;
      case "batteryCapacity": setBatteryCapacity(val); break;
      case "engineCc": setEngineCc(val); break;
      case "mileage": setMileage(val); break;
      case "powerWattage": setPowerWattage(val); break;
      case "connectivity": setConnectivity(val); break;
    }
  };

  // STAGE 02 — Photos + Condition (FRONT CAMERA, BACK CAMERA, 10s VIDEO)
  const [frontPhotoUrl, setFrontPhotoUrl] = useState<string>(
    initialDraft?.photos?.find((p) => p.tag === "Front View")?.url || initialDraft?.primaryImage || ""
  );
  const [backPhotoUrl, setBackPhotoUrl] = useState<string>(
    initialDraft?.photos?.find((p) => p.tag === "Back View")?.url || (initialDraft?.photos && initialDraft.photos.length > 1 ? initialDraft.photos[1].url : "") || ""
  );
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string>(initialDraft?.videoUrl || "");

  // Direct Device Camera & Media state
  const [videoDuration, setVideoDuration] = useState<string>("10s");
  const [isProcessingMedia, setIsProcessingMedia] = useState<boolean>(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const frontPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const backPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Condition details
  const [conditionGrade, setConditionGrade] = useState<ProductCondition["grade"]>(
    initialDraft?.condition?.grade || "Like New"
  );
  const [scratches, setScratches] = useState<ProductCondition["scratches"]>(
    initialDraft?.condition?.scratches || "None"
  );
  const [visibleDamage, setVisibleDamage] = useState(initialDraft?.condition?.visibleDamage || false);
  const [damageDescription, setDamageDescription] = useState(
    initialDraft?.damageDetails || initialDraft?.condition?.damageDescription || ""
  );
  const [conditionNotes, setConditionNotes] = useState(
    initialDraft?.condition?.additionalNotes || initialDraft?.condition?.functionalNotes || ""
  );
  const [accessoriesList, setAccessoriesList] = useState<string[]>(() => {
    if (initialDraft?.condition?.accessoriesIncluded && initialDraft.condition.accessoriesIncluded.length > 0) {
      return initialDraft.condition.accessoriesIncluded;
    }
    if (initialDraft?.accessories) {
      return initialDraft.accessories.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });
  const [customAccessoryInput, setCustomAccessoryInput] = useState("");

  // STAGE 03 — Availability + Location
  const [availableNow, setAvailableNow] = useState(initialDraft?.availability?.availableNow !== false);
  const [availableFromDate, setAvailableFromDate] = useState(
    initialDraft?.availability?.availableFromDate || new Date().toISOString().split("T")[0]
  );
  const [availableUntilDate, setAvailableUntilDate] = useState(
    initialDraft?.availability?.availableUntilDate ||
    new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0]
  );
  const [unavailableDates, setUnavailableDates] = useState<string[]>(
    initialDraft?.availability?.unavailableDates || []
  );
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [bufferDays, setBufferDays] = useState<number>(
    initialDraft?.availability?.bufferDaysBetweenRentals || 0
  );

  // Location (GPS vs Manual Entry)
  const defaultAccountAddress = useMemo(() => {
    const raw = activeAccount?.address || profile?.address || "";
    const pincode = activeAccount?.pincode || profile?.pincode || "";
    const city = profile?.city || (raw ? raw.split(",")[0]?.trim() : "");
    const area = profile?.area || (raw ? raw.split(",")[1]?.trim() : "");
    return {
      addressLine: raw || "",
      area: area || "",
      city: city || "",
      state: profile?.state || "",
      pincode: pincode || "",
      landmark: "",
    };
  }, [activeAccount, profile]);

  const [locationMode, setLocationMode] = useState<"gps" | "manual">("manual");
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [pickupAddressLine, setPickupAddressLine] = useState(
    initialDraft?.location?.area || defaultAccountAddress.addressLine || ""
  );
  const [pickupArea, setPickupArea] = useState(
    initialDraft?.location?.area || initialDraft?.area || defaultAccountAddress.area || ""
  );
  const [pickupLandmark, setPickupLandmark] = useState(initialDraft?.location?.landmark || "");
  const [pickupCity, setPickupCity] = useState(
    initialDraft?.location?.city || initialDraft?.city || defaultAccountAddress.city || ""
  );
  const [pickupState, setPickupState] = useState(initialDraft?.location?.state || defaultAccountAddress.state || "");
  const [pickupPincode, setPickupPincode] = useState(
    initialDraft?.location?.pincode || initialDraft?.location?.postalCode || initialDraft?.postalCode || defaultAccountAddress.pincode || ""
  );

  // Drop Location
  const [sameAsPickup, setSameAsPickup] = useState(true);
  const [dropAddressLine, setDropAddressLine] = useState("");
  const [dropArea, setDropArea] = useState("");
  const [dropCity, setDropCity] = useState("");
  const [dropPincode, setDropPincode] = useState("");

  // STAGE 04 — Terms Acceptance
  const [agreedToTerms, setAgreedToTerms] = useState(
    initialDraft?.verificationDocs?.agreedToTerms || false
  );

  // STAGE 05 — Admin Price Range + Final Submission
  const activeCategoryObj = useMemo(() => {
    return CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  }, [category]);

  const adminMinPrice = activeCategoryObj.minPrice;
  const adminMaxPrice = activeCategoryObj.maxPrice;

  const [selectedRentalPrice, setSelectedRentalPrice] = useState<number>(() => {
    const def = initialDraft?.pricing?.daily || initialDraft?.dailyRate || Math.round((adminMinPrice + adminMaxPrice) / 2);
    return Math.min(Math.max(def, adminMinPrice), adminMaxPrice);
  });

  // Keep selected price in range when category changes
  useEffect(() => {
    setSelectedRentalPrice((prev) => Math.min(Math.max(prev, adminMinPrice), adminMaxPrice));
  }, [adminMinPrice, adminMaxPrice]);

  const [finalConfirmationChecked, setFinalConfirmationChecked] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  // Direct Camera Trigger Handlers
  const handleTriggerFrontCamera = () => {
    setMediaError(null);
    if (frontPhotoInputRef.current) {
      frontPhotoInputRef.current.click();
    }
  };

  const handleTriggerBackCamera = () => {
    setMediaError(null);
    if (backPhotoInputRef.current) {
      backPhotoInputRef.current.click();
    }
  };

  const handleTriggerVideoCamera = () => {
    setMediaError(null);
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  // Process & Optimize Captured Photo (Direct Camera)
  const handlePhotoFileCapture = (e: React.ChangeEvent<HTMLInputElement>, slot: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMediaError("Invalid image format. Please take a photo with your device camera.");
      toast.error("Invalid image format. Please take a photo with your device camera.");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setMediaError("Photo size is too large (maximum 30MB). Please retake.");
      toast.error("Photo size is too large (maximum 30MB). Please retake.");
      return;
    }

    setIsProcessingMedia(true);
    setMediaError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        setIsProcessingMedia(false);
        setMediaError("Failed to read photo data. Please try again.");
        toast.error("Failed to read photo data. Please try again.");
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1920;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL("image/jpeg", 0.88);
            if (slot === "front") {
              setFrontPhotoUrl(optimized);
              toast.success("Front photo captured successfully.");
            } else {
              setBackPhotoUrl(optimized);
              toast.success("Back photo captured successfully.");
            }
          } else {
            if (slot === "front") setFrontPhotoUrl(rawDataUrl);
            else setBackPhotoUrl(rawDataUrl);
          }
        } catch {
          if (slot === "front") setFrontPhotoUrl(rawDataUrl);
          else setBackPhotoUrl(rawDataUrl);
        } finally {
          setIsProcessingMedia(false);
        }
      };
      img.onerror = () => {
        setIsProcessingMedia(false);
        setMediaError("Corrupted photo file. Please retake.");
        toast.error("Corrupted photo file. Please retake.");
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setIsProcessingMedia(false);
      setMediaError("Failed to access camera photo.");
      toast.error("Failed to access camera photo.");
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  // Process & Validate Captured 10s Inspection Video
  const handleVideoFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setMediaError("Invalid video format. Please record a valid inspection video.");
      toast.error("Invalid video format. Please record a valid inspection video.");
      return;
    }

    if (file.size > 150 * 1024 * 1024) {
      setMediaError("Video file is too large (maximum 150MB). Please record a 10-second clip.");
      toast.error("Video file is too large (maximum 150MB). Please record a 10-second clip.");
      return;
    }

    setIsProcessingMedia(true);
    setMediaError(null);

    const blobUrl = URL.createObjectURL(file);

    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.onloadedmetadata = () => {
      window.URL.revokeObjectURL(tempVideo.src);
      const durationSec = Math.round(tempVideo.duration || 0);

      if (tempVideo.duration > 11.5) {
        setMediaError(`Recorded video is ${durationSec}s. Inspection video must be 10 seconds or less.`);
        toast.error(`Video exceeds 10-second limit (${durationSec}s). Please record a clip of 10s or less.`);
        setIsProcessingMedia(false);
        return;
      }

      setCapturedVideoUrl(blobUrl);
      setVideoDuration(durationSec > 0 ? `${durationSec}s` : "10s");
      setIsProcessingMedia(false);
      toast.success("10-second inspection video saved.");
    };

    tempVideo.onerror = () => {
      setCapturedVideoUrl(blobUrl);
      setVideoDuration("10s");
      setIsProcessingMedia(false);
      toast.success("Inspection video saved.");
    };

    tempVideo.src = blobUrl;
    e.target.value = "";
  };

  // Real-time GPS Reverse Geocoding to Auto-Fill Location Fields
  const reverseGeocodeCoords = async (lat: number, lng: number) => {
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const data = await bdcRes.json();
        const city = data.city || data.locality || data.principalSubdivision || "";
        const state = data.principalSubdivision || "";
        const area = data.locality || data.localityInfo?.administrative?.[3]?.name || data.localityInfo?.administrative?.[2]?.name || "";
        const pincode = data.postcode || "";
        const fullAddr = [area, city, state, pincode].filter(Boolean).join(", ") || `GPS Verified Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        if (city) setPickupCity(city);
        if (state) setPickupState(state);
        if (area) setPickupArea(area);
        if (pincode) setPickupPincode(pincode);
        setPickupAddressLine(fullAddr);
        return;
      }
    } catch {
      // fallback to OSM Nominatim
    }

    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      if (osmRes.ok) {
        const data = await osmRes.json();
        const addr = data.address || {};
        const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.quarter || addr.city_district || "";
        const city = addr.city || addr.town || addr.municipality || addr.county || "";
        const state = addr.state || "";
        const pincode = addr.postcode || "";
        const formatted = data.display_name ? data.display_name.split(",").slice(0, 4).join(", ") : "";

        if (city) setPickupCity(city);
        if (state) setPickupState(state);
        if (area) setPickupArea(area);
        if (pincode) setPickupPincode(pincode);
        if (formatted) setPickupAddressLine(formatted);
        return;
      }
    } catch {
      // fallback
    }

    setPickupAddressLine(`GPS Verified Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  };

  // Geolocation Handler & Auto-Fill
  const handleFetchLiveLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLiveCoords(coords);
        setLocationMode("gps");

        // Automatically fetch and fill all address fields from GPS
        await reverseGeocodeCoords(coords.lat, coords.lng);
        setIsLocating(false);
        toast.success(`GPS Location Acquired: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      },
      (err) => {
        setIsLocating(false);
        setLocationError("Location permission denied. You can enter your pickup address manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Compile full product object
  const compileProductObject = (status: "draft" | "under_review" = "under_review"): PayerntProduct => {
    const photosArr: ProductPhoto[] = [];
    if (frontPhotoUrl) {
      photosArr.push({ id: `photo-front-${Date.now()}`, url: frontPhotoUrl, tag: "Front View", isPrimary: true });
    }
    if (backPhotoUrl) {
      photosArr.push({ id: `photo-back-${Date.now()}`, url: backPhotoUrl, tag: "Back View", isPrimary: false });
    }

    const customSpecsArr: { label: string; value: string }[] = [];
    if (heightCm) customSpecsArr.push({ label: "Height", value: `${heightCm} cm` });
    if (widthCm) customSpecsArr.push({ label: "Width", value: `${widthCm} cm` });
    if (weightKg) customSpecsArr.push({ label: "Weight", value: `${weightKg} kg` });
    customSpecsArr.push(...additionalSpecs);

    const titleText = productName.trim() || `${brand} ${model}`.trim() || "Rentable Equipment";
    const ownerId = activeAccount?.accountId || (activeAccount as any)?.id || "user_payernt";
    const ownerName = activeAccount?.name || "Verified Lender";
    const ownerEmail = activeAccount?.email || "";

    return {
      id: initialDraft?.id || `prod-${Date.now()}`,
      ownerId,
      ownerAccountType: "paye₹nt",
      title: titleText,
      name: titleText,
      category,
      customCategoryName: category === "other" ? customCategoryName : undefined,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      year: year || "2024",
      description: description.trim() || `${titleText} available for peer-to-peer equipment rental on paYent.`,
      specifications: `${brand} ${model} (${year})`.trim(),
      features: accessoriesList,
      photos: photosArr,
      images: photosArr.map((p) => p.url),
      primaryImage: frontPhotoUrl || backPhotoUrl || "",
      videoUrl: capturedVideoUrl || undefined,
      specs: {
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        year: year || undefined,
        serialNumber: deviceId || undefined,
        lensMount: lensMount || undefined,
        sensorResolution: sensorResolution || undefined,
        processor: processor || undefined,
        ram: ram || undefined,
        storage: storage || undefined,
        flightTime: flightTime || undefined,
        batteryCapacity: batteryCapacity || undefined,
        engineCc: engineCc || undefined,
        mileage: mileage || undefined,
        powerWattage: powerWattage || undefined,
        connectivity: connectivity || undefined,
        includedAccessories: accessoriesList,
        customSpecs: customSpecsArr,
      },
      condition: {
        grade: conditionGrade,
        visibleDamage,
        damageDescription: visibleDamage ? damageDescription : undefined,
        damageDetails: visibleDamage ? damageDescription : "None",
        scratches,
        functionalIssues: false,
        previousRepairs: false,
        additionalNotes: conditionNotes || undefined,
        accessoriesIncluded: accessoriesList,
      },
      damageDetails: visibleDamage ? damageDescription : "None",
      accessories: accessoriesList.join(", "),
      location: {
        city: pickupCity.trim(),
        state: pickupState.trim(),
        area: pickupArea.trim() || pickupAddressLine.trim(),
        pincode: pickupPincode.trim(),
        postalCode: pickupPincode.trim(),
        pickupAvailable: true,
        doorstepDeliveryAvailable: true,
        landmark: pickupLandmark || undefined,
        pickupInstructions: `Pickup: ${pickupAddressLine}, ${pickupArea}, ${pickupCity}; Drop: ${sameAsPickup ? "Same as pickup" : `${dropAddressLine}, ${dropArea}, ${dropCity}`}`,
      },
      city: pickupCity.trim(),
      area: pickupArea.trim() || pickupAddressLine.trim(),
      postalCode: pickupPincode.trim(),
      daily_rate: selectedRentalPrice,
      dailyRate: selectedRentalPrice,
      weekly_rate: Math.round(selectedRentalPrice * 6),
      monthly_rate: Math.round(selectedRentalPrice * 22),
      pricing: {
        daily: selectedRentalPrice,
        weekly: Math.round(selectedRentalPrice * 6),
        monthly: Math.round(selectedRentalPrice * 22),
        securityDeposit: 0,
        minimumRentalDays: 1,
      },
      price: selectedRentalPrice,
      availability: {
        type: "always",
        availableNow,
        availableFromDate,
        availableUntilDate,
        unavailableDates,
        bufferDaysBetweenRentals: bufferDays,
      },
      verificationDocs: {
        ownerFullName: ownerName,
        ownerPhone: activeAccount?.phone || "",
        ownerEmail,
        idProofType: "Aadhaar",
        proofStatus: "Under Review",
        agreedToTerms,
      },
      verificationStatus: "under_review",
      status: "under_review",
      verificationNotes: "Submitted for Admin Pricing & Authenticity Review.",
      availabilityStatus: "paused",
      totalRentalsCount: 0,
      totalEarningsGenerated: 0,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Stage Validation
  const validateStage = (stage: number): boolean => {
    if (stage === 1) {
      if (!category) {
        toast.error("Please select an equipment category.");
        return false;
      }
      if (category === "other" && !customCategoryName.trim()) {
        toast.error("Please specify your custom category name.");
        return false;
      }
      if (!productName.trim() && (!brand.trim() || !model.trim())) {
        toast.error("Please provide a product name or brand and model.");
        return false;
      }
      return true;
    }

    if (stage === 2) {
      if (!frontPhotoUrl || !backPhotoUrl || !capturedVideoUrl) {
        toast.error("Complete all required product media.");
        return false;
      }
      if (visibleDamage && !damageDescription.trim()) {
        toast.error("Please disclose the damage description.");
        return false;
      }
      return true;
    }

    if (stage === 3) {
      if (new Date(availableFromDate) > new Date(availableUntilDate)) {
        toast.error("Available until date must be after available from date.");
        return false;
      }
      if (locationMode === "manual") {
        if (!pickupAddressLine.trim() && !pickupArea.trim()) {
          toast.error("Please provide your pickup street address or locality.");
          return false;
        }
        if (!pickupCity.trim()) {
          toast.error("Please enter the pickup city.");
          return false;
        }
        if (!pickupPincode.trim() || pickupPincode.trim().length < 5) {
          toast.error("Please enter a valid postal pincode.");
          return false;
        }
      } else if (locationMode === "gps" && !liveCoords) {
        toast.error("Please acquire your live GPS location.");
        return false;
      }
      return true;
    }

    if (stage === 4) {
      if (!agreedToTerms) {
        toast.error("Please accept the paYent listing terms and conditions.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStage = () => {
    if (validateStage(currentStage)) {
      setCurrentStage((prev) => Math.min(5, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStage = () => {
    setCurrentStage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Drag-To-Submit Action
  const handleFinalSubmit = async () => {
    if (!finalConfirmationChecked) {
      toast.error("Please check the confirmation checkbox before submitting.");
      return;
    }

    for (let s = 1; s <= 4; s++) {
      if (!validateStage(s)) {
        setCurrentStage(s);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const productObj = compileProductObject("under_review");
      const res = await payerntApi.createProduct(productObj);

      const finalProduct: PayerntProduct = {
        ...productObj,
        id: (res && res.productId) ? res.productId : productObj.id,
        status: "under_review",
        verificationStatus: "under_review",
      };

      onSubmitProduct(finalProduct);
      setCreatedProduct(finalProduct);
      setIsSubmittedSuccess(true);
      toast.success("Listing submitted to Admin Review successfully!");
    } catch (err: any) {
      console.error("[Create Listing] Submission error:", err);
      toast.error(err?.message || "Failed to submit listing. Please try again.");
    } finally {
      setIsSubmitting(false);
      setDragProgress(0);
    }
  };

  // 5 Listing Stage Metadata
  const STAGES = [
    { num: "01", title: "Category & Specs", desc: "Category selection & hardware details", id: 1 },
    { num: "02", title: "Photos & Condition", desc: "Live front/back photos & 10s video", id: 2 },
    { num: "03", title: "Availability & Location", desc: "Calendar dates & pickup/drop address", id: 3 },
    { num: "04", title: "Review & Terms", desc: "Complete review & terms acceptance", id: 4 },
    { num: "05", title: "Price Range & Submit", desc: "Admin price range & drag-to-publish", id: 5 },
  ];

  // SUCCESS SCREEN
  if (isSubmittedSuccess && createdProduct) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl border border-emerald-500/30 bg-card p-8 sm:p-12 text-center space-y-6 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="h-9 w-9" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Listing Submitted Successfully
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display">
            Under Admin Review
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your listing and 10-second inspection video have been submitted to Admin. Once approved with the confirmed rental rate (₹{selectedRentalPrice}/day), it will go live on the paYent marketplace.
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-secondary/30 flex items-center gap-4 max-w-md mx-auto text-left">
          {createdProduct.primaryImage ? (
            <img
              src={createdProduct.primaryImage}
              alt={createdProduct.title}
              className="h-16 w-16 rounded-xl object-cover bg-secondary border border-border shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 text-muted-foreground">
              <Package className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1 w-fit">
              <Clock className="h-3 w-3" /> PENDING ADMIN APPROVAL
            </span>
            <h4 className="font-bold text-xs text-foreground truncate mt-1">{createdProduct.title}</h4>
            <p className="text-[11px] text-muted-foreground">
              Selected Rate: ₹{selectedRentalPrice}/day • {createdProduct.location.city}
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onCancel()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
          >
            View in My Products
          </button>
          <button
            onClick={() => {
              setIsSubmittedSuccess(false);
              setCurrentStage(1);
              setCategory("");
              setIsCategorySelected(false);
              setProductName("");
              setBrand("");
              setModel("");
              setFrontPhotoUrl("");
              setBackPhotoUrl("");
              setCapturedVideoUrl("");
              setAgreedToTerms(false);
              setFinalConfirmationChecked(false);
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
    <div className="w-full space-y-6 text-left pb-16">
      {/* Back Button */}
      {onCancel && (
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> paYent Listing Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display mt-1">
            Create Equipment Listing
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete the 5 listing steps to publish gear for peer-to-peer rentals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const draft = compileProductObject("draft");
              onSaveDraft(draft);
              toast.success("Listing saved to drafts!");
            }}
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

      {/* 2-COLUMN DESKTOP LAYOUT (Stages Nav + Workspace) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* ========================================================================= */}
        {/* 1. LEFT LISTING FLOW (Stages 01 - 05)                                     */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 bg-card border border-border/80 rounded-3xl p-5 shadow-xs lg:sticky lg:top-20">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Listing Stages
          </h3>

          <div className="relative space-y-2">
            {STAGES.map((st, idx) => {
              const isActive = currentStage === st.id;
              const isCompleted = currentStage > st.id;
              const isUpcoming = currentStage < st.id;

              return (
                <div key={st.id} className="relative">
                  {/* Connector line between steps */}
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`absolute left-4 top-10 w-0.5 h-8 -ml-[1px] transition-colors ${isCompleted ? "bg-emerald-500/50" : "bg-border/60"
                        }`}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted) {
                        setCurrentStage(st.id);
                      }
                    }}
                    disabled={isUpcoming}
                    className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition-all ${isActive
                      ? "bg-primary/10 border border-primary/30 shadow-xs ring-1 ring-primary/20"
                      : isCompleted
                        ? "bg-secondary/40 border border-border/60 hover:bg-secondary cursor-pointer"
                        : "opacity-60 cursor-not-allowed border border-transparent"
                      }`}
                  >
                    {/* Circle Indicator */}
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-all ${isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isCompleted
                          ? "bg-emerald-500 text-white"
                          : "bg-secondary text-muted-foreground border border-border"
                        }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : st.num}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-xs font-bold leading-none ${isActive ? "text-primary" : "text-foreground"
                          }`}
                      >
                        {st.title}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                        {st.desc}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Stage {currentStage} of 5</span>
            <span className="font-mono font-bold text-foreground">
              {Math.round((currentStage / 5) * 100)}% Complete
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN WORKSPACE                                                         */}
        {/* ========================================================================= */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          <AnimatePresence mode="wait">
            {/* ------------------------------------------------------------------- */}
            {/* STAGE 01: CATEGORY + PRODUCT SPECIFICATIONS                         */}
            {/* ------------------------------------------------------------------- */}
            {currentStage === 1 && (
              <motion.div
                key="stage1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-3.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Stage 01
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground mt-0.5">
                    Category & Specifications
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0">
                    Select a category. Suggested brands, 1-click templates, and relevant specs will dynamically unlock and change.
                  </p>
                </div>

                {/* CATEGORY SELECTOR BEHAVIOR:
                    Initial: Shows all categories.
                    Once selected: Shows selected with "Change Category" button.
                */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      Equipment Category <span className="text-destructive">*</span>
                    </label>
                    {isCategorySelected && (
                      <button
                        type="button"
                        onClick={() => setIsCategorySelected(false)}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        Change Category
                      </button>
                    )}
                  </div>

                  {!isCategorySelected ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-3 gap-y-1.5 animate-in fade-in-50">
                      {CATEGORIES.map((cat) => {
                        const IconComp = cat.icon;
                        const isSelected = category === cat.id;

                        return (
                          <div key={cat.id} className="flex flex-col items-center gap-0.5 text-center group">
                            <button
                              type="button"
                              onClick={() => handleSelectCategory(cat.id)}
                              className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${isSelected
                                  ? "bg-primary text-primary-foreground shadow-xs scale-105"
                                  : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground active:scale-95"
                                }`}
                              title={cat.label}
                            >
                              <IconComp className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[1.9]" />
                            </button>
                            <span className="text-[10px] font-medium leading-tight text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1 mt-0.5">
                              {cat.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* COLLAPSED / SELECTED CATEGORY VIEW */
                    <div className="p-2.5 rounded-xl bg-primary/10 flex items-center justify-between animate-in zoom-in-95">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                          {React.createElement(
                            CATEGORIES.find((c) => c.id === category)?.icon || Camera,
                            { className: "h-4.5 w-4.5 stroke-[2]" }
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            {CATEGORIES.find((c) => c.id === category)?.label || category}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Selected Category
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCategorySelected(false)}
                        className="px-2.5 py-1 rounded-lg border border-border bg-card text-foreground font-semibold text-[11px] hover:bg-secondary transition-all cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {category === "other" && isCategorySelected && (
                    <div className="pt-2 animate-in fade-in-50">
                      <label className="text-xs font-semibold text-foreground">
                        Custom Category Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        placeholder="e.g. Specialty Lighting Rig"
                        className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* DYNAMIC CATEGORY SPECIFICATIONS */}
                {isCategorySelected && (
                  <div className="space-y-4 pt-2 border-t border-border/60 animate-in fade-in-50">
                    {/* DEVICE SPECIFICATIONS INPUTS */}
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-xs font-bold text-foreground">
                          Product Name / Title <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder={currentCategoryMeta.titlePlaceholder}
                          className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-foreground">Brand / Make</label>
                          <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder={currentCategoryMeta.brandPlaceholder}
                            className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground">Model</label>
                          <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder={currentCategoryMeta.modelPlaceholder}
                            className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-foreground">Device / Product ID</label>
                          <input
                            type="text"
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            placeholder="e.g. SN-8842918"
                            className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground">Purchase / Manufacture Year</label>
                          <input
                            type="text"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            placeholder="e.g. 2024"
                            className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground">Description</label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={currentCategoryMeta.descPlaceholder}
                          className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none resize-none"
                        />
                      </div>

                      {/* PHYSICAL DIMENSIONS: Height, Width, Weight ONLY */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <label className="text-xs font-bold text-foreground">
                          Physical Dimensions (Height, Width, Weight)
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <span className="text-[10px] text-muted-foreground">Height (cm)</span>
                            <input
                              type="text"
                              value={heightCm}
                              onChange={(e) => setHeightCm(e.target.value)}
                              placeholder="e.g. 9.6"
                              className="w-full mt-0.5 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">Width (cm)</span>
                            <input
                              type="text"
                              value={widthCm}
                              onChange={(e) => setWidthCm(e.target.value)}
                              placeholder="e.g. 13.1"
                              className="w-full mt-0.5 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">Weight (kg)</span>
                            <input
                              type="text"
                              value={weightKg}
                              onChange={(e) => setWeightKg(e.target.value)}
                              placeholder="e.g. 0.65"
                              className="w-full mt-0.5 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* DYNAMIC CATEGORY TECHNICAL SPECIFICATIONS */}
                      {currentCategoryMeta.specFields && currentCategoryMeta.specFields.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/60">
                          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span>{currentCategoryMeta.label} Technical Specifications</span>
                          </label>
                          <div className={`grid grid-cols-1 ${currentCategoryMeta.specFields.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-2"} gap-3`}>
                            {currentCategoryMeta.specFields.map((field) => (
                              <div key={field.id} className={field.span || ""}>
                                <span className="text-[10px] font-semibold text-foreground">{field.label}</span>
                                <input
                                  type="text"
                                  value={getSpecValue(field.id)}
                                  onChange={(e) => setSpecValue(field.id, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="w-full mt-0.5 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* OPTIONAL ADDITIONAL SPECIFICATIONS */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <label className="text-xs font-bold text-foreground">
                          Additional Specifications (Optional)
                        </label>
                        {additionalSpecs.length > 0 && (
                          <div className="space-y-1.5">
                            {additionalSpecs.map((s, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-xl bg-secondary/40 border border-border text-xs"
                              >
                                <span className="font-semibold text-foreground">
                                  {s.label}: <span className="font-normal text-muted-foreground">{s.value}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAdditionalSpecs((prev) => prev.filter((_, i) => i !== idx))}
                                  className="text-muted-foreground hover:text-destructive cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                          <input
                            type="text"
                            value={newSpecLabel}
                            onChange={(e) => setNewSpecLabel(e.target.value)}
                            placeholder="e.g. Battery Capacity"
                            className="sm:col-span-2 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                          />
                          <input
                            type="text"
                            value={newSpecValue}
                            onChange={(e) => setNewSpecValue(e.target.value)}
                            placeholder="e.g. 5000 mAh"
                            className="sm:col-span-2 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newSpecLabel.trim() || !newSpecValue.trim()) return;
                              setAdditionalSpecs((prev) => [...prev, { label: newSpecLabel.trim(), value: newSpecValue.trim() }]);
                              setNewSpecLabel("");
                              setNewSpecValue("");
                            }}
                            className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* STAGE 02: PHOTOS + CONDITION (FRONT/BACK CAMERAS + 10s VIDEO)       */}
            {/* ------------------------------------------------------------------- */}
            {currentStage === 2 && (
              <motion.div
                key="stage2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Stage 02
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground mt-1">
                    Product Media
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Capture the required product evidence.
                  </p>
                </div>

                {/* Hidden native camera file inputs */}
                <input
                  ref={frontPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoFileCapture(e, "front")}
                />
                <input
                  ref={backPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoFileCapture(e, "back")}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleVideoFileCapture}
                />

                {/* Error Banner */}
                {mediaError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1.5 animate-in fade-in">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{mediaError}</span>
                    </p>
                    <p className="text-[11px] opacity-90">Please ensure camera permissions are allowed and try again.</p>
                  </div>
                )}

                {/* 3 DIRECT CAMERA CAPTURE CARDS */}
                <div className="space-y-3">
                  {/* CARD 1: FRONT PHOTO */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    frontPhotoUrl
                      ? "bg-card border-border shadow-xs"
                      : "bg-card/60 border-border/80"
                  }`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          frontPhotoUrl
                            ? "bg-foreground text-background"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}>
                          {frontPhotoUrl ? "✓" : "1"}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Front Photo <span className="text-destructive">*</span>
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        frontPhotoUrl
                          ? "bg-secondary text-foreground border border-border"
                          : "bg-secondary/60 text-muted-foreground"
                      }`}>
                        {frontPhotoUrl ? "Captured" : "Pending"}
                      </span>
                    </div>

                    {frontPhotoUrl ? (
                      <div className="space-y-2.5">
                        <div className="relative h-44 sm:h-52 rounded-lg overflow-hidden border border-border bg-black">
                          <img
                            src={frontPhotoUrl}
                            alt="Front View Evidence"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleTriggerFrontCamera}
                            disabled={isProcessingMedia}
                            className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Retake</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFrontPhotoUrl("")}
                            className="px-3.5 py-2 rounded-lg bg-secondary/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 px-4 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-2.5 bg-secondary/10 text-center">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground">
                          <Camera className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Front View</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Position front of equipment clearly in frame.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleTriggerFrontCamera}
                          disabled={isProcessingMedia}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>Take Photo</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: BACK PHOTO */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    backPhotoUrl
                      ? "bg-card border-border shadow-xs"
                      : "bg-card/60 border-border/80"
                  }`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          backPhotoUrl
                            ? "bg-foreground text-background"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}>
                          {backPhotoUrl ? "✓" : "2"}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Back Photo <span className="text-destructive">*</span>
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        backPhotoUrl
                          ? "bg-secondary text-foreground border border-border"
                          : "bg-secondary/60 text-muted-foreground"
                      }`}>
                        {backPhotoUrl ? "Captured" : "Pending"}
                      </span>
                    </div>

                    {backPhotoUrl ? (
                      <div className="space-y-2.5">
                        <div className="relative h-44 sm:h-52 rounded-lg overflow-hidden border border-border bg-black">
                          <img
                            src={backPhotoUrl}
                            alt="Back View Evidence"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleTriggerBackCamera}
                            disabled={isProcessingMedia}
                            className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Retake</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBackPhotoUrl("")}
                            className="px-3.5 py-2 rounded-lg bg-secondary/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 px-4 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-2.5 bg-secondary/10 text-center">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground">
                          <Camera className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Back View</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Position rear panel, ports, or serial tag.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleTriggerBackCamera}
                          disabled={isProcessingMedia}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>Take Photo</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CARD 3: 10-SECOND INSPECTION VIDEO */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    capturedVideoUrl
                      ? "bg-card border-border shadow-xs"
                      : "bg-card/60 border-border/80"
                  }`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          capturedVideoUrl
                            ? "bg-foreground text-background"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}>
                          {capturedVideoUrl ? "✓" : "3"}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          10s Inspection Video <span className="text-destructive">*</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {capturedVideoUrl && (
                          <span className="text-[10px] font-mono font-bold bg-secondary px-2 py-0.5 rounded-md text-foreground border border-border">
                            {videoDuration}
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          capturedVideoUrl
                            ? "bg-secondary text-foreground border border-border"
                            : "bg-secondary/60 text-muted-foreground"
                        }`}>
                          {capturedVideoUrl ? "Captured" : "Pending"}
                        </span>
                      </div>
                    </div>

                    {capturedVideoUrl ? (
                      <div className="space-y-2.5">
                        <div className="relative h-44 sm:h-52 rounded-lg overflow-hidden border border-border bg-black">
                          <video
                            src={capturedVideoUrl}
                            controls
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleTriggerVideoCamera}
                            disabled={isProcessingMedia}
                            className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Retake</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCapturedVideoUrl("")}
                            className="px-3.5 py-2 rounded-lg bg-secondary/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 px-4 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-2.5 bg-secondary/10 text-center">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground">
                          <Video className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">10-Second Inspection Video</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Record a continuous walkaround video (maximum 10 seconds).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleTriggerVideoCamera}
                          disabled={isProcessingMedia}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Record Video</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* COMPACT COMPLETION SUMMARY */}
                <div className="p-3 rounded-xl bg-secondary/30 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Media</span>
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                      {(frontPhotoUrl ? 1 : 0) + (backPhotoUrl ? 1 : 0) + (capturedVideoUrl ? 1 : 0)} / 3 complete
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    <span className={frontPhotoUrl ? "text-foreground font-bold" : ""}>
                      {frontPhotoUrl ? "✓" : "○"} Front
                    </span>
                    <span className={backPhotoUrl ? "text-foreground font-bold" : ""}>
                      {backPhotoUrl ? "✓" : "○"} Back
                    </span>
                    <span className={capturedVideoUrl ? "text-foreground font-bold" : ""}>
                      {capturedVideoUrl ? "✓" : "○"} Video
                    </span>
                  </div>
                </div>

                {/* 4. CONDITION DISCLOSURE */}
                <div className="space-y-3.5 pt-2 border-t border-border/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Condition Grading
                  </h3>

                  {/* 5 CONDITION GRADES ON ONE LINE */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {CONDITION_GRADES.map((cg) => {
                      const isSelected = conditionGrade === cg.grade;
                      return (
                        <button
                          key={cg.grade}
                          type="button"
                          onClick={() => setConditionGrade(cg.grade)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isSelected
                              ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/20"
                              : "border-border bg-card hover:bg-secondary/50"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`text-[11px] font-bold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                              {cg.label}
                            </span>
                            {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                          </div>
                          <p className="text-[9.5px] text-muted-foreground line-clamp-2 leading-tight">
                            {cg.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Cosmetic Marks / Scratches */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Cosmetic Marks / Scratches</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SCRATCH_LEVELS.map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setScratches(lvl)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${scratches === lvl
                              ? "bg-foreground text-background border-foreground shadow-xs"
                              : "border-border bg-card text-muted-foreground hover:bg-secondary"
                            }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Any Visible Defects or Specific Damage? (Next section after Cosmetic Marks / Scratches) */}
                  <div className="p-3.5 rounded-xl border border-border bg-secondary/20 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-foreground block">Any Visible Defects or Specific Damage?</span>
                        <p className="text-[11px] text-muted-foreground">
                          Honest disclosure ensures seamless admin review & prevents dispute penalties.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={visibleDamage}
                          onChange={(e) => setVisibleDamage(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5.5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {visibleDamage && (
                      <div className="pt-1.5 animate-in fade-in-50">
                        <label className="text-[11px] font-semibold text-destructive">
                          Describe Defect / Damage Details <span className="text-destructive">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={damageDescription}
                          onChange={(e) => setDamageDescription(e.target.value)}
                          placeholder="e.g. Minor hairline scratch on outer edge."
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-destructive/40 bg-background text-foreground text-xs focus:ring-2 focus:ring-destructive outline-none resize-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Accessories */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Included Accessories</label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_ACCESSORY_TAGS.map((tag) => {
                        const isIncluded = accessoriesList.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isIncluded) setAccessoriesList((prev) => prev.filter((item) => item !== tag));
                              else setAccessoriesList((prev) => [...prev, tag]);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${isIncluded
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border hover:bg-secondary"
                              }`}
                          >
                            <span>{tag}</span>
                            {isIncluded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* STAGE 03: AVAILABILITY + LOCATION (COMBINED STEP)                   */}
            {/* ------------------------------------------------------------------- */}
            {currentStage === 3 && (
              <motion.div
                key="stage3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Stage 03
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground mt-1">
                    Availability & Location
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define equipment calendar availability and specify pickup and drop locations.
                  </p>
                </div>

                {/* 1. AVAILABILITY CALENDAR */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                    <span>Availability Scheduling</span>
                  </h3>

                  <div className="p-4 rounded-2xl border border-border bg-secondary/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground">Immediate Availability</span>
                      <p className="text-[11px] text-muted-foreground">
                        Allow verified renters to request gear starting today.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={availableNow}
                        onChange={(e) => setAvailableNow(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground">Available From</label>
                      <input
                        type="date"
                        value={availableFromDate}
                        onChange={(e) => setAvailableFromDate(e.target.value)}
                        className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground">Available Until</label>
                      <input
                        type="date"
                        value={availableUntilDate}
                        onChange={(e) => setAvailableUntilDate(e.target.value)}
                        className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>

                  {/* Blocked Dates Manager */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <label className="text-xs font-semibold text-foreground">
                      Block Dates (Personal Use / Maintenance)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={newBlockedDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setNewBlockedDate(e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newBlockedDate) return;
                          if (unavailableDates.includes(newBlockedDate)) {
                            toast.error("Date already blocked.");
                            return;
                          }
                          setUnavailableDates((prev) => [...prev, newBlockedDate].sort());
                          setNewBlockedDate("");
                          toast.info(`Blocked date ${newBlockedDate}.`);
                        }}
                        className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all cursor-pointer"
                      >
                        Block Date
                      </button>
                    </div>

                    {unavailableDates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {unavailableDates.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-[11px] font-mono font-semibold border border-destructive/20"
                          >
                            <span>{d}</span>
                            <button
                              type="button"
                              onClick={() => setUnavailableDates((prev) => prev.filter((item) => item !== d))}
                              className="hover:opacity-75 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. PICKUP + DROP LOCATION (GPS vs MANUAL ENTRY) */}
                <div className="space-y-4 pt-2 border-t border-border/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Location Specification</span>
                  </h3>

                  {/* Location Method Radio */}
                  <div className="flex rounded-2xl bg-secondary/50 p-1 border border-border">
                    <button
                      type="button"
                      onClick={() => setLocationMode("manual")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${locationMode === "manual"
                        ? "bg-card text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Enter Manually</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationMode("gps");
                        if (!liveCoords) handleFetchLiveLocation();
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${locationMode === "gps"
                        ? "bg-card text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <Navigation className="h-3.5 w-3.5 text-primary" />
                      <span>Use GPS</span>
                    </button>
                  </div>

                  {locationMode === "gps" && (
                    <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">GPS Location Auto-Detect</span>
                        <button
                          type="button"
                          onClick={handleFetchLiveLocation}
                          disabled={isLocating}
                          className="px-3 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
                        >
                          {isLocating ? "Locating..." : "Refresh GPS"}
                        </button>
                      </div>
                      {liveCoords && (
                        <p className="text-xs font-mono text-primary font-bold">
                          Latitude: {liveCoords.lat.toFixed(4)}, Longitude: {liveCoords.lng.toFixed(4)}
                        </p>
                      )}
                      {locationError && <p className="text-xs text-destructive">{locationError}</p>}
                    </div>
                  )}

                  {/* Pickup Address Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-foreground">
                        Pickup Address Line <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={pickupAddressLine}
                        onChange={(e) => setPickupAddressLine(e.target.value)}
                        placeholder="e.g. 104, Sunrise Apartments, 12th Main Road"
                        className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground">Locality / Area</label>
                        <input
                          type="text"
                          value={pickupArea}
                          onChange={(e) => setPickupArea(e.target.value)}
                          placeholder="e.g. Indiranagar"
                          className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground">Landmark</label>
                        <input
                          type="text"
                          value={pickupLandmark}
                          onChange={(e) => setPickupLandmark(e.target.value)}
                          placeholder="e.g. Near Metro Station"
                          className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-bold text-foreground">
                          City <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={pickupCity}
                          onChange={(e) => setPickupCity(e.target.value)}
                          placeholder="e.g. Bengaluru"
                          className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground">State</label>
                        <input
                          type="text"
                          value={pickupState}
                          onChange={(e) => setPickupState(e.target.value)}
                          placeholder="e.g. Karnataka"
                          className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground">
                          Pincode <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={pickupPincode}
                          onChange={(e) => setPickupPincode(e.target.value)}
                          placeholder="e.g. 560038"
                          className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DROP LOCATION & SAME AS PICKUP CHECKBOX */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Drop Location</span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={sameAsPickup}
                          onChange={(e) => setSameAsPickup(e.target.checked)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span>Same as Pickup Location</span>
                      </label>
                    </div>

                    {!sameAsPickup && (
                      <div className="space-y-3 pt-2 animate-in fade-in-50">
                        <div>
                          <label className="text-xs font-semibold text-foreground">Drop Address Line</label>
                          <input
                            type="text"
                            value={dropAddressLine}
                            onChange={(e) => setDropAddressLine(e.target.value)}
                            placeholder="e.g. Studio 4B, Koramangala 5th Block"
                            className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-foreground">Drop Area</label>
                            <input
                              type="text"
                              value={dropArea}
                              onChange={(e) => setDropArea(e.target.value)}
                              placeholder="e.g. Koramangala"
                              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-foreground">Drop City</label>
                            <input
                              type="text"
                              value={dropCity}
                              onChange={(e) => setDropCity(e.target.value)}
                              placeholder="e.g. Bengaluru"
                              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-foreground">Drop Pincode</label>
                            <input
                              type="text"
                              value={dropPincode}
                              onChange={(e) => setDropPincode(e.target.value)}
                              placeholder="e.g. 560034"
                              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* STAGE 04: PRODUCT REVIEW + TERMS                                    */}
            {/* ------------------------------------------------------------------- */}
            {currentStage === 4 && (
              <motion.div
                key="stage4"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Stage 04
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground mt-1">
                    Product Review & Terms
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Review all specifications, captured media, availability and location before pricing.
                  </p>
                </div>

                {/* 1. PRODUCT & SPECS REVIEW */}
                <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded-full uppercase text-muted-foreground">
                        Stage 01
                      </span>
                      <h4 className="text-xs font-bold text-foreground">Product & Dimensions</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStage(1)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Category</span>
                      <span className="font-semibold text-foreground capitalize">
                        {CATEGORIES.find((c) => c.id === category)?.label || category}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Title</span>
                      <span className="font-semibold text-foreground truncate block">
                        {productName || "Untitled"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Brand & Model</span>
                      <span className="font-semibold text-foreground">
                        {brand || "—"} {model}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Dimensions (H×W)</span>
                      <span className="font-semibold text-foreground">
                        {heightCm && widthCm ? `${heightCm}×${widthCm} cm` : "Not specified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Weight</span>
                      <span className="font-semibold text-foreground">
                        {weightKg ? `${weightKg} kg` : "Not specified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Device ID</span>
                      <span className="font-semibold text-foreground font-mono">
                        {deviceId || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. MEDIA & CONDITION REVIEW */}
                <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded-full uppercase text-muted-foreground">
                        Stage 02
                      </span>
                      <h4 className="text-xs font-bold text-foreground">Photos & Condition</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStage(2)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    {frontPhotoUrl && (
                      <div className="relative">
                        <img src={frontPhotoUrl} alt="Front View" className="h-16 w-16 rounded-xl object-cover border border-border" />
                        <span className="absolute -bottom-1 -right-1 text-[9px] bg-primary text-primary-foreground font-bold px-1 rounded">
                          Front
                        </span>
                      </div>
                    )}
                    {backPhotoUrl && (
                      <div className="relative">
                        <img src={backPhotoUrl} alt="Back View" className="h-16 w-16 rounded-xl object-cover border border-border" />
                        <span className="absolute -bottom-1 -right-1 text-[9px] bg-secondary text-foreground font-bold px-1 rounded border border-border">
                          Back
                        </span>
                      </div>
                    )}
                    {capturedVideoUrl && (
                      <div className="h-16 w-16 rounded-xl bg-black border border-border flex items-center justify-center text-red-500 relative">
                        <Video className="h-6 w-6" />
                        <span className="absolute -bottom-1 -right-1 text-[9px] bg-red-600 text-white font-bold px-1 rounded">
                          10s Video
                        </span>
                      </div>
                    )}
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-foreground">
                        Grade: <span className="text-primary">{conditionGrade}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Scratches: {scratches} • Damage: {visibleDamage ? "Yes (Disclosed)" : "None"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. AVAILABILITY & LOCATION REVIEW */}
                <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded-full uppercase text-muted-foreground">
                        Stage 03
                      </span>
                      <h4 className="text-xs font-bold text-foreground">Availability & Location</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStage(3)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="text-muted-foreground">
                      <strong className="text-foreground">Availability:</strong> {availableNow ? "Available Immediately" : `From ${availableFromDate}`}
                    </div>
                    <div className="text-muted-foreground">
                      <strong className="text-foreground">Pickup Location:</strong> {currentListingLocationDisplay}
                    </div>
                    <div className="text-muted-foreground">
                      <strong className="text-foreground">Drop Location:</strong> {currentDropLocationDisplay}
                    </div>
                  </div>
                </div>

                {/* TERMS & CONDITIONS ACCEPTANCE */}
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Listing Agreement</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowFullTermsModal(true)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      View Full Terms
                    </button>
                  </div>

                  <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-primary/30 bg-primary/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-bold text-foreground leading-normal">
                      I agree to paYent's listing Terms & Conditions. <span className="text-destructive">*</span>
                    </span>
                  </label>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* STAGE 05: PRICE RANGE + FINAL SUBMISSION (3 DISTINCT SECTIONS)      */}
            {/* ------------------------------------------------------------------- */}
            {currentStage === 5 && (
              <motion.div
                key="stage5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Stage 05
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground mt-1">
                    Price Range & Final Submission
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Review your live marketplace preview, adjust your daily rental price, and drag the slider to submit for admin review.
                  </p>
                </div>

                {/* =============================================================== */}
                {/* 2-COLUMN ROW: PREVIEW CARD (LEFT) & CONFIRMATION CHECK (RIGHT)   */}
                {/* =============================================================== */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                  {/* Left Column: Live Marketplace Preview Card */}
                  <div className="md:col-span-6 lg:col-span-6 flex flex-col">
                    <div className="relative rounded-2xl overflow-hidden border border-border/90 bg-neutral-950 h-56 sm:h-64 w-full shadow-md flex flex-col justify-between group">
                      {/* Background Product Image / Fallback */}
                      {frontPhotoUrl ? (
                        <img
                          src={frontPhotoUrl}
                          alt={productName || "Product Preview"}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 bg-neutral-900/90 gap-1.5 p-4 text-center">
                          <ImagePlus className="h-8 w-8 opacity-40 text-neutral-300" />
                          <span className="text-xs font-semibold text-neutral-200">Product Image Preview</span>
                          <span className="text-[10px] text-neutral-400">Front view photo will appear as background</span>
                        </div>
                      )}

                      {/* Gradient Overlay for Crisp Text Readability */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/35 to-black/60 pointer-events-none" />

                      {/* TOP OVERLAY: Category Pill, Condition Badge & Video */}
                      <div className="relative z-10 p-3 flex items-center justify-between">
                        <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-xs capitalize flex items-center gap-1.5">
                          {React.createElement(
                            CATEGORIES.find((c) => c.id === category)?.icon || Camera,
                            { className: "h-3 w-3 text-primary" }
                          )}
                          <span>{CATEGORIES.find((c) => c.id === category)?.label || "Category"}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {capturedVideoUrl && (
                            <div className="bg-red-600/90 backdrop-blur-md text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <Video className="h-2.5 w-2.5" />
                              <span>10s Video</span>
                            </div>
                          )}
                          <div className="bg-primary text-primary-foreground text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                            {conditionGrade}
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM OVERLAY: Product Details, Price Range & Verification Badges */}
                      <div className="relative z-10 p-3.5 space-y-2">
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-extrabold text-primary-foreground/90 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="bg-primary text-primary-foreground px-1.5 py-0.2 rounded text-[9px] font-black">
                              {brand || "BRAND"}
                            </span>
                            <span className="text-white/80">{model}</span>
                          </div>
                          <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight drop-shadow-md truncate">
                            {productName || "Product Name"}
                          </h3>
                        </div>

                        {/* Overlaid Badges Row: Rental Rate with Price Range, GPS Location & Availability */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[9.5px]">
                          {/* Admin Price Range Badge (Range Display, Not Fixed Amount) */}
                          <div className="bg-amber-400 text-neutral-950 font-extrabold px-2.5 py-1 rounded-lg shadow-xs flex items-baseline gap-1">
                            <span className="text-xs font-black">₹{adminMinPrice} – ₹{adminMaxPrice}</span>
                            <span className="text-[9px] font-bold opacity-85">/ day</span>
                          </div>

                          {/* Location Badge */}
                          <div className="bg-black/60 backdrop-blur-md text-white/90 border border-white/20 px-2 py-1 rounded-lg flex items-center gap-1 font-medium truncate max-w-[150px] sm:max-w-[190px]">
                            <MapPin className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                            <span className="truncate">{currentListingLocationDisplay}</span>
                          </div>

                          {/* Availability Badge */}
                          <div className="bg-black/60 backdrop-blur-md text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold">
                            <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                            <span>{availableNow ? "Available Now" : `From ${availableFromDate}`}</span>
                          </div>

                          {/* Lender Tag */}
                          <div className="bg-black/60 backdrop-blur-md text-white/80 border border-white/20 px-2 py-1 rounded-lg flex items-center gap-1">
                            <ShieldCheck className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                            <span>{activeAccount?.name || "Verified Lender"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Confirmation Checkbox (Right Side of Card - Compact) */}
                  <div className="md:col-span-6 lg:col-span-6 flex flex-col justify-center gap-2.5">
                    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/30 bg-card hover:bg-primary/5 transition-colors cursor-pointer shadow-xs">
                      <input
                        type="checkbox"
                        checked={finalConfirmationChecked}
                        onChange={(e) => setFinalConfirmationChecked(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary shrink-0 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-foreground leading-relaxed">
                        I confirm that all product information, photos, condition video, and location provided are authentic. <span className="text-destructive">*</span>
                      </span>
                    </label>

                    {/* Verified Review Guarantee Badge */}
                    <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center gap-2.5 text-xs text-muted-foreground shadow-xs">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </div>
                      <div className="leading-tight">
                        <span className="font-bold text-foreground block text-[11px]">Admin Review & Escrow Protected</span>
                        <span className="text-[10px]">Listing publishes immediately once confirmed by the review team.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =============================================================== */}
                {/* DRAG HANDLE SLIDER (WITH ANIMATED GREEN MOVING BACKGROUND)       */}
                {/* =============================================================== */}
                <div className="space-y-2 pt-2 max-w-md">
                  <div
                    className={`relative w-full h-12 rounded-2xl border transition-colors select-none overflow-hidden flex items-center ${dragProgress > 0 ? "border-emerald-500/50 bg-emerald-950/20 shadow-xs" : "border-border bg-secondary/40"
                      } ${!finalConfirmationChecked || isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-grab"
                      }`}
                  >
                    {/* Animated Green Moving Background Progress Fill */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-linear-to-r from-emerald-600 via-emerald-500 to-emerald-400 transition-all duration-75 overflow-hidden shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                      style={{ width: `${dragProgress}%` }}
                    >
                      {/* Continuous Moving Waves / Striped Shimmer Animation */}
                      {dragProgress > 0 && (
                        <div
                          className="absolute inset-0 opacity-40 animate-pulse bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.35)_10px,rgba(255,255,255,0.35)_20px)]"
                          style={{
                            animation: "spin 3s linear infinite reverse",
                            transformOrigin: "center",
                          }}
                        />
                      )}
                    </div>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-bold transition-colors">
                      {isSubmitting ? (
                        <span className="flex items-center gap-2 text-emerald-500">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Submitting Listing to Admin Review...</span>
                        </span>
                      ) : dragProgress >= 90 ? (
                        <span className="text-white font-extrabold drop-shadow-xs">Release to Submit for Admin Review</span>
                      ) : dragProgress > 0 ? (
                        <span className={dragProgress > 45 ? "text-white font-extrabold drop-shadow-xs" : "text-foreground font-bold"}>
                          Slide to Complete ({dragProgress}%) →
                        </span>
                      ) : (
                        <span className="text-foreground">Drag Handle to Submit for Admin Review →</span>
                      )}
                    </div>

                    {/* Draggable Knob */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={dragProgress}
                      disabled={!finalConfirmationChecked || isSubmitting}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDragProgress(val);
                        if (val >= 95 && !isSubmitting) {
                          handleFinalSubmit();
                        }
                      }}
                      onMouseUp={() => {
                        if (dragProgress < 95) setDragProgress(0);
                      }}
                      onTouchEnd={() => {
                        if (dragProgress < 95) setDragProgress(0);
                      }}
                      className="absolute inset-0 opacity-0 cursor-grab active:cursor-grabbing w-full h-full"
                    />

                    {/* Visual Knob Indicator */}
                    <div
                      className={`absolute h-9 w-9 rounded-xl flex items-center justify-center shadow-md pointer-events-none transition-all ${dragProgress > 0
                          ? "bg-emerald-600 text-white shadow-emerald-500/50 scale-105"
                          : "bg-primary text-primary-foreground"
                        }`}
                      style={{ left: `calc(${dragProgress}% * 0.85 + 6px)` }}
                    >
                      {dragProgress >= 90 ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Accessible Keyboard Alternative */}
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground px-1">
                    <span>Keyboard user?</span>
                    <button
                      type="button"
                      disabled={!finalConfirmationChecked || isSubmitting}
                      onClick={handleFinalSubmit}
                      className="font-bold text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Press to Submit to Admin Review
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* WORKSPACE FOOTER CONTROLS */}
          {currentStage < 5 && (
            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              {currentStage > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStage}
                  className="px-3.5 py-2 rounded-xl border border-border hover:bg-secondary text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNextStage}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Continue to {STAGES[currentStage]?.title || "Next"}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FULL TERMS MODAL */}
      {showFullTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-left">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground">paYent Rental Listing Agreement</h3>
              <button
                type="button"
                onClick={() => setShowFullTermsModal(false)}
                className="p-1 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs text-muted-foreground leading-relaxed pr-1">
              <p>
                <strong>1. Equipment Ownership & Legal Title:</strong> The Product Owner certifies that they possess full legal ownership and unencumbered right to list and rent the specified equipment on the paYent platform.
              </p>
              <p>
                <strong>2. Accurate Live Condition Evidence:</strong> All live camera photographs and the 10-second inspection video must truthfully represent the physical condition.
              </p>
              <p>
                <strong>3. Admin Pricing Authority:</strong> Final rental pricing is selected within the Admin-defined price range and confirmed through review.
              </p>
              <p>
                <strong>4. Lender Escrow Guarantee:</strong> paYent collects rental fees upfront in platform escrow, processing instant wallet payouts upon verified return.
              </p>
            </div>

            <div className="pt-3 border-t border-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFullTermsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW MODAL */}
      {previewPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full">
            <button
              type="button"
              onClick={() => setPreviewPhotoModal(null)}
              className="absolute -top-10 right-0 text-white hover:opacity-80 cursor-pointer p-1"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewPhotoModal}
              alt="Photo preview"
              className="w-full max-h-[80vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ListProductWizard;
