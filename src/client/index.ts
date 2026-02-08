import { httpActionGeneric } from "convex/server";
import type {
  ActionCtx,
  HttpRouter,
  PaddleEventHandlers,
  PaddleEventType,
  PaddleWebhookEvent,
  RegisterRoutesConfig,
} from "./types.js";
import type { ComponentApi } from "../component/_generated/component.js";

export type PaddleComponent = ComponentApi;

export type { RegisterRoutesConfig, PaddleEventHandlers, PaddleWebhookEvent };

/**
 * Paddle Billing Component Client
 *
 * Provides methods for managing Paddle customers, subscriptions, transactions,
 * and webhooks through Convex.
 */
export class PaddleBilling {
  private _apiKey: string;
  private _sandbox: boolean;

  constructor(
    public component: PaddleComponent,
    options?: {
      PADDLE_API_KEY?: string;
      sandbox?: boolean;
    },
  ) {
    this._apiKey = options?.PADDLE_API_KEY ?? process.env.PADDLE_API_KEY!;
    this._sandbox = options?.sandbox ?? false;
  }

  get apiKey() {
    if (!this._apiKey) {
      throw new Error("PADDLE_API_KEY environment variable is not set");
    }
    return this._apiKey;
  }

  get baseUrl() {
    return this._sandbox
      ? "https://sandbox-api.paddle.com"
      : "https://api.paddle.com";
  }

  // ============================================================================
  // CUSTOMER MANAGEMENT
  // ============================================================================

  /**
   * Create a new Paddle customer.
   */
  async createCustomer(
    ctx: ActionCtx,
    args: {
      email: string;
      name?: string;
      customData?: Record<string, string>;
    },
  ) {
    const response = await fetch(`${this.baseUrl}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: args.email,
        name: args.name,
        custom_data: args.customData,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Paddle API error (create customer):", errorBody);
      throw new Error("Failed to create Paddle customer");
    }

    const result = await response.json();
    const customer = result.data;

    // Store in our database
    await ctx.runMutation(this.component.public.createOrUpdateCustomer, {
      paddleCustomerId: customer.id,
      email: customer.email,
      name: customer.name ?? undefined,
      status: customer.status,
      customData: customer.custom_data,
    });

    return { customerId: customer.id };
  }

  /**
   * Get or create a Paddle customer for a user.
   * Checks existing subscriptions and transactions first to avoid duplicates.
   *
   * @param args.emailTrusted - Whether the email comes from a verified source
   *   (e.g. auth identity token). When false, the email-based Paddle API
   *   lookup is skipped to prevent linking the wrong customer account.
   *   Defaults to true for backward compatibility.
   */
  async getOrCreateCustomer(
    ctx: ActionCtx,
    args: {
      userId: string;
      email: string;
      name?: string;
      emailTrusted?: boolean;
    },
  ) {
    const emailTrusted = args.emailTrusted ?? true;

    // Check if customer exists by userId in subscriptions
    const existingSubs = await ctx.runQuery(
      this.component.public.listSubscriptionsByUserId,
      { userId: args.userId },
    );

    if (existingSubs.length > 0) {
      return {
        customerId: existingSubs[0].paddleCustomerId,
        isNew: false,
      };
    }

    // Check existing transactions
    const existingTxns = await ctx.runQuery(
      this.component.public.listTransactionsByUserId,
      { userId: args.userId },
    );

    if (existingTxns.length > 0 && existingTxns[0].paddleCustomerId) {
      return {
        customerId: existingTxns[0].paddleCustomerId,
        isNew: false,
      };
    }

    // Only search Paddle by email if the email comes from a trusted source.
    // When email is client-provided (emailTrusted=false), skip this to prevent
    // a malicious user from linking to another user's Paddle customer.
    if (emailTrusted) {
      const response = await fetch(
        `${this.baseUrl}/customers?email=${encodeURIComponent(args.email)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          const customer = result.data[0];
          // Verify this Paddle customer isn't already owned by another user.
          // custom_data.userId is set when we create customers, so if it
          // exists and doesn't match, skip to avoid cross-account linking.
          const existingOwner = customer.custom_data?.userId;
          if (existingOwner && existingOwner !== args.userId) {
            // Email matches but belongs to a different user — fall through
            // to create a new customer instead.
          } else {
            // Store in local DB
            await ctx.runMutation(
              this.component.public.createOrUpdateCustomer,
              {
                paddleCustomerId: customer.id,
                email: customer.email,
                name: customer.name ?? undefined,
                status: customer.status,
                customData: {
                  ...customer.custom_data,
                  userId: args.userId,
                },
              },
            );
            return { customerId: customer.id, isNew: false };
          }
        }
      }
    }

