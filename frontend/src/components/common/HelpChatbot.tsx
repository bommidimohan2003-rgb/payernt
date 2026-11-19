import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { PayentAgentIcon } from "@/components/common/PayentAgentIcon";
import { TypingIndicator } from "@/components/common/TypingIndicator";
import {
  AgentMessage,
  AgentToolResult,
} from "@/components/common/AgentMessage";
import { UserMessage } from "@/components/common/UserMessage";
import { SuggestedPrompts } from "@/components/common/SuggestedPrompts";
import { ChatInput } from "@/components/common/ChatInput";

interface StoredUser {
  email?: string;
  name?: string;
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: Date;
  intent?: string;
  toolCalled?: string;
  toolResult?: AgentToolResult | null;
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

const DEFAULT_LENDER_SUGGESTIONS = [
  "Check Rental Requests",
  "Wallet & Payout Status",
  "Listing Video Inspection",
  "Talk to Lender Support",
];

export function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeSuggestions, setActiveSuggestions] =
    useState<string[]>(DEFAULT_SUGGESTIONS);
  const [conversationId, setConversationId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const isPayerntRoute =
    typeof window !== "undefined" &&
    (window.location.pathname.startsWith("/payernt") ||
      window.location.pathname.startsWith("/paye₹nt") ||
      window.location.pathname === "/become-lender" ||
      window.location.pathname === "/lender-portal");

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    let token = storage.get<string | null>(STORAGE_KEYS.token, null);
    let user = storage.get<StoredUser | null>(STORAGE_KEYS.currentUser, null);

    // Fallback to Payernt lender auth session if on Payernt side
    if (!token && typeof window !== "undefined") {
      token =
        localStorage.getItem("paye₹nt_token") ||
        localStorage.getItem("payernt_token") ||
        localStorage.getItem("payent_token");
      const storedAccount = localStorage.getItem("paye₹nt_account");
      if (storedAccount) {
        try {
          const acc = JSON.parse(storedAccount);
          user = {
            email: acc.email,
            name: acc.name || acc.fullName || acc.storeName || acc.email?.split("@")[0],
          };
        } catch {}
      }
    }

    const email = user?.email || null;
    setCurrentUserEmail(email);

    const currentSuggestions = isPayerntRoute
      ? DEFAULT_LENDER_SUGGESTIONS
      : DEFAULT_SUGGESTIONS;
    setActiveSuggestions(currentSuggestions);

    const greetingText = isPayerntRoute
      ? token && email
        ? `Namaste, ${user?.name || email.split("@")[0]}! I am Payent Agent for Lenders. How can I assist you with your equipment listings, rental approvals, wallet payouts, or gear verification today?`
        : "Namaste! I am Payent Agent, your digital assistant for peer-to-peer gear lenders. How can I help you manage your tech equipment today?"
      : token && email
        ? `Namaste, ${user?.name || email.split("@")[0]}! I am Payent Agent. How can I assist you with your equipment rentals, orders, delivery, or support today?`
        : "Namaste! I am Payent Agent, your digital assistant for peer-to-peer equipment rentals, bookings, payments, and support. How can I help you today?";

    setMessages([
      {
        id: "msg_welcome",
        sender: "bot",
        text: greetingText,
        timestamp: new Date(),
        suggestions: currentSuggestions,
      },
    ]);
  }, [isPayerntRoute]);

  // Handle external open event (e.g. from support links)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-payent-help-chat", handleOpen);
    return () =>
      window.removeEventListener("open-payent-help-chat", handleOpen);
  }, []);

  // Account switching / logout safety: clear conversation when authentication state changes
  useEffect(() => {
    const checkAuthChange = () => {
      let email: string | null = null;
      let userName: string | undefined = undefined;

      const user = storage.get<StoredUser | null>(
        STORAGE_KEYS.currentUser,
        null,
      );
      if (user?.email) {
        email = user.email;
        userName = user.name;
      } else if (isPayerntRoute && typeof window !== "undefined") {
        const storedAccount =
          localStorage.getItem("paye₹nt_account") ||
          localStorage.getItem("payernt_account");
        if (storedAccount) {
          try {
            const acc = JSON.parse(storedAccount);
            email = acc.email || null;
            userName = acc.name || acc.fullName || acc.storeName;
          } catch {}
        }
      }

      if (email !== currentUserEmail) {
        setCurrentUserEmail(email);
        sessionStorage.removeItem("payent_agent_conv_id");
        setConversationId("");
        const greeting = isPayerntRoute
          ? email
            ? `Welcome back, ${userName || email.split("@")[0]}! I am Payent Agent for Lenders. How can I assist you with your equipment listings, rental approvals, wallet payouts, or gear verification today?`
            : "Namaste! I am Payent Agent, your digital assistant for peer-to-peer gear lenders. How can I help you manage your tech equipment today?"
          : email
            ? `Welcome back, ${userName || email.split("@")[0]}! How can I assist you today?`
            : "Namaste! I am Payent Agent. How can I help you with your gear rentals today?";
        const suggestions = isPayerntRoute
          ? DEFAULT_LENDER_SUGGESTIONS
          : DEFAULT_SUGGESTIONS;
        setMessages([
          {
            id: `msg_switched_${Date.now()}`,
            sender: "bot",
            text: greeting,
            timestamp: new Date(),
            suggestions,
          },
        ]);
        setActiveSuggestions(suggestions);
      }
    };

    window.addEventListener("storage", checkAuthChange);
    window.addEventListener("paye₹nt_auth_change", checkAuthChange);
    return () => {
      window.removeEventListener("storage", checkAuthChange);
      window.removeEventListener("paye₹nt_auth_change", checkAuthChange);
    };
  }, [currentUserEmail, isPayerntRoute]);

  // Auto-scroll to bottom on new messages or typing state change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = useCallback(
    async (textToSend: string, action?: string) => {
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
          action,
        });

        if (response.conversation_id) {
          setConversationId(response.conversation_id);
          sessionStorage.setItem(
            "payent_agent_conv_id",
            response.conversation_id,
          );
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
      } catch {
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
        setActiveSuggestions([
          "Try Again",
          "Help Center",
          "Talk to Human Support",
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [conversationId, isTyping, sessionId],
  );

  return (
    <>
      {/* Floating Launcher Button */}
      <motion.button
        id="payent-chatbot-launcher"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-3 sm:right-6 z-40 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-[#17191C] text-white shadow-[0_12px_32px_-4px_rgba(23,25,28,0.38)] flex items-center justify-center border border-white/10 hover:bg-[#252930] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white focus-visible:ring-offset-2 cursor-pointer"
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
              <span
                className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-white border-[1.5px] border-[#17191C]"
                aria-hidden="true"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Floating Chat Window (Desktop Floating, Mobile Viewport-Fitted) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-50 w-full sm:w-[410px] max-w-full sm:max-w-[calc(100vw-2rem)] h-full sm:h-[600px] max-h-full sm:max-h-[calc(100vh-7rem)] rounded-none sm:rounded-2xl bg-white border-0 sm:border sm:border-[#E1E4E8] shadow-none sm:shadow-[0_20px_50px_rgba(23,25,28,0.22),0_1px_3px_rgba(23,25,28,0.06)] flex flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* Header: Pure Minimal Editorial Header */}
            <div className="px-4 py-3 bg-[#17191C] text-white flex items-center justify-between border-b border-[#252930] shrink-0 h-[52px]">
              <div className="flex items-center gap-2.5 min-w-0">
                <PayentAgentIcon size={24} />
                <span className="font-semibold text-sm text-white tracking-tight truncate">
                  Payent Agent
                </span>
                {isPayerntRoute && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                    Lender Desk
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-1.5 rounded-lg transition-colors text-white/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                aria-label="Close Payent Agent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white scrollbar-thin">
              {messages.map((m) => {
                if (m.sender === "user") {
                  return (
                    <UserMessage
                      key={m.id}
                      id={m.id}
                      text={m.text}
                      timestamp={m.timestamp}
                    />
                  );
                }

                return (
                  <AgentMessage
                    key={m.id}
                    id={m.id}
                    text={m.text}
                    timestamp={m.timestamp}
                    toolCalled={m.toolCalled}
                    toolResult={m.toolResult}
                    requiresAuth={m.requiresAuth}
                    requiresConfirmation={m.requiresConfirmation}
                    isError={m.isError}
                    isSubmitting={isTyping}
                    lastUserQuery={m.lastUserQuery}
                    onRetry={(query) => handleSend(query)}
                    onCloseChat={() => setIsOpen(false)}
                    onConfirmEscalation={() => handleSend("Yes, connect me", "confirm_escalation")}
                    onCancelEscalation={() => handleSend("No, I'll rephrase", "cancel_escalation")}
                    onSelectAction={(action, act) => handleSend(action, act)}
                  />
                );
              })}

              {/* Assistant Message Bubble with Animated Typing Dots */}
              <AnimatePresence>
                {isTyping && <TypingIndicator key="typing_indicator" />}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompt Buttons */}
            <SuggestedPrompts
              suggestions={activeSuggestions}
              onSelect={(prompt) => handleSend(prompt)}
              disabled={isTyping}
            />

            {/* Chat Input Area (Architectural Message Composer) */}
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={(text) => handleSend(text)}
              disabled={isTyping}
              autoFocus={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default HelpChatbot;
