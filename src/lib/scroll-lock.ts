/**
 * Reference-counted scroll lock.
 *
 * `body.is-locked` sets `overflow: hidden` (see `globals.css`) and is also read
 * by the hero carousel to pause itself. Several overlays can want it at once —
 * the cart drawer and, stacked on top of it, the sign-in modal. A plain
 * `classList.add/remove` race would drop the lock the moment the modal closed
 * while the drawer was still open. This keeps the class present until every
 * holder has released it.
 */

const holders = new Set<string>();

function sync(): void {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("is-locked", holders.size > 0);
}

export function lockScroll(key: string): void {
  holders.add(key);
  sync();
}

export function unlockScroll(key: string): void {
  holders.delete(key);
  sync();
}