    // Create a new customer
    const createResult = await this.createCustomer(ctx, {
      email: args.email,
      name: args.name,
      customData: { userId: args.userId },
    });

    return { customerId: createResult.customerId, isNew: true };
  }

  // ============================================================================
  // CHECKOUT & TRANSACTIONS
  // ============================================================================

  /**
   * Create a Paddle transaction for checkout.
   *
   * Paddle uses transactions for both one-time payments and subscriptions.
   * For subscriptions, include items with recurring prices -
   * Paddle creates the subscription automatically upon completion.
   *
   * Returns a transactionId and checkoutUrl. Redirect the user to the
   * checkoutUrl or use the transactionId with Paddle.js inline checkout.
   */
  async createTransaction(
    ctx: ActionCtx,
    args: {
      items: Array<{ priceId: string; quantity: number }>;
      customerId?: string;
      customData?: Record<string, string>;
      discountId?: string;
      currencyCode?: string;
    },
  ) {
    const body: Record<string, unknown> = {
      items: args.items.map((item) => ({
        price_id: item.priceId,
        quantity: item.quantity,
      })),
      collection_mode: "automatic",
    };

    if (args.customerId) {
      body.customer_id = args.customerId;
    }
    if (args.customData) {
      body.custom_data = args.customData;
    }
    if (args.discountId) {
      body.discount_id = args.discountId;
    }
    if (args.currencyCode) {
      body.currency_code = args.currencyCode;
    }

    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Paddle API error (create transaction):", errorBody);
      throw new Error("Failed to create Paddle transaction");
    }

    const result = await response.json();
    const transaction = result.data;

    return {
      transactionId: transaction.id as string,
      checkoutUrl: (transaction.checkout?.url as string) || null,
    };
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  /**
   * Cancel a subscription either immediately or at the end of the billing period.
   */
  async cancelSubscription(
    ctx: ActionCtx,
    args: {
      paddleSubscriptionId: string;
      effectiveFrom?: "immediately" | "next_billing_period";
    },
  ) {
    const effectiveFrom = args.effectiveFrom ?? "next_billing_period";

    const response = await fetch(
      `${this.baseUrl}/subscriptions/${args.paddleSubscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          effective_from: effectiveFrom,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Paddle API error (cancel subscription):", errorBody);
      throw new Error("Failed to cancel Paddle subscription");
    }

    const result = await response.json();
    const subscription = result.data;

    // Update local database immediately
    await ctx.runMutation(this.component.private.handleSubscriptionUpdated, {
      paddleSubscriptionId: subscription.id,
      status: subscription.status,
      scheduledChange: subscription.scheduled_change || undefined,
      canceledAt: subscription.canceled_at || undefined,
      currentBillingPeriodStart:
        subscription.current_billing_period?.starts_at || undefined,
      currentBillingPeriodEnd:
        subscription.current_billing_period?.ends_at || undefined,
      nextBilledAt: subscription.next_billed_at || undefined,
    });

    return null;
  }

  /**
   * Pause a subscription either immediately or at the end of the billing period.
   */
  async pauseSubscription(
    ctx: ActionCtx,
    args: {
      paddleSubscriptionId: string;
      effectiveFrom?: "immediately" | "next_billing_period";
      resumeAt?: string;
    },
  ) {
    const body: Record<string, unknown> = {
      effective_from: args.effectiveFrom ?? "next_billing_period",
    };

    if (args.resumeAt) {
      body.resume_at = args.resumeAt;
    }

    const response = await fetch(
      `${this.baseUrl}/subscriptions/${args.paddleSubscriptionId}/pause`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Paddle API error (pause subscription):", errorBody);
      throw new Error("Failed to pause Paddle subscription");
    }

    const result = await response.json();
    const subscription = result.data;

    await ctx.runMutation(this.component.private.handleSubscriptionUpdated, {
      paddleSubscriptionId: subscription.id,
      status: subscription.status,
      scheduledChange: subscription.scheduled_change || undefined,
      pausedAt: subscription.paused_at || undefined,
      nextBilledAt: subscription.next_billed_at || undefined,
    });

    return null;
  }

  /**
   * Resume a paused subscription.
   */
  async resumeSubscription(
    ctx: ActionCtx,
    args: {
      paddleSubscriptionId: string;
      effectiveFrom?: "immediately" | "next_billing_period";
    },
  ) {
    const response = await fetch(
      `${this.baseUrl}/subscriptions/${args.paddleSubscriptionId}/resume`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          effective_from: args.effectiveFrom ?? "immediately",
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Paddle API error (resume subscription):", errorBody);
      throw new Error("Failed to resume Paddle subscription");
    }

    const result = await response.json();
    const subscription = result.data;

    await ctx.runMutation(this.component.private.handleSubscriptionResumed, {
      paddleSubscriptionId: subscription.id,
      nextBilledAt: subscription.next_billed_at || undefined,
    });

    return null;
  }

  /**
   * Update subscription items/quantity (for seat-based pricing).
   */
  async updateSubscriptionQuantity(
    ctx: ActionCtx,
    args: {
      paddleSubscriptionId: string;
      priceId: string;
      quantity: number;
    },
  ) {
    await ctx.runAction(this.component.public.updateSubscriptionQuantity, {
      paddleSubscriptionId: args.paddleSubscriptionId,
      priceId: args.priceId,
      quantity: args.quantity,
      apiKey: this.apiKey,
      sandbox: this._sandbox,
    });

    return null;
  }

  /**
   * Create a one-time charge on an existing subscription.
   */
  async createSubscriptionCharge(
    ctx: ActionCtx,
    args: {
      paddleSubscriptionId: string;
      items: Array<{ priceId: string; quantity: number }>;
      effectiveFrom?: "immediately" | "next_billing_period";
    },
  ) {
    const response = await fetch(
      `${this.baseUrl}/subscriptions/${args.paddleSubscriptionId}/charge`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: args.items.map((item) => ({
            price_id: item.priceId,
            quantity: item.quantity,
          })),
          effective_from: args.effectiveFrom ?? "next_billing_period",
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Paddle API error (subscription charge):", errorBody);
      throw new Error("Failed to create subscription charge");
    }

    return null;
  }

  // ============================================================================
  // CUSTOMER PORTAL
  // ============================================================================

  /**
   * Create a customer portal session for managing subscriptions.
   */
  async createCustomerPortalSession(
    ctx: ActionCtx,
    args: {
      customerId: string;
      subscriptionIds?: string[];
    },
  ) {
    const body: Record<string, unknown> = {};
    if (args.subscriptionIds) {
      body.subscription_ids = args.subscriptionIds;
    }

    const response = await fetch(
      `${this.baseUrl}/customers/${args.customerId}/portal-sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Paddle API error (portal session):", errorBody);
      throw new Error("Failed to create portal session");
    }

    const result = await response.json();
    return result.data as {
      id: string;
      customer_id: string;
      urls: {
        general: { overview: string };
        subscriptions: Array<{
          id: string;
          cancel_subscription: string;
          update_subscription_payment_method: string;
        }>;
      };
      created_at: string;
    };
  }
}

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify a Paddle webhook signature using HMAC-SHA256 (Web Crypto API).
 *
 * Uses the Web Crypto API (crypto.subtle) so it works in the Convex runtime
 * without requiring Node.js.
 *
 * The Paddle-Signature header has the format: ts=TIMESTAMP;h1=HASH
 * The signed payload is: TIMESTAMP:RAW_BODY
 */
