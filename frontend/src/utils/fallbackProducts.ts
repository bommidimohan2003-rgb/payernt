import type { Product } from "@/types";
import cameraImg from "@/assets/images/camera.webp";
import droneImg from "@/assets/images/drone.webp";
import laptopImg from "@/assets/images/laptop.webp";
import bikeImg from "@/assets/images/re_classic350.webp";
import toolImg from "@/assets/images/tool.webp";
import powerbankImg from "@/assets/images/powerbank.webp";
import audioImg from "@/assets/images/audio.jpg";

export const INITIAL_FALLBACK_PRODUCTS: Product[] = [
  {
    id: "sony-alpha-a7-iii",
    title: "Sony Alpha a7 III",
    category: "cameras",
    price: 499,
    rating: 4.8,
    reviews: 124,
    location: "Hyderabad, Telangana",
    image: cameraImg,
    images: [cameraImg],
    description:
      "Full-frame mirrorless camera with 24.2MP BSI sensor, 4K HDR video, and 5-axis optical image stabilization.",
    condition: "Excellent",
    status: "approved",
    available: true,
    owner: {
      id: "owner-sai-teja",
      name: "Sai Teja",
      city: "Hyderabad",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "canon-eos-r5",
    title: "Canon EOS R5 Mirrorless Camera",
    category: "cameras",
    price: 1200,
    rating: 4.9,
    reviews: 86,
    location: "Bengaluru, Karnataka",
    image: cameraImg,
    images: [cameraImg],
    description:
      "45MP full-frame CMOS sensor, 8K raw internal video recording, and 8-stop in-body image stabilization.",
    condition: "Like New",
    status: "approved",
    available: true,
    owner: {
      id: "owner-arun-k",
      name: "Arun Kumar",
      city: "Bengaluru",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "red-komodo-6k",
    title: "RED Komodo 6K Cinema Camera",
    category: "cameras",
    price: 3500,
    rating: 4.9,
    reviews: 12,
    location: "Hyderabad, Telangana",
    image: cameraImg,
    images: [cameraImg],
    description:
      "6K Super 35 global shutter sensor, REDCODE RAW recording, and ultra-compact cinema production body.",
    condition: "Excellent",
    status: "approved",
    available: true,
    owner: {
      id: "owner-cinema-pro",
      name: "Cinema Gear Pro",
      city: "Hyderabad",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "dji-mavic-3-pro",
    title: "DJI Mavic 3 Pro Cine Combo",
    category: "drones",
    price: 1800,
    rating: 4.9,
    reviews: 58,
    location: "Mumbai, Maharashtra",
    image: droneImg,
    images: [droneImg],
    description:
      "Triple-camera system featuring 4/3 CMOS Hasselblad sensor, 43-min flight time, and Apple ProRes recording.",
    condition: "Like New",
    status: "approved",
    available: true,
    owner: {
      id: "owner-aerial-hub",
      name: "Aerial Hub India",
      city: "Mumbai",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "dji-mini-4-pro",
    title: "DJI Mini 4 Pro Fly More Combo",
    category: "drones",
    price: 799,
    rating: 4.8,
    reviews: 42,
    location: "Hyderabad, Telangana",
    image: droneImg,
    images: [droneImg],
    description:
      "Sub-249g lightweight 4K/60fps HDR drone with omnidirectional obstacle sensing and 34-min flight time.",
    condition: "Excellent",
    status: "approved",
    available: true,
    owner: {
      id: "owner-rohit-v",
      name: "Rohit Varma",
      city: "Hyderabad",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "macbook-pro-m3-max",
    title: "Apple MacBook Pro 16\" (M3 Max, 64GB, 2TB)",
    category: "laptops",
    price: 1499,
    rating: 5.0,
    reviews: 31,
    location: "Bengaluru, Karnataka",
    image: laptopImg,
    images: [laptopImg],
    description:
      "16-core CPU, 40-core GPU, Liquid Retina XDR display. High-performance video editing and 3D rendering workstation.",
    condition: "Like New",
    status: "approved",
    available: true,
    owner: {
      id: "owner-studio-labs",
      name: "Studio Labs",
      city: "Bengaluru",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "rode-wireless-pro",
    title: "RODE Wireless PRO Dual-Channel Mic System",
    category: "audio",
    price: 450,
    rating: 4.8,
    reviews: 95,
    location: "Hyderabad, Telangana",
    image: audioImg,
    images: [audioImg],
    description:
      "Compact wireless microphone system with 32-bit float on-board recording, timecode sync, and 260m range.",
    condition: "Excellent",
    status: "approved",
    available: true,
    owner: {
      id: "owner-sound-craft",
      name: "SoundCraft Rentals",
      city: "Hyderabad",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "royal-enfield-classic-350",
    title: "Royal Enfield Classic 350 (Stealth Black)",
    category: "bikes",
    price: 699,
    rating: 4.9,
    reviews: 110,
    location: "Hyderabad, Telangana",
    image: bikeImg,
    images: [bikeImg],
    description:
      "349cc single-cylinder 4-stroke air-oil cooled engine, dual-channel ABS, pristine touring setup with panniers.",
    condition: "Excellent",
    status: "approved",
    available: true,
    owner: {
      id: "owner-vikram-r",
      name: "Vikram Reddy",
      city: "Hyderabad",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "dewalt-hammer-drill",
    title: "DeWalt 20V MAX Cordless Hammer Drill Kit",
    category: "tools",
    price: 299,
    rating: 4.7,
    reviews: 37,
    location: "Hyderabad, Telangana",
    image: toolImg,
    images: [toolImg],
    description:
      "Heavy-duty 1/2-inch brushless cordless hammer drill with 2x 5Ah batteries, charger, and carbide masonry bits.",
    condition: "Good",
    status: "approved",
    available: true,
    owner: {
      id: "owner-tool-vault",
      name: "Tool Vault",
      city: "Hyderabad",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "anker-737-powerbank",
    title: "Anker 737 Power Bank (PowerCore 24K, 140W)",
    category: "powerbanks",
    price: 250,
    rating: 4.8,
    reviews: 64,
    location: "Hyderabad, Telangana",
    image: powerbankImg,
    images: [powerbankImg],
    description:
      "24,000mAh 3-port ultra-powerful laptop & camera charging power bank with smart digital display and 140W fast output.",
    condition: "Excellent",
    status: "approved",
    available: true,
    owner: {
      id: "owner-sai-teja",
      name: "Sai Teja",
      city: "Hyderabad",
      isVerified: true,
    },
  } as unknown as Product,
  {
    id: "aputure-300d-ii",
    title: "Aputure Light Storm LS 300d II Video Light",
    category: "lighting",
    price: 850,
    rating: 4.9,
    reviews: 29,
    location: "Hyderabad, Telangana",
    image: cameraImg,
    images: [cameraImg],
    description:
      "5500K daylight-balanced point-source LED light with Bowens mount, wireless remote control, and carry case.",
    condition: "Like New",
    status: "approved",
    available: true,
    owner: {
      id: "owner-cinema-pro",
      name: "Cinema Gear Pro",
      city: "Hyderabad",
      isVerified: true,
    },
  } as unknown as Product,
];

export function findFallbackProduct(id: string | number): Product | undefined {
  const targetKey = String(id).toLowerCase().trim();
  return (
    INITIAL_FALLBACK_PRODUCTS.find(
      (p) =>
        String(p.id).toLowerCase() === targetKey ||
        String(p.id) === String(id)
    ) ||
    (targetKey === "1" || targetKey.includes("sony")
      ? INITIAL_FALLBACK_PRODUCTS[0]
      : undefined)
  );
}
