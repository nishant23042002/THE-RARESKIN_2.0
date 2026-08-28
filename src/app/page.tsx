import { Container } from "@/components/ui/container";
import { Hero } from "@/components/home/hero";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { fragranceList, DISCOVERY_SET, formatINR } from "@/lib/products";

/**
 * Homepage — composed of the section components as they land (Phase 4: hero).
 *
 * The "Preview the bag" block is temporary Phase 3 scaffolding, removed once the
 * real product cards (Phase 5) provide add-to-bag entry points.
 */
export default function HomePage() {
  return (
    <main id="main">
      <Hero />

      <section className="border-t border-line py-24">
        <Container className="text-center">
          <p className="eyebrow mb-5">Preview the bag &middot; temporary</p>
          <div className="mx-auto flex max-w-sm flex-wrap justify-center gap-2">
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
        </Container>
      </section>
    </main>
  );
}
