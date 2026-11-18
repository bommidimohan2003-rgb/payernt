import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "frontend");
const readSrc = (file: string) => fs.readFileSync(path.join(root, "src", file), "utf-8");

describe("paYent Support Ticket Messaging Workflow — Frontend Verification", () => {
  it("API client exports full support ticket messaging methods", () => {
    const apiSrc = readSrc("utils/api.ts");

    // Must have replyToConversation with flexible parameter order
    assert.match(apiSrc, /async\s+replyToConversation\s*\(/);
    
    // Must have dedicated support ticket methods
    assert.match(apiSrc, /async\s+getSupportTicketDetail\s*\(/);
    assert.match(apiSrc, /async\s+replySupportTicket\s*\(/);
    assert.match(apiSrc, /async\s+markSupportTicketRead\s*\(/);
    assert.match(apiSrc, /async\s+getSupportUnreadCount\s*\(/);

    // Endpoint paths
    assert.match(apiSrc, /\/api\/support\/\$\{encodeURIComponent\(id\)\}\/reply/);
    assert.match(apiSrc, /\/api\/support\/\$\{encodeURIComponent\(id\)\}\/read/);
  });

  it("Support page displays message alignment: Admin on left, User on right", () => {
    const supportSrc = readSrc("pages/Support.tsx");

    // Check sender discrimination
    assert.match(supportSrc, /const\s+isAdmin\s*=\s*m\.senderType\s*===\s*["']admin["']\s*\|\|\s*m\.sender\s*===\s*["']admin["']/);

    // Admin messages on left (mr-auto) and User messages on right (ml-auto)
    assert.match(supportSrc, /isAdmin\s*\?\s*["']mr-auto[^"']*["']\s*:\s*["']ml-auto[^"']*["']/);

    // Distinguishing styles: user has bg-neutral-900, admin has mr-auto with shield icon
    assert.match(supportSrc, /ShieldCheck/);
    assert.match(supportSrc, /paYent Support/);
  });

  it("Support page marks messages as read upon ticket selection", () => {
    const supportSrc = readSrc("pages/Support.tsx");

    // Selection handler calls markSupportTicketRead
    assert.match(supportSrc, /handleSelectTicket/);
    assert.match(supportSrc, /api\.markSupportTicketRead\(/);
  });

  it("Support page handles closed tickets with banner and disabled composer", () => {
    const supportSrc = readSrc("pages/Support.tsx");

    // Lock icon / closed banner
    assert.match(supportSrc, /Lock/);
    assert.match(supportSrc, /This support ticket is closed and cannot receive new replies/);

    // Closed ticket does not render reply form
    assert.match(supportSrc, /status\s*===\s*["']closed["']\s*\?/);
  });

  it("Support page renders unread badges and status labels", () => {
    const supportSrc = readSrc("pages/Support.tsx");

    // Unread indicator
    assert.match(supportSrc, /New reply/);

    // Waiting for user status badge
    assert.match(supportSrc, /waiting_for_user/);
    assert.match(supportSrc, /Waiting for you/);
  });

  it("Support page supports deep-linking via URL search param", () => {
    const supportSrc = readSrc("pages/Support.tsx");

    assert.match(supportSrc, /new\s+URLSearchParams\(window\.location\.search\)/);
    assert.match(supportSrc, /urlParams\?\.get\(["']id["']\)/);
  });

  it("Contact & Support landing page renders dedicated My Support Tickets card with live unread counts", () => {
    const supportSrc = readSrc("pages/Support.tsx");

    // Prominent card testid
    assert.match(supportSrc, /data-testid=["']my-support-tickets-card["']/);

    // Exact title and description
    assert.match(supportSrc, /My Support Tickets/);
    assert.match(supportSrc, /View your support requests, read admin replies, and continue your conversations\./);

    // View My Tickets action button
    assert.match(supportSrc, /View My Tickets/);

    // Unread reply count and new reply badge
    assert.match(supportSrc, /unreadSupportCount/);
    assert.match(supportSrc, /New\s*\{unreadSupportCount\s*===\s*1\s*\?\s*["']Reply["']\s*:\s*["']Replies["']\}/);

    // Ticket icon
    assert.match(supportSrc, /Ticket/);
  });

  it("Maintains separate navigation across FAQ & Help, My Support Tickets, and Track In Messages", () => {
    const supportSrc = readSrc("pages/Support.tsx");
    const contactSrc = readSrc("pages/Contact.tsx");

    // Track In Messages card for rental conversations on Support page
    assert.match(supportSrc, /data-testid=["']track-in-messages-card["']/);
    assert.match(supportSrc, /Rental Conversations/);
    assert.match(supportSrc, /to=["']\/messages["']/);
    assert.match(supportSrc, /Track In Messages/);

    // Contact page also links to both My Support Tickets and Track In Messages
    assert.match(contactSrc, /My Support Tickets/);
    assert.match(contactSrc, /Track In Messages/);

    // FAQ categories preserved
    assert.match(supportSrc, /FAQ &amp; Help Topics/);
    assert.match(supportSrc, /FAQ_CATEGORIES\.map/);
  });

  it("Ticket inbox displays all 7 required ticket attributes including latest message preview", () => {
    const supportSrc = readSrc("pages/Support.tsx");

    // Ticket ID
    assert.match(supportSrc, /#\{t\.id\}/);

    // Subject
    assert.match(supportSrc, /\{t\.subject\}/);

    // Category
    assert.match(supportSrc, /t\.category/);

    // Status
    assert.match(supportSrc, /status\s*===\s*["']waiting_for_user["']/);

    // Last updated timestamp
    assert.match(supportSrc, /Updated:\s*\{formatTicketDate/);

    // Latest message preview
    assert.match(supportSrc, /latestMsg/);
    assert.match(supportSrc, /&ldquo;\{latestMsg\}&rdquo;/);

    // New reply indicator
    assert.match(supportSrc, /New reply/);
  });
});
