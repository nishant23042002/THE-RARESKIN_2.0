import { NoAccess } from "@/components/admin/no-access";

/**
 * Root `forbidden.tsx` — Next renders this (with a `403` status) when
 * `forbidden()` is thrown outside a nested boundary. In practice that's a
 * non-staff account hitting `/admin`: the `(admin)/layout.tsx` guard throws,
 * and a layout's own interrupt is caught by the parent (root) boundary.
 */
export default function Forbidden() {
  return <NoAccess variant="studio" />;
}
