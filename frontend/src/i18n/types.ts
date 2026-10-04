export type Language = "en" | "te" | "hi";

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  subLabel?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", subLabel: "Default" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", subLabel: "ఆంధ్రప్రదేశ్ / తెలంగాణ" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", subLabel: "भारत" },
];

export interface CommonTranslations {
  // Navigation & Core Labels
  home: string;
  explore: string;
  products: string;
  bookings: string;
  orders: string;
  wallet: string;
  earnings: string;
  messages: string;
  notifications: string;
  settings: string;
  languages: string;
  selectLanguage: string;
  helpAndSupport: string;
  profile: string;
  logout: string;
  login: string;
  signup: string;
  dashboard: string;
  overview: string;
  cart: string;
  wishlist: string;
  analytics: string;
  more: string;
  moreOptions: string;

  // Actions & Buttons
  save: string;
  saveChanges: string;
  cancel: string;
  back: string;
  next: string;
  submit: string;
  search: string;
  searchPlaceholder: string;
  loading: string;
  retry: string;
  view: string;
  edit: string;
  delete: string;
  confirm: string;
  close: string;
  continue: string;
  apply: string;
  clear: string;
  filter: string;
  all: string;

  // States & Statuses
  active: string;
  pending: string;
  completed: string;
  available: string;
  unavailable: string;
  verified: string;
  unverified: string;
  underReview: string;
  rejected: string;

  // Appearance & Theme
  appearance: string;
  theme: string;
  themeMode: string;
  darkMode: string;
  lightMode: string;
  switchToLight: string;
  switchToDark: string;
  currency: string;
  inrCurrency: string;

  // Notifications
  notificationPreferences: string;
  bookingAlerts: string;
  messageAlerts: string;
  payoutAlerts: string;
  noNotifications: string;
  markAllAsRead: string;

  // Danger zone
  dangerZone: string;
  accountActions: string;
  resetDemoState: string;
  logoutConfirmation: string;
}

export interface PayerntTranslations {
  tagline: string;
  dashboard: string;
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  availableBalance: string;
  walletFunds: string;
  totalEarnings: string;
  totalIncomeEarned: string;
  listings: string;
  gearListed: string;
  activeRentals: string;
  activeBookings: string;
  createListing: string;
  addProduct: string;
  myProducts: string;
  rentalRequests: string;
  recentActivity: string;
  noRecentActivity: string;
  upcomingBookings: string;
  noUpcomingBookings: string;
  quickActions: string;
  walletAndPayouts: string;
  requestWithdrawal: string;
  addBankAccount: string;
  lenderSettings: string;
  lendingPreferences: string;
  instantBooking: string;
  instantBookingDesc: string;
  weekendAvailability: string;
  weekendAvailabilityDesc: string;
  handoverPin: string;
  handoverPinDesc: string;
  enforced: string;
  productMediaVerification: string;
  frontPhoto: string;
  backPhoto: string;
  inspectionVideo: string;
  takePhoto: string;
  recordVideo: string;
  viewPhoto: string;
  viewVideo: string;
  retake: string;
  captured: string;
  mediaCountCaptured: string;
  logoutPayernt: string;
}

export interface PayrentTranslations {
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  exploreCategories: string;
  featuredGear: string;
  productDetails: string;
  rentNow: string;
  addToCart: string;
  addedToCart: string;
  addedToWishlist: string;
  perDay: string;
  securityDeposit: string;
  zeroDeposit: string;
  freeDelivery: string;
  verifiedLender: string;
  insuranceIncluded: string;
  selectDates: string;
  rentalPeriod: string;
  cartSummary: string;
  proceedToCheckout: string;
  emptyCart: string;
  emptyWishlist: string;
  myOrders: string;
  userDashboard: string;
  startExploring: string;
  browseCatalog: string;
  itemInspected: string;
  doorstepDelivery: string;
  instantPickup: string;
}

export interface Translations {
  common: CommonTranslations;
  payernt: PayerntTranslations;
  payrent: PayrentTranslations;
}
