import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  customers: defineTable({
    paddleCustomerId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    customData: v.optional(v.any()),
  })
    .index("by_paddle_customer_id", ["paddleCustomerId"])
    .index("by_email", ["email"]),

  subscriptions: defineTable({
    paddleSubscriptionId: v.string(),
    paddleCustomerId: v.string(),
    status: v.string(),
    priceId: v.string(),
    quantity: v.optional(v.number()),
    scheduledChange: v.optional(v.any()),
    currentBillingPeriodStart: v.optional(v.string()),
    currentBillingPeriodEnd: v.optional(v.string()),
    nextBilledAt: v.optional(v.string()),
    pausedAt: v.optional(v.string()),
    canceledAt: v.optional(v.string()),
    customData: v.optional(v.any()),
    // Custom lookup fields for efficient querying
    userId: v.optional(v.string()),
    orgId: v.optional(v.string()),
  })
    .index("by_paddle_subscription_id", ["paddleSubscriptionId"])
    .index("by_paddle_customer_id", ["paddleCustomerId"])
    .index("by_user_id", ["userId"])
    .index("by_org_id", ["orgId"]),

  transactions: defineTable({
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
    // Custom lookup fields for efficient querying
    userId: v.optional(v.string()),
    orgId: v.optional(v.string()),
  })
    .index("by_paddle_transaction_id", ["paddleTransactionId"])
    .index("by_paddle_customer_id", ["paddleCustomerId"])
    .index("by_paddle_subscription_id", ["paddleSubscriptionId"])
    .index("by_user_id", ["userId"])
    .index("by_org_id", ["orgId"]),

  adjustments: defineTable({
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
  })
    .index("by_paddle_adjustment_id", ["paddleAdjustmentId"])
    .index("by_paddle_transaction_id", ["paddleTransactionId"]),

  webhook_events: defineTable({
    paddleEventId: v.string(),
    eventType: v.string(),
    occurredAt: v.string(),
    processedAt: v.number(),
    // "processing"        = lock held, subject to TTL expiry
    // "processed"         = completed successfully, permanent (never expires)
    // "processed_pending" = fallback permanent state when "processed" write fails
    // Absent              = treated as "processed" for backward compatibility
    status: v.optional(
      v.union(
        v.literal("processing"),
        v.literal("processed"),
        v.literal("processed_pending"),
      ),
    ),
  }).index("by_paddle_event_id", ["paddleEventId"]),
});
