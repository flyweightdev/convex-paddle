import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@workos-inc/authkit-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, Sparkles } from "lucide-react";

const navLinks = [
  { to: "/store", label: "Store" },
  { to: "/profile", label: "Profile" },
  { to: "/team", label: "Team" },
] as const;

export function Navbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { signIn, signOut } = useAuth();
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Convex<span className="text-primary">.</span>Paddle
          </span>
        </Link>

        <div className="flex items-center gap-0.5 rounded-xl bg-secondary/50 p-1 border border-border/50">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "relative rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200",
                pathname === link.to
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div>
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Button
              size="sm"
              className="shadow-lg shadow-primary/20"
              onClick={() => signIn()}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
