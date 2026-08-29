import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

import type { EmailBrand } from "../types";
import { accent, fonts, palette } from "./theme";

/**
 * The shell every transactional email sits inside: a 600px card on warm paper,
 * the wordmark, a hairline tri-fragrance rule, the message, then a transactional
 * footer (no unsubscribe — these are order emails, not marketing).
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
          padding: "24px 0",
          backgroundColor: palette.paper,
          fontFamily: fonts.body,
          color: palette.ink,
        }}
      >
        <Container
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: palette.card,
            border: `1px solid ${palette.line}`,
          }}
        >
          <Section style={{ padding: "26px 32px 0" }}>
            <Link
              href={brand.siteUrl}
              style={{
                fontFamily: fonts.body,
                fontSize: "13px",
                letterSpacing: "0.34em",
                fontWeight: 600,
                color: palette.ink,
                textDecoration: "none",
                textTransform: "uppercase",
              }}
            >
              {brand.siteName}
            </Link>
          </Section>

          <Section style={{ padding: "16px 0 0" }}>
            <div
              style={{
                height: "3px",
                background: accent.gradient,
                backgroundColor: accent.solid,
              }}
            />
          </Section>

          <Section style={{ padding: "28px 32px 8px" }}>{children}</Section>

          <Hr style={{ borderColor: palette.line, margin: "8px 0 0" }} />

          <Section style={{ padding: "20px 32px 28px" }}>
            <Text
              style={{
                margin: "0 0 6px",
                fontSize: "12px",
                lineHeight: "1.6",
                color: palette.muted,
              }}
            >
              {brand.legalName} · {brand.supportAddress}
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: "1.6",
                color: palette.muted,
              }}
            >
              Questions?{" "}
              <Link
                href={`mailto:${brand.supportEmail}`}
                style={{ color: palette.soft }}
              >
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
