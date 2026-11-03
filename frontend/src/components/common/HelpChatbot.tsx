import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { PayentAgentIcon } from "@/components/common/PayentAgentIcon";
import { DeliveryBoyLoader } from "@/components/common/DeliveryBoyLoader";
import { AgentMessage } from "@/components/common/AgentMessage";
import { UserMessage } from "@/components/common/UserMessage";
import { SuggestedPrompts } from "@/components/common/SuggestedPrompts";
import { ChatInput } from "@/components/common/ChatInput";

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

    const greetingText =
      token && email
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

  // Auto-scroll to bottom on new messages or typing state change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

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

  return (
    <>
      {/* Floating Launcher Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-40 h-13 w-13 sm:h-14 sm:w-14 rounded-full bg-[#17191C] text-white shadow-2xl flex items-center justify-center border border-[#17191C]/80 hover:bg-[#252930] transition-colors focus:outline-none focus:ring-2 focus:ring-[#16A36A] focus:ring-offset-2 cursor-pointer"
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

      {/* Floating Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 z-50 w-[410px] max-w-[calc(100vw-1.5rem)] h-[580px] max-h-[calc(100vh-6.5rem)] rounded-2xl bg-[#FFFFFF] border border-[#E1E4E8] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header: Premium Black (#17191C) with Custom Agent Symbol & Payent Agent text */}
            <div className="px-4 py-3 bg-[#17191C] text-white flex items-center justify-between border-b border-[#252930] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <PayentAgentIcon size={28} />
                <span className="font-semibold text-sm text-white tracking-tight truncate">
                  Payent Agent
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-1.5 rounded-lg transition-colors text-white/80 hover:text-white focus:outline-none focus:ring-1 focus:ring-[#16A36A] cursor-pointer"
                aria-label="Close Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FFFFFF] scrollbar-thin">
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
                    lastUserQuery={m.lastUserQuery}
                    onRetry={(query) => handleSend(query)}
                    onCloseChat={() => setIsOpen(false)}
                  />
                );
              })}

              {/* Delivery Boy Walking Animation (Displayed ALONE on LEFT side while AI processes request) */}
              {isTyping && (
                <div className="flex items-start justify-start pl-1 py-1">
                  <DeliveryBoyLoader size={74} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompt Buttons */}
            <SuggestedPrompts
              suggestions={activeSuggestions}
              onSelect={(prompt) => handleSend(prompt)}
              disabled={isTyping}
            />

            {/* Chat Input Area */}
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
