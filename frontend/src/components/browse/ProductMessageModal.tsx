import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  X,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Calendar,
  IndianRupee,
  MapPin,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { storage } from "@/utils/storage";
import type { Product } from "@/types";

export interface ProductMessage {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface ProductMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ProductMessageModal({
  isOpen,
  onClose,
  product,
}: ProductMessageModalProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.email || "anonymous_user";
  const currentUserName = user?.fullName || user?.email?.split("@")[0] || "You";

  const ownerId =
    product?.owner?.email ||
    (product as any)?.owner_id ||
    (product as any)?.ownerId ||
    (product as any)?.user_id ||
    "gear_owner";
  const ownerName = product?.owner?.name || "Equipment Owner";
  const ownerAvatar =
    product?.owner?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=10b981&color=ffffff`;

  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<ProductMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Storage key specific to this product and current user
  const storageKey = product
    ? `payent:messages_${product.id}_${currentUserId}`
    : "";

  // Load existing messages for this product & user
  useEffect(() => {
    if (!isOpen || !product || !storageKey) return;

    const saved = storage.get<ProductMessage[]>(storageKey, []);
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      // Provide an initial greeting from the owner if thread is fresh
      const initialGreeting: ProductMessage = {
        id: `msg_init_${product.id}`,
        productId: product.id,
        productName: product.title,
        productImage: product.image,
        senderId: ownerId,
        senderName: ownerName,
        receiverId: currentUserId,
        receiverName: currentUserName,
        message: `Hi there! Thanks for your interest in my ${product.title}. Feel free to ask any questions about availability, handover location, or included accessories.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        read: true,
      };
      setMessages([initialGreeting]);
      storage.set(storageKey, [initialGreeting]);
    }
  }, [isOpen, product, storageKey, ownerId, ownerName, currentUserId, currentUserName]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || messageText).trim();
    if (!text || !product) return;

    const newMsg: ProductMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: product.id,
      productName: product.title,
      productImage: product.image,
      senderId: currentUserId,
      senderName: currentUserName,
      receiverId: ownerId,
      receiverName: ownerName,
      message: text,
      timestamp: new Date().toISOString(),
      read: true,
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    storage.set(storageKey, updated);
    setMessageText("");

    // Also persist into global user inbox so it reflects in User Dashboard
    const globalInboxKey = `payent:user_messages_${currentUserId}`;
    const globalInbox = storage.get<ProductMessage[]>(globalInboxKey, []);
    storage.set(globalInboxKey, [newMsg, ...globalInbox.filter((m) => m.id !== newMsg.id)]);

    toast.success(`Message sent to ${ownerName}!`);

    // Simulated owner reply after a short delay if it's the user's first inquiry
    if (updated.filter((m) => m.senderId === currentUserId).length === 1) {
      setTimeout(() => {
        const autoReply: ProductMessage = {
          id: `msg_reply_${Date.now()}`,
          productId: product.id,
          productName: product.title,
          productImage: product.image,
          senderId: ownerId,
          senderName: ownerName,
          receiverId: currentUserId,
          receiverName: currentUserName,
          message: `Got your note! The ${product.title} is fully prepped and tested. Feel free to book it directly or let me know if you need specific pickup timings.`,
          timestamp: new Date().toISOString(),
          read: true,
        };
        const withReply = [...storage.get<ProductMessage[]>(storageKey, []), autoReply];
        setMessages(withReply);
        storage.set(storageKey, withReply);
      }, 1400);
    }
  };

  const quickPrompts = [
    "Is this gear available this weekend?",
    "Can we arrange in-person pickup today?",
    "Does this package include extra batteries?",
    "Is the security deposit 100% refundable?",
  ];

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 text-left"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={ownerAvatar}
                  alt={ownerName}
                  className="h-10 w-10 rounded-full object-cover border border-border"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-foreground">{ownerName}</h3>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded">
                    ★ {product.owner?.rating?.toFixed(1) || "5.0"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  <span>Verified Equipment Host</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Product Context Banner */}
          <div className="p-3 sm:p-3.5 bg-secondary/50 border-b border-border/60 flex items-center gap-3">
            <img
              src={product.image}
              alt={product.title}
              className="h-12 w-12 rounded-xl object-cover border border-border bg-card shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Inquiry for {product.category}
              </span>
              <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                {product.title}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                <span className="font-mono font-bold text-foreground">
                  ₹{product.price.toLocaleString("en-IN")}/day
                </span>
                <span>•</span>
                <span>{product.location || "Local Studio Handover"}</span>
              </div>
            </div>
          </div>

          {/* Message Thread Area */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 min-h-[220px] max-h-[360px] bg-card/50">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? "bg-foreground text-background font-medium rounded-br-xs shadow-xs"
                        : "bg-secondary text-foreground font-medium rounded-bl-xs border border-border/70"
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 mt-1 px-1 font-mono">
                    {timeStr}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Strip */}
          <div className="px-4 py-2 border-t border-border/50 bg-secondary/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border whitespace-nowrap cursor-pointer transition-all shrink-0 active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input & Send Controls */}
          <div className="p-3 sm:p-4 border-t border-border/70 bg-card flex items-center gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Message ${ownerName}...`}
              className="flex-1 bg-secondary/50 px-3.5 py-2.5 rounded-2xl text-xs text-foreground placeholder:text-muted-foreground/60 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              disabled={!messageText.trim()}
              onClick={() => handleSendMessage()}
              className="p-2.5 rounded-2xl bg-foreground text-background font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs"
              title="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ProductMessageModal;
