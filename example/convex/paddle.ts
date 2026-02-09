"use node";

import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { PaddleBilling } from "@flyweightdev/convex-paddle";
import { v } from "convex/values";

const paddleClient = new PaddleBilling(components.paddle, {
  sandbox: process.env.PADDLE_SANDBOX === "true",
});

/** Helper to get the authenticated user identity or throw. */
async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

/**
 * Verify the authenticated user owns a subscription.
 * Looks up the subscription in the component DB and checks userId match.
 */
async function requireSubscriptionOwnership(
  ctx: any,
  identity: { subject: string },
  paddleSubscriptionId: string,
) {
  const sub = await ctx.runQuery(
    components.paddle.public.getSubscription,
    { paddleSubscriptionId },
  );
  if (!sub) throw new Error("Subscription not found");
  if (sub.userId !== identity.subject) {
    throw new Error("Not authorized to manage this subscription");
  }
  return sub;
}

// ============================================================================
// INPUT VALIDATION HELPERS
// ============================================================================

/** Validate that a price ID has the expected Paddle format. */
function validatePriceId(priceId: string) {
  if (!priceId.startsWith("pri_")) {
    throw new Error("Invalid price ID format");
  }
}

/** Validate quantity is a positive integer within reasonable bounds. */
function validateQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
    throw new Error("Quantity must be an integer between 1 and 1000");
  }
}

/**
 * Require the caller to have an admin or owner role in their org.
 * Reads the org_role claim from the auth token.
 * Clerk emits roles like "org:admin" / "org:member", so we normalize
 * by stripping the "org:" prefix before comparing.
 */
function requireOrgAdmin(identity: any) {
  const role = identity.org_role as string | undefined;
  const normalized = role?.replace(/^org:/, "");
  if (!normalized || !["admin", "owner"].includes(normalized)) {
    throw new Error(
      "Insufficient organization role. " +
      "Team billing requires admin or owner role."
    );
  }
}

// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

/**
 * Get or create a Paddle customer for the authenticated user.
 * Prefers the verified email from the auth identity token.
 * Falls back to client-provided email for auth providers
 * that don't include email in the token.
 */
export const getOrCreateCustomer = action({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.object({
    customerId: v.string(),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const email = identity.email ?? args.email;
    const emailTrusted = !!identity.email;
    if (!email) throw new Error("Email required: ensure auth token includes email or pass as argument");

    return await paddleClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email,
      name: args.name ?? identity.name,
      emailTrusted,
    });
  },
});

// ============================================================================
// CHECKOUT
// ============================================================================

/**
 * Create a checkout transaction for a subscription.
 */
export const createSubscriptionCheckout = action({
  args: {
    priceId: v.string(),
    quantity: v.optional(v.number()),
    email: v.optional(v.string()),
  },
  returns: v.object({
    transactionId: v.string(),
    checkoutUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    validatePriceId(args.priceId);
    const quantity = args.quantity ?? 1;
    validateQuantity(quantity);
    const email = identity.email ?? args.email;
    const emailTrusted = !!identity.email;
    if (!email) throw new Error("Email required: ensure auth token includes email or pass as argument");

    const customer = await paddleClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email,
      name: identity.name,
      emailTrusted,
    });

    return await paddleClient.createTransaction(ctx, {
      items: [
        {
          priceId: args.priceId,
          quantity,
        },
      ],
      customerId: customer.customerId,
      customData: { userId: identity.subject },
    });
  },
});

/**
 * Create a checkout transaction for a one-time payment.
 */
export const createPaymentCheckout = action({
  args: {
    priceId: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.object({
    transactionId: v.string(),
    checkoutUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    validatePriceId(args.priceId);
    const email = identity.email ?? args.email;
    const emailTrusted = !!identity.email;
    if (!email) throw new Error("Email required: ensure auth token includes email or pass as argument");

    const customer = await paddleClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email,
      name: identity.name,
      emailTrusted,
    });

    return await paddleClient.createTransaction(ctx, {
      items: [{ priceId: args.priceId, quantity: 1 }],
      customerId: customer.customerId,
      customData: { userId: identity.subject, priceId: args.priceId },
    });
  },
});

/**
 * Create a checkout for a team subscription.
 * The org ID is derived from the auth token's org_id claim — not from client input.
 * If your auth provider doesn't set org_id, replace the orgId resolution below
 * with your own org membership lookup (e.g. query an org_members table).
 */
