"""
Payent Agent Engine — Response Templates
Configurable response templates and quick action suggestions for classification stage.
Note: These are classification-stage communication templates only and do not perform
or claim execution of any backend business action.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class ResponseTemplate:
    """Represents a classification-stage response template with suggested next steps."""
    key: str
    message: str
    suggested_chips: List[str] = field(default_factory=list)


# Classification-Stage Response Catalog
TEMPLATES: Dict[str, ResponseTemplate] = {
    # 1. Greeting
    "greeting_response": ResponseTemplate(
        key="greeting_response",
        message="Namaste! I am your Payent Assistant. How can I help you with your rentals, bookings, or lending questions today?",
        suggested_chips=[
            "Check my booking",
            "Track delivery",
            "KYC verification status",
            "Payment / Refund status",
            "Talk to human support",
        ],
    ),

    # 2. Goodbye
    "goodbye_response": ResponseTemplate(
        key="goodbye_response",
        message="Thank you for choosing Payent! Feel free to reach out anytime if you need assistance with your tech gear rentals. Have a wonderful day!",
        suggested_chips=["Back to Home", "Browse Gear"],
    ),

    # 3. General Help
    "general_help_response": ResponseTemplate(
        key="general_help_response",
        message="I can assist you with booking status, delivery tracking, payment inquiries, refunds, KYC approval, and gear listings. What would you like help with?",
        suggested_chips=[
            "Booking status",
            "Delivery tracking",
            "Refund status",
            "How does insurance work?",
            "Speak to an agent",
        ],
    ),

    # 4. Booking Status Clarification
    "booking_status_clarification": ResponseTemplate(
        key="booking_status_clarification",
        message="I can help you check the real-time status of your rental. To view your details, please share your Booking ID (e.g. ord_...).",
        suggested_chips=[
            "View My Bookings",
            "Where is my Booking ID?",
            "Talk to Support",
        ],
    ),

    # 5. Booking Details Clarification
    "booking_details_clarification": ResponseTemplate(
        key="booking_details_clarification",
        message="To look up your rental schedule, handover secret PIN, or pickup location, please share your Booking ID.",
        suggested_chips=[
            "Recent Bookings",
            "Secret PIN Help",
            "Cancel Booking",
        ],
    ),

    # 6. Booking Cancellation Clarification
    "booking_cancellation_clarification": ResponseTemplate(
        key="booking_cancellation_clarification",
        message="Rental bookings can be cancelled in accordance with our cancellation policy before delivery dispatch. Please specify your Booking ID to review cancellation options.",
        suggested_chips=[
            "Review Cancellation Policy",
            "View Active Orders",
            "Connect to Human Agent",
        ],
    ),

    # 7. Booking Acceptance Clarification (Vendor)
    "booking_acceptance_clarification": ResponseTemplate(
        key="booking_acceptance_clarification",
        message="Lenders can accept pending rental requests from the 'Bookings & Rental Lifecycles' tab on the Payernt dashboard. Would you like instructions on accepting a booking?",
        suggested_chips=[
            "Open Payernt Bookings",
            "Handover PIN Guidelines",
        ],
    ),

    # 8. Booking Rejection Clarification (Vendor)
    "booking_rejection_clarification": ResponseTemplate(
        key="booking_rejection_clarification",
        message="If you cannot fulfill a rental request, you may decline it from your Payernt dashboard with a feedback reason so the renter can choose an alternate listing.",
        suggested_chips=[
            "Open Payernt Bookings",
            "Manage Inventory Availability",
        ],
    ),

    # 9. Payment Status Clarification
    "payment_status_clarification": ResponseTemplate(
        key="payment_status_clarification",
        message="To check whether your rental payment has been successfully captured and verified, please provide your Booking ID or Transaction ID.",
        suggested_chips=[
            "Check Order Status",
            "Download Payment Receipt",
            "Talk to Support",
        ],
    ),

    # 10. Payment Failed Clarification
    "payment_failed_clarification": ResponseTemplate(
        key="payment_failed_clarification",
        message="If money was debited from your bank but your booking was not confirmed, banking gateways usually auto-reconcile or reverse the amount within 2 to 5 business days. Please share your transaction details so we can investigate.",
        suggested_chips=[
            "Raise Payment Ticket",
            "Connect to Human Support",
            "Check Recent Orders",
        ],
    ),

    # 11. Refund Status Clarification
    "refund_status_clarification": ResponseTemplate(
        key="refund_status_clarification",
        message="Approved refunds for security deposits or cancelled rentals are routed through Razorpay back to your original payment method within 5 to 7 business days. Please provide your Booking ID to check refund progress.",
        suggested_chips=[
            "Check Refund Timeline",
            "View Cancellation Receipt",
            "Talk to Support",
        ],
    ),

    # 12. KYC Status Clarification
    "kyc_status_clarification": ResponseTemplate(
        key="kyc_status_clarification",
        message="Identity verification protects both renters and gear owners. You can track your KYC verification status directly in your Account Settings. Are you verifying as a Renter or Lender?",
        suggested_chips=[
            "Check KYC in Settings",
            "Documents Required for KYC",
            "Upload KYC Documents",
        ],
    ),

    # 13. KYC Rejection Clarification
    "kyc_rejection_clarification": ResponseTemplate(
        key="kyc_rejection_clarification",
        message="If your KYC was rejected, it is typically due to a blurry document photo, name mismatch, or expired ID. You can re-upload clear government ID documents from your Profile Settings.",
        suggested_chips=[
            "Re-upload KYC Documents",
            "View Rejection Reason",
            "Ask Human Support",
        ],
    ),

    # 14. Delivery Status Clarification
    "delivery_status_clarification": ResponseTemplate(
        key="delivery_status_clarification",
        message="You can track your gear delivery live with courier details and ETA once dispatched. Please provide your Booking ID to view delivery tracking.",
        suggested_chips=[
            "Track My Delivery",
            "Contact Delivery Courier",
            "View Booking Details",
        ],
    ),

    # 15. Delivery Issue Clarification
    "delivery_issue_clarification": ResponseTemplate(
        key="delivery_issue_clarification",
        message="We are sorry to hear about a delivery delay or issue. Please provide your Booking ID so our logistics coordination team can prioritize your delivery.",
        suggested_chips=[
            "Urgent Delivery Support",
            "Check Courier Location",
            "Connect to Support Agent",
        ],
    ),

    # 16. Product Listing Clarification
    "product_listing_clarification": ResponseTemplate(
        key="product_listing_clarification",
        message="Listing gear on Payent takes less than 2 minutes! High-demand items like cinema cameras, drones, laptops, and rides can earn up to ₹1 Lakh/month in passive income.",
        suggested_chips=[
            "List Your Gear",
            "How Lender Insurance Works",
            "Pricing Calculator",
        ],
    ),

    # 17. Product Approval Clarification
    "product_approval_clarification": ResponseTemplate(
        key="product_approval_clarification",
        message="New gear listings are reviewed by administrators within 24 hours to ensure equipment accuracy, serial authenticity, and rental safety.",
        suggested_chips=[
            "View My Listings",
            "Review Guidelines",
        ],
    ),

    # 18. Account Support Clarification
    "account_support_clarification": ResponseTemplate(
        key="account_support_clarification",
        message="For password resets, mobile number updates, or OTP issues, you can manage your credentials from the Account Settings page or request a password reset link.",
        suggested_chips=[
            "Forgot Password",
            "Update Profile",
            "Contact Support",
        ],
    ),

    # 19. Complaint Clarification
    "complaint_clarification": ResponseTemplate(
        key="complaint_clarification",
        message="We take service grievances and equipment condition issues very seriously. You can raise a formal dispute ticket and attach photo documentation for our dispute mediation team.",
        suggested_chips=[
            "Raise Formal Dispute Ticket",
            "Speak to Support Manager",
            "Review Insurance Policy",
        ],
    ),

    # 20. FAQ Query Clarification
    "faq_query_clarification": ResponseTemplate(
        key="faq_query_clarification",
        message="Payent provides ₹5 Lakhs damage protection on verified rentals, zero security deposit for verified renters, and operates across 40+ major Indian cities with same-day delivery or local pickup.",
        suggested_chips=[
            "Damage Protection Details",
            "Supported Cities",
            "Rental Guidelines",
        ],
    ),

    # 21. Human Support Acknowledgement
    "human_support_acknowledgement": ResponseTemplate(
        key="human_support_acknowledgement",
        message="I have noted your request to speak with a human support agent. Our support team is active Monday through Sunday from 9:00 AM to 9:00 PM IST.",
        suggested_chips=[
            "Raise a Support Ticket",
            "Call Support Hotline",
            "Return to Assistant",
        ],
    ),

    # 22. Unknown Intent Response
    "unknown_intent_response": ResponseTemplate(
        key="unknown_intent_response",
        message="I'm sorry, I could not understand your inquiry. I am trained specifically to help with Payent peer-to-peer gear rentals, bookings, payments, and delivery tracking. How can I assist you?",
        suggested_chips=[
            "Check Booking Status",
            "Delivery Tracking",
            "Payment & Refund",
            "KYC Verification",
            "Human Support",
        ],
    ),

    # 23. Ambiguous Intent Response
    "ambiguous_intent_response": ResponseTemplate(
        key="ambiguous_intent_response",
        message="Your request mentions multiple topics. Please select the specific area you would like assistance with:",
        suggested_chips=[
            "Booking Status",
            "Payment Issue",
            "Delivery Tracking",
            "Connect to Human Support",
        ],
    ),
}


def get_response_template(key: str) -> ResponseTemplate:
    """Retrieves a response template by key, falling back to unknown_intent_response."""
    return TEMPLATES.get(key, TEMPLATES["unknown_intent_response"])
