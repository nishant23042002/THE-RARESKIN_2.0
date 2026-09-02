import { cn } from "@/lib/cn";
import { cloudinaryVariant } from "@/lib/catalog";

/**
 * A reviewer's photo, or an initials monogram when there's none. `size` is the
 * rendered px (a 2× Cloudinary variant is requested for retina).
 */
export function Avatar({
  src,
  initials,
  size = 40,
  className,
}: {
  src: string | null;
  initials: string;
  size?: number;
  className?: string;
}) {
  const cls = cn(
    "shrink-0 overflow-hidden rounded-full border border-line-2 bg-surface-2",
    className,
  );
  const style = { width: size, height: size } as const;

  if (src) {
    return (
      <span className={cls} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cloudinaryVariant(src, { w: size * 2, h: size * 2, fill: true }) ?? src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(cls, "grid place-items-center")}
      style={style}
      aria-hidden
    >
      <span
        className="font-medium tracking-[0.02em] text-ink-3"
        style={{ fontSize: Math.round(size * 0.36) }}
      >
        {initials}
      </span>
    </span>
  );
}
