/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    private: {
      checkAndRecordEvent: FunctionReference<
        "mutation",
        "internal",
        { eventType: string; occurredAt: string; paddleEventId: string },
        boolean,
        Name
      >;
      handleAdjustmentCreated: FunctionReference<
        "mutation",
        "internal",
        {
          action: string;
          createdAt?: string;
          currencyCode?: string;
          paddleAdjustmentId: string;
          paddleCustomerId?: string;
          paddleSubscriptionId?: string;
          paddleTransactionId: string;
          reason?: string;
          status: string;
          totalAmount?: string;
        },
        null,
        Name
      >;
      handleAdjustmentUpdated: FunctionReference<
        "mutation",
        "internal",
        { paddleAdjustmentId: string; status: string; totalAmount?: string },
        null,
        Name
      >;
      handleCustomerCreated: FunctionReference<
        "mutation",
        "internal",
        {
          customData?: any;
          email?: string;
          name?: string;
          paddleCustomerId: string;
          status?: string;
        },
        null,
        Name
      >;
      handleCustomerUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          customData?: any;
          email?: string;
          name?: string;
          paddleCustomerId: string;
          status?: string;
        },
        null,
        Name
      >;
      handleSubscriptionActivated: FunctionReference<
        "mutation",
        "internal",
        {
          currentBillingPeriodEnd?: string;
          currentBillingPeriodStart?: string;
          nextBilledAt?: string;
          paddleSubscriptionId: string;
        },
        null,
        Name
      >;
      handleSubscriptionCanceled: FunctionReference<
        "mutation",
        "internal",
        { canceledAt?: string; paddleSubscriptionId: string },
        null,
        Name
      >;
      handleSubscriptionCreated: FunctionReference<
        "mutation",
        "internal",
        {
          currentBillingPeriodEnd?: string;
          currentBillingPeriodStart?: string;
          customData?: any;
          nextBilledAt?: string;
          paddleCustomerId: string;
          paddleSubscriptionId: string;
          priceId: string;
          quantity?: number;
          scheduledChange?: any;
          status: string;
        },
        null,
        Name
      >;
      handleSubscriptionPaused: FunctionReference<
        "mutation",
        "internal",
        { paddleSubscriptionId: string; pausedAt?: string },
        null,
        Name
      >;
      handleSubscriptionResumed: FunctionReference<
        "mutation",
        "internal",
        { nextBilledAt?: string; paddleSubscriptionId: string },
        null,
        Name
      >;
      handleSubscriptionUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          canceledAt?: string;
          currentBillingPeriodEnd?: string;
          currentBillingPeriodStart?: string;
          customData?: any;
          nextBilledAt?: string;
          paddleSubscriptionId: string;
          pausedAt?: string;
          priceId?: string;
          quantity?: number;
          scheduledChange?: any;
          status: string;
        },
        null,
        Name
      >;
      handleTransactionCompleted: FunctionReference<
        "mutation",
        "internal",
        {
          billedAt?: string;
          customData?: any;
          paddleCustomerId?: string;
          paddleSubscriptionId?: string;
          paddleTransactionId: string;
          totalAmount?: string;
        },
        null,
        Name
      >;
      handleTransactionCreated: FunctionReference<
        "mutation",
        "internal",
        {
          billedAt?: string;
          collectionMode?: string;
          createdAt?: string;
          currencyCode?: string;
          customData?: any;
          paddleCustomerId?: string;
          paddleSubscriptionId?: string;
          paddleTransactionId: string;
          status: string;
          totalAmount?: string;
        },
        null,
        Name
      >;
      handleTransactionUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          billedAt?: string;
          customData?: any;
          paddleTransactionId: string;
          status: string;
          totalAmount?: string;
        },
        null,
        Name
      >;
      markEventProcessed: FunctionReference<
        "mutation",
        "internal",
        { paddleEventId: string; status?: "processed" | "processed_pending" },
        null,
        Name
      >;
      unreserveEvent: FunctionReference<
        "mutation",
        "internal",
        { paddleEventId: string },
        null,
        Name
      >;
      updateTransactionCustomer: FunctionReference<
        "mutation",
        "internal",
        { paddleCustomerId: string; paddleTransactionId: string },
        null,
        Name
      >;
    };
    public: {
      createOrUpdateCustomer: FunctionReference<
        "mutation",
        "internal",
        {
          customData?: any;
          email?: string;
          name?: string;
          paddleCustomerId: string;
          status?: string;
        },
        string,
        Name
      >;
      getCustomer: FunctionReference<
        "query",
        "internal",
        { paddleCustomerId: string },
        {
          customData?: any;
          email?: string;
          name?: string;
          paddleCustomerId: string;
          status?: string;
        } | null,
        Name
      >;
      getCustomerByEmail: FunctionReference<
        "query",
        "internal",
        { email: string },
        {
          customData?: any;
          email?: string;
          name?: string;
          paddleCustomerId: string;
          status?: string;
        } | null,
        Name
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { paddleSubscriptionId: string },
        {
          canceledAt?: string;
          currentBillingPeriodEnd?: string;
          currentBillingPeriodStart?: string;
          customData?: any;
          nextBilledAt?: string;
          orgId?: string;
          paddleCustomerId: string;
          paddleSubscriptionId: string;
          pausedAt?: string;
          priceId: string;
          quantity?: number;
          scheduledChange?: any;
          status: string;
          userId?: string;
        } | null,
        Name
      >;
      getSubscriptionByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        {
          canceledAt?: string;
          currentBillingPeriodEnd?: string;
          currentBillingPeriodStart?: string;
          customData?: any;
          nextBilledAt?: string;
          orgId?: string;
          paddleCustomerId: string;
          paddleSubscriptionId: string;
          pausedAt?: string;
          priceId: string;
          quantity?: number;
          scheduledChange?: any;
          status: string;
          userId?: string;
        } | null,
        Name
      >;
      getTransaction: FunctionReference<
        "query",
        "internal",
        { paddleTransactionId: string },
        {
          billedAt?: string;
          collectionMode?: string;
          createdAt?: string;
          currencyCode?: string;
          customData?: any;
          orgId?: string;
          paddleCustomerId?: string;
          paddleSubscriptionId?: string;
          paddleTransactionId: string;
          status: string;
          totalAmount?: string;
          userId?: string;
        } | null,
        Name
      >;
      listAdjustments: FunctionReference<
        "query",
        "internal",
        { paddleTransactionId: string },
        Array<{
          action: string;
          createdAt?: string;
          currencyCode?: string;
          paddleAdjustmentId: string;
          paddleCustomerId?: string;
          paddleSubscriptionId?: string;
          paddleTransactionId: string;
          reason?: string;
          status: string;
          totalAmount?: string;
        }>,
        Name
      >;
      listSubscriptions: FunctionReference<
        "query",
        "internal",
        { paddleCustomerId: string },
        Array<{
          canceledAt?: string;
          currentBillingPeriodEnd?: string;
          currentBillingPeriodStart?: string;
          customData?: any;
          nextBilledAt?: string;
          orgId?: string;
          paddleCustomerId: string;
          paddleSubscriptionId: string;
          pausedAt?: string;
          priceId: string;
          quantity?: number;
          scheduledChange?: any;
          status: string;
          userId?: string;
        }>,
        Name
      >;
      listSubscriptionsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          canceledAt?: string;
          currentBillingPeriodEnd?: string;
          currentBillingPeriodStart?: string;
          customData?: any;
          nextBilledAt?: string;
          orgId?: string;
          paddleCustomerId: string;
          paddleSubscriptionId: string;
          pausedAt?: string;
          priceId: string;
          quantity?: number;
          scheduledChange?: any;
          status: string;
          userId?: string;
        }>,
        Name
      >;
      listTransactions: FunctionReference<
        "query",
        "internal",
        { paddleCustomerId: string },
        Array<{
          billedAt?: string;
          collectionMode?: string;
          createdAt?: string;
          currencyCode?: string;
          customData?: any;
          orgId?: string;
          paddleCustomerId?: string;
          paddleSubscriptionId?: string;
          paddleTransactionId: string;
          status: string;
          totalAmount?: string;
          userId?: string;
        }>,
        Name
      >;
      listTransactionsByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          billedAt?: string;
          collectionMode?: string;
          createdAt?: string;
          currencyCode?: string;
          customData?: any;
          orgId?: string;
          paddleCustomerId?: string;
          paddleSubscriptionId?: string;
          paddleTransactionId: string;
          status: string;
          totalAmount?: string;
          userId?: string;
        }>,
        Name
      >;
      listTransactionsBySubscription: FunctionReference<
        "query",
        "internal",
        { paddleSubscriptionId: string },
        Array<{
          billedAt?: string;
          collectionMode?: string;
          createdAt?: string;
          currencyCode?: string;
          customData?: any;
          orgId?: string;
          paddleCustomerId?: string;
          paddleSubscriptionId?: string;
          paddleTransactionId: string;
          status: string;
          totalAmount?: string;
          userId?: string;
        }>,
        Name
      >;
      listTransactionsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          billedAt?: string;
          collectionMode?: string;
          createdAt?: string;
          currencyCode?: string;
          customData?: any;
          orgId?: string;
          paddleCustomerId?: string;
          paddleSubscriptionId?: string;
          paddleTransactionId: string;
          status: string;
          totalAmount?: string;
          userId?: string;
        }>,
        Name
      >;
      updateSubscriptionMetadata: FunctionReference<
        "mutation",
        "internal",
        {
          customData: any;
          orgId?: string;
          paddleSubscriptionId: string;
          userId?: string;
        },
        null,
        Name
      >;
      updateSubscriptionQuantity: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          paddleSubscriptionId: string;
          priceId: string;
          quantity: number;
          sandbox?: boolean;
        },
        null,
        Name
      >;
    };
  };
