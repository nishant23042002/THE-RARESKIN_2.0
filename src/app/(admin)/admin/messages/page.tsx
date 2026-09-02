import { requireAdminRole } from "@/server/auth/admin";
import { listContactMessages } from "@/server/admin";
import { PageHeader, Card, EmptyState } from "@/components/admin/ui";
import { MessagesView } from "@/components/admin/messages/messages-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages · Studio" };

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminRole("support");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const statusRaw = one(sp.status);
  const status: "new" | "handled" | "all" =
    statusRaw === "handled" ? "handled" : statusRaw === "all" ? "all" : "new";
  const q = one(sp.q)?.trim() ?? "";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const list = await listContactMessages({ status, q, page });

  return (
    <>
      <PageHeader eyebrow="Studio" title="Messages">
        {list.counts.new} new · {list.counts.handled} handled
      </PageHeader>

      <Card className="!p-0">
        {list.rows.length === 0 && !q && status === "new" ? (
          <EmptyState icon="mail">
            No new enquiries. Messages from the contact form land here.
          </EmptyState>
        ) : (
          <MessagesView
            rows={list.rows}
            status={status}
            q={q}
            counts={list.counts}
          />
        )}
      </Card>
    </>
  );
}
