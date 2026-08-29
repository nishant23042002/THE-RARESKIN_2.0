import type { OrderConfirmedProps } from "../types";
import { EmailLayout } from "./_layout";
import {
  AddressBlock,
  Callout,
  Cta,
  Eyebrow,
  InfoLine,
  Lede,
  LineItems,
  OrderMeta,
  Title,
  Totals,
} from "./_parts";
import { mockBase } from "./_mock";

export default function OrderConfirmed(props: OrderConfirmedProps) {
  const { brand, customerName, whatsNext, discoverySetCredit } = props;
  return (
    <EmailLayout
      brand={brand}
      preview={`Payment received — order ${props.orderNumber}`}
    >
      <Eyebrow>Payment received</Eyebrow>
      <Title>Thank you, {customerName}.</Title>
      <Lede>
        Your payment is confirmed and your order is being prepared. Here&rsquo;s
        everything, for your records.
      </Lede>
      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />

      <LineItems items={props.items} />
      <Totals totals={props.totals} grandLabel="Paid" />

      <AddressBlock heading="Delivering to" address={props.shippingAddress} />
      <InfoLine heading="Payment">{props.paymentLine}</InfoLine>
      <InfoLine heading="What happens next">{whatsNext}</InfoLine>

      {discoverySetCredit ? (
        <Callout>
          Your Discovery Set credit of{" "}
          <strong>{discoverySetCredit.amount}</strong> is now on your account —
          it comes off your first full-size bottle automatically
          {discoverySetCredit.expires
            ? `, and is valid until ${discoverySetCredit.expires}.`
            : "."}
        </Callout>
      ) : null}

      <Cta href={brand.orderUrl}>View your order</Cta>
    </EmailLayout>
  );
}

OrderConfirmed.PreviewProps = {
  ...mockBase,
  whatsNext: "Dispatched within 48h · delivery 2–7 working days across India.",
  discoverySetCredit: { amount: "₹799", expires: null },
} satisfies OrderConfirmedProps;
