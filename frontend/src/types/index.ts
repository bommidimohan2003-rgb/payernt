export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationUpdatedAt?: string;
  password?: string;
  avatar?: string;
  profilePhotoUrl?: string;
  profile_photo_url?: string;
  aadhaarNumber?: string;
  aadhaarMasked?: string;
  aadhaar_masked?: string;
  panNumber?: string;
  panMasked?: string;
  pan_masked?: string;
  accountId?: string;
  accountType?: "pay₹ent" | "paye₹nt";
  role?: "user" | "admin" | "superadmin" | "customer" | "lender";
  status?: "pending" | "approved" | "rejected" | "suspended" | "active";
  createdAt?: string;
  bio?: string;
  occupation?: string;
  website?: string;
  upiId?: string;
  isVerified?: boolean;
  rating?: number;
  rentalsCount?: number;
  listingsCount?: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  videoUrl?: string;
  video_url?: string;
  angleImages?: { label: string; image: string }[];
  rotationFrames?: string[];
  category: string;
  rating: number;
  reviews: number;
  available: boolean;
  availability_status?: "available" | "unavailable";
  availability_reason?: string | null;
  isReference?: boolean;
  status?: "approved" | "pending" | "rejected";
  location?: string | any;
  city?: string;
  area?: string;
  owner: {
    name: string;
    avatar: string;
    profilePhotoUrl?: string;
    profile_photo_url?: string;
    rating: number;
    email?: string;
    city?: string;
    state?: string;
    address?: string;
    pincode?: string;
    location?: string | any;
    status?: string;
  };
  ownerId?: string;
  ownerAccountType?: "paye₹nt";
  vendorSecretPin?: string;
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

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
  image?: string;
}

export type OrderRentalStatus =
  | "order_confirmed"
  | "ready_for_pickup"
  | "picked_up"
  | "rental_in_progress"
  | "return_initiated"
  | "handed_back"
  | "awaiting_inspection"
  | "completed"
  | "active"
  | "completed"
  | "cancelled"
  | "pending"
  | "returned"
  | string;

export interface Order {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  startDate: string;
  endDate: string;
  total: number;
  status: OrderRentalStatus;
  createdAt: string;
  category?: string;
  product_id?: string;
  product_title?: string;
  product_image?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  user_email?: string;
  userEmail?: string;
  confirmedAt?: string;
  confirmed_at?: string;
  readyForPickupAt?: string;
  ready_for_pickup_at?: string;
  pickedUpAt?: string;
  picked_up_at?: string;
  returnInitiatedAt?: string;
  return_initiated_at?: string;
  handedBackAt?: string;
  handed_back_at?: string;
  awaitingInspectionAt?: string;
  awaiting_inspection_at?: string;
  completedAt?: string;
  completed_at?: string;
  queueNotes?: string;
  queue_notes?: string;
  deliveryMethod?: "delivery" | "pickup" | "custom" | string;
  deliveryAddress?: string;
  pickupLocation?: string;
  customLocation?: string;
  locationDirections?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string;
  delivery_method?: string;
  delivery_address?: string;
  pickup_location?: string;
  custom_location?: string;
  location_directions?: string;
  location_latitude?: number | null;
  location_longitude?: number | null;
  map_url?: string;
  locationChangeRequest?: {
    deliveryMethod?: string;
    deliveryAddress?: string;
    pickupLocation?: string;
    customLocation?: string;
    locationDirections?: string;
    latitude?: number | null;
    longitude?: number | null;
    reason?: string;
    requestedAt?: string;
    status?: "pending" | "approved" | "rejected";
    reviewedAt?: string;
    reviewedBy?: string;
    rejectionReason?: string;
  } | null;
  location_change_request?: any;
  deliveryAddressId?: string;
  delivery_address_id?: string;
  deliveryAddressSnapshot?: any;
  delivery_address_snapshot?: any;
}

export interface UserAddress {
  id: string;
  user_email?: string;
  userEmail?: string;
  full_name: string;
  fullName?: string;
  phone: string;
  flat_house: string;
  flatHouse?: string;
  street_area: string;
  streetArea?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  pinCode?: string;
  delivery_instructions?: string;
  deliveryInstructions?: string;
  is_default?: boolean;
  isDefault?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  read: boolean;
  createdAt: string;
  productName?: string;
  bookingId?: string;
  link?: string;
  eventKey?: string;
}

export interface UserProfileStats {
  completed_rentals: number;
  lender_rating: number | null;
  review_count: number;
  on_time_return_rate: number | null;
  average_response_time_minutes: number | null;
  has_data: boolean;
}

