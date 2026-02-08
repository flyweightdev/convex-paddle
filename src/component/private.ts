import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server.js";

// ============================================================================
// INTERNAL MUTATIONS (for webhooks and internal use)
// ============================================================================

/**
 * Max age (ms) for a "processing" lock before it's considered stale/stuck.
 * Only applies to records with status="processing". Records with
 * status="processed" (or absent, for backward compat) are permanent
 * and never expire — preventing replay attacks after TTL.
 */
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Atomically check and reserve a webhook event for processing.
 * Returns true if the event was already reserved/processed (caller should skip).
 * Returns false if the event was newly reserved (caller should process it).
 *
 * This is atomic: concurrent calls for the same event_id will be serialized
 * by Convex's OCC, so only one caller wins the reservation.
 *
 * State machine:
 *   (none) → "processing"  — lock acquired, caller should process
 *   "processing" + stale   — lock expired, re-acquire for retry
 *   "processing" + fresh   — another caller is working, skip
 *   "processed" / absent   — done permanently, skip forever
 *
 * After successful processing, call markEventProcessed to promote
 * the lock to a permanent "processed" record.
 * On failure, call unreserveEvent to delete the lock for retries.
 */
export const checkAndRecordEvent = mutation({
  args: {
    paddleEventId: v.string(),
    eventType: v.string(),
    occurredAt: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhook_events")
      .withIndex("by_paddle_event_id", (q) =>
        q.eq("paddleEventId", args.paddleEventId),
      )
      .unique();

    if (existing) {
      const status = existing.status ?? "processed"; // backward compat

      // Permanently processed — never allow reprocessing.
      // "processed_pending" is a fallback state set when the primary
      // "processed" write fails after successful processing. It is
      // equally permanent to prevent replay after TTL expiry.
      if (status === "processed" || status === "processed_pending") {
        return true;
      }

      // Active processing lock — check if it's stale
      if (status === "processing") {
        const age = Date.now() - existing.processedAt;
        if (age > LOCK_TTL_MS) {
          // Stale lock — delete and re-acquire for this caller
          await ctx.db.delete(existing._id);
        } else {
          return true; // Another caller is actively processing
        }
      }
    }

    // Acquire processing lock
    await ctx.db.insert("webhook_events", {
      paddleEventId: args.paddleEventId,
      eventType: args.eventType,
      occurredAt: args.occurredAt,
      processedAt: Date.now(),
      status: "processing",
    });

    return false; // Lock acquired — caller should process
  },
});

/**
 * Promote a processing lock to a permanent record.
 * Call this after successful event processing.
 *
 * @param status - "processed" (default) or "processed_pending" (fallback
 *   when the primary write fails). Both are treated as permanent by
 *   checkAndRecordEvent and will never expire via TTL.
 */
