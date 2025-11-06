import { clsx } from "clsx";

export function Badge({ children, color = "neutral" }: { children: React.ReactNode; color?: "neutral" | "green" | "yellow" | "red" }) {
  const map = {
    neutral: "bg-neutral-100 text-neutral-800",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700"
  } as const;

  return <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", map[color])}>{children}</span>;
}


