import { NoAccess } from "@/components/admin/no-access";

/**
 * `(admin)/forbidden.tsx` — catches `forbidden()` thrown by an admin *page*
 * (not the layout) when a staff member opens a section their role doesn't
 * cover, e.g. `support` on `/admin/catalogue`. `requireStaff()` in the layout
 * has already passed, so this renders inside the admin shell.
 */
export default function AdminForbidden() {
  return <NoAccess variant="section" />;
}
