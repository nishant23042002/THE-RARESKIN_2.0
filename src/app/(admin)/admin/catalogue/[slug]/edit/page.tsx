import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCatalogueRole } from "@/server/auth/admin";
import { getProductForEdit, fragranceSlugOptions } from "@/server/admin";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/catalogue/product-form";
import { StockPanel } from "@/components/admin/catalogue/stock-panel";
import { DuplicateButton } from "@/components/admin/catalogue/product-actions";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireCatalogueRole();
  const { slug } = await params;
  const [product, fragranceOptions] = await Promise.all([
    getProductForEdit(decodeURIComponent(slug)),
    fragranceSlugOptions(),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link
        href="/admin/catalogue"
        className="mb-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
      >
        <Icon name="arrowLeft" className="size-3.5" />
        Catalogue
      </Link>
      <PageHeader
        eyebrow={`${product.kind} · ${product.status}`}
        title={product.name}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={
                product.kind === "set"
                  ? "/discovery-set"
                  : `/fragrances/${product.slug}`
              }
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:border-ink hover:text-ink"
            >
              View <Icon name="external" className="size-3" />
            </Link>
            <DuplicateButton slug={product.slug} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <ProductForm
          mode="edit"
          product={product}
          fragranceOptions={fragranceOptions}
        />
        <div className="lg:sticky lg:top-6 lg:self-start">
          <StockPanel
            slug={product.slug}
            stock={product.inventory.stock}
            threshold={product.inventory.lowStockThreshold}
            ledger={product.ledger}
          />
        </div>
      </div>
    </>
  );
}
