import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { registerRoutes } from "@flyweightdev/convex-paddle";

const http = httpRouter();

// Register Paddle webhook handler at /paddle/webhook
registerRoutes(http, components.paddle, {
  webhookPath: "/paddle/webhook",
  events: {
    "subscription.created": async (ctx, event) => {
      console.log("New subscription:", event.data.id);
    },
    "transaction.completed": async (ctx, event) => {
      console.log("Transaction completed:", event.data.id);
    },
  },
  onEvent: async (ctx, event) => {
    console.log("Paddle event:", event.event_type, event.event_id);
  },
});

export default http;
