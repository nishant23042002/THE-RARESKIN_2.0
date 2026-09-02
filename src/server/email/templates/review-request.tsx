import { Column, Img, Row, Section, Text } from "react-email";

import type { ReviewRequestProps } from "../types";
import { EmailLayout } from "./_layout";
import { Cta, Eyebrow, Lede, Title } from "./_parts";
import { palette, fonts } from "./theme";
import { mockReviewRequest } from "./_mock";

/** Sent ~5 days after an order is delivered (daily cron), asking for a review. */
export default function ReviewRequest(props: ReviewRequestProps) {
  const { brand, customerName, items } = props;
  const first = items[0]?.name ?? "your fragrance";

  return (
    <EmailLayout
      brand={brand}
      preview={`How is ${first} wearing?`}
    >
      <Eyebrow>Your thoughts</Eyebrow>
      <Title>How is it wearing, {customerName}?</Title>
      <Lede>
        {props.deliveredAt
          ? `Your order reached you on ${props.deliveredAt}. `
          : ""}
        A few days in is the right time to tell — how it opens, how long it
        stays, when you reach for it. If you have a minute, a short review helps
        the next person choose.
      </Lede>

      <Section style={{ margin: "0 0 8px" }}>
        {items.map((it, i) => (
          <Row
            key={it.slug + i}
            style={{ borderTop: i === 0 ? "none" : `1px solid ${palette.line}` }}
          >
            <Column
              style={{
                width: "72px",
                padding: "14px 16px 14px 0",
                verticalAlign: "middle",
              }}
            >
              {it.image ? (
                <Img
                  src={it.image}
                  alt={it.name}
                  width={56}
                  height={56}
                  style={{
                    border: `1px solid ${palette.line}`,
                    borderRadius: "4px",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    border: `1px solid ${palette.line}`,
                    borderRadius: "4px",
                    background: palette.faint,
                  }}
                />
              )}
            </Column>
            <Column style={{ padding: "14px 0", verticalAlign: "middle" }}>
              <Text
                style={{
                  margin: 0,
                  fontFamily: fonts.display,
                  fontSize: "15.5px",
                  color: palette.ink,
                }}
              >
                {it.name}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Cta href={props.reviewUrl}>Write a review</Cta>

      <Text
        style={{
          margin: "18px 0 0",
          fontSize: "11.5px",
          lineHeight: "1.7",
          color: palette.muted,
        }}
      >
        Reviews are checked by our team before they appear. You&rsquo;ll be shown
        as your first name and last initial, with a Verified Buyer badge — order{" "}
        {props.orderNumber}.
      </Text>
    </EmailLayout>
  );
}

ReviewRequest.PreviewProps = mockReviewRequest satisfies ReviewRequestProps;
