import type { OrderDeliveredProps } from "../types";
import { EmailLayout } from "./_layout";
import { Cta, Eyebrow, Lede, OrderMeta, Panel, Title } from "./_parts";
import { mockBase } from "./_mock";

/** Prepared for Phase G — no live trigger yet (nothing sets `status: delivered`). */
export default function OrderDelivered(props: OrderDeliveredProps) {
  const { brand, customerName } = props;
  return (
    <EmailLayout brand={brand} preview={`Delivered — order ${props.orderNumber}`}>
      <Eyebrow>Delivered</Eyebrow>
      <Title>It&rsquo;s with you, {customerName}.</Title>
      <Lede>
        Your order was delivered on {props.deliveredAt}. Two or three sprays to
        the pulse points — then let it settle, rather than reaching for more.
      </Lede>

      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />

      <Panel heading="Something not right?">
        If anything arrived damaged or missing, reply within 48 hours and
        we&rsquo;ll make it right.
      </Panel>

      <Cta href={brand.orderUrl}>View your order</Cta>
    </EmailLayout>
  );
}

OrderDelivered.PreviewProps = {
  ...mockBase,
  deliveredAt: "1 Sep 2026, 2:14 pm",
} satisfies OrderDeliveredProps;
