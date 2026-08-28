"use client";

import { useRef, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/providers/cart-provider";
import type { CartLine } from "@/lib/cart";

type Props = Omit<CartLine, "qty"> & {
  qty?: number;
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

/**
 * The one entry point for putting something in the bag — cards, PDP, quiz,
 * discovery set all use this. Flips to "Added" briefly; the toast comes from
 * the provider.
 */
export function AddToBagButton({
  label = "Add to bag",
  variant,
  size,
  className,
  ...line
}: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  function handleClick() {
    addItem(line);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
    >
      {added ? "Added" : label}
    </Button>
  );
}
