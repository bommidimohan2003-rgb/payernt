import React from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Headphones, LogIn, RefreshCw } from "lucide-react";
import { PayentAgentIcon } from "./PayentAgentIcon";
import { Button } from "./Button";

export interface AgentMessageProps {
  id: string;
  text: string;
  timestamp: Date;
  toolCalled?: string;
  toolResult?: any;
  requiresAuth?: boolean;
  requiresConfirmation?: boolean;
  isError?: boolean;
  lastUserQuery?: string;
  onRetry?: (query: string) => void;
  onCloseChat?: () => void;
}

export function AgentMessage({
  text,
  timestamp,
  toolCalled,
  toolResult,
  requiresAuth,
  isError,
  lastUserQuery,
  onRetry,
  onCloseChat,
}: AgentMessageProps) {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasCreatedTicket =
    toolResult &&
    typeof toolResult === "object" &&
    toolResult.ticket_id &&
    (toolCalled === "create_support_ticket" || String(toolResult.ticket_id).startsWith("TICK-"));

  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const lines = content.split("\n");

    return (
      <div className="space-y-1.5 text-sm leading-relaxed text-[#252930]">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} className="h-1" />;

          // Heading line (### or ##)
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

          // Bullet item (•, -, *)
          const isBullet =
            trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
          
          // Numbered item (e.g. "1. ", "2. ")
          const numberedMatch = trimmed.match(/^(\d+[\.\)])\s+(.*)$/);

          let displayLine = line;
          let prefixElement: React.ReactNode = null;

          if (isBullet) {
            displayLine = trimmed.replace(/^[•\-\*]\s*/, "");
            prefixElement = (
              <span className="text-[#16A36A] font-bold text-xs select-none mt-0.5 shrink-0">
                •
              </span>
            );
          } else if (numberedMatch) {
            const [, numPrefix, rest] = numberedMatch;
            displayLine = rest;
            prefixElement = (
              <span className="text-[#17191C] font-semibold text-xs select-none mt-0.5 shrink-0 min-w-[1.2rem]">
                {numPrefix}
              </span>
            );
          }

          const parts = displayLine.split(/(\*\*[^*]+\*\*)/g);

          return (
            <div
              key={lIdx}
              className={`flex items-start gap-1.5 ${
                isBullet || numberedMatch ? "pl-1" : ""
              }`}
            >
              {prefixElement}
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
    <div className="flex flex-col items-start">
      <div className="flex items-start gap-2 max-w-[88%]">
        <div className="shrink-0 mt-0.5">
          <PayentAgentIcon size={24} />
        </div>
        <div className="rounded-2xl rounded-tl-xs px-4 py-2.5 text-sm bg-[#F5F6F8] border border-[#E1E4E8] text-[#252930] shadow-2xs">
          {renderFormattedContent(text)}

          {/* Support Ticket Confirmed Card */}
          {hasCreatedTicket && (
            <div className="mt-3 p-3 rounded-xl bg-[#16A36A]/10 border border-[#16A36A]/25 text-xs text-[#252930]">
              <div className="flex items-center justify-between font-semibold text-[#16A36A] mb-1.5">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Support Ticket Confirmed
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#16A36A]/20 text-[10px] font-bold uppercase tracking-wider text-[#16A36A]">
                  {toolResult.status || "OPEN"}
                </span>
              </div>
              <div className="font-mono text-[11px] text-[#17191C] font-semibold">
                Ticket #{toolResult.ticket_id}
              </div>
              <div className="text-[#707780] text-[11px] mt-0.5">
                Category: {toolResult.category || "General Help"}
              </div>
              <div className="mt-2 pt-2 border-t border-[#16A36A]/20 flex gap-2">
                <Link
                  to="/support"
                  className="text-xs text-[#16A36A] font-medium hover:underline flex items-center gap-1"
                  onClick={onCloseChat}
                >
                  <Headphones className="h-3 w-3" />
                  View in Support Messages
                </Link>
              </div>
            </div>
          )}

          {/* Sign In Required Callout */}
          {requiresAuth && (
            <div className="mt-2.5 pt-2 border-t border-[#E1E4E8] flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#17191C] text-white text-xs font-semibold hover:bg-[#252930] transition-colors"
                onClick={onCloseChat}
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In to Payent
              </Link>
            </div>
          )}

          {/* Retry Button on Error */}
          {isError && lastUserQuery && onRetry && (
            <div className="mt-2.5 pt-2 border-t border-[#E1E4E8]">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(lastUserQuery)}
                className="h-7 text-xs flex items-center gap-1.5 border-[#E1E4E8] text-[#17191C] hover:bg-[#F5F6F8]"
              >
                <RefreshCw className="h-3 w-3" />
                Retry Query
              </Button>
            </div>
          )}
        </div>
      </div>
      <span className="text-[10px] text-[#707780] mt-1 ml-8 select-none">
        {formattedTime}
      </span>
    </div>
  );
}

export default AgentMessage;
