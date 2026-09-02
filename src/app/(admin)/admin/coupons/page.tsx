import Link from "next/link";

import { requireAdminRole } from "@/server/auth/admin";
import { listCoupons } from "@/server/admin";
import { PageHeader, Card, EmptyState } from "@/components/admin/ui";
import { CouponsTable } from "@/components/admin/coupons/coupons-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coupons · Studio" };

export default async function CouponsPage() {
  await requireAdminRole("admin");
  const coupons = await listCoupons();

  return (
    <>
      <PageHeader
        eyebrow="Studio"
        title="Coupons"
        actions={
          <Link
            href="/admin/coupons/new"
            className="rounded-[3px] bg-cta px-3 py-1.5 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-cta-hover"
          >
            New coupon
          </Link>
        }
      >
        {coupons.length} code{coupons.length === 1 ? "" : "s"}
      </PageHeader>

      <Card className="!p-0">
        {coupons.length === 0 ? (
          <EmptyState icon="tag">
            No coupons yet. Create one, or use <code>pnpm coupon add</code>.
          </EmptyState>
        ) : (
          <CouponsTable coupons={coupons} />
        )}
      </Card>
    </>
  );
}
