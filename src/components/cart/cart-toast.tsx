"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useCart } from "@/components/providers/cart-provider";

/** Small confirmation toast, bottom-centre. Message + lifetime come from the cart provider. */
export function CartToast() {
  const { toast } = useCart();
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.set(el, { xPercent: -50 });
      if (toast) {
        gsap.fromTo(
          el,
          { autoAlpha: 0, yPercent: 45 },
          { autoAlpha: 1, yPercent: 0, duration: 0.3, ease: "power3.out" },
        );
      } else {
        gsap.to(el, { autoAlpha: 0, yPercent: 30, duration: 0.25, ease: "power2.in" });
      }
    },
    { dependencies: [toast], scope: ref },
  );

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="pointer-events-none invisible fixed bottom-6 left-1/2 z-[130] rounded-[2px] bg-cta px-5 py-3 text-[10.5px] tracking-[0.1em] text-w0 uppercase opacity-0"
    >
      {toast}
    </div>
  );
}
