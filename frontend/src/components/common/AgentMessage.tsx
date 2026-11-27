import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Headphones,
  LogIn,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { PayentAgentIcon } from "./PayentAgentIcon";
import { Button } from "./Button";

export interface AgentToolResult {
  ticket_id?: string;
  category?: string;
  status?: string;
  state?: string;
  unanswered_query?: string;
  actions?: Array<{ label: string; value: string; variant?: string }>;
  [key: string]: unknown;
}

export interface AgentMessageProps {
  id: string;
  text: string;
  timestamp: Date;
  toolCalled?: string;
  toolResult?: AgentToolResult | null;
  requiresAuth?: boolean;
  requiresConfirmation?: boolean;
  isError?: boolean;
  isSubmitting?: boolean;
  lastUserQuery?: string;
  onRetry?: (query: string) => void;
  onCloseChat?: () => void;
  onConfirmEscalation?: () => void;
  onCancelEscalation?: () => void;
  onSelectAction?: (prompt: string, action?: string) => void;
}

export function AgentMessage({
  text,
  timestamp,
  toolCalled,
  toolResult,
  requiresAuth,
  isError,
  isSubmitting = false,
  lastUserQuery,
  onRetry,
  onCloseChat,
  onConfirmEscalation,
  onCancelEscalation,
  onSelectAction,
}: AgentMessageProps) {
  const [copiedTicket, setCopiedTicket] = useState(false);
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasCreatedTicket = Boolean(
    toolResult &&
    toolResult.ticket_id &&
    (toolCalled === "create_support_ticket" ||
      String(toolResult.ticket_id).startsWith("TICK-")),
  );

  const isAwaitingSupport = Boolean(
    toolCalled === "propose_support_fallback" ||
    (toolResult && toolResult.state === "AWAITING_SUPPORT_CONFIRMATION"),
  );

  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const lines = content.split("\n");

    return (
      <div className="space-y-2 text-[13.5px] leading-[1.65] text-[#252930]">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} className="h-1" />;

          // Heading line (### or ## or #)
          if (
            trimmed.startsWith("### ") ||
            trimmed.startsWith("## ") ||
            trimmed.startsWith("# ")
          ) {
            const headingText = trimmed.replace(/^#+\s*/, "");
            return (
              <h5
                key={lIdx}
                className="font-semibold text-[#17191C] text-xs uppercase tracking-wider pt-2.5 pb-1 border-b border-[#E1E4E8]"
              >
                {headingText}
              </h5>
            );
          }

          // Bullet item (•, -, *)
          const isBullet =
            trimmed.startsWith("• ") ||
            trimmed.startsWith("- ") ||
            trimmed.startsWith("* ");

          // Numbered item (e.g. "1. ", "2) ", "Step 1:")
          const numberedMatch = trimmed.match(
            /^(\d+[.)]|Step\s*\d+[:.)])\s+(.*)$/i,
          );

          let displayLine = line;
          let prefixElement: React.ReactNode = null;

          if (isBullet) {
            displayLine = trimmed.replace(/^[-•*]\s*/, "");
            prefixElement = (
              <span className="flex h-4 items-center justify-center shrink-0 mt-1 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16A36A]" />
              </span>
            );
          } else if (numberedMatch) {
            const [, numPrefix, rest] = numberedMatch;
            displayLine = rest;
            const numOnly = numPrefix.replace(/[^\d]/g, "");
            prefixElement = (
              <span className="inline-flex items-center justify-center h-4.5 min-w-[18px] px-1 rounded bg-[#17191C] text-white text-[10px] font-bold font-mono shrink-0 mt-0.5 select-none shadow-2xs">
                {numOnly || numPrefix}
              </span>
            );
          }

          // Parse markdown formatting: **bold** and `code`
          const parts = displayLine.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

          return (
            <div
              key={lIdx}
              className={`flex items-start gap-2 ${
                isBullet || numberedMatch ? "pl-0.5" : ""
              }`}
            >
              {prefixElement}
              <div className="flex-1 break-words">
                {parts.map((part, pIdx) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong
                        key={pIdx}
                        className="font-semibold text-[#17191C]"
                      >
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  if (part.startsWith("`") && part.endsWith("`")) {
                    return (
                      <code
                        key={pIdx}
                        className="font-mono text-xs px-1.5 py-0.5 rounded bg-white border border-[#E1E4E8] text-[#17191C] font-medium"
                      >
                        {part.slice(1, -1)}
                      </code>
                    );
                  }
                  return <span key={pIdx}>{part}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex flex-col items-start w-full"
    >
      <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
        {/* Assistant Avatar */}
        <div className="shrink-0 mt-0.5 text-neutral-800 dark:text-neutral-200">
          <PayentAgentIcon size={26} />
        </div>

        {/* Message Surface */}
        <div className="rounded-2xl rounded-tl-xs px-4 py-3 bg-[#F5F6F8] border border-[#E1E4E8] text-[#252930] shadow-[0_1px_2px_rgba(23,25,28,0.02)] transition-all">
          {renderFormattedContent(text)}

          {/* Unknown Question Fallback: Interactive Human Support Confirmation Actions */}
          {isAwaitingSupport && (
            <div className="mt-3 pt-2.5 border-t border-[#E1E4E8] flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (onConfirmEscalation) {
                    onConfirmEscalation();
                  } else if (onSelectAction) {
                    onSelectAction("Yes, connect me", "confirm_escalation");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A36A]/10 border border-[#16A36A]/35 text-[#16A36A] hover:bg-[#16A36A]/20 active:scale-[0.97] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Connect with human support"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16A36A]" />
                Yes, connect me
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (onCancelEscalation) {
                    onCancelEscalation();
                  } else if (onSelectAction) {
                    onSelectAction("No, I'll rephrase", "cancel_escalation");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E1E4E8] text-[#252930] hover:text-[#17191C] hover:border-[#17191C]/40 hover:bg-[#F5F6F8] active:scale-[0.97] text-xs font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decline human support and rephrase question"
              >
                No, I'll rephrase
              </button>
            </div>
          )}

          {/* Support Ticket Confirmed Card (Editorial Docket Style) */}
          {hasCreatedTicket && (
            <div
              data-testid="support-ticket-docket"
              className="mt-3.5 rounded-xl bg-white border border-[#E1E4E8] p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E1E4E8]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#16A36A] shrink-0" aria-hidden="true" />
                  <span className="text-xs font-bold text-[#17191C] tracking-tight">
                    Support Ticket Docket
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#16A36A]/10 text-[#16A36A] border border-[#16A36A]/20">
                  {toolResult.status || "OPEN"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#707780] font-medium">Ticket Reference:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#17191C] bg-[#F5F6F8] px-2 py-0.5 rounded border border-[#E1E4E8]">
                      #{toolResult.ticket_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (toolResult.ticket_id) {
                          navigator.clipboard.writeText(String(toolResult.ticket_id));
                          setCopiedTicket(true);
                          toast.success("Ticket reference copied to clipboard");
                          setTimeout(() => setCopiedTicket(false), 2000);
                        }
                      }}
                      className="p-1 rounded text-[#707780] hover:text-[#17191C] hover:bg-[#F5F6F8] transition-colors cursor-pointer"
                      title="Copy Ticket Reference"
                      aria-label="Copy Ticket Reference"
                    >
                      {copiedTicket ? (
                        <Check className="h-3 w-3 text-[#16A36A]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#707780] font-medium">Category:</span>
                  <span className="text-[#252930] font-semibold">
                    {toolResult.category || "General Help"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#707780] font-medium">Status:</span>
                  <span className="text-[#16A36A] font-semibold">
                    {toolResult.status || "OPEN"}
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#E1E4E8] flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#707780] flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16A36A] shrink-0" aria-hidden="true" />
                  <span>Logged in TiDB</span>
                </span>
                <Link
                  to="/support"
                  search={{ id: toolResult.ticket_id }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#16A36A]/10 hover:bg-[#16A36A]/20 text-xs font-semibold text-[#16A36A] transition-colors cursor-pointer"
                  onClick={onCloseChat}
                >
                  <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>View in Support</span>
                  <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}

          {/* Authentication Required Action Card */}
          {requiresAuth && (
            <div className="mt-3 pt-2.5 border-t border-[#E1E4E8] flex items-center justify-between gap-3">
              <span className="text-xs text-[#707780]">
                Account login required for private records
              </span>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#17191C] text-white text-xs font-semibold hover:bg-[#252930] active:scale-97 transition-all shrink-0"
                onClick={onCloseChat}
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
            </div>
          )}

          {/* Retry Button on Error */}
          {isError && lastUserQuery && onRetry && (
            <div className="mt-3 pt-2.5 border-t border-[#E1E4E8] flex items-center justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(lastUserQuery)}
                className="h-7 text-xs flex items-center gap-1.5 border-[#E1E4E8] text-[#17191C] hover:bg-white active:scale-97"
              >
                <RefreshCw className="h-3 w-3 text-[#16A36A]" />
                Retry Question
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-[#707780] font-mono mt-1 ml-9 select-none">
        {formattedTime}
      </span>
    </motion.div>
  );
}

export default AgentMessage;
