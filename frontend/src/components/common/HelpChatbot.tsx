import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  AlertCircle,
  RefreshCw,
  LogIn,
  CheckCircle2,
  Headphones,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { Button } from "@/components/common/Button";

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
      <div className="space-y-1">
        {lines.map((line, lIdx) => {
          if (!line.trim()) return <div key={lIdx} className="h-1.5" />;

          // Parse basic bold markdown: **bold**
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={lIdx} className="leading-relaxed">
              {parts.map((part, pIdx) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong key={pIdx} className="font-semibold text-foreground">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={pIdx}>{part}</span>;
              })}
            </p>
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
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-foreground text-background shadow-2xl flex items-center justify-center border border-border/80 hover:bg-foreground/90 transition-colors"
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
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="relative"
            >
              <MessageSquare className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[390px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-7.5rem)] rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-3.5 bg-foreground text-background flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-background/10 grid place-items-center border border-background/20">
                  <Bot className="h-5 w-5 text-background" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                    Payent Agent
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-background/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Deterministic Assistant • Telugu & English</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-background/10 p-1.5 rounded-lg transition-colors text-background"
                aria-label="Close Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-background/60 scrollbar-thin">
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
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        isUser
                          ? "bg-foreground text-background rounded-tr-none font-medium"
                          : "bg-secondary/70 border border-border text-foreground rounded-tl-none"
                      }`}
                    >
                      {renderFormattedText(m.text)}

                      {/* Created Support Ticket Card */}
                      {hasCreatedTicket && (
                        <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground">
                          <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Support Ticket Confirmed
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                              {toolRes.status || "OPEN"}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-foreground font-semibold">
                            Ticket #{toolRes.ticket_id}
                          </div>
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            Category: {toolRes.category || "General Help"}
                          </div>
                          <div className="mt-2 pt-2 border-t border-emerald-500/20 flex gap-2">
                            <Link
                              to="/support"
                              className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1"
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
                        <div className="mt-2.5 pt-2 border-t border-border flex items-center gap-2">
                          <Link
                            to="/login"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors"
                            onClick={() => setIsOpen(false)}
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            Sign In to Payent
                          </Link>
                        </div>
                      )}

                      {/* Retry on Error */}
                      {m.isError && m.lastUserQuery && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSend(m.lastUserQuery!)}
                            className="h-7 text-xs flex items-center gap-1.5"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry Query
                          </Button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 mt-1 px-1">
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary/70 border border-border text-foreground rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full bg-foreground/60 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-foreground/60 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-foreground/60 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Dynamic Suggestion Chips */}
            {activeSuggestions.length > 0 && (
              <div className="px-3.5 py-2 border-t border-border/60 bg-secondary/30 flex flex-wrap gap-1.5">
                {activeSuggestions.map((suggestion, sIdx) => {
                  const isConfirm = suggestion.toLowerCase().includes("confirm");
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      disabled={isTyping}
                      onClick={() => handleSend(suggestion)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all text-left font-medium ${
                        isConfirm
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-semibold"
                          : "bg-card border-border hover:border-foreground/40 text-foreground/80 hover:text-foreground"
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
              className="p-3 border-t border-border bg-card flex gap-2 items-center"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask in English or Telugu (T-English)..."
                disabled={isTyping}
                maxLength={2000}
                className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping}
                className="shrink-0 h-10 w-10 rounded-xl bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
