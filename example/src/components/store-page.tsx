import { useState, useCallback, useEffect, useMemo } from "react";
import { useConvexAuth, useAction, useQuery } from "convex/react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SINGLE_PRICE_ID, SUBSCRIPTION_PRICE_ID } from "@/lib/constants";
import {
  Check,
  ArrowRight,
  Loader2,
  ShoppingBag,
  RefreshCw,
  Code,
} from "lucide-react";

type PriceInfo = {
  priceId: string;
  name: string;
  description: string;
  type: string;
  billingCycle: { interval: string; frequency: number } | null;
  unitPrice: string;
  currencyCode: string;
  formatted: string;
};

export function StorePage() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const createSubscription = useAction(api.paddle.createSubscriptionCheckout);
  const createPayment = useAction(api.paddle.createPaymentCheckout);
  const getPricing = useAction(api.paddle.getPricingPreview);
  const subscriptions = useQuery(api.paddleQueries.getUserSubscriptions);
  const singlePurchaseCount = useQuery(api.paddleQueries.countUserPurchases, {
    priceId: SINGLE_PRICE_ID,
  });

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");
  const [prices, setPrices] = useState<PriceInfo[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  const subscribedPriceIds = useMemo(() => {
    if (!subscriptions) return new Set<string>();
    return new Set(
      subscriptions
        .filter((s: any) => s.status === "active" || s.status === "trialing")
        .map((s: any) => s.priceId),
    );
  }, [subscriptions]);

  useEffect(() => {
    let cancelled = false;
    setPricingLoading(true);
    getPricing({
      priceIds: [SINGLE_PRICE_ID, SUBSCRIPTION_PRICE_ID],
      currencyCode: currency,
    })
      .then((result) => {
        if (!cancelled) setPrices(result);
      })
      .catch((err) => console.error("Pricing fetch error:", err))
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currency, getPricing]);

  const singlePrice = prices.find((p) => p.priceId === SINGLE_PRICE_ID);
  const subPrice = prices.find((p) => p.priceId === SUBSCRIPTION_PRICE_ID);

  const handleCheckout = useCallback(
    async (priceId: string, isSubscription: boolean) => {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!isAuthenticated || !user || !email) {
        openSignIn();
        return;
      }
      setLoadingId(priceId);
      try {
        const result = isSubscription
          ? await createSubscription({ priceId, email })
          : await createPayment({ priceId, email });
        if (window.Paddle) {
          window.Paddle.Checkout.open({
            transactionId: result.transactionId,
            settings: { displayMode: "overlay", theme: "light" },
          });
        } else if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        }
      } catch (err) {
        console.error("Checkout error:", err);
        alert("Failed to create checkout. Check console for details.");
      } finally {
        setLoadingId(null);
      }
    },
    [isAuthenticated, user, openSignIn, createSubscription, createPayment],
  );

  const isSubscribed = subscribedPriceIds.has(SUBSCRIPTION_PRICE_ID);

  return (
    <div className="pt-4 animate-fade-up">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Store
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          This template demonstrates two Paddle checkout flows: a one-time
          payment and a recurring subscription. Configure your own price IDs via
          environment variables.
        </p>
      </div>

      {/* Currency toggle */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-sm text-muted-foreground">Currency</span>
        <div className="flex rounded-lg bg-secondary/50 p-0.5 border border-border/50">
          {(["USD", "EUR"] as const).map((c) => (
            <button
              key={c}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                currency === c
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setCurrency(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Single Purchase */}
        <div className="flex flex-col rounded-2xl border border-border/50 bg-card/50 overflow-hidden hover:border-border transition-colors">
          <div className="flex items-center gap-3 p-6 border-b border-border/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary border border-border">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Single Purchase</h2>
              <p className="text-sm text-muted-foreground">One-time payment</p>
            </div>
            {singlePurchaseCount !== undefined && singlePurchaseCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">
                  {singlePurchaseCount} purchased
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col p-6">
            {pricingLoading ? (
              <div className="space-y-3 mb-6">
                <Skeleton className="h-10 w-32 rounded-lg bg-secondary/50" />
                <Skeleton className="h-4 w-48 rounded bg-secondary/50" />
              </div>
            ) : singlePrice ? (
              <div className="mb-6">
                <div className="text-4xl font-extrabold tracking-tight">
                  {singlePrice.formatted}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {singlePrice.name}
                  {singlePrice.description
                    ? ` — ${singlePrice.description}`
                    : ""}
                </p>
              </div>
            ) : (
              <p className="mb-6 text-sm text-muted-foreground">
                Price not available. Check your{" "}
                <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                  VITE_PADDLE_SINGLE_PRICE_ID
                </code>{" "}
                env var.
              </p>
            )}

            <div className="rounded-lg bg-secondary/30 border border-border/30 p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Configuration
                </span>
              </div>
              <code className="text-xs text-foreground/70 font-mono">
                VITE_PADDLE_SINGLE_PRICE_ID={SINGLE_PRICE_ID}
              </code>
            </div>

            <div className="mt-auto">
              <Button
                className="w-full h-11"
                variant="outline"
                onClick={() => void handleCheckout(SINGLE_PRICE_ID, false)}
                disabled={loadingId === SINGLE_PRICE_ID || !singlePrice}
              >
                {loadingId === SINGLE_PRICE_ID ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Buy Now
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="flex flex-col rounded-2xl border border-primary/30 glow-border-strong overflow-hidden p-1">
          <div className="flex flex-1 flex-col rounded-xl card-shine overflow-hidden">
            <div className="flex items-center gap-3 p-6 border-b border-border/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Subscription</h2>
                <p className="text-sm text-muted-foreground">
                  Recurring billing
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-6">
              {pricingLoading ? (
                <div className="space-y-3 mb-6">
                  <Skeleton className="h-10 w-32 rounded-lg bg-secondary/50" />
                  <Skeleton className="h-4 w-48 rounded bg-secondary/50" />
                </div>
              ) : subPrice ? (
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {subPrice.formatted}
                    </span>
                    {subPrice.billingCycle && (
                      <span className="text-muted-foreground">
                        /{subPrice.billingCycle.interval}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {subPrice.name}
                    {subPrice.description
                      ? ` — ${subPrice.description}`
                      : ""}
                  </p>
                </div>
              ) : (
                <p className="mb-6 text-sm text-muted-foreground">
                  Price not available. Check your{" "}
                  <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                    VITE_PADDLE_SUBSCRIPTION_PRICE_ID
                  </code>{" "}
                  env var.
                </p>
              )}

              <div className="rounded-lg bg-secondary/30 border border-border/30 p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Configuration
                  </span>
                </div>
                <code className="text-xs text-foreground/70 font-mono">
                  VITE_PADDLE_SUBSCRIPTION_PRICE_ID={SUBSCRIPTION_PRICE_ID}
                </code>
              </div>

              <div className="mt-auto">
                <Button
                  className="w-full h-11 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                  onClick={() =>
                    void handleCheckout(SUBSCRIPTION_PRICE_ID, true)
                  }
                  disabled={
                    loadingId === SUBSCRIPTION_PRICE_ID ||
                    isSubscribed ||
                    !subPrice
                  }
                >
                  {isSubscribed ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Subscribed
                    </>
                  ) : loadingId === SUBSCRIPTION_PRICE_ID ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
