import { Button, Column, Hr, Img, Row, Section, Text } from "react-email";

import type { EmailAddress, EmailLineItem, EmailTotals } from "../types";
import { accent, fonts, palette } from "./theme";

const eyebrowStyle = {
  margin: "0 0 12px",
  fontSize: "10px",
  letterSpacing: "0.2em",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  color: palette.ok,
};

const sectionLabel = {
  margin: "0 0 8px",
  fontSize: "10px",
  letterSpacing: "0.18em",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  color: palette.muted,
};

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={eyebrowStyle}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 12px",
        fontFamily: fonts.display,
        fontSize: "27px",
        lineHeight: "1.22",
        fontWeight: 400,
        color: palette.ink,
      }}
    >
      {children}
    </Text>
  );
}

export function Lede({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 28px",
        fontSize: "14.5px",
        lineHeight: "1.72",
        color: palette.soft,
      }}
    >
      {children}
    </Text>
  );
}

export function OrderMeta({
  orderNumber,
  placedAt,
}: {
  orderNumber: string;
  placedAt: string;
}) {
  return (
    <Section style={{ margin: "0 0 26px" }}>
      <div style={{ borderTop: `1px solid ${palette.line}` }} />
      <Text style={{ margin: "12px 0 0", fontSize: "12px", color: palette.muted }}>
        Order{" "}
        <span style={{ color: palette.ink, letterSpacing: "0.02em" }}>
          {orderNumber}
        </span>
        <span style={{ margin: "0 8px", color: palette.line }}>|</span>
        {placedAt}
      </Text>
    </Section>
  );
}

/** One ordered piece — packshot, name, concentration, a single note line. */
export function Pieces({ items }: { items: EmailLineItem[] }) {
  return (
    <Section style={{ margin: "0 0 8px" }}>
      {items.map((it, i) => (
        <Row
          key={it.sku + i}
          style={{
            borderTop: i === 0 ? "none" : `1px solid ${palette.line}`,
          }}
        >
          <Column style={{ width: "76px", padding: "18px 16px 18px 0", verticalAlign: "top" }}>
            {it.image ? (
              <Img
                src={it.image}
                alt={it.name}
                width={60}
                height={60}
                style={{
                  border: `1px solid ${palette.line}`,
                  borderRadius: "4px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  border: `1px solid ${palette.line}`,
                  borderRadius: "4px",
                  background: palette.faint,
                }}
              />
            )}
          </Column>
          <Column style={{ padding: "18px 0", verticalAlign: "top" }}>
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
            <Text style={{ margin: "3px 0 0", fontSize: "11px", color: palette.muted }}>
              {it.concentration}
              {it.qty > 1 ? ` · ${it.qty} bottles` : ""}
            </Text>
            {it.noteLine ? (
              <Text
                style={{
                  margin: "6px 0 0",
                  fontSize: "11.5px",
                  fontStyle: "italic",
                  color: palette.muted,
                }}
              >
                {it.noteLine}
              </Text>
            ) : null}
          </Column>
          <Column
            style={{
              padding: "18px 0",
              verticalAlign: "top",
              textAlign: "right",
              whiteSpace: "nowrap",
            }}
          >
            <Text style={{ margin: 0, fontSize: "13px", color: palette.ink }}>
              {it.lineTotal}
            </Text>
            {it.qty > 1 ? (
              <Text style={{ margin: "2px 0 0", fontSize: "10.5px", color: palette.muted }}>
                {it.qty} × {it.unitPrice}
              </Text>
            ) : null}
          </Column>
        </Row>
      ))}
    </Section>
  );
}

/** A calm label / value summary — spacing, not rules, does the separating. */
export function Summary({
  totals,
  grandLabel = "Total",
}: {
  totals: EmailTotals;
  grandLabel?: string;
}) {
  const line = (l: string, v: string, tone?: "ok") => (
    <Row style={{ marginBottom: "9px" }}>
      <Column style={{ fontSize: "12.5px", color: palette.soft }}>{l}</Column>
      <Column
        style={{
          textAlign: "right",
          fontSize: "12.5px",
          color: tone === "ok" ? palette.ok : palette.ink,
        }}
      >
        {v}
      </Column>
    </Row>
  );
  return (
    <Section style={{ margin: "18px 0 0", borderTop: `1px solid ${palette.line}`, paddingTop: "18px" }}>
      {line("Items", totals.itemsSubtotal)}
      {totals.discount
        ? line(totals.discountLabel ?? "Discount", `− ${totals.discount}`, "ok")
        : null}
      {totals.creditApplied
        ? line("Store credit", `− ${totals.creditApplied}`, "ok")
        : null}
      {line(
        "Delivery",
        totals.shipping,
        totals.shipping === "Free" ? "ok" : undefined,
      )}
      {totals.codFee ? line("Cash-on-delivery fee", totals.codFee) : null}
      <Row style={{ marginTop: "14px" }}>
        <Column style={{ verticalAlign: "bottom" }}>
          <Text style={{ ...sectionLabel, margin: 0 }}>{grandLabel}</Text>
        </Column>
        <Column
          style={{
            textAlign: "right",
            fontFamily: fonts.display,
            fontSize: "23px",
            color: palette.ink,
          }}
        >
          {totals.grandTotal}
        </Column>
      </Row>
    </Section>
  );
}

export function Panel({
  heading,
  children,
  tone = "plain",
}: {
  heading: string;
  children: React.ReactNode;
  tone?: "plain" | "fill";
}) {
  return (
    <Section
      style={
        tone === "fill"
          ? {
              margin: "16px 0 0",
              padding: "16px 18px",
              background: palette.faint,
              borderRadius: "4px",
            }
          : { margin: "24px 0 0" }
      }
    >
      <Text style={sectionLabel}>{heading}</Text>
      <Text
        style={{ margin: 0, fontSize: "13px", lineHeight: "1.72", color: palette.soft }}
      >
        {children}
      </Text>
    </Section>
  );
}

export function AddressPanel({
  heading,
  address,
}: {
  heading: string;
  address: EmailAddress;
}) {
  return (
    <Panel heading={heading}>
      <span style={{ color: palette.ink }}>{address.name}</span>
      <br />
      {address.line1}
      {address.line2 ? `, ${address.line2}` : ""}
      <br />
      {address.landmark ? (
        <>
          {address.landmark}
          <br />
        </>
      ) : null}
      {address.city}, {address.state} — {address.pincode}
      <br />
      {address.phone}
    </Panel>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <Section
      style={{
        margin: "24px 0 0",
        padding: "14px 16px",
        borderLeft: `2px solid ${accent.solid}`,
        background: palette.faint,
      }}
    >
      <Text style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.7", color: palette.soft }}>
        {children}
      </Text>
    </Section>
  );
}

export function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "30px 0 6px", textAlign: "center" }}>
      <Button
        href={href}
        style={{
          display: "inline-block",
          padding: "13px 30px",
          backgroundColor: palette.ink,
          color: palette.inverse,
          fontSize: "11px",
          letterSpacing: "0.16em",
          fontWeight: 700,
          textTransform: "uppercase",
          textDecoration: "none",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

/** thin section spacer for when a hairline would be too much */
export function Gap() {
  return <Hr style={{ borderColor: "transparent", margin: "10px 0" }} />;
}
