import type { OrderPlacedCodProps } from "../types";
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
        Your order is confirmed. Keep{" "}
        <strong>{props.amountDueOnDelivery}</strong> ready for the courier — no
        payment now.
      </Lede>
      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />

      <LineItems items={props.items} />
      <Totals totals={props.totals} grandLabel="Due on delivery" />

      <AddressBlock heading="Delivering to" address={props.shippingAddress} />
      <InfoLine heading="Payment">Cash on delivery</InfoLine>
      <InfoLine heading="What happens next">{props.whatsNext}</InfoLine>

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
  whatsNext: "Dispatched within 48h · delivery 2–7 working days across India.",
} satisfies OrderPlacedCodProps;
