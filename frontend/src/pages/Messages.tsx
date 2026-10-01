import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  MessageSquare,
  Send,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  User,
  ShieldCheck,
  X,
  Truck,
  MapPin,
  ExternalLink,
  Package,
  Navigation,
  RefreshCw,
  ArrowLeft,
  Paperclip,
  Image as ImageIcon,
  Search,
  Check,
  CheckCheck,
  Info,
  Calendar,
  IndianRupee,
  ChevronRight,
  Maximize2,
  Download,
  Sparkles,
  FileText,
  ChevronDown,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import type { RealtimeConversation, RealtimeMessage, DeliveryStatus } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatMessageDate(isoString?: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

function formatMessageTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function getDeliveryStatusBadge(status?: DeliveryStatus | string) {
  switch (status) {
    case "OUT_FOR_DELIVERY":
      return {
        label: "Out for Delivery",
        color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        pulse: true,
      };
    case "NEAR_DESTINATION":
      return {
        label: "Near Destination",
        color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
        pulse: true,
      };
    case "DELIVERED":
      return {
        label: "Delivered",
        color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        pulse: false,
      };
    case "PREPARING":
      return {
        label: "Preparing Gear",
        color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        pulse: false,
      };
    case "READY":
      return {
        label: "Ready for Pickup",
        color: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
        pulse: false,
      };
    case "PENDING":
    default:
      return {
        label: "Pending Dispatch",
        color: "bg-secondary text-muted-foreground border-border",
        pulse: false,
      };
  }
}

type FilterTab = "ALL" | "UNREAD" | "RENTALS" | "INQUIRIES";

export default function Messages() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<RealtimeConversation[]>(() => {
    return storage.get<RealtimeConversation[]>(STORAGE_KEYS.messages, []);
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    const cached = storage.get<RealtimeConversation[]>(STORAGE_KEYS.messages, []);
    return cached.length > 0 ? cached[0].id : null;
  });
  const [activeConversation, setActiveConversation] = useState<RealtimeConversation | null>(() => {
    const cached = storage.get<RealtimeConversation[]>(STORAGE_KEYS.messages, []);
    return cached.length > 0 ? cached[0] : null;
  });
  const [messages, setMessages] = useState<RealtimeMessage[]>(() => {
    const cached = storage.get<RealtimeConversation[]>(STORAGE_KEYS.messages, []);
    return cached.length > 0 && Array.isArray(cached[0]?.messages) ? cached[0].messages : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = storage.get<RealtimeConversation[]>(STORAGE_KEYS.messages, []);
    return cached.length === 0;
  });
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [showMobileContext, setShowMobileContext] = useState(false);
  const [showDesktopContext, setShowDesktopContext] = useState(true);

  // Attachment state
  const [selectedAttachment, setSelectedAttachment] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
  } | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Initial Load of Conversations and URL query handling
  const loadConversations = useCallback(async (preferredId?: string) => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setError(null);

      // Check if URL has ?bookingId= or ?conversationId=
      const searchParams = new URLSearchParams(window.location.search);
      const bookingIdParam = searchParams.get("bookingId");
      const conversationIdParam = searchParams.get("conversationId");

      let targetConvId = preferredId || conversationIdParam || undefined;

      if (bookingIdParam) {
        try {
          const bookingConvRes = await api.getBookingConversation(token, bookingIdParam);
          if (bookingConvRes.success && bookingConvRes.conversation) {
            targetConvId = bookingConvRes.conversation.id;
          }
        } catch (e) {
          console.warn("Could not pre-load booking conversation:", e);
        }
      }

      const res = await api.getRealtimeConversations(token);
      const list = res.conversations || [];
      setConversations(list);

      if (list.length > 0) {
        if (targetConvId && list.some((c) => c.id === targetConvId)) {
          setActiveId(targetConvId);
        } else if (!activeId || !list.some((c) => c.id === activeId)) {
          setActiveId(targetConvId || list[0].id);
        }
      } else {
        setActiveId(null);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    if (ready && user) {
      loadConversations();
    } else if (ready && !user) {
      setLoading(false);
    }
  }, [ready, user?.email, loadConversations]);

  // 2. Load Active Conversation Detail
  const loadActiveThread = useCallback(async (convId: string, showSpinner = false) => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token || !convId) return;

    if (showSpinner) setThreadLoading(true);
    try {
      const res = await api.getRealtimeConversationDetail(token, convId);
      if (res.success && res.conversation) {
        setActiveConversation(res.conversation);
        setMessages(res.conversation.messages || []);

        // Mark read
        api
          .markRealtimeConversationRead(token, convId)
          .then(() => {
            window.dispatchEvent(new CustomEvent("payent:unread-messages-updated"));
          })
          .catch(() => {});

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, unread: false, unreadCount: 0 } : c,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to load conversation detail:", err);
    } finally {
      if (showSpinner) setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) {
      loadActiveThread(activeId, true);
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [activeId, loadActiveThread]);

  // 3. Real-time WebSocket connection for active thread + Polling fallback
  useEffect(() => {
    if (!activeId) return;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;

    let isSubscribed = true;

    const isEmulator = typeof window !== "undefined" && window.location.hostname === "10.0.2.2";
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const apiBase =
      (typeof window !== "undefined" && (window as any).PAYENT_API_URL) ||
      (isEmulator ? "http://10.0.2.2:8001" : isLocal ? "http://127.0.0.1:8001" : import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8001"));

    const wsUrl = apiBase.replace(/^http/, "ws") + `/api/conversations/${activeId}/ws?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let pingTimer: any = null;

      ws.onopen = () => {
        if (!isSubscribed) return;
        setWsConnected(true);
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(event.data);
          if ((data.type === "message.received" || data.type === "chat.message") && data.message) {
            const newMsg = data.message as RealtimeMessage;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeId
                  ? {
                      ...c,
                      lastMessage: newMsg.content || "Shared an attachment",
                      lastMessageAt: newMsg.created_at,
                    }
                  : c,
              ),
            );
          } else if (data.type === "delivery.status") {
            loadActiveThread(activeId, false);
          }
        } catch (e) {
          console.error("Failed to parse websocket message:", e);
        }
      };

      ws.onerror = () => {
        if (isSubscribed) setWsConnected(false);
      };

      ws.onclose = () => {
        if (isSubscribed) setWsConnected(false);
        if (pingTimer) clearInterval(pingTimer);
      };
    } catch {
      setWsConnected(false);
    }

    // Polling fallback every 8 seconds
    const pollInterval = setInterval(() => {
      if (isSubscribed) {
        loadActiveThread(activeId, false);
      }
    }, 8000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
    };
  }, [activeId, loadActiveThread]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Adjust textarea height dynamically
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // 4. File Attachment Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size cannot exceed 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const previewUrl = URL.createObjectURL(file);
      setSelectedAttachment({ file, previewUrl, base64 });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    if (selectedAttachment?.previewUrl) {
      URL.revokeObjectURL(selectedAttachment.previewUrl);
    }
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 5. Send Message Handler
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !selectedAttachment) || !activeId || sending) return;

    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      toast.error("Please sign in to send messages.");
      return;
    }

    const messageText = input.trim();
    const currentAttachment = selectedAttachment;

    setInput("");
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticMsg: RealtimeMessage = {
      id: tempId,
      conversation_id: activeId,
      sender_email: user?.email || "",
      sender_name: user?.fullName || "You",
      message_type: currentAttachment ? (currentAttachment.file.type.startsWith("image/") ? "IMAGE" : "FILE") : "TEXT",
      content: messageText || (currentAttachment ? `Shared ${currentAttachment.file.name}` : ""),
      created_at: nowIso,
      updated_at: nowIso,
      attachments: currentAttachment
        ? [
            {
              id: `att-temp-${Date.now()}`,
              message_id: tempId,
              file_url: currentAttachment.previewUrl || currentAttachment.base64,
              file_name: currentAttachment.file.name,
              file_type: currentAttachment.file.type,
              file_size: currentAttachment.file.size,
              created_at: nowIso,
            },
          ]
        : [],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              lastMessage: optimisticMsg.content,
              lastMessageAt: nowIso,
            }
          : c,
      ),
    );

    try {
      let res;
      if (currentAttachment) {
        res = await api.sendRealtimeMessage(
          token,
          activeId,
          messageText || `Shared ${currentAttachment.file.name}`,
          currentAttachment.file.type.startsWith("image/") ? "IMAGE" : "FILE",
          currentAttachment.base64,
          currentAttachment.file.name,
          currentAttachment.file.type,
          currentAttachment.file.size,
        );
      } else {
        res = await api.sendRealtimeMessage(token, activeId, messageText);
      }

      if (res.success && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.message : m)),
        );
        window.dispatchEvent(new CustomEvent("payent:unread-messages-updated"));
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 6. Quick Prompts
  const sendQuickPrompt = (promptText: string) => {
    setInput(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Tab filter
      if (activeTab === "UNREAD" && (!c.unreadCount || c.unreadCount === 0)) return false;
      if (activeTab === "RENTALS" && !c.bookingId) return false;
      if (activeTab === "INQUIRIES" && c.bookingId) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.counterparty?.name?.toLowerCase().includes(q);
        const matchProd = c.productTitle?.toLowerCase().includes(q);
        const matchBook = c.bookingId?.toLowerCase().includes(q);
        const matchLast = c.lastMessage?.toLowerCase().includes(q);
        return matchName || matchProd || matchBook || matchLast;
      }
      return true;
    });
  }, [conversations, activeTab, searchQuery]);

  // Auth wall
  if (ready && !user) {
    return (
      <MainLayout>
        <section className="mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="h-16 w-16 rounded-3xl bg-secondary/80 mx-auto flex items-center justify-center text-foreground mb-6 shadow-sm border border-border">
            <MessageSquare className="h-8 w-8 stroke-[1.8]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Sign In to Access Messages
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Directly coordinate with verified gear lenders and renters, manage bookings, and track live deliveries in real-time.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center justify-center h-11 px-7 rounded-full bg-[#161616] text-[#FFFFFF] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
            >
              Sign In to Payent
            </Link>
          </div>
        </section>
      </MainLayout>
    );
  }

  const deliveryBadge = activeConversation?.deliveryStatus
    ? getDeliveryStatusBadge(activeConversation.deliveryStatus)
    : null;

  return (
    <MainLayout>
      <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                P2P Rental Workspace
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <span>Messages & Coordination</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadConversations()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer"
              title="Sync conversations"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* 3-Column Messenger Workspace Container */}
        <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-card shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[720px] max-h-[880px]">
          
          {/* ========================================================================= */}
          {/* COLUMN 1: Conversations Roster (Left) */}
          {/* ========================================================================= */}
          <div
            className={cn(
              "md:col-span-4 lg:col-span-4 xl:col-span-3.5 border-r border-border flex flex-col bg-secondary/15 h-[720px] md:h-auto",
              activeId ? "hidden md:flex" : "flex",
            )}
          >
            {/* Search and Tabs */}
            <div className="p-3.5 border-b border-border space-y-3 bg-card">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, gear, booking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-foreground text-foreground placeholder:text-muted-foreground/70"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-secondary/60 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={cn(
                    "py-1 rounded-lg transition-all text-center cursor-pointer",
                    activeTab === "ALL"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  All ({conversations.length})
                </button>
                <button
                  onClick={() => setActiveTab("UNREAD")}
                  className={cn(
                    "py-1 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1",
                    activeTab === "UNREAD"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Unread</span>
                  {conversations.filter(c => (c.unreadCount ?? 0) > 0).length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("RENTALS")}
                  className={cn(
                    "py-1 rounded-lg transition-all text-center cursor-pointer",
                    activeTab === "RENTALS"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Rentals
                </button>
                <button
                  onClick={() => setActiveTab("INQUIRIES")}
                  className={cn(
                    "py-1 rounded-lg transition-all text-center cursor-pointer",
                    activeTab === "INQUIRIES"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Inquiries
                </button>
              </div>
            </div>

            {/* Conversation List Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="p-3.5 rounded-2xl bg-secondary/30 animate-pulse space-y-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-secondary shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-3/4 bg-secondary rounded" />
                          <div className="h-3 w-1/2 bg-secondary rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-6 text-center text-xs text-destructive">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  <p>{error}</p>
                  <button
                    onClick={() => loadConversations()}
                    className="mt-3 text-xs font-bold underline cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                  <Inbox className="h-9 w-9 text-muted-foreground/40 mb-2.5" />
                  <p className="text-xs font-bold text-foreground">
                    {searchQuery ? "No matching conversations" : "Your conversations will appear here."}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-[210px] leading-normal">
                    {searchQuery
                      ? "Try searching with different keywords."
                      : "When you inquire on a product or book equipment, conversations appear here."}
                  </p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = c.id === activeId;
                  const itemBadge = c.deliveryStatus
                    ? getDeliveryStatusBadge(c.deliveryStatus)
                    : null;

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveId(c.id);
                        if (c.unreadCount && c.unreadCount > 0) {
                          setConversations((prev) =>
                            prev.map((item) =>
                              item.id === c.id
                                ? { ...item, unread: false, unreadCount: 0 }
                                : item,
                            ),
                          );
                        }
                      }}
                      className={cn(
                        "w-full p-3.5 text-left transition-all relative flex items-start gap-3 select-none cursor-pointer",
                        isSelected
                          ? "bg-card md:bg-secondary/40 border-l-3 border-foreground shadow-xs"
                          : "hover:bg-secondary/20",
                      )}
                    >
                      {/* Product Thumbnail */}
                      <div className="relative shrink-0">
                        {c.productImage ? (
                          <img
                            src={c.productImage}
                            alt={c.productTitle || "Gear"}
                            className="h-11 w-11 rounded-xl object-cover border border-border shadow-xs"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-xl border border-border bg-secondary/30 flex items-center justify-center text-muted-foreground/50">
                            <Package className="h-5 w-5 opacity-60" />
                          </div>
                        )}
                        {itemBadge && itemBadge.pulse && (
                          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-card" />
                          </span>
                        )}
                      </div>

                      {/* Content Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-foreground truncate">
                            {c.counterparty?.name || "Lender"}
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                            {formatTimeAgo(c.lastMessageAt || c.updatedAt || (c as any).updated_at)}
                          </span>
                        </div>

                        {/* Product Title and Role */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate mb-1">
                          <span className="font-semibold text-foreground/80 truncate">
                            {c.productTitle || "Gear Rental"}
                          </span>
                          {c.counterparty?.role && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground uppercase tracking-wider shrink-0">
                              {c.counterparty.role === "lender" ? "Lender" : "Renter"}
                            </span>
                          )}
                        </div>

                        {/* Last Message Snippet */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-muted-foreground truncate flex-1">
                            {c.lastMessage || "No messages yet"}
                          </p>

                          {/* Badges: Unread or Booking/Delivery status */}
                          <div className="flex items-center gap-1 shrink-0">
                            {c.bookingId && !c.deliveryStatus && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                                Active Rental
                              </span>
                            )}
                            {itemBadge && (
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                                  itemBadge.color,
                                )}
                              >
                                {itemBadge.label}
                              </span>
                            )}
                            {c.unreadCount && c.unreadCount > 0 ? (
                              <span className="px-1.5 py-0.5 min-w-[17px] h-[17px] rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center leading-none shadow-xs">
                                {c.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLUMN 2: Active Chat Thread (Center) */}
          {/* ========================================================================= */}
          <div
            className={cn(
              "md:col-span-8 flex flex-col bg-card h-[720px] md:h-auto border-r border-border/50",
              showDesktopContext ? "lg:col-span-5 xl:col-span-5.5" : "lg:col-span-8 xl:col-span-8.5",
              !activeId ? "hidden md:flex" : "flex",
            )}
          >
            {activeConversation ? (
              <>
                {/* 1. Active Thread Header */}
                <div className="p-3.5 px-4 border-b border-border flex items-center justify-between bg-card/90 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setActiveId(null)}
                      className="md:hidden p-1.5 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                      title="Back to conversation list"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    {/* Counterparty Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={
                          activeConversation.counterparty?.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            activeConversation.counterparty?.name || "User",
                          )}&background=161616&color=ffffff`
                        }
                        alt=""
                        className="h-10 w-10 rounded-full object-cover border border-border shadow-xs"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                    </div>

                    {/* Header Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {activeConversation.counterparty?.name || "Gear Lender"}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                          {activeConversation.counterparty?.role === "lender" ? "Verified Lender" : "Verified Renter"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate mt-0.5">
                        <Link
                          to="/product/$id"
                          params={{ id: activeConversation.productId || "p1" }}
                          className="hover:underline text-foreground/80 font-medium truncate flex items-center gap-1"
                        >
                          <span>{activeConversation.productTitle || "Rental Gear"}</span>
                          {activeConversation.productPrice && (
                            <span className="text-muted-foreground font-normal">
                              (₹{activeConversation.productPrice}/day)
                            </span>
                          )}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions (Toggle Context Drawer) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Delivery Chip in Header if active */}
                    {deliveryBadge && (
                      <Link
                        to="/delivery/$id"
                        params={{ id: activeConversation.bookingId || "delivery" }}
                        className={cn(
                          "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all hover:opacity-90",
                          deliveryBadge.color,
                        )}
                      >
                        <Truck className="h-3 w-3" />
                        <span>{deliveryBadge.label}</span>
                      </Link>
                    )}

                    {/* Desktop Context Toggle Button */}
                    <button
                      onClick={() => setShowDesktopContext((prev) => !prev)}
                      className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/40 text-xs font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer"
                      title="Toggle Context Panel"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>{showDesktopContext ? "Hide Context" : "View Context"}</span>
                    </button>

                    {/* Mobile Context Drawer Trigger */}
                    <button
                      onClick={() => setShowMobileContext(true)}
                      className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border bg-secondary/50 text-xs font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer"
                      title="View Gear & Booking Details"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Details</span>
                    </button>
                  </div>
                </div>

                {/* 2. Active Delivery Floating Alert (When Delivery in progress) */}
                {deliveryBadge && (
                  <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Delivery in Progress: {deliveryBadge.label}</span>
                      {(activeConversation as any).deliveryEta && (
                        <span className="text-muted-foreground font-normal">
                          • ETA ~{(activeConversation as any).deliveryEta}
                        </span>
                      )}
                    </div>
                    <Link
                      to="/delivery/$id"
                      params={{ id: activeConversation.bookingId || "delivery" }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-foreground hover:underline cursor-pointer"
                    >
                      <span>View Live Map</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                {/* 3. Messages Timeline Feed */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-card"
                >
                  {threadLoading ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                      <Loader2 className="h-7 w-7 animate-spin text-foreground mb-2" />
                      <span className="text-xs font-medium">Loading message history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16 flex flex-col items-center justify-center">
                      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-foreground mb-3">
                        <MessageSquare className="h-6 w-6 stroke-[1.8]" />
                      </div>
                      <p className="text-xs font-bold text-foreground">
                        Start the conversation.
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
                        Send a message to coordinate pickup timing, verify equipment condition, or ask questions.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Timeline grouping by calendar date */}
                      {messages.map((m, idx) => {
                        const isMe = m.sender_email === user?.email;
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const currDate = formatMessageDate(m.created_at);
                        const prevDate = prevMsg ? formatMessageDate(prevMsg.created_at) : null;
                        const showDateSeparator = currDate !== prevDate;
                        const isSystem = m.message_type === "SYSTEM";

                        return (
                          <div key={m.id || idx} className="space-y-3">
                            {/* Date Grouping Separator */}
                            {showDateSeparator && (
                              <div className="flex items-center justify-center my-3">
                                <span className="px-3 py-1 rounded-full bg-secondary/70 text-[10px] font-bold text-muted-foreground border border-border/50 uppercase tracking-wider">
                                  {currDate}
                                </span>
                              </div>
                            )}

                            {/* System Event Card */}
                            {isSystem ? (
                              <div className="flex justify-center my-2">
                                <div className="max-w-md w-full p-3 rounded-2xl bg-secondary/40 border border-border/70 text-center space-y-1">
                                  <div className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                    <span>{m.content}</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground block">
                                    {formatMessageTime(m.created_at)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* Standard Message Bubble */
                              <div
                                className={cn(
                                  "flex flex-col",
                                  isMe ? "items-end" : "items-start",
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs shadow-xs space-y-2",
                                    isMe
                                      ? "bg-[#161616] text-[#FFFFFF] dark:bg-[#22272E] dark:text-[#FFFFFF] rounded-tr-xs"
                                      : "bg-[#F5F5F3] text-[#161616] dark:bg-[#161B22] dark:text-[#E6EDF3] border border-black/5 dark:border-white/5 rounded-tl-xs",
                                  )}
                                >
                                  {/* Sender Label for Counterparty */}
                                  {!isMe && (
                                    <span className="text-[10px] font-bold text-foreground/70 block mb-0.5">
                                      {m.sender_name || activeConversation.counterparty?.name || "Lender"}
                                    </span>
                                  )}

                                  {/* Attachments Rendering */}
                                  {m.attachments && m.attachments.length > 0 && (
                                    <div className="space-y-2">
                                      {m.attachments.map((att) => {
                                        const isImage =
                                          att.file_type?.startsWith("image/") ||
                                          att.file_url.startsWith("data:image/") ||
                                          /\.(jpg|jpeg|png|webp|gif)$/i.test(att.file_url);

                                        if (isImage) {
                                          return (
                                            <div
                                              key={att.id}
                                              className="relative group rounded-xl overflow-hidden border border-black/10 dark:border-white/10 cursor-pointer max-w-sm"
                                              onClick={() => setLightboxImageUrl(att.file_url)}
                                            >
                                              <img
                                                src={att.file_url}
                                                alt={att.file_name || "Attachment"}
                                                className="max-h-60 w-full object-cover transition-transform duration-200 group-hover:scale-102"
                                              />
                                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                <Maximize2 className="h-5 w-5" />
                                              </div>
                                            </div>
                                          );
                                        }

                                        return (
                                          <a
                                            key={att.id}
                                            href={att.file_url}
                                            download={att.file_name || "attachment"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(
                                              "flex items-center gap-2 p-2.5 rounded-xl border transition-colors",
                                              isMe
                                                ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                                                : "bg-secondary/60 hover:bg-secondary text-foreground border-border",
                                            )}
                                          >
                                            <FileText className="h-4 w-4 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[11px] font-bold truncate">
                                                {att.file_name || "Attached File"}
                                              </p>
                                              {att.file_size && (
                                                <p className="text-[9px] opacity-75">
                                                  {(att.file_size / 1024).toFixed(0)} KB
                                                </p>
                                              )}
                                            </div>
                                            <Download className="h-3.5 w-3.5 shrink-0 opacity-75" />
                                          </a>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Text Message Content */}
                                  {m.content && (
                                    <p className="whitespace-pre-wrap leading-relaxed select-text font-normal">
                                      {m.content}
                                    </p>
                                  )}

                                  {/* Message Meta (Time & Status Ticks) */}
                                  <div
                                    className={cn(
                                      "flex items-center justify-end gap-1 text-[9px] pt-1",
                                      isMe ? "text-white/70" : "text-muted-foreground",
                                    )}
                                  >
                                    <span>{formatMessageTime(m.created_at)}</span>
                                    {isMe && (
                                      <span>
                                        {m.read_at ? (
                                          <CheckCheck className="h-3 w-3 text-emerald-400" />
                                        ) : (
                                          <Check className="h-3 w-3" />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* 4. Bottom Sticky Message Composer */}
                <div className="p-3 sm:p-4 border-t border-border bg-card/95 backdrop-blur-md space-y-2.5">
                  {/* Quick Context Prompts */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      "Is this gear available for my rental dates?",
                      "What accessories and batteries are included?",
                      "Can we arrange pickup around 10:00 AM?",
                      "Gear returned in pristine condition.",
                    ].map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => sendQuickPrompt(prompt)}
                        className="px-2.5 py-1 rounded-full bg-secondary/50 hover:bg-secondary text-[10px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap border border-border/60 transition-colors cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Attachment Preview (if selected) */}
                  {selectedAttachment && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/50 border border-border">
                      {selectedAttachment.file.type.startsWith("image/") ? (
                        <img
                          src={selectedAttachment.previewUrl}
                          alt="Preview"
                          className="h-9 w-9 rounded-lg object-cover border border-border"
                        />
                      ) : (
                        <FileText className="h-5 w-5 text-foreground ml-1" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {selectedAttachment.file.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(selectedAttachment.file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeAttachment}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Input Form */}
                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                    />

                    {/* File Attachment Trigger Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
                      title="Attach photo or document (max 5MB)"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>

                    {/* Auto-Expanding Textarea */}
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          adjustTextareaHeight();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-secondary/40 border border-border focus:outline-none focus:ring-1 focus:ring-foreground text-foreground placeholder:text-muted-foreground resize-none leading-normal max-h-32"
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={(!input.trim() && !selectedAttachment) || sending}
                      className={cn(
                        "h-10 px-4 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs",
                        input.trim() || selectedAttachment
                          ? "bg-[#161616] text-[#FFFFFF] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] hover:opacity-90"
                          : "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed",
                      )}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <Send className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* No Active Thread Selected (Desktop Empty Placeholder) */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card">
                <div className="h-14 w-14 rounded-3xl bg-secondary flex items-center justify-center text-foreground mb-4">
                  <MessageSquare className="h-7 w-7 stroke-[1.8]" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Select a conversation
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Choose a thread from the list on the left to review messages, booking details, and real-time delivery status.
                </p>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* COLUMN 3: Context Panel (Desktop Right Column) */}
          {/* ========================================================================= */}
          {showDesktopContext && activeConversation && (
            <div className="hidden lg:flex lg:col-span-3 xl:col-span-3.5 flex-col bg-secondary/10 border-l border-border h-[720px] md:h-auto overflow-y-auto p-4 space-y-4">
              {/* Product Context Card */}
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-foreground" />
                    <span>Rented Gear</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    Item Specs
                  </span>
                </div>

                <div className="flex gap-3 items-center">
                  {activeConversation.productImage ? (
                    <img
                      src={activeConversation.productImage}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover border border-border shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl border border-border bg-secondary/30 flex items-center justify-center text-muted-foreground/50 shrink-0">
                      <Package className="h-6 w-6 opacity-60" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-snug truncate">
                      {activeConversation.productTitle || "Professional Gear"}
                    </p>
                    {activeConversation.productPrice && (
                      <p className="text-xs font-semibold text-foreground mt-0.5">
                        ₹{activeConversation.productPrice}
                        <span className="text-[10px] font-normal text-muted-foreground">/day</span>
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  to="/product/$id"
                  params={{ id: activeConversation.productId || "p1" }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary/70 hover:bg-secondary text-xs font-bold text-foreground transition-colors cursor-pointer"
                >
                  <span>View Product Listing</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Booking Context Card (if booking exists) */}
              {activeConversation.bookingId && (
                <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-foreground" />
                      <span>Rental Booking</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Confirmed
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Booking Ref:</span>
                      <span className="font-mono font-bold text-foreground">
                        #{activeConversation.bookingId}
                      </span>
                    </div>
                    {activeConversation.bookingTotal && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total Rental:</span>
                        <span className="font-bold text-foreground">
                          ₹{activeConversation.bookingTotal}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/orders"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-foreground transition-colors cursor-pointer"
                  >
                    <span>Manage in Orders</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

              {/* Live Delivery Card (if delivery exists) */}
              {deliveryBadge && (
                <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-foreground" />
                      <span>Delivery Tracking</span>
                    </span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", deliveryBadge.color)}>
                      {deliveryBadge.label}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Real-time GPS coordination enabled for this equipment dispatch.
                  </p>

                  <Link
                    to="/delivery/$id"
                    params={{ id: activeConversation.bookingId || "delivery" }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#161616] text-[#FFFFFF] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] text-xs font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Open Live Map & Route</span>
                  </Link>
                </div>
              )}

              {/* Verified PAYENT Protection Banner */}
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>PAYENT Protection Guarantee</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  All equipment rentals are protected by standard verification, security deposit holds, and direct support resolution.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MOBILE CONTEXT BOTTOM SHEET MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showMobileContext && activeConversation && (
          <div className="fixed inset-0 z-50 lg:hidden grid place-items-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileContext(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5 shadow-2xl z-10 space-y-4"
            >
              {/* Sheet Drag Handle */}
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-2" />

              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Package className="h-5 w-5 text-foreground" />
                  <span>Rental & Gear Details</span>
                </h3>
                <button
                  onClick={() => setShowMobileContext(false)}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Product Info */}
              <div className="flex gap-3 items-center p-3 rounded-2xl bg-secondary/30 border border-border">
                {activeConversation.productImage ? (
                  <img
                    src={activeConversation.productImage}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl border border-border bg-secondary/30 flex items-center justify-center text-muted-foreground/50 shrink-0">
                    <Package className="h-6 w-6 opacity-60" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">
                    {activeConversation.productTitle || "Rental Gear"}
                  </p>
                  {activeConversation.productPrice && (
                    <p className="text-xs font-semibold text-foreground mt-0.5">
                      ₹{activeConversation.productPrice}
                      <span className="text-[10px] text-muted-foreground font-normal">/day</span>
                    </p>
                  )}
                  <Link
                    to="/product/$id"
                    params={{ id: activeConversation.productId || "p1" }}
                    className="text-[11px] font-bold text-foreground hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    <span>View Product</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Booking Info */}
              {activeConversation.bookingId && (
                <div className="p-3 rounded-2xl bg-secondary/30 border border-border space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">Booking ID:</span>
                    <span className="font-mono font-bold text-foreground">
                      #{activeConversation.bookingId}
                    </span>
                  </div>
                  {activeConversation.bookingTotal && (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-muted-foreground">Rental Total:</span>
                      <span className="font-bold text-foreground">
                        ₹{activeConversation.bookingTotal}
                      </span>
                    </div>
                  )}
                  <Link
                    to="/orders"
                    className="w-full inline-flex items-center justify-center gap-1 py-2 rounded-xl border border-border bg-card text-xs font-bold text-foreground mt-1"
                  >
                    <span>Manage Booking</span>
                  </Link>
                </div>
              )}

              {/* Delivery Info */}
              {deliveryBadge && (
                <div className="p-3 rounded-2xl bg-secondary/30 border border-border space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground">Live Delivery:</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", deliveryBadge.color)}>
                      {deliveryBadge.label}
                    </span>
                  </div>
                  <Link
                    to="/delivery/$id"
                    params={{ id: activeConversation.bookingId || "delivery" }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#161616] text-[#FFFFFF] dark:bg-[#F2F0EA] dark:text-[#0A0A0A] text-xs font-bold shadow-xs"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Open Live GPS Map</span>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PHOTO LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {lightboxImageUrl && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxImageUrl(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl z-10"
            >
              <button
                onClick={() => setLightboxImageUrl(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-20 cursor-pointer"
                title="Close Lightbox"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={lightboxImageUrl}
                alt="Enlarged Attachment"
                className="max-h-[85vh] w-auto max-w-full object-contain rounded-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
