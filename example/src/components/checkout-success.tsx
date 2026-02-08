import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CheckoutCompleteData } from "@/lib/paddle";
import { CheckCircle, ArrowRight, Sparkles, Copy, Check } from "lucide-react";

export function CheckoutSuccess({
  data,
  onContinue,
}: {
  data: CheckoutCompleteData;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleCopy = () => {
    if (!navigator.clipboard?.writeText) {
      console.error("Clipboard API not available (insecure context or unsupported browser)");
      return;
    }
    navigator.clipboard.writeText(data.transactionId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error("Failed to copy:", err));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center noise-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" />

      {/* Animated glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-primary/8 blur-[100px] animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/3 right-1/4 h-48 w-48 rounded-full bg-emerald-500/8 blur-[80px] animate-[float_6s_ease-in-out_infinite_reverse]" />
      </div>

      {/* Content */}
      <div
        className={`relative z-10 mx-auto max-w-md w-full px-6 transition-all duration-700 ${
          showContent
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center">
          {/* Success icon with glow */}
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl animate-[glow-pulse_2s_ease-in-out_infinite]" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border-2 border-emerald-500/30">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Payment Successful
          </h1>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-muted-foreground">
              Your purchase has been confirmed
            </p>
          </div>

          {/* Transaction details card */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-5 mb-8 text-left">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Transaction ID
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm text-foreground/80 truncate">
                    {data.transactionId}
                  </code>
                  <button
                    onClick={handleCopy}
                    aria-label={copied ? "Copied" : "Copy order number"}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Status
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-medium capitalize text-emerald-400">
                    {data.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            size="lg"
            className="w-full h-12 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-base"
            onClick={onContinue}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="mt-4 text-xs text-muted-foreground">
            You can manage your purchases in your profile.
          </p>
        </div>
      </div>
    </div>
  );
}
