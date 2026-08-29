import type { PaymentFailedProps } from "../types";
import { EmailLayout } from "./_layout";
import {
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
        {props.holdUntil ? ` until ${props.holdUntil}` : " for a short window"};
        finish paying from your account and nothing is lost.
      </Lede>
      <OrderMeta orderNumber={props.orderNumber} placedAt={props.placedAt} />

      <LineItems items={props.items} />
      <Totals totals={props.totals} grandLabel="Amount due" />

      <InfoLine heading="What to do">
        Open the order and choose &ldquo;Retry payment&rdquo; — the same items,
        the same price. If it still won&rsquo;t go through, reply to this email
        and we&rsquo;ll sort it out.
      </InfoLine>

      <Cta href={brand.orderUrl}>Finish paying</Cta>
    </EmailLayout>
  );
}

PaymentFailed.PreviewProps = {
  ...mockBase,
  reason: "the bank declined the transaction",
  holdUntil: "9:02 pm today",
} satisfies PaymentFailedProps;
