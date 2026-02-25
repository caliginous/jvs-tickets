import { cn } from "./cn";

export function StatusPill({
  status,
}: {
  status: "paid" | "pending" | "failed" | "cancelled" | "refunded" | "other" | string;
}) {
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-800 ring-green-600/20",
    pending: "bg-amber-100 text-amber-800 ring-amber-600/20",
    failed: "bg-red-100 text-red-800 ring-red-600/20",
    cancelled: "bg-slate-100 text-slate-800 ring-slate-600/20",
    refunded: "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  };

  const cls =
    map[status] ??
    map.other ??
    "bg-slate-100 text-slate-800 ring-slate-600/20";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        cls
      )}
    >
      {status}
    </span>
  );
}
