/**
 * Isomorphic review helpers. No DB, no `server-only` — safe on the client.
 */

/**
 * How a reviewer is shown on the storefront: first name + last initial, e.g.
 * "Nishant Sapkal" → "Nishant S.". A single-word name is used as-is; an empty
 * name falls back to the badge-only label. Computed once at submit time and
 * snapshotted onto the review, so a later account rename never rewrites history.
 */
export function firstNameLastInitial(name: string | null | undefined): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "Verified Buyer";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

/** Round to one decimal place for display (4.6666 → "4.7"). */
export function formatRating(average: number): string {
  return (Math.round(average * 10) / 10).toFixed(1);
}

/** A [5★, 4★, 3★, 2★, 1★] count tuple → percentages of the total. */
export function distributionPercents(
  distribution: readonly number[],
): number[] {
  const total = distribution.reduce((s, n) => s + n, 0);
  if (total === 0) return distribution.map(() => 0);
  return distribution.map((n) => Math.round((n / total) * 100));
}
