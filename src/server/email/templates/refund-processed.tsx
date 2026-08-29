import type { RefundProcessedProps } from "../types";
import { EmailLayout } from "./_layout";
import { Cta, Eyebrow, Lede, OrderMeta, Panel, Title } from "./_parts";
import { mockBase } from "./_mock";

export default function RefundProcessed(props: RefundProcessedProps) {
  const { brand, customerName } = props;
  return (
    <EmailLayout
      brand={brand}
      preview={`Refund of ${props.refundAmount} — order ${props.orderNumber}`}
    >
      <Eyebrow>Refund on its way</Eyebrow>
      <Title>
        {props.fullRefund
          ? "You're fully refunded"
          : "A partial refund is on its way"}
        , {customerName}.
      </Title>
      <Lede>
        <strong>{props.refundAmount}</strong> has been sent back{" "}
        {props.destination}
        {props.refundReason ? ` — ${props.refundReason}` : ""}. It usually lands
        in 5–7 working days, depending on your bank.
      </Lede>

      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />

      <Panel heading="Refunded" tone="fill">
        {props.refundAmount} {props.destination}
      </Panel>
      <Panel heading="Original payment">{props.paymentLine}</Panel>

      <Cta href={brand.orderUrl}>View your order</Cta>
    </EmailLayout>
  );
}

RefundProcessed.PreviewProps = {
  ...mockBase,
  refundAmount: "₹1,598",
  refundReason: "returned unopened within 7 days",
  destination: "to your original payment method",
  fullRefund: true,
} satisfies RefundProcessedProps;
