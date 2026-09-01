import "server-only";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Path,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  StyleSheet,
} from "@react-pdf/renderer";

import type { InvoiceData, InvoiceLine } from "./data";

/**
 * THE RARESKIN invoice — a fragrance house's document, not a spreadsheet.
 * The line items show the flacon in its own juice; each fragrance carries its
 * three headline notes; the tri-juice rule (aurévan · orvélis · vayrén) is the
 * same signature that runs through the site and the order emails. One page for
 * a normal order.
 */

const PAGE_PAD = 44;
const CW = 595.28 - PAGE_PAD * 2; // A4 content width ≈ 507

const c = {
  ink: "#1b1712",
  soft: "#4c443c",
  muted: "#8a8073",
  faint: "#f6f2e9",
  line: "#e5dfd3",
  hair: "#efe9dd",
  ok: "#4a7355",
  paper: "#ffffff",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: c.paper,
    color: c.ink,
    paddingTop: 40,
    paddingBottom: 72,
    paddingHorizontal: PAGE_PAD,
    fontFamily: "Jost",
    fontSize: 9,
    lineHeight: 1.5,
  },

  // masthead
  masthead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  wordmark: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandName: { fontFamily: "Newsreader", fontWeight: 600, fontSize: 15, letterSpacing: 3 },
  brandKicker: { fontSize: 6.5, letterSpacing: 2.4, color: c.muted, marginTop: 3, textTransform: "uppercase" },
  invoiceTitle: { fontFamily: "Newsreader", fontWeight: 400, fontSize: 25, letterSpacing: 1, textAlign: "right" },
  metaRight: { marginTop: 9, flexDirection: "column", alignItems: "flex-end", gap: 2 },
  metaLine: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  metaKey: { fontSize: 7, letterSpacing: 1.4, color: c.muted, textTransform: "uppercase" },
  metaVal: { fontSize: 8.5, color: c.soft },

  rule: { marginTop: 13, marginBottom: 14 },

  // party blocks
  parties: { flexDirection: "row", gap: 26 },
  party: { flex: 1 },
  label: { fontSize: 7, letterSpacing: 1.8, color: c.muted, textTransform: "uppercase", marginBottom: 5 },
  partyName: { fontFamily: "Newsreader", fontWeight: 600, fontSize: 10.5, marginBottom: 2 },
  partyLine: { fontSize: 8.5, color: c.soft },

  // order strip
  strip: {
    marginTop: 13,
    marginBottom: 16,
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.line,
    paddingVertical: 7,
  },
  stripCell: { flex: 1 },
  stripKey: { fontSize: 6.5, letterSpacing: 1.6, color: c.muted, textTransform: "uppercase" },
  stripVal: { fontSize: 9, color: c.ink, marginTop: 2 },

  // items table
  thead: { flexDirection: "row", paddingBottom: 6, borderBottomWidth: 1, borderColor: c.ink },
  th: { fontSize: 6.5, letterSpacing: 1.6, color: c.muted, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 9, borderBottomWidth: 1, borderColor: c.hair },
  cItem: { flexDirection: "row", gap: 11, width: CW * 0.56 },
  cQty: { width: CW * 0.1, textAlign: "center", fontSize: 9 },
  cUnit: { width: CW * 0.17, textAlign: "right", fontSize: 9 },
  cAmt: { width: CW * 0.17, textAlign: "right", fontSize: 9 },
  itemName: { fontFamily: "Newsreader", fontWeight: 400, fontSize: 11, marginBottom: 2 },
  itemMeta: { fontSize: 7, letterSpacing: 0.8, color: c.muted, textTransform: "uppercase" },
  itemNote: { fontFamily: "Newsreader", fontWeight: 400, fontStyle: "italic", fontSize: 8, color: c.soft, marginTop: 3 },

  // totals
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  totals: { width: CW * 0.52 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  tKey: { fontSize: 8.5, color: c.soft },
  tVal: { fontSize: 8.5, color: c.ink },
  taxNote: { fontSize: 7, color: c.muted, marginTop: 4, marginBottom: 2 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: c.ink,
  },
  grandKey: { fontSize: 7.5, letterSpacing: 1.6, color: c.muted, textTransform: "uppercase" },
  grandVal: { fontFamily: "Newsreader", fontWeight: 600, fontSize: 15 },
  words: { fontFamily: "Newsreader", fontStyle: "italic", fontSize: 8, color: c.soft, marginTop: 6, textAlign: "right" },

  // payment panel
  pay: { marginTop: 16, backgroundColor: c.faint, borderRadius: 3, padding: 12, flexDirection: "row", gap: 22 },
  payCol: { flex: 1 },
  payKey: { fontSize: 6.5, letterSpacing: 1.6, color: c.muted, textTransform: "uppercase" },
  payVal: { fontSize: 9, color: c.ink, marginTop: 2 },

  note: { marginTop: 16 },
  noteBody: { fontFamily: "Newsreader", fontStyle: "italic", fontSize: 9, color: c.soft },

  close: { marginTop: 15, alignItems: "center", gap: 6 },
  closeLine: { fontFamily: "Newsreader", fontStyle: "italic", fontSize: 9.5, color: c.soft },

  // footer
  footer: { position: "absolute", bottom: 30, left: PAGE_PAD, right: PAGE_PAD },
  footInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 },
  tagline: { fontFamily: "Newsreader", fontStyle: "italic", fontSize: 9, color: c.ink },
  legal: { fontSize: 7, color: c.muted, marginTop: 3 },
  pageNo: { fontSize: 7, color: c.muted },
});

