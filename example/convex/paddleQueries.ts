import { query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

/**
 * List subscriptions for the current user.
 */
export const getUserSubscriptions = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.runQuery(
      components.paddle.public.listSubscriptionsByUserId,
      { userId: identity.subject },
    );
  },
});

/**
 * List transactions for the current user.
 */
export const getUserTransactions = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.runQuery(
      components.paddle.public.listTransactionsByUserId,
      { userId: identity.subject },
    );
  },
});

/**
 * Count completed one-time purchases for a specific price ID.
 * Uses customData.priceId stored at checkout time.
 */
export const countUserPurchases = query({
  args: { priceId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const transactions = await ctx.runQuery(
      components.paddle.public.listTransactionsByUserId,
      { userId: identity.subject },
    );

    return transactions.filter(
      (t: any) =>
        t.status === "completed" &&
        t.customData?.priceId === args.priceId,
    ).length;
  },
});

/**
 * Get the subscription for the caller's organization.
 * The org ID is derived from the auth token's org_id claim — not from client input.
 * If your auth provider doesn't set org_id, replace the orgId resolution below
 * with your own org membership lookup.
 */
export const getOrgSubscription = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Org ID from the auth token — never from client input.
    const orgId = (identity as any).org_id as string | undefined;
    if (!orgId) return null;

    return await ctx.runQuery(
      components.paddle.public.getSubscriptionByOrgId,
      { orgId },
    );
  },
});
