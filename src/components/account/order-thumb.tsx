import { Flacon } from "@/components/ui/flacon";
import { Mark } from "@/components/ui/mark";
import { isFragranceSlug } from "@/lib/catalog";
import { cn } from "@/lib/cn";

/**
 * An ordered item's visual — the live catalogue packshot when one exists,
 * otherwise the vector flacon (fragrances) or the house mark. Shared by the
 * order list rows, the `/account` recent strip and the order detail cards so
 * the treatment stays identical everywhere and a gallery change propagates.
 */
export function OrderThumb({
  slug,
  image,
  isFragrance,
  alt = "",
  className,
  flaconClass = "w-1/2",
}: {
  slug: string;
  image: string | null;
  isFragrance?: boolean;
  alt?: string;
  className?: string;
  flaconClass?: string;
}) {
  const frag = (isFragrance ?? isFragranceSlug(slug)) && isFragranceSlug(slug);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden border border-line bg-surface",
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : frag ? (
        <Flacon fragrance={slug} className={flaconClass} />
      ) : (
        <span className="relative grid h-full w-full place-items-center">
          <span
            aria-hidden
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #e0d7bf 0%, #c5872f 52%, #3d2712 100%)",
            }}
          />
          <Mark className="relative w-1/3 text-ink-2" />
        </span>
      )}
    </span>
  );
}
