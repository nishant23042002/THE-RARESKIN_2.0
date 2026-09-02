import Link from "next/link";

import { requireCatalogueRole } from "@/server/auth/admin";
import { fragranceSlugOptions } from "@/server/admin";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/catalogue/product-form";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product · Studio" };

export default async function NewProductPage() {
  await requireCatalogueRole();
  const fragranceOptions = await fragranceSlugOptions();

  return (
    <>
      <Link
        href="/admin/catalogue"
        className="mb-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
      >
        <Icon name="arrowLeft" className="size-3.5" />
        Catalogue
      </Link>
      <PageHeader eyebrow="Studio" title="New product" />
      <ProductForm mode="create" fragranceOptions={fragranceOptions} />
    </>
  );
}
