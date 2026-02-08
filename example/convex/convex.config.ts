import { defineApp } from "convex/server";
import paddle from "@flyweightdev/convex-paddle/convex.config.js";

const app = defineApp();
app.use(paddle);

export default app;
