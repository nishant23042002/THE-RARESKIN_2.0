/** Tiny class-name joiner — falsy values dropped, no dependency. */
export function cn(
  ...parts: Array<string | number | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
