import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Minus, Plus, Users, Building2, Loader2 } from "lucide-react";

export function TeamBillingPage() {
  const { user } = useAuth();
  const orgSubscription = useQuery(api.paddle.getOrgSubscription);
  const createTeamCheckout = useAction(
    api.paddle.createTeamSubscriptionCheckout,
  );
  const updateSeats = useAction(api.paddle.updateSeats);
  const cancelSubscription = useAction(api.paddle.cancelSubscription);

  const [seatCount, setSeatCount] = useState(5);

  useEffect(() => {
    if (orgSubscription?.quantity) {
      setSeatCount(orgSubscription.quantity);
    }
  }, [orgSubscription?.quantity]);

  const [loading, setLoading] = useState(false);

  const teamPriceId = import.meta.env.VITE_PADDLE_TEAM_PRICE_ID as
    | string
    | undefined;
  const hasTeamPriceId = !!teamPriceId?.startsWith("pri_");

  const handleCreateTeamSub = async () => {
    if (!user || !teamPriceId) return;
    setLoading(true);
    try {
      const result = await createTeamCheckout({
        priceId: teamPriceId!,
        quantity: seatCount,
        email: user?.email,
      });
      if (window.Paddle) {
        window.Paddle.Checkout.open({
          transactionId: result.transactionId,
          settings: { displayMode: "overlay", theme: "light" },
        });
      } else if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      console.error("Team checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSeats = async (newCount: number) => {
    if (!orgSubscription) return;
    setLoading(true);
    try {
      await updateSeats({
        paddleSubscriptionId: orgSubscription.paddleSubscriptionId,
        priceId: orgSubscription.priceId,
        seatCount: newCount,
      });
      setSeatCount(newCount);
    } catch (err) {
      console.error("Update seats error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTeam = async () => {
    if (!orgSubscription) return;
    if (!confirm("Cancel team subscription at end of billing period?")) return;
    setLoading(true);
    try {
      await cancelSubscription({
        paddleSubscriptionId: orgSubscription.paddleSubscriptionId,
        immediately: false,
      });
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl pt-4 animate-fade-up">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary border border-border">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Team Billing</h1>
        </div>
      </div>
      <p className="mt-2 text-muted-foreground mb-8">
        Manage your organization subscription and seats.
        Organization is determined by your auth token&apos;s org_id claim.
      </p>

      {orgSubscription === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl bg-secondary/50" />
          <Skeleton className="h-12 w-full rounded-xl bg-secondary/50" />
          <Skeleton className="h-12 w-3/4 rounded-xl bg-secondary/50" />
        </div>
      ) : orgSubscription === null ? (
        <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
          <div className="p-6 border-b border-border/30">
            <h3 className="text-xl font-bold">Set Up Team Subscription</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose how many seats your team needs to get started.
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-muted-foreground">Number of seats</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Decrease seats"
                  className="h-10 w-10 rounded-xl border-border/80"
                  onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="min-w-[3rem] text-center text-2xl font-bold tabular-nums">
                    {seatCount}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Increase seats"
                  className="h-10 w-10 rounded-xl border-border/80"
                  onClick={() => setSeatCount(seatCount + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!hasTeamPriceId && (
              <p className="text-sm text-muted-foreground">
                Set{" "}
                <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                  VITE_PADDLE_TEAM_PRICE_ID
                </code>{" "}
                in your <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">.env.local</code> to enable team subscriptions.
              </p>
            )}
            <Button
              className="w-full h-11 shadow-lg shadow-primary/20"
              onClick={() => void handleCreateTeamSub()}
              disabled={loading || !hasTeamPriceId}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                `Subscribe with ${seatCount} seats`
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-border/30">
            <h3 className="text-xl font-bold">Team Subscription</h3>
            <StatusBadge status={orgSubscription.status} />
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-secondary/30 border border-border/30 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subscription</p>
                <p className="font-mono text-sm text-foreground/80 truncate">
                  {orgSubscription.paddleSubscriptionId}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/30 border border-border/30 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Seats</p>
                <p className="text-2xl font-bold">{orgSubscription.quantity ?? 1}</p>
              </div>
            </div>

            {orgSubscription.nextBilledAt && (
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground/60">Next billing:</span>{" "}
                {new Date(orgSubscription.nextBilledAt).toLocaleDateString()}
              </p>
            )}

            {orgSubscription.status === "active" && (
              <>
                <div className="space-y-3 pt-2 border-t border-border/30">
                  <Label className="text-muted-foreground">Update seats</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Decrease seats"
                      className="h-10 w-10 rounded-xl border-border/80"
                      onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-[3rem] text-center text-2xl font-bold tabular-nums">
                        {seatCount}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Increase seats"
                      className="h-10 w-10 rounded-xl border-border/80"
                      onClick={() => setSeatCount(seatCount + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={() => void handleUpdateSeats(seatCount)}
                      disabled={loading}
                      aria-label={loading ? "Saving" : undefined}
                      aria-busy={loading || undefined}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Update Seats"
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => void handleCancelTeam()}
                  disabled={loading}
                >
                  Cancel Team Subscription
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
