import type { PaymentFailedProps } from "../types";
import { EmailLayout } from "./_layout";
import {
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

export default function PaymentFailed(props: PaymentFailedProps) {
  const { brand, customerName } = props;
  return (
    <EmailLayout
      brand={brand}
      preview={`Payment didn't go through — order ${props.orderNumber}`}
    >
      <Eyebrow>Payment didn&rsquo;t go through</Eyebrow>
      <Title>Nearly there, {customerName}.</Title>
      <Lede>
        We couldn&rsquo;t take payment for this order
        {props.reason ? ` — ${props.reason}` : ""}. Your bag is held
        {props.holdUntil ? ` until ${props.holdUntil}` : " for a short while"};
        finish paying from your account and nothing is lost.
      </Lede>

      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />
      <Pieces items={props.items} />
      <Summary totals={props.totals} grandLabel="Amount due" />

      <Panel heading="What to do" tone="fill">
        Open the order and choose &ldquo;Retry payment&rdquo; — same items, same
        price. If it still won&rsquo;t go through, just reply and we&rsquo;ll
        sort it out.
      </Panel>

      <Cta href={brand.orderUrl}>Finish paying</Cta>
    </EmailLayout>
  );
}

PaymentFailed.PreviewProps = {
  ...mockBase,
  reason: "the bank declined the transaction",
  holdUntil: "9:02 pm today",
} satisfies PaymentFailedProps;
