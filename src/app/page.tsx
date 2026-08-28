import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { fragranceList, DISCOVERY_SET, formatINR } from "@/lib/products";

/**
 * Placeholder home page. Replaced by the composed homepage sections from
 * Phase 4 (hero) onward; kept minimal so `/` is presentable in the meantime.
 *
 * The "Preview the bag" block is temporary scaffolding for Phase 3 — removed
 * once the real product cards (Phase 5) provide add-to-bag entry points.
 */
export default function HomePage() {
  return (
    <main id="main" className="flex min-h-[100svh] items-center py-32">
      <Container className="text-center">
        <Logo className="mx-auto w-[min(420px,72vw)] text-ink" />
        <p className="serif-italic mt-10 text-[clamp(1.4rem,3.6vw,2.2rem)] leading-tight text-ink-2">
          Scents that stay with you.
        </p>
        <p className="eyebrow mt-14">The site is coming together</p>

        <div className="mx-auto mt-16 max-w-sm border-t border-line pt-10">
          <p className="eyebrow mb-5">Preview the bag &middot; temporary</p>
          <div className="flex flex-wrap justify-center gap-2">
            {fragranceList.map((f) => (
              <AddToBagButton
                key={f.slug}
                sku={f.slug}
                name={f.name}
                price={f.price}
                mrp={f.mrp}
                fragrance={f.slug}
                href={`/fragrances/${f.slug}`}
                meta={`Extrait · ${f.volumeMl} ml`}
                label={`${f.name} · ${formatINR(f.price)}`}
                variant="ghost"
                size="sm"
              />
            ))}
            <AddToBagButton
              sku={DISCOVERY_SET.slug}
              name={DISCOVERY_SET.name}
              price={DISCOVERY_SET.price}
              mrp={DISCOVERY_SET.mrp}
              href="/discovery-set"
              meta={`${DISCOVERY_SET.vialCount} × ${DISCOVERY_SET.perVialMl} ml`}
              label={`Discovery Set · ${formatINR(DISCOVERY_SET.price)}`}
              variant="ghost"
              size="sm"
            />
          </div>
        </div>
      </Container>
    </main>
  );
}
