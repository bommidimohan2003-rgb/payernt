import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Tag,
  Camera,
  Laptop,
  Radio,
  Mic,
  Gamepad2,
  Bike,
  Wrench,
  Monitor,
  Package,
  Inbox,
  Check,
} from "lucide-react";
import type { PayerntMessage, PayerntProduct } from "../types";

interface PayerntMessagesProps {
  messages: PayerntMessage[];
  products: PayerntProduct[];
  unreadCount?: number;
  onBack: () => void;
  onMarkAsRead: (messageId: string) => void;
  onNavigateToProduct?: (productId: string) => void;
  onNavigateTab?: (tab: "home" | "products" | "requests" | "wallet" | "profile" | "list" | "messages") => void;
}

// Category icon helper (STRICT ZERO IMAGES)
function getCategoryIcon(category?: string, title?: string) {
  const cat = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();

  if (
    cat.includes("camera") ||
    cat.includes("photo") ||
    cat.includes("lens") ||
    t.includes("camera") ||
    t.includes("sony") ||
    t.includes("canon") ||
    t.includes("nikon")
  ) {
    return Camera;
  }
  if (
    cat.includes("laptop") ||
    cat.includes("computer") ||
    cat.includes("pc") ||
    t.includes("macbook") ||
    t.includes("laptop") ||
    t.includes("dell") ||
    t.includes("asus")
  ) {
    return Laptop;
  }
  if (cat.includes("drone") || cat.includes("aerial") || t.includes("drone") || t.includes("dji")) {
    return Radio;
  }
  if (cat.includes("audio") || cat.includes("sound") || cat.includes("mic") || t.includes("mic") || t.includes("rode")) {
    return Mic;
  }
  if (cat.includes("game") || cat.includes("gaming") || cat.includes("vr") || t.includes("ps5") || t.includes("xbox")) {
    return Gamepad2;
  }
  if (cat.includes("mobility") || cat.includes("bike") || cat.includes("cycle")) {
    return Bike;
  }
  if (cat.includes("tool") || cat.includes("hardware") || cat.includes("equipment")) {
    return Wrench;
  }
  if (cat.includes("display") || cat.includes("monitor") || cat.includes("tv")) {
    return Monitor;
  }
  return Package;
}

// Message type style helper
function getMessageTypeBadge(type?: string) {
  switch (type) {
    case "PRODUCT_APPROVED":
      return {
        label: "Approved",
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        icon: CheckCircle2,
      };
    case "PRODUCT_REVISION_REQUIRED":
      return {
        label: "Revision Required",
        bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        icon: AlertTriangle,
      };
    case "PRODUCT_REJECTED":
      return {
        label: "Rejected",
        bg: "bg-destructive/10 text-destructive border-destructive/20",
        icon: XCircle,
      };
    case "PRICE_UPDATE":
      return {
        label: "Price Notice",
        bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        icon: Tag,
      };
    case "PRODUCT_REVIEW":
      return {
        label: "Under Review",
        bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        icon: Clock,
      };
    case "ACCOUNT_REVIEW":
      return {
        label: "Account Notice",
        bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
        icon: ShieldCheck,
      };
    default:
      return {
        label: "Admin Notice",
        bg: "bg-secondary text-foreground border-border",
        icon: MessageSquare,
      };
  }
}

