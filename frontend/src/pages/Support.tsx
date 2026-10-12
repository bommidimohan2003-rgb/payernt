import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  Search,
  X,
  ChevronDown,
  CircleHelp,
  PackageCheck,
  CreditCard,
  ShoppingBag,
  Smartphone,
  BookOpen,
  Camera,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Send,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Shield,
  Loader2,
  RefreshCw,
  PlusCircle,
  Wrench,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface FAQItem {
  id: string;
  category: string;
  subCategory?: "camera" | "laptop" | "general";
  question: string;
  answer: string;
  troubleshootingSteps?: string[];
  suggestedAction?: string;
}

export const FAQ_CATEGORIES = [
  {
    id: "rental-product",
    name: "Rental & Product Issues",
    icon: PackageCheck,
    description: "Equipment condition, damage reporting, missing accessories, and device troubleshooting",
  },
  {
    id: "billing-payments",
    name: "Billing & Payments",
    icon: CreditCard,
    description: "Rental charges, timer pauses, security deposits, refunds, and payment status",
  },
  {
    id: "previous-orders",
    name: "Previous Orders",
    icon: ShoppingBag,
    description: "Return pickup status, gear handover disputes, return delays, and booking history",
  },
  {
    id: "app-technical",
    name: "App & Technical Support",
    icon: Smartphone,
    description: "Account login, OTP codes, app errors, bug reports, and Secret PIN verification",
  },
  {
    id: "general-help",
    name: "General Help",
    icon: BookOpen,
    description: "Platform rental rules, damage coverage, terms & conditions, and general inquiries",
  },
];

