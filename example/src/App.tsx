import { useEffect, useCallback } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { initPaddle, setOnCheckoutComplete } from "@/lib/paddle";
import type { CheckoutCompleteData } from "@/lib/paddle";
import { Navbar } from "@/components/navbar";
import { HomePage } from "@/components/home-page";
import { StorePage } from "@/components/store-page";
import { ProfilePage } from "@/components/profile-page";
import { TeamBillingPage } from "@/components/team-billing-page";
import { CheckoutSuccess } from "@/components/checkout-success";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useState } from "react";

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [checkoutResult, setCheckoutResult] =
    useState<CheckoutCompleteData | null>(null);

  useEffect(() => {
    initPaddle();
  }, []);

  useEffect(() => {
    setOnCheckoutComplete((data) => setCheckoutResult(data));
    return () => setOnCheckoutComplete(null);
  }, []);

  const handleSuccessContinue = useCallback(() => {
    setCheckoutResult(null);
    navigate("/profile");
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 mesh-bg">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <div className="absolute inset-0 h-10 w-10 rounded-full animate-[glow-pulse_2s_ease-in-out_infinite] bg-primary/10 blur-xl" />
        </div>
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">Loading</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col noise-overlay">
      <Navbar isAuthenticated={isAuthenticated} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/store" element={<StorePage />} />
          <Route
            path="/profile"
            element={isAuthenticated ? <ProfilePage /> : <AuthGate />}
          />
          <Route
            path="/team"
            element={isAuthenticated ? <TeamBillingPage /> : <AuthGate />}
          />
          <Route path="/callback" element={<CallbackPage />} />
        </Routes>
      </main>
      <footer className="mt-auto border-t border-border/50 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Built with{" "}
          <a
            href="https://convex.dev"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground/70 underline-offset-4 hover:text-primary transition-colors"
          >
            Convex
          </a>{" "}
          &{" "}
          <a
            href="https://paddle.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground/70 underline-offset-4 hover:text-primary transition-colors"
          >
            Paddle
          </a>
        </p>
      </footer>

      {checkoutResult && (
        <CheckoutSuccess
          data={checkoutResult}
          onContinue={handleSuccessContinue}
        />
      )}
    </div>
  );
}

function AuthGate() {
  const { signIn } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fade-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border mb-6">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Sign in required</h2>
      <p className="mt-2 text-muted-foreground">
        Please sign in to access this page.
      </p>
      <Button className="mt-8" size="lg" onClick={() => signIn()}>
        Sign In
      </Button>
    </div>
  );
}

function CallbackPage() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Completing sign in...</p>
    </div>
  );
}