export function PayerntMessages({
  messages,
  products,
  unreadCount = 0,
  onBack,
  onMarkAsRead,
  onNavigateToProduct,
  onNavigateTab,
}: PayerntMessagesProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(() => {
    return messages.length > 0 ? messages[0].id || messages[0].messageId || null : null;
  });
  const [filterType, setFilterType] = useState<"ALL" | "UNREAD" | "REVIEWS" | "SYSTEM">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered message list
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      const isUnread = !m.read && !m.readAt;
      const type = (m.messageType || m.type || "").toUpperCase();

      if (filterType === "UNREAD" && !isUnread) return false;
      if (
        filterType === "REVIEWS" &&
        !type.includes("PRODUCT") &&
        !type.includes("REVIEW") &&
        !type.includes("REVISION") &&
        !type.includes("APPROV") &&
        !type.includes("REJECT")
      ) {
        return false;
      }
      if (filterType === "SYSTEM" && (type.includes("PRODUCT") || type.includes("REVIEW"))) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (m.title || "").toLowerCase().includes(q);
        const matchContent = (m.content || m.message || "").toLowerCase().includes(q);
        const matchProduct = (m.productName || "").toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchProduct) return false;
      }

      return true;
    });
  }, [messages, filterType, searchQuery]);

  // Selected message item
  const selectedMessage = useMemo(() => {
    if (!selectedMessageId && filteredMessages.length > 0) {
      return filteredMessages[0];
    }
    return (
      messages.find((m) => m.id === selectedMessageId || m.messageId === selectedMessageId) ||
      filteredMessages[0] ||
      null
    );
  }, [selectedMessageId, messages, filteredMessages]);

  // Handle message select and automatic mark-as-read
  const handleSelectMessage = (msg: PayerntMessage) => {
    const id = msg.id || msg.messageId;
    if (id) {
      setSelectedMessageId(id);
      if (!msg.read && !msg.readAt) {
        onMarkAsRead(id);
      }
    }
  };

  // Find linked product object if productId is provided
  const linkedProduct = useMemo(() => {
    if (!selectedMessage?.productId) return null;
    return products.find((p) => p.id === selectedMessage.productId) || null;
  }, [selectedMessage, products]);

  return (
    <div className="space-y-6 text-left">
      {/* HEADER WITH BACK BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary transition-all cursor-pointer shadow-xs"
            title="Back to Home"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground font-display tracking-tight">
                Messages
              </h1>
              {unreadCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Admin reviews, gear revisions, and product approval notices.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterType("ALL")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
            filterType === "ALL"
              ? "bg-foreground text-background shadow-xs"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          All Messages ({messages.length})
        </button>
        <button
          onClick={() => setFilterType("UNREAD")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === "UNREAD"
              ? "bg-foreground text-background shadow-xs"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Unread ({messages.filter((m) => !m.read && !m.readAt).length})
        </button>
        <button
          onClick={() => setFilterType("REVIEWS")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
            filterType === "REVIEWS"
              ? "bg-foreground text-background shadow-xs"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          Product Reviews & Approvals
        </button>
        <button
          onClick={() => setFilterType("SYSTEM")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
            filterType === "SYSTEM"
              ? "bg-foreground text-background shadow-xs"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          System Notices
        </button>
      </div>

      {/* 2-COLUMN MASTER-DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: MESSAGE LIST (5 COLS) */}
        <div className="lg:col-span-5 rounded-3xl border border-border/80 bg-card p-3 shadow-xs space-y-2 max-h-[680px] overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary mx-auto text-muted-foreground">
                <Inbox className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">No messages found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filterType !== "ALL"
                    ? "Try switching to All Messages to view your history."
                    : "Admin reviews and product notices will appear here."}
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const id = msg.id || msg.messageId || "";
              const isSelected = selectedMessage?.id === id || selectedMessage?.messageId === id;
              const isUnread = !msg.read && !msg.readAt;
              const badge = getMessageTypeBadge(msg.messageType || msg.type);
              const BadgeIcon = badge.icon;
              const CategoryIcon = getCategoryIcon(msg.productCategory, msg.productName);

              return (
                <div
                  key={id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? "bg-secondary border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/20"
                      : "border-border/60 hover:bg-secondary/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Category Icon Surface (NO IMAGES) */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/80 border border-border text-foreground">
                      <CategoryIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top row: Title + unread dot + time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" title="Unread" />
                          )}
                          <h4
                            className={`text-xs truncate ${
                              isUnread ? "font-black text-foreground" : "font-bold text-foreground/90"
                            }`}
                          >
                            {msg.title || "Admin Notice"}
                          </h4>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent"}
                        </span>
                      </div>

                      {/* Product Name if present */}
                      {msg.productName && (
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                          {msg.productName}
                        </p>
                      )}

                      {/* Preview Text */}
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {msg.content || msg.message}
                      </p>

                      {/* Type Badge */}
                      <div className="mt-2 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${badge.bg}`}
                        >
                          <BadgeIcon className="h-2.5 w-2.5" />
                          <span>{badge.label}</span>
                        </span>
                        {isUnread && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            Unread
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: SELECTED MESSAGE DETAIL (7 COLS) */}
        <div className="lg:col-span-7 rounded-3xl border border-border/80 bg-card p-6 shadow-xs min-h-[420px] flex flex-col justify-between">
          {selectedMessage ? (
            <div className="space-y-6">
              {/* DETAIL HEADER */}
              <div className="border-b border-border/70 pb-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const badge = getMessageTypeBadge(selectedMessage.messageType || selectedMessage.type);
                      const BadgeIcon = badge.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg}`}
                        >
                          <BadgeIcon className="h-3.5 w-3.5" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })()}
                    <span className="text-xs text-muted-foreground font-semibold">
                      From: {selectedMessage.senderName || "Payent Admin"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {selectedMessage.createdAt
                        ? new Date(selectedMessage.createdAt).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Recent"}
                    </span>
                  </div>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-foreground font-display tracking-tight">
                  {selectedMessage.title}
                </h2>
              </div>

              {/* LINKED PRODUCT CARD (NO IMAGES) */}
              {selectedMessage.productId && (
                <div className="p-4 rounded-2xl border border-border/80 bg-secondary/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const Icon = getCategoryIcon(selectedMessage.productCategory, selectedMessage.productName);
                      return (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card border border-border text-foreground shadow-2xs">
                          <Icon className="h-6 w-6" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Linked Gear Listing
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {selectedMessage.productName || linkedProduct?.title || "Gear Listing"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Category: {selectedMessage.productCategory || linkedProduct?.category || "Equipment"}
                      </p>
                    </div>
                  </div>

                  {/* View Product Action Button */}
                  <button
                    onClick={() => {
                      if (selectedMessage.productId && onNavigateToProduct) {
                        onNavigateToProduct(selectedMessage.productId);
                      } else if (onNavigateTab) {
                        onNavigateTab("products");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all cursor-pointer shrink-0 shadow-xs"
                  >
                    <span>View Product</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* MESSAGE CONTENT BODY */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Admin Message
                </h3>
                <div className="p-5 rounded-2xl border border-border/60 bg-card text-foreground text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedMessage.content || selectedMessage.message}
                </div>
              </div>

              {/* FOOTER STATUS */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Verified Admin Notification</span>
                </div>
                <div>
                  Status: <span className="font-bold text-foreground">{selectedMessage.status || (selectedMessage.read ? "Read" : "Unread")}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="m-auto text-center p-12 space-y-3">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-bold text-sm text-foreground">Select a message</p>
              <p className="text-xs text-muted-foreground">
                Click on any message from the list on the left to view details and linked product actions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default PayerntMessages;
