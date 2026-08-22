import { formatRelative } from "@/lib/utils";

/** Relative time that ignores intentional SSR/client clock skew. */
export function RelativeTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  return (
    <span className={className} suppressHydrationWarning>
      {formatRelative(iso)}
    </span>
  );
}
