import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/types";

export function TagChip({
  tag,
  className,
  onClick,
}: {
  tag: Tag;
  className?: string;
  onClick?: () => void;
}) {
  const classes = cn(
    "inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium text-white",
    onClick && "hover:opacity-90",
    className,
  );
  const style = { backgroundColor: tag.color };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} style={style}>
        #{tag.name}
      </button>
    );
  }

  return (
    <span className={classes} style={style}>
      #{tag.name}
    </span>
  );
}