/** Maximum age (in seconds) for webhook signature timestamps. */
const WEBHOOK_MAX_AGE_SECONDS = 300; // 5 minutes

async function verifyPaddleWebhookSignature(
  rawBody: string,
  secret: string,
  signatureHeader: string,
): Promise<boolean> {
  const parts = signatureHeader.split(";");
  const tsField = parts.find((p) => p.startsWith("ts="));
  const h1Field = parts.find((p) => p.startsWith("h1="));

  if (!tsField || !h1Field) return false;

  const ts = tsField.split("=")[1];
  const h1 = h1Field.split("=")[1];

  if (!ts || !h1) return false;

  // Reject stale signatures to limit replay window
  const tsSeconds = parseInt(ts, 10);
  if (isNaN(tsSeconds)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > WEBHOOK_MAX_AGE_SECONDS) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signedPayload = `${ts}:${rawBody}`;
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload),
    );

    const computedHash = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (computedHash.length !== h1.length) return false;
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash.charCodeAt(i) ^ h1.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

// ============================================================================
// WEBHOOK ROUTE REGISTRATION
// ============================================================================

/**
 * Register Paddle webhook routes with the HTTP router.
 *
 * Handles signature verification, event deduplication, default database
 * syncing, and custom event handlers.
 *
 * @example
 * ```typescript
 * // convex/http.ts
 * import { httpRouter } from "convex/server";
 * import { components } from "./_generated/api";
 * import { registerRoutes } from "@flyweightdev/convex-paddle";
 *
 * const http = httpRouter();
 *
 * registerRoutes(http, components.paddle, {
 *   events: {
 *     "subscription.created": async (ctx, event) => {
 *       console.log("New subscription:", event.data);
 *     },
 *   },
 * });
 *
 * export default http;
 * ```
 */