export const markEventProcessed = mutation({
  args: {
    paddleEventId: v.string(),
    status: v.optional(
      v.union(v.literal("processed"), v.literal("processed_pending")),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const targetStatus = args.status ?? "processed";
    const existing = await ctx.db
      .query("webhook_events")
      .withIndex("by_paddle_event_id", (q) =>
        q.eq("paddleEventId", args.paddleEventId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: targetStatus,
        processedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Remove a webhook event processing lock after failure.
 * This allows Paddle to redeliver and retry the event.
 */
export const unreserveEvent = mutation({
  args: {
    paddleEventId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhook_events")
      .withIndex("by_paddle_event_id", (q) =>
        q.eq("paddleEventId", args.paddleEventId),
      )
      .unique();

    // Only delete processing locks, never permanent records
    if (existing && (existing.status === "processing")) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});

// ============================================================================
// CUSTOMER HANDLERS
// ============================================================================

export const handleCustomerCreated = mutation({
  args: {
    paddleCustomerId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    customData: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_paddle_customer_id", (q) =>
        q.eq("paddleCustomerId", args.paddleCustomerId),
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("customers", {
        paddleCustomerId: args.paddleCustomerId,
        email: args.email,
        name: args.name,
        status: args.status,
        customData: args.customData || {},
      });
    }

    return null;
  },
});

export const handleCustomerUpdated = mutation({
  args: {
    paddleCustomerId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    customData: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_paddle_customer_id", (q) =>
        q.eq("paddleCustomerId", args.paddleCustomerId),
      )
      .unique();

    if (customer) {
      await ctx.db.patch(customer._id, {
        email: args.email,
        name: args.name,
        status: args.status,
        customData: args.customData,
      });
    } else {
      await ctx.db.insert("customers", {
        paddleCustomerId: args.paddleCustomerId,
        email: args.email,
        name: args.name,
        status: args.status,
        customData: args.customData || {},
      });
    }

    return null;
  },
});

// ============================================================================
// SUBSCRIPTION HANDLERS
// ============================================================================

export const handleSubscriptionCreated = mutation({
  args: {
    paddleSubscriptionId: v.string(),
    paddleCustomerId: v.string(),
    status: v.string(),
    priceId: v.string(),
    quantity: v.optional(v.number()),
    scheduledChange: v.optional(v.any()),
    currentBillingPeriodStart: v.optional(v.string()),
    currentBillingPeriodEnd: v.optional(v.string()),
    nextBilledAt: v.optional(v.string()),
    customData: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .unique();

    // Extract userId and orgId from customData if present
    const customData = args.customData || {};
    const userId = customData.userId as string | undefined;
    const orgId = customData.orgId as string | undefined;

    if (!existing) {
      await ctx.db.insert("subscriptions", {
        paddleSubscriptionId: args.paddleSubscriptionId,
        paddleCustomerId: args.paddleCustomerId,
        status: args.status,
        priceId: args.priceId,
        quantity: args.quantity,
        scheduledChange: args.scheduledChange,
        currentBillingPeriodStart: args.currentBillingPeriodStart,
        currentBillingPeriodEnd: args.currentBillingPeriodEnd,
        nextBilledAt: args.nextBilledAt,
        customData: customData,
        userId,
        orgId,
      });
    }

    // Backfill any transactions that were created before this subscription.
    // Process in bounded batches to avoid unbounded writes in a single mutation.
    if (userId || orgId) {
      const BATCH_SIZE = 100;
      let hasMore = true;

      while (hasMore) {
        const batch = await ctx.db
          .query("transactions")
          .withIndex("by_paddle_subscription_id", (q) =>
            q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
          )
          .take(BATCH_SIZE);

        const toUpdate = batch.filter((txn) => !txn.userId || !txn.orgId);
        for (const txn of toUpdate) {
          await ctx.db.patch(txn._id, {
            ...(userId && !txn.userId && { userId }),
            ...(orgId && !txn.orgId && { orgId }),
          });
        }

        hasMore = batch.length === BATCH_SIZE && toUpdate.length > 0;
      }
    }

    return null;
  },
});

export const handleSubscriptionUpdated = mutation({
  args: {
    paddleSubscriptionId: v.string(),
    status: v.string(),
    priceId: v.optional(v.string()),
    quantity: v.optional(v.number()),
    scheduledChange: v.optional(v.any()),
    currentBillingPeriodStart: v.optional(v.string()),
    currentBillingPeriodEnd: v.optional(v.string()),
    nextBilledAt: v.optional(v.string()),
    pausedAt: v.optional(v.string()),
    canceledAt: v.optional(v.string()),
    customData: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .unique();

    if (subscription) {
      const customData = args.customData || {};
      const userId = customData.userId as string | undefined;
      const orgId = customData.orgId as string | undefined;

      await ctx.db.patch(subscription._id, {
        status: args.status,
        ...(args.priceId !== undefined && { priceId: args.priceId }),
        quantity: args.quantity,
        scheduledChange: args.scheduledChange,
        currentBillingPeriodStart: args.currentBillingPeriodStart,
        currentBillingPeriodEnd: args.currentBillingPeriodEnd,
        nextBilledAt: args.nextBilledAt,
        pausedAt: args.pausedAt,
        canceledAt: args.canceledAt,
        ...(args.customData !== undefined && { customData }),
        ...(userId !== undefined && { userId }),
        ...(orgId !== undefined && { orgId }),
      });
    }

    return null;
  },
});

export const handleSubscriptionCanceled = mutation({
  args: {
    paddleSubscriptionId: v.string(),
    canceledAt: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .unique();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        status: "canceled",
        canceledAt: args.canceledAt,
        scheduledChange: undefined,
      });
    }

    return null;
  },
});

export const handleSubscriptionPaused = mutation({
  args: {
    paddleSubscriptionId: v.string(),
    pausedAt: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .unique();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        status: "paused",
        pausedAt: args.pausedAt,
      });
    }

    return null;
  },
});

