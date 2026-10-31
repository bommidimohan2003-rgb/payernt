"""
Payent Agent Engine — Intent Definitions
Configurable intent definitions, keyword registries, and pattern models
for deterministic customer support classification.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class IntentDefinition:
    """Configurable definition of a recognizable customer support intent."""
    canonical_name: str
    description: str
    english_keywords: Tuple[str, ...]
    telugu_keywords: Tuple[str, ...]
    synonyms: Tuple[str, ...]
    exact_phrases: Tuple[str, ...]
    regex_patterns: Tuple[str, ...]
    priority: int = 50
    confidence_threshold: float = 0.65
    clarification_message: str = ""
    response_template_key: str = ""


# Comprehensive Catalog of Configured Payent Support Intents
DEFAULT_INTENT_DEFINITIONS: List[IntentDefinition] = [
    # 1. Human Support Escalation (Highest Priority)
    IntentDefinition(
        canonical_name="HUMAN_SUPPORT",
        description="User requests to speak with a human support agent, representative, or customer care.",
        english_keywords=(
            "human", "agent", "person", "representative", "operator", "executive",
            "support team", "customer care", "customer support", "actual person", "talk to human",
            "real person", "call me", "human support", "live agent"
        ),
        telugu_keywords=(
            "human support kavali", "support agent tho matladali", "customer care kavali",
            "real person tho matladali", "agent tho matladali", "matladali", "call cheyandi",
            "support team ki connect cheyyi", "connect cheyyi", "person tho matladali"
        ),
        synonyms=(
            "talk to someone", "speak to agent", "connect me to agent", "human help",
            "live agent", "connect me to customer support", "connect to support team"
        ),
        exact_phrases=(
            "i need human support",
            "i want to talk to a human",
            "connect me to customer support",
            "i need an actual person",
            "talk to an agent",
            "connect to agent",
            "speak to a human",
            "customer care number",
            "human support kavali",
            "support agent tho matladali",
            "customer care kavali",
            "real person tho matladali",
            "support team ki connect cheyyi",
            "agent tho matladali",
            "confirm support ticket",
            "confirm ticket",
            "create support ticket",
            "proceed with ticket",
        ),
        regex_patterns=(
            r"\b(talk|speak|connect)\s+(to|with)\s+(a\s+)?(human|agent|person|representative|executive|customer\s+support|customer\s+care)\b",
            r"\b(need|want)\s+(an?\s+)?(human\s+support|live\s+agent|real\s+person|actual\s+person|customer\s+care|customer\s+support)\b",
            r"\bconnect\s+me\s+to\s+(customer\s+)?support\b",
            r"\b(human|agent|person|real\s+person)\s+tho\s+matladali\b",
            r"\bsupport\s+team(\s+ki)?\s+connect\s+(cheyali|cheyyi|cheyyandi)\b",
        ),
        priority=95,
        confidence_threshold=0.70,
        clarification_message="Would you like me to connect you with a Payent support specialist?",
        response_template_key="human_support_acknowledgement",
    ),

    # 2. Booking Cancellation (Urgent Action)
    IntentDefinition(
        canonical_name="BOOKING_CANCELLATION",
        description="User wants to cancel an active or pending rental booking.",
        english_keywords=("cancel", "cancellation", "abort", "terminate", "withdraw", "revoke", "drop", "booking cancel"),
        telugu_keywords=("booking cancel cheyali", "booking cancel cheyyandi", "booking vadhu", "cancel cheyali", "vadhu", "oddu"),
        synonyms=("cancel my booking", "cancel rental", "stop order", "do not want this product"),
        exact_phrases=(
            "cancel my booking",
            "i want to cancel my order",
            "cancel booking",
            "how to cancel booking",
            "booking cancel cheyali",
            "booking cancel cheyyandi",
            "booking vadhu",
            "order cancel cheyali",
        ),
        regex_patterns=(
            r"\bcancel\s+(my\s+)?(booking|order|rental|reservation)\b",
            r"\b(booking|order)\s+cancel\s+(cheyali|cheyyandi|kavali)?\b",
            r"\b(want\s+to\s+cancel|how\s+to\s+cancel)\b",
        ),
        priority=90,
        confidence_threshold=0.68,
        clarification_message="It seems you want to cancel your booking. Please confirm your Booking ID.",
        response_template_key="booking_cancellation_clarification",
    ),

    # 3. Payment Failed / Deducted (High Financial Priority)
    IntentDefinition(
        canonical_name="PAYMENT_FAILED",
        description="User experienced a failed payment or money was deducted without booking confirmation.",
        english_keywords=("payment failed", "deducted", "money debited", "amount cut", "transaction failed", "double charge", "charged twice", "payment error"),
        telugu_keywords=("dabulu deduct ayyayi", "money cut ayyindi", "payment fail ayyindi", "dabulu poyayi", "amount cut aindi"),
        synonyms=("money deducted booking not confirmed", "payment went through but no booking", "failed transaction"),
        exact_phrases=(
            "money deducted booking not confirmed",
            "i paid but booking is not confirmed",
            "paid but booking is not confirmed",
            "my payment failed",
            "amount was deducted",
            "money cut from account",
            "dabulu deduct ayyayi",
            "money cut ayyindi",
            "payment fail ayyindi",
        ),
        regex_patterns=(
            r"\b(money|amount|payment)\s+(deducted|debited|cut)\b",
            r"\b(payment|transaction)\s+(failed|error|unsuccessful)\b",
            r"\b(paid|debited|deducted|charged)\s+.*(not\s+confirmed|pending|no\s+booking)\b",
            r"\bdeducted\s+but\s+(no|not)\s+(confirmed|booking)\b",
            r"\b(dabulu|money)\s+(deduct|cut)\s+(ayyayi|ayyindi)\b",
        ),
        priority=88,
        confidence_threshold=0.68,
        clarification_message="Did your payment get deducted without your booking being confirmed?",
        response_template_key="payment_failed_clarification",
    ),

    # 4. Refund Status
    IntentDefinition(
        canonical_name="REFUND_STATUS",
        description="User is asking about the status, timeline, or receipt of their refund.",
        english_keywords=("refund", "reimbursement", "money back", "return money", "deposit refund", "refund delayed", "refund time", "when will i get my refund", "refund policy", "return and refund", "return policy"),
        telugu_keywords=("refund eppudu vastundi", "na money return cheyyandi", "amount inka raledu", "refund raledu", "dabulu return", "refund vachinda"),
        synonyms=("check refund", "refund status", "where is my refund", "how long for refund", "refund policy"),
        exact_phrases=(
            "where is my refund",
            "check my refund status",
            "when will i get my refund",
            "when will my money return",
            "refund is delayed",
            "refund policy",
            "what is the refund policy",
            "what is the return and refund policy",
            "refund eppudu vastundi",
            "na money return cheyyandi",
            "amount inka raledu",
            "refund vachinda",
            "what about my refund",
        ),
        regex_patterns=(
            r"\b(when|where|check|status|what\s+about|how\s+about)\s+.*\brefund\b",
            r"\b(my|naa)\s+refund\b",
            r"\b(what\s+is\s+the|what\s+is)?\s*(return\s+and\s+)?refund\s+policy\b",
            r"\b(return|refund)\s+policy\b",
            r"\brefund\s+(status|delayed|timeline|time|not\s+received|vachinda)\b",
            r"\brefund\s+(eppudu\s+vastundi|raledu)\b",
            r"\bwhen\s+will\s+.*(money|amount|refund)\s+(return|come|arrive|credit)\b",
            r"\b(money|amount)\s+(return|back)\b",
        ),
        priority=85,
        confidence_threshold=0.68,
        clarification_message="Are you inquiring about the status or processing timeline of a refund?",
        response_template_key="refund_status_clarification",
    ),

    # 5. KYC Rejection Issue
    IntentDefinition(
        canonical_name="KYC_REJECTION",
        description="User reports their KYC verification was rejected or needs information on resubmission.",
        english_keywords=("kyc rejected", "kyc failed", "document rejected", "rejection reason", "resubmit kyc", "aadhaar rejected", "pan rejected"),
        telugu_keywords=("kyc reject ayyindi", "kyc reject aindi", "documents reject"),
        synonyms=("why kyc rejected", "fix rejected kyc", "kyc not approved"),
        exact_phrases=(
            "my kyc was rejected",
            "why was my kyc rejected",
            "kyc reject ayyindi",
            "kyc verification failed",
        ),
        regex_patterns=(
            r"\bkyc\s+(rejected|declined|failed|disapproved)\b",
            r"\b(why|reason)\s+.*kyc\s+reject\b",
            r"\bkyc\s+reject\s+ayyindi\b",
        ),
        priority=82,
        confidence_threshold=0.70,
        clarification_message="Do you need guidance regarding a rejected KYC document submission?",
        response_template_key="kyc_rejection_clarification",
    ),

    # 6. KYC Status Check
    IntentDefinition(
        canonical_name="KYC_STATUS",
        description="User is asking about the status of their KYC verification (pending, approved, submitted).",
        english_keywords=("kyc", "verification", "aadhaar", "pan", "documents", "identity", "verify identity", "kyc status", "kyc pending"),
        telugu_keywords=("na kyc pending lo undi", "kyc approve ayyinda", "documents submit chesanu", "kyc status enti"),
        synonyms=("check my kyc", "is my kyc verified", "kyc review time", "how to verify kyc"),
        exact_phrases=(
            "check my kyc status",
            "is my kyc approved",
            "my kyc is pending",
            "how long does kyc take",
            "na kyc pending lo undi",
            "kyc approve ayyinda",
            "documents submit chesanu",
            "kyc status enti",
        ),
        regex_patterns=(
            r"\b(kyc|identity\s+verification|documents?)\s+(status|pending|approved|check|inquiry)\b",
            r"\b(check|what\s+is)\s+(my\s+)?kyc\b",
            r"\bkyc\s+(pending(\s+lo\s+undi)?|approve\s+ayyinda)\b",
        ),
        priority=78,
        confidence_threshold=0.65,
        clarification_message="Are you checking the status of your KYC identity verification?",
        response_template_key="kyc_status_clarification",
    ),

    # 7. Delivery Issue / Delay
    IntentDefinition(
        canonical_name="DELIVERY_ISSUE",
        description="User reports delivery delay, courier issue, or missing delivery boy.",
        english_keywords=("delivery delayed", "courier late", "delivery boy not reachable", "late delivery", "product not arrived", "where is courier", "transit issue"),
        telugu_keywords=("product inka raledu", "delivery late aindi", "delivery boy call cheyatam ledu"),
        synonyms=("courier not responding", "delivery is late", "gear hasn't arrived"),
        exact_phrases=(
            "delivery is delayed",
            "product not arrived yet",
            "delivery boy not answering",
            "product inka raledu",
            "gear has not reached me",
        ),
        regex_patterns=(
            r"\bdelivery\s+(delayed|late|issue|problem|not\s+arrived)\b",
            r"\b(product|gear|item)\s+(not\s+arrived|has\s+not\s+reached|inka\s+raledu)\b",
        ),
        priority=78,
        confidence_threshold=0.68,
        clarification_message="Are you reporting an issue or unexpected delay with your gear delivery?",
        response_template_key="delivery_issue_clarification",
    ),

    # 8. Delivery Status & Tracking
    IntentDefinition(
        canonical_name="DELIVERY_STATUS",
        description="User is asking to track an ongoing delivery or check arrival ETA.",
        english_keywords=("delivery", "track delivery", "courier", "eta", "tracking", "pickup location", "where is delivery boy", "live tracking"),
        telugu_keywords=("delivery ekkada undi", "delivery boy ekkada unnadu", "pickup eppudu", "courier ekkada", "order delivered ayyinda", "delivery ayyinda"),
        synonyms=("track my order", "when will it be delivered", "courier status", "where is my product"),
        exact_phrases=(
            "where is my delivery",
            "track my delivery",
            "when will my product arrive",
            "delivery ekkada undi",
            "delivery boy ekkada unnadu",
            "pickup eppudu",
            "order delivered ayyinda",
        ),
        regex_patterns=(
            r"\b(track|where\s+is|status\s+of)\s+(my\s+)?(delivery|courier|shipment|order)\b",
            r"\bdelivery\s+(status|tracking|location|eta)\b",
            r"\bdelivery\s+(ek+ada\s+undi|boy\s+ek+ada\s+unnadu)\b",
            r"\b(order|delivery)\s+deliver(ed)?\s+ayyinda\b",
            r"\btrack\s+.*\border\b",
        ),
        priority=75,
        confidence_threshold=0.65,
        clarification_message="Would you like to check the tracking status or ETA of your rental delivery?",
        response_template_key="delivery_status_clarification",
    ),

    # 9. Booking Status Inquiry
    IntentDefinition(
        canonical_name="BOOKING_STATUS",
        description="User is inquiring about the current status or progress of an active or upcoming booking.",
        english_keywords=("booking status", "order status", "booking progress", "is booking confirmed", "check booking", "my rental status", "where is my booking", "status of my booking", "status of booking", "status of order"),
        telugu_keywords=("na booking enti", "booking status enti", "booking confirm ayyinda", "booking ekkada undi", "order status enti"),
        synonyms=("order check", "booking state", "rental active", "booking confirmation check", "status of my booking"),
        exact_phrases=(
            "where is my booking",
            "check my booking",
            "what is my booking status",
            "what is the status of my booking",
            "what is the status of my order",
            "status of my booking",
            "is my booking confirmed",
            "na booking enti",
            "booking status enti",
            "booking confirm ayyinda",
            "booking ekkada undi",
        ),
        regex_patterns=(
            r"\b(what\s+is|check|where\s+is)\s+(my\s+)?(booking|order)\s+(status)?\b",
            r"\b(what\s+is\s+the\s+status\s+of|status\s+of)\s+(my\s+)?(booking|order)\b",
            r"\b(booking|order)\s+(status|progress|state|confirmed)\b",
            r"\b(status|track)\s+.*\b(booking|order)\b",
            r"\b(na\s+)?booking\s+(status\s+)?(enti|confirm\s+ayyinda|ekkada\s+undi)\b",
        ),
        priority=72,
        confidence_threshold=0.65,
        clarification_message="Are you looking to verify the active status of your rental booking?",
        response_template_key="booking_status_clarification",
    ),

    # 10. Booking Details Inquiry
    IntentDefinition(
        canonical_name="BOOKING_DETAILS",
        description="User asks for detailed parameters of their booking (dates, pricing, secret PIN, address).",
        english_keywords=("booking details", "order details", "rental dates", "booking invoice", "secret pin", "handover pin", "pickup address", "details of booking", "give me details"),
        telugu_keywords=("booking details kavali", "booking info kavali", "dates enti", "pin ekkada"),
        synonyms=("booking information", "rental receipt", "order summary", "details of booking"),
        exact_phrases=(
            "show my booking details",
            "booking details kavali",
            "what are my booking dates",
            "where is my secret pin",
            "order details please",
            "give me details of booking",
            "details of my booking",
        ),
        regex_patterns=(
            r"\b(show|get|give|view|what\s+are)\s+(me\s+)?(my\s+)?(booking|order)\s+(details|dates|summary|info)\b",
            r"\b(show|get|give|view|what\s+are)\s+(me\s+)?(the\s+)?(details|info)\s+of\s+(my\s+)?(booking|order)\b",
            r"\b(details|info)\s+of\s+(my\s+)?(booking|order)\b",
            r"\b(secret\s+pin|handover\s+pin)\s+(details|status|where)\b",
            r"\bbooking\s+details\s+kavali\b",
        ),
        priority=70,
        confidence_threshold=0.65,
        clarification_message="Do you need full details, handover PIN, or dates for your booking?",
        response_template_key="booking_details_clarification",
    ),

    # 11. Payment Status Check
    IntentDefinition(
        canonical_name="PAYMENT_STATUS",
        description="User wants to check if a rental payment was received, confirmed, or verified.",
        english_keywords=("payment status", "payment confirmed", "transaction check", "did payment go through", "payment receipt", "payment history"),
        telugu_keywords=("payment success ayyinda", "dabulu poyaya", "payment aipoinda"),
        synonyms=("verify payment", "payment verification", "paid status"),
        exact_phrases=(
            "check my payment",
            "is my payment successful",
            "payment status",
            "payment success ayyinda",
            "did my payment go through",
        ),
        regex_patterns=(
            r"\b(check|verify|what\s+is)\s+(my\s+)?(payment|transaction)\s+(status)?\b",
            r"\bpayment\s+(success|confirmed|verified|status)\b",
            r"\bpayment\s+success\s+ayyinda\b",
        ),
        priority=70,
        confidence_threshold=0.65,
        clarification_message="Are you checking whether your payment has been successfully recorded?",
        response_template_key="payment_status_clarification",
    ),

    # 12. Booking Acceptance (Vendor Context)
    IntentDefinition(
        canonical_name="BOOKING_ACCEPTANCE",
        description="Vendor or lender asking how to accept or confirm an incoming rental request.",
        english_keywords=("accept booking", "accept request", "how to accept", "confirm rental", "vendor accept", "approve rental request"),
        telugu_keywords=("booking accept cheyali", "request approve cheyali"),
        synonyms=("confirm booking request", "approve renter"),
        exact_phrases=(
            "how do i accept a booking",
            "accept booking request",
            "approve this rental",
        ),
        regex_patterns=(
            r"\b(how\s+to\s+)?accept\s+(a\s+)?(booking|request|rental)\b",
            r"\bapprove\s+(the\s+)?(renter|booking\s+request)\b",
        ),
        priority=68,
        confidence_threshold=0.70,
        clarification_message="Are you a lender asking how to accept a pending rental request?",
        response_template_key="booking_acceptance_clarification",
    ),

    # 13. Booking Rejection (Vendor Context)
    IntentDefinition(
        canonical_name="BOOKING_REJECTION",
        description="Vendor or lender asking how to reject or decline an incoming rental request.",
        english_keywords=("reject booking", "decline request", "reject rental", "cannot fulfill", "decline order"),
        telugu_keywords=("booking reject cheyali", "request reject"),
        synonyms=("turn down booking", "decline renter"),
        exact_phrases=(
            "how do i reject a booking",
            "decline booking request",
            "reject rental request",
        ),
        regex_patterns=(
            r"\b(how\s+to\s+)?(reject|decline)\s+(a\s+)?(booking|request|rental)\b",
        ),
        priority=68,
        confidence_threshold=0.70,
        clarification_message="Are you a lender asking how to decline an incoming rental request?",
        response_template_key="booking_rejection_clarification",
    ),

    # 14. Product Listing (Lender / Vendor)
    IntentDefinition(
        canonical_name="PRODUCT_LISTING",
        description="User wants to know how to list gear, become a lender, or edit an inventory item.",
        english_keywords=("list product", "list gear", "become lender", "list camera", "earn money", "passive income", "how to list", "add item"),
        telugu_keywords=("gear list cheyali", "lender ela avvali", "product add cheyali", "earn passive income"),
        synonyms=("lend my equipment", "rent out my gear", "put item for rent"),
        exact_phrases=(
            "how to list gear",
            "how do i become a lender",
            "how can i earn money by renting",
            "list my camera",
            "how to add product",
        ),
        regex_patterns=(
            r"\bhow\s+(to|can\s+i)\s+(list|rent\s+out|lend)\s+(my\s+)?(gear|product|item|camera|laptop|equipment)\b",
            r"\bbecome\s+(a\s+)?(lender|vendor)\b",
        ),
        priority=65,
        confidence_threshold=0.65,
        clarification_message="Are you interested in listing equipment to earn passive rental income?",
        response_template_key="product_listing_clarification",
    ),

    # 15. Product Approval / Verification
    IntentDefinition(
        canonical_name="PRODUCT_APPROVAL",
        description="Vendor asking about listing approval, admin review timeline, or verification status.",
        english_keywords=("product approved", "listing review", "product pending", "when listing active", "item verification", "product under review", "listing status", "product status"),
        telugu_keywords=("product approve ayyinda", "listing pending lo undi", "naa product listing status enti", "product status enti"),
        synonyms=("is my product live", "listing approval timeline", "product review status", "my product listing status"),
        exact_phrases=(
            "when will my product be approved",
            "is my listing approved",
            "product under review",
            "product approve ayyinda",
            "naa product listing status enti",
            "my product listing status",
        ),
        regex_patterns=(
            r"\b(when|why|is)\s+.*(product|listing)\s+(approved|live|reviewed|active)\b",
            r"\b(naa|my)?\s*(product|listing)\s+(status|approval|review)\b",
            r"\b(product|listing)\s+under\s+review\b",
        ),
        priority=65,
        confidence_threshold=0.68,
        clarification_message="Are you checking the status of an equipment listing currently under review?",
        response_template_key="product_approval_clarification",
    ),

    # 16. Account Support
    IntentDefinition(
        canonical_name="ACCOUNT_SUPPORT",
        description="User experiencing account login, password reset, or profile settings difficulty.",
        english_keywords=("account", "login", "password", "reset password", "profile", "change phone", "otp not received", "login issue"),
        telugu_keywords=("login avvatledu", "password marchali", "account problem"),
        synonyms=("cannot sign in", "forgot password", "update mobile number"),
        exact_phrases=(
            "cannot login to my account",
            "reset my password",
            "not getting otp",
            "change my phone number",
        ),
        regex_patterns=(
            r"\b(cannot|unable\s+to|fail\s+to)\s+(login|sign\s+in)\b",
            r"\b(reset|forgot)\s+(my\s+)?password\b",
            r"\b(not\s+getting|didn't\s+get)\s+otp\b",
        ),
        priority=62,
        confidence_threshold=0.65,
        clarification_message="Do you need assistance logging in or updating your Payent account credentials?",
        response_template_key="account_support_clarification",
    ),

    # 17. Formal Complaint / Dispute
    IntentDefinition(
        canonical_name="COMPLAINT",
        description="User expressing severe dissatisfaction, grievance, or equipment damage dispute.",
        english_keywords=("complaint", "fraud", "cheated", "scam", "damaged product", "dispute", "terrible service", "compensation", "escalate", "unresolved issue"),
        telugu_keywords=("fraud jarigindi", "product damage aindi", "complaint ivvali", "problem solve avvaledu", "na problem solve avvaledu"),
        synonyms=("file a complaint", "report scam", "lender dispute", "broken gear delivered", "issue not solved"),
        exact_phrases=(
            "i want to file a complaint",
            "the product is completely damaged",
            "my product arrived damaged",
            "product arrived damaged",
            "this is a scam",
            "terrible service i want to report",
            "na problem solve avvaledu",
            "problem solve avvaledu",
        ),
        regex_patterns=(
            r"\b(file|lodge|raise)\s+(a\s+)?complaint\b",
            r"\b(product|item|gear)\s+(is\s+|arrived\s+|was\s+)?(damaged|broken|unusable|fake)\b",
            r"\b(fraud|scam|cheated|dispute)\b",
            r"\b(na\s+)?problem\s+solve\s+(avvaledu|kaledu|avaledu)\b",
        ),
        priority=62,
        confidence_threshold=0.68,
        clarification_message="Would you like to register a formal equipment dispute or service grievance?",
        response_template_key="complaint_clarification",
    ),

    # 18. FAQ / Platform Policies
    IntentDefinition(
        canonical_name="FAQ_QUERY",
        description="General questions about security deposits, damage insurance, operating cities, rental rules.",
        english_keywords=("insurance", "damage protection", "deposit", "security deposit", "5 lakhs", "cities", "locations", "coverage", "how payent works"),
        telugu_keywords=("insurance ela work avtundi", "security deposit unda", "cities ekkada"),
        synonyms=("damage policy", "zero deposit policy", "is gear insured", "deposit policy"),
        exact_phrases=(
            "how does insurance work",
            "do i need to pay security deposit",
            "what cities does payent operate in",
            "how does 5 lakhs damage protection work",
        ),
        regex_patterns=(
            r"\b(how\s+does\s+)?(insurance|damage\s+protection|security\s+deposit|deposit|coverage)\s*(work|policy)?\b",
            r"\b(security\s+deposit)\b",
            r"\b(what|which)\s+cities\b",
        ),
        priority=55,
        confidence_threshold=0.60,
        clarification_message="Are you asking about Payent insurance coverage, security deposits, or city locations?",
        response_template_key="faq_query_clarification",
    ),

    # 19. Greeting
    IntentDefinition(
        canonical_name="GREETING",
        description="User saying hello, namaste, or opening conversational remarks.",
        english_keywords=("hi", "hello", "hey", "good morning", "good evening", "namaste", "namaskaram"),
        telugu_keywords=("namaste", "namaskaram", "ela unnaru", "bagunnara"),
        synonyms=("greetings", "howdy", "sup"),
        exact_phrases=(
            "hi",
            "hello",
            "hey",
            "namaste",
            "namaskaram",
            "good morning",
            "good evening",
            "ela unnaru",
            "bagunnara",
        ),
        regex_patterns=(
            r"^(hi|hello|hey|namaste|namaskaram|good\s+morning|good\s+afternoon|good\s+evening)\b",
        ),
        priority=75,
        confidence_threshold=0.70,
        clarification_message="",
        response_template_key="greeting_response",
    ),

    # 20. Goodbye
    IntentDefinition(
        canonical_name="GOODBYE",
        description="User ending conversation or bidding farewell.",
        english_keywords=("bye", "goodbye", "see you", "cya", "thanks bye", "have a good day"),
        telugu_keywords=("vuntanu", "selavu", "bye"),
        synonyms=("farewell", "take care"),
        exact_phrases=(
            "bye",
            "goodbye",
            "bye bye",
            "thank you bye",
        ),
        regex_patterns=(
            r"^(bye|goodbye|see\s+you|cya)\b",
        ),
        priority=75,
        confidence_threshold=0.75,
        clarification_message="",
        response_template_key="goodbye_response",
    ),

    # 21. General Help
    IntentDefinition(
        canonical_name="GENERAL_HELP",
        description="User asking general 'help me' without specific domain intent.",
        english_keywords=("help", "support", "assist", "assistance", "guidance", "what can you do"),
        telugu_keywords=("help kavali", "sahayam kavali"),
        synonyms=("need help", "can you help me"),
        exact_phrases=(
            "help",
            "i need help",
            "can you help me",
            "help me",
            "help kavali",
        ),
        regex_patterns=(
            r"^(help|i\s+need\s+help|can\s+you\s+help\s+me)\b",
        ),
        priority=40,
        confidence_threshold=0.60,
        clarification_message="How can I assist you with your Payent rentals today?",
        response_template_key="general_help_response",
    ),

    # 22. Support Ticket Inquiry
    IntentDefinition(
        canonical_name="SUPPORT_STATUS",
        description="User inquiring about an existing human support ticket or reply.",
        english_keywords=("ticket", "support ticket", "ticket status", "ticket update", "support reply", "my tickets"),
        telugu_keywords=("ticket status enti", "support ticket ekkada", "ticket reply vachinda"),
        synonyms=("check my ticket", "ticket progress", "support status", "complaint status"),
        exact_phrases=(
            "check my ticket status",
            "what is my ticket status",
            "check ticket",
            "ticket status",
            "my support tickets",
            "did support reply",
        ),
        regex_patterns=(
            r"\b(check|view|track)\s+(my\s+)?(support\s+)?ticket(s)?\b",
            r"\b(check|view|track)\s+(the\s+)?status\s+of\s+(support\s+)?ticket(s)?\b",
            r"\b(status\s+of\s+)?(support\s+)?ticket\s*#?\s*TICK-[A-Za-z0-9]+\b",
            r"\b(what\s+is\s+my\s+ticket\s+status|ticket\s+status)\b",
            r"\b(did\s+support\s+reply|support\s+reply)\b",
        ),
        priority=75,
        confidence_threshold=0.68,
        clarification_message="Would you like to check the status of your existing support tickets?",
        response_template_key="human_support_acknowledgement",
    ),

    # 23. Unknown Intent (Fallback Default)
    IntentDefinition(
        canonical_name="UNKNOWN_INTENT",
        description="Input does not match any recognized customer support pattern with sufficient confidence.",
        english_keywords=(),
        telugu_keywords=(),
        synonyms=(),
        exact_phrases=(),
        regex_patterns=(),
        priority=0,
        confidence_threshold=0.0,
        clarification_message="I'm sorry, I could not understand your inquiry. Could you please rephrase or choose an option below?",
        response_template_key="unknown_intent_response",
    ),
]


class IntentRegistry:
    """Configurable registry containing all active intent definitions."""

    def __init__(self, definitions: Optional[List[IntentDefinition]] = None):
        self._definitions: Dict[str, IntentDefinition] = {}
        items = definitions if definitions is not None else DEFAULT_INTENT_DEFINITIONS
        for item in items:
            self.register(item)

    def register(self, definition: IntentDefinition):
        """Registers or overrides an intent definition."""
        self._definitions[definition.canonical_name] = definition

    def get(self, canonical_name: str) -> Optional[IntentDefinition]:
        """Retrieves an intent definition by canonical name."""
        return self._definitions.get(canonical_name)

    def get_all(self) -> List[IntentDefinition]:
        """Returns all registered intent definitions sorted by priority (descending)."""
        return sorted(self._definitions.values(), key=lambda d: d.priority, reverse=True)

    def get_fallback(self) -> IntentDefinition:
        """Returns the fallback UNKNOWN_INTENT definition."""
        return self._definitions.get("UNKNOWN_INTENT", DEFAULT_INTENT_DEFINITIONS[-1])
