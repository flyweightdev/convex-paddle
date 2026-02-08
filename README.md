# @flyweightdev/convex-paddle

A Convex component for integrating Paddle payments, subscriptions, and billing
into your Convex application.

Inspired by the official [Stripe component by Convex](https://github.com/get-convex/stripe).

This project was created with the help of Claude Code (Opus 4.5) and reviewed by GPT 5.3-Codex, CodeRabbitAI and humans.

## Features

- 🛒 **Checkout Sessions** - Create one-time payment and subscription checkouts via Paddle transactions
- 📦 **Subscription Management** - Update, cancel, pause, resume subscriptions
- 👥 **Customer Management** - Automatic customer creation and linking
- 💳 **Customer Portal** - Let users manage their billing via Paddle's portal
- 🪑 **Seat-Based Pricing** - Update subscription quantities for team billing
- 🔗 **User/Org Linking** - Link transactions and subscriptions to users or organizations
- 🔔 **Webhook Handling** - Automatic sync of Paddle data to your Convex database with signature verification
- 📊 **Real-time Data** - Query transactions, subscriptions, adjustments in real-time
- 🔄 **Idempotent Webhooks** - Built-in event deduplication prevents duplicate processing
- 💰 **Adjustments** - Track refunds, credits, and chargebacks

## Quick Start

### 1. Install the Component

```bash
npm install @flyweightdev/convex-paddle
```

Or install directly from GitHub:

```bash
npm install github:flyweightdev/convex-paddle
```

### 2. Add to Your Convex App

Create or update `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import paddle from "@flyweightdev/convex-paddle/convex.config.js";

const app = defineApp();
app.use(paddle);

export default app;
```

### 3. Set Up Environment Variables

Add these to your [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables:

| Variable               | Description                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| `PADDLE_API_KEY`       | Your Paddle API key (`pdl_live_...` or `pdl_sbox_...`)                 |
| `PADDLE_WEBHOOK_SECRET`| Webhook signing secret from your Paddle notification destination       |
| `PADDLE_SANDBOX`       | Set to `"true"` for sandbox mode (uses `sandbox-api.paddle.com`)       |

### 4. Configure Paddle Webhooks

1. Go to [Paddle Dashboard → Developer Tools → Notifications](https://vendors.paddle.com/notifications)
2. Click **"New destination"**
3. Enter your webhook URL:
   ```
   https://<your-convex-deployment>.convex.site/paddle/webhook
   ```
   (Find your deployment name in the Convex dashboard - it's the part before `.convex.cloud` in your URL)
4. Select these events:
   - `customer.created`
   - `customer.updated`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.activated`
   - `subscription.canceled`
   - `subscription.paused`
   - `subscription.resumed`
   - `subscription.past_due`
   - `transaction.created`
   - `transaction.completed`
   - `transaction.updated`
   - `transaction.paid`
   - `transaction.payment_failed`
   - `adjustment.created`
   - `adjustment.updated`
5. Click **"Save"**
6. Copy the **Secret key** and add it as `PADDLE_WEBHOOK_SECRET` in Convex

### 5. Register Webhook Routes

Create `convex/http.ts`:

```typescript
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { registerRoutes } from "@flyweightdev/convex-paddle";

const http = httpRouter();

// Register Paddle webhook handler at /paddle/webhook
registerRoutes(http, components.paddle, {
  webhookPath: "/paddle/webhook",
});

export default http;
```

### 6. Use the Component

Create `convex/paddle.ts`:

```typescript
import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { PaddleBilling } from "@flyweightdev/convex-paddle";
import { v } from "convex/values";

const paddleClient = new PaddleBilling(components.paddle, {});

// Create a checkout for a subscription
export const createSubscriptionCheckout = action({
  args: { priceId: v.string() },
  returns: v.object({
    transactionId: v.string(),
    checkoutUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get or create a Paddle customer
    const customer = await paddleClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email: identity.email!,
      name: identity.name,
    });

    // Create checkout transaction
    return await paddleClient.createTransaction(ctx, {
      items: [{ priceId: args.priceId, quantity: 1 }],
      customerId: customer.customerId,
      customData: { userId: identity.subject },
    });
  },
});

// Create a checkout for a one-time payment
export const createPaymentCheckout = action({
  args: { priceId: v.string() },
  returns: v.object({
    transactionId: v.string(),
    checkoutUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const customer = await paddleClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email: identity.email!,
      name: identity.name,
    });

    return await paddleClient.createTransaction(ctx, {
      items: [{ priceId: args.priceId, quantity: 1 }],
      customerId: customer.customerId,
      customData: { userId: identity.subject },
    });
  },
});
```

## Using with Paddle.js (Client-Side)

You can use the `transactionId` returned from `createTransaction` with Paddle.js for an inline checkout experience:

```html
<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
```

```typescript
// Initialize Paddle.js
Paddle.Initialize({
  token: "live_YOUR_CLIENT_SIDE_TOKEN", // client-side token, safe to expose
  checkout: {
    settings: {
      displayMode: "overlay",
      theme: "light",
    },
  },
});

// Open checkout with the transaction ID from your Convex action
const result = await createSubscriptionCheckout({ priceId: "pri_..." });

Paddle.Checkout.open({
  transactionId: result.transactionId,
});
```

Or redirect the user to `result.checkoutUrl` for Paddle's hosted checkout.

## Sandbox Mode

For development, use Paddle's sandbox environment. Set `PADDLE_SANDBOX=true` in your Convex dashboard environment variables, then read it in your config:

```typescript
const paddleClient = new PaddleBilling(components.paddle, {
  sandbox: process.env.PADDLE_SANDBOX === "true",
});
```

And initialize Paddle.js in sandbox mode on the client:

```typescript
if (import.meta.env.VITE_PADDLE_SANDBOX === "true") {
  Paddle.Environment.set("sandbox");
}
Paddle.Initialize({ token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN });
```

## API Reference

### PaddleBilling Client

```typescript
import { PaddleBilling } from "@flyweightdev/convex-paddle";

const paddleClient = new PaddleBilling(components.paddle, {
  PADDLE_API_KEY: "pdl_...", // Optional, defaults to process.env.PADDLE_API_KEY
  sandbox: false,            // Optional, defaults to false (production)
});
```

#### Methods

| Method | Description |
|--------|-------------|
| `createTransaction()` | Create a Paddle transaction for checkout |
| `createCustomer()` | Create a new Paddle customer |
| `getOrCreateCustomer()` | Get existing or create new customer |
| `cancelSubscription()` | Cancel a subscription |
| `pauseSubscription()` | Pause a subscription |
| `resumeSubscription()` | Resume a paused subscription |
| `updateSubscriptionQuantity()` | Update seat count |
| `createSubscriptionCharge()` | Create a one-time charge on an existing subscription |
| `createCustomerPortalSession()` | Generate a Customer Portal session |

### createTransaction

Creates a Paddle transaction for checkout. Works for both one-time payments (non-recurring prices) and subscriptions (recurring prices). Paddle automatically creates a subscription when a transaction with recurring prices completes.

```typescript
await paddleClient.createTransaction(ctx, {
  items: [
    { priceId: "pri_...", quantity: 1 },
  ],
  customerId: "ctm_...",                // Optional
  customData: { userId: "usr_123" },    // Optional, for linking back to your users
  discountId: "dsc_...",                // Optional
  currencyCode: "USD",                  // Optional
});
// Returns: { transactionId: string, checkoutUrl: string | null }
```

### cancelSubscription

```typescript
await paddleClient.cancelSubscription(ctx, {
  paddleSubscriptionId: "sub_...",
  effectiveFrom: "next_billing_period", // or "immediately"
});
```

### pauseSubscription

```typescript
await paddleClient.pauseSubscription(ctx, {
  paddleSubscriptionId: "sub_...",
  effectiveFrom: "next_billing_period", // or "immediately"
  resumeAt: "2025-12-31T00:00:00Z",    // Optional auto-resume date
});
```

### resumeSubscription

```typescript
await paddleClient.resumeSubscription(ctx, {
  paddleSubscriptionId: "sub_...",
  effectiveFrom: "immediately",         // or "next_billing_period"
});
```

### updateSubscriptionQuantity

```typescript
await paddleClient.updateSubscriptionQuantity(ctx, {
  paddleSubscriptionId: "sub_...",
  priceId: "pri_...",
  quantity: 10,
});
```

### createCustomerPortalSession

```typescript
const portal = await paddleClient.createCustomerPortalSession(ctx, {
  customerId: "ctm_...",
  subscriptionIds: ["sub_..."],         // Optional
});
// Returns portal.urls with authenticated links for:
// - portal.urls.general.overview
// - portal.urls.subscriptions[0].cancel_subscription
// - portal.urls.subscriptions[0].update_subscription_payment_method
```

## Component Queries

Access data directly via the component's public queries:

```typescript
import { query } from "./_generated/server";
import { components } from "./_generated/api";

// List subscriptions for a user
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

// List transactions for a user
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
```

### Available Public Queries

| Query                            | Arguments                | Description                          |
| -------------------------------- | ------------------------ | ------------------------------------ |
| `getCustomer`                    | `paddleCustomerId`       | Get a customer by Paddle ID          |
| `getCustomerByEmail`             | `email`                  | Get a customer by email              |
| `listSubscriptions`              | `paddleCustomerId`       | List subscriptions for a customer    |
| `listSubscriptionsByUserId`      | `userId`                 | List subscriptions for a user        |
| `getSubscription`                | `paddleSubscriptionId`   | Get a subscription by ID             |
| `getSubscriptionByOrgId`         | `orgId`                  | Get subscription for an org          |
| `getTransaction`                 | `paddleTransactionId`    | Get a transaction by ID              |
| `listTransactions`               | `paddleCustomerId`       | List transactions for a customer     |
| `listTransactionsByUserId`       | `userId`                 | List transactions for a user         |
| `listTransactionsByOrgId`        | `orgId`                  | List transactions for an org         |
| `listTransactionsBySubscription` | `paddleSubscriptionId`   | List transactions for a subscription |
| `listAdjustments`                | `paddleTransactionId`    | List adjustments for a transaction   |

### Available Public Mutations

| Mutation                        | Description                           |
| ------------------------------- | ------------------------------------- |
| `createOrUpdateCustomer`        | Create or update a customer record    |
| `updateSubscriptionMetadata`    | Update subscription userId/orgId/data |
| `updateSubscriptionQuantity`    | Update seat count (action)            |

## Webhook Events

The component automatically handles these Paddle webhook events:

| Event                       | Action                                |
| --------------------------- | ------------------------------------- |
| `customer.created`          | Creates customer record               |
| `customer.updated`          | Updates customer record               |
| `customer.imported`         | Creates customer record               |
| `subscription.created`      | Creates subscription record           |
| `subscription.updated`      | Updates subscription record           |
| `subscription.activated`    | Marks subscription as active          |
| `subscription.canceled`     | Marks subscription as canceled        |
| `subscription.paused`       | Marks subscription as paused          |
| `subscription.resumed`      | Marks subscription as active          |
| `subscription.past_due`     | Updates subscription status           |
| `subscription.trialing`     | Updates subscription status           |
| `subscription.imported`     | Creates subscription record           |
| `transaction.created`       | Creates transaction record            |
| `transaction.completed`     | Marks transaction as completed        |
| `transaction.updated`       | Updates transaction record            |
| `transaction.billed`        | Creates transaction record            |
| `transaction.paid`          | Updates transaction status            |
| `transaction.payment_failed`| Updates transaction status            |
| `transaction.canceled`      | Updates transaction status            |
| `adjustment.created`        | Creates adjustment record             |
| `adjustment.updated`        | Updates adjustment status             |

### Custom Webhook Handlers

Add custom logic to webhook events:

```typescript
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { registerRoutes } from "@flyweightdev/convex-paddle";

const http = httpRouter();

registerRoutes(http, components.paddle, {
  events: {
    "subscription.created": async (ctx, event) => {
      console.log("New subscription:", event.data.id);
      // Add custom logic here (e.g., send welcome email)
    },
    "transaction.completed": async (ctx, event) => {
      console.log("Transaction completed:", event.data.id);
      // Add custom logic here (e.g., provision access)
    },
  },
  onEvent: async (ctx, event) => {
    // Called for ALL events - useful for logging/analytics
    console.log("Paddle event:", event.event_type);
  },
});

export default http;
```

## Database Schema

The component creates these tables in its own namespace (isolated from your app's tables):

### customers

| Field              | Type    | Description          |
| ------------------ | ------- | -------------------- |
| `paddleCustomerId` | string  | Paddle customer ID   |
| `email`            | string? | Customer email       |
| `name`             | string? | Customer name        |
| `status`           | string? | Customer status      |
| `customData`       | object? | Custom data          |

### subscriptions

| Field                        | Type    | Description                  |
| ---------------------------- | ------- | ---------------------------- |
| `paddleSubscriptionId`       | string  | Paddle subscription ID       |
| `paddleCustomerId`           | string  | Customer ID                  |
| `status`                     | string  | Subscription status          |
| `priceId`                    | string  | Price ID                     |
| `quantity`                   | number? | Seat count                   |
| `scheduledChange`            | object? | Scheduled change (cancel/pause) |
| `currentBillingPeriodStart`  | string? | Period start (ISO 8601)      |
| `currentBillingPeriodEnd`    | string? | Period end (ISO 8601)        |
| `nextBilledAt`               | string? | Next billing date            |
| `pausedAt`                   | string? | When paused                  |
| `canceledAt`                 | string? | When canceled                |
| `userId`                     | string? | Linked user ID               |
| `orgId`                      | string? | Linked org ID                |
| `customData`                 | object? | Custom data                  |

### transactions

| Field                    | Type    | Description             |
| ------------------------ | ------- | ----------------------- |
| `paddleTransactionId`    | string  | Paddle transaction ID   |
| `paddleCustomerId`       | string? | Customer ID             |
| `paddleSubscriptionId`   | string? | Subscription ID         |
| `status`                 | string  | Transaction status      |
| `currencyCode`           | string? | Currency (e.g., "USD")  |
| `totalAmount`            | string? | Total in lowest denomination |
| `collectionMode`         | string? | "automatic" or "manual" |
| `billedAt`               | string? | When billed             |
| `createdAt`              | string? | When created            |
| `userId`                 | string? | Linked user ID          |
| `orgId`                  | string? | Linked org ID           |
| `customData`             | object? | Custom data             |

### adjustments

| Field                    | Type    | Description             |
| ------------------------ | ------- | ----------------------- |
| `paddleAdjustmentId`     | string  | Paddle adjustment ID    |
| `paddleTransactionId`    | string  | Transaction ID          |
| `paddleCustomerId`       | string? | Customer ID             |
| `paddleSubscriptionId`   | string? | Subscription ID         |
| `action`                 | string  | "refund", "credit", "chargeback" |
| `reason`                 | string? | Adjustment reason       |
| `status`                 | string  | Adjustment status       |
| `totalAmount`            | string? | Total amount            |
| `currencyCode`           | string? | Currency code           |
| `createdAt`              | string? | When created            |

### webhook_events

| Field            | Type   | Description               |
| ---------------- | ------ | ------------------------- |
| `paddleEventId`  | string | Paddle event ID           |
| `eventType`      | string | Event type                |
| `occurredAt`     | string | When event occurred       |
| `processedAt`    | number | When we processed it (ms) |

## Differences from Stripe

If you're coming from the Convex Stripe component, here are key differences:

| Concept | Stripe | Paddle |
|---------|--------|--------|
| Checkout | Checkout Sessions | Transactions with `collection_mode: "automatic"` |
| Payments | Payment Intents | Transactions |
| Invoices | Invoices | Transactions (Paddle unifies these) |
| Subscriptions | Created via Checkout | Created automatically when a transaction with recurring prices completes |
| Pause | Not natively supported | First-class `pause`/`resume` support |
| Amounts | Numbers (cents) | Strings (lowest denomination) |
| Webhook signature | Stripe SDK verification | HMAC-SHA256 with `Paddle-Signature` header |

## Example App

Check out the full example app in the [`example/`](./example) directory:

```bash
git clone https://github.com/flyweightdev/convex-paddle
cd convex-paddle
npm install
npm run dev
```

The example includes:
- One-time payment checkout with Paddle.js
- Subscription checkout with Paddle.js
- Live pricing from Paddle API with USD/EUR currency toggle
- Subscription management (cancel, pause, resume)
- Seat-based team billing
- Customer portal integration
- Authentication via WorkOS AuthKit

### Example Environment Variables

**`.env.local`** (client-side, Vite):

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_WORKOS_CLIENT_ID=client_...
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
VITE_PADDLE_CLIENT_TOKEN=test_...   # Paddle client-side token
VITE_PADDLE_SANDBOX=true
VITE_PADDLE_SINGLE_PRICE_ID=pri_... # Your one-time payment price ID
VITE_PADDLE_SUBSCRIPTION_PRICE_ID=pri_... # Your subscription price ID
```

**Convex Dashboard** (server-side):

```bash
PADDLE_API_KEY=pdl_sbox_...         # Paddle API key
PADDLE_WEBHOOK_SECRET=pdl_ntf_...   # Webhook signing secret
PADDLE_SANDBOX=true                 # Use sandbox API
WORKOS_CLIENT_ID=client_...         # WorkOS client ID (for auth.config.ts)
```

## Authentication

This component works with any Convex authentication provider. The example app uses [WorkOS AuthKit](https://www.authkit.com/) with the [`@convex-dev/workos`](https://docs.convex.dev/auth/authkit/) adapter.

### Setting up WorkOS AuthKit

1. Install dependencies:

```bash
npm install @workos-inc/authkit-react @convex-dev/workos
```

2. Create `convex/auth.config.ts`:

```typescript
const clientId = process.env.WORKOS_CLIENT_ID;

const authConfig = {
  providers: [
    {
      type: "customJwt" as const,
      issuer: "https://api.workos.com/",
      algorithm: "RS256" as const,
      applicationID: clientId,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
    {
      type: "customJwt" as const,
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256" as const,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};

export default authConfig;
```

3. Set up the React provider in your app entry:

```typescript
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

<AuthKitProvider
  clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
  redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
  devMode // Required for localhost (no custom auth domain)
>
  <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
    <App />
  </ConvexProviderWithAuthKit>
</AuthKitProvider>
```

4. Use `ctx.auth.getUserIdentity()` in your Convex functions:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
// identity.subject = user ID
```

> **Note:** WorkOS access tokens don't include `email` in the JWT claims. The user's email is available client-side via `useAuth().user.email` and should be passed as an argument to actions that need it (e.g., creating a Paddle customer).

5. Configure WorkOS dashboard:
   - Set `WORKOS_CLIENT_ID` in your Convex environment variables
   - Add your origin (e.g., `http://localhost:5173`) to **CORS allowed origins**
   - Add your redirect URI (e.g., `http://localhost:5173/callback`) to **Redirects**

## Troubleshooting

### Tables are empty after checkout

Make sure you've:

1. Set `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` in Convex environment variables
2. Configured the webhook destination in Paddle with the correct events
3. Your webhook URL is correct: `https://<deployment>.convex.site/paddle/webhook`

### Webhook signature verification failing

1. Ensure `PADDLE_WEBHOOK_SECRET` is the secret from your Paddle notification destination (not your API key)
2. Make sure you're using the correct environment (sandbox vs production)
3. Check that the webhook URL matches exactly

### "Not authenticated" errors

Ensure your auth provider is configured:

1. Create `convex/auth.config.ts` with your JWT provider config
2. Set the required environment variables (`WORKOS_CLIENT_ID`, etc.)
3. Run `npx convex dev` to push the config
4. Verify the user is signed in before calling actions

### "User email not found" errors

WorkOS access tokens don't include `email` in the JWT claims. Pass the email from the client side using `useAuth().user.email` as an argument to your checkout actions.

### CORS errors with WorkOS

Add your development origin (e.g., `http://localhost:5173`) to the **CORS allowed origins** in your WorkOS dashboard under **Authentication** → **Sessions** → **Cross-Origin Resource Sharing (CORS)**.

### Duplicate webhook events

This component includes built-in idempotency via the `webhook_events` table. Each `event_id` is tracked, and duplicate events are automatically skipped. Paddle guarantees at-least-once delivery, so this is essential for correctness.

### Sandbox vs Production

Make sure you're consistent:
- Sandbox API keys (`pdl_sbox_...`) must be used with `sandbox: true`
- Production API keys (`pdl_live_...`) must be used with `sandbox: false` (default)
- Paddle.js client tokens must match the environment (`test_...` for sandbox, `live_...` for production)

## License

Apache-2.0