export const handleSubscriptionResumed = mutation({
  args: {
    paddleSubscriptionId: v.string(),
    nextBilledAt: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .unique();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        status: "active",
        pausedAt: undefined,
        nextBilledAt: args.nextBilledAt,
      });
    }

    return null;
  },
});

export const handleSubscriptionActivated = mutation({
  args: {
    paddleSubscriptionId: v.string(),
    nextBilledAt: v.optional(v.string()),
    currentBillingPeriodStart: v.optional(v.string()),
    currentBillingPeriodEnd: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .unique();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        status: "active",
        nextBilledAt: args.nextBilledAt,
        currentBillingPeriodStart: args.currentBillingPeriodStart,
        currentBillingPeriodEnd: args.currentBillingPeriodEnd,
      });
    }

    return null;
  },
});

// ============================================================================
// TRANSACTION HANDLERS
// ============================================================================

export const handleTransactionCreated = mutation({
  args: {
    paddleTransactionId: v.string(),
    paddleCustomerId: v.optional(v.string()),
    paddleSubscriptionId: v.optional(v.string()),
    status: v.string(),
    currencyCode: v.optional(v.string()),
    totalAmount: v.optional(v.string()),
    collectionMode: v.optional(v.string()),
    billedAt: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    customData: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_paddle_transaction_id", (q) =>
        q.eq("paddleTransactionId", args.paddleTransactionId),
      )
      .unique();

    if (!existing) {
      // Look up userId/orgId from subscription if available
      let userId: string | undefined;
      let orgId: string | undefined;

      const customData = args.customData || {};
      userId = customData.userId as string | undefined;
      orgId = customData.orgId as string | undefined;

      if (!userId && !orgId && args.paddleSubscriptionId) {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_paddle_subscription_id", (q) =>
            q.eq("paddleSubscriptionId", args.paddleSubscriptionId!),
          )
          .unique();

        if (subscription) {
          userId = subscription.userId;
          orgId = subscription.orgId;
        }
      }

      await ctx.db.insert("transactions", {
        paddleTransactionId: args.paddleTransactionId,
        paddleCustomerId: args.paddleCustomerId,
        paddleSubscriptionId: args.paddleSubscriptionId,
        status: args.status,
        currencyCode: args.currencyCode,
        totalAmount: args.totalAmount,
        collectionMode: args.collectionMode,
        billedAt: args.billedAt,
        createdAt: args.createdAt,
        customData: customData,
        userId,
        orgId,
      });
    }

    return null;
  },
});

export const handleTransactionUpdated = mutation({
  args: {
    paddleTransactionId: v.string(),
    status: v.string(),
    totalAmount: v.optional(v.string()),
    billedAt: v.optional(v.string()),
    customData: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_paddle_transaction_id", (q) =>
        q.eq("paddleTransactionId", args.paddleTransactionId),
      )
      .unique();

    if (transaction) {
      await ctx.db.patch(transaction._id, {
        status: args.status,
        ...(args.totalAmount !== undefined && {
          totalAmount: args.totalAmount,
        }),
        ...(args.billedAt !== undefined && { billedAt: args.billedAt }),
        ...(args.customData !== undefined && {
          customData: args.customData,
        }),
      });
    }

    return null;
  },
});

