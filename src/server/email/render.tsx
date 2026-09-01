import "server-only";

import type { ReactElement } from "react";
import { render } from "react-email";

import type { EmailTemplate } from "@/server/models";

import type { EmailPropsFor, EmailPropsMap } from "./types";
import OrderConfirmed from "./templates/order-confirmed";
import OrderPlacedCod from "./templates/order-placed-cod";
import PaymentFailed from "./templates/payment-failed";
import OrderCancelled from "./templates/order-cancelled";
import RefundProcessed from "./templates/refund-processed";
import OrderShipped from "./templates/order-shipped";
import OrderDelivered from "./templates/order-delivered";
import NewDevice from "./templates/new-device";

/** Subject line — pure, computed once at enqueue and stored on the row. */
export function emailSubject<T extends EmailTemplate>(
  template: T,
  props: EmailPropsFor<T>,
): string {
  const n = (props as { orderNumber?: string }).orderNumber ?? "";
  switch (template) {
    case "new-device":
      return `New sign-in to your ${
        (props as EmailPropsMap["new-device"]).brand.siteName
      } account`;
    case "order-confirmed":
      return `Order ${n} confirmed — THE RARESKIN`;
    case "order-placed-cod":
      return `Order ${n} received — pay on delivery`;
    case "payment-failed":
      return `Payment didn't go through — order ${n}`;
    case "order-cancelled":
      return `Order ${n} cancelled`;
    case "refund-processed":
      return `Refund on its way — order ${n}`;
    case "order-shipped":
      return `Your order ${n} has shipped`;
    case "order-delivered":
      return `Delivered — order ${n}`;
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}

const COMPONENTS: {
  [K in EmailTemplate]: (props: EmailPropsMap[K]) => ReactElement;
} = {
  "order-confirmed": OrderConfirmed,
  "order-placed-cod": OrderPlacedCod,
  "payment-failed": PaymentFailed,
  "order-cancelled": OrderCancelled,
  "refund-processed": RefundProcessed,
  "order-shipped": OrderShipped,
  "order-delivered": OrderDelivered,
  "new-device": NewDevice,
};

/** The React element Resend renders (via `emails.send({ react })`). */
export function renderElement<T extends EmailTemplate>(
  template: T,
  props: EmailPropsFor<T>,
): ReactElement {
  const Component = COMPONENTS[template];
  return Component(props);
}

/** Full HTML string — only for the dev `.mail/` fallback and `email:test`. */
export function renderHtml<T extends EmailTemplate>(
  template: T,
  props: EmailPropsFor<T>,
): Promise<string> {
  return render(renderElement(template, props));
}