// ── vector glyphs ─────────────────────────────────────────────────────

/** The crossbar-less "A" — the brand device. */
function Mark({ size = 15, color = c.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={(size * 8) / 12} viewBox="0 0 12 8">
      <Path
        d="M1 7 L6 1.4 L11 7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function JuiceRule() {
  return (
    <View style={s.rule}>
      <Svg width={CW} height={2.5}>
        <Defs>
          <LinearGradient id="juice" x1="0" y1="0" x2={CW} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#e0d7bf" />
            <Stop offset="0.5" stopColor="#c5872f" />
            <Stop offset="1" stopColor="#3d2712" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={CW} height="2.5" fill="url(#juice)" />
      </Svg>
    </View>
  );
}

/** A minimal flacon in the fragrance's own juice — stands in for a packshot. */
function Flacon({ juice }: { juice: string }) {
  return (
    <Svg width={34} height={46} viewBox="0 0 34 46">
      <Rect x="12" y="1" width="10" height="7" rx="1.5" fill="#1f1b16" />
      <Rect x="13.5" y="8" width="7" height="2" fill="#b9902f" />
      <Rect x="5" y="10" width="24" height="34" rx="3" fill={juice} />
      <Rect x="5" y="10" width="24" height="34" rx="3" fill="none" stroke="#00000018" strokeWidth="0.75" />
      <Rect x="8" y="14" width="2.5" height="26" rx="1.25" fill="#ffffff" opacity="0.35" />
    </Svg>
  );
}

function ItemGlyph({ line }: { line: InvoiceLine }) {
  if (line.photo) {
    // react-pdf <Image>, not an HTML <img> — no alt attribute exists.
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image src={line.photo} style={{ width: 34, height: 46, objectFit: "cover", borderRadius: 2 }} />;
  }
  if (line.juice) return <Flacon juice={line.juice} />;
  return (
    <View style={{ width: 34, height: 46, alignItems: "center", justifyContent: "center", backgroundColor: c.faint, borderRadius: 2 }}>
      <Mark size={16} color={c.muted} />
    </View>
  );
}

// ── document ───────────────────────────────────────────────────────────

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const { brand, totals, payment } = data;

  return (
    <Document
      title={`${brand.name} Invoice ${data.invoiceNumber}`}
      author={brand.legalName}
      subject={`Invoice for order ${data.order.number}`}
      creator={brand.name}
      producer={brand.name}
    >
      <Page size="A4" style={s.page}>
        {/* masthead */}
        <View style={s.masthead}>
          <View>
            <View style={s.wordmark}>
              <Mark size={16} />
              <Text style={s.brandName}>THE RARESKIN</Text>
            </View>
            <Text style={s.brandKicker}>Extrait de Parfum</Text>
          </View>
          <View>
            <Text style={s.invoiceTitle}>Invoice</Text>
            <View style={s.metaRight}>
              <View style={s.metaLine}>
                <Text style={s.metaKey}>No.</Text>
                <Text style={s.metaVal}>{data.invoiceNumber}</Text>
              </View>
              <View style={s.metaLine}>
                <Text style={s.metaKey}>Issued</Text>
                <Text style={s.metaVal}>{data.issuedOn}</Text>
              </View>
            </View>
          </View>
        </View>

        <JuiceRule />

        {/* parties */}
        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>From</Text>
            <Text style={s.partyName}>{brand.legalName}</Text>
            <Text style={s.partyLine}>{brand.address}</Text>
            <Text style={s.partyLine}>{brand.cityLine}</Text>
            <Text style={s.partyLine}>{brand.email}</Text>
            <Text style={s.partyLine}>{brand.phone}</Text>
          </View>
          <View style={s.party}>
            <Text style={s.label}>Billed & shipped to</Text>
            <Text style={s.partyName}>{data.shipTo.name}</Text>
            <Text style={s.partyLine}>{data.shipTo.line1}</Text>
            {data.shipTo.line2 ? <Text style={s.partyLine}>{data.shipTo.line2}</Text> : null}
            {data.shipTo.landmark ? <Text style={s.partyLine}>{data.shipTo.landmark}</Text> : null}
            <Text style={s.partyLine}>
              {data.shipTo.city}, {data.shipTo.state} — {data.shipTo.pincode}
            </Text>
            <Text style={s.partyLine}>{data.shipTo.phone}</Text>
            <Text style={s.partyLine}>{data.customer.email}</Text>
          </View>
        </View>

        {/* order strip */}
        <View style={s.strip}>
          <View style={s.stripCell}>
            <Text style={s.stripKey}>Order</Text>
            <Text style={s.stripVal}>{data.order.number}</Text>
          </View>
          <View style={s.stripCell}>
            <Text style={s.stripKey}>Order date</Text>
            <Text style={s.stripVal}>{data.order.placedOn}</Text>
          </View>
          <View style={s.stripCell}>
            <Text style={s.stripKey}>Status</Text>
            <Text style={s.stripVal}>{data.order.status}</Text>
          </View>
          <View style={s.stripCell}>
            <Text style={s.stripKey}>Payment</Text>
            <Text style={s.stripVal}>{payment.status}</Text>
          </View>
        </View>

        {/* items */}
        <View style={s.thead}>
          <Text style={[s.th, { width: CW * 0.56 }]}>Item</Text>
          <Text style={[s.th, { width: CW * 0.1, textAlign: "center" }]}>Qty</Text>
          <Text style={[s.th, { width: CW * 0.17, textAlign: "right" }]}>Unit price</Text>
          <Text style={[s.th, { width: CW * 0.17, textAlign: "right" }]}>Amount</Text>
        </View>

        {data.items.map((line, i) => (
          <View key={`${line.sku}-${i}`} style={s.row} wrap={false}>
            <View style={s.cItem}>
              <ItemGlyph line={line} />
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{line.name}</Text>
                <Text style={s.itemMeta}>
                  {line.concentration ? `${line.concentration}  ·  ` : ""}
                  {line.sku}
                </Text>
                {line.noteLine ? <Text style={s.itemNote}>{line.noteLine}</Text> : null}
              </View>
            </View>
            <Text style={s.cQty}>{line.qty}</Text>
            <Text style={s.cUnit}>{line.unitPrice}</Text>
            <Text style={s.cAmt}>{line.lineTotal}</Text>
          </View>
        ))}

        {/* totals */}
        <View style={s.totalsWrap}>
          <View style={s.totals}>
            <View style={s.tRow}>
              <Text style={s.tKey}>Subtotal</Text>
              <Text style={s.tVal}>{totals.itemsSubtotal}</Text>
            </View>
            {totals.discount ? (
              <View style={s.tRow}>
                <Text style={[s.tKey, { color: c.ok }]}>{totals.discount.label}</Text>
                <Text style={[s.tVal, { color: c.ok }]}>{totals.discount.value}</Text>
              </View>
            ) : null}
            {totals.creditApplied ? (
              <View style={s.tRow}>
                <Text style={[s.tKey, { color: c.ok }]}>Store credit</Text>
                <Text style={[s.tVal, { color: c.ok }]}>{totals.creditApplied}</Text>
              </View>
            ) : null}
            <View style={s.tRow}>
              <Text style={s.tKey}>Shipping</Text>
              <Text style={s.tVal}>{totals.shipping}</Text>
            </View>
            {totals.codFee ? (
              <View style={s.tRow}>
                <Text style={s.tKey}>Cash-on-delivery fee</Text>
                <Text style={s.tVal}>{totals.codFee}</Text>
              </View>
            ) : null}

            {totals.tax ? (
              <View>
                <Text style={s.taxNote}>{totals.tax.note}</Text>
                <View style={s.tRow}>
                  <Text style={s.tKey}>Taxable value</Text>
                  <Text style={s.tVal}>{totals.tax.taxableValue}</Text>
                </View>
                {totals.tax.rows.map((r) => (
                  <View key={r.label} style={s.tRow}>
                    <Text style={s.tKey}>{r.label}</Text>
                    <Text style={s.tVal}>{r.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.taxNote}>Prices are inclusive of all applicable taxes.</Text>
            )}

            <View style={s.grand}>
              <Text style={s.grandKey}>Total paid</Text>
              <Text style={s.grandVal}>{totals.grandTotal}</Text>
            </View>
            <Text style={s.words}>{totals.grandTotalInWords}</Text>
          </View>
        </View>

        {/* payment */}
        <View style={s.pay}>
          <View style={s.payCol}>
            <Text style={s.payKey}>Payment method</Text>
            <Text style={s.payVal}>{payment.method}</Text>
          </View>
          <View style={s.payCol}>
            <Text style={s.payKey}>Payment status</Text>
            <Text style={s.payVal}>{payment.status}</Text>
          </View>
          {payment.reference ? (
            <View style={s.payCol}>
              <Text style={s.payKey}>Reference</Text>
              <Text style={s.payVal}>{payment.reference}</Text>
              {payment.settledOn ? <Text style={[s.payVal, { color: c.muted, fontSize: 7.5 }]}>{payment.settledOn}</Text> : null}
            </View>
          ) : null}
        </View>

        {data.customerNote ? (
          <View style={s.note}>
            <Text style={s.label}>Note from you</Text>
            <Text style={s.noteBody}>“{data.customerNote}”</Text>
          </View>
        ) : null}

        {/* closing mark */}
        <View style={s.close} wrap={false}>
          <Mark size={13} color={c.muted} />
          <Text style={s.closeLine}>Thank you for choosing {brand.name}.</Text>
        </View>

        {/* footer — every page */}
        <View style={s.footer} fixed>
          <Svg width={CW} height={1.5}>
            <Defs>
              <LinearGradient id="footjuice" x1="0" y1="0" x2={CW} y2="0" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#e0d7bf" />
                <Stop offset="0.5" stopColor="#c5872f" />
                <Stop offset="1" stopColor="#3d2712" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={CW} height="1.5" fill="url(#footjuice)" />
          </Svg>
          <View style={s.footInner}>
            <View>
              <Text style={s.tagline}>{brand.tagline}</Text>
              <Text style={s.legal}>
                {brand.legalName} · {brand.cityLine} · {brand.email} · {brand.site}
              </Text>
              <Text style={s.legal}>
                This is a computer-generated invoice and does not require a signature.
              </Text>
            </View>
            <Text
              style={s.pageNo}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
