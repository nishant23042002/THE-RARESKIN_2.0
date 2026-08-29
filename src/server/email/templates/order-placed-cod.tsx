import type { OrderPlacedCodProps } from "../types";
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
  Summary,
  Title,
} from "./_parts";
import { mockBase } from "./_mock";

export default function OrderPlacedCod(props: OrderPlacedCodProps) {
  const { brand, customerName } = props;
  return (
    <EmailLayout
      brand={brand}
      preview={`Order ${props.orderNumber} received — pay on delivery`}
    >
      <Eyebrow>Order received</Eyebrow>
      <Title>We&rsquo;ve got it, {customerName}.</Title>
      <Lede>
        Your order is confirmed. Nothing to pay now — keep{" "}
        <strong>{props.amountDueOnDelivery}</strong> ready for the courier.
      </Lede>

      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />
      <Pieces items={props.items} />
      <Summary totals={props.totals} grandLabel="Due on delivery" />

      <AddressPanel heading="Delivering to" address={props.shippingAddress} />
      <Panel heading="Payment">Cash on delivery</Panel>
      <Panel heading="What happens next">{props.whatsNext}</Panel>

      <Callout>
        Pay the courier in cash when your parcel arrives. We&rsquo;ll text you
        when it&rsquo;s on the way.
      </Callout>

      <Cta href={brand.orderUrl}>View your order</Cta>
    </EmailLayout>
  );
}

OrderPlacedCod.PreviewProps = {
  ...mockBase,
  paymentLine: "Cash on delivery",
  amountDueOnDelivery: "₹1,598",
  whatsNext: "Dispatched within 48 hours, and delivered in 2–7 working days across India.",
} satisfies OrderPlacedCodProps;
