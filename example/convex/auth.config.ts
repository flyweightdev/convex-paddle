const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!domain) {
  throw new Error(
    "CLERK_JWT_ISSUER_DOMAIN environment variable is required. " +
    "Set it in the Convex dashboard to your Clerk Frontend API URL " +
    "(e.g. https://verb-noun-00.clerk.accounts.dev)."
  );
}

export default {
  providers: [
    {
      domain,
      applicationID: "convex",
    },
  ],
};
