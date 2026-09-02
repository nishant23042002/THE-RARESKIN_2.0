import type {
  EmailBrand,
  NewDeviceProps,
  OrderEmailBase,
  ReviewRequestProps,
} from "../types";

const mockBrand: EmailBrand = {
  siteName: "THE RARESKIN",
  legalName: "Velocity Ventures Group",
  supportEmail: "therareskinsupport@velocityventuresgroup.in",
  supportAddress:
    "Shop No. 04, Jija Mata Bachat Bhavan, Near S.T. Stand, Roha, Dist. Raigad – 402109",
  siteUrl: "https://therareskin.com",
  logoUrl: "https://therareskin.com/email/logo",
  accountUrl: "https://therareskin.com/account",
  orderUrl: "https://therareskin.com/account/orders/RRS-2026-000042",
  invoiceUrl: "https://therareskin.com/api/account/orders/RRS-2026-000042/invoice",
};

/** Sample data so `pnpm email:preview` renders every template standalone. */
export const mockBase: OrderEmailBase = {
  brand: mockBrand,
  orderNumber: "RRS-2026-000042",
  placedAt: "29 Aug 2026, 8:32 pm",
  customerName: "Aditi",
  items: [
    {
      name: "AURÉVAN",
      slug: "aurevan",
      concentration: "Extrait de Parfum · 50 ml",
      noteLine: "Citrus, bergamot, white florals",
      sku: "RRS-EXT-AUREVAN-50",
      qty: 1,
      unitPrice: "₹799",
      lineTotal: "₹799",
      image: "https://therareskin.com/email/flacon/aurevan",
    },
    {
      name: "Discovery Set",
      slug: "discovery-set",
      concentration: "Discovery Set · 3 × 10 ml",
      noteLine: null,
      sku: "RRS-DISCOVERY-SET",
      qty: 1,
      unitPrice: "₹799",
      lineTotal: "₹799",
      image: null,
    },
  ],
  totals: {
    itemsSubtotal: "₹1,598",
    discount: null,
    discountLabel: null,
    creditApplied: null,
    shipping: "Free",
    codFee: null,
    grandTotal: "₹1,598",
  },
  shippingAddress: {
    name: "Aditi Rao",
    line1: "Flat 12B, Sea Breeze",
    line2: "Carter Road",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    phone: "+91 98765 43210",
  },
  paymentLine: "UPI · aditi@okhdfcbank",
};

export const mockNewDevice: NewDeviceProps = {
  brand: mockBrand,
  customerName: "Aditi",
  deviceLabel: "Chrome on Windows",
  ip: "203.0.113.42",
  when: "2 Sep 2026, 9:14 am",
};

export const mockReviewRequest: ReviewRequestProps = {
  brand: mockBrand,
  customerName: "Aditi",
  orderNumber: "RRS-2026-000042",
  deliveredAt: "1 Sep 2026, 2:14 pm",
  items: [
    {
      name: "AURÉVAN",
      slug: "aurevan",
      image: "https://therareskin.com/email/flacon/aurevan",
    },
  ],
  reviewUrl: "https://therareskin.com/account/reviews",
};
