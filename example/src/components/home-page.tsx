import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, CreditCard, Users, Shield, ArrowRight, Github } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Subscriptions",
    description:
      "Create, pause, resume, and cancel subscriptions. Seat-based pricing supported out of the box.",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
  },
  {
    icon: CreditCard,
    title: "One-Time Payments",
    description:
      "Process single transactions with Paddle checkout. Supports inline or overlay checkout modes.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
  {
    icon: Users,
    title: "Team Billing",
    description:
      "Organization-level subscriptions with per-seat pricing and dynamic seat management.",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
  {
    icon: Shield,
    title: "Webhook Sync",
    description:
      "Automatic webhook handling with signature verification, idempotency, and real-time database sync.",
    color: "text-rose-400",
    bg: "bg-rose-400/10 border-rose-400/20",
  },
];

export function HomePage() {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative py-24 text-center mesh-bg overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-10 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-10 right-1/4 h-56 w-56 rounded-full bg-rose-500/5 blur-3xl animate-[float_10s_ease-in-out_infinite_2s]" />

        <div className="relative animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" />
            Open Source Billing Component
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl leading-[1.05]">
            Paddle Billing
            <br />
            for <span className="hero-gradient text-glow">Convex</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            A complete billing solution. Manage subscriptions, process payments,
            and handle team billing — all synced in real-time.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              className="h-12 px-8 text-base shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow"
              asChild
            >
              <Link to="/store">
                View Plans
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base border-border/80 hover:border-foreground/20"
              asChild
            >
              <a
                href="https://github.com/flyweightdev/convex-paddle"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                View Source
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border/50 bg-card/50 p-6 transition-all duration-300 hover:border-border hover:bg-card animate-fade-up"
              style={{ animationDelay: `${i * 100 + 200}ms` }}
              onMouseMove={handleMouseMove}
            >
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${f.bg}`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.description}
              </p>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(38 92% 55% / 0.03), transparent 40%)`,
                }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
