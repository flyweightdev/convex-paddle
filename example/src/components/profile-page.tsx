import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ExternalLink, CreditCard, Receipt, Inbox } from "lucide-react";

export function ProfilePage() {
  const subscriptions = useQuery(api.paddleQueries.getUserSubscriptions);
  const transactions = useQuery(api.paddleQueries.getUserTransactions);
  const cancelSubscription = useAction(api.paddle.cancelSubscription);
  const pauseSubscription = useAction(api.paddle.pauseSubscription);
  const resumeSubscription = useAction(api.paddle.resumeSubscription);
  const getPortalUrl = useAction(api.paddle.getCustomerPortalUrl);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCancel = async (subId: string, immediately: boolean) => {
    if (
      !confirm(
        immediately
          ? "Cancel subscription immediately? You will lose access right away."
          : "Cancel at end of billing period?",
      )
    )
      return;
    setActionLoading(subId);
    try {
      await cancelSubscription({
        paddleSubscriptionId: subId,
        immediately,
      });
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (subId: string) => {
    setActionLoading(subId);
    try {
      await pauseSubscription({ paddleSubscriptionId: subId });
    } catch (err) {
      console.error("Pause error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (subId: string) => {
    setActionLoading(subId);
    try {
      await resumeSubscription({ paddleSubscriptionId: subId });
    } catch (err) {
      console.error("Resume error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      const portal = await getPortalUrl();
      if (portal?.urls?.general?.overview) {
        window.open(portal.urls.general.overview, "_blank", "noopener,noreferrer");
      } else {
        alert(
          "No portal session available. You may not have any subscriptions.",
        );
      }
    } catch (err) {
      console.error("Portal error:", err);
    }
  };

  return (
    <div className="pt-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your Account</h1>
          <p className="mt-1 text-muted-foreground">Manage subscriptions and view payment history</p>
        </div>
        <Button
          variant="outline"
          className="border-border/80"
          onClick={() => void handlePortal()}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Customer Portal
        </Button>
      </div>

      {/* Subscriptions */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary border border-border">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Subscriptions</h2>
        </div>

        {subscriptions === undefined ? (
          <LoadingPlaceholder />
        ) : subscriptions.length === 0 ? (
          <EmptyState icon={Inbox} message="No active subscriptions." />
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub: any) => (
              <div
                key={sub.paddleSubscriptionId}
                className="rounded-xl border border-border/50 bg-card/50 p-5 hover:bg-card transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <StatusBadge status={sub.status} />
                      {sub.priceId && (
                        <code className="font-mono text-xs text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded">
                          {sub.priceId}
                        </code>
                      )}
                    </div>
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      <p>
                        <span className="text-foreground/60">ID:</span>{" "}
                        <span className="font-mono text-xs">{sub.paddleSubscriptionId}</span>
                      </p>
                      {sub.currentBillingPeriodEnd && (
                        <p>
                          <span className="text-foreground/60">Period ends:</span>{" "}
                          {new Date(sub.currentBillingPeriodEnd).toLocaleDateString()}
                        </p>
                      )}
                      {sub.nextBilledAt && (
                        <p>
                          <span className="text-foreground/60">Next billing:</span>{" "}
                          {new Date(sub.nextBilledAt).toLocaleDateString()}
                        </p>
                      )}
                      {sub.scheduledChange && (
                        <p className="text-amber-400">
                          Scheduled: {JSON.stringify(sub.scheduledChange)}
                        </p>
                      )}
                      {sub.quantity && (
                        <p>
                          <span className="text-foreground/60">Seats:</span>{" "}
                          <span className="text-foreground font-medium">{sub.quantity}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {sub.status === "active" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border/80"
                          onClick={() =>
                            void handlePause(sub.paddleSubscriptionId)
                          }
                          disabled={
                            actionLoading === sub.paddleSubscriptionId
                          }
                        >
                          Pause
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            void handleCancel(
                              sub.paddleSubscriptionId,
                              false,
                            )
                          }
                          disabled={
                            actionLoading === sub.paddleSubscriptionId
                          }
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {sub.status === "paused" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          void handleResume(sub.paddleSubscriptionId)
                        }
                        disabled={
                          actionLoading === sub.paddleSubscriptionId
                        }
                      >
                        Resume
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transactions */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary border border-border">
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Payment History</h2>
        </div>

        {transactions === undefined ? (
          <LoadingPlaceholder />
        ) : transactions.length === 0 ? (
          <EmptyState icon={Inbox} message="No transactions yet." />
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground/80">Transaction</TableHead>
                  <TableHead className="text-muted-foreground/80">Status</TableHead>
                  <TableHead className="text-muted-foreground/80">Amount</TableHead>
                  <TableHead className="text-muted-foreground/80">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn: any) => (
                  <TableRow key={txn.paddleTransactionId} className="border-border/30">
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">
                        {txn.paddleTransactionId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={txn.status} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {txn.totalAmount
                        ? `${txn.currencyCode ?? "USD"} ${txn.totalAmount}`
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {txn.billedAt
                        ? new Date(txn.billedAt).toLocaleDateString()
                        : txn.createdAt
                          ? new Date(txn.createdAt).toLocaleDateString()
                          : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full rounded-xl bg-secondary/50" />
      <Skeleton className="h-12 w-full rounded-xl bg-secondary/50" />
      <Skeleton className="h-12 w-3/4 rounded-xl bg-secondary/50" />
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-12">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 border border-border">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