export interface ConversationMessage {
  id: string;
  sender: string;
  senderType: "user" | "admin" | "support";
  content: string;
  timestamp: string;
  read?: boolean;
}

export interface Conversation {
  id: string;
  subject: string;
  category?: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority?: string;
  createdAt: string;
  updatedAt?: string;
  partner?: string;
  partnerAvatar?: string;
  partnerProfilePhotoUrl?: string;
  partner_profile_photo_url?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: boolean;
  unreadCount?: number;
  messageCount?: number;
  messages: ConversationMessage[];
}

export interface Message {
  id: string;
  from: string;
  avatar: string;
  profilePhotoUrl?: string;
  profile_photo_url?: string;
  preview: string;
  time: string;
  unread: boolean;
}

export interface Review {
  id: string;
  user: string;
  avatar: string;
  profilePhotoUrl?: string;
  profile_photo_url?: string;
  userProfilePhotoUrl?: string;
  user_profile_photo_url?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface CartItem {
  id: string;
  user_email: string;
  product_id: string;
  productId?: string;
  title: string;
  productTitle?: string;
  price: number;
  daily_price: number;
  pricePerDay?: number;
  image: string;
  productImage?: string;
  category: string;
  city: string;
  start_date: string;
  startDate?: string;
  end_date: string;
  endDate?: string;
  days: number;
  quantity?: number;
  total_price: number;
  is_available: boolean;
  conflict_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CartResponse {
  items: CartItem[];
  count: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface ProductAvailabilityItem {
  status: "available" | "unavailable";
  is_available: boolean;
  reason: string | null;
}

export interface BatchAvailabilityResponse {
  start_date: string;
  end_date: string;
  availability: Record<string, ProductAvailabilityItem>;
}

export type DeliveryStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "WAITING_FOR_ADMIN"
  | "ADMIN_PROCESSING"
  | "READY_FOR_VENDOR"
  | "WAITING_FOR_DELIVERY_BOY"
  | "PICKED_UP_FROM_VENDOR"
  | "OUT_FOR_DELIVERY"
  | "NEAR_DESTINATION"
  | "ARRIVED_AT_RENTER"
  | "RENTER_VERIFIED"
  | "RENTAL_ACTIVATED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export interface DeliveryLocationUpdate {
  id: string;
  delivery_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  recorded_at: string;
}

export interface Delivery {
  id: string;
  booking_id: string;
  delivery_method: string;
  status: DeliveryStatus;
  pickup_address?: string | null;
  delivery_address?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  eta_minutes?: number | null;
  delivery_boy_id?: string | null;
  delivery_boy_name?: string | null;
  delivery_boy_phone?: string | null;
  vendor_otp_verified?: boolean;
  renter_otp_verified?: boolean;
  picked_up_at?: string | null;
  arrived_at_renter_at?: string | null;
  started_at?: string | null;
  near_destination_at?: string | null;
  delivered_at?: string | null;
  customer_confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryTrackingData extends Delivery {
  locations?: DeliveryLocationUpdate[];
}

export interface BookingDeliveryResponse {
  success: boolean;
  delivery: Delivery;
  locations: DeliveryLocationUpdate[];
  booking: {
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    startDate?: string;
    endDate?: string;
    status: string;
    total: number;
  };
  isCustomer: boolean;
  counterparty: {
    name: string;
    email: string;
    phone?: string;
    role: "customer" | "lender";
  };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name?: string | null;
  file_type: string;
  file_size?: number;
  created_at: string;
}

export interface RealtimeMessage {
  id: string;
  conversation_id: string;
  sender_email: string;
  sender_name: string;
  message_type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
  content: string;
  created_at: string;
  updated_at: string;
  read_at?: string | null;
  attachments?: MessageAttachment[];
}

export interface RealtimeConversation {
  id: string;
  bookingId?: string | null;
  productId?: string | null;
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
  productCategory?: string;
  productDescription?: string;
  bookingStatus?: string;
  bookingStartDate?: string;
  bookingEndDate?: string;
  bookingTotal?: number;
  deliveryId?: string | null;
  deliveryStatus?: DeliveryStatus;
  deliveryEtaMinutes?: number | null;
  etaMinutes?: number | null;
  isCustomer: boolean;
  counterparty: {
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
    verified?: boolean;
    role: "customer" | "lender";
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: boolean;
  unreadCount?: number;
  messagesCount?: number;
  messages?: RealtimeMessage[];
  createdAt: string;
  updatedAt: string;
}

