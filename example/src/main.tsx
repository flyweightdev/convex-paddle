import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { dark, shadcn } from "@clerk/themes";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}
        appearance={{
          baseTheme: [dark, shadcn],
          variables: {
            colorBackground: "hsl(220, 14%, 7%)",
            colorInputBackground: "hsl(220, 12%, 12%)",
            colorInputText: "hsl(40, 20%, 92%)",
            colorText: "hsl(40, 20%, 92%)",
            colorTextSecondary: "hsl(220, 8%, 46%)",
            colorPrimary: "hsl(38, 92%, 55%)",
            colorTextOnPrimaryBackground: "hsl(220, 16%, 4%)",
            colorDanger: "hsl(0, 72%, 55%)",
            borderRadius: "0.75rem",
          },
          elements: {
            modalBackdrop: "backdrop-blur-sm",
            modalContent: "bg-[hsl(220,14%,7%)]",
            card: "bg-[hsl(220,14%,7%)]",
            navbar: "bg-[hsl(220,16%,4%)]",
            navbarButton: "text-[hsl(40,20%,92%)]",
            headerTitle: "text-[hsl(40,20%,92%)]",
            headerSubtitle: "text-[hsl(220,8%,46%)]",
            profileSectionTitleText: "text-[hsl(40,20%,92%)]",
          },
        }}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <App />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
