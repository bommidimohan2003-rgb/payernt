import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HelpCircle, ArrowLeft, MessageSquare, ShieldCheck, Mail, Phone, ExternalLink } from "lucide-react";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/payernt/help")({
  head: () =>
    getSeoMetadata({
      title: "Lender Help & Support | paye₹nt",
      description: "Get assistance with equipment insurance, verification, handovers and payouts.",
      path: "/payernt/help",
    }),
  component: PayerntHelpRoute,
});

function PayerntHelpRoute() {
  const navigate = useNavigate();

  const faqs = [
    {
      q: "How does damage protection & equipment insurance work?",
      a: "Every verified rental on paye₹nt is backed by comprehensive equipment protection up to the replacement value stated during verification.",
    },
    {
      q: "When are payout earnings released to my bank account?",
      a: "Rental earnings are credited to your paye₹nt wallet instantly upon successful handover PIN verification and can be withdrawn directly to your verified bank account.",
    },
    {
      q: "What if a borrower fails to return gear on time?",
      a: "Late return fees are automatically charged to the borrower's payment method per hour, and our trust & safety operations team assists in immediate recovery.",
    },
    {
      q: "How do I update the rental price of my gear?",
      a: "Navigate to My Products, click on any listed item, and tap Edit Daily Rate to update your pricing anytime.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <button
          onClick={() => navigate({ to: "/payernt" })}
          className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-black text-foreground">Lender Help & Support</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Guidance for gear owners, KYC verifications and payouts
          </p>
        </div>
      </div>

      {/* Quick Action Support Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs">
            <Mail className="w-4 h-4" />
            <span>Dedicated Lender Desk</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Get 24/7 assistance from our lender success specialists.
          </p>
          <a
            href="mailto:lenders@payent.in"
            className="inline-block text-xs font-bold text-foreground hover:underline"
          >
            lenders@payent.in
          </a>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Trust & Verification</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Identity, serial number, and security deposit inquiries.
          </p>
          <a
            href="mailto:verification@payent.in"
            className="inline-block text-xs font-bold text-foreground hover:underline"
          >
            verification@payent.in
          </a>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Frequently Asked Questions
        </h2>
        <div className="space-y-2.5">
          {faqs.map((faq, i) => (
            <div key={i} className="p-4 rounded-2xl border border-border bg-card space-y-1.5">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                {faq.q}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed pl-5.5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Route;
