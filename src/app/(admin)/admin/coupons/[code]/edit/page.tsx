import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminRole } from "@/server/auth/admin";
import { getCouponForEdit } from "@/server/admin";
import { PageHeader } from "@/components/admin/ui";
import { CouponForm } from "@/components/admin/coupons/coupon-form";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit coupon · Studio" };

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireAdminRole("admin");
  const { code } = await params;
  const coupon = await getCouponForEdit(decodeURIComponent(code));
  if (!coupon) notFound();

  return (
    <>
      <Link
        href="/admin/coupons"
        className="mb-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
      >
        <Icon name="arrowLeft" className="size-3.5" />
        Coupons
      </Link>
      <PageHeader eyebrow="Studio" title={coupon.code} />
      <CouponForm mode="edit" coupon={coupon} />
    </>
  );
}
