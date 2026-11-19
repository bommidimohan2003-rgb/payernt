import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Sparkles,
  ArrowLeft,
  Package,
  Wallet,
  Video,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/agent")({
  head: () =>
    getSeoMetadata({
      title: "Payent Agent — Lender AI Assistant | Payernt",
      description:
        "Instant automated assistant for equipment listings, rental approvals, wallet payouts, and 10s video inspection.",
      path: "/payernt/agent",
    }),
  component: PayerntAgentRoute,
});

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

const LENDER_PROMPTS = [
  "Check Rental Requests",
  "Wallet & Payout Status",
  "10s Video Inspection Policy",
  "How does damage protection work?",
  "Talk to Lender Support",
];

function PayerntAgentRoute() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(LENDER_PROMPTS);
  const [sessionId, setSessionId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [lenderName, setLenderName] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session & welcome greeting
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

    let name = "Lender";
    try {
      const storedAccount = localStorage.getItem("paye₹nt_account");
      if (storedAccount) {
        const acc = JSON.parse(storedAccount);
        name = acc.name || acc.fullName || acc.storeName || acc.email?.split("@")[0] || "Lender";
      } else {
        const curUser = storage.get<{ name?: string; email?: string } | null>(STORAGE_KEYS.currentUser, null);
        if (curUser?.name) name = curUser.name;
        else if (curUser?.email) name = curUser.email.split("@")[0];
      }
    } catch {}
    setLenderName(name);

    setMessages([
      {
        id: "welcome_lender_agent",
        sender: "bot",
        text: `Namaste, ${name}! I am your dedicated Payent Agent for Lenders. How can I assist you with incoming rental requests, 10-second inspection video standards, wallet payouts, or device pricing today?`,
        timestamp: new Date(),
        suggestions: LENDER_PROMPTS,
      },
    ]);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

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
          action: action,
        });

        if (response.conversation_id && response.conversation_id !== conversationId) {
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
          suggestions: response.suggestions?.length ? response.suggestions : LENDER_PROMPTS,
          requiresAuth: response.requires_auth,
          requiresConfirmation: response.requires_confirmation,
        };

        setMessages((prev) => [...prev, botMsg]);
        if (response.suggestions?.length) {
          setActiveSuggestions(response.suggestions);
        }
      } catch (err: any) {
        const errMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          sender: "bot",
          text:
            err?.message ||
            "I encountered a temporary connection issue. Please try asking again.",
          timestamp: new Date(),
          isError: true,
          lastUserQuery: cleanText,
          suggestions: ["Try Again", "Talk to Lender Support"],
        };
        setMessages((prev) => [...prev, errMsg]);
        setActiveSuggestions(["Try Again", "Talk to Lender Support"]);
      } finally {
        setIsTyping(false);
      }
    },
    [conversationId, isTyping, sessionId]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/payernt" })}
            className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
            aria-label="Back to Payernt Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-foreground">Payent Agent</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Lender Assistant
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              24/7 AI guidance for rental approvals, 10s video inspection, wallet payouts & gear protection
            </p>
          </div>
        </div>

        {/* Floating Chat Trigger */}
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("open-payent-help-chat"));
            }
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Pop-out Chat Widget</span>
        </button>
      </div>

      {/* Feature Capabilities Quick Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => handleSend("What are my active rental requests?")}
          className="p-3 rounded-2xl border border-border bg-card hover:bg-secondary/40 text-left transition space-y-1 cursor-pointer group"
        >
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
            <Package className="w-3.5 h-3.5" />
            <span>Rental Requests</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1">View pending borrower bookings</p>
        </button>

        <button
          onClick={() => handleSend("How are wallet payouts processed?")}
          className="p-3 rounded-2xl border border-border bg-card hover:bg-secondary/40 text-left transition space-y-1 cursor-pointer group"
        >
          <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
            <Wallet className="w-3.5 h-3.5" />
            <span>Wallet & Payouts</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1">Check escrow balance & withdrawal</p>
        </button>

        <button
          onClick={() => handleSend("Explain the 10s condition video inspection policy")}
          className="p-3 rounded-2xl border border-border bg-card hover:bg-secondary/40 text-left transition space-y-1 cursor-pointer group"
        >
          <div className="flex items-center gap-1.5 text-blue-500 text-xs font-bold">
            <Video className="w-3.5 h-3.5" />
            <span>Video Inspection</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1">Standards for listing videos</p>
        </button>

        <button
          onClick={() => handleSend("How does lender insurance and damage protection work?")}
          className="p-3 rounded-2xl border border-border bg-card hover:bg-secondary/40 text-left transition space-y-1 cursor-pointer group"
        >
          <div className="flex items-center gap-1.5 text-purple-500 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Gear Protection</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1">₹5 Lakhs damage coverage</p>
        </button>
      </div>

      {/* Main Conversation Container */}
      <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col overflow-hidden min-h-[500px]">
        {/* Terminal / Chat Header */}
        <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <PayentAgentIcon size={18} />
            <span>Payent AI Assistant Console</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            Session: {sessionId.slice(0, 14)}...
          </span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[520px]">
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
                onCloseChat={() => {}}
                onConfirmEscalation={() => handleSend("Yes, connect me", "confirm_escalation")}
                onCancelEscalation={() => handleSend("No, I'll rephrase", "cancel_escalation")}
                onSelectAction={(action, act) => handleSend(action, act)}
              />
            );
          })}

          <AnimatePresence>
            {isTyping && <TypingIndicator key="typing_indicator" />}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Tray */}
        <div className="p-3 border-t border-border bg-secondary/15">
          <SuggestedPrompts
            suggestions={activeSuggestions}
            onSelect={(prompt) => handleSend(prompt)}
            disabled={isTyping}
          />
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-border bg-card">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={(text) => handleSend(text)}
            disabled={isTyping}
            autoFocus={false}
          />
        </div>
      </div>
    </div>
  );
}

export default Route;