export const createTeamSubscriptionCheckout = action({
  args: {
    priceId: v.string(),
    quantity: v.optional(v.number()),
    email: v.optional(v.string()),
  },
  returns: v.object({
    transactionId: v.string(),
    checkoutUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    validatePriceId(args.priceId);
    const quantity = args.quantity ?? 1;
    validateQuantity(quantity);
    const email = identity.email ?? args.email;
    const emailTrusted = !!identity.email;
    if (!email) throw new Error("Email required: ensure auth token includes email or pass as argument");

    // Org ID must come from a trusted source — never from client input.
    // Here we use the auth token's org_id claim (set by Clerk, Auth0, etc.).
    // If your auth provider doesn't include org_id, replace this with a
    // server-side org membership lookup.
    const orgId = (identity as any).org_id as string | undefined;
    if (!orgId) {
      throw new Error(
        "No org_id claim in auth token. " +
        "Team billing requires an auth provider that includes organization claims, " +
        "or implement a server-side org membership check."
      );
    }

    // Only org admins/owners can create team subscriptions.
    requireOrgAdmin(identity);

    const customer = await paddleClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email,
      name: identity.name,
      emailTrusted,
    });

    return await paddleClient.createTransaction(ctx, {
      items: [
        {
          priceId: args.priceId,
          quantity,
        },
      ],
      customerId: customer.customerId,
      customData: {
        userId: identity.subject,
        orgId,
      },
    });
  },
});

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Cancel a subscription.
 */
export const cancelSubscription = action({
  args: {
    paddleSubscriptionId: v.string(),
    immediately: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    await requireSubscriptionOwnership(ctx, identity, args.paddleSubscriptionId);

    return await paddleClient.cancelSubscription(ctx, {
      paddleSubscriptionId: args.paddleSubscriptionId,
      effectiveFrom: args.immediately
        ? "immediately"
        : "next_billing_period",
    });
  },
});

/**
 * Pause a subscription.
 */
export const pauseSubscription = action({
  args: {
    paddleSubscriptionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    await requireSubscriptionOwnership(ctx, identity, args.paddleSubscriptionId);

    return await paddleClient.pauseSubscription(ctx, {
      paddleSubscriptionId: args.paddleSubscriptionId,
    });
  },
});

/**
 * Resume a paused subscription.
 */
export const resumeSubscription = action({
  args: {
    paddleSubscriptionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    await requireSubscriptionOwnership(ctx, identity, args.paddleSubscriptionId);

    return await paddleClient.resumeSubscription(ctx, {
      paddleSubscriptionId: args.paddleSubscriptionId,
    });
  },
});

/**
 * Update seat count for a subscription.
 */
export const updateSeats = action({
  args: {
    paddleSubscriptionId: v.string(),
    priceId: v.string(),
    seatCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    validatePriceId(args.priceId);
    validateQuantity(args.seatCount);
    await requireSubscriptionOwnership(ctx, identity, args.paddleSubscriptionId);

    return await paddleClient.updateSubscriptionQuantity(ctx, {
      paddleSubscriptionId: args.paddleSubscriptionId,
      priceId: args.priceId,
      quantity: args.seatCount,
    });
  },
});

/**
 * Get a customer portal session URL.
 */
export const getCustomerPortalUrl = action({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);

    const subs = await ctx.runQuery(
      components.paddle.public.listSubscriptionsByUserId,
      { userId: identity.subject },
    );

    if (subs.length === 0) return null;

    const customerId = subs[0].paddleCustomerId;
    const subscriptionIds = subs.map((s) => s.paddleSubscriptionId);

    return await paddleClient.createCustomerPortalSession(ctx, {
      customerId,
      subscriptionIds,
    });
  },
});

// ============================================================================
// PRICING
// ============================================================================

/**
 * Fetch live pricing from Paddle's pricing preview API.
 * Returns formatted prices for the given price IDs in the requested currency.
 */
export const getPricingPreview = action({
  args: {
    priceIds: v.array(v.string()),
    currencyCode: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      priceId: v.string(),
      name: v.string(),
      description: v.string(),
      type: v.string(),
      billingCycle: v.union(
        v.object({ interval: v.string(), frequency: v.number() }),
        v.null(),
      ),
      unitPrice: v.string(),
      currencyCode: v.string(),
      formatted: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "PADDLE_API_KEY environment variable is not set. " +
        "Add it to your Convex dashboard environment variables."
      );
    }

    const baseUrl =
      process.env.PADDLE_SANDBOX === "true"
        ? "https://sandbox-api.paddle.com"
        : "https://api.paddle.com";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let result: any;
    try {
      const response = await fetch(`${baseUrl}/pricing-preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: args.priceIds.map((id) => ({ price_id: id, quantity: 1 })),
          currency_code: args.currencyCode ?? "USD",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Paddle API error (pricing preview):", errorBody);
        throw new Error("Failed to fetch pricing");
      }

      result = await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
    const items = result.data?.details?.line_items ?? [];

    return items.map((item: any) => ({
      priceId: item.price.id,
      name: item.price.name ?? item.price.description ?? item.price.id,
      description: item.price.description ?? "",
      type: item.price.type,
      billingCycle: item.price.billing_cycle
        ? {
            interval: item.price.billing_cycle.interval,
            frequency: item.price.billing_cycle.frequency,
          }
        : null,
      unitPrice: item.formatted_unit_totals?.total ?? item.unit_totals?.total ?? "0",
      currencyCode: result.data?.currency_code ?? args.currencyCode ?? "USD",
      formatted: item.formatted_totals?.total ?? item.totals?.total ?? "0",
    }));
  },
});

