import { requireAdminRole } from "@/server/auth/admin";
import { getSettingsForEdit } from "@/server/admin";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings/settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Studio" };

export default async function SettingsPage() {
  await requireAdminRole("admin");
  const settings = await getSettingsForEdit();

  return (
    <>
      <PageHeader eyebrow="Studio" title="Site settings">
        How the store behaves — no deploy needed. Saves take effect on the next
        request.
      </PageHeader>
      <SettingsForm settings={settings} />
    </>
  );
}
