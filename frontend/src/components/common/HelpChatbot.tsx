import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  RefreshCw,
  LogIn,
  CheckCircle2,
  Headphones,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { Button } from "@/components/common/Button";
import { PayentAgentIcon } from "@/components/common/PayentAgentIcon";
import { DeliveryBoyWalking } from "@/components/common/DeliveryBoyWalking";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: Date;
  intent?: string;
  toolCalled?: string;
  toolResult?: any;
  suggestions?: string[];
  requiresAuth?: boolean;
  requiresConfirmation?: boolean;
  isError?: boolean;
  lastUserQuery?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Check Booking Status",
  "Delivery Tracking",
  "Refund & Payment",
  "Talk to Human Support",
];

export function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [conversationId, setConversationId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or restore session ID and welcome greeting
  useEffect(() => {
    let sid = sessionStorage.getItem("payent_agent_session_id");
    if (!sid) {
      sid = `sess_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      sessionStorage.setItem("payent_agent_session_id", sid);
    }
    setSessionId(sid);

    const savedConvId = sessionStorage.getItem("payent_agent_conv_id");
    if (savedConvId) {
      setConversationId(savedConvId);
    }

    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    const user = storage.get<any>(STORAGE_KEYS.currentUser, null);
    const email = user?.email || null;
    setCurrentUserEmail(email);

    const greetingText = token && email
      ? `Namaste, ${user?.name || email.split("@")[0]}! I am Payent Agent. How can I assist you with your equipment rentals, orders, delivery, or support today?`
      : "Namaste! I am Payent Agent, your digital assistant for peer-to-peer equipment rentals, bookings, payments, and support. How can I help you today?";

    setMessages([
      {
        id: "msg_welcome",
        sender: "bot",
        text: greetingText,
        timestamp: new Date(),
        suggestions: DEFAULT_SUGGESTIONS,
      },
    ]);
  }, []);

  // Handle external open event (e.g. from support links)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-payent-help-chat", handleOpen);
    return () => window.removeEventListener("open-payent-help-chat", handleOpen);
  }, []);

  // Account switching / logout safety: clear conversation when authentication state changes
  useEffect(() => {
    const checkAuthChange = () => {
      const user = storage.get<any>(STORAGE_KEYS.currentUser, null);
      const email = user?.email || null;
      if (email !== currentUserEmail) {
        setCurrentUserEmail(email);
        sessionStorage.removeItem("payent_agent_conv_id");
        setConversationId("");
        const greeting = email
          ? `Welcome back, ${user?.name || email.split("@")[0]}! How can I assist you today?`
          : "Namaste! I am Payent Agent. How can I help you with your gear rentals today?";
        setMessages([
          {
            id: `msg_switched_${Date.now()}`,
            sender: "bot",
            text: greeting,
            timestamp: new Date(),
            suggestions: DEFAULT_SUGGESTIONS,
          },
        ]);
        setActiveSuggestions(DEFAULT_SUGGESTIONS);
      }
    };

    window.addEventListener("storage", checkAuthChange);
    const interval = setInterval(checkAuthChange, 2000);
    return () => {
      window.removeEventListener("storage", checkAuthChange);
      clearInterval(interval);
    };
  }, [currentUserEmail]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  const handleSend = useCallback(
    async (textToSend: string) => {
      const cleanText = textToSend.trim();
      if (!cleanText || isTyping) return;

      const userMsgId = `user_${Date.now()}`;
      const newUserMsg: ChatMessage = {
        id: userMsgId,
        sender: "user",
        text: cleanText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newUserMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const response = await api.agentChat({
          message: cleanText,
          session_id: sessionId,
          conversation_id: conversationId || undefined,
        });

        if (response.conversation_id) {
          setConversationId(response.conversation_id);
          sessionStorage.setItem("payent_agent_conv_id", response.conversation_id);
        }

        const botMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: response.response,
          timestamp: new Date(),
          intent: response.intent,
          toolCalled: response.tool_called,
          toolResult: response.tool_result,
          suggestions: response.suggestions || [],
          requiresAuth: response.requires_auth,
          requiresConfirmation: response.requires_confirmation,
        };

        setMessages((prev) => [...prev, botMsg]);

        if (response.suggestions && response.suggestions.length > 0) {
          setActiveSuggestions(response.suggestions);
        }
      } catch (err: any) {
        const errMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          sender: "bot",
          text: "I am having trouble connecting to the Payent Agent service right now. Please check your connection or try again in a few moments.",
          timestamp: new Date(),
          isError: true,
          lastUserQuery: cleanText,
          suggestions: ["Try Again", "Help Center", "Talk to Human Support"],
        };
        setMessages((prev) => [...prev, errMsg]);
        setActiveSuggestions(["Try Again", "Help Center", "Talk to Human Support"]);
      } finally {
        setIsTyping(false);
      }
    },
    [conversationId, isTyping, sessionId]
  );

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div className="space-y-1.5 text-sm leading-relaxed">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} className="h-1" />;

          // Check if line is a header (### or ##)
          if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
            const headingText = trimmed.replace(/^#+\s*/, "");
            return (
              <h5
                key={lIdx}
                className="font-semibold text-[#17191C] text-xs uppercase tracking-wider pt-1.5 pb-0.5 border-b border-[#E1E4E8]/60"
              >
                {headingText}
              </h5>
            );
          }

          // Check if line is a bullet item (• or - or *)
          const isBullet = trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
          const content = isBullet ? trimmed.replace(/^[•\-\*]\s*/, "") : line;

          const parts = content.split(/(\*\*[^*]+\*\*)/g);
          return (
            <div key={lIdx} className={`flex items-start gap-1.5 ${isBullet ? "pl-1.5" : ""}`}>
              {isBullet && (
                <span className="text-[#16A36A] font-bold text-xs select-none mt-0.5 shrink-0">•</span>
              )}
              <p className="flex-1">
                {parts.map((part, pIdx) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong key={pIdx} className="font-semibold text-[#17191C]">
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={pIdx}>{part}</span>;
                })}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating launcher button (Responsive: visible on mobile & desktop) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-40 h-13 w-13 sm:h-14 sm:w-14 rounded-full bg-[#17191C] text-white shadow-2xl flex items-center justify-center border border-[#17191C]/80 hover:bg-[#252930] transition-colors focus:outline-none focus:ring-2 focus:ring-[#16A36A] focus:ring-offset-2"
        aria-label="Payent Support Assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="h-5 w-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="relative flex items-center justify-center"
            >
              <PayentAgentIcon size={28} />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-[#16A36A] border-2 border-[#17191C] rounded-full animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 z-50 w-[400px] max-w-[calc(100vw-1.5rem)] h-[570px] max-h-[calc(100vh-6.5rem)] rounded-2xl bg-[#FFFFFF] border border-[#E1E4E8] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header: Premium Dark Charcoal (#17191C) with Custom Agent Symbol & Payent Agent text */}
            <div className="px-4 py-3.5 bg-[#17191C] text-white flex items-center justify-between border-b border-[#252930] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <PayentAgentIcon size={28} />
                <span className="font-semibold text-sm text-white tracking-tight truncate">
                  Payent Agent
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-1.5 rounded-lg transition-colors text-white/80 hover:text-white focus:outline-none focus:ring-1 focus:ring-[#16A36A]"
                aria-label="Close Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FFFFFF] scrollbar-thin">
              {messages.map((m) => {
                const isUser = m.sender === "user";
                const toolRes = m.toolResult;
                const hasCreatedTicket =
                  toolRes &&
                  typeof toolRes === "object" &&
                  toolRes.ticket_id &&
                  (m.toolCalled === "create_support_ticket" || toolRes.ticket_id.startsWith("TICK-"));

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`flex items-start gap-2 max-w-[88%] ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isUser && (
                        <div className="shrink-0 mt-0.5">
                          <PayentAgentIcon size={24} />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm shadow-2xs ${
                          isUser
                            ? "bg-[#17191C] text-white rounded-tr-xs font-normal"
                            : "bg-[#F5F6F8] border border-[#E1E4E8] text-[#252930] rounded-tl-xs"
                        }`}
                      >
                        {renderFormattedText(m.text)}

                        {/* Created Support Ticket Card */}
                        {hasCreatedTicket && (
                          <div className="mt-3 p-3 rounded-xl bg-[#16A36A]/10 border border-[#16A36A]/25 text-xs text-[#252930]">
                            <div className="flex items-center justify-between font-semibold text-[#16A36A] mb-1.5">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Support Ticket Confirmed
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[#16A36A]/20 text-[10px] font-bold uppercase tracking-wider text-[#16A36A]">
                                {toolRes.status || "OPEN"}
                              </span>
                            </div>
                            <div className="font-mono text-[11px] text-[#17191C] font-semibold">
                              Ticket #{toolRes.ticket_id}
                            </div>
                            <div className="text-[#707780] text-[11px] mt-0.5">
                              Category: {toolRes.category || "General Help"}
                            </div>
                            <div className="mt-2 pt-2 border-t border-[#16A36A]/20 flex gap-2">
                              <Link
                                to="/support"
                                className="text-xs text-[#16A36A] font-medium hover:underline flex items-center gap-1"
                                onClick={() => setIsOpen(false)}
                              >
                                <Headphones className="h-3 w-3" />
                                View in Support Messages
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* Sign In Required Callout */}
                        {m.requiresAuth && (
                          <div className="mt-2.5 pt-2 border-t border-[#E1E4E8] flex items-center gap-2">
                            <Link
                              to="/login"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#17191C] text-white text-xs font-semibold hover:bg-[#252930] transition-colors"
                              onClick={() => setIsOpen(false)}
                            >
                              <LogIn className="h-3.5 w-3.5" />
                              Sign In to Payent
                            </Link>
                          </div>
                        )}

                        {/* Retry on Error */}
                        {m.isError && m.lastUserQuery && (
                          <div className="mt-2 pt-2 border-t border-[#E1E4E8]">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSend(m.lastUserQuery!)}
                              className="h-7 text-xs flex items-center gap-1.5 border-[#E1E4E8] text-[#17191C] hover:bg-[#F5F6F8]"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Retry Query
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] text-[#707780] mt-1 px-1 ${
                        isUser ? "text-right mr-1" : "text-left ml-8"
                      }`}
                    >
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}

              {/* Delivery Boy Walking Animation (Active only while AI is generating response) */}
              {isTyping && (
                <div className="flex items-start gap-2 max-w-[92%]">
                  <div className="shrink-0 mt-0.5">
                    <PayentAgentIcon size={24} />
                  </div>
                  <div className="flex-1">
                    <DeliveryBoyWalking statusText="Verifying platform records & policy..." />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Dynamic Suggestion Chips */}
            {activeSuggestions.length > 0 && (
              <div className="px-3.5 py-2.5 border-t border-[#E1E4E8] bg-[#F5F6F8] flex flex-wrap gap-1.5 shrink-0">
                {activeSuggestions.map((suggestion, sIdx) => {
                  const isConfirm = suggestion.toLowerCase().includes("confirm");
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      disabled={isTyping}
                      onClick={() => handleSend(suggestion)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all text-left font-medium shadow-2xs ${
                        isConfirm
                          ? "bg-[#16A36A]/10 border-[#16A36A]/30 text-[#16A36A] hover:bg-[#16A36A]/20 font-semibold"
                          : "bg-[#FFFFFF] border-[#E1E4E8] hover:border-[#17191C]/40 text-[#252930] hover:text-[#17191C] hover:bg-[#F5F6F8]"
                      }`}
                    >
                      {suggestion}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-3 border-t border-[#E1E4E8] bg-[#FFFFFF] flex gap-2 items-center shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask in English or Telugu (T-English)..."
                disabled={isTyping}
                maxLength={2000}
                className="flex-1 h-10 px-3.5 rounded-xl border border-[#E1E4E8] bg-[#F5F6F8] text-sm text-[#252930] placeholder:text-[#707780] focus:outline-none focus:border-[#17191C] focus:bg-[#FFFFFF] transition-all"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping}
                className="shrink-0 h-10 w-10 rounded-xl bg-[#17191C] text-white hover:bg-[#252930] disabled:opacity-30 disabled:hover:bg-[#17191C] transition-all"
                aria-label="Send message"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default HelpChatbot;