export function registerRoutes(
  http: HttpRouter,
  component: ComponentApi,
  config?: RegisterRoutesConfig,
) {
  const webhookPath = config?.webhookPath ?? "/paddle/webhook";
  const eventHandlers = config?.events ?? {};

  http.route({
    path: webhookPath,
    method: "POST",
    handler: httpActionGeneric(async (ctx, req) => {
      const webhookSecret =
        config?.PADDLE_WEBHOOK_SECRET || process.env.PADDLE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("PADDLE_WEBHOOK_SECRET is not set");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      const signature = req.headers.get("paddle-signature");
      if (!signature) {
        console.error("No Paddle-Signature header found");
        return new Response("No signature provided", { status: 400 });
      }

      const body = await req.text();

      // Verify webhook signature
      const isValid = await verifyPaddleWebhookSignature(
        body,
        webhookSecret,
        signature,
      );

      if (!isValid) {
        console.error("Webhook signature verification failed");
        return new Response("Webhook signature verification failed", {
          status: 400,
        });
      }

      let event: PaddleWebhookEvent;
      try {
        event = JSON.parse(body);
      } catch {
        console.error("Failed to parse webhook body");
        return new Response("Invalid JSON", { status: 400 });
      }

      // Atomic idempotency: acquire a processing lock (check + insert in one mutation).
      // Convex OCC ensures concurrent calls for the same event_id are serialized,
      // so only one caller wins the lock.
      try {
        const alreadyProcessed = await ctx.runMutation(
          component.private.checkAndRecordEvent,
          {
            paddleEventId: event.event_id,
            eventType: event.event_type,
            occurredAt: event.occurred_at,
          },
        );

        if (alreadyProcessed) {
          return new Response(
            JSON.stringify({ received: true, duplicate: true }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      } catch (error) {
        // Fail-closed: if we can't acquire the idempotency lock, return 500
        // so Paddle retries when the DB is healthy. Processing without a lock
        // risks duplicate side effects, especially in custom event handlers.
        console.error("Failed to acquire idempotency lock:", error);
        return new Response("Idempotency check failed", { status: 500 });
      }

      // Process the event with default handlers
      try {
        await processEvent(ctx, component, event);

        // Call generic event handler if provided
        if (config?.onEvent) {
          await config.onEvent(ctx, event);
        }

        // Call custom event handler if provided
        const eventType = event.event_type;
        const customHandler:
          | ((ctx: any, event: any) => Promise<void>)
          | undefined = eventHandlers[eventType] as any;
        if (customHandler) {
          await customHandler(ctx, event);
        }

        // Promote lock to permanent "processed" record
        try {
          await ctx.runMutation(component.private.markEventProcessed, {
            paddleEventId: event.event_id,
          });
        } catch (markError) {
          console.error("Failed to mark event as processed:", markError);
          // Fallback: try to set "processed_pending" — equally permanent,
          // prevents the lock from expiring and allowing replay via TTL.
          try {
            await ctx.runMutation(component.private.markEventProcessed, {
              paddleEventId: event.event_id,
              status: "processed_pending",
            });
            // Fallback succeeded — event is permanently marked, safe to 200.
            // Log for operational visibility so a repair job can promote
            // these to "processed" later if desired.
            console.warn(
              `Event ${event.event_id} marked as processed_pending (finalize fallback)`,
            );
          } catch (fallbackError) {
            // Both writes failed — likely a real DB outage.
            // Return 500 so Paddle retries when DB recovers.
            console.error("Failed to mark event as processed_pending:", fallbackError);
            return new Response("Failed to finalize event", { status: 500 });
          }
        }
      } catch (error) {
        // Processing failed — release the lock so Paddle retries can reprocess.
        try {
          await ctx.runMutation(component.private.unreserveEvent, {
            paddleEventId: event.event_id,
          });
        } catch (unreserveError) {
          // If unreserve also fails, the lock will auto-expire via TTL
          // (LOCK_TTL_MS), allowing Paddle retries to eventually reprocess.
          console.error("Failed to release lock after processing failure:", unreserveError);
        }
        console.error("Error processing webhook:", error);
        return new Response("Error processing webhook", { status: 500 });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  });
}

/**
 * Process Paddle webhook events with default handling.
 */
async function processEvent(
  ctx: ActionCtx,
  component: ComponentApi,
  event: PaddleWebhookEvent,
): Promise<void> {
  const data = event.data;

  switch (event.event_type) {
    // ========================================================================
    // CUSTOMER EVENTS
    // ========================================================================
    case "customer.created":
    case "customer.imported": {
      await ctx.runMutation(component.private.handleCustomerCreated, {
        paddleCustomerId: data.id as string,
        email: (data.email as string) || undefined,
        name: (data.name as string) || undefined,
        status: (data.status as string) || undefined,
        customData: data.custom_data || undefined,
      });
      break;
    }

    case "customer.updated": {
      await ctx.runMutation(component.private.handleCustomerUpdated, {
        paddleCustomerId: data.id as string,
        email: (data.email as string) || undefined,
        name: (data.name as string) || undefined,
        status: (data.status as string) || undefined,
        customData: data.custom_data || undefined,
      });
      break;
    }

    // ========================================================================
    // SUBSCRIPTION EVENTS
    // ========================================================================
    case "subscription.created":
    case "subscription.imported": {
      const items = data.items as Array<Record<string, unknown>> | undefined;
      const firstItem = items?.[0];
      const price = firstItem?.price as Record<string, unknown> | undefined;
      const billingPeriod = data.current_billing_period as
        | Record<string, unknown>
        | undefined;

      await ctx.runMutation(component.private.handleSubscriptionCreated, {
        paddleSubscriptionId: data.id as string,
        paddleCustomerId: data.customer_id as string,
        status: data.status as string,
        priceId: (price?.id as string) || "",
        quantity: (firstItem?.quantity as number) || undefined,
        scheduledChange: data.scheduled_change || undefined,
        currentBillingPeriodStart:
          (billingPeriod?.starts_at as string) || undefined,
        currentBillingPeriodEnd:
          (billingPeriod?.ends_at as string) || undefined,
        nextBilledAt: (data.next_billed_at as string) || undefined,
        customData: data.custom_data || undefined,
      });
      break;
    }

    case "subscription.updated":
    case "subscription.trialing":
    case "subscription.past_due":
    case "subscription.activated": {
      const items = data.items as Array<Record<string, unknown>> | undefined;
      const firstItem = items?.[0];
      const price = firstItem?.price as Record<string, unknown> | undefined;
      const billingPeriod = data.current_billing_period as
        | Record<string, unknown>
        | undefined;

      if (event.event_type === "subscription.activated") {
        await ctx.runMutation(component.private.handleSubscriptionActivated, {
          paddleSubscriptionId: data.id as string,
          nextBilledAt: (data.next_billed_at as string) || undefined,
          currentBillingPeriodStart:
            (billingPeriod?.starts_at as string) || undefined,
          currentBillingPeriodEnd:
            (billingPeriod?.ends_at as string) || undefined,
        });
      } else {
        await ctx.runMutation(component.private.handleSubscriptionUpdated, {
          paddleSubscriptionId: data.id as string,
          status: data.status as string,
          priceId: (price?.id as string) || undefined,
          quantity: (firstItem?.quantity as number) || undefined,
          scheduledChange: data.scheduled_change || undefined,
          currentBillingPeriodStart:
            (billingPeriod?.starts_at as string) || undefined,
          currentBillingPeriodEnd:
            (billingPeriod?.ends_at as string) || undefined,
          nextBilledAt: (data.next_billed_at as string) || undefined,
          pausedAt: (data.paused_at as string) || undefined,
          canceledAt: (data.canceled_at as string) || undefined,
          customData: data.custom_data || undefined,
        });
      }
      break;
    }

    case "subscription.canceled": {
      await ctx.runMutation(component.private.handleSubscriptionCanceled, {
        paddleSubscriptionId: data.id as string,
        canceledAt: (data.canceled_at as string) || undefined,
      });
      break;
    }

    case "subscription.paused": {
      await ctx.runMutation(component.private.handleSubscriptionPaused, {
        paddleSubscriptionId: data.id as string,
        pausedAt: (data.paused_at as string) || undefined,
      });
      break;
    }

    case "subscription.resumed": {
      await ctx.runMutation(component.private.handleSubscriptionResumed, {
        paddleSubscriptionId: data.id as string,
        nextBilledAt: (data.next_billed_at as string) || undefined,
      });
      break;
    }

    // ========================================================================
    // TRANSACTION EVENTS
    // ========================================================================
    case "transaction.created":
    case "transaction.ready":
    case "transaction.billed": {
      const details = data.details as Record<string, unknown> | undefined;
      const totals = details?.totals as Record<string, unknown> | undefined;

      await ctx.runMutation(component.private.handleTransactionCreated, {
        paddleTransactionId: data.id as string,
        paddleCustomerId: (data.customer_id as string) || undefined,
        paddleSubscriptionId:
          (data.subscription_id as string) || undefined,
        status: data.status as string,
        currencyCode: (data.currency_code as string) || undefined,
        totalAmount: (totals?.total as string) || undefined,
        collectionMode: (data.collection_mode as string) || undefined,
        billedAt: (data.billed_at as string) || undefined,
        createdAt: (data.created_at as string) || undefined,
        customData: data.custom_data || undefined,
      });
      break;
    }

    case "transaction.updated":
    case "transaction.paid":
    case "transaction.past_due":
    case "transaction.payment_failed":
    case "transaction.canceled": {
      const details = data.details as Record<string, unknown> | undefined;
      const totals = details?.totals as Record<string, unknown> | undefined;

      await ctx.runMutation(component.private.handleTransactionUpdated, {
        paddleTransactionId: data.id as string,
        status: data.status as string,
        totalAmount: (totals?.total as string) || undefined,
        billedAt: (data.billed_at as string) || undefined,
        customData: data.custom_data || undefined,
      });
      break;
    }

    case "transaction.completed": {
      const details = data.details as Record<string, unknown> | undefined;
      const totals = details?.totals as Record<string, unknown> | undefined;

      await ctx.runMutation(component.private.handleTransactionCompleted, {
        paddleTransactionId: data.id as string,
        paddleCustomerId: (data.customer_id as string) || undefined,
        paddleSubscriptionId:
          (data.subscription_id as string) || undefined,
        totalAmount: (totals?.total as string) || undefined,
        billedAt: (data.billed_at as string) || undefined,
        customData: data.custom_data || undefined,
      });
      break;
    }

    // ========================================================================
    // ADJUSTMENT EVENTS
    // ========================================================================
    case "adjustment.created": {
      await ctx.runMutation(component.private.handleAdjustmentCreated, {
        paddleAdjustmentId: data.id as string,
        paddleTransactionId: data.transaction_id as string,
        paddleCustomerId: (data.customer_id as string) || undefined,
        paddleSubscriptionId:
          (data.subscription_id as string) || undefined,
        action: data.action as string,
        reason: (data.reason as string) || undefined,
        status: data.status as string,
        totalAmount: (data.total_amount as string) || undefined,
        currencyCode: (data.currency_code as string) || undefined,
        createdAt: (data.created_at as string) || undefined,
      });
      break;
    }

    case "adjustment.updated": {
      await ctx.runMutation(component.private.handleAdjustmentUpdated, {
        paddleAdjustmentId: data.id as string,
        status: data.status as string,
        totalAmount: (data.total_amount as string) || undefined,
      });
      break;
    }

    default:
      console.log(`Unhandled Paddle event type: ${event.event_type}`);
  }
}

export default PaddleBilling;