export const handleTransactionCompleted = mutation({
  args: {
    paddleTransactionId: v.string(),
    paddleCustomerId: v.optional(v.string()),
    paddleSubscriptionId: v.optional(v.string()),
    totalAmount: v.optional(v.string()),
    billedAt: v.optional(v.string()),
    customData: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_paddle_transaction_id", (q) =>
        q.eq("paddleTransactionId", args.paddleTransactionId),
      )
      .unique();

    if (transaction) {
      await ctx.db.patch(transaction._id, {
        status: "completed",
        ...(args.totalAmount !== undefined && {
          totalAmount: args.totalAmount,
        }),
        ...(args.billedAt !== undefined && { billedAt: args.billedAt }),
        ...(args.paddleCustomerId !== undefined && {
          paddleCustomerId: args.paddleCustomerId,
        }),
        ...(args.paddleSubscriptionId !== undefined && {
          paddleSubscriptionId: args.paddleSubscriptionId,
        }),
      });
    } else {
      // Transaction may not exist yet - create it
      let userId: string | undefined;
      let orgId: string | undefined;

      const customData = args.customData || {};
      userId = customData.userId as string | undefined;
      orgId = customData.orgId as string | undefined;

      if (!userId && !orgId && args.paddleSubscriptionId) {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_paddle_subscription_id", (q) =>
            q.eq("paddleSubscriptionId", args.paddleSubscriptionId!),
          )
          .unique();

        if (subscription) {
          userId = subscription.userId;
          orgId = subscription.orgId;
        }
      }

      await ctx.db.insert("transactions", {
        paddleTransactionId: args.paddleTransactionId,
        paddleCustomerId: args.paddleCustomerId,
        paddleSubscriptionId: args.paddleSubscriptionId,
        status: "completed",
        totalAmount: args.totalAmount,
        billedAt: args.billedAt,
        customData,
        userId,
        orgId,
      });
    }

    return null;
  },
});

// ============================================================================
// ADJUSTMENT HANDLERS
// ============================================================================

export const handleAdjustmentCreated = mutation({
  args: {
    paddleAdjustmentId: v.string(),
    paddleTransactionId: v.string(),
    paddleCustomerId: v.optional(v.string()),
    paddleSubscriptionId: v.optional(v.string()),
    action: v.string(),
    reason: v.optional(v.string()),
    status: v.string(),
    totalAmount: v.optional(v.string()),
    currencyCode: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adjustments")
      .withIndex("by_paddle_adjustment_id", (q) =>
        q.eq("paddleAdjustmentId", args.paddleAdjustmentId),
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("adjustments", {
        paddleAdjustmentId: args.paddleAdjustmentId,
        paddleTransactionId: args.paddleTransactionId,
        paddleCustomerId: args.paddleCustomerId,
        paddleSubscriptionId: args.paddleSubscriptionId,
        action: args.action,
        reason: args.reason,
        status: args.status,
        totalAmount: args.totalAmount,
        currencyCode: args.currencyCode,
        createdAt: args.createdAt,
      });
    }

    return null;
  },
});

export const handleAdjustmentUpdated = mutation({
  args: {
    paddleAdjustmentId: v.string(),
    status: v.string(),
    totalAmount: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adjustment = await ctx.db
      .query("adjustments")
      .withIndex("by_paddle_adjustment_id", (q) =>
        q.eq("paddleAdjustmentId", args.paddleAdjustmentId),
      )
      .unique();

    if (adjustment) {
      await ctx.db.patch(adjustment._id, {
        status: args.status,
        ...(args.totalAmount !== undefined && {
          totalAmount: args.totalAmount,
        }),
      });
    }

    return null;
  },
});

// ============================================================================
// UTILITY MUTATIONS
// ============================================================================

export const updateSubscriptionQuantityInternal = internalMutation({
  args: {
    paddleSubscriptionId: v.string(),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .unique();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        quantity: args.quantity,
      });
    }

    return null;
  },
});

export const updateTransactionCustomer = mutation({
  args: {
    paddleTransactionId: v.string(),
    paddleCustomerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_paddle_transaction_id", (q) =>
        q.eq("paddleTransactionId", args.paddleTransactionId),
      )
      .unique();

    if (transaction && !transaction.paddleCustomerId) {
      await ctx.db.patch(transaction._id, {
        paddleCustomerId: args.paddleCustomerId,
      });
    }

    return null;
  },
});
