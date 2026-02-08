import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { className: string }> = {
  active: { className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" },
  trialing: { className: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10" },
  paused: { className: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10" },
  canceled: { className: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/10" },
  cancelled: { className: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/10" },
  past_due: { className: "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/10" },
  completed: { className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" },
  billed: { className: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10" },
  paid: { className: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10" },
  draft: { className: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20 hover:bg-neutral-500/10" },
  ready: { className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10" },
  payment_failed: { className: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/10" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <Badge
      variant="outline"
      className={cn("capitalize font-medium text-[11px] tracking-wide", config.className)}
    >
      {status.replace("_", " ")}
    </Badge>
  );
}
