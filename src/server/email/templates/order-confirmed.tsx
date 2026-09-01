import type { OrderConfirmedProps } from "../types";
import { EmailLayout } from "./_layout";
import {
  AddressPanel,
  Callout,
  Cta,
  Eyebrow,
  Lede,
  OrderMeta,
  Panel,
  Pieces,
  SubLink,
  Summary,
  Title,
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
        Your payment is confirmed and your order is being made ready. This is
        yours to keep.
      </Lede>

      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />
      <Pieces items={props.items} />
      <Summary totals={props.totals} grandLabel="Paid" />

      <AddressPanel heading="Delivering to" address={props.shippingAddress} />
      <Panel heading="Paid with">{props.paymentLine}</Panel>
      <Panel heading="What happens next">{whatsNext}</Panel>

      {discoverySetCredit ? (
        <Callout>
          Your Discovery Set credit of{" "}
          <strong>{discoverySetCredit.amount}</strong> is now on your account —
          it comes off your first full-size bottle automatically
          {discoverySetCredit.expires
            ? `, valid until ${discoverySetCredit.expires}.`
            : "."}
        </Callout>
      ) : null}

      <Cta href={brand.orderUrl}>View your order</Cta>
      <SubLink href={brand.invoiceUrl}>Download your invoice (PDF)</SubLink>
    </EmailLayout>
  );
}

OrderConfirmed.PreviewProps = {
  ...mockBase,
  whatsNext: "Dispatched within 48 hours, and delivered in 2–7 working days across India.",
  discoverySetCredit: { amount: "₹799", expires: null },
} satisfies OrderConfirmedProps;
