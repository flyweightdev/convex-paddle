import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import schema from "./schema.js";

// ============================================================================
// VALIDATOR HELPERS
// ============================================================================

const customerValidator = schema.tables.customers.validator;
const subscriptionValidator = schema.tables.subscriptions.validator;
const transactionValidator = schema.tables.transactions.validator;
const adjustmentValidator = schema.tables.adjustments.validator;

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get a customer by their Paddle customer ID.
 */
export const getCustomer = query({
  args: { paddleCustomerId: v.string() },
  returns: v.union(customerValidator, v.null()),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_paddle_customer_id", (q) =>
        q.eq("paddleCustomerId", args.paddleCustomerId),
      )
      .unique();
    if (!customer) return null;
    const { _id, _creationTime, ...data } = customer;
    return data;
  },
});

/**
 * Get a customer by email.
 */
export const getCustomerByEmail = query({
  args: { email: v.string() },
  returns: v.union(customerValidator, v.null()),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!customer) return null;
    const { _id, _creationTime, ...data } = customer;
    return data;
  },
});

/**
 * Get a subscription by its Paddle subscription ID.
 */
export const getSubscription = query({
  args: { paddleSubscriptionId: v.string() },
  returns: v.union(subscriptionValidator, v.null()),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .unique();
    if (!subscription) return null;
    const { _id, _creationTime, ...data } = subscription;
    return data;
  },
});

/**
 * List all subscriptions for a customer.
 */
export const listSubscriptions = query({
  args: { paddleCustomerId: v.string() },
  returns: v.array(subscriptionValidator),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_customer_id", (q) =>
        q.eq("paddleCustomerId", args.paddleCustomerId),
      )
      .collect();
    return subscriptions.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * List all subscriptions for a user ID.
 */
export const listSubscriptionsByUserId = query({
  args: { userId: v.string() },
  returns: v.array(subscriptionValidator),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return subscriptions.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * Get a subscription by organization ID.
 */
export const getSubscriptionByOrgId = query({
  args: { orgId: v.string() },
  returns: v.union(subscriptionValidator, v.null()),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();
    if (subscriptions.length === 0) return null;
    // Prefer active subscription for deterministic results when
    // multiple org subscriptions exist (e.g. canceled + active).
    const active = subscriptions.find((s) => s.status === "active");
    const chosen = active ?? subscriptions[0];
    const { _id, _creationTime, ...data } = chosen;
    return data;
  },
});

/**
 * Get a transaction by its Paddle transaction ID.
 */
export const getTransaction = query({
  args: { paddleTransactionId: v.string() },
  returns: v.union(transactionValidator, v.null()),
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_paddle_transaction_id", (q) =>
        q.eq("paddleTransactionId", args.paddleTransactionId),
      )
      .unique();
    if (!transaction) return null;
    const { _id, _creationTime, ...data } = transaction;
    return data;
  },
});

/**
 * List transactions for a customer.
 */
export const listTransactions = query({
  args: { paddleCustomerId: v.string() },
  returns: v.array(transactionValidator),
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_paddle_customer_id", (q) =>
        q.eq("paddleCustomerId", args.paddleCustomerId),
      )
      .collect();
    return transactions.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * List transactions for a user ID.
 */
export const listTransactionsByUserId = query({
  args: { userId: v.string() },
  returns: v.array(transactionValidator),
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return transactions.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * List transactions for an organization ID.
 */
export const listTransactionsByOrgId = query({
  args: { orgId: v.string() },
  returns: v.array(transactionValidator),
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();
    return transactions.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * List transactions for a subscription.
 */
export const listTransactionsBySubscription = query({
  args: { paddleSubscriptionId: v.string() },
  returns: v.array(transactionValidator),
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .collect();
    return transactions.map(({ _id, _creationTime, ...data }) => data);
  },
});

/**
 * List adjustments for a transaction.
 */
export const listAdjustments = query({
  args: { paddleTransactionId: v.string() },
  returns: v.array(adjustmentValidator),
  handler: async (ctx, args) => {
    const adjustments = await ctx.db
      .query("adjustments")
      .withIndex("by_paddle_transaction_id", (q) =>
        q.eq("paddleTransactionId", args.paddleTransactionId),
      )
      .collect();
    return adjustments.map(({ _id, _creationTime, ...data }) => data);
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Create or update a customer record.
 */
export const createOrUpdateCustomer = mutation({
  args: {
    paddleCustomerId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    customData: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_paddle_customer_id", (q) =>
        q.eq("paddleCustomerId", args.paddleCustomerId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
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
        customData: args.customData,
      });
    }
    return args.paddleCustomerId;
  },
});

/**
 * Update subscription metadata for custom lookups.
 */
export const updateSubscriptionMetadata = mutation({
  args: {
    paddleSubscriptionId: v.string(),
    customData: v.any(),
    userId: v.optional(v.string()),
    orgId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_subscription_id", (q) =>
        q.eq("paddleSubscriptionId", args.paddleSubscriptionId),
      )
      .unique();

    if (!subscription) {
      throw new Error(
        `Subscription ${args.paddleSubscriptionId} not found in database`,
      );
    }

    await ctx.db.patch(subscription._id, {
      customData: args.customData,
      userId: args.userId,
      orgId: args.orgId,
    });

    return null;
  },
});

/**
 * Update subscription quantity (for seat-based pricing).
 * Calls the Paddle API and updates the local database.
 */
export const updateSubscriptionQuantity = action({
  args: {
    paddleSubscriptionId: v.string(),
    priceId: v.string(),
    quantity: v.number(),
    apiKey: v.string(),
    sandbox: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { Paddle, Environment } = await import("@paddle/paddle-node-sdk");
    const paddle = new Paddle(args.apiKey, {
      environment: args.sandbox ? Environment.sandbox : Environment.production,
    });

    await paddle.subscriptions.update(args.paddleSubscriptionId, {
      items: [
        {
          priceId: args.priceId,
          quantity: args.quantity,
        },
      ],
      prorationBillingMode: "prorated_immediately",
    });

    await ctx.runMutation(internal.private.updateSubscriptionQuantityInternal, {
      paddleSubscriptionId: args.paddleSubscriptionId,
      quantity: args.quantity,
    });

    return null;
  },
});
