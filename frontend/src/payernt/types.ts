export type VerificationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_correction"
  | "approved"
  | "verified"
  | "rejected";

export type ProductAvailability = "available" | "paused" | "rented" | "unavailable";

export type RentalRequestStatus =
  | "requested"
  | "accepted"
  | "handover"
  | "active"
  | "return_initiated"
  | "returned"
  | "completed"
  | "rejected";

export interface DemoUser {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  phone: string;
  avatar: string;
  city: string;
  role?: string;
}

export interface ProductPhoto {
  id: string;
  url: string;
  tag: string;
  isPrimary: boolean;
  file?: File;
}

export interface ProductSpecs {
  brand?: string;
  model?: string;
  year?: string;
  serialNumber?: string;
  processor?: string;
  ram?: string;
  storage?: string;
  lensMount?: string;
  sensorResolution?: string;
  batteryCapacity?: string;
  flightTime?: string;
  engineCc?: string;
  mileage?: string;
  powerWattage?: string;
  material?: string;
  dimensions?: string;
  connectivity?: string;
  features?: string[];
  includedAccessories?: string[];
  customSpecs?: { label: string; value: string }[];
}

export interface ProductCondition {
  grade: "New" | "Like New" | "Excellent" | "Good" | "Fair" | "Needs Repair";
  visibleDamage: boolean;
  damageDescription?: string;
  damageDetails?: string;
  scratches: "None" | "Micro-scratches" | "Visible" | "Noticeable";
  batteryHealthPercent?: number;
  functionalIssues: boolean;
  functionalNotes?: string;
  previousRepairs: boolean;
  repairDetails?: string;
  accessoriesCondition?: string;
  additionalNotes?: string;
  accessoriesIncluded: string[];
}

export interface ProductLocation {
  city: string;
  area: string;
  pincode: string;
  postalCode?: string;
  pickupAvailable: boolean;
  doorstepDeliveryAvailable: boolean;
  pickupInstructions?: string;
  landmark?: string;
}

export interface RentalPricing {
  hourly?: number;
  daily: number;
  weekly?: number;
  monthly?: number;
  securityDeposit?: number;
  minimumRentalDays?: number;
}

export interface ProductAvailabilitySchedule {
  type: "always" | "specific_dates" | "weekends_only";
  availableNow?: boolean;
  availableFromDate?: string;
  availableUntilDate?: string;
  unavailableDates: string[]; // YYYY-MM-DD
  bufferDaysBetweenRentals?: number;
}

export interface VerificationDocuments {
  ownerFullName: string;
  ownerPhone: string;
  ownerEmail: string;
  idProofType: "Aadhaar" | "Passport" | "Driving License" | "Voter ID";
  idProofNumber?: string;
  idProofImageName?: string;
  purchaseProofType?: "Invoice / Bill" | "Warranty Card" | "Serial Photo" | "Other";
  purchaseProofName?: string;
  proofStatus?: string;
  agreedToTerms: boolean;
}

export interface PayerntProduct {
  id: string;
  ownerId: string;
  owner?: {
    id?: string;
    name?: string;
    fullName?: string;
    avatar?: string;
    rating?: number;
    email?: string;
  };
  name?: string;
  title: string;
  category: string;
  customCategoryName?: string;
  brand?: string;
  model?: string;
  year?: string;
  description: string;
  specifications?: string;
  features?: string[];
  photos: ProductPhoto[];
  images?: string[];
  primaryImage: string;
  videoUrl?: string;
  specs: ProductSpecs;
  condition: ProductCondition;
  damageDetails?: string;
  accessories?: string;
  location: ProductLocation;
  city?: string;
  area?: string;
  postalCode?: string;
  pickupDetails?: string;
  pricing: RentalPricing;
  price?: number;
  availability: ProductAvailabilitySchedule;
  verificationDocs: VerificationDocuments;
  verification?: Record<string, unknown>;
  verificationStatus: VerificationStatus;
  status?: string;
  verificationNotes?: string;
  availabilityStatus: ProductAvailability;
  totalRentalsCount: number;
  totalEarningsGenerated: number;
  ownerAccountType?: "paye₹nt";
  vendorSecretPin?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalSecurity {
  id: string; // e.g. "RENTAL_SECURITY_001"
  bookingId: string;
  productId: string;
  vendorId: string;
  renterId: string;
  vendorSecretPin: string;
  renterSecretPin: string;
  vendorPinVerified: boolean;
  renterPinVerified: boolean;
  otpVerified: boolean;
  rentalStarted: boolean;
  status: "security_pending" | "verified" | "active" | "completed";
  createdAt: string;
  rentalStartedAt: string | null;
}

export interface RentalRequest {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  category: string;
  renter: {
    name: string;
    avatar: string;
    rating: number;
    completedRentals: number;
    phone: string;
    email: string;
    city: string;
  };
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  grossRental: number;
  platformFee: number;
  netEarnings: number;
  securityDeposit: number;
  status: RentalRequestStatus;
  requestDate: string;
  paymentStatus: "paid_to_escrow" | "pending_renter" | "settled_to_lender";
}

export interface EarningTransaction {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  renterName: string;
  rentalPeriod: string;
  rentalDays: number;
  grossRental: number;
  platformFee: number;
  netPayout: number;
  securityDeposit: number;
  depositStatus: "refunded_to_renter" | "retained_for_damage" | "in_escrow";
  payoutStatus: "settled" | "processing" | "upcoming";
  payoutDate: string;
  payoutMethod: string;
}

export interface LenderNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "alert";
  timestamp: string;
  read: boolean;
  actionRoute?: string;
}

export interface PayerntAccount {
  accountId: string; // e.g. "PAYERNT_USER_001"
  accountType: "paye₹nt";
  name: string;
  email: string;
  phone: string;
  aadhaarNumber: string; // Masked e.g. "XXXX XXXX 9012"
  address: string;
  pincode: string;
  avatar?: string;
  createdAt: string;
  passwordHash?: string; // Mock password hash for frontend demo
}

export interface LenderProfile {
  id?: string;
  accountId?: string;
  accountType?: "paye₹nt";
  name: string;
  email: string;
  phone: string;
  avatar: string;
  city: string;
  area: string;
  address?: string;
  pincode?: string;
  aadhaarMasked?: string;
  isKycVerified: boolean;
  kycVerificationDate: string;
  trustScore: number;
  totalGearListed: number;
  activeRentalsCount: number;
  lifetimeEarnings: number;
  payoutUpi: string;
  payoutBank: {
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
}

// User Wallet Types (Section 18 & 22)
export type WalletTransactionType = "CREDIT" | "WITHDRAWAL" | "PENDING" | "REFUND" | "ADJUSTMENT";
export type WalletTransactionStatus = "Completed" | "Processing" | "Pending" | "Failed";

export interface WalletTransaction {
  id: string;
  userId: string;
  accountId?: string;
  type: WalletTransactionType;
  amount: number;
  description: string;
  productId?: string;
  productName?: string;
  date: string;
  status: WalletTransactionStatus;
  bankAccountMasked?: string;
}

export interface BankAccount {
  id: string;
  userId: string;
  accountId?: string;
  accountHolderName: string;
  bankName: string;
  maskedAccountNumber: string;
  ifsc: string;
  isPrimary: boolean;
}

export interface UserWallet {
  userId: string;
  accountId?: string;
  accountType?: "paye₹nt";
  availableBalance: number;
  pendingBalance: number;
  totalReceived: number;
  totalWithdrawn: number;
  transactions: WalletTransaction[];
  bankAccounts: BankAccount[];
}

