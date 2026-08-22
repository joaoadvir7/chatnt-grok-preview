import { cn, initials } from "@/lib/utils";

const COLORS = [
  "#0f9f6e",
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#dc4b4b",
];

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        size === "sm" && "h-8 w-8 text-xs",
        size === "md" && "h-10 w-10 text-sm",
        size === "lg" && "h-12 w-12 text-base",
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
