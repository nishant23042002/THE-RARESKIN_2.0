import { Button, Column, Hr, Img, Row, Section, Text } from "react-email";

import type { EmailAddress, EmailLineItem, EmailTotals } from "../types";
import { accent, fonts, palette } from "./theme";

const label = {
  margin: "0 0 4px",
  fontSize: "10px",
  letterSpacing: "0.16em",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  color: palette.muted,
};

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={{ ...label, color: palette.ok }}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 6px",
        fontFamily: fonts.display,
        fontSize: "24px",
        lineHeight: "1.2",
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
        margin: "0 0 20px",
        fontSize: "14px",
        lineHeight: "1.6",
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
    <Text style={{ margin: "0 0 18px", fontSize: "12.5px", color: palette.muted }}>
      Order <span style={{ color: palette.ink }}>{orderNumber}</span> · placed{" "}
      {placedAt}
    </Text>
  );
}

export function LineItems({ items }: { items: EmailLineItem[] }) {
  return (
    <Section style={{ margin: "0 0 4px" }}>
      {items.map((it, i) => (
        <Row key={it.sku + i} style={{ marginBottom: "10px" }}>
          {it.image ? (
            <Column style={{ width: "56px", verticalAlign: "top" }}>
              <Img
                src={it.image}
                alt=""
                width={48}
                height={48}
                style={{
                  border: `1px solid ${palette.line}`,
                  borderRadius: "3px",
                  objectFit: "cover",
                }}
              />
            </Column>
          ) : null}
          <Column style={{ verticalAlign: "top", paddingRight: "12px" }}>
            <Text style={{ margin: 0, fontSize: "13.5px", color: palette.ink }}>
              {it.name}
            </Text>
            <Text
              style={{ margin: "2px 0 0", fontSize: "11px", color: palette.muted }}
            >
              {it.sku} · {it.unitPrice} each · qty {it.qty}
            </Text>
          </Column>
          <Column
            style={{
              verticalAlign: "top",
              textAlign: "right",
              whiteSpace: "nowrap",
              fontSize: "13px",
              color: palette.ink,
            }}
          >
            {it.lineTotal}
          </Column>
        </Row>
      ))}
    </Section>
  );
}

export function Totals({
  totals,
  grandLabel = "Total",
}: {
  totals: EmailTotals;
  grandLabel?: string;
}) {
  const row = (l: string, v: string, tone?: "ok") => (
    <Row style={{ marginBottom: "5px" }}>
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
    <Section>
      <Hr style={{ borderColor: palette.line, margin: "14px 0" }} />
      {row("Items", totals.itemsSubtotal)}
      {totals.discount
        ? row(totals.discountLabel ?? "Discount", `− ${totals.discount}`, "ok")
        : null}
      {totals.creditApplied
        ? row("Store credit", `− ${totals.creditApplied}`, "ok")
        : null}
      {row(
        "Delivery",
        totals.shipping,
        totals.shipping === "Free" ? "ok" : undefined,
      )}
      {totals.codFee ? row("Cash-on-delivery fee", totals.codFee) : null}
      <Hr style={{ borderColor: palette.line, margin: "10px 0" }} />
      <Row>
        <Column
          style={{
            fontSize: "11px",
            letterSpacing: "0.16em",
            fontWeight: 600,
            textTransform: "uppercase",
            color: palette.muted,
          }}
        >
          {grandLabel}
        </Column>
        <Column
          style={{
            textAlign: "right",
            fontFamily: fonts.display,
            fontSize: "20px",
            color: palette.ink,
          }}
        >
          {totals.grandTotal}
        </Column>
      </Row>
    </Section>
  );
}

export function AddressBlock({
  heading,
  address,
}: {
  heading: string;
  address: EmailAddress;
}) {
  return (
    <Section style={{ margin: "18px 0 0" }}>
      <Text style={label}>{heading}</Text>
      <Text style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", color: palette.soft }}>
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
      </Text>
    </Section>
  );
}

export function InfoLine({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Section style={{ margin: "18px 0 0" }}>
      <Text style={label}>{heading}</Text>
      <Text style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", color: palette.soft }}>
        {children}
      </Text>
    </Section>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <Section
      style={{
        margin: "18px 0 0",
        padding: "12px 14px",
        border: `1px solid ${palette.line}`,
        borderLeft: `3px solid ${accent.solid}`,
        backgroundColor: palette.paper,
      }}
    >
      <Text style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.6", color: palette.soft }}>
        {children}
      </Text>
    </Section>
  );
}

export function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "24px 0 4px" }}>
      <Button
        href={href}
        style={{
          display: "inline-block",
          padding: "12px 22px",
          backgroundColor: palette.ink,
          color: palette.inverse,
          fontSize: "11px",
          letterSpacing: "0.14em",
          fontWeight: 600,
          textTransform: "uppercase",
          textDecoration: "none",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}