export const FAQ_DATA: FAQItem[] = [
  // --- 1. Rental & Product Issues ---
  {
    id: "rp-1",
    category: "Rental & Product Issues",
    question: "My rental product is not working.",
    answer:
      "If the rented equipment fails to operate upon arrival, do not attempt to dismantle or force the hardware. Document the behavior with a short video or photos, check all basic cable connections and battery locks, and report the issue immediately through this support portal within 2 hours of delivery.",
    troubleshootingSteps: [
      "Verify the battery is properly seated, locked, and fully charged using the supplied charger.",
      "Check that all power switches, locking mechanisms, and lens mount rings are firmly in place.",
      "Inspect the device for any external transit damage or missing safety covers.",
      "If the unit remains unresponsive, submit a ticket below to request a replacement or rental pause.",
    ],
  },
  {
    id: "rp-2",
    category: "Rental & Product Issues",
    question: "My product arrived damaged.",
    answer:
      "We take equipment condition seriously. If your package or device shows physical cracks, dents, water damage, or damaged glass upon delivery, take clear photos of the packaging label and damaged areas before using the item. Notify our team immediately so liability is attributed correctly.",
    troubleshootingSteps: [
      "Do not power on devices with cracked glass, damaged battery compartments, or liquid exposure.",
      "Take 3 to 4 clear, well-lit photos showing the serial number and the specific damage.",
      "Raise a support ticket within 2 hours of delivery selecting 'Rental & Product Issues'.",
    ],
  },
  {
    id: "rp-3",
    category: "Rental & Product Issues",
    question: "Accessories or parts are missing.",
    answer:
      "All rental listings specify the included accessories (e.g., lens caps, HDMI cables, original chargers, memory cards, tripod plates). Compare the package contents against the inventory listing. If essential accessories are missing, report it immediately so the vendor can be contacted for immediate courier dispatch.",
    troubleshootingSteps: [
      "Check all compartments of the rental bag or pelican case.",
      "Refer to the product description in your active booking details.",
      "Submit a missing item report with the exact missing accessory name.",
    ],
  },
  {
    id: "rp-4",
    category: "Rental & Product Issues",
    question: "The product differs from the listing photos.",
    answer:
      "Lenders must deliver the exact gear model and specifications advertised. Minor cosmetic wear is permissible if stated in the listing, but substitutions with different models, lower specifications, or aftermarket inferior lenses without prior agreement are not allowed. Report any mismatch immediately.",
  },
  {
    id: "rp-5",
    category: "Rental & Product Issues",
    question: "The product is not working as expected.",
    answer:
      "High-end cinema and computing gear often requires specific firmware profiles, formatted storage media, or high-draw power banks. Review the manufacturer guidelines and our safe basic checks before raising a technical replacement claim.",
  },
  {
    id: "rp-6",
    category: "Rental & Product Issues",
    question: "How do I report a damaged product?",
    answer:
      "Open a support ticket with your Booking ID, attach photos of the condition, and specify whether the gear arrived damaged or if an issue occurred during the shoot. Our platform coordinators will mediate with the lender and review security deposits accordingly.",
  },
  {
    id: "rp-7",
    category: "Rental & Product Issues",
    question: "What should I do if a product is unsafe to use?",
    answer:
      "Immediately disconnect all batteries and power cords. Never attempt repairs on swollen lithium batteries, sparking power cables, or overheating electronics. Store the item in a dry, fire-safe area and alert our emergency operations line immediately.",
  },

  // Camera-specific troubleshooting
  {
    id: "rp-cam-1",
    category: "Rental & Product Issues",
    subCategory: "camera",
    question: "Why is the camera not turning on?",
    answer:
      "Most camera power issues stem from battery door micro-switches, unseated batteries, or third-party power adapters.",
    troubleshootingSteps: [
      "Ensure the battery door is completely closed and clicked into the locked position; many cinema bodies (like Sony FX3) will not turn on if the door sensor is slightly open.",
      "Clean the gold battery terminal contacts with a clean, dry micro-fiber cloth.",
      "Check if the battery requires a full charge (test with the supplied wall charger).",
      "Remove any external dummy battery, USB-C PD hub, or V-Mount D-tap cable and test with an original internal battery.",
    ],
  },
  {
    id: "rp-cam-2",
    category: "Rental & Product Issues",
    subCategory: "camera",
    question: "Why are photos blurry?",
    answer:
      "Blurry images are typically caused by focus mode toggles, dirty lens elements, or slow shutter speeds.",
    troubleshootingSteps: [
      "Check the AF/MF physical switch on the lens barrel to ensure it is set to Auto Focus.",
      "Inspect front and rear lens elements for fingerprints or smudges; clean gently with lens paper.",
      "Ensure shutter speed is set to at least 1 / (focal length × 2) for handheld shooting.",
      "Verify in camera menu that autofocus illuminator and sensor stabilization (IBIS) are active.",
    ],
  },
  {
    id: "rp-cam-3",
    category: "Rental & Product Issues",
    subCategory: "camera",
    question: "Why is the battery draining quickly?",
    answer:
      "High-frame rate 4K/120p recording, continuous autofocus tracking, display brightness, and wireless Bluetooth/Wi-Fi standby can deplete batteries in 40–50 minutes.",
    troubleshootingSteps: [
      "Turn on Airplane Mode in the camera settings to disable background Wi-Fi and smartphone syncing.",
      "Lower EVF/LCD monitor brightness if shooting indoors.",
      "Disable continuous sensor pre-focusing when not shooting.",
      "Keep spare batteries in warm pockets in cold weather environments.",
    ],
  },
  {
    id: "rp-cam-4",
    category: "Rental & Product Issues",
    subCategory: "camera",
    question: "Why is the camera not recording videos?",
    answer:
      "Cinema codecs (e.g. XAVC S-I 10-bit 4:2:2) require high-speed V60 or V90 SD cards or CFexpress Type A cards.",
    troubleshootingSteps: [
      "Ensure the SD card write-protect lock switch on the side is not in the 'LOCKED' position.",
      "Format the memory card inside the camera menu (backup any existing files first).",
      "Verify that the memory card write speed class meets the selected recording bitrate.",
    ],
  },
  {
    id: "rp-cam-5",
    category: "Rental & Product Issues",
    subCategory: "camera",
    question: "Is the lens damaged or scratched?",
    answer:
      "Shine a flashlight through the lens at an angle to inspect internal glass elements for fungus, haze, or scratches. Minor dust specks rarely affect optical quality, but front element gouges or sticky aperture blades must be reported before shooting.",
  },
  {
    id: "rp-cam-6",
    category: "Rental & Product Issues",
    subCategory: "camera",
    question: "Are the lens, charger, or battery missing?",
    answer:
      "If the camera kit arrived without the advertised lens, charger, or required cables, submit an expedited request with your Booking ID so the vendor can provide an immediate replacement or local accessory pickup.",
  },

  // Laptop-specific troubleshooting
  {
    id: "rp-lap-1",
    category: "Rental & Product Issues",
    subCategory: "laptop",
    question: "Why is the laptop running slowly?",
    answer:
      "High background indexing, outdated GPU drivers, or battery power throttling can limit CPU performance.",
    troubleshootingSteps: [
      "Connect the laptop to the original high-wattage power adapter; performance laptops throttle CPU clock speeds on battery power.",
      "Open Task Manager / Activity Monitor to close runaway background processes.",
      "Ensure ventilation intakes on the bottom and sides are unobstructed by soft fabrics or blankets.",
    ],
  },
  {
    id: "rp-lap-2",
    category: "Rental & Product Issues",
    subCategory: "laptop",
    question: "Why is the battery not working?",
    answer:
      "Ensure the charging brick is firmly seated in a grounded electrical outlet and the USB-C or MagSafe LED indicator illuminates.",
    troubleshootingSteps: [
      "Check the power cable for kinks, bends, or loose connectors.",
      "Allow the machine to charge for at least 15 minutes if it arrived deeply discharged.",
      "Test charging from an alternative wall socket directly without surge protector extension strips.",
    ],
  },
  {
    id: "rp-lap-3",
    category: "Rental & Product Issues",
    subCategory: "laptop",
    question: "Why are the keyboard or touchpad not working?",
    answer:
      "Restart the device and check for peripheral interference. Disconnect all external USB hubs, mice, and dongles to isolate the issue.",
  },
  {
    id: "rp-lap-4",
    category: "Rental & Product Issues",
    subCategory: "laptop",
    question: "Is the laptop overheating?",
    answer:
      "High thermal loads during 4K video rendering or 3D compilation are normal. However, if fans run at 100% on idle or the machine shuts down abruptly, place it on a hard flat surface and elevate the rear feet. Do not blow compressed air directly into fan grilles while powered on.",
  },
  {
    id: "rp-lap-5",
    category: "Rental & Product Issues",
    subCategory: "laptop",
    question: "Is the screen damaged or flickering?",
    answer:
      "Display flickering can occur due to refresh rate mismatches (e.g. ProMotion 120Hz vs. 60Hz) or loose ribbon cables. If horizontal colored lines or impact fractures appear, photograph the display and submit a ticket immediately.",
  },
  {
    id: "rp-lap-6",
    category: "Rental & Product Issues",
    subCategory: "laptop",
    question: "Why is the laptop not turning on?",
    answer:
      "Perform a hardware power reset: disconnect all peripherals, hold the power button down firmly for 15 seconds, release, connect the AC adapter, wait 30 seconds, and press the power button once.",
  },

  // --- 2. Billing & Payments ---
  {
    id: "bp-1",
    category: "Billing & Payments",
    question: "I have an issue with billing.",
    answer:
      "All rentals are billed based on daily rates confirmed at checkout. Extra days are billed according to platform rental rates plus applicable taxes. If you observe discrepancies on your invoice or statement, submit a ticket with your order ID.",
  },
  {
    id: "bp-2",
    category: "Billing & Payments",
    question: "My rental timer is incorrect.",
    answer:
      "Your rental timer officially starts only after both the Vendor 4-digit PIN and Renter 4-digit PIN are verified at handover (completing the 8-digit verification handshake). If your timer commenced earlier due to a delivery tracking mismatch, report your booking ID for immediate timeline adjustment.",
  },
  {
    id: "bp-3",
    category: "Billing & Payments",
    question: "I need help with a rental timer pause.",
    answer:
      "If rented equipment is unusable due to verified defects or delayed accessory arrival, submit a support request. Our team can place your rental timer on an administrative pause while replacement gear is dispatched, ensuring you are not charged for downtime.",
  },
  {
    id: "bp-4",
    category: "Billing & Payments",
    question: "I have an issue with my security deposit or refund.",
    answer:
      "Refundable security deposits are held in escrow during the rental. Upon verified gear return and inspection confirmation by the lender, the deposit release is initiated to your original payment method via Razorpay within 3 to 5 business days.",
  },
  {
    id: "bp-5",
    category: "Billing & Payments",
    question: "My payment failed.",
    answer:
      "Payment failures typically occur due to bank 3D-Secure timeouts, daily UPI transaction limits, or card international usage restrictions. If funds were debited from your account during a failed checkout, banks automatically reverse the amount within 2 to 4 business days.",
  },
  {
    id: "bp-6",
    category: "Billing & Payments",
    question: "My payment succeeded, but the status has not updated.",
    answer:
      "If your bank confirms debit but Payent displays 'Payment Pending', the webhook confirmation may be delayed by bank gateway servers. Provide the Razorpay Payment ID (`pay_...`) or bank reference number so our billing team can link and activate your booking manually.",
  },
  {
    id: "bp-7",
    category: "Billing & Payments",
    question: "I see unexpected rental charges.",
    answer:
      "Charges beyond your base daily rate may include delivery courier charges, optional security damage protection, or late return penalty fees agreed upon in the rental agreement. View your itemized booking summary under Orders or contact our billing team.",
  },

  // --- 3. Previous Orders ---
  {
    id: "po-1",
    category: "Previous Orders",
    question: "I have an issue with a previous order.",
    answer:
      "You can review past invoices, handover timestamps, and lender ratings under your Account Orders tab. For unresolved disputes or security deposit discrepancies from past rentals, submit a ticket referencing your historical Booking ID.",
  },
  {
    id: "po-2",
    category: "Previous Orders",
    question: "My return pickup is delayed.",
    answer:
      "If the assigned logistics delivery courier has not arrived within the scheduled pickup window, do not worry: your rental timer is frozen at your requested return time. Ensure the gear is packed securely and notify support to expedite courier dispatch.",
  },
  {
    id: "po-3",
    category: "Previous Orders",
    question: "My return status has not updated.",
    answer:
      "Once gear is handed over to the return courier, the return status updates to 'In Transit'. The final 'Completed' status is applied after the lender completes the hardware check. If your status has been pending for over 24 hours post-return, submit a ticket for follow-up.",
  },
  {
    id: "po-4",
    category: "Previous Orders",
    question: "I have a dispute about the product condition at return.",
    answer:
      "Disputes regarding gear condition require inspection photos from both delivery handover and return handover. Payent reviews the pre-rental verification photos against return documentation to objectively resolve security deposit claims.",
  },
  {
    id: "po-5",
    category: "Previous Orders",
    question: "I need help with an existing booking.",
    answer:
      "For active bookings, select your booking from the dropdown in the ticket form below. Our support team can assist with delivery address updates, rental extensions, or lender messaging.",
  },

  // --- 4. App & Technical Support ---
  {
    id: "at-1",
    category: "App & Technical Support",
    question: "I cannot log in.",
    answer:
      "Ensure you are entering the registered email address. If you forgot your password, use the 'Forgot Password' link on the login page to receive a secure reset link. Note: never share your password with anyone, including Payent staff.",
  },
  {
    id: "at-2",
    category: "App & Technical Support",
    question: "My OTP is not working.",
    answer:
      "SMS OTP delivery depends on telecom network reception. Please wait 60 seconds before requesting a resend. Ensure your phone number is registered with country code +91 and that DND filters are not blocking transactional SMS.",
  },
  {
    id: "at-3",
    category: "App & Technical Support",
    question: "The app is not loading.",
    answer:
      "Clear your browser cache, ensure you are using a modern browser (Chrome, Safari, Firefox, Edge), or disable aggressive ad-blocker extensions that may block secure API communication.",
  },
  {
    id: "at-4",
    category: "App & Technical Support",
    question: "A page or feature is not working.",
    answer:
      "If a button or dropdown becomes unresponsive, check your internet connectivity and reload the page. If the issue persists, submit a bug report with your browser version and the URL path.",
  },
  {
    id: "at-5",
    category: "App & Technical Support",
    question: "I found a technical bug.",
    answer:
      "We appreciate bug reports. Submit a ticket describing the steps to reproduce the issue, your operating system, and attach a screenshot if possible.",
  },
  {
    id: "at-6",
    category: "App & Technical Support",
    question: "My booking information is not appearing.",
    answer:
      "Make sure you are logged into the account used during checkout. Bookings appear under 'Orders'. If a booking is missing after successful payment, provide your payment reference so we can link it.",
  },
  {
    id: "at-7",
    category: "App & Technical Support",
    question: "I need help with Secret PIN verification.",
    answer:
      "Payent uses an 8-Digit Handover Security Protocol: the vendor possesses a 4-digit Secret PIN, and the renter possesses a 4-digit Secret PIN. Both pins must be verified upon delivery. Never disclose your PIN before physically inspecting the gear.",
  },

  // --- 5. General Help ---
  {
    id: "gh-1",
    category: "General Help",
    question: "What are the rental insurance details?",
    answer:
      "All rentals on Payent include standard hardware protection against verified equipment breakdown under normal usage. Intentional damage, negligence, water immersion, or loss without police report are not covered. Detailed terms are in our rental policy.",
  },
  {
    id: "gh-2",
    category: "General Help",
    question: "Where can I find the rental policies?",
    answer:
      "Our full platform rental policies, cancellation schedules, and return standards are accessible in our Terms of Service and Privacy Policy pages in the site footer.",
  },
  {
    id: "gh-3",
    category: "General Help",
    question: "How does Payent work?",
    answer:
      "Payent connects creative professionals and tech enthusiasts. Renters browse certified equipment, complete KYC verification, and pay through secure escrow. Lenders earn passive income on idle high-end gear with full security deposit protection.",
  },
  {
    id: "gh-4",
    category: "General Help",
    question: "Where can I find the terms and conditions?",
    answer:
      "You can read our complete platform Terms & Conditions at /privacy and throughout the checkout flow prior to confirming any booking.",
  },
  {
    id: "gh-5",
    category: "General Help",
    question: "I have another question.",
    answer:
      "If your question is not covered in our FAQ categories, use the 'Raise a Support Ticket' form below or visit our Contact page for general corporate and partnership inquiries.",
  },
];

