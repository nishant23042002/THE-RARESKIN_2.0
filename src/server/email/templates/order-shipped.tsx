import type { OrderShippedProps } from "../types";
import { EmailLayout } from "./_layout";
import {
  AddressBlock,
  Cta,
  Eyebrow,
  InfoLine,
  Lede,
  LineItems,
  OrderMeta,
  Title,
} from "./_parts";
import { mockBase } from "./_mock";

/** Prepared for Phase G — no live trigger yet (nothing sets `status: shipped`). */
export default function OrderShipped(props: OrderShippedProps) {
  const { brand, customerName } = props;
  return (
    <EmailLayout
      brand={brand}
      preview={`Your order ${props.orderNumber} has shipped`}
    >
      <Eyebrow>On its way</Eyebrow>
      <Title>It&rsquo;s shipped, {customerName}.</Title>
      <Lede>
        Your order has left us
        {props.carrier ? ` with ${props.carrier}` : ""}
        {props.eta ? ` and should reach you ${props.eta}` : ""}.
      </Lede>
      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />

      {props.trackingNumber ? (
        <InfoLine heading="Tracking">
          {props.carrier ? `${props.carrier} · ` : ""}
          {props.trackingNumber}
        </InfoLine>
      ) : null}

      <LineItems items={props.items} />
      <AddressBlock heading="Delivering to" address={props.shippingAddress} />

      <Cta href={props.trackingUrl ?? brand.orderUrl}>
        {props.trackingUrl ? "Track your parcel" : "View your order"}
      </Cta>
    </EmailLayout>
  );
}

OrderShipped.PreviewProps = {
  ...mockBase,
  carrier: "Delhivery",
  trackingNumber: "DL1234567890IN",
  trackingUrl: "https://www.delhivery.com/track/package/DL1234567890IN",
  eta: "in 3–4 days",
} satisfies OrderShippedProps;
