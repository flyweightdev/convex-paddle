import type {
  HttpRouter,
  GenericActionCtx,
  GenericMutationCtx,
  GenericDataModel,
  GenericQueryCtx,
} from "convex/server";

export type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
export type MutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;
export type ActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "runAction"
>;

// ============================================================================
// Paddle Webhook Event Types
// ============================================================================

/**
 * All Paddle webhook event types.
 */
export type PaddleEventType =
  | "customer.created"
  | "customer.updated"
  | "customer.imported"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.activated"
  | "subscription.canceled"
  | "subscription.paused"
  | "subscription.resumed"
  | "subscription.past_due"
  | "subscription.trialing"
  | "subscription.imported"
  | "transaction.created"
  | "transaction.updated"
  | "transaction.completed"
  | "transaction.billed"
  | "transaction.canceled"
  | "transaction.paid"
  | "transaction.past_due"
  | "transaction.payment_failed"
  | "transaction.ready"
  | "transaction.imported"
  | "adjustment.created"
  | "adjustment.updated"
  | "product.created"
  | "product.updated"
  | "product.imported"
  | "price.created"
  | "price.updated"
  | "price.imported"
  | "discount.created"
  | "discount.updated"
  | "discount.imported"
  | "address.created"
  | "address.updated"
  | "address.imported"
  | "business.created"
  | "business.updated"
  | "business.imported"
  | "payout.created"
  | "payout.paid"
  | "report.created"
  | "report.updated";

/**
 * The shape of a Paddle webhook notification payload.
 */
export interface PaddleWebhookEvent {
  event_id: string;
  event_type: PaddleEventType;
  occurred_at: string;
  notification_id: string;
  data: Record<string, unknown>;
}

/**
 * Handler function for a specific Paddle webhook event.
 */
export type PaddleEventHandler<T extends PaddleEventType = PaddleEventType> = (
  ctx: GenericActionCtx<GenericDataModel>,
  event: PaddleWebhookEvent & { event_type: T },
) => Promise<void>;

/**
 * Map of event types to their handlers.
 */
export type PaddleEventHandlers = {
  [K in PaddleEventType]?: PaddleEventHandler<K>;
};

/**
 * Configuration for webhook registration.
 */
export type RegisterRoutesConfig = {
  /**
   * Optional webhook path. Defaults to "/paddle/webhook"
   */
  webhookPath?: string;

  /**
   * Optional event handlers that run after default processing.
   */
  events?: PaddleEventHandlers;

  /**
   * Optional generic event handler that runs for all events.
   */
  onEvent?: PaddleEventHandler;

  /**
   * Paddle webhook secret for signature verification.
   * Defaults to process.env.PADDLE_WEBHOOK_SECRET
   */
  PADDLE_WEBHOOK_SECRET?: string;

  /**
   * Paddle API key for server-side calls.
   * Defaults to process.env.PADDLE_API_KEY
   */
  PADDLE_API_KEY?: string;

  /**
   * Whether to use the Paddle sandbox environment.
   * Defaults to false (production).
   */
  sandbox?: boolean;
};

export type { HttpRouter };