export default function Support() {
  const { user } = useAuth();

  // Search & Navigation tab
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState<"all" | "camera" | "laptop">("all");
  const [activeTab, setActiveTab] = useState<"faq" | "troubleshoot" | "ticket" | "requests">("faq");

  // Accordion state
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("rp-1");

  // Guided Troubleshooter State
  const [troubleCategory, setTroubleCategory] = useState<string>("Camera");
  const [troubleIssue, setTroubleIssue] = useState<string>("Camera not turning on");
  const [troubleResolved, setTroubleResolved] = useState<boolean | null>(null);

  // Support Ticket Form State
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Rental & Product Issues");
  const [ticketBookingId, setTicketBookingId] = useState("");
  const [ticketProductRef, setTicketProductRef] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccessId, setTicketSuccessId] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // User Bookings State (for booking dropdown)
  const [userBookings, setUserBookings] = useState<Array<{ id: string; productTitle?: string }>>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // My Support Requests State
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketListError, setTicketListError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // Load user bookings if authenticated
  useEffect(() => {
    if (user) {
      setLoadingBookings(true);
      const token = localStorage.getItem("payent:auth:token") || "";
      api
        .getOrders(token)
        .then((orders) => {
          if (Array.isArray(orders)) {
            setUserBookings(
              orders.map((o: any) => ({
                id: o.id || o.order_id,
                productTitle: o.product_title || o.productTitle || "Rental Item",
              }))
            );
          }
        })
        .catch(() => {})
        .finally(() => setLoadingBookings(false));
    }
  }, [user]);

  // Load user support tickets
  const loadMyTickets = useCallback(async () => {
    if (!user) return;
    setLoadingTickets(true);
    setTicketListError(null);
    try {
      const token = localStorage.getItem("payent:auth:token") || "";
      const tickets = await api.getSupportTickets(token);
      setMyTickets(Array.isArray(tickets) ? tickets : []);
    } catch {
      setTicketListError("Could not retrieve your support requests. Please try again.");
    } finally {
      setLoadingTickets(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "requests") {
      loadMyTickets();
    }
  }, [activeTab, loadMyTickets]);

  // Filtered FAQ Items
  const filteredFaqs = useMemo(() => {
    let result = [...FAQ_DATA];

    if (selectedCategory !== "all") {
      const catObj = FAQ_CATEGORIES.find((c) => c.id === selectedCategory);
      if (catObj) {
        result = result.filter((item) => item.category === catObj.name);
      }
    }

    if (subCategoryFilter !== "all") {
      result = result.filter((item) => item.subCategory === subCategoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          (item.troubleshootingSteps &&
            item.troubleshootingSteps.some((s) => s.toLowerCase().includes(q)))
      );
    }

    return result;
  }, [selectedCategory, subCategoryFilter, searchQuery]);

  // Open ticket form prefilled from an FAQ or troubleshooter
  const handlePrefillTicket = (categoryName: string, subjectTitle: string) => {
    setTicketCategory(categoryName);
    setTicketSubject(`Issue with: ${subjectTitle}`);
    setTicketSuccessId(null);
    setTicketError(null);
    setActiveTab("ticket");
    // Scroll smoothly to form
    window.scrollTo({ top: 380, behavior: "smooth" });
  };

  // Submit support ticket form
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);

    if (ticketSubject.trim().length < 3) {
      setTicketError("Subject must be at least 3 characters.");
      return;
    }
    if (ticketMessage.trim().length < 10) {
      setTicketError("Description must be at least 10 characters.");
      return;
    }
    if (ticketMessage.trim().length > 5000) {
      setTicketError("Description cannot exceed 5000 characters.");
      return;
    }

    setTicketSubmitting(true);
    try {
      const token = localStorage.getItem("payent:auth:token") || "";
      const res = await api.createSupportTicket(token, {
        subject: ticketSubject.trim(),
        category: ticketCategory,
        message: ticketMessage.trim(),
        bookingId: ticketBookingId.trim() || undefined,
        productReference: ticketProductRef.trim() || undefined,
      });

      const tid = res.ticketId || res.id || "TICK-CONFIRMED";
      setTicketSuccessId(tid);
      toast.success(`Support ticket ${tid} submitted successfully.`);

      // Reset form
      setTicketSubject("");
      setTicketBookingId("");
      setTicketProductRef("");
      setTicketMessage("");

      // Refresh ticket list in background
      loadMyTickets();
    } catch (err: any) {
      setTicketError(err.message || "Failed to create support ticket. Please check your network.");
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Reply to active ticket
  const handleSendTicketReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      const token = localStorage.getItem("payent:auth:token") || "";
      const res = await api.replyToConversation(ticketId, replyText.trim(), token);
      if (res && res.messages) {
        setSelectedRequest((prev: any) => ({ ...prev, messages: res.messages }));
        setMyTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, messages: res.messages } : t))
        );
      }
      setReplyText("");
      toast.success("Reply submitted to support.");
    } catch {
      toast.error("Failed to send reply. Please try again.");
    } finally {
      setReplying(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-10 sm:pt-16 sm:pb-14 border-b border-border bg-card/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-border text-xs font-semibold text-muted-foreground">
                <CircleHelp className="w-3.5 h-3.5" />
                <span>Payent Help &amp; Knowledge Base</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                FAQ + Support
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Find answers, troubleshoot rental issues, or contact our support team.
              </p>

              {/* Prominent Search Bar */}
              <div className="pt-3 max-w-2xl mx-auto">
                <div className="relative flex items-center">
                  <Search className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (activeTab !== "faq") setActiveTab("faq");
                    }}
                    placeholder="Search questions or describe your issue..."
                    className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-card border border-border text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {searchQuery && (
                  <div className="mt-2 text-left text-xs text-muted-foreground flex items-center justify-between px-1">
                    <span>
                      Found <strong>{filteredFaqs.length}</strong> matching questions for &ldquo;{searchQuery}&rdquo;
                    </span>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="underline hover:text-foreground cursor-pointer"
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="mt-8 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab("faq")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2",
                  activeTab === "faq"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Knowledge Base</span>
              </button>

              <button
                onClick={() => setActiveTab("troubleshoot")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2",
                  activeTab === "troubleshoot"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                <Wrench className="w-4 h-4" />
                <span>Guided Troubleshooter</span>
              </button>

              <button
                onClick={() => setActiveTab("ticket")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2",
                  activeTab === "ticket"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Raise a Ticket</span>
              </button>

              <button
                onClick={() => setActiveTab("requests")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2",
                  activeTab === "requests"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                <MessageSquare className="w-4 h-4" />
                <span>My Support Requests</span>
                {myTickets.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-500 font-bold">
                    {myTickets.length}
                  </span>
                )}
              </button>

              <Link
                to="/contact"
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Contact Page</span>
              </Link>
            </div>
          </div>
        </section>

        {/* MAIN BODY CONTAINER */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* TAB 1: FAQ KNOWLEDGE BASE */}
          {activeTab === "faq" && (
            <div className="space-y-8">
              {/* Category Filter Pills */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Browse by Category
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setSubCategoryFilter("all");
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24",
                      selectedCategory === "all"
                        ? "bg-card border-foreground/40 shadow-sm"
                        : "bg-card/50 border-border hover:border-foreground/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <HelpCircle className="w-5 h-5 text-foreground" />
                    <div>
                      <div className="text-xs font-bold text-foreground">All Questions</div>
                      <div className="text-[10px] text-muted-foreground">{FAQ_DATA.length} topics</div>
                    </div>
                  </button>

                  {FAQ_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    const count = FAQ_DATA.filter((i) => i.category === cat.name).length;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setSubCategoryFilter("all");
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24",
                          isSelected
                            ? "bg-card border-foreground/40 shadow-sm"
                            : "bg-card/50 border-border hover:border-foreground/20 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5 text-foreground" />
                        <div>
                          <div className="text-xs font-bold text-foreground leading-tight line-clamp-1">
                            {cat.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{count} articles</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcategory toggle for Rental & Product Issues (Camera vs Laptop) */}
              {(selectedCategory === "all" || selectedCategory === "rental-product") && (
                <div className="flex items-center gap-2 p-1.5 bg-card rounded-xl border border-border w-fit text-xs font-medium">
                  <span className="px-2 text-muted-foreground text-[11px]">Hardware Focus:</span>
                  <button
                    onClick={() => setSubCategoryFilter("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                      subCategoryFilter === "all"
                        ? "bg-foreground text-background font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All Gear
                  </button>
                  <button
                    onClick={() => setSubCategoryFilter("camera")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                      subCategoryFilter === "camera"
                        ? "bg-foreground text-background font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera Issues</span>
                  </button>
                  <button
                    onClick={() => setSubCategoryFilter("laptop")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                      subCategoryFilter === "laptop"
                        ? "bg-foreground text-background font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Laptop Issues</span>
                  </button>
                </div>
              )}

              {/* FAQ Accordion List */}
              <div className="space-y-3">
                {filteredFaqs.length === 0 ? (
                  <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                    <h3 className="text-base font-bold text-foreground">No matching questions found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      We couldn&rsquo;t find an answer matching &ldquo;{searchQuery}&rdquo;. Try another search term or raise a direct support ticket.
                    </p>
                    <div className="pt-2 flex justify-center gap-3">
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("all");
                        }}
                        className="px-4 py-2 rounded-xl bg-muted text-xs font-semibold hover:bg-muted/80 cursor-pointer"
                      >
                        Reset Search
                      </button>
                      <button
                        onClick={() => handlePrefillTicket("General Help", searchQuery || "Custom Question")}
                        className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 cursor-pointer"
                      >
                        Raise a Support Ticket
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredFaqs.map((faq) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className={cn(
                          "rounded-2xl border transition-all duration-200 overflow-hidden",
                          isExpanded
                            ? "bg-card border-foreground/30 shadow-sm"
                            : "bg-card/70 border-border hover:border-foreground/20"
                        )}
                      >
                        <button
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                          aria-expanded={isExpanded}
                        >
                          <div className="flex items-center gap-3">
                            {faq.subCategory === "camera" ? (
                              <Camera className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : faq.subCategory === "laptop" ? (
                              <Laptop className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm sm:text-base font-bold text-foreground">
                              {faq.question}
                            </span>
                          </div>
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0",
                              isExpanded && "rotate-180 text-foreground"
                            )}
                          />
                        </button>

                        {isExpanded && (
                          <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border/50 text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-4">
                            <p className="text-foreground/90">{faq.answer}</p>

                            {faq.troubleshootingSteps && faq.troubleshootingSteps.length > 0 && (
                              <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-2">
                                <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                  <Wrench className="w-3.5 h-3.5 text-foreground" />
                                  <span>Recommended Safe Troubleshooting Steps:</span>
                                </div>
                                <ul className="space-y-1.5 list-disc list-inside text-xs text-foreground/80">
                                  {faq.troubleshootingSteps.map((step, idx) => (
                                    <li key={idx} className="leading-snug">
                                      {step}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Resolution confirmation / escalation */}
                            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs border-t border-border/40">
                              <span className="text-muted-foreground">Was this answer helpful?</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toast.success("Glad this resolved your question!")}
                                  className="px-3 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground flex items-center gap-1 cursor-pointer font-medium"
                                >
                                  <ThumbsUp className="w-3 h-3 text-emerald-500" />
                                  <span>Yes, resolved</span>
                                </button>
                                <button
                                  onClick={() => handlePrefillTicket(faq.category, faq.question)}
                                  className="px-3 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground flex items-center gap-1 cursor-pointer font-medium"
                                >
                                  <ThumbsDown className="w-3 h-3 text-rose-500" />
                                  <span>Still need help</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* STILL NEED HELP CTA FOOTER */}
              <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left">
                  <h3 className="text-base sm:text-lg font-black text-foreground">
                    Couldn&rsquo;t find your exact situation?
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-lg">
                    Our platform support team can pause active timers, arrange courier pickups, verify Secret PIN handovers, and resolve disputes.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setActiveTab("ticket");
                      window.scrollTo({ top: 380, behavior: "smooth" });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-foreground text-background text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                  >
                    Raise Support Ticket
                  </button>
                  <Link
                    to="/contact"
                    className="px-5 py-2.5 rounded-xl bg-muted border border-border text-foreground text-xs sm:text-sm font-semibold hover:bg-muted/80 transition-colors"
                  >
                    Contact Team
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GUIDED TROUBLESHOOTER */}
          {activeTab === "troubleshoot" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-6">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[11px] font-bold text-muted-foreground">
                    <Wrench className="w-3 h-3" />
                    <span>Interactive Gear Diagnostic</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    Guided Troubleshooting Flow
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Follow safe, standard operating procedures to resolve hardware or booking issues step-by-step.
                  </p>
                </div>

                {/* Step 1: Category selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    Step 1: What type of issue are you experiencing?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {["Camera", "Laptop", "Booking & Handover", "Billing & Deposit"].map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setTroubleCategory(c);
                          setTroubleResolved(null);
                          if (c === "Camera") setTroubleIssue("Camera not turning on");
                          if (c === "Laptop") setTroubleIssue("Laptop running slowly / overheating");
                          if (c === "Booking & Handover") setTroubleIssue("Secret PIN verification issue");
                          if (c === "Billing & Deposit") setTroubleIssue("Rental timer pause request");
                        }}
                        className={cn(
                          "p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center",
                          troubleCategory === c
                            ? "bg-foreground text-background border-foreground shadow-sm"
                            : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Specific Issue selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    Step 2: Select the specific symptom
                  </label>
                  <select
                    value={troubleIssue}
                    onChange={(e) => {
                      setTroubleIssue(e.target.value);
                      setTroubleResolved(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 cursor-pointer"
                  >
                    {troubleCategory === "Camera" && (
                      <>
                        <option value="Camera not turning on">Camera not turning on</option>
                        <option value="Photos or video blurry">Photos or video blurry</option>
                        <option value="Battery draining quickly">Battery draining quickly</option>
                        <option value="Not recording to memory card">Not recording to memory card</option>
                        <option value="Lens physical damage or scratches">Lens physical damage or scratches</option>
                      </>
                    )}
                    {troubleCategory === "Laptop" && (
                      <>
                        <option value="Laptop running slowly / overheating">Laptop running slowly / overheating</option>
                        <option value="Battery not holding charge">Battery not holding charge</option>
                        <option value="Keyboard or touchpad unresponsive">Keyboard or touchpad unresponsive</option>
                        <option value="Screen flickering or artifact lines">Screen flickering or artifact lines</option>
                        <option value="Will not power on">Will not power on</option>
                      </>
                    )}
                    {troubleCategory === "Booking & Handover" && (
                      <>
                        <option value="Secret PIN verification issue">Secret PIN verification issue (4-digit code)</option>
                        <option value="Delivery agent pickup delayed">Delivery agent pickup delayed</option>
                        <option value="Return status not updated">Return status not updated</option>
                        <option value="Condition dispute at handover">Condition dispute at handover</option>
                      </>
                    )}
                    {troubleCategory === "Billing & Deposit" && (
                      <>
                        <option value="Rental timer pause request">Rental timer pause request</option>
                        <option value="Payment succeeded but status pending">Payment debited but status pending</option>
                        <option value="Security deposit refund timeline">Security deposit refund timeline</option>
                        <option value="Unexpected charge on statement">Unexpected charge on statement</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Step 3: Diagnostic Checklist */}
                <div className="p-4 sm:p-5 rounded-2xl bg-muted/70 border border-border space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Safe Diagnostic Steps for &ldquo;{troubleIssue}&rdquo;:</span>
                  </div>

                  <div className="text-xs sm:text-sm text-foreground/85 space-y-2">
                    {troubleIssue.includes("turning on") && (
                      <>
                        <p>1. Check battery door latch. On modern cinema cameras, the internal switch requires a complete mechanical lock.</p>
                        <p>2. Disconnect external dummy batteries, monitors, or USB-C hubs to test the internal battery alone.</p>
                        <p>3. Clean the gold battery contact terminals with a dry cloth and allow 15 minutes on the wall charger.</p>
                      </>
                    )}
                    {troubleIssue.includes("blurry") && (
                      <>
                        <p>1. Check the AF/MF switch on the physical lens barrel.</p>
                        <p>2. Inspect front element with a light source for dust or moisture condensation.</p>
                        <p>3. Verify shutter speed is double your frame rate (e.g. 1/100 for 50fps) to avoid motion blur.</p>
                      </>
                    )}
                    {troubleIssue.includes("PIN") && (
                      <>
                        <p>1. The Vendor enters their 4-digit PIN, and you enter your 4-digit PIN to form the 8-digit verification.</p>
                        <p>2. Find your Secret PIN inside your booking details under the Orders tab or delivery SMS.</p>
                        <p>3. Do not disclose your PIN prior to physically inspecting the gear.</p>
                      </>
                    )}
                    {troubleIssue.includes("pause") && (
                      <>
                        <p>1. Rental pauses require administrative review if equipment was rendered unusable through no user fault.</p>
                        <p>2. Submit a ticket with proof of defect to freeze the billing clock immediately.</p>
                      </>
                    )}
                    {!troubleIssue.includes("turning on") &&
                      !troubleIssue.includes("blurry") &&
                      !troubleIssue.includes("PIN") &&
                      !troubleIssue.includes("pause") && (
                        <>
                          <p>1. Verify standard power output and cable seating.</p>
                          <p>2. Never attempt unauthorized disassembly, firmware flashing, or electrical modifications.</p>
                          <p>3. If the problem persists, escalate to support below for replacement or billing credit.</p>
                        </>
                      )}
                  </div>
                </div>

                {/* Step 4: Resolution Question */}
                <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs font-semibold text-foreground">
                    Did these diagnostic steps resolve the issue?
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTroubleResolved(true)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        troubleResolved === true
                          ? "bg-emerald-500 text-white"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      )}
                    >
                      Yes, it&rsquo;s working!
                    </button>
                    <button
                      onClick={() => {
                        setTroubleResolved(false);
                        handlePrefillTicket(troubleCategory, troubleIssue);
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        troubleResolved === false
                          ? "bg-rose-500 text-white"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      )}
                    >
                      No, I still need help
                    </button>
                  </div>
                </div>

                {troubleResolved === true && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Great! You&rsquo;re all set. Feel free to return to the Knowledge Base if you need anything else.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RAISE SUPPORT TICKET */}
          {activeTab === "ticket" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    Raise a Support Ticket
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Submit your request directly to our platform operations team. Authenticated tickets receive prioritized review.
                  </p>
                </div>

                {ticketSuccessId ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground">
                        Support Ticket Created Successfully!
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Your reference ID is:
                      </p>
                      <div className="font-mono text-sm font-black text-emerald-500 bg-emerald-500/10 py-1.5 px-3 rounded-lg inline-block">
                        #{ticketSuccessId}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Our coordinators have received your ticket. You can track updates and conversation history under &ldquo;My Support Requests&rdquo;.
                    </p>
                    <div className="pt-2 flex justify-center gap-3">
                      <button
                        onClick={() => {
                          setTicketSuccessId(null);
                          setActiveTab("requests");
                        }}
                        className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold cursor-pointer"
                      >
                        View My Tickets
                      </button>
                      <button
                        onClick={() => setTicketSuccessId(null)}
                        className="px-4 py-2 rounded-xl bg-muted text-xs font-semibold hover:bg-muted/80 cursor-pointer"
                      >
                        Submit Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    {ticketError && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between">
                        <span>{ticketError}</span>
                        <button
                          type="button"
                          onClick={() => setTicketError(null)}
                          className="text-xs underline font-bold cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Authenticated user note */}
                    {user ? (
                      <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground flex items-center justify-between">
                        <div>
                          Submitting as: <strong className="text-foreground">{user.fullName || user.email}</strong>
                        </div>
                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Verified User
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-center justify-between">
                        <span>Tip: Log in to automatically link tickets to your account and track conversations.</span>
                        <Link to="/login" className="underline font-bold">
                          Login
                        </Link>
                      </div>
                    )}

                    {/* Category Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Issue Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 cursor-pointer"
                      >
                        {FAQ_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Subject <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={200}
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="Brief summary of the issue (e.g. Battery drain on Sony FX3)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </div>

                    {/* Optional Booking ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>Booking ID</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                        </label>
                        {userBookings.length > 0 ? (
                          <select
                            value={ticketBookingId}
                            onChange={(e) => setTicketBookingId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 cursor-pointer"
                          >
                            <option value="">Select an active booking...</option>
                            {userBookings.map((b) => (
                              <option key={b.id} value={b.id}>
                                #{b.id} — {b.productTitle}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={ticketBookingId}
                            onChange={(e) => setTicketBookingId(e.target.value)}
                            placeholder="e.g. ord_1790474940011"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                          />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>Product Reference</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                        </label>
                        <input
                          type="text"
                          value={ticketProductRef}
                          onChange={(e) => setTicketProductRef(e.target.value)}
                          placeholder="e.g. Sony FX3 Cinema Line"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        />
                      </div>
                    </div>

                    {/* Description Message */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span>
                          Detailed Description <span className="text-rose-500">*</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-normal font-mono">
                          {ticketMessage.length} / 5000 chars
                        </span>
                      </div>
                      <textarea
                        required
                        minLength={10}
                        maxLength={5000}
                        rows={5}
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        placeholder="Please describe the issue in detail. If reporting damaged gear or missing parts, specify the exact item and time of discovery."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-y"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTicketSubject("");
                          setTicketMessage("");
                          setTicketBookingId("");
                          setTicketProductRef("");
                        }}
                        className="px-4 py-2.5 rounded-xl bg-muted text-xs font-semibold hover:bg-muted/80 cursor-pointer"
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={ticketSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-foreground text-background text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        {ticketSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting Ticket...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Submit Support Ticket</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MY SUPPORT REQUESTS */}
          {activeTab === "requests" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    My Support Requests
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Track ticket status, review resolutions, and communicate directly with coordinators.
                  </p>
                </div>
                {user && (
                  <button
                    onClick={loadMyTickets}
                    disabled={loadingTickets}
                    className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Refresh tickets"
                  >
                    <RefreshCw className={cn("w-4 h-4", loadingTickets && "animate-spin")} />
                  </button>
                )}
              </div>

              {!user ? (
                <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border text-center space-y-4">
                  <Shield className="w-10 h-10 text-muted-foreground mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">
                      Log In to View Your Requests
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      For your privacy and data security, support ticket history is only accessible when logged into your verified Payent account.
                    </p>
                  </div>
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded-xl bg-foreground text-background text-xs font-bold inline-block hover:opacity-90"
                  >
                    Log In to Payent
                  </Link>
                </div>
              ) : loadingTickets ? (
                <div className="p-12 text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-foreground" />
                  <p className="text-xs text-muted-foreground">Loading your support tickets...</p>
                </div>
              ) : ticketListError ? (
                <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
                  <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
                  <p className="text-xs text-rose-500">{ticketListError}</p>
                  <button
                    onClick={loadMyTickets}
                    className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold hover:bg-muted"
                  >
                    Retry
                  </button>
                </div>
              ) : myTickets.length === 0 ? (
                <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border text-center space-y-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">
                      No Support Tickets Found
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      You currently have no open or past support requests. If you are experiencing any issue with gear or billing, raise a ticket below.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("ticket")}
                    className="px-5 py-2.5 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 cursor-pointer"
                  >
                    Raise Support Ticket
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTickets.map((t) => {
                    const isSelected = selectedRequest?.id === t.id;
                    const msgs = Array.isArray(t.messages) ? t.messages : [];
                    const status = (t.status || "open").toLowerCase();
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "rounded-2xl border transition-all overflow-hidden",
                          isSelected
                            ? "bg-card border-foreground/30 shadow-md"
                            : "bg-card/70 border-border hover:border-foreground/20"
                        )}
                      >
                        <div
                          onClick={() => setSelectedRequest(isSelected ? null : t)}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-foreground">
                                #{t.id}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                  status === "open"
                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    : status === "pending"
                                    ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                    : status === "resolved" || status === "closed"
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {status}
                              </span>
                              <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                                {t.category || "General"}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {t.subject}
                            </h4>
                            {t.bookingId && (
                              <div className="text-[11px] text-muted-foreground font-mono">
                                Related Booking: #{t.bookingId}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <div className="text-right text-[11px] text-muted-foreground">
                              <div>{t.createdAt ? t.createdAt.slice(0, 10) : "Recent"}</div>
                              <div className="text-[10px]">{msgs.length} messages</div>
                            </div>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform",
                                isSelected && "rotate-180 text-foreground"
                              )}
                            />
                          </div>
                        </div>

                        {/* Expanded conversation history & reply box */}
                        {isSelected && (
                          <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-border/50 space-y-4">
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                              {msgs.map((m: any, idx: number) => {
                                const isAdmin = m.senderType === "admin" || m.sender === "admin";
                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "p-3.5 rounded-xl text-xs space-y-1 max-w-[85%]",
                                      isAdmin
                                        ? "ml-auto bg-foreground text-background"
                                        : "mr-auto bg-muted border border-border text-foreground"
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-4 font-bold text-[10px] opacity-75">
                                      <span>{isAdmin ? "Payent Support" : m.sender || "You"}</span>
                                      <span>
                                        {m.timestamp
                                          ? new Date(m.timestamp).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : ""}
                                      </span>
                                    </div>
                                    <p className="leading-relaxed whitespace-pre-wrap">{m.content || m.message}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Reply Input Form */}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSendTicketReply(t.id);
                              }}
                              className="pt-2 flex items-center gap-2 border-t border-border/40"
                            >
                              <input
                                type="text"
                                required
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Send a follow-up message to support..."
                                className="flex-1 px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                              />
                              <button
                                type="submit"
                                disabled={replying || !replyText.trim()}
                                className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                              >
                                {replying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                <span>Reply</span>
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
