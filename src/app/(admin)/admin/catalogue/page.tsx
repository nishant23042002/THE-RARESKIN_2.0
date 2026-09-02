import Link from "next/link";

import { requireCatalogueRole } from "@/server/auth/admin";
import { listProducts, getCatalogueOverview } from "@/server/admin";
import { PageHeader } from "@/components/admin/ui";
import { CatalogueTable } from "@/components/admin/catalogue/catalogue-table";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catalogue · Studio" };

export default async function AdminCataloguePage() {
  await requireCatalogueRole();
  const [rows, overview] = await Promise.all([
    listProducts(),
    getCatalogueOverview(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Studio"
        title="Catalogue"
        actions={
          <Link
            href="/admin/catalogue/new"
            className="inline-flex items-center gap-1.5 rounded-[3px] bg-cta px-3 py-2 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-black"
          >
            <Icon name="plus" className="size-3.5" />
            New product
          </Link>
        }
      >
        {overview.byStatus.active} active · {overview.byStatus.draft} draft ·{" "}
        {overview.byStatus.archived} archived
        {overview.lowStock.length > 0 && (
          <span className="text-error">
            {" "}
            · {overview.lowStock.length} low on stock
          </span>
        )}
      </PageHeader>

      <CatalogueTable rows={rows} />
    </>
  );
}
