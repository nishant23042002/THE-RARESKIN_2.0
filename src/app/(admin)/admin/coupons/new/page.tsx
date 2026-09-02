import Link from "next/link";

import { requireAdminRole } from "@/server/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { CouponForm } from "@/components/admin/coupons/coupon-form";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "New coupon · Studio" };

export default async function NewCouponPage() {
  await requireAdminRole("admin");

  return (
    <>
      <Link
        href="/admin/coupons"
        className="mb-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
      >
        <Icon name="arrowLeft" className="size-3.5" />
        Coupons
      </Link>
      <PageHeader eyebrow="Studio" title="New coupon" />
      <CouponForm mode="create" />
    </>
  );
}
