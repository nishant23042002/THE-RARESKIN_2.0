import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

import type { EmailBrand } from "../types";
import { accent, fonts, palette, space } from "./theme";

/**
 * The shell every transactional email sits in: a calm 560px card on warm paper.
 * A centred masthead, a hairline tri-fragrance rule, room to breathe, and a
 * quiet transactional footer (no unsubscribe — these are order emails).
 */
export function EmailLayout({
  brand,
  preview,
  children,
}: {
  brand: EmailBrand;
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "32px 0 40px",
          backgroundColor: palette.paper,
          fontFamily: fonts.body,
          color: palette.ink,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <Container
          style={{
            width: "100%",
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: palette.card,
          }}
        >
          {/* masthead */}
          <Section style={{ padding: "38px 0 26px", textAlign: "center" }}>
            <Link href={brand.siteUrl}>
              <Img
                src={brand.logoUrl}
                alt={brand.siteName}
                width={176}
                height={67}
                style={{ display: "inline-block", border: 0 }}
              />
            </Link>
          </Section>

          <div
            style={{
              height: "2px",
              background: accent.gradient,
              backgroundColor: accent.solid,
            }}
          />

          <Section style={{ padding: `${space.band} ${space.gutter} 8px` }}>
            {children}
          </Section>

          {/* footer */}
          <Section
            style={{
              padding: `28px ${space.gutter} 34px`,
              borderTop: `1px solid ${palette.line}`,
            }}
          >
            <Text
              style={{
                margin: "0 0 8px",
                fontFamily: fonts.display,
                fontStyle: "italic",
                fontSize: "14px",
                color: palette.muted,
              }}
            >
              Scents that stay with you.
            </Text>
            <Text
              style={{
                margin: "0 0 4px",
                fontSize: "11px",
                lineHeight: "1.6",
                color: palette.muted,
              }}
            >
              {brand.legalName} · {brand.supportAddress}
            </Text>
            <Text
              style={{ margin: 0, fontSize: "11px", lineHeight: "1.6", color: palette.muted }}
            >
              Questions? Just reply, or write to{" "}
              <Link href={`mailto:${brand.supportEmail}`} style={{ color: palette.soft }}>
                {brand.supportEmail}
              </Link>
              . You&rsquo;re receiving this because you placed an order with{" "}
              {brand.siteName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
