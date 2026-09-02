import { requireStaff } from "@/server/auth/admin";
import { listNotifications } from "@/server/admin";
import { PageHeader, Card } from "@/components/admin/ui";
import { NotificationsView } from "@/components/admin/notifications/notifications-view";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/lib/validation/notification";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications · Studio" };

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const raw = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const category = (NOTIFICATION_CATEGORIES as readonly string[]).includes(
    raw ?? "",
  )
    ? (raw as NotificationCategory)
    : undefined;

  const feed = await listNotifications(
    { category, limit: 40 },
    { userId: ctx.user.id, role: ctx.user.role },
  );

  return (
    <>
      <PageHeader eyebrow="Studio" title="Notifications">
        {feed.unread} unread
      </PageHeader>

      <Card className="!p-0">
        <NotificationsView
          initialRows={feed.rows}
          initialCursor={feed.nextCursor}
          category={category ?? "all"}
        />
      </Card>
    </>
  );
}
